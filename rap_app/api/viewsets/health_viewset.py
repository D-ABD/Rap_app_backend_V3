"""Endpoint GET /api/health/ (AllowAny) pour vérifier que l’API et la base répondent."""
from django.db import connection
from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.response import Response


class HealthViewSet(viewsets.ViewSet):
    """ViewSet santé. AllowAny. list (GET /api/health/) renvoie status, database, timestamp."""

    permission_classes = [permissions.AllowAny]

    def list(self, request):
        """GET /api/health/ : ensure_connection puis Response status/database/timestamp."""
        connection.ensure_connection()
        return Response({
            "status": "healthy",
            "database": "ok",
            "timestamp": timezone.now().isoformat(),
        })
