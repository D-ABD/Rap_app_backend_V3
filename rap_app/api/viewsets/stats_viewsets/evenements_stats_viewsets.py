"""Reporting agrégé sur les événements visibles par l'utilisateur courant."""

from __future__ import annotations

from typing import Literal

from django.db.models import Avg, Case, CharField, Count, F, FloatField, Q, Sum, Value, When
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from rap_app.api.serializers.base_serializers import EmptySerializer
from rap_app.models.evenements import Evenement

from ...permissions import CandidateRgpdGate
from ...roles import get_staff_centre_ids_cached, is_admin_like, is_staff_or_staffread

GroupKey = Literal["centre", "formation", "type", "statut"]


class EvenementStatsViewSet(GenericViewSet):
    """
    Statistiques agrégées sur les événements.

    Le périmètre suit les mêmes règles que le module Événements :
    admin-like = global, staff = centres accessibles, autres = événements créés
    par l'utilisateur.
    """

    serializer_class = EmptySerializer
    permission_classes = [IsAuthenticated, CandidateRgpdGate]

    def _status_annotation(self):
        today = timezone.now().date()
        soon_limit = today + timezone.timedelta(days=Evenement.DAYS_SOON)
        return Case(
            When(event_date__isnull=True, then=Value(Evenement.StatutTemporel.INCONNU)),
            When(event_date__lt=today, then=Value(Evenement.StatutTemporel.PASSE)),
            When(event_date=today, then=Value(Evenement.StatutTemporel.AUJOURD_HUI)),
            When(event_date__lte=soon_limit, then=Value(Evenement.StatutTemporel.BIENTOT)),
            default=Value(Evenement.StatutTemporel.FUTUR),
            output_field=CharField(),
        )

    def get_queryset(self):
        """
        Retourne les événements visibles par l'utilisateur courant, avec jointures
        utiles pour les agrégats et filtres.
        """
        base = Evenement.objects.select_related("formation", "formation__centre", "created_by")
        user = getattr(self.request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return base.none()
        if is_admin_like(user):
            return base
        centre_ids = get_staff_centre_ids_cached(self.request)
        if centre_ids is None:
            return base
        if centre_ids:
            return base.filter(formation__centre_id__in=centre_ids)
        if is_staff_or_staffread(user):
            return base.none()
        return base.filter(created_by=user)

    def _apply_common_filters(self, qs):
        """
        Applique les filtres manuels usuels : dates, centre, formation,
        type d'événement et statut temporel.
        """
        p = self.request.query_params
        date_min = parse_date(str(p.get("date_min"))) if p.get("date_min") else None
        date_max = parse_date(str(p.get("date_max"))) if p.get("date_max") else None

        if date_min:
            qs = qs.filter(event_date__gte=date_min)
        if date_max:
            qs = qs.filter(event_date__lte=date_max)
        if p.get("centre"):
            qs = qs.filter(formation__centre_id=p.get("centre"))
        if p.get("formation"):
            qs = qs.filter(formation_id=p.get("formation"))
        if p.get("type_evenement"):
            qs = qs.filter(type_evenement=p.get("type_evenement"))
        if p.get("statut"):
            qs = qs.annotate(status_temporel=self._status_annotation()).filter(status_temporel=p.get("statut"))
        return qs

    def _pct(self, num, den) -> float:
        try:
            n = float(num or 0)
            d = float(den or 0)
        except Exception:
            return 0.0
        return round((n * 100.0 / d), 2) if d > 0 else 0.0

    def list(self, request, *args, **kwargs):
        """
        KPIs globaux événements : volumétrie, temporalité, rattachement formation
        et participation, plus répartitions par type et statut temporel.
        """
        qs = self._apply_common_filters(self.get_queryset()).annotate(status_temporel=self._status_annotation())

        agg = qs.aggregate(
            total=Count("id"),
            passes=Count("id", filter=Q(status_temporel=Evenement.StatutTemporel.PASSE)),
            aujourd_hui=Count("id", filter=Q(status_temporel=Evenement.StatutTemporel.AUJOURD_HUI)),
            bientot=Count("id", filter=Q(status_temporel=Evenement.StatutTemporel.BIENTOT)),
            a_venir=Count("id", filter=Q(status_temporel=Evenement.StatutTemporel.FUTUR)),
            sans_date=Count("id", filter=Q(status_temporel=Evenement.StatutTemporel.INCONNU)),
            avec_formation=Count("id", filter=Q(formation_id__isnull=False)),
            sans_formation=Count("id", filter=Q(formation_id__isnull=True)),
            total_participants_prevus=Sum("participants_prevus"),
            total_participants_reels=Sum("participants_reels"),
            taux_moyen_participation=Avg(
                Case(
                    When(
                        participants_prevus__gt=0,
                        then=100.0 * F("participants_reels") / F("participants_prevus"),
                    ),
                    default=None,
                    output_field=FloatField(),
                )
            ),
        )

        type_rows = list(
            qs.values("type_evenement", "type_evenement")
            .annotate(
                count=Count("id"),
                participants_prevus=Sum("participants_prevus"),
                participants_reels=Sum("participants_reels"),
            )
            .order_by("-count", "type_evenement")
        )
        type_labels = dict(Evenement.TypeEvenement.choices)
        par_type = [
            {
                "code": row["type_evenement"],
                "label": type_labels.get(row["type_evenement"], row["type_evenement"]),
                "count": row["count"],
                "participants_prevus": int(row["participants_prevus"] or 0),
                "participants_reels": int(row["participants_reels"] or 0),
            }
            for row in type_rows
        ]

        status_rows = list(qs.values("status_temporel").annotate(count=Count("id")).order_by("status_temporel"))
        status_labels = {
            Evenement.StatutTemporel.PASSE: "Passé",
            Evenement.StatutTemporel.AUJOURD_HUI: "Aujourd'hui",
            Evenement.StatutTemporel.BIENTOT: "Bientôt",
            Evenement.StatutTemporel.FUTUR: "À venir",
            Evenement.StatutTemporel.INCONNU: "Date inconnue",
        }
        par_statut = [
            {
                "code": row["status_temporel"],
                "label": status_labels.get(row["status_temporel"], row["status_temporel"]),
                "count": row["count"],
            }
            for row in status_rows
        ]

        payload = {
            "kpis": {
                "total": int(agg.get("total") or 0),
                "passes": int(agg.get("passes") or 0),
                "aujourd_hui": int(agg.get("aujourd_hui") or 0),
                "bientot": int(agg.get("bientot") or 0),
                "a_venir": int(agg.get("a_venir") or 0),
                "sans_date": int(agg.get("sans_date") or 0),
                "avec_formation": int(agg.get("avec_formation") or 0),
                "sans_formation": int(agg.get("sans_formation") or 0),
                "participants_prevus": int(agg.get("total_participants_prevus") or 0),
                "participants_reels": int(agg.get("total_participants_reels") or 0),
                "taux_moyen_participation": round(float(agg.get("taux_moyen_participation") or 0), 2),
                "taux_remplissage_global": self._pct(
                    agg.get("total_participants_reels"),
                    agg.get("total_participants_prevus"),
                ),
            },
            "repartition": {
                "par_type": par_type,
                "par_statut": par_statut,
            },
            "filters_echo": {k: v for k, v in request.query_params.items()},
        }
        return Response(payload)

    @action(detail=False, methods=["GET"], url_path="grouped")
    def grouped(self, request):
        """
        Agrégats groupés par centre, formation, type d'événement ou statut
        temporel.
        """
        by: GroupKey = (request.query_params.get("by") or "centre").lower()
        allowed = {"centre", "formation", "type", "statut"}
        if by not in allowed:
            return Response({"success": False, "message": "Paramètre 'by' invalide.", "data": None}, status=400)

        qs = self._apply_common_filters(self.get_queryset()).annotate(status_temporel=self._status_annotation())

        group_fields_map = {
            "centre": ["formation__centre_id", "formation__centre__nom"],
            "formation": ["formation_id", "formation__nom", "formation__num_offre"],
            "type": ["type_evenement"],
            "statut": ["status_temporel"],
        }
        group_fields = group_fields_map[by]

        rows = list(
            qs.values(*group_fields)
            .annotate(
                total=Count("id"),
                passes=Count("id", filter=Q(status_temporel=Evenement.StatutTemporel.PASSE)),
                aujourd_hui=Count("id", filter=Q(status_temporel=Evenement.StatutTemporel.AUJOURD_HUI)),
                bientot=Count("id", filter=Q(status_temporel=Evenement.StatutTemporel.BIENTOT)),
                a_venir=Count("id", filter=Q(status_temporel=Evenement.StatutTemporel.FUTUR)),
                sans_date=Count("id", filter=Q(status_temporel=Evenement.StatutTemporel.INCONNU)),
                avec_formation=Count("id", filter=Q(formation_id__isnull=False)),
                sans_formation=Count("id", filter=Q(formation_id__isnull=True)),
                total_participants_prevus=Sum("participants_prevus"),
                total_participants_reels=Sum("participants_reels"),
                taux_moyen_participation=Avg(
                    Case(
                        When(
                            participants_prevus__gt=0,
                            then=100.0 * F("participants_reels") / F("participants_prevus"),
                        ),
                        default=None,
                        output_field=FloatField(),
                    )
                ),
            )
            .order_by(*group_fields)
        )

        type_labels = dict(Evenement.TypeEvenement.choices)
        status_labels = {
            Evenement.StatutTemporel.PASSE: "Passé",
            Evenement.StatutTemporel.AUJOURD_HUI: "Aujourd'hui",
            Evenement.StatutTemporel.BIENTOT: "Bientôt",
            Evenement.StatutTemporel.FUTUR: "À venir",
            Evenement.StatutTemporel.INCONNU: "Date inconnue",
        }

        for row in rows:
            if by == "centre":
                row["group_key"] = row.get("formation__centre_id")
                row["group_label"] = row.get("formation__centre__nom") or "Centre non renseigné"
            elif by == "formation":
                row["group_key"] = row.get("formation_id")
                row["group_label"] = row.get("formation__nom") or "Formation non renseignée"
            elif by == "type":
                code = row.get("type_evenement")
                row["group_key"] = code
                row["group_label"] = type_labels.get(code, code) or "—"
            elif by == "statut":
                code = row.get("status_temporel")
                row["group_key"] = code
                row["group_label"] = status_labels.get(code, code) or "—"

            row["participants_prevus"] = int(row.get("total_participants_prevus") or 0)
            row["participants_reels"] = int(row.get("total_participants_reels") or 0)
            row["taux_moyen_participation"] = round(float(row.get("taux_moyen_participation") or 0), 2)
            row["taux_remplissage_global"] = self._pct(
                row.get("total_participants_reels"),
                row.get("total_participants_prevus"),
            )
            row.pop("total_participants_prevus", None)
            row.pop("total_participants_reels", None)

        return Response({"group_by": by, "results": rows})
