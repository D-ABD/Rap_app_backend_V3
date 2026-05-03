"""ViewSet des stagiaires Prépa."""

from io import BytesIO

from django.db.models import Q
from django.utils.html import strip_tags
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils.timezone import localdate
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from ...models.centres import Centre
from ...models.prepa import IssueBilanPrepa, Prepa, PrepaPresenceStatut, StagiairePrepa
from ...services.prepa_parcours import (
    ETAPE_BILAN,
    StatutParcoursCourant,
    compute_action_suivante_recommandee,
    compute_date_entree_calculee,
    compute_date_fin_calculee,
    compute_derniere_etape,
    compute_derniere_presence_reelle,
    compute_statut_parcours_courant,
    prefetch_parcours_dependencies,
)
from ..mixins import HardDeleteArchivedMixin
from ..permissions import IsPrepaStaffOrAbove
from ..roles import is_admin_like, is_candidate, is_prepa_staff, is_staff_read, is_staff_standard
from ..serializers.prepa_serializers import StagiairePrepaSerializer


def _parse_stagiaires_prepa_ids(payload) -> list[int]:
    ids = payload.get("ids") or payload.get("stagiaire_prepa_ids") or payload.get("stagiaires") or []
    if not isinstance(ids, list) or any(not isinstance(i, int) for i in ids):
        raise ValidationError({"ids": ["Une liste d'identifiants entiers est attendue."]})
    return ids


class StagiairePrepaViewSet(HardDeleteArchivedMixin, viewsets.ModelViewSet):
    """
    CRUD et exports du suivi nominatif des stagiaires Prépa.

    Accès :
    - admin/superadmin : accès global ;
    - staff + staff_read : accès transverse restreint à leurs centres ;
    - prepa_staff : accès principal restreint à leurs centres ;
    - commercial / charge_recrutement / candidats : aucun accès métier.

    Les créations et mises à jour contrôlent à la fois le `centre` direct
    et la `prepa_origine`, afin d'éviter un rattachement inter-centres.
    """

    serializer_class = StagiairePrepaSerializer
    permission_classes = [IsPrepaStaffOrAbove]
    hard_delete_enabled = True
    queryset = StagiairePrepa.objects.select_related(
        "centre",
        "prepa_origine",
        "prepa_origine__centre",
        "centre_afpa_cible",
    ).all()

    def _admin_like(self, user) -> bool:
        return is_admin_like(user)

    def _accessible_centre_ids(self, user):
        if self._admin_like(user):
            return None
        if is_prepa_staff(user) or is_staff_standard(user) or is_staff_read(user):
            centres = getattr(user, "centres", None)
            if not centres or not centres.exists():
                return []
            return list(centres.values_list("id", flat=True))
        return []

    def _assert_user_can_use_centre(self, centre):
        if not centre:
            return
        centre_ids = self._accessible_centre_ids(self.request.user)
        if centre_ids is None:
            return
        if getattr(centre, "id", None) not in set(centre_ids):
            raise PermissionDenied("Centre hors de votre périmètre d'accès.")

    def _assert_user_can_use_prepa_origine(self, prepa):
        if not prepa:
            return
        self._assert_user_can_use_centre(getattr(prepa, "centre", None))

    def _scope_qs(self, qs):
        user = self.request.user
        if not user.is_authenticated or is_candidate(user):
            return qs.none()

        centre_ids = self._accessible_centre_ids(user)
        if centre_ids is None:
            return qs
        if not centre_ids:
            return qs.none()

        model = getattr(qs, "model", None)
        if model and getattr(model._meta, "model_name", "") == "centre":
            return qs.filter(id__in=centre_ids)

        field_names = [f.name for f in model._meta.get_fields()] if model else []
        if "centre_id" in field_names or "centre" in field_names:
            return qs.filter(centre_id__in=centre_ids)

        return qs.none()

    def get_queryset(self):
        qs = self._scope_qs(
            StagiairePrepa.objects.select_related(
                "centre",
                "prepa_origine",
                "prepa_origine__centre",
                "centre_afpa_cible",
            ).all()
        )
        params = self.request.query_params
        truthy = {"1", "true", "yes", "on"}

        include_archived = str(params.get("avec_archivees", "")).lower() in truthy
        archived_only = str(params.get("archives_seules", "")).lower() in truthy

        if archived_only:
            qs = qs.filter(is_active=False)
        elif not include_archived:
            qs = qs.filter(is_active=True)

        search = params.get("search")
        centre = params.get("centre")
        departement = params.get("departement")
        statut = params.get("statut_parcours")
        prepa_origine = params.get("prepa_origine")
        prepa_participation = params.get("prepa_participation")
        annee = params.get("annee")
        type_atelier = params.get("type_atelier")
        statut_positionnement = params.get("statut_positionnement")
        orientation_finale = params.get("orientation_finale")
        centre_afpa_cible = params.get("centre_afpa_cible")
        entree_formation_confirmee = params.get("entree_formation_confirmee")
        statut_parcours_calcule = params.get("statut_parcours_calcule")
        atelier_en_cours = params.get("atelier_en_cours")
        prochain_atelier_attendu = params.get("prochain_etape") or params.get("prochain_atelier_attendu")
        pilotage = params.get("pilotage")
        statut_parcours_courant = params.get("statut_parcours_courant")
        date_ic_min = params.get("date_ic_min")
        date_ic_max = params.get("date_ic_max")
        ordering = params.get("ordering") or "nom"

        if search:
            qs = qs.filter(
                Q(nom__icontains=search)
                | Q(prenom__icontains=search)
                | Q(telephone__icontains=search)
                | Q(email__icontains=search)
                | Q(centre__nom__icontains=search)
            )
        if centre:
            qs = qs.filter(centre_id=centre)
        if departement:
            qs = qs.filter(centre__code_postal__startswith=str(departement).strip())
        if statut:
            qs = qs.filter(statut_parcours=statut)
        if prepa_origine:
            qs = qs.filter(prepa_origine_id=prepa_origine)
        if prepa_participation:
            qs = qs.filter(participations_prepa__prepa_id=prepa_participation).distinct()
        if annee:
            qs = qs.filter(Q(date_entree_parcours__year=annee) | Q(prepa_origine__date_prepa__year=annee))
        if type_atelier:
            flag_field = StagiairePrepa.atelier_flag_map().get(type_atelier, (None, None))[0]
            if flag_field:
                qs = qs.filter(**{flag_field: True})
        if statut_positionnement:
            qs = qs.filter(statut_positionnement=statut_positionnement)
        if orientation_finale:
            qs = qs.filter(orientation_finale=orientation_finale)
        if centre_afpa_cible:
            qs = qs.filter(centre_afpa_cible_id=centre_afpa_cible)
        if date_ic_min:
            qs = qs.filter(
                prepa_origine__type_prepa=Prepa.TypePrepa.INFO_COLLECTIVE,
                prepa_origine__date_prepa__gte=date_ic_min,
            )
        if date_ic_max:
            qs = qs.filter(
                prepa_origine__type_prepa=Prepa.TypePrepa.INFO_COLLECTIVE,
                prepa_origine__date_prepa__lte=date_ic_max,
            )
        if statut_parcours_calcule == StagiairePrepa.StatutParcours.ABANDON:
            qs = qs.filter(statut_parcours=StagiairePrepa.StatutParcours.ABANDON)
        elif statut_parcours_calcule == StagiairePrepa.StatutParcours.PARCOURS_TERMINE:
            qs = qs.exclude(statut_parcours=StagiairePrepa.StatutParcours.ABANDON).filter(
                Q(atelier_6_realise=True) | Q(date_sortie_parcours__isnull=False)
            )
        elif statut_parcours_calcule == StagiairePrepa.StatutParcours.EN_PARCOURS:
            qs = (
                qs.exclude(statut_parcours=StagiairePrepa.StatutParcours.ABANDON)
                .exclude(Q(atelier_6_realise=True) | Q(date_sortie_parcours__isnull=False))
                .filter(Q(atelier_1_realise=True) | Q(date_entree_parcours__isnull=False))
            )
        elif statut_parcours_calcule == StagiairePrepa.StatutParcours.EN_ATTENTE:
            qs = (
                qs.exclude(statut_parcours=StagiairePrepa.StatutParcours.ABANDON)
                .exclude(Q(atelier_6_realise=True) | Q(date_sortie_parcours__isnull=False))
                .filter(atelier_1_realise=False, date_entree_parcours__isnull=True)
            )
        if atelier_en_cours:
            qs = qs.filter(
                participations_prepa__statut__in=PrepaPresenceStatut.active_statuses(),
                participations_prepa__prepa__type_prepa=atelier_en_cours,
            ).distinct()
        if prochain_atelier_attendu:
            qs = qs.exclude(statut_parcours=StagiairePrepa.StatutParcours.ABANDON).exclude(
                Q(atelier_6_realise=True) | Q(date_sortie_parcours__isnull=False)
            )
            if prochain_atelier_attendu == ETAPE_BILAN:
                ids_all = list(qs.values_list("pk", flat=True))
                matched: list[int] = []
                chunk_size = 400
                for i in range(0, len(ids_all), chunk_size):
                    chunk = ids_all[i : i + chunk_size]
                    rows = prefetch_parcours_dependencies(StagiairePrepa.objects.filter(pk__in=chunk))
                    for row in rows:
                        if compute_statut_parcours_courant(row) == StatutParcoursCourant.EN_ATTENTE_BILAN:
                            matched.append(row.pk)
                qs = qs.filter(pk__in=matched)
            elif prochain_atelier_attendu == Prepa.TypePrepa.ATELIER1:
                qs = qs.filter(atelier_1_realise=False, date_entree_parcours__isnull=True)
            elif prochain_atelier_attendu == Prepa.TypePrepa.ATELIER6:
                qs = (
                    qs.filter(Q(atelier_1_realise=True) | Q(date_entree_parcours__isnull=False))
                    .filter(atelier_6_realise=False, date_atelier_6__isnull=True, date_sortie_parcours__isnull=True)
                    .exclude(
                        prochain_atelier_prevu__in=[
                            Prepa.TypePrepa.ATELIER2,
                            Prepa.TypePrepa.ATELIER3,
                            Prepa.TypePrepa.ATELIER4,
                            Prepa.TypePrepa.ATELIER5,
                            Prepa.TypePrepa.AUTRE,
                        ]
                    )
                )
            else:
                flag_field = StagiairePrepa.atelier_flag_map().get(prochain_atelier_attendu, (None, None))[0]
                if flag_field:
                    qs = qs.filter(prochain_atelier_prevu=prochain_atelier_attendu).exclude(**{flag_field: True})
        if pilotage == "attente_entree":
            qs = (
                qs.exclude(statut_parcours=StagiairePrepa.StatutParcours.ABANDON)
                .exclude(Q(atelier_6_realise=True) | Q(date_sortie_parcours__isnull=False))
                .filter(atelier_1_realise=False, date_entree_parcours__isnull=True)
            )
        elif pilotage == "a_integrer_atelier_1":
            qs = (
                qs.exclude(statut_parcours=StagiairePrepa.StatutParcours.ABANDON)
                .exclude(Q(atelier_6_realise=True) | Q(date_sortie_parcours__isnull=False))
                .filter(atelier_1_realise=False, date_entree_parcours__isnull=True, prepa_origine__isnull=False)
            )
        elif pilotage == "attente_prochain_atelier":
            qs = (
                qs.exclude(statut_parcours=StagiairePrepa.StatutParcours.ABANDON)
                .exclude(Q(atelier_6_realise=True) | Q(date_sortie_parcours__isnull=False))
                .filter(Q(atelier_1_realise=True) | Q(date_entree_parcours__isnull=False))
                .exclude(participations_prepa__statut__in=PrepaPresenceStatut.active_statuses())
            )
        elif pilotage == "en_parcours_actif":
            qs = (
                qs.exclude(statut_parcours=StagiairePrepa.StatutParcours.ABANDON)
                .exclude(Q(atelier_6_realise=True) | Q(date_sortie_parcours__isnull=False))
                .filter(Q(atelier_1_realise=True) | Q(date_entree_parcours__isnull=False))
                .filter(participations_prepa__statut__in=PrepaPresenceStatut.active_statuses())
                .distinct()
            )
        elif pilotage == "a_reprogrammer":
            qs = qs.filter(participations_prepa__statut=PrepaPresenceStatut.A_REPOSITIONNER).distinct()
        elif pilotage == "parcours_termine":
            qs = qs.exclude(statut_parcours=StagiairePrepa.StatutParcours.ABANDON).filter(
                Q(atelier_6_realise=True) | Q(date_sortie_parcours__isnull=False)
            )
        elif pilotage == "abandon":
            qs = qs.filter(statut_parcours=StagiairePrepa.StatutParcours.ABANDON)
        if statut_parcours_courant:
            allowed = {choice.value for choice in StatutParcoursCourant}
            if statut_parcours_courant not in allowed:
                raise ValidationError(
                    {"statut_parcours_courant": [f"Valeur inconnue : doit être parmi {sorted(allowed)}."]}
                )
            ids_all = list(qs.values_list("pk", flat=True))
            matched: list[int] = []
            chunk_size = 400
            for i in range(0, len(ids_all), chunk_size):
                chunk = ids_all[i : i + chunk_size]
                rows = prefetch_parcours_dependencies(StagiairePrepa.objects.filter(pk__in=chunk))
                for row in rows:
                    if compute_statut_parcours_courant(row) == statut_parcours_courant:
                        matched.append(row.pk)
            qs = qs.filter(pk__in=matched)
        if str(entree_formation_confirmee).lower() in truthy:
            qs = qs.filter(entree_formation_confirmee=True)
        elif str(entree_formation_confirmee).lower() in {"0", "false", "no", "off"}:
            qs = qs.filter(entree_formation_confirmee=False)

        if ordering in {
            "nom",
            "-nom",
            "prenom",
            "-prenom",
            "date_entree_parcours",
            "-date_entree_parcours",
            "date_sortie_parcours",
            "-date_sortie_parcours",
            "updated_at",
            "-updated_at",
        }:
            qs = qs.order_by(ordering, "prenom", "id")
        else:
            qs = qs.order_by("nom", "prenom", "id")

        return qs

    def get_archived_aware_object(self):
        lookup_value = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
        base_qs = self._scope_qs(
            StagiairePrepa.objects.select_related(
                "centre",
                "prepa_origine",
                "prepa_origine__centre",
                "centre_afpa_cible",
            ).all()
        )
        return get_object_or_404(base_qs, **{self.lookup_field: lookup_value})

    def _get_bulk_base_queryset(self):
        return self._scope_qs(
            StagiairePrepa.objects.select_related(
                "centre",
                "prepa_origine",
                "prepa_origine__centre",
                "centre_afpa_cible",
            ).all()
        )

    def destroy(self, request, *args, **kwargs):
        """
        Conserve `DELETE` pour compatibilité mais archive
        logiquement le stagiaire Prépa.
        """
        instance = self.get_object()
        if not instance.is_active:
            return Response(
                {
                    "success": True,
                    "message": "Stagiaire Prépa déjà archivé.",
                    "data": self.get_serializer(instance).data,
                },
                status=status.HTTP_200_OK,
            )

        instance.is_active = False
        instance.save(user=request.user, update_fields=["is_active"])
        return Response(
            {
                "success": True,
                "message": "Stagiaire Prépa archivé avec succès.",
                "data": self.get_serializer(instance).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="desarchiver")
    def desarchiver(self, request, pk=None):
        """
        Restaure un stagiaire Prépa archivé et renvoie l'enveloppe API standard.
        """
        instance = self.get_archived_aware_object()
        if instance.is_active:
            return Response(
                {
                    "success": True,
                    "message": "Stagiaire Prépa déjà actif.",
                    "data": self.get_serializer(instance).data,
                },
                status=status.HTTP_200_OK,
            )

        instance.is_active = True
        instance.save(user=request.user, update_fields=["is_active"])
        return Response(
            {
                "success": True,
                "message": "Stagiaire Prépa désarchivé avec succès.",
                "data": self.get_serializer(instance).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="bulk/archive")
    def bulk_archive(self, request):
        ids = _parse_stagiaires_prepa_ids(request.data)
        if not ids:
            raise ValidationError({"ids": ["Aucun stagiaire Prépa sélectionné."]})

        queryset = self._get_bulk_base_queryset().filter(id__in=ids, is_active=True)
        selected_count = len(set(ids))
        archived_count = 0

        for instance in queryset:
            instance.is_active = False
            instance.save(user=request.user, update_fields=["is_active"])
            archived_count += 1

        return Response(
            {
                "success": True,
                "message": f"{archived_count} fiche(s) archivée(s) sur {selected_count} sélectionnée(s).",
                "data": {
                    "selected_count": selected_count,
                    "archived_count": archived_count,
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="bulk/desarchiver")
    def bulk_desarchiver(self, request):
        ids = _parse_stagiaires_prepa_ids(request.data)
        if not ids:
            raise ValidationError({"ids": ["Aucun stagiaire Prépa sélectionné."]})

        queryset = self._get_bulk_base_queryset().filter(id__in=ids, is_active=False)
        selected_count = len(set(ids))
        restored_count = 0

        for instance in queryset:
            instance.is_active = True
            instance.save(user=request.user, update_fields=["is_active"])
            restored_count += 1

        return Response(
            {
                "success": True,
                "message": f"{restored_count} fiche(s) restaurée(s) sur {selected_count} sélectionnée(s).",
                "data": {
                    "selected_count": selected_count,
                    "restored_count": restored_count,
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="bulk/hard-delete")
    def bulk_hard_delete(self, request):
        if not self._admin_like(request.user):
            raise PermissionDenied("Suppression définitive réservée aux admins.")

        ids = _parse_stagiaires_prepa_ids(request.data)
        if not ids:
            raise ValidationError({"ids": ["Aucun stagiaire Prépa sélectionné."]})

        queryset = self._get_bulk_base_queryset().filter(id__in=ids)
        selected_count = len(set(ids))
        hard_deleted_count = 0
        skipped_not_archived = []

        for instance in queryset:
            if not self.is_instance_archived_for_hard_delete(instance):
                skipped_not_archived.append(instance.pk)
                continue
            self.perform_hard_delete(instance, user=request.user)
            hard_deleted_count += 1

        return Response(
            {
                "success": True,
                "message": (
                    f"{hard_deleted_count} fiche(s) supprimée(s) définitivement sur {selected_count} sélectionnée(s)."
                ),
                "data": {
                    "selected_count": selected_count,
                    "hard_deleted_count": hard_deleted_count,
                    "skipped_not_archived_ids": skipped_not_archived,
                },
            },
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        """
        Crée un stagiaire Prépa et renvoie l'enveloppe API standard.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                "success": True,
                "message": "Stagiaire Prépa créé avec succès.",
                "data": self.get_serializer(serializer.instance).data,
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def retrieve(self, request, *args, **kwargs):
        """
        Retourne le détail d'un stagiaire Prépa dans l'enveloppe API standard.
        """
        instance = self.get_object()
        return Response(
            {
                "success": True,
                "message": "Stagiaire Prépa récupéré avec succès.",
                "data": self.get_serializer(instance).data,
            },
            status=status.HTTP_200_OK,
        )

    def update(self, request, *args, **kwargs):
        """
        Met à jour un stagiaire Prépa et renvoie l'enveloppe API standard.
        """
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(
            {
                "success": True,
                "message": "Stagiaire Prépa mis à jour avec succès.",
                "data": self.get_serializer(serializer.instance).data,
            },
            status=status.HTTP_200_OK,
        )

    def perform_create(self, serializer):
        centre = serializer.validated_data.get("centre")
        prepa_origine = serializer.validated_data.get("prepa_origine")
        self._assert_user_can_use_centre(centre)
        self._assert_user_can_use_prepa_origine(prepa_origine)
        serializer.save()

    def perform_update(self, serializer):
        instance = serializer.instance
        centre = serializer.validated_data.get("centre", getattr(instance, "centre", None))
        prepa_origine = serializer.validated_data.get("prepa_origine", getattr(instance, "prepa_origine", None))
        self._assert_user_can_use_centre(centre)
        self._assert_user_can_use_prepa_origine(prepa_origine)
        serializer.save()

    @action(detail=True, methods=["post"], url_path="reouvrir-parcours")
    def reouvrir_parcours(self, request, pk=None):
        instance = self.get_object()
        if compute_statut_parcours_courant(instance) != StatutParcoursCourant.TERMINE:
            return Response(
                {
                    "success": False,
                    "message": "Seuls les parcours terminés peuvent être rouverts.",
                    "data": {"id": instance.id},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance.orientation_finale = None
        instance.centre_afpa_cible = None
        instance.centre_afpa_cible_texte = None
        instance.formation_afpa_cible = None
        instance.date_orientation = None
        instance.entree_formation_confirmee = False
        instance.motif_abandon = None
        instance.issue_bilan = None
        instance.date_bilan = None
        instance.date_sortie_parcours = None
        instance.statut_parcours = (
            StagiairePrepa.StatutParcours.EN_PARCOURS
            if instance.atelier_1_realise or instance.date_atelier_1
            else StagiairePrepa.StatutParcours.EN_ATTENTE
        )
        instance.save(
            user=request.user,
            update_fields=[
                "orientation_finale",
                "centre_afpa_cible",
                "centre_afpa_cible_texte",
                "formation_afpa_cible",
                "date_orientation",
                "entree_formation_confirmee",
                "motif_abandon",
                "issue_bilan",
                "date_bilan",
                "date_sortie_parcours",
                "statut_parcours",
            ],
        )
        return Response(
            {
                "success": True,
                "message": "Parcours rouvert avec succès.",
                "data": self.get_serializer(instance).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="meta")
    def meta(self, request):
        """
        Retourne les métadonnées utiles au frontend dans l'enveloppe
        API standard (centres, statuts, ateliers, séances et années).
        """
        for_filters = str(request.query_params.get("for_filters", "")).lower() in {"1", "true", "yes", "on"}
        qs = self.get_queryset() if for_filters else self._scope_qs(
            StagiairePrepa.objects.select_related(
                "centre",
                "prepa_origine",
                "prepa_origine__centre",
                "centre_afpa_cible",
            ).all()
        )
        centres = (
            self._scope_qs(Centre.objects.filter(id__in=qs.exclude(centre_id__isnull=True).values_list("centre_id", flat=True).distinct()))
            if for_filters
            else self._scope_qs(Centre.objects.all())
        ).order_by("nom")
        annees = (
            qs
            .order_by()
            .values_list("date_entree_parcours__year", flat=True)
            .distinct()
        )
        annees = sorted([a for a in annees if a], reverse=True)
        prepas_origine = (
            self._scope_qs(Prepa.objects.select_related("centre").all())
            .filter(type_prepa=Prepa.TypePrepa.INFO_COLLECTIVE)
            .order_by("-date_prepa", "-id")[:200]
        )

        available_type_ateliers = [
            {"value": value, "label": label}
            for value, label in Prepa.TypePrepa.choices
            if (
                (value.startswith("atelier") or value == Prepa.TypePrepa.AUTRE)
                and (
                    qs.filter(
                        participations_prepa__statut__in=PrepaPresenceStatut.active_statuses(),
                        participations_prepa__prepa__type_prepa=value,
                    ).exists()
                    or qs.filter(prochain_atelier_prevu=value).exists()
                    or (value == Prepa.TypePrepa.ATELIER1 and qs.filter(atelier_1_realise=False, date_entree_parcours__isnull=True).exists())
                )
            )
        ]
        prochaines_etapes = [
            {"value": Prepa.TypePrepa.ATELIER1, "label": "Atelier 1"},
            {"value": Prepa.TypePrepa.ATELIER2, "label": "Atelier 2"},
            {"value": Prepa.TypePrepa.ATELIER3, "label": "Atelier 3"},
            {"value": Prepa.TypePrepa.ATELIER4, "label": "Atelier 4"},
            {"value": Prepa.TypePrepa.ATELIER5, "label": "Atelier 5"},
            {"value": Prepa.TypePrepa.ATELIER6, "label": "Atelier 6"},
            {"value": ETAPE_BILAN, "label": "Bilan"},
        ]

        return Response(
            {
                "success": True,
                "message": "Métadonnées stagiaires Prépa récupérées avec succès.",
                "data": {
                    "centres": [
                        {"id": c.id, "nom": c.nom, "departement": c.departement, "code_postal": c.code_postal}
                        for c in centres
                    ],
                    "statut_parcours": [
                        {"value": value, "label": label} for value, label in StagiairePrepa.StatutParcours.choices
                    ],
                    "statut_formulaire": [
                        {"value": "en_attente", "label": "En attente de parcours"},
                        {"value": "parcours_termine", "label": "Parcours terminé"},
                        {"value": "abandon", "label": "Abandon"},
                        {"value": "en_attente_prochain_atelier", "label": "En attente d'atelier"},
                        {"value": "a_repositionner", "label": "À repositionner"},
                    ],
                    "statut_positionnement": [
                        {"value": value, "label": label}
                        for value, label in StagiairePrepa.StatutPositionnement.choices
                    ],
                    "orientation_finale": [
                        {"value": value, "label": label} for value, label in StagiairePrepa.OrientationFinale.choices
                    ],
                    "statut_parcours_courant": [
                        {"value": value, "label": label} for value, label in StatutParcoursCourant.choices
                    ],
                    "issue_bilan": [
                        {"value": value, "label": label} for value, label in IssueBilanPrepa.choices
                    ],
                    "type_atelier": available_type_ateliers,
                    "prochain_etape": prochaines_etapes,
                    "pilotage": [
                        {"value": "attente_entree", "label": "En attente d'entrée"},
                        {"value": "a_integrer_atelier_1", "label": "À intégrer atelier 1"},
                        {"value": "attente_prochain_atelier", "label": "En attente atelier suivant"},
                        {"value": "en_parcours_actif", "label": "En parcours actif"},
                        {"value": "a_reprogrammer", "label": "À reprogrammer"},
                        {"value": "parcours_termine", "label": "Parcours terminé"},
                        {"value": "abandon", "label": "Abandon"},
                    ],
                    "centres_afpa_cible": [
                        {"id": c.id, "nom": c.nom, "departement": c.departement, "code_postal": c.code_postal}
                        for c in Centre.objects.order_by("nom")
                    ],
                    "prepas_origine": [
                        {
                            "id": p.id,
                            "label": f"IC du {p.date_prepa:%d/%m/%Y}"
                            + (f" - {p.centre.nom}" if p.centre else ""),
                        }
                        for p in prepas_origine
                    ],
                    "annees": annees or [localdate().year],
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="synthese-parcours")
    def synthese_parcours(self, request):
        """
        Retourne les indicateurs de pilotage du parcours individuel Prépa.
        """
        qs = self.get_queryset()
        synthese = qs.synthese_parcours()
        return Response(
            {
                "success": True,
                "message": "Synthèse des parcours Prépa récupérée avec succès.",
                "data": {
                    **synthese,
                    "filtres": {
                        "centre": request.query_params.get("centre"),
                        "departement": request.query_params.get("departement"),
                        "annee": request.query_params.get("annee"),
                        "prepa_origine": request.query_params.get("prepa_origine"),
                        "prepa_participation": request.query_params.get("prepa_participation"),
                        "orientation_finale": request.query_params.get("orientation_finale"),
                    },
                },
            },
            status=status.HTTP_200_OK,
        )

    def _filtered_export_qs(self, request):
        qs = self.filter_queryset(self.get_queryset())
        if request.method.lower() == "post":
            ids = request.data.get("ids") or []
            if ids:
                qs = qs.filter(id__in=ids)
        return qs

    @action(detail=False, methods=["get", "post"], url_path="export-xlsx")
    def export_xlsx(self, request):
        qs = self._filtered_export_qs(request)

        wb = Workbook()
        ws = wb.active
        ws.title = "Stagiaires Prepa"

        title = "Export stagiaires Prépa"
        ws.merge_cells("A1:S1")
        ws["A1"] = title
        ws["A1"].font = Font(bold=True, size=14)
        ws["A1"].alignment = Alignment(horizontal="center")

        filter_summary = self._build_export_filter_summary(request)
        ws.merge_cells("A2:S2")
        ws["A2"] = filter_summary
        ws["A2"].alignment = Alignment(horizontal="left")

        ws.append([])
        ws.append(
            [
                "Nom",
                "Prénom",
                "Téléphone",
                "Email",
                "Centre",
                "IC d'origine",
                "Statut courant",
                "Action suggérée",
                "Prochaine étape",
                "Dernière étape",
                "Dernière présence",
                "Orientation finale",
                "Centre AFPA cible",
                "Formation AFPA cible",
                "Date bilan",
                "Entrée parcours",
                "Fin parcours",
                "Ateliers réalisés",
                "Commentaire",
            ]
        )

        for obj in qs:
            derniere_etape = compute_derniere_etape(obj)
            derniere_presence = compute_derniere_presence_reelle(obj)
            action = compute_action_suivante_recommandee(obj)
            ws.append(
                [
                    obj.nom,
                    obj.prenom,
                    obj.telephone or "",
                    obj.email or "",
                    getattr(obj.centre, "nom", ""),
                    obj.date_ic.strftime("%d/%m/%Y") if obj.date_ic else "",
                    StatutParcoursCourant(compute_statut_parcours_courant(obj)).label,
                    action.get("label", ""),
                    obj.prochain_atelier_attendu_label
                    or (
                        "Bilan"
                        if obj.prochain_atelier_prevu == ETAPE_BILAN
                        else dict(Prepa.TypePrepa.choices).get(obj.prochain_atelier_prevu, obj.prochain_atelier_prevu or "")
                    ),
                    self._format_etape_export(derniere_etape),
                    self._format_presence_export(derniere_presence),
                    obj.get_orientation_finale_display() if obj.orientation_finale else "",
                    obj.centre_afpa_cible_texte or getattr(obj.centre_afpa_cible, "nom", ""),
                    obj.formation_afpa_cible or "",
                    obj.date_bilan.strftime("%d/%m/%Y") if obj.date_bilan else "",
                    compute_date_entree_calculee(obj) or "",
                    compute_date_fin_calculee(obj) or "",
                    ", ".join(obj.ateliers_realises_labels),
                    self._plain_comment(obj.commentaire_suivi),
                ]
            )

        self._style_sheet(ws, header_row=4, freeze_cell="A5")
        return self._xlsx_response(wb, "stagiaires_prepa.xlsx")

    @action(detail=False, methods=["get", "post"], url_path="export-emargement-xlsx")
    def export_emargement_xlsx(self, request):
        qs = self._filtered_export_qs(request)
        wb = Workbook()
        ws = wb.active
        ws.title = "Emargement Prepa"

        title = "Feuille d'émargement - Stagiaires Prépa"
        type_atelier = request.query_params.get("type_atelier")
        if type_atelier:
            try:
                title = f"{title} - {Prepa.TypePrepa(type_atelier).label}"
            except ValueError:
                pass

        ws.merge_cells("A1:H1")
        ws["A1"] = title
        ws["A1"].font = Font(bold=True, size=14)
        ws["A1"].alignment = Alignment(horizontal="center")
        ws.append([])
        ws.append(["Nom", "Prénom", "Centre", "Statut", "Téléphone", "Email", "Présence", "Signature"])

        for obj in qs:
            ws.append(
                [
                    obj.nom,
                    obj.prenom,
                    getattr(obj.centre, "nom", ""),
                    obj.get_statut_parcours_display(),
                    obj.telephone or "",
                    obj.email or "",
                    "",
                    "",
                ]
            )

        self._style_sheet(ws, header_row=3)
        return self._xlsx_response(wb, "stagiaires_prepa_emargement.xlsx")

    @action(detail=False, methods=["get", "post"], url_path="export-presence-xlsx")
    def export_presence_xlsx(self, request):
        qs = self._filtered_export_qs(request)
        wb = Workbook()
        ws = wb.active
        ws.title = "Presence Prepa"

        title = "Feuille de présence - Stagiaires Prépa"
        type_atelier = request.query_params.get("type_atelier")
        if type_atelier:
            try:
                title = f"{title} - {Prepa.TypePrepa(type_atelier).label}"
            except ValueError:
                pass

        ws.merge_cells("A1:G1")
        ws["A1"] = title
        ws["A1"].font = Font(bold=True, size=14)
        ws["A1"].alignment = Alignment(horizontal="center")
        ws.append([])
        ws.append(["Nom", "Prénom", "Centre", "Statut", "Téléphone", "Email", "Présent"])

        for obj in qs:
            ws.append(
                [
                    obj.nom,
                    obj.prenom,
                    getattr(obj.centre, "nom", ""),
                    obj.get_statut_parcours_display(),
                    obj.telephone or "",
                    obj.email or "",
                    "",
                ]
            )

        self._style_sheet(ws, header_row=3)
        return self._xlsx_response(wb, "stagiaires_prepa_presence.xlsx")

    def _build_export_filter_summary(self, request) -> str:
        params = request.query_params
        chunks: list[str] = []

        annee = params.get("annee")
        if annee:
            chunks.append(f"Année : {annee}")

        centre = params.get("centre")
        if centre:
            centre_label = centre
            try:
                centre_obj = Centre.objects.filter(pk=int(str(centre).strip())).only("nom").first()
                if centre_obj:
                    centre_label = centre_obj.nom
            except (TypeError, ValueError):
                pass
            chunks.append(f"Centre : {centre_label}")

        departement = params.get("departement")
        if departement:
            chunks.append(f"Département : {departement}")

        statut = params.get("statut_parcours_courant")
        if statut:
            try:
                statut_label = StatutParcoursCourant(statut).label
            except ValueError:
                statut_label = statut
            chunks.append(f"Statut : {statut_label}")

        search = params.get("search")
        if search:
            chunks.append(f"Recherche : {search}")

        return "Filtres : " + (" | ".join(chunks) if chunks else "aucun")

    def _format_etape_export(self, payload: dict | None) -> str:
        if not payload:
            return ""
        label = payload.get("label") or payload.get("value") or ""
        step_date = payload.get("date")
        if label and step_date:
            return f"{label} ({self._format_date_value(step_date)})"
        return str(label)

    def _format_presence_export(self, payload: dict | None) -> str:
        if not payload:
            return ""
        label = payload.get("type_prepa_display") or payload.get("type_prepa") or ""
        step_date = payload.get("date")
        if label and step_date:
            return f"{label} ({self._format_date_value(step_date)})"
        return str(label)

    def _format_date_value(self, value: str | None) -> str:
        if not value:
            return ""
        parts = str(value).split("-")
        if len(parts) == 3:
            return f"{parts[2]}/{parts[1]}/{parts[0]}"
        return str(value)

    def _plain_comment(self, value: str | None) -> str:
        if not value:
            return ""
        return " ".join(strip_tags(str(value).replace("<br>", " ").replace("<br/>", " ").replace("<br />", " ")).split())

    def _style_sheet(self, ws, header_row=1, freeze_cell: str | None = None):
        fill = PatternFill("solid", fgColor="DCE6F1")
        title_fill = PatternFill("solid", fgColor="EEF4FB")
        border = Border(
            left=Side(style="thin", color="CCCCCC"),
            right=Side(style="thin", color="CCCCCC"),
            top=Side(style="thin", color="CCCCCC"),
            bottom=Side(style="thin", color="CCCCCC"),
        )

        for cell in ws[header_row]:
            cell.font = Font(bold=True, color="002060")
            cell.fill = fill
            cell.alignment = Alignment(horizontal="center")
            cell.border = border

        if header_row > 1:
            for row_index in range(1, header_row):
                for cell in ws[row_index]:
                    cell.fill = title_fill
                    cell.alignment = Alignment(vertical="center", wrap_text=True)

        for row in ws.iter_rows(min_row=header_row + 1):
            for cell in row:
                cell.border = border
                cell.alignment = Alignment(vertical="top", wrap_text=True)

        for col in ws.columns:
            if not col:
                continue
            letter = get_column_letter(col[0].column)
            max_len = max((len(str(c.value)) for c in col if c.value), default=10)
            ws.column_dimensions[letter].width = min(max_len + 3, 42)

        ws.auto_filter.ref = ws.dimensions
        if freeze_cell:
            ws.freeze_panes = freeze_cell

    def _xlsx_response(self, wb, filename):
        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)
        response = HttpResponse(
            buf.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
