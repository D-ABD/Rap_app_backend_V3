"""Endpoints liés à l'utilisateur courant."""

from django.core.exceptions import ValidationError
from django.utils import timezone as dj_timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import exceptions, status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models.custom_user import CustomUser
from ...services.candidate_account_service import CandidateAccountService
from ...models.logs import LogUtilisateur
from ..serializers.base_serializers import EmptySerializer
from ..serializers.candidat_serializers import CandidatCreateUpdateSerializer
from ..serializers.user_profil_serializers import (
    CustomUserSerializer,
    RoleChoiceSerializer,
)
from ..mixins import ApiResponseMixin
from ..exception_handler import MESSAGE_ERROR_CODE_MAP
from ..permissions import CandidateRgpdGate


class MeAPIView(APIView):
    """
    API permettant à l'utilisateur authentifié de consulter, mettre à jour
    et réactiver son propre profil via les méthodes GET, PATCH et POST.
    """

    serializer_class = EmptySerializer

    permission_classes = [IsAuthenticated]

    def _serialize_user(self, request, user):
        """Construit la charge utile publique de /api/me/ via le serializer standard utilisateur."""
        return CustomUserSerializer(user, context={"request": request}).data

    @extend_schema(
        summary="Afficher son profil",
        tags=["Utilisateur"],
        responses={200: OpenApiResponse(response=CustomUserSerializer)},
    )
    def get(self, request):
        user = request.user
        return Response(
            {
                "success": True,
                "message": "Profil récupéré avec succès.",
                "data": self._serialize_user(request, user),
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Mettre à jour son profil",
        tags=["Utilisateur"],
        request=CustomUserSerializer,
        responses={200: OpenApiResponse(response=CustomUserSerializer)},
    )
    def patch(self, request):
        user = request.user
        serializer = CustomUserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        LogUtilisateur.log_action(
            instance=user,
            action=LogUtilisateur.ACTION_UPDATE,
            user=user,
            details="Mise à jour de son propre profil via MeAPIView",
        )

        return Response(
            {
                "success": True,
                "message": "Profil mis à jour avec succès.",
                "data": self._serialize_user(request, user),
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Réactiver son compte",
        tags=["Utilisateur"],
        responses={200: OpenApiResponse(response=CustomUserSerializer)},
    )
    def post(self, request, *args, **kwargs):
        """
        Réactive le compte de l'utilisateur connecté si celui-ci est inactif,
        ou renvoie une erreur 400 si le compte est déjà actif.
        """
        user = request.user
        if user.is_active:
            return Response(
                {"success": False, "message": "Votre compte est déjà actif.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_active = True
        user.save(update_fields=["is_active"])

        LogUtilisateur.log_action(
            instance=user,
            action=LogUtilisateur.ACTION_UPDATE,
            user=user,
            details="Réactivation du compte via MeAPIView",
        )

        return Response(
            {
                "success": True,
                "message": "Votre compte a été réactivé avec succès.",
                "data": self._serialize_user(request, user),
            },
            status=status.HTTP_200_OK,
        )


class RoleChoicesView(ApiResponseMixin, APIView):
    """
    Vue publique retournant la liste des rôles utilisateurs définis
    dans CustomUser.ROLE_CHOICES.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Liste des rôles utilisateurs disponibles",
        description="Retourne tous les rôles utilisables avec leurs identifiants et libellés.",
        responses={200: OpenApiResponse(description="Réponse JSON standard contenant la liste des rôles.")},
        tags=["Utilisateur"],
    )
    def get(self, request):
        data = [{"value": value, "label": label} for value, label in CustomUser.ROLE_CHOICES]
        return self.success_response(
            data=data,
            message="Liste des rôles récupérée avec succès.",
            status_code=status.HTTP_200_OK,
        )


class MonCandidatView(RetrieveUpdateAPIView):
    """
    Vue permettant à un utilisateur authentifié de consulter et mettre à jour
    son profil candidat associé via l'attribut user.candidat.
    Lève une erreur 404 si aucun profil candidat n'est lié à l'utilisateur.
    """

    serializer_class = CandidatCreateUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # Sécurité : seul le candidat lié à l'utilisateur courant
        user = self.request.user
        # Le lien depuis l'utilisateur vers son profil candidat est défini par le related_name "candidat_associe".
        if not hasattr(user, "candidat_associe"):
            raise exceptions.NotFound("Aucun profil candidat associé à cet utilisateur.")
        return user.candidat_associe


class DemandeCompteCandidatView(ApiResponseMixin, APIView):
    """
    Endpoint permettant à un candidat authentifié de demander la création d'un compte utilisateur.

    Règles :
      - Ne crée jamais le compte immédiatement.
      - Met uniquement à jour les champs de suivi sur le modèle Candidat :
            * demande_compte_statut
            * demande_compte_date
      - Empêche les doublons de demande (une seule demande "en_attente" à la fois).
      - Si un compte est déjà lié au candidat, la demande est refusée.
    """

    permission_classes = [IsAuthenticated, CandidateRgpdGate]
    serializer_class = EmptySerializer

    @extend_schema(
        summary="Demander la création d'un compte utilisateur",
        tags=["Utilisateur"],
        responses={
            200: OpenApiResponse(description="Réponse JSON standard confirmant l'enregistrement de la demande."),
            400: OpenApiResponse(description="Réponse JSON standard indiquant pourquoi la demande est refusée."),
        },
    )
    def post(self, request, *args, **kwargs):
        user = request.user
        # Le lien depuis l'utilisateur vers son profil candidat est défini par le related_name "candidat_associe".
        candidat = getattr(user, "candidat_associe", None)
        if not candidat:
            raise exceptions.NotFound("Aucun profil candidat associé à cet utilisateur.")

        try:
            CandidateAccountService.request_account(candidat, requester=user)
        except ValidationError as e:
            errors = e.message_dict if hasattr(e, "message_dict") else {"non_field_errors": [str(e)]}
            message = errors.get("non_field_errors", [str(e)])[0]
            return self.error_response(
                message=message,
                errors=errors,
                error_code=MESSAGE_ERROR_CODE_MAP.get(message),
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        return self.success_response(
            data=None,
            message="Demande de création de compte enregistrée. Elle sera examinée par un membre du staff.",
            status_code=status.HTTP_200_OK,
        )
