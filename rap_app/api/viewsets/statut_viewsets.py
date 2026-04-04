import logging

from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from ...api.permissions import IsStaffOrAbove
from ...models.statut import Statut, calculer_couleur_texte, get_default_color
from ..mixins import HardDeleteArchivedMixin
from ..serializers.statut_serializers import StatutChoiceSerializer, StatutSerializer

logger = logging.getLogger("application.statut")


@extend_schema_view(
    list=extend_schema(
        summary="Liste des statuts",
        description="Récupère tous les statuts actifs avec libellés, couleurs et badges HTML.",
        tags=["Statuts"],
        responses={200: OpenApiResponse(response=StatutSerializer)},
    ),
    retrieve=extend_schema(
        summary="Détail d’un statut",
        description="Retourne les détails d’un statut par ID.",
        tags=["Statuts"],
        responses={200: OpenApiResponse(response=StatutSerializer)},
    ),
    create=extend_schema(
        summary="Créer un statut",
        description="Crée un nouveau statut avec validation stricte des couleurs et du champ 'autre'.",
        tags=["Statuts"],
        request=StatutSerializer,
        responses={201: OpenApiResponse(response=StatutSerializer)},
    ),
    update=extend_schema(
        summary="Mettre à jour un statut",
        description="Met à jour un statut existant (partiellement ou complètement).",
        tags=["Statuts"],
        request=StatutSerializer,
        responses={200: OpenApiResponse(response=StatutSerializer)},
    ),
    destroy=extend_schema(
        summary="Archiver un statut",
        description="Archive un statut en le désactivant (`is_active = False`).",
        tags=["Statuts"],
        responses={200: OpenApiResponse(description="Archivage réussi.")},
    ),
)
class StatutViewSet(HardDeleteArchivedMixin, viewsets.ModelViewSet):
    """
    ViewSet CRUD des statuts de formation.

    Contrat de sortie actuel :
    - `create`, `update`, `retrieve`, `destroy` renvoient une enveloppe
      `{success, message, data}`
    - `list` et `choices` renvoient une structure de type pagination
      `{count, next, previous, results}`

    Cette hétérogénéité est volontairement documentée ici car c'est le code
    actuel qui fait foi.
    """

    serializer_class = StatutSerializer
    permission_classes = [IsStaffOrAbove]
    hard_delete_enabled = True

    def get_queryset(self):
        """
        Exclut par défaut les statuts archivés pour aligner l'API avec la
        suppression logique basée sur `is_active`.
        """
        qs = Statut.objects.all()
        include_archived = str(self.request.query_params.get("avec_archivees", "")).lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        archives_seules = str(self.request.query_params.get("archives_seules", "")).lower() in {
            "1",
            "true",
            "yes",
            "on",
        }

        if archives_seules:
            return qs.filter(is_active=False)
        if include_archived:
            return qs
        return qs.filter(is_active=True)

    def get_archived_aware_object(self):
        instance = Statut.objects.filter(pk=self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)).first()
        if instance is None:
            raise NotFound("Statut introuvable.")
        return instance

    def create(self, request, *args, **kwargs):
        """
        Crée un statut à partir des données fournies puis renvoie une
        réponse JSON avec succès, message et données sérialisées.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        logger.info(f"🟢 Statut créé : {instance}")
        return Response(
            {"success": True, "message": "Statut créé avec succès.", "data": instance.to_serializable_dict()},
            status=status.HTTP_201_CREATED,
        )

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
        return Response(
            {"success": True, "message": "Statut mis à jour avec succès.", "data": instance.to_serializable_dict()}
        )

    def destroy(self, request, *args, **kwargs):
        """
        Conserve le verbe HTTP `DELETE` mais remplace la suppression
        destructive par un archivage logique.
        """
        instance = self.get_object()
        if not instance.is_active:
            return Response(
                {"success": True, "message": "Statut déjà archivé.", "data": instance.to_serializable_dict()},
                status=status.HTTP_200_OK,
            )

        instance.is_active = False
        instance.save(user=request.user, update_fields=["is_active"])
        logger.warning(f"📦 Statut archivé logiquement : {instance}")
        return Response(
            {"success": True, "message": "Statut archivé avec succès.", "data": instance.to_serializable_dict()},
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        """
        Retourne le détail d’un statut sous forme de dictionnaire
        sérialisé avec success et message.
        """
        instance = self.get_object()
        return Response(
            {
                "success": True,
                "message": "Détail du statut chargé avec succès.",
                "data": instance.to_serializable_dict(),
            }
        )

    def list(self, request, *args, **kwargs):
        """
        Retourne la liste paginée des statuts dans l'enveloppe API standard.
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated = self.get_paginated_response(serializer.data).data
            if isinstance(paginated, dict) and {"success", "message", "data"}.issubset(paginated.keys()):
                paginated["message"] = "Liste des statuts récupérée avec succès."
            return Response(
                paginated
                if isinstance(paginated, dict) and {"success", "message", "data"}.issubset(paginated.keys())
                else {
                    "success": True,
                    "message": "Liste des statuts récupérée avec succès.",
                    "data": paginated,
                }
            )

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "success": True,
                "message": "Liste des statuts récupérée avec succès.",
                "data": serializer.data,
            }
        )

    @action(detail=True, methods=["post"], url_path="desarchiver")
    def desarchiver(self, request, *args, **kwargs):
        """
        Restaure un statut archivé et renvoie l'enveloppe API standard.
        """
        instance = self.get_archived_aware_object()
        if instance.is_active:
            return Response(
                {"success": True, "message": "Statut déjà actif.", "data": instance.to_serializable_dict()},
                status=status.HTTP_200_OK,
            )

        instance.is_active = True
        instance.save(user=request.user, update_fields=["is_active"])
        logger.info(f"♻️ Statut désarchivé : {instance}")
        return Response(
            {"success": True, "message": "Statut désarchivé avec succès.", "data": instance.to_serializable_dict()},
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Liste des choix possibles de statuts",
        description="Retourne la liste des valeurs `nom` possibles pour un statut, avec libellé, couleur par défaut et couleur de texte.",
        tags=["Statuts"],
        responses={
            200: OpenApiResponse(response=StatutChoiceSerializer(many=True), description="Liste des choix disponibles")
        },
    )
    @action(detail=False, methods=["get"], url_path="choices", url_name="choices")
    def get_choices(self, request):
        """
        Retourne les choix possibles pour `nom` dans l'enveloppe API
        standard, avec un payload paginé compatible.
        """
        results = [
            {
                "value": key,
                "label": label,
                "default_color": (color := get_default_color(key)),
                "text_color": calculer_couleur_texte(color),
            }
            for key, label in Statut.STATUT_CHOICES
        ]
        return Response(
            {
                "success": True,
                "message": "Choix des statuts récupérés avec succès.",
                "data": {"count": len(results), "next": None, "previous": None, "results": results},
            }
        )
