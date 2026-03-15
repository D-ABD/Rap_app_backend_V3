from django.contrib.auth import get_user_model
from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT via email : username_field=EMAIL_FIELD ; validate injecte email dans username pour le backend d'auth."""

    username_field = User.EMAIL_FIELD

    def validate(self, attrs):
        attrs["username"] = attrs.get("email")
        return super().validate(attrs)


class EmailTokenRequestSerializer(serializers.Serializer):
    """Format requête connexion JWT : email, password."""

    email = serializers.EmailField()
    password = serializers.CharField()


class EmailTokenResponseSerializer(serializers.Serializer):
    """Réponse succès : access (JWT), refresh (JWT)."""

    access = serializers.CharField()
    refresh = serializers.CharField()


@extend_schema(
    tags=["Utilisateurs"],
    summary="Connexion avec email et mot de passe",
    description=(
        "Retourne un access token (JWT) et un refresh token après une authentification réussie via email. "
        "Ce point d'entrée permet au frontend de s'authentifier puis d'utiliser le token retourné pour accéder "
        "aux autres endpoints sécurisés."
        "\n\n"
        "Réponses :\n"
        '- Succès (200): {"access": ..., "refresh": ...}\n'
        '- Échec authentification (401): {"detail": ...}\n'
        "\n\n"
        "Permissions : Accessible sans authentification préalable (endpoint public).\n"
        "Action principale : POST."
    ),
    request=EmailTokenRequestSerializer,
    responses={200: EmailTokenResponseSerializer},
    examples=[
        OpenApiExample(
            name="Requête valide", value={"email": "admin@example.com", "password": "motdepasse"}, request_only=True
        ),
        OpenApiExample(
            name="Réponse réussie",
            value={"access": "eyJ0eXAiOiJKV1QiLCJh...", "refresh": "eyJ0eXAiOiJKV1QiLCJh..."},
            response_only=True,
        ),
        OpenApiExample(
            name="Échec d'authentification",
            value={"detail": "Aucun compte actif trouvé avec les identifiants fournis"},
            response_only=True,
            status_codes=["401"],
        ),
    ],
)
class EmailTokenObtainPairView(TokenObtainPairView):
    """Vue POST : authentification JWT par email/mot de passe ; retourne access et refresh. Pas d'auth préalable."""

    serializer_class = EmailTokenObtainPairSerializer
