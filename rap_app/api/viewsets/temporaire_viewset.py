"""Endpoints techniques temporaires ou de support interne.

Ces vues ne portent pas de logique métier coeur. Elles servent surtout au
debug, au support et à quelques vérifications opérationnelles autour de
l'authentification.
"""

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..permissions import IsStaffOrAbove


@extend_schema(
    tags=["🔐 Authentification"],
    summary="Vérifier la validité du token et le rôle (usage interne staff)",
    description="""
        Endpoint **technique** permettant de vérifier si un token d’authentification (JWT ou DRF Token) est valide,
        et de retourner un sous-ensemble d’informations sur le compte utilisateur connecté, y compris son rôle.

        🔒 Accès restreint :
            - Requiert un token d’authentification valide dans l'en-tête `Authorization`.
            - Filtré par la permission `IsStaffOrAbove` : `commercial`,
              `charge_recrutement`, `staff`, `staff_read`, `admin`,
              `superadmin`.
            - Les comptes candidats/stagiaires ne doivent pas utiliser cet
              endpoint (ils peuvent utiliser /api/me/ à la place).

        Ce point d’entrée est destiné au debug / support interne (test de token, affichage rapide du rôle),
        pas à un usage fonctionnel grand public côté frontend.
    """,
    responses={
        200: OpenApiResponse(
            description="Token valide et utilisateur interne autorisé authentifié",
            response={
                "type": "object",
                "properties": {
                    "success": {"type": "boolean", "example": True},
                    "message": {"type": "string", "example": "Token valide ✅"},
                    "user_id": {"type": "integer", "example": 1},
                    "username": {"type": "string", "example": "johndoe"},
                    "email": {"type": "string", "example": "john@example.com"},
                    "role": {"type": "string", "example": "admin"},
                    "is_staff": {"type": "boolean", "example": True},
                    "is_superuser": {"type": "boolean", "example": False},
                },
            },
        )
    },
)
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsStaffOrAbove])
def test_token_view(request):
    """
    Vérifie la validité du token pour un utilisateur interne autorisé par
    `IsStaffOrAbove` et renvoie un résumé de son profil.

    Sont donc inclus ici :
    - `commercial`
    - `charge_recrutement`
    - `staff`
    - `staff_read`
    - `admin`
    - `superadmin`
    """
    user = request.user
    role = getattr(user, "role", "inconnu")  # ✅ accès direct au champ `role`

    return Response(
        {
            "success": True,
            "message": "Token valide ✅",
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "role": role,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        }
    )
