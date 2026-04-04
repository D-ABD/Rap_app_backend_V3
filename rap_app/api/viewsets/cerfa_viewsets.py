"""ViewSet des contrats CERFA."""

from __future__ import annotations

import os

from django.conf import settings
from django.http import FileResponse
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated

from ...api.paginations import RapAppPagination
from ...api.permissions import IsStaffOrAbove
from ...models import Candidat, CerfaContrat, Formation, Partenaire
from ...services.placement_services import AppairagePlacementService
from ...utils.pdf_cerfa_utils import build_cerfa_export_filename, generer_pdf_cerfa
from ..roles import is_admin_like, is_centre_scoped_staff, staff_centre_ids
from ..serializers.cerfa_serializers import CerfaContratSerializer, _sync_choice_labels
from .base import BaseApiViewSet


class CerfaContratViewSet(BaseApiViewSet):
    """
    ViewSet des contrats CERFA.

    La visibilité opérationnelle suit le même principe que les modules coeur :
    - admin / superadmin : vue globale
    - rôles coeur centre-scopés (`commercial`, `charge_recrutement`, `staff`, `staff_read`) :
      vue limitée aux centres explicitement attribués
    """

    queryset = CerfaContrat.objects.all()
    hard_delete_enabled = True
    serializer_class = CerfaContratSerializer
    permission_classes = [IsAuthenticated, IsStaffOrAbove]
    pagination_class = RapAppPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "apprenti_nom_naissance",
        "apprenti_prenom",
        "employeur_nom",
        "diplome_vise",
        "diplome_intitule",
    ]
    ordering_fields = ["created_at", "date_conclusion", "date_debut_execution"]
    ordering = ["-created_at"]
    filterset_fields = ["auto_generated"]
    list_message = "CERFAs recuperes avec succes."
    retrieve_message = "CERFA recupere avec succes."
    create_message = "CERFA cree avec succes."
    update_message = "CERFA mis a jour avec succes."
    destroy_message = "CERFA archive avec succes."

    def _assert_cerfa_scope(self, candidat=None, formation=None):
        """Refuse une écriture CERFA hors centres attribués pour les rôles coeur centre-scopés."""
        user = getattr(self.request, "user", None)
        if is_admin_like(user) or not is_centre_scoped_staff(user):
            return

        centre_ids = set(staff_centre_ids(user) or [])
        formation_centre_id = getattr(formation, "centre_id", None) if formation is not None else None
        candidat_centre_id = (
            getattr(getattr(candidat, "formation", None), "centre_id", None) if candidat is not None else None
        )

        if formation_centre_id and formation_centre_id not in centre_ids:
            raise PermissionDenied("Formation hors de votre périmètre (centre).")
        if candidat_centre_id and candidat_centre_id not in centre_ids:
            raise PermissionDenied("Candidat hors de votre périmètre (centre).")

    def get_queryset(self):
        """
        Retourne les contrats CERFA actifs avec leurs relations utiles,
        puis applique les filtres de recherche et de périmètre demandés.
        """
        queryset = super().get_queryset().select_related(
            "candidat",
            "formation",
            "formation__centre",
            "employeur",
        ).filter(is_active=True)

        user = getattr(self.request, "user", None)
        if not is_admin_like(user) and is_centre_scoped_staff(user):
            centre_ids = staff_centre_ids(user) or []
            queryset = queryset.filter(
                Q(formation__centre_id__in=centre_ids) | Q(candidat__formation__centre_id__in=centre_ids)
            )

        params = self.request.query_params
        centre_id = params.get("centre")
        cerfa_type = params.get("cerfa_type")
        type_contrat_code = params.get("type_contrat_code")
        date_field = params.get("date_field")
        date_from = params.get("date_from")
        date_to = params.get("date_to")

        if centre_id not in (None, ""):
            queryset = queryset.filter(
                Q(formation__centre_id=centre_id) | Q(candidat__formation__centre_id=centre_id)
            )

        if cerfa_type not in (None, ""):
            queryset = queryset.filter(cerfa_type=cerfa_type)

        if type_contrat_code not in (None, ""):
            queryset = queryset.filter(type_contrat_code=type_contrat_code)

        allowed_date_fields = {"created_at", "date_conclusion", "date_debut_execution", "formation_debut"}
        if date_field in allowed_date_fields:
            if date_from not in (None, ""):
                queryset = queryset.filter(**{f"{date_field}__date__gte": date_from} if date_field == "created_at" else {f"{date_field}__gte": date_from})
            if date_to not in (None, ""):
                queryset = queryset.filter(**{f"{date_field}__date__lte": date_to} if date_field == "created_at" else {f"{date_field}__lte": date_to})

        return queryset

    def perform_create(self, serializer):
        candidat_id = serializer.validated_data.get("candidat_id")
        formation_id = serializer.validated_data.get("formation_id")

        candidat = Candidat.objects.select_related("formation").filter(pk=candidat_id).first() if candidat_id else None
        formation = Formation.objects.select_related("centre").filter(pk=formation_id).first() if formation_id else None
        self._assert_cerfa_scope(candidat=candidat, formation=formation)
        serializer.save()

    def perform_update(self, serializer):
        instance = serializer.instance
        candidat_id = serializer.validated_data.get("candidat_id", getattr(instance, "candidat_id", None))
        formation_id = serializer.validated_data.get("formation_id", getattr(instance, "formation_id", None))

        candidat = Candidat.objects.select_related("formation").filter(pk=candidat_id).first() if candidat_id else None
        formation = Formation.objects.select_related("centre").filter(pk=formation_id).first() if formation_id else None
        self._assert_cerfa_scope(candidat=candidat, formation=formation)
        serializer.save()

    @extend_schema(
        summary="Archiver un contrat CERFA",
        description="Conserve `DELETE` pour compatibilité mais archive logiquement le contrat CERFA via `is_active = False`.",
        responses={200: OpenApiResponse(description="Contrat CERFA archivé avec succès.")},
    )
    def destroy(self, request, *args, **kwargs):
        """
        Archive logiquement un contrat CERFA et le retire des listes
        actives sans supprimer le snapshot ni le PDF associé.
        """
        instance = self.filter_queryset(self.get_queryset()).filter(pk=kwargs.get("pk")).first()
        if instance is None:
            return self.success_response(
                data=None,
                message="CERFA deja absent ou deja archive.",
            )

        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        return self.success_response(
            data=self.get_serializer(instance).data,
            message=self.destroy_message,
        )

    @action(detail=False, methods=["get"], url_path="prefill")
    def prefill(self, request):
        def _as_int(value):
            if value in (None, "", "null", "undefined"):
                return None
            try:
                return int(value)
            except (TypeError, ValueError):
                return None

        candidat_id = request.query_params.get("candidat")
        formation_id = request.query_params.get("formation")
        employeur_id = request.query_params.get("employeur")

        if not any([candidat_id, formation_id, employeur_id]):
            raise ValidationError(
                {"detail": "Au moins un identifiant candidat, formation ou employeur est requis."}
            )

        candidat_id = _as_int(candidat_id)
        formation_id = _as_int(formation_id)
        employeur_id = _as_int(employeur_id)

        candidat = (
            Candidat.objects.select_related(
                "compte_utilisateur",
                "formation",
                "formation__centre",
                "entreprise_placement",
                "entreprise_validee",
                "placement_appairage",
                "placement_appairage__partenaire",
            )
            .filter(pk=candidat_id)
            .first()
            if candidat_id
            else None
        )
        formation = None
        if formation_id:
            formation = Formation.objects.filter(pk=formation_id).first()
        elif candidat and getattr(candidat, "formation_id", None):
            formation = candidat.formation

        partenaire = None
        if employeur_id:
            partenaire = Partenaire.objects.filter(pk=employeur_id).first()
        elif candidat is not None:
            reference_appairage = AppairagePlacementService.get_preferred_appairage_for_candidate(candidat)
            partenaire = getattr(reference_appairage, "partenaire", None)
            if partenaire is None:
                partenaire = getattr(candidat, "entreprise_validee", None)
            if partenaire is None:
                partenaire = getattr(candidat, "entreprise_placement", None)

        payload = CerfaContrat.build_prefill_payload(
            candidat=candidat,
            formation=formation,
            partenaire=partenaire,
        )
        payload = _sync_choice_labels(payload)
        return self.success_response(
            data=payload,
            message="Pre-remplissage CERFA calcule avec succes.",
        )

    @action(detail=True, methods=["post"], url_path="generate-pdf")
    def generate_pdf(self, request, pk=None):
        instance = self.get_object()
        output_path = generer_pdf_cerfa(instance)
        instance.pdf_fichier.name = os.path.relpath(output_path, settings.MEDIA_ROOT)
        instance.save(update_fields=["pdf_fichier", "updated_at"])
        serializer = self.get_serializer(instance)
        return self.success_response(
            data={
                "id": instance.id,
                "pdf_url": serializer.data.get("pdf_url"),
                "message": "PDF CERFA genere avec succes.",
            },
            message="PDF CERFA genere avec succes.",
        )

    @action(detail=True, methods=["get"], url_path="download-pdf")
    def download_pdf(self, request, pk=None):
        instance = self.get_object()
        # Always regenerate on download so the exported file reflects the current CERFA snapshot.
        output_path = generer_pdf_cerfa(instance)
        instance.pdf_fichier.name = os.path.relpath(output_path, settings.MEDIA_ROOT)
        instance.save(update_fields=["pdf_fichier", "updated_at"])

        return FileResponse(
            instance.pdf_fichier.open("rb"),
            content_type="application/pdf",
            as_attachment=True,
            filename=build_cerfa_export_filename(instance),
        )
