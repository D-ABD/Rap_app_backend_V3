# rap_app/api/serializers/login_logout_serializers.py
"""
Sérialiseurs liés au profil utilisateur (lecture). L'authentification est gérée par SimpleJWT, pas par ces sérialiseurs.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Expose id, username et email de l'utilisateur connecté en lecture seule. Aucune validation personnalisée.
    """

    class Meta:
        model = User
        fields = ("id", "username", "email")
