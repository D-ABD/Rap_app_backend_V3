"""Endpoint GET /api/health/ (AllowAny) pour vérifier que l’API et la base répondent."""

from django.db import connection
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import permissions, viewsets
from rest_framework.response import Response

from ..serializers.base_serializers import HealthStatusSerializer


class HealthViewSet(viewsets.ViewSet):
    """ViewSet santé. AllowAny. `GET /api/health/` renvoie l'enveloppe API standard."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Etat de santé de l'API",
        tags=["Santé"],
        responses={200: OpenApiResponse(response=HealthStatusSerializer)},
    )
    def list(self, request):
        """GET /api/health/ : teste la connexion DB et renvoie l'état de santé dans l'enveloppe standard."""
        connection.ensure_connection()
        return Response(
            {
                "success": True,
                "message": "API en bonne santé.",
                "data": {
                    "status": "healthy",
                    "database": "ok",
                    "timestamp": timezone.now().isoformat(),
                },
            }
        )
