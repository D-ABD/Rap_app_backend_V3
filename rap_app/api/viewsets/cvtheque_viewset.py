# rap_app/api/viewsets/cvtheque_viewset.py

import mimetypes
import urllib.parse
import os
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse
from rest_framework.decorators import action
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiResponse,
    OpenApiTypes,
)

from ...models.cvtheque import CVTheque
from ...api.paginations import RapAppPagination
from ..permissions import CanAccessCVTheque
from ...api.roles import (
    is_admin_like,
    is_staff_or_staffread,
    is_staff_like,
    is_candidate,
)

from ..serializers.cvtheque_serializers import (
    CVThequeListSerializer,
    CVThequeDetailSerializer,
    CVThequeWriteSerializer,
)

class CVThequeFilterSet(django_filters.FilterSet):
    """Filtres : centre_id, formation_id, type_offre_id, statut_formation, ville (icontains), document_type."""
    centre_id = django_filters.NumberFilter(field_name="candidat__formation__centre__id")
    formation_id = django_filters.NumberFilter(field_name="candidat__formation__id")
    type_offre_id = django_filters.NumberFilter(field_name="candidat__formation__type_offre__id")
    statut_formation = django_filters.NumberFilter(field_name="candidat__formation__statut__id")
    ville = django_filters.CharFilter(field_name="candidat__ville", lookup_expr="icontains")
    document_type = django_filters.CharFilter(field_name="document_type")

    class Meta:
        model = CVTheque
        fields = [
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
)
class CVThequeViewSet(viewsets.ModelViewSet):
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
        """preview/download : pas de scope ; admin tout ; candidat : ses docs ; staff : par user.centres ; sinon none()."""
        qs = super().get_queryset()
        user = self.request.user

        if getattr(self, "action", None) in ["preview", "download"]:
            return qs

        if is_admin_like(user):
            return qs

        if is_candidate(user):
            return qs.filter(candidat__compte_utilisateur=user)

        if is_staff_like(user) or is_staff_or_staffread(user):
            centre_ids = list(user.centres.values_list("id", flat=True))
            if centre_ids:
                return qs.filter(candidat__formation__centre_id__in=centre_ids)
            return qs.none()

        return qs.none()

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
            "document_types": [
                {"value": key, "label": label} for key, label in CVTheque.DOCUMENT_TYPES
            ],
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
        """Liste paginée ; results + filters (_get_filter_values(qs))."""
        qs = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page or qs, many=True)

        data = {
            "results": serializer.data,
            "filters": self._get_filter_values(qs),
        }

        if page:
            return self.get_paginated_response(data)

        return Response(data)

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
            return Response({"success": False, "message": "Aucun fichier associé."},
                            status=status.HTTP_404_NOT_FOUND)

        try:
            file = obj.fichier.open("rb")
        except FileNotFoundError:
            return Response({"success": False, "message": "Fichier introuvable."},
                            status=status.HTTP_404_NOT_FOUND)

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
            return Response(
                {"success": False, "message": "Aucun fichier associé."},
                status=status.HTTP_404_NOT_FOUND
            )

        if not os.path.exists(obj.fichier.path):
            return Response(
                {"success": False, "message": "Fichier introuvable sur le serveur."},
                status=status.HTTP_404_NOT_FOUND
            )

        file = obj.fichier.open("rb")
        response = FileResponse(file, content_type="application/pdf")

        filename = urllib.parse.quote(obj.titre or obj.fichier.name)
        response["Content-Disposition"] = f"inline; filename*=UTF-8''{filename}"

        return response
