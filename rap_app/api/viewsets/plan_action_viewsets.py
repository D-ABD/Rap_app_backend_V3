"""ViewSet API isolé des plans d'action formation (synthèse / commentaires)."""

from __future__ import annotations

import django_filters
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.templatetags.static import static
from django.utils import timezone as dj_timezone
from django.utils.dateparse import parse_date
from django.utils.text import slugify
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema, extend_schema_view
from rest_framework import filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from weasyprint import HTML

from ...api.paginations import RapAppPagination
from ...api.permissions import IsStaffOrAbove
from ...api.roles import can_write_commentaires_formation, is_admin_like, is_centre_scoped_staff, staff_centre_ids
from ...api.serializers.plan_action_commentaires_groupes_serializers import (
    PlanActionCommentaireGroupeItemSerializer,
)
from ...api.serializers.plan_action_serializers import (
    PlanActionFormationListSerializer,
    PlanActionFormationReadSerializer,
    PlanActionFormationWriteSerializer,
)
from ...api.serializers.plan_action_write_errors import humanize_plan_action_formation_write_errors
from ...models.formations import Formation
from ...models.plan_action import PlanActionFormation
from ...services.plan_action_commentaires import (
    construire_queryset_commentaires_plan_action,
    regrouper_commentaires_par_jour_local,
)
from .scoped_viewset import ScopedModelViewSet


class PlanActionFormationFilterSet(django_filters.FilterSet):
    """
    Filtres query-string pour le listing : période, périmètre, statut, auteur.

    Les noms de paramètres suivent l'usage des autres modules (ids entiers, dates ``YYYY-MM-DD``).
    """

    centre = django_filters.NumberFilter(field_name="centre_id")
    formation = django_filters.NumberFilter(field_name="formation_id")
    statut = django_filters.CharFilter(field_name="statut")
    created_by = django_filters.NumberFilter(field_name="created_by_id")
    date_debut_gte = django_filters.DateFilter(field_name="date_debut", lookup_expr="gte")
    date_debut_lte = django_filters.DateFilter(field_name="date_debut", lookup_expr="lte")
    date_fin_gte = django_filters.DateFilter(field_name="date_fin", lookup_expr="gte")
    date_fin_lte = django_filters.DateFilter(field_name="date_fin", lookup_expr="lte")

    class Meta:
        model = PlanActionFormation
        fields = [
            "centre",
            "formation",
            "statut",
            "created_by",
            "date_debut_gte",
            "date_debut_lte",
            "date_fin_gte",
            "date_fin_lte",
        ]


@extend_schema_view(
    list=extend_schema(
        summary="Lister les plans d'action formation",
        description="Pagination standard ; filtrage par période, centre, formation, statut, auteur.",
        responses={200: OpenApiResponse(response=PlanActionFormationListSerializer(many=True))},
        tags=["Plans d'action formation"],
    ),
    retrieve=extend_schema(
        summary="Détail d'un plan d'action formation",
        responses={200: OpenApiResponse(response=PlanActionFormationReadSerializer)},
        tags=["Plans d'action formation"],
    ),
    create=extend_schema(
        summary="Créer un plan d'action formation",
        request=PlanActionFormationWriteSerializer,
        responses={201: OpenApiResponse(response=PlanActionFormationReadSerializer)},
        tags=["Plans d'action formation"],
    ),
    update=extend_schema(
        summary="Mettre à jour un plan (complet)",
        request=PlanActionFormationWriteSerializer,
        responses={200: OpenApiResponse(response=PlanActionFormationReadSerializer)},
        tags=["Plans d'action formation"],
    ),
    partial_update=extend_schema(
        summary="Mettre à jour un plan (partiel)",
        request=PlanActionFormationWriteSerializer,
        responses={200: OpenApiResponse(response=PlanActionFormationReadSerializer)},
        tags=["Plans d'action formation"],
    ),
    destroy=extend_schema(
        summary="Supprimer un plan d'action formation",
        responses={200: OpenApiResponse(description="Suppression effectuée.")},
        tags=["Plans d'action formation"],
    ),
)
class PlanActionFormationViewSet(ScopedModelViewSet):
    """
    CRUD des plans d'action, scope centre aligné sur les formations/centres.

    - lecture : `IsStaffOrAbove` + visibilité limitée par centre (direct ou via formation) ;
    - écriture : mêmes rôles que pour les commentaires de formation
      (voir `can_write_commentaires_formation`) ;
    - `destroy` : même contrôle d'écriture que la création / mise à jour ;
    - listes : `PlanActionFormationListSerializer`, détail : lecture complète,
      create/update : `PlanActionFormationWriteSerializer`.
    """

    queryset = (
        PlanActionFormation.objects.filter(is_active=True)
        .select_related("centre", "formation", "formation__centre", "created_by", "updated_by")
        .all()
    )
    permission_classes = [IsStaffOrAbove]
    pagination_class = RapAppPagination
    scope_mode = "centre"
    centre_lookup_paths = ("centre", "formation__centre")

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PlanActionFormationFilterSet
    search_fields = ["titre", "slug", "synthese", "resume_points_cles", "plan_action"]
    ordering_fields = ["id", "date_debut", "date_fin", "created_at", "updated_at", "nb_commentaires", "statut"]
    ordering = ["-date_debut", "-updated_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return PlanActionFormationListSerializer
        if self.action in ("create", "update", "partial_update"):
            return PlanActionFormationWriteSerializer
        return PlanActionFormationReadSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def get_queryset(self):
        return super().get_queryset().prefetch_related("commentaires")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return self.success_response(
            data=serializer.data,
            message=self.retrieve_message,
        )

    def _assert_can_write(self):
        if not can_write_commentaires_formation(self.request.user):
            raise PermissionDenied(
                "Vous avez un accès en lecture seule sur le module (plans d'action formation)."
            )

    def _read_serializer(self, instance):
        return PlanActionFormationReadSerializer(instance, context=self.get_serializer_context())

    def create(self, request, *args, **kwargs):
        self._assert_can_write()
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return self._plan_action_formation_invalid(serializer)
        instance = serializer.save()
        return self.created_response(data=self._read_serializer(instance).data)

    def update(self, request, *args, **kwargs):
        self._assert_can_write()
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            return self._plan_action_formation_invalid(serializer)
        instance = serializer.save()
        return self.success_response(
            data=self._read_serializer(instance).data,
            message=self.update_message,
        )

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def _plan_action_formation_invalid(self, serializer) -> Response:
        errs = serializer.errors
        return self.error_response(
            message=humanize_plan_action_formation_write_errors(errs),
            errors=errs,
            error_code="plan_action_formation_invalid",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    def destroy(self, request, *args, **kwargs):
        self._assert_can_write()
        return super().destroy(request, *args, **kwargs)

    @extend_schema(
        summary="Télécharger le plan d'action au format PDF",
        responses={200: OpenApiResponse(description="Fichier PDF (binaire).")},
        tags=["Plans d'action formation"],
    )
    @action(
        detail=True,
        methods=["get"],
        url_path="export-pdf",
        url_name="export-pdf",
    )
    def export_pdf(self, request, *args, **kwargs):
        """Génère un PDF WeasyPrint (synthèse, plan, commentaires liés)."""
        instance = self.get_object()
        read = PlanActionFormationReadSerializer(
            instance,
            context=self.get_serializer_context(),
        )
        plan_data = read.data
        md = instance.metadata if isinstance(instance.metadata, dict) else {}
        raw_pdf_ov = md.get("export_commentaire_overrides")
        pdf_overrides: dict[str, str] = {}
        if isinstance(raw_pdf_ov, dict):
            for ok, ov in raw_pdf_ov.items():
                if str(ok).isdigit() and isinstance(ov, str):
                    pdf_overrides[str(ok)] = ov
        items = []
        for c in (
            instance.commentaires.select_related("formation", "formation__centre", "created_by")
            .order_by("-created_at")
            .all()
        ):
            f = getattr(c, "formation", None)
            auteur = ""
            if c.created_by:
                if hasattr(c.created_by, "get_full_name"):
                    auteur = (c.created_by.get_full_name() or "").strip()
                if not auteur:
                    auteur = getattr(c.created_by, "username", "") or ""
            k = str(c.id)
            contenu_base = getattr(c, "contenu", "") or ""
            contenu = pdf_overrides[k] if k in pdf_overrides else contenu_base
            pdf_texte_adapte = k in pdf_overrides
            items.append(
                {
                    "id": c.id,
                    "contenu": contenu,
                    "pdf_texte_adapte": pdf_texte_adapte,
                    "created_at": c.created_at.strftime("%d/%m/%Y %H:%M")
                    if getattr(c, "created_at", None)
                    else "",
                    "formation_nom": getattr(f, "nom", "") if f else "",
                    "centre_nom": getattr(f.centre, "nom", "") if f and f.centre else "",
                    "auteur": auteur,
                }
            )
        try:
            logo_url = request.build_absolute_uri(static("images/logo.png"))
        except Exception:  # noqa: BLE001 — fallback fichier local
            logo_path = Path(settings.BASE_DIR) / "rap_app/static/images/logo.png"
            logo_url = f"file://{logo_path}"

        any_surcharge = any(i.get("pdf_texte_adapte") for i in items)
        texte_fusion = "\n\n".join(
            (i.get("contenu") or "").strip() for i in items if (i.get("contenu") or "").strip()
        )
        regroupe = bool(md.get("export_pdf_regroupe_commentaires") is True)
        context = {
            "plan": plan_data,
            "commentaires": items,
            "export_pdf_regroupe": regroupe,
            "texte_fusion": texte_fusion,
            "any_commentaire_surcharge": any_surcharge,
            "nb_commentaires": len(items),
            "user": request.user,
            "now": dj_timezone.now(),
            "logo_url": logo_url,
        }
        html_string = render_to_string("exports/plan_action_formation_pdf.html", context)
        pdf = HTML(string=html_string, base_url=request.build_absolute_uri("/")).write_pdf()
        base = slugify(instance.titre)[:60] or f"plan-{instance.pk}"
        filename = f"plan_action_{instance.pk}_{base}.pdf"
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["Content-Length"] = len(pdf)
        return response

    # ——— LOT 3 : regroupement journalier (read-only, isolé) ———

    _LIMITE_COMMENTAIRES_DEFAUT = 2000
    _LIMITE_COMMENTAIRES_MAX = 5000

    def _portee_filtres_commentaires_interdits(
        self,
        user,
        centre_ids: list[int],
        formation_id: int | None,
        formation_ids: list[int] | None = None,
    ) -> None:
        """
        Lève :exc:`rest_framework.exceptions.PermissionDenied` si un filtre
        explicite ``centre`` / ``centres`` / ``formation`` / ``formations`` pointe hors du
        périmètre centre des profils scopés.
        """
        if is_admin_like(user):
            return
        if not is_centre_scoped_staff(user):
            return
        allowed = set(staff_centre_ids(user) or [])
        for c_id in centre_ids:
            if c_id not in allowed:
                raise PermissionDenied("Ce centre n'est pas dans votre périmètre.")
        fids: list[int] = []
        if formation_ids:
            fids = list(formation_ids)
        elif formation_id is not None:
            fids = [formation_id]
        for fid in fids:
            formation = (
                Formation.objects.filter(pk=fid).only("id", "centre_id").select_related("centre").first()
            )
            if formation and getattr(formation, "centre_id", None) is not None:
                if formation.centre_id not in allowed:
                    raise PermissionDenied("Cette formation n'est pas dans votre périmètre (centre).")

    @extend_schema(
        summary="Commentaires filtrés regroupés par jour (synthèse plan d'action)",
        description=(
            "Endpoint **read-only** à usage du module Plan d'action : retourne les "
            "commentaires de formation filtrés par période (dates sur ``created_at``) "
            "et optionnellement par centre / formation, regroupés par **jour** "
            "(fuseau Europe/Paris). Par défaut, seuls les commentaires **actifs** "
            "sont inclus. Périmètre centre aligné sur l'API commentaires. "
            "Un plafond ``limite`` protège l'API lorsque le volume est élevé."
        ),
        parameters=[
            OpenApiParameter(
                name="date_debut",
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Borne basse (incluse) sur la date de ``created_at`` (YYYY-MM-DD).",
            ),
            OpenApiParameter(
                name="date_fin",
                type=OpenApiTypes.DATE,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Borne haute (incluse) sur la date de ``created_at`` (YYYY-MM-DD).",
            ),
            OpenApiParameter(
                name="centre",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Identifiant du centre (filtre sur ``formation__centre_id``). Peut être répété.",
            ),
            OpenApiParameter(
                name="centres",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Liste d'identifiants centres séparés par des virgules (ex. 1,2,3), équivalent à répéter ``centre``.",
            ),
            OpenApiParameter(
                name="formation",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Identifiant d’une formation (héritage). Répéter le paramètre ou utiliser ``formations`` pour en choisir plusieurs.",
            ),
            OpenApiParameter(
                name="formations",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Liste d’identifiants de formations, séparés par des virgules (ex. 10,20,30).",
            ),
            OpenApiParameter(
                name="inclure_archives",
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Si vrai, inclut les commentaires au statut archivé (défaut : faux).",
            ),
            OpenApiParameter(
                name="limite",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Nombre max de commentaires retournés après filtre (défaut 2000, plafond 5000).",
            ),
        ],
        responses={200: OpenApiResponse(description="Regroupement par jour (enveloppe success).")},
        tags=["Plans d'action formation"],
    )
    @action(
        detail=False,
        methods=["get"],
        url_path="commentaires-groupes",
        url_name="commentaires-groupes",
    )
    def commentaires_groupes(self, request, *args, **kwargs):
        """
        Retourne les commentaires de formation filtrés puis regroupés par jour
        calendaire, pour alimenter l'écran de construction de plan
        d'action.

        Cette action ne modifie rien côté ``CommentaireViewSet`` : elle
        s'appuie sur
        :func:`rap_app.services.plan_action_commentaires.construire_queryset_commentaires_plan_action`
        et sur les mêmes règles de visibilité par centre.
        """
        p = request.query_params
        date_debut = parse_date(str(p.get("date_debut"))) if p.get("date_debut") else None
        date_fin = parse_date(str(p.get("date_fin"))) if p.get("date_fin") else None
        if date_debut is None and date_fin is None:
            return self.error_response(
                message="Fournir au moins un paramètre date_debut et/ou date_fin pour limiter la période.",
                error_code="plan_action_periode_requise",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if date_debut and date_fin and date_fin < date_debut:
            return self.error_response(
                message="date_fin doit être postérieure ou égale à date_debut.",
                error_code="plan_action_periode_invalide",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        raw_formation = p.get("formation")
        formation_id_single = int(raw_formation) if raw_formation and str(raw_formation).isdigit() else None
        formation_ids: list[int] = []
        raw_formations_csv = p.get("formations")
        if raw_formations_csv:
            for part in str(raw_formations_csv).split(","):
                t = part.strip()
                if t.isdigit():
                    formation_ids.append(int(t))
        if not formation_ids:
            for f in p.getlist("formation"):
                if f is not None and str(f).isdigit():
                    formation_ids.append(int(f))
        formation_ids = list(dict.fromkeys(formation_ids))
        formation_id: int | None = None if len(formation_ids) > 0 else formation_id_single
        raw_centres_csv = p.get("centres")
        centre_ids: list[int] = []
        if raw_centres_csv:
            for part in str(raw_centres_csv).split(","):
                t = part.strip()
                if t.isdigit():
                    centre_ids.append(int(t))
        if not centre_ids:
            for c in p.getlist("centre"):
                if c is not None and str(c).isdigit():
                    centre_ids.append(int(c))
        if not centre_ids:
            raw_one = p.get("centre")
            if raw_one and str(raw_one).isdigit():
                centre_ids.append(int(raw_one))
        centre_ids = list(dict.fromkeys(centre_ids))
        self._portee_filtres_commentaires_interdits(
            request.user,
            centre_ids,
            formation_id,
            formation_ids if len(formation_ids) > 0 else None,
        )

        inclure_archives = str(p.get("inclure_archives", "false")).lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        try:
            limite = int(p.get("limite") or self._LIMITE_COMMENTAIRES_DEFAUT)
        except (TypeError, ValueError):
            return self.error_response(
                message="Paramètre limite invalide (entier attendu).",
                error_code="plan_action_limite_invalide",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        limite = max(1, min(limite, self._LIMITE_COMMENTAIRES_MAX))

        qs = construire_queryset_commentaires_plan_action(
            request.user,
            date_debut=date_debut,
            date_fin=date_fin,
            centre_id=None,
            centre_ids=centre_ids if len(centre_ids) > 0 else None,
            formation_id=formation_id,
            formation_ids=formation_ids if len(formation_ids) > 0 else None,
            inclure_archives=inclure_archives,
        )
        total = qs.count()
        rows: list = list(qs[:limite])
        limite_atteinte = total > len(rows)

        groupes_bruts = regrouper_commentaires_par_jour_local(rows)
        jours_payload = []
        for g in groupes_bruts:
            jours_payload.append(
                {
                    "date": g["date"],
                    "nombre": g["nombre"],
                    "commentaires": PlanActionCommentaireGroupeItemSerializer(
                        g["items"],
                        many=True,
                        context=self.get_serializer_context(),
                    ).data,
                }
            )

        return self.success_response(
            data={
                "total_commentaires": total,
                "commentaires_retournes": len(rows),
                "limite": limite,
                "limite_atteinte": limite_atteinte,
                "date_debut": date_debut.isoformat() if date_debut else None,
                "date_fin": date_fin.isoformat() if date_fin else None,
                "filtres": {
                    "centre_ids": centre_ids,
                    "formation_id": formation_id,
                    "formation_ids": formation_ids,
                    "inclure_archives": inclure_archives,
                },
                "jours": jours_payload,
            },
            message="Commentaires regroupés par jour (plan d'action).",
        )
