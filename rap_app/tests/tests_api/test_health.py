"""
Tests de l'endpoint de santé GET /api/health/.

Vérifie que l'endpoint renvoie 200 OK sans authentification et que la réponse
contient les champs attendus (status, database, timestamp).
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_health_get_returns_200_without_auth():
    """
    GET /api/health/ renvoie 200 OK sans token ni authentification.

    L'endpoint est utilisé par check_alert.sh pour la supervision ; il doit
    rester accessible sans credentials (AllowAny).
    """
    client = APIClient()
    url = reverse("health-list")
    response = client.get(url)
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_health_response_structure():
    """
    La réponse JSON contient status, database et timestamp.
    """
    client = APIClient()
    url = reverse("health-list")
    response = client.get(url)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data.get("status") == "healthy"
    assert data.get("database") == "ok"
    assert "timestamp" in data
