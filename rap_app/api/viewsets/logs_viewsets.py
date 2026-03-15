from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema_view, extend_schema, OpenApiResponse
from rest_framework.views import APIView

from ...models.logs import LogUtilisateur
from ...api.serializers.logs_serializers import LogChoicesSerializer, LogUtilisateurSerializer
from ...api.permissions import IsAdminLikeOnly
from ...api.paginations import RapAppPagination

@extend_schema_view(
    list=extend_schema(
        summary="Liste des logs utilisateur",
        description="Affiche les logs enregistrés (lecture seule, paginée). Accès réservé aux administrateurs et superadministrateurs.",
        tags=["Logs"],
        responses={200: OpenApiResponse(response=LogUtilisateurSerializer)},
    ),
    retrieve=extend_schema(
        summary="Détail d’un log",
        description="Affiche les détails d’un log utilisateur.",
        tags=["Logs"],
        responses={200: OpenApiResponse(response=LogUtilisateurSerializer)},
    ),
)
class LogUtilisateurViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet lecture seule pour LogUtilisateur. IsAuthenticated, IsAdminLikeOnly. get_queryset : tous les logs. filter_backends : SearchFilter, OrderingFilter ; search_fields, ordering_fields, ordering=-created_at ; RapAppPagination. list et retrieve retournent success/message/data."""

    serializer_class = LogUtilisateurSerializer
    permission_classes = [IsAuthenticated, IsAdminLikeOnly]
    pagination_class = RapAppPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["action", "details", "created_by__username"]
    ordering_fields = ["created_at", "action"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Retourne LogUtilisateur.objects.all() ; accès contrôlé par IsAdminLikeOnly."""
        return LogUtilisateur.objects.all()

    def list(self, request, *args, **kwargs):
        """Liste paginée ou complète ; filter_queryset ; success/message/data."""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "success": True,
            "message": "Liste des logs utilisateur.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        """Détail d'un log par pk ; success/message/data."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "success": True,
            "message": "Log utilisateur récupéré avec succès.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


@extend_schema(
    methods=["GET"],
    responses={200: LogChoicesSerializer},
    description="Retourne la liste des actions possibles enregistrées dans les logs utilisateur."
)
class LogChoicesView(APIView):
    """GET : liste des actions possibles pour les logs (value/label) ; IsAuthenticated."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        label_map = {
            LogUtilisateur.ACTION_CREATE: "Création",
            LogUtilisateur.ACTION_UPDATE: "Modification",
            LogUtilisateur.ACTION_DELETE: "Suppression",
            LogUtilisateur.ACTION_VIEW: "Consultation",
            LogUtilisateur.ACTION_LOGIN: "Connexion",
            LogUtilisateur.ACTION_LOGOUT: "Déconnexion",
            LogUtilisateur.ACTION_EXPORT: "Export",
            LogUtilisateur.ACTION_IMPORT: "Import",
        }

        data = {
            "actions": [
                {"value": k, "label": v}
                for k, v in label_map.items()
            ]
        }
        return Response(data)
