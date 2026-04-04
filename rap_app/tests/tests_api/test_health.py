"""
Tests de l'endpoint de santé GET /api/health/.

Vérifie que l'endpoint renvoie 200 OK sans authentification et que la réponse
contient désormais l'enveloppe API standard.
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
    La réponse JSON contient success/message/data puis status/database/timestamp.
    """
    client = APIClient()
    url = reverse("health-list")
    response = client.get(url)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data.get("success") is True
    assert data.get("message") == "API en bonne santé."
    payload = data.get("data", {})
    assert payload.get("status") == "healthy"
    assert payload.get("database") == "ok"
    assert "timestamp" in payload
