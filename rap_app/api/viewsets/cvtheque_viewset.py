"""ViewSet de la CVthèque."""

import mimetypes
import os
import urllib.parse

import django_filters
from django.http import FileResponse
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import (
    OpenApiResponse,
    OpenApiTypes,
    extend_schema,
    extend_schema_view,
)
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from ...api.paginations import RapAppPagination
from ...api.roles import (
    is_admin_like,
    is_candidate,
    is_staff_like,
    is_staff_or_staffread,
)
from ...models.cvtheque import CVTheque
from ..permissions import CanAccessCVTheque
from ..serializers.cvtheque_serializers import (
    CVThequeDetailSerializer,
    CVThequeListSerializer,
    CVThequeWriteSerializer,
)
from .base import BaseApiViewSet


class CVThequeFilterSet(django_filters.FilterSet):
    """Filtres : candidat (id), centre_id, formation_id, type_offre_id, statut_formation, ville, document_type."""

    candidat = django_filters.NumberFilter(field_name="candidat_id")
    centre_id = django_filters.NumberFilter(field_name="candidat__formation__centre__id")
    formation_id = django_filters.NumberFilter(field_name="candidat__formation__id")
    type_offre_id = django_filters.NumberFilter(field_name="candidat__formation__type_offre__id")
    statut_formation = django_filters.NumberFilter(field_name="candidat__formation__statut__id")
    ville = django_filters.CharFilter(field_name="candidat__ville", lookup_expr="icontains")
    document_type = django_filters.CharFilter(field_name="document_type")

    class Meta:
        model = CVTheque
        fields = [
            "candidat",
            "document_type",
            "centre_id",
            "formation_id",
            "type_offre_id",
            "statut_formation",
            "ville",
        ]


@extend_schema_view(
    list=extend_schema(
        summary="Liste des documents CVThèque",
        responses={200: OpenApiResponse(response=CVThequeListSerializer)},
        tags=["CVThèque"],
    ),
    retrieve=extend_schema(
        summary="Détail d’un document",
        responses={200: OpenApiResponse(response=CVThequeDetailSerializer)},
        tags=["CVThèque"],
    ),
    destroy=extend_schema(
        summary="Archiver un document CVThèque",
        responses={200: OpenApiResponse(response=CVThequeDetailSerializer)},
        tags=["CVThèque"],
    ),
    desarchiver=extend_schema(
        summary="Restaurer un document CVThèque",
        responses={200: OpenApiResponse(response=CVThequeDetailSerializer)},
        tags=["CVThèque"],
    ),
)
class CVThequeViewSet(BaseApiViewSet):
    """ViewSet CRUD pour CVTheque. CanAccessCVTheque. get_queryset : admin tout, candidat ses docs, staff par user.centres ; preview/download sans scope. list retourne results + filters (_get_filter_values). download (attachment), preview (inline PDF)."""

    queryset = CVTheque.objects.select_related(
        "candidat",
        "candidat__formation",
        "candidat__formation__centre",
        "candidat__formation__type_offre",
        "candidat__formation__statut",
    )

    permission_classes = [CanAccessCVTheque]
    parser_classes = [MultiPartParser, FormParser]
    pagination_class = RapAppPagination

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = CVThequeFilterSet

    search_fields = [
        "titre",
        "mots_cles",
        "candidat__nom",
        "candidat__prenom",
        "candidat__ville",
        "candidat__formation__nom",
        "candidat__formation__centre__nom",
        "candidat__formation__type_offre__nom",
        "candidat__formation__statut__nom",
        "candidat__formation__num_offre",
    ]

    ordering_fields = ["date_depot", "document_type", "titre"]
    ordering = ["-date_depot"]

    def get_queryset(self):
        """
        Retourne les documents CVThèque visibles pour l'utilisateur courant.

        Par défaut les documents archivés sont exclus. Ils peuvent être
        inclus via `avec_archivees=true` ou limités via
        `archives_seules=true`.
        """
        qs = super().get_queryset()
        user = self.request.user

        if is_admin_like(user):
            scoped = qs
        elif is_candidate(user):
            scoped = qs.filter(candidat__compte_utilisateur=user)
        elif is_staff_like(user) or is_staff_or_staffread(user):
            centre_ids = list(user.centres.values_list("id", flat=True))
            if centre_ids:
                scoped = qs.filter(candidat__formation__centre_id__in=centre_ids)
            else:
                scoped = qs.none()
        else:
            scoped = qs.none()

        if self.action in {"retrieve", "destroy", "desarchiver", "download", "preview"}:
            return scoped

        inclure_archivees = str(self.request.query_params.get("avec_archivees", "false")).lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        archives_seules = str(self.request.query_params.get("archives_seules", "false")).lower() in {
            "1",
            "true",
            "yes",
            "on",
        }

        if archives_seules:
            return scoped.filter(is_active=False)
        if inclure_archivees:
            return scoped
        return scoped.filter(is_active=True)

    def destroy(self, request, *args, **kwargs):
        """
        Conserve `DELETE` pour compatibilité mais archive
        logiquement le document CVThèque.
        """
        instance = self.get_object()
        if not instance.is_active:
            serializer = CVThequeDetailSerializer(instance, context=self.get_serializer_context())
            return self.success_response(
                data=serializer.data,
                message="Document CVThèque déjà archivé.",
                status_code=status.HTTP_200_OK,
            )

        instance.is_active = False
        instance.save(user=request.user, update_fields=["is_active"])
        serializer = CVThequeDetailSerializer(instance, context=self.get_serializer_context())
        return self.success_response(
            data=serializer.data,
            message="Document CVThèque archivé avec succès.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="desarchiver")
    def desarchiver(self, request, pk=None):
        """
        Restaure logiquement un document CVThèque archivé.
        """
        instance = self.get_object()
        serializer = CVThequeDetailSerializer(instance, context=self.get_serializer_context())

        if instance.is_active:
            return self.success_response(
                data=serializer.data,
                message="Document CVThèque déjà actif.",
                status_code=status.HTTP_200_OK,
            )

        instance.is_active = True
        instance.save(user=request.user, update_fields=["is_active"])
        serializer = CVThequeDetailSerializer(instance, context=self.get_serializer_context())
        return self.success_response(
            data=serializer.data,
            message="Document CVThèque restauré avec succès.",
            status_code=status.HTTP_200_OK,
        )

    # 🔧 SERIALIZERS
    def get_serializer_class(self):
        """list => CVThequeListSerializer ; retrieve => CVThequeDetailSerializer ; create/update/partial/destroy => CVThequeWriteSerializer."""
        if self.action == "list":
            return CVThequeListSerializer
        if self.action == "retrieve":
            return CVThequeDetailSerializer
        return CVThequeWriteSerializer

    # 🎛️ FILTRES DYNAMIQUES POUR L'UI
    def _get_filter_values(self, qs):
        """Retourne document_types, centres, formations, type_offres, statuts_formation pour les filtres UI."""
        formations = qs.values(
            "candidat__formation_id",
            "candidat__formation__nom",
            "candidat__formation__centre__nom",
            "candidat__formation__type_offre__nom",
            "candidat__formation__statut__nom",
        ).distinct()

        centres = qs.values(
            "candidat__formation__centre_id",
            "candidat__formation__centre__nom",
        ).distinct()

        type_offres = qs.values(
            "candidat__formation__type_offre_id",
            "candidat__formation__type_offre__nom",
        ).distinct()

        statuts = qs.values(
            "candidat__formation__statut_id",
            "candidat__formation__statut__nom",
        ).distinct()

        return {
            "document_types": [{"value": key, "label": label} for key, label in CVTheque.DOCUMENT_TYPES],
            "centres": [
                {"value": c["candidat__formation__centre_id"], "label": c["candidat__formation__centre__nom"]}
                for c in centres
            ],
            "formations": [
                {
                    "id": f["candidat__formation_id"],
                    "nom": f["candidat__formation__nom"],
                    "centre": f["candidat__formation__centre__nom"],
                    "type_offre": f["candidat__formation__type_offre__nom"],
                    "statut": f["candidat__formation__statut__nom"],
                }
                for f in formations
            ],
            "type_offres": [
                {"value": t["candidat__formation__type_offre_id"], "label": t["candidat__formation__type_offre__nom"]}
                for t in type_offres
            ],
            "statuts_formation": [
                {"value": s["candidat__formation__statut_id"], "label": s["candidat__formation__statut__nom"]}
                for s in statuts
            ],
        }

    # 📄 LIST
    def list(self, request, *args, **kwargs):
        """Liste paginée dans l'enveloppe standard, avec `filters` au même niveau que `results`."""
        qs = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page or qs, many=True)
        filters_data = self._get_filter_values(qs)

        if page:
            response = self.get_paginated_response(serializer.data)
            response.data["message"] = "Liste paginée des documents CVThèque."
            response.data["data"]["filters"] = filters_data
            return response

        return self.success_response(
            data={
                "count": len(serializer.data),
                "results": serializer.data,
                "filters": filters_data,
            },
            message="Liste des documents CVThèque.",
        )

    # 📥 DOWNLOAD  (OK)
    @extend_schema(
        summary="Télécharger un CV",
        responses={200: OpenApiResponse(response=OpenApiTypes.BINARY)},
        tags=["CVThèque"],
    )
    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        """GET : fichier en attachment (Content-Disposition), type MIME deviné ; 404 si pas de fichier."""
        obj = self.get_object()

        if not obj.fichier:
            return Response({"success": False, "message": "Aucun fichier associé."}, status=status.HTTP_404_NOT_FOUND)

        try:
            file = obj.fichier.open("rb")
        except FileNotFoundError:
            return Response({"success": False, "message": "Fichier introuvable."}, status=status.HTTP_404_NOT_FOUND)

        mime_type, _ = mimetypes.guess_type(obj.fichier.name)
        response = FileResponse(file, content_type=mime_type or "application/octet-stream")

        filename = urllib.parse.quote(obj.titre or obj.fichier.name)
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{filename}"

        return response

    # 👁️ PREVIEW (OK – FIX 404)
    @extend_schema(
        summary="Prévisualisation du PDF",
        tags=["CVThèque"],
    )
    @action(detail=True, methods=["get"], url_path="preview")
    def preview(self, request, pk=None):
        """GET : fichier PDF en inline ; 404 si pas de fichier ou path absent."""
        obj = self.get_object()

        if not obj.fichier:
            return Response({"success": False, "message": "Aucun fichier associé."}, status=status.HTTP_404_NOT_FOUND)

        if not os.path.exists(obj.fichier.path):
            return Response(
                {"success": False, "message": "Fichier introuvable sur le serveur."}, status=status.HTTP_404_NOT_FOUND
            )

        file = obj.fichier.open("rb")
        response = FileResponse(file, content_type="application/pdf")

        filename = urllib.parse.quote(obj.titre or obj.fichier.name)
        response["Content-Disposition"] = f"inline; filename*=UTF-8''{filename}"

        return response
    hard_delete_enabled = True
