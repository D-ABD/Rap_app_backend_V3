from __future__ import annotations

import os

from django.conf import settings
from django.http import FileResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from ...api.paginations import RapAppPagination
from ...api.permissions import IsStaffOrAbove
from ...models import Candidat, CerfaContrat, Formation, Partenaire
from ...services.placement_services import AppairagePlacementService
from ...utils.pdf_cerfa_utils import generer_pdf_cerfa
from ..serializers.cerfa_serializers import CerfaContratSerializer, _sync_choice_labels
from .base import BaseApiViewSet


class CerfaContratViewSet(BaseApiViewSet):
    queryset = CerfaContrat.objects.all()
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
    destroy_message = "CERFA supprime avec succes."

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
        if not instance.pdf_fichier:
            output_path = generer_pdf_cerfa(instance)
            instance.pdf_fichier.name = os.path.relpath(output_path, settings.MEDIA_ROOT)
            instance.save(update_fields=["pdf_fichier", "updated_at"])

        return FileResponse(
            instance.pdf_fichier.open("rb"),
            content_type="application/pdf",
            as_attachment=True,
            filename=f"cerfa_{instance.pk}.pdf",
        )
