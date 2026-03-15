import logging
from rest_framework import viewsets, status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse
from rest_framework.decorators import action

from ...models.statut import calculer_couleur_texte, get_default_color, Statut
from ..serializers.statut_serializers import StatutChoiceSerializer, StatutSerializer
from ...api.permissions import IsStaffOrAbove

logger = logging.getLogger("application.statut")


@extend_schema_view(
    list=extend_schema(
        summary="Liste des statuts",
        description="Récupère tous les statuts actifs avec libellés, couleurs et badges HTML.",
        tags=["Statuts"],
        responses={200: OpenApiResponse(response=StatutSerializer)}
    ),
    retrieve=extend_schema(
        summary="Détail d’un statut",
        description="Retourne les détails d’un statut par ID.",
        tags=["Statuts"],
        responses={200: OpenApiResponse(response=StatutSerializer)}
    ),
    create=extend_schema(
        summary="Créer un statut",
        description="Crée un nouveau statut avec validation stricte des couleurs et du champ 'autre'.",
        tags=["Statuts"],
        request=StatutSerializer,
        responses={201: OpenApiResponse(response=StatutSerializer)}
    ),
    update=extend_schema(
        summary="Mettre à jour un statut",
        description="Met à jour un statut existant (partiellement ou complètement).",
        tags=["Statuts"],
        request=StatutSerializer,
        responses={200: OpenApiResponse(response=StatutSerializer)}
    ),
    destroy=extend_schema(
        summary="Supprimer un statut",
        description="Supprime logiquement un statut en le désactivant (is_active = False).",
        tags=["Statuts"],
        responses={204: OpenApiResponse(description="Suppression réussie")}
    ),
)
class StatutViewSet(viewsets.ModelViewSet):
    """
    ViewSet CRUD pour les statuts de formation, réservé aux profils
    autorisés par IsStaffOrAbove et utilisant StatutSerializer pour les
    opérations standard et StatutChoiceSerializer pour les choix.
    """
    queryset = Statut.objects.all()
    serializer_class = StatutSerializer
    permission_classes = [IsStaffOrAbove]

    def create(self, request, *args, **kwargs):
        """
        Crée un statut à partir des données fournies puis renvoie une
        réponse JSON avec succès, message et données sérialisées.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        logger.info(f"🟢 Statut créé : {instance}")
        return Response({
            "success": True,
            "message": "Statut créé avec succès.",
            "data": instance.to_serializable_dict()
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """
        Met à jour un statut (totalement ou partiellement) et renvoie
        une réponse JSON avec succès, message et données sérialisées.
        """
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        logger.info(f"📝 Statut mis à jour : {instance}")
        return Response({
            "success": True,
            "message": "Statut mis à jour avec succès.",
            "data": instance.to_serializable_dict()
        })

    def destroy(self, request, *args, **kwargs):
        """
        Supprime un statut en base via delete() et renvoie une réponse
        JSON de confirmation.
        """
        instance = self.get_object()
        instance.delete()
        logger.warning(f"🗑️ Statut supprimé définitivement : {instance}")
        return Response({
            "success": True,
            "message": "Statut supprimé avec succès.",
            "data": None
        }, status=status.HTTP_204_NO_CONTENT)

    def retrieve(self, request, *args, **kwargs):
        """
        Retourne le détail d’un statut sous forme de dictionnaire
        sérialisé avec success et message.
        """
        instance = self.get_object()
        return Response({
            "success": True,
            "message": "Détail du statut chargé avec succès.",
            "data": instance.to_serializable_dict()
        })

    def list(self, request, *args, **kwargs):
        """
        Retourne la liste paginée des statuts avec la structure de
        pagination DRF (count, next, previous, results).
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return Response({
                "count": self.paginator.page.paginator.count,
                "next": self.paginator.get_next_link(),
                "previous": self.paginator.get_previous_link(),
                "results": serializer.data
            })

    @extend_schema(
        summary="Liste des choix possibles de statuts",
        description="Retourne la liste des valeurs `nom` possibles pour un statut, avec libellé, couleur par défaut et couleur de texte.",
        tags=["Statuts"],
        responses={200: OpenApiResponse(
            response=StatutChoiceSerializer(many=True),
            description="Liste des choix disponibles"
        )}
    )
    @action(detail=False, methods=["get"], url_path="choices", url_name="choices")
    def get_choices(self, request):
        """
        Retourne les choix possibles pour le champ `nom` des statuts
        avec valeur, libellé, couleur par défaut et couleur de texte.
        """
        results = [
            {
                "value": key,
                "label": label,
                "default_color": (color := get_default_color(key)),
                "text_color": calculer_couleur_texte(color)
            }
            for key, label in Statut.STATUT_CHOICES
        ]
        return Response({
            "count": len(results),
            "next": None,
            "previous": None,
            "results": results
        })