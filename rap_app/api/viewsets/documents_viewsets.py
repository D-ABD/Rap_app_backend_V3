"""ViewSet des documents."""

import csv
import logging
import mimetypes
import urllib.parse

import django_filters
from django.http import FileResponse, HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    OpenApiTypes,
    extend_schema,
    extend_schema_view,
)
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ...api.paginations import RapAppPagination
from ...api.permissions import (  # ✅ staff/admin/superadmin only
    IsStaffOrAbove,
    is_staff_or_staffread,
)
from ...api.serializers.documents_serializers import (
    DocumentCreateSerializer,
    DocumentSerializer,
    DocumentUpdateSerializer,
    TypeDocumentChoiceSerializer,
)
from ...models.documents import Document
from ...models.logs import LogUtilisateur
from ..roles import can_write_documents, is_admin_like, is_centre_scoped_staff
from .scoped_viewset import ScopedModelViewSet

logger = logging.getLogger("application.api")


class DocumentFilter(django_filters.FilterSet):
    """
    Filtres disponibles pour le listing de documents dans l'API:
    - centre_id : filtre sur l'id du centre lié à la formation du document
    - statut_id : filtre sur l'id du statut de la formation
    - type_offre_id : filtre sur l'id du type d'offre de la formation

    À utiliser côté client via query params.
    """

    centre_id = django_filters.NumberFilter(field_name="formation__centre_id")
    statut_id = django_filters.NumberFilter(field_name="formation__statut_id")
    type_offre_id = django_filters.NumberFilter(field_name="formation__type_offre_id")

    class Meta:
        model = Document
        fields = ["centre_id", "statut_id", "type_offre_id"]


@extend_schema_view(
    desarchiver=extend_schema(
        summary="♻️ Restaurer un document",
        responses={200: OpenApiResponse(response=DocumentSerializer)},
    )
)
@extend_schema(tags=["Documents"])
class DocumentViewSet(ScopedModelViewSet):
    """
    ViewSet CRUD des documents liés aux formations.

    Source de vérité actuelle :
    - permissions via `IsStaffOrAbove`
    - scoping via `ScopedModelViewSet` avec `scope_mode = "centre"`
    - visibilité calculée à partir de `formation__centre_id`
    - validation d'écriture renforcée par `_assert_staff_can_use_formation`

    Contrat de réponse actuel :
    - `list()` passe par la pagination configurée sur `RapAppPagination`
    - `retrieve()`, `create()`, `update()` et `destroy()` renvoient une enveloppe
      JSON `{success, message, data}`
    - `destroy()` renvoie actuellement un `200 OK` avec body JSON
    """

    serializer_class = DocumentSerializer
    permission_classes = [IsStaffOrAbove]
    pagination_class = RapAppPagination
    scope_mode = "centre"
    centre_lookup_paths = ("formation__centre_id",)

    filter_backends = [DjangoFilterBackend]
    filterset_class = DocumentFilter

    # --------------------- helpers scope/permissions ---------------------
    # (helpers internes, ne sont pas des endpoints API)

    def _assert_staff_can_use_formation(self, formation):
        """
        Protection stricte pour les opérations d'écriture :
        - Empêche tout staff d'opérer sur une formation hors de son périmètre centre.
        - Admin/superadmin: pas de restriction.
        """
        if not formation:
            return
        user = self.request.user
        if is_admin_like(user):
            return
        if is_centre_scoped_staff(user):
            allowed = set(user.centres.values_list("id", flat=True))
            if getattr(formation, "centre_id", None) not in allowed:
                raise PermissionDenied("Formation hors de votre périmètre (centre).")

    def _assert_can_write_documents(self):
        """Refuse l'écriture aux rôles ayant seulement la lecture sur les documents."""
        if not can_write_documents(self.request.user):
            raise PermissionDenied("Vous avez un accès en lecture seule sur les documents.")

    def get_serializer_class(self):
        if self.action == "create":
            return DocumentCreateSerializer
        if self.action in ["update", "partial_update"]:
            return DocumentUpdateSerializer
        return DocumentSerializer

    # ------------------------------ queryset ------------------------------

    def get_base_queryset(self):
        """
        Retourne le queryset de base avant application du scoping centralisé.

        Le filtrage par rôle/centre n'est pas fait ici : il est appliqué ensuite
        par `ScopedModelViewSet.get_queryset()`.
        """
        qs = Document.objects.select_related(
            "formation", "formation__centre", "formation__statut", "formation__type_offre", "created_by"
        )

        if self.action in {"retrieve", "destroy", "desarchiver", "download"}:
            return qs

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
            return qs.filter(is_active=False)
        if inclure_archivees:
            return qs
        return qs.filter(is_active=True)

    # ------------------------------ list/retrieve -------------------------

    @extend_schema(
        summary="📄 Lister tous les documents", responses={200: OpenApiResponse(response=DocumentSerializer(many=True))}
    )
    def list(self, request, *args, **kwargs):
        """
        Liste paginée des documents visibles après application du scope centre.

        Le format de sortie est celui de `RapAppPagination`, pas l'enveloppe
        `{success, message, data}` utilisée par les autres actions CRUD.
        """
        return super().list(request, *args, **kwargs)

    @extend_schema(summary="📂 Détail d’un document", responses={200: OpenApiResponse(response=DocumentSerializer)})
    def retrieve(self, request, *args, **kwargs):
        """
        Retourne un document visible pour l'utilisateur courant dans
        l'enveloppe JSON standard de l'API.
        """
        doc = self.get_object()  # get_object() utilise get_queryset() -> scopé
        serializer = self.get_serializer(doc)
        return self.success_response(
            data=serializer.data,
            message="Document récupéré avec succès.",
        )

    # ------------------------------ create/update/destroy -----------------

    @extend_schema(
        summary="➕ Ajouter un document",
        request=DocumentCreateSerializer,
        responses={201: OpenApiResponse(response=DocumentSerializer)},
    )
    def create(self, request, *args, **kwargs):
        """
        Crée un document après validation du serializer et contrôle explicite
        du périmètre centre sur la formation cible.
        """
        self._assert_can_write_documents()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        formation = serializer.validated_data.get("formation")
        self._assert_staff_can_use_formation(formation)

        document = serializer.save(created_by=request.user)
        LogUtilisateur.log_action(
            instance=document,
            user=request.user,
            action=LogUtilisateur.ACTION_CREATE,
            details=f"Ajout du document « {document.nom_fichier} »",
        )
        response_serializer = self.get_serializer(document)
        return self.created_response(
            data=response_serializer.data,
            message="Document créé avec succès.",
        )

    @extend_schema(
        summary="✏️ Modifier un document",
        request=DocumentUpdateSerializer,
        responses={200: OpenApiResponse(response=DocumentSerializer)},
    )
    def update(self, request, *args, **kwargs):
        """
        Met à jour un document visible pour l'utilisateur courant et vérifie
        que la formation finale reste dans le périmètre autorisé.
        """
        self._assert_can_write_documents()
        instance = self.get_object()
        data = request.data.copy()

        # Ne pas supprimer le fichier s’il n’est pas envoyé
        if "fichier" not in data or data.get("fichier") in [None, "", "null"]:
            data.pop("fichier", None)

        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        new_formation = serializer.validated_data.get("formation", instance.formation)
        self._assert_staff_can_use_formation(new_formation)

        document = serializer.save()
        LogUtilisateur.log_action(
            instance=document,
            user=request.user,
            action=LogUtilisateur.ACTION_UPDATE,
            details=f"Mise à jour du document « {document.nom_fichier} »",
        )
        response_serializer = self.get_serializer(document)
        return self.success_response(
            data=response_serializer.data,
            message="Document mis à jour avec succès.",
        )

    @extend_schema(
        summary="📦 Archiver un document",
        responses={200: OpenApiResponse(description="Document archivé avec succès avec enveloppe JSON.")},
    )
    def destroy(self, request, *args, **kwargs):
        """
        Conserve la compatibilité avec `DELETE /documents/<id>/` mais
        remplace la suppression destructive par une désactivation logique.
        """
        self._assert_can_write_documents()
        document = self.get_object()
        # verrouille la suppression au périmètre centre
        self._assert_staff_can_use_formation(getattr(document, "formation", None))

        if not document.is_active:
            response_serializer = self.get_serializer(document)
            return self.success_response(
                data=response_serializer.data,
                message="Document déjà archivé.",
                status_code=status.HTTP_200_OK,
            )

        document.is_active = False
        document.save(user=request.user, update_fields=["is_active"])
        LogUtilisateur.log_action(
            instance=document,
            user=request.user,
            action=LogUtilisateur.ACTION_UPDATE,
            details=f"Archivage logique du document « {document.nom_fichier} » via DELETE",
        )
        return self.success_response(
            data=self.get_serializer(document).data,
            message="Document archivé avec succès.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="desarchiver")
    def desarchiver(self, request, *args, **kwargs):
        """
        Restaure un document archivé en réactivant `is_active`.
        """
        self._assert_can_write_documents()
        document = self.get_object()
        self._assert_staff_can_use_formation(getattr(document, "formation", None))

        if document.is_active:
            return self.success_response(
                data=self.get_serializer(document).data,
                message="Document déjà actif.",
                status_code=status.HTTP_200_OK,
            )

        document.is_active = True
        document.save(user=request.user, update_fields=["is_active"])
        LogUtilisateur.log_action(
            instance=document,
            user=request.user,
            action=LogUtilisateur.ACTION_UPDATE,
            details=f"Restauration logique du document « {document.nom_fichier} »",
        )
        return self.success_response(
            data=self.get_serializer(document).data,
            message="Document restauré avec succès.",
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ actions custom ------------------------

    @extend_schema(
        summary="📚 Lister les documents d’une formation",
        parameters=[
            OpenApiParameter(
                name="formation", type=int, required=True, location="query", description="ID de la formation"
            )
        ],
        responses={200: OpenApiResponse(response=DocumentSerializer(many=True))},
    )
    @action(detail=False, methods=["get"], url_path="par-formation")
    def par_formation(self, request):
        """
        Retourne les documents d'une formation après contrôle explicite du
        périmètre centre sur la formation demandée.

        La réponse est paginée si nécessaire ; sinon elle reste dans un petit
        payload JSON `{success, data}` propre à cette action.
        """
        formation_id = request.query_params.get("formation")
        if not formation_id:
            return self.error_response(message="Paramètre 'formation' requis.", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            formation_id = int(formation_id)
        except ValueError:
            return self.error_response(message="ID de formation invalide.", status_code=status.HTTP_400_BAD_REQUEST)

        queryset = self.get_queryset().filter(formation_id=formation_id)
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        return (
            self.get_paginated_response(serializer.data)
            if page
            else self.success_response(data=serializer.data, message="Documents de la formation récupérés avec succès.")
        )

    @extend_schema(
        summary="🧾 Exporter tous les documents au format CSV (scopé + filtré)",
        responses={
            200: OpenApiResponse(
                description="Fichier CSV contenant la liste des documents", response=OpenApiTypes.BINARY
            )
        },
    )
    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        """
        Exporte le queryset visible et filtré au format CSV.

        La réponse est un fichier binaire `documents.csv`, sans enveloppe JSON.
        """
        qs = self.filter_queryset(self.get_queryset())

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = "attachment; filename=documents.csv"

        writer = csv.writer(response)
        writer.writerow(["ID", "Nom", "Type", "Formation", "Auteur", "Taille (Ko)", "MIME"])

        for doc in qs:
            writer.writerow(
                [
                    doc.id,
                    doc.nom_fichier,
                    doc.get_type_document_display(),
                    doc.formation.nom if doc.formation else "",
                    str(doc.created_by) if doc.created_by else "",
                    doc.taille_fichier or "",
                    doc.mime_type or "",
                ]
            )

        return response

    @extend_schema(
        summary="Liste des types de documents",
        description="Retourne les types de documents valides avec leurs libellés lisibles.",
        tags=["Documents"],
        responses={200: OpenApiResponse(response=TypeDocumentChoiceSerializer(many=True))},
    )
    @action(detail=False, methods=["get"], url_path="types", url_name="types")
    def get_types(self, request):
        """
        Retourne la liste des types de documents acceptés dans l'enveloppe JSON
        standard des actions utilitaires du module.
        """
        data = [{"value": value, "label": label} for value, label in Document.TYPE_DOCUMENT_CHOICES]
        serializer = TypeDocumentChoiceSerializer(data, many=True)
        return Response({"success": True, "message": "Types de documents disponibles.", "data": serializer.data})

    @extend_schema(
        summary="Récupérer les filtres disponibles pour les documents (scopé)",
        responses={200: OpenApiResponse(description="Filtres disponibles")},
    )
    @action(detail=False, methods=["get"], url_path="filtres")
    def get_filtres(self, request):
        """
        Retourne les options de filtres calculées à partir des documents visibles
        pour l'utilisateur courant.

        Le payload `data` contient les centres, statuts, types d'offre et
        formations effectivement présents dans le queryset scopé.
        """
        scoped = self.get_queryset()

        centres = (
            scoped.filter(formation__centre__isnull=False)
            .values_list("formation__centre_id", "formation__centre__nom")
            .distinct()
        )

        statuts = (
            scoped.filter(formation__statut__isnull=False)
            .values_list("formation__statut_id", "formation__statut__nom")
            .distinct()
        )

        type_offres = (
            scoped.filter(formation__type_offre__isnull=False)
            .values_list("formation__type_offre_id", "formation__type_offre__nom")
            .distinct()
        )

        # ✅ Liste des formations liées à des documents
        formations = (
            scoped.filter(formation__isnull=False)
            .values_list(
                "formation__id",
                "formation__nom",
                "formation__num_offre",
                "formation__type_offre__nom",
            )
            .distinct()
            .order_by("formation__nom")
        )

        return Response(
            {
                "success": True,
                "message": "Filtres documents récupérés avec succès",
                "data": {
                    "centres": [{"id": c[0], "nom": c[1]} for c in centres],
                    "statuts": [{"id": s[0], "nom": s[1]} for s in statuts],
                    "type_offres": [{"id": t[0], "nom": t[1]} for t in type_offres],
                    # ✅ Ajout du filtre formation (compatibilité front)
                    "formations": [
                        {
                            "id": f[0],
                            "nom": f[1],
                            "num_offre": f[2],
                            "type_offre_nom": f[3],
                            "type_offre_libelle": f[3],  # même valeur pour compat front
                        }
                        for f in formations
                    ],
                },
            }
        )

    @extend_schema(
        summary="⬇️ Télécharger un document",
        description="Permet de télécharger directement le fichier du document (avec Content-Disposition).",
        responses={200: OpenApiResponse(response=OpenApiTypes.BINARY)},
    )
    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        """
        Télécharge le fichier du document ciblé.

        En cas de succès, la réponse est une `FileResponse` binaire avec
        `Content-Disposition`. En cas d'échec, la vue renvoie un payload JSON
        d'erreur.
        """
        doc = self.get_object()

        # 🔒 Vérifie qu’un fichier existe
        if not doc.fichier:
            return Response(
                {"success": False, "message": "Aucun fichier associé à ce document."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 📂 Ouvre le fichier en lecture binaire
        try:
            file_handle = doc.fichier.open("rb")
        except FileNotFoundError:
            return Response(
                {"success": False, "message": "Fichier introuvable sur le serveur."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 🧠 Détermine le type MIME
        mime_type, _ = mimetypes.guess_type(doc.fichier.name)
        mime_type = mime_type or "application/octet-stream"

        # 📤 Crée la réponse
        response = FileResponse(file_handle, content_type=mime_type)

        # 🔠 Encode proprement le nom du fichier pour tous les navigateurs
        filename = urllib.parse.quote(doc.nom_fichier or doc.fichier.name)
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{filename}"

        # 🚫 Évite la mise en cache pour les fichiers sensibles
        response["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response["Pragma"] = "no-cache"
        response["Expires"] = "0"

        return response
    hard_delete_enabled = True
