from django.utils import timezone as dj_timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import exceptions, status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models.custom_user import CustomUser
from ...models.logs import LogUtilisateur
from ..serializers.base_serializers import EmptySerializer
from ..serializers.candidat_serializers import CandidatCreateUpdateSerializer
from ..serializers.user_profil_serializers import (
    CustomUserSerializer,
    RoleChoiceSerializer,
)


class MeAPIView(APIView):
    """
    API permettant à l'utilisateur authentifié de consulter, mettre à jour
    et réactiver son propre profil via les méthodes GET, PATCH et POST.
    """

    serializer_class = EmptySerializer

    permission_classes = [IsAuthenticated]

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
                "data": user.to_serializable_dict(include_sensitive=True),
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
                "data": user.to_serializable_dict(include_sensitive=True),
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
                {"success": False, "message": "Votre compte est déjà actif."},
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
                "data": user.to_serializable_dict(include_sensitive=True),
            },
            status=status.HTTP_200_OK,
        )


class RoleChoicesView(APIView):
    """
    Vue publique retournant la liste des rôles utilisateurs définis
    dans CustomUser.ROLE_CHOICES.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Liste des rôles utilisateurs disponibles",
        description="Retourne tous les rôles utilisables avec leurs identifiants et libellés.",
        responses={200: OpenApiResponse(response=RoleChoiceSerializer(many=True))},
        tags=["Utilisateur"],
    )
    def get(self, request):
        data = [{"value": value, "label": label} for value, label in CustomUser.ROLE_CHOICES]
        return Response(data, status=status.HTTP_200_OK)


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
        if not hasattr(user, "candidat"):
            raise exceptions.NotFound("Aucun profil candidat associé à cet utilisateur.")
        return user.candidat


class DemandeCompteCandidatView(APIView):
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

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Demander la création d'un compte utilisateur",
        tags=["Utilisateur"],
        responses={
            200: OpenApiResponse(description="Demande de compte enregistrée."),
            400: OpenApiResponse(description="Demande impossible (déjà en attente, compte existant, ...)."),
        },
    )
    def post(self, request, *args, **kwargs):
        user = request.user
        candidat = getattr(user, "candidat", None)
        if not candidat:
            raise exceptions.NotFound("Aucun profil candidat associé à cet utilisateur.")

        if candidat.compte_utilisateur_id:
            return Response(
                {
                    "success": False,
                    "message": "Un compte utilisateur est déjà lié à ce candidat.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if candidat.demande_compte_statut == candidat.DemandeCompteStatut.EN_ATTENTE:
            return Response(
                {
                    "success": False,
                    "message": "Une demande de compte est déjà en attente.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        candidat.demande_compte_statut = candidat.DemandeCompteStatut.EN_ATTENTE
        candidat.demande_compte_date = dj_timezone.now()
        candidat.demande_compte_traitee_par = None
        candidat.demande_compte_traitee_le = None
        candidat.save(
            update_fields=[
                "demande_compte_statut",
                "demande_compte_date",
                "demande_compte_traitee_par",
                "demande_compte_traitee_le",
            ]
        )

        return Response(
            {
                "success": True,
                "message": "Demande de création de compte enregistrée. Elle sera examinée par un membre du staff.",
            },
            status=status.HTTP_200_OK,
        )
