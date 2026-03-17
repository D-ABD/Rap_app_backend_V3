"""Endpoint GET /api/health/ (AllowAny) pour vérifier que l’API et la base répondent."""

from django.db import connection
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import permissions, viewsets
from rest_framework.response import Response

from ..serializers.base_serializers import HealthStatusSerializer


class HealthViewSet(viewsets.ViewSet):
    """ViewSet santé. AllowAny. list (GET /api/health/) renvoie status, database, timestamp."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Etat de santé de l'API",
        tags=["Santé"],
        responses={200: OpenApiResponse(response=HealthStatusSerializer)},
    )
    def list(self, request):
        """GET /api/health/ : ensure_connection puis Response status/database/timestamp."""
        connection.ensure_connection()
        return Response(
            {
                "status": "healthy",
                "database": "ok",
                "timestamp": timezone.now().isoformat(),
            }
        )
