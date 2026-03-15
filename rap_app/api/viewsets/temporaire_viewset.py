from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse

from ..permissions import IsStaffOrAbove


@extend_schema(
    tags=["🔐 Authentification"],
    summary="Vérifier la validité du token et le rôle (usage interne staff)",
    description="""
        Endpoint **technique** permettant de vérifier si un token d’authentification (JWT ou DRF Token) est valide,
        et de retourner un sous-ensemble d’informations sur le compte utilisateur connecté, y compris son rôle.

        🔒 Accès restreint :
            - Requiert un token d’authentification valide dans l'en-tête `Authorization`.
            - Filtré par la permission `IsStaffOrAbove` : uniquement staff, staff_read, admin, superadmin.
            - Les comptes candidats ne doivent pas utiliser cet endpoint (ils peuvent utiliser /api/me/ à la place).

        Ce point d’entrée est destiné au debug / support interne (test de token, affichage rapide du rôle),
        pas à un usage fonctionnel grand public côté frontend.
    """,
    responses={
        200: OpenApiResponse(
            description="Token valide et utilisateur staff/admin authentifié",
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
                }
            }
        )
    }
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStaffOrAbove])
def test_token_view(request):
    """
    Vérifie la validité du token pour un utilisateur interne
    (staff/staff_read/admin/superadmin) et renvoie un résumé de son
    profil (id, email, rôle, indicateurs staff/superuser).
    """
    user = request.user
    role = getattr(user, 'role', 'inconnu')  # ✅ accès direct au champ `role`

    return Response({
        'success': True,
        'message': 'Token valide ✅',
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'role': role,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
    })
