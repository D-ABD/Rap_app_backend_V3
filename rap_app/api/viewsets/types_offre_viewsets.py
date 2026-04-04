# viewsets/typeoffre_viewsets.py

from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from ...api.serializers.types_offre_serializers import (
    TypeOffreChoiceSerializer,
    TypeOffreSerializer,
)
from ...models.logs import LogUtilisateur
from ...models.types_offre import TypeOffre
from ..mixins import HardDeleteArchivedMixin
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
        summary="📦 Archiver un type d’offre",
        description="Archive un type d’offre via une désactivation logique (`is_active = False`).",
        tags=["TypesOffre"],
        responses={200: OpenApiResponse(description="Archivage réussi.")},
    ),
)
class TypeOffreViewSet(HardDeleteArchivedMixin, viewsets.ModelViewSet):
    """
    ViewSet CRUD pour les types d'offres avec recherche, tri et
    pagination, soumis aux permissions ReadWriteAdminReadStaff.
    """

    serializer_class = TypeOffreSerializer
    hard_delete_enabled = True
    permission_classes = [ReadWriteAdminReadStaff]
    pagination_class = RapAppPagination
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ["nom", "created_at"]
    search_fields = ["nom", "autre"]

    def get_queryset(self):
        """
        Retourne uniquement les types d'offres actifs afin que les
        éléments archivés n'apparaissent plus dans les listes métier.
        """
        qs = TypeOffre.objects.all().order_by("nom")
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
        instance = TypeOffre.objects.filter(pk=self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)).first()
        if instance is None:
            raise NotFound("Type d'offre introuvable.")
        return instance

    def list(self, request, *args, **kwargs):
        """
        Retourne la liste paginée des types d'offres dans l'enveloppe API standard.
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated = self.get_paginated_response(serializer.data).data
            if isinstance(paginated, dict) and {"success", "message", "data"}.issubset(paginated.keys()):
                paginated["message"] = "Liste des types d'offres récupérée avec succès."
                return Response(paginated)
            return Response(
                {
                    "success": True,
                    "message": "Liste des types d'offres récupérée avec succès.",
                    "data": paginated,
                }
            )

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "success": True,
                "message": "Liste des types d'offres récupérée avec succès.",
                "data": serializer.data,
            }
        )

    def retrieve(self, request, *args, **kwargs):
        """
        Retourne le détail d'un type d'offre dans l'enveloppe API standard.
        """
        instance = self.get_object()
        return Response(
            {
                "success": True,
                "message": "Type d'offre récupéré avec succès.",
                "data": self.get_serializer(instance).data,
            }
        )

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
        Conserve `DELETE` pour compatibilité mais transforme
        l'opération en archivage logique.
        """
        instance = self.get_object()
        if not instance.is_active:
            return Response(
                {"success": True, "message": "Type d'offre déjà archivé.", "data": self.get_serializer(instance).data},
                status=status.HTTP_200_OK,
            )

        instance.is_active = False
        instance.save(user=request.user, update_fields=["is_active"])
        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_UPDATE,
            user=request.user,
            details=f"Archivage logique du type d'offre : {instance}",
        )
        return Response(
            {"success": True, "message": "Type d'offre archivé avec succès.", "data": self.get_serializer(instance).data},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="desarchiver")
    def desarchiver(self, request, *args, **kwargs):
        """
        Restaure un type d'offre archivé et renvoie l'enveloppe API standard.
        """
        instance = self.get_archived_aware_object()
        if instance.is_active:
            return Response(
                {"success": True, "message": "Type d'offre déjà actif.", "data": self.get_serializer(instance).data},
                status=status.HTTP_200_OK,
            )

        instance.is_active = True
        instance.save(user=request.user, update_fields=["is_active"])
        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_UPDATE,
            user=request.user,
            details=f"Désarchivage du type d'offre : {instance}",
        )
        return Response(
            {"success": True, "message": "Type d'offre désarchivé avec succès.", "data": self.get_serializer(instance).data},
            status=status.HTTP_200_OK,
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
