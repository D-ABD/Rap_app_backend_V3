from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

from ...models.rapports import Rapport
from ...api.serializers.rapports_serializers import RapportChoiceGroupSerializer, RapportSerializer
from ...api.permissions import IsStaffOrAbove
from ...api.paginations import RapAppPagination
from ...models.logs import LogUtilisateur
from ..roles import get_staff_centre_ids_cached, is_admin_like, is_staff_or_staffread

@extend_schema_view(
    list=extend_schema(
        summary="📊 Liste des rapports",
        description="Affiche la liste paginée des rapports générés.",
        tags=["Rapports"],
        responses={200: OpenApiResponse(response=RapportSerializer)},
    ),
    retrieve=extend_schema(
        summary="📄 Détail d’un rapport",
        description="Récupère les détails complets d’un rapport.",
        tags=["Rapports"],
        responses={200: OpenApiResponse(response=RapportSerializer)},
    ),
    create=extend_schema(
        summary="➕ Créer un rapport",
        description="Crée un nouveau rapport système ou manuel.",
        tags=["Rapports"],
        responses={201: OpenApiResponse(description="Rapport créé avec succès.")},
    ),
    update=extend_schema(
        summary="✏️ Modifier un rapport",
        description="Met à jour les champs d’un rapport existant.",
        tags=["Rapports"],
        responses={200: OpenApiResponse(description="Rapport mis à jour avec succès.")},
    ),
    destroy=extend_schema(
        summary="🗑️ Supprimer un rapport",
        description="Supprime logiquement un rapport (désactivation).",
        tags=["Rapports"],
        responses={204: OpenApiResponse(description="Rapport supprimé avec succès.")},
    ),
)
class RapportViewSet(viewsets.ModelViewSet):
    """
    ViewSet de gestion des rapports (systèmes et manuels) avec
    opérations CRUD, filtrage, pagination et soft delete, réservé aux
    utilisateurs ayant la permission IsStaffOrAbove.
    """

    queryset = Rapport.objects.filter(is_active=True)
    serializer_class = RapportSerializer
    permission_classes = [IsStaffOrAbove]
    pagination_class = RapAppPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nom", "type_rapport", "periode"]
    ordering_fields = ["created_at", "date_debut", "date_fin"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """
        Retourne les rapports actifs visibles pour l'utilisateur selon
        son rôle et ses centres (accès complet pour les profils
        admin-like, filtré par centre pour les autres staff).
        """
        base = Rapport.objects.filter(is_active=True)
        user = getattr(self.request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return base.none()
        if is_admin_like(user):
            return base
        centre_ids = get_staff_centre_ids_cached(self.request)
        if centre_ids is None:
            return base
        if centre_ids:
            return base.filter(centre_id__in=centre_ids)
        return base.none()

    def perform_create(self, serializer):
        """
        Crée un rapport en positionnant created_by sur l'utilisateur
        courant et journalise l'action.
        """
        instance = serializer.save(created_by=self.request.user)
        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_CREATE,
            user=self.request.user,
            details="Création d’un rapport"
        )

    def perform_update(self, serializer):
        """
        Met à jour un rapport en positionnant updated_by sur
        l'utilisateur courant et journalise l'action.
        """
        instance = serializer.save(updated_by=self.request.user)
        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_UPDATE,
            user=self.request.user,
            details="Modification d’un rapport"
        )

    def destroy(self, request, *args, **kwargs):
        """
        Effectue une suppression logique du rapport (is_active à False),
        journalise l'action puis renvoie une réponse JSON avec succès.
        """
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_DELETE,
            user=request.user,
            details="Suppression logique du rapport"
        )
        return Response({
            "success": True,
            "message": "Rapport supprimé avec succès.",
            "data": None
        }, status=status.HTTP_204_NO_CONTENT)

    def create(self, request, *args, **kwargs):
        """
        Crée un rapport après validation et renvoie une réponse JSON
        contenant success, message et les données sérialisées.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            "success": True,
            "message": "Rapport créé avec succès.",
            "data": serializer.instance.to_serializable_dict()
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """
        Met à jour un rapport via PUT ou PATCH et renvoie une réponse
        JSON contenant success, message et les données sérialisées.
        """
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({
            "success": True,
            "message": "Rapport mis à jour avec succès.",
            "data": serializer.instance.to_serializable_dict()
        })

    def retrieve(self, request, *args, **kwargs):
        """
        Retourne le détail d’un rapport spécifique avec une réponse
        JSON incluant success, message et data.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "success": True,
            "message": "Rapport récupéré avec succès.",
            "data": serializer.instance.to_serializable_dict()
        })

    def list(self, request, *args, **kwargs):
        """
        Retourne la liste paginée des rapports actifs en appliquant la
        recherche et l'ordering configurés.
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # DRF gère ici la structure de la pagination (voir RapAppPagination).
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "success": True,
            "message": "Liste des rapports récupérée avec succès.",
            "data": serializer.data
        })

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse

class RapportChoicesView(APIView):
    """
    Vue renvoyant, pour un utilisateur authentifié, les choix possibles
    pour les champs type_rapport, periode et format du modèle Rapport.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Liste des choix possibles pour les rapports",
        description="Retourne les choix disponibles pour les types de rapports, périodicité et formats.",
        responses={200: OpenApiResponse(response=RapportChoiceGroupSerializer)},
        tags=["Rapports"]
    )
    def get(self, request):
        """
        Retourne les choix disponibles pour les champs type_rapport,
        periode et format du modèle Rapport.
        """
        def serialize_choices(choices):
            return [{"value": k, "label": v} for k, v in choices]

        return Response({
            "type_rapport": serialize_choices(Rapport.TYPE_CHOICES),
            "periode": serialize_choices(Rapport.PERIODE_CHOICES),
            "format": serialize_choices(Rapport.FORMAT_CHOICES),
        })
