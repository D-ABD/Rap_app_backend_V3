"""Endpoints utilisateurs et rôles."""

from django.db import transaction
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models.candidat import Candidat
from ...models.custom_user import CustomUser
from ...models.formations import Formation
from ...models.logs import LogUtilisateur
from ...utils.filters import UserFilterSet
from ..permissions import IsAdminLikeOnly, ReadWriteAdminReadStaff
from ..roles import is_admin_like, is_staff_or_staffread
from ..serializers.user_profil_serializers import (
    CustomUserSerializer,
    CustomUserCreateSerializer,
    CustomUserUpdateSerializer,
    RegistrationSerializer,
    RoleChoiceSerializer,
)
from ..mixins import ApiResponseMixin
from .base import BaseApiViewSet


@extend_schema(
    summary="Inscription d’un utilisateur",
    description=(
        "Crée un nouvel utilisateur stagiaire avec email, mot de passe et consentement RGPD. "
        "L’inscription nécessite l’acceptation explicite de la politique de confidentialité."
    ),
    request=RegistrationSerializer,
    responses={
        201: OpenApiResponse(description="Utilisateur créé avec succès (en attente de validation)."),
        400: OpenApiResponse(description="Erreur de validation ou consentement RGPD manquant."),
    },
    tags=["Utilisateurs"],
)
class RegisterView(ApiResponseMixin, APIView):
    """
    API publique permettant l'inscription d'un utilisateur stagiaire
    via RegistrationSerializer, sans authentification préalable.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return self.success_response(
                data={
                    "email": user.email,
                    "consent_rgpd": user.consent_rgpd,
                    "consent_date": user.consent_date,
                },
                message="Compte créé. En attente de validation.",
                status_code=status.HTTP_201_CREATED,
            )

        return self.error_response(
            message="Erreur de validation.",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


def _ensure_candidate_for_user(user: CustomUser, formation_id: int | None) -> Candidat:
    """
    Garantit l'existence d'un candidat lié à l'utilisateur et associe
    une formation si un identifiant valide est fourni.
    """
    candidat, created = Candidat.objects.get_or_create(
        compte_utilisateur=user,
        defaults={
            "nom": (user.last_name or "").strip() or None,
            "prenom": (user.first_name or "").strip() or None,
            "email": user.email or None,
        },
    )

    if formation_id:
        try:
            f = Formation.objects.get(pk=formation_id)
            candidat.formation = f
        except Formation.DoesNotExist:
            pass

    candidat.save()
    return candidat


class CustomUserViewSet(BaseApiViewSet):
    """
    ViewSet de gestion des utilisateurs (CRUD, filtres, actions RGPD
    et vues utilitaires) avec scoping par centres et permissions
    ReadWriteAdminReadStaff.
    """

    queryset = CustomUser.objects.select_related("candidat_associe__formation")
    serializer_class = CustomUserSerializer
    # Permissions détaillées ci-dessus. Classe non visible.
    permission_classes = [ReadWriteAdminReadStaff]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    filterset_class = UserFilterSet
    search_fields = ["email", "username", "first_name", "last_name"]
    ordering_fields = ["email", "date_joined", "role"]
    ordering = ["-date_joined"]

    def get_serializer_class(self):
        if self.action == "create":
            return CustomUserCreateSerializer
        if self.action in ["update", "partial_update"]:
            return CustomUserUpdateSerializer
        return CustomUserSerializer

    # ---------- Scopage par centres pour les STAFF ----------
    def _restrict_users_to_staff_centres(self, qs):
        """
        Restreint le queryset aux utilisateurs visibles pour le staff
        courant selon ses centres, ou renvoie tous les utilisateurs
        pour les profils admin ou superuser.
        """
        u = self.request.user
        if is_admin_like(u):
            return qs

        if is_staff_or_staffread(u):
            centre_ids = u.centres.values_list("id", flat=True)
            if not centre_ids:
                return qs.none()
            return qs.filter(
                Q(centres__in=centre_ids) | Q(candidat_associe__formation__centre_id__in=centre_ids)
            ).distinct()

        # Non-staff : accès interdit côté filtre métier (présumé interdit par la permission globale également).
        return qs.none()

    def get_queryset(self):
        """
        Retourne les utilisateurs actifs filtrés selon le périmètre de
        centres de l'utilisateur courant.
        """
        base = super().get_queryset()
        if self.action != "reactivate":
            base = base.filter(is_active=True)
        return self._restrict_users_to_staff_centres(base)

    # -------------------------------------------------------

    @action(
        detail=False, methods=["delete"], url_path="delete-account", permission_classes=[permissions.IsAuthenticated]
    )
    @extend_schema(
        summary="Supprimer mon compte (RGPD)",
        description="Supprime définitivement toutes les données personnelles de l'utilisateur connecté.",
        tags=["Utilisateurs"],
        responses={
            200: OpenApiResponse(description="Réponse JSON standard confirmant la suppression RGPD."),
            403: OpenApiResponse(description="Authentification requise."),
        },
    )
    def delete_account(self, request):
        """
        Désactive et anonymise le compte de l'utilisateur connecté puis
        journalise l'opération et renvoie l'enveloppe API standard.
        """
        user = request.user
        email = user.email

        # Suppression logique + anonymisation (pour conformité RGPD)
        user.is_active = False
        user.email = f"deleted_{user.id}@example.com"
        user.first_name = ""
        user.last_name = ""
        user.phone = ""
        user.bio = ""
        user.consent_rgpd = False
        user.save()

        LogUtilisateur.log_action(
            instance=user,
            action=LogUtilisateur.ACTION_DELETE,
            user=user,
            details="Suppression complète du compte (RGPD)",
        )

        return Response(
            {
                "success": True,
                "message": f"Le compte associé à {email} a été supprimé conformément au RGPD.",
                "data": None,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        """
        Désactive logiquement un utilisateur ciblé (is_active=False),
        journalise la suppression et renvoie une réponse JSON
        standardisée.
        """
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_DELETE,
            user=request.user,
            details="Suppression logique de l'utilisateur",
        )
        return Response(
            {
                "success": True,
                "message": "Utilisateur désactivé avec succès (suppression logique).",
                "data": None,
            },
            status=status.HTTP_200_OK,  # ✅ cohérent avec le body
        )

    @action(detail=False, methods=["post"], url_path="deactivate", permission_classes=[permissions.IsAuthenticated])
    def deactivate_self(self, request):
        """
        Désactive le compte de l'utilisateur connecté (sans suppression
        des données) et renvoie l'enveloppe API standard.
        """
        user = request.user
        user.is_active = False
        user.save(update_fields=["is_active"])
        LogUtilisateur.log_action(
            instance=user,
            action=LogUtilisateur.ACTION_DELETE,
            user=user,
            details="Auto-désactivation du compte",
        )
        return Response(
            {
                "success": True,
                "message": "Votre compte a été désactivé. Vous pouvez demander une réactivation.",
                "data": None,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="reactivate", permission_classes=[IsAdminLikeOnly])
    def reactivate(self, request, pk=None):
        """
        Réactive un utilisateur désactivé (admin uniquement) et
        journalise la réactivation avec enveloppe API standard.
        """
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=["is_active"])
        LogUtilisateur.log_action(
            instance=user,
            action=LogUtilisateur.ACTION_UPDATE,
            user=request.user,
            details="Réactivation du compte utilisateur",
        )
        return Response(
            {
                "success": True,
                "message": "Utilisateur réactivé avec succès.",
                "data": None,
            },
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Crée un utilisateur, garantit la création d'un candidat associé
        pour les rôles candidat ou stagiaire, journalise l'action et
        renvoie une réponse JSON standardisée.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user: CustomUser = serializer.save()

        role = serializer.validated_data.get("role") or user.role
        formation_id = request.data.get("formation")
        try:
            formation_id = int(formation_id) if formation_id is not None else None
        except (TypeError, ValueError):
            formation_id = None

        if role in ["candidat", "stagiaire"]:
            _ensure_candidate_for_user(user, formation_id)

        LogUtilisateur.log_action(
            instance=user,
            action=LogUtilisateur.ACTION_CREATE,
            user=request.user,
            details="Création d’un utilisateur",
        )

        return self.created_response(
            data=user.to_serializable_dict(include_sensitive=True),
            message="Utilisateur créé avec succès.",
        )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """
        Met à jour un utilisateur (PUT/PATCH), assure la présence d'un
        candidat associé pour certains rôles et renvoie soit une
        réponse JSON de succès, soit les erreurs de validation.
        """
        partial = kwargs.pop("partial", False)
        instance: CustomUser = self.get_object()

        # Traces pour le debug, pas de sortie métier/HTTP.
        ("🔁 Requête PATCH reçue pour l'utilisateur:", instance.id)
        ("📦 Données brutes reçues:", request.data)

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        user: CustomUser = serializer.save()
        (f"✅ Utilisateur mis à jour : {user.email}")

        new_role = serializer.validated_data.get("role", user.role)
        formation_id = request.data.get("formation")
        try:
            formation_id = int(formation_id) if formation_id is not None else None
        except (TypeError, ValueError):
            formation_id = None

        if new_role in ["candidat", "stagiaire"]:
            _ensure_candidate_for_user(user, formation_id)

        LogUtilisateur.log_action(
            instance=user,
            action=LogUtilisateur.ACTION_UPDATE,
            user=request.user,
            details="Mise à jour d'un utilisateur",
        )

        return self.success_response(
            data=user.to_serializable_dict(include_sensitive=True),
            message="Utilisateur mis à jour avec succès.",
        )

    @action(detail=False, methods=["get"], url_path="me", permission_classes=[permissions.IsAuthenticated])
    @extend_schema(
        summary="Mon profil utilisateur",
        description="Retourne les informations complètes de l’utilisateur actuellement connecté.",
        tags=["Utilisateurs"],
        responses={200: OpenApiResponse(response=CustomUserSerializer)},
    )
    def me(self, request):
        """
        Retourne le profil complet de l'utilisateur connecté via
        CustomUserSerializer dans un wrapper JSON success/message/data.
        """
        serializer = CustomUserSerializer(request.user, context={"request": request})
        return self.success_response(
            data=serializer.data,
            message="Profil utilisateur chargé avec succès.",
        )

    @action(detail=False, methods=["get"], url_path="roles", permission_classes=[permissions.IsAuthenticated])
    @extend_schema(
        summary="Liste des rôles utilisateurs",
        description="Retourne tous les rôles disponibles dans l'application, sous forme clé/valeur.",
        tags=["Utilisateurs"],
        responses={
            200: OpenApiResponse(
                response=dict,
                description="Rôles disponibles pour la création ou modification d’un utilisateur.",
            )
        },
    )
    def roles(self, request):
        """
        Retourne les rôles utilisateurs disponibles pour la création et
        la modification de comptes (liste ``{value, label}``, alignée sur ``GET /api/roles/``).
        """
        data = [{"value": value, "label": label} for value, label in CustomUser.ROLE_CHOICES]
        return self.success_response(
            data=data,
            message="Liste des rôles récupérée avec succès.",
        )

    def retrieve(self, request, *args, **kwargs):
        """
        Retourne le détail d'un utilisateur ciblé avec un wrapper JSON
        success/message/data.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return self.success_response(
            data=serializer.data,
            message="Utilisateur récupéré avec succès.",
        )

    @action(detail=False, methods=["get"], url_path="liste-simple")
    @extend_schema(
        summary="Liste simple des utilisateurs (id + nom + username)",
        description="Retourne une liste allégée des utilisateurs actifs pour les filtres (id, nom, username).",
        tags=["Utilisateurs"],
    )
    def liste_simple(self, request):
        """
        Retourne une liste simplifiée des utilisateurs (id et libellé)
        destinée aux filtres ou sélecteurs.
        """
        users = self.get_queryset().only("id", "first_name", "last_name", "email", "username").order_by("first_name")
        data = [
            {
                "id": u.id,
                "nom": f"{u.first_name} {u.last_name}".strip() or u.email,
                "username": u.username,
            }
            for u in users
        ]
        return self.success_response(
            data=data,
            message="Liste simple des utilisateurs récupérée avec succès.",
        )

    @action(detail=False, methods=["get"], url_path="filtres")
    def get_user_filtres(self, request):
        """
        Fournit les options de filtres disponibles pour les utilisateurs
        (rôles, statut actif, formations, centres, types d'offre) en
        tenant compte des centres accessibles au demandeur.
        """
        roles = [{"value": value, "label": label} for value, label in CustomUser.ROLE_CHOICES]

        formations_qs = Formation.objects.select_related("centre", "type_offre").order_by("nom")
        u = request.user
        if is_staff_or_staffread(u) and not is_admin_like(u):
            centre_ids = u.centres.values_list("id", flat=True)
            formations_qs = formations_qs.filter(centre_id__in=centre_ids)

        formation_options = [
            {
                "value": f.id,
                "label": f.nom,
                "centre": f.centre.nom if f.centre else None,
                "type_offre": f.type_offre.nom if f.type_offre else None,
            }
            for f in formations_qs
        ]

        centres = [{"value": f.centre.id, "label": f.centre.nom} for f in formations_qs if f.centre]
        types_offre = [{"value": f.type_offre.id, "label": f.type_offre.nom} for f in formations_qs if f.type_offre]

        def unique(items):
            seen = set()
            out = []
            for i in items:
                if i["value"] not in seen:
                    seen.add(i["value"])
                    out.append(i)
            return out

        return self.success_response(
            data={
                "role": roles,
                "is_active": [{"value": "true", "label": "Actif"}, {"value": "false", "label": "Inactif"}],
                "formation": [{"value": f["value"], "label": f["label"]} for f in formation_options],
                "centre": unique(centres),
                "type_offre": unique(types_offre),
            },
            message="Filtres utilisateurs récupérés avec succès.",
        )


class RoleChoicesView(APIView):
    """
    Vue exposant publiquement la liste des rôles utilisateurs
    disponibles sous forme de paires valeur/libellé.
    """

    @extend_schema(
        responses={200: RoleChoiceSerializer(many=True)},
        summary="Liste des rôles utilisateurs disponibles",
        description="Retourne tous les rôles utilisables avec leurs identifiants et libellés.",
    )
    def get(self, request):
        data = [{"value": value, "label": label} for value, label in CustomUser.ROLE_CHOICES]
        return Response(
            {
                "success": True,
                "message": "Liste des rôles récupérée avec succès.",
                "data": data,
            },
            status=status.HTTP_200_OK,
        )
