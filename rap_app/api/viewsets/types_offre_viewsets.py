# viewsets/typeoffre_viewsets.py

from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ...api.serializers.types_offre_serializers import (
    TypeOffreChoiceSerializer,
    TypeOffreSerializer,
)
from ...models.logs import LogUtilisateur
from ...models.types_offre import TypeOffre
from ..paginations import RapAppPagination
from ..permissions import ReadWriteAdminReadStaff


@extend_schema_view(
    list=extend_schema(
        summary="📄 Liste des types d'offres",
        description="Retourne la liste paginée des types d'offres disponibles.",
        tags=["TypesOffre"],
        responses={200: OpenApiResponse(response=TypeOffreSerializer)},
    ),
    retrieve=extend_schema(
        summary="🔍 Détail d’un type d’offre",
        description="Retourne les informations détaillées pour un type d'offre.",
        tags=["TypesOffre"],
        responses={200: OpenApiResponse(response=TypeOffreSerializer)},
    ),
    create=extend_schema(
        summary="➕ Créer un type d’offre",
        description="Ajoute un nouveau type d’offre, standard ou personnalisé.",
        tags=["TypesOffre"],
        responses={201: OpenApiResponse(description="Création réussie.")},
    ),
    update=extend_schema(
        summary="✏️ Modifier un type d’offre",
        description="Met à jour les données d’un type d’offre existant.",
        tags=["TypesOffre"],
        responses={200: OpenApiResponse(description="Mise à jour réussie.")},
    ),
    destroy=extend_schema(
        summary="🗑️ Supprimer un type d’offre",
        description="Suppression logique d’un type d’offre (désactivation).",
        tags=["TypesOffre"],
        responses={204: OpenApiResponse(description="Suppression réussie.")},
    ),
)
class TypeOffreViewSet(viewsets.ModelViewSet):
    """
    ViewSet CRUD pour les types d'offres avec recherche, tri et
    pagination, soumis aux permissions ReadWriteAdminReadStaff.
    """

    queryset = TypeOffre.objects.all().order_by("nom")
    serializer_class = TypeOffreSerializer
    permission_classes = [ReadWriteAdminReadStaff]
    pagination_class = RapAppPagination
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ["nom", "created_at"]
    search_fields = ["nom", "autre"]

    def create(self, request, *args, **kwargs):
        """
        Crée un nouveau type d'offre (standard ou personnalisé).
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_CREATE,
            user=request.user,
            details=f"Création du type d'offre : {instance}",
        )

        return Response(
            {"success": True, "message": "Type d'offre créé avec succès.", "data": self.get_serializer(instance).data},
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        """
        Met à jour un type d'offre existant (partiel ou complet) et
        retourne une réponse JSON standardisée.
        """
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated_instance = serializer.save()

        LogUtilisateur.log_action(
            instance=updated_instance,
            action=LogUtilisateur.ACTION_UPDATE,
            user=request.user,
            details=f"Mise à jour du type d'offre : {updated_instance}",
        )

        return Response(
            {
                "success": True,
                "message": "Type d'offre mis à jour avec succès.",
                "data": self.get_serializer(updated_instance).data,
            }
        )

    def destroy(self, request, *args, **kwargs):
        """
        Supprime réellement un type d'offre en base puis renvoie une
        réponse JSON de confirmation.
        """
        instance = self.get_object()
        instance.delete()  # ✅ Suppression réelle
        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_DELETE,
            user=request.user,
            details=f"Suppression logique du type d'offre : {instance}",
        )
        return Response(
            {"success": True, "message": "Type d'offre supprimé avec succès.", "data": None},
            status=status.HTTP_204_NO_CONTENT,
        )

    # views/typeoffre_viewsets.py

    @extend_schema(
        summary="📋 Liste des choix possibles de types d'offres",
        description="Retourne les valeurs possibles pour `nom`, avec libellé et couleur par défaut.",
        tags=["TypesOffre"],
        responses={
            200: OpenApiResponse(
                response=TypeOffreChoiceSerializer(many=True), description="Liste des types d'offres disponibles"
            )
        },
    )
    @action(detail=False, methods=["get"], url_path="choices", url_name="choices")
    def get_choices(self, request):
        """
        Retourne les types d'offres prédéfinis (valeur, libellé et
        couleur par défaut) pour alimenter les sélecteurs métier.
        """
        data = [
            {"value": key, "label": label, "default_color": TypeOffre.COULEURS_PAR_DEFAUT.get(key, "#6c757d")}
            for key, label in TypeOffre.TYPE_OFFRE_CHOICES
        ]
        return Response({"success": True, "message": "Liste des types d'offres prédéfinis.", "data": data})
