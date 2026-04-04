"""Sérialiseurs autour des utilisateurs, profils et inscription.

Le but de ce fichier est double :
- exposer un contrat de lecture enrichi pour le front (`CustomUserSerializer`)
- garder des contrats d'écriture explicites pour create/update/registration.

Les docstrings décrivent ici les règles réelles du code, notamment sur
l'affectation des centres et sur les restrictions de changement de rôle.
"""

from django.apps import apps
from django.utils.translation import gettext_lazy as _
from django_filters import rest_framework as filters
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiExample,
    extend_schema_field,
    extend_schema_serializer,
)
from rest_framework import serializers

from ...models.custom_user import CustomUser
from ...models.formations import Formation
from ..serializers.formations_serializers import FormationLightSerializer


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            name="Utilisateur standard",
            value={
                "email": "jane.doe@example.com",
                "username": "janedoe",
                "first_name": "Jane",
                "last_name": "Doe",
                "phone": "0601020304",
                "role": "stagiaire",
                "bio": "Stagiaire motivée",
                "avatar": None,
            },
            response_only=False,
        ),
    ],
)
class CustomUserSerializer(serializers.ModelSerializer):
    """
    Contrat de lecture enrichi pour `CustomUser`.

    Ce serializer expose :
    - les champs principaux du modèle ;
    - des champs enrichis de lecture (`role_display`, `full_name`,
      `formation_info`, `centres_info`, `centre`, `role_lie`) ;
    - un champ `formation` en écriture pour relier un candidat/stagiaire ;
    - un champ `centres` en écriture réservé à l'administration.

    Règles métiers importantes reflétées par le code :
    - seul un superadmin peut attribuer `superadmin` ;
    - seul un admin ou un superadmin peut attribuer `admin` ;
    - un utilisateur ne peut pas se changer lui-même de rôle ;
    - l'affectation explicite des centres en create/update est réservée à un
      admin ou superadmin via `_assign_centres()`.
    """

    role_display = serializers.CharField(source="get_role_display", read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    formation = serializers.PrimaryKeyRelatedField(
        queryset=Formation.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        help_text="ID de la formation à associer (pour candidat/stagiaire)",
    )
    formation_info = serializers.SerializerMethodField(read_only=True)

    centres = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        write_only=True,
        help_text="IDs des centres autorisés (admin/superadmin uniquement)",
    )
    centres_info = serializers.SerializerMethodField(read_only=True)

    centre = serializers.SerializerMethodField(read_only=True)
    centre_lie = serializers.SerializerMethodField(read_only=True)
    role_lie = serializers.SerializerMethodField(read_only=True)

    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    is_admin = serializers.SerializerMethodField()
    is_staff_read = serializers.SerializerMethodField()

    @extend_schema_field(OpenApiTypes.STR)
    def get_is_admin(self, obj):
        """Retourne True si obj.is_admin() existe et retourne True."""
        return bool(getattr(obj, "is_admin", None) and callable(obj.is_admin) and obj.is_admin())

    @extend_schema_field(OpenApiTypes.STR)
    def get_is_staff_read(self, obj):
        """Retourne True si obj.role == 'staff_read'."""
        return obj.role == "staff_read"

    @extend_schema_field(OpenApiTypes.STR)
    def get_formation_info(self, obj):
        """Retourne FormationLightSerializer(obj.candidat_associe.formation).data si candidat_associe.formation existe, sinon None."""
        try:
            if hasattr(obj, "candidat_associe") and obj.candidat_associe.formation:
                return FormationLightSerializer(obj.candidat_associe.formation).data
        except Exception:
            return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_avatar_url(self, obj) -> str | None:
        """Retourne obj.avatar_url()."""
        return obj.avatar_url()

    avatar_url = serializers.SerializerMethodField(read_only=True, help_text="URL de l'avatar")

    @extend_schema_field(OpenApiTypes.STR)
    def get_centres_info(self, obj):
        """Retourne [{id, nom}] pour chaque centre dans obj.centres.all()."""
        try:
            return [{"id": c.id, "nom": getattr(c, "nom", str(c))} for c in obj.centres.all()]
        except Exception:
            return []

    @extend_schema_field(OpenApiTypes.STR)
    def get_centre(self, obj):
        """Centre principal : premier de obj.centres si présent, sinon centre de candidat_associe.formation, sinon None."""
        try:
            if hasattr(obj, "centres") and obj.centres.exists():
                c = obj.centres.first()
                return {"id": c.id, "nom": c.nom}

            if hasattr(obj, "candidat_associe") and obj.candidat_associe.formation:
                f = obj.candidat_associe.formation
                if f.centre:
                    return {"id": f.centre.id, "nom": f.centre.nom}
        except Exception:
            pass

        return None

    @extend_schema_field(OpenApiTypes.STR)
    def get_centre_lie(self, obj):
        """Alias explicite du centre lié pour les écrans `me`."""
        return self.get_centre(obj)

    @extend_schema_field(OpenApiTypes.STR)
    def get_role_lie(self, obj):
        """Rôle lié à l'utilisateur courant avec valeur et libellé."""
        role = getattr(obj, "role", None)
        if not role:
            return None
        return {"value": role, "label": obj.get_role_display()}

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "phone",
            "bio",
            "avatar",
            "avatar_url",
            "role",
            "role_display",
            "is_active",
            "date_joined",
            "full_name",
            "is_staff",
            "is_superuser",
            "is_admin",
            "is_staff_read",
            "formation",
            "formation_info",
            "centres",
            "centres_info",
            "centre",
            "centre_lie",
            "role_lie",
            "consent_rgpd",
            "consent_date",
        ]
        read_only_fields = [
            "id",
            "avatar_url",
            "role_display",
            "date_joined",
            "full_name",
            "formation_info",
            "centres_info",
            "centre",
            "centre_lie",
            "role_lie",
            "consent_date",
            "is_staff",
            "is_superuser",
            "is_admin",
            "is_staff_read",
        ]
        extra_kwargs = {
            "email": {
                "required": True,
                "error_messages": {
                    "required": _("Création échouée : l'adresse email est requise."),
                    "blank": _("Création échouée : l'adresse email ne peut pas être vide."),
                },
            },
            "username": {
                "required": True,
                "error_messages": {
                    "required": _("Création échouée : le nom d'utilisateur est requis."),
                    "blank": _("Création échouée : le nom d'utilisateur ne peut pas être vide."),
                },
            },
        }

    @extend_schema_field(OpenApiTypes.STR)
    def _is_admin_user(self, user) -> bool:
        """Retourne True si user est superuser ou is_admin() retourne True."""
        return bool(
            getattr(user, "is_superuser", False)
            or (hasattr(user, "is_admin") and callable(user.is_admin) and user.is_admin())
        )

    @extend_schema_field(OpenApiTypes.STR)
    def _get_centre_model(self):
        """Retourne le modèle Centre via Formation._meta.get_field('centre').related_model (ou remote_field.model)."""
        try:
            centre_field = Formation._meta.get_field("centre")
            return getattr(centre_field, "related_model", None) or getattr(centre_field.remote_field, "model", None)
        except Exception:
            return None

    @extend_schema_field(OpenApiTypes.STR)
    def _assign_centres(self, user, centre_ids: list[int]):
        """Assigne les centres dont l'id est dans centre_ids à user.centres ; lève ValidationError si des IDs sont invalides."""
        CentreModel = self._get_centre_model()
        if not CentreModel:
            raise serializers.ValidationError({"centres": "Modèle 'Centre' introuvable via Formation.centre."})

        centres_qs = CentreModel.objects.filter(id__in=centre_ids)
        found_ids = set(centres_qs.values_list("id", flat=True))
        missing = [cid for cid in centre_ids if cid not in found_ids]
        if missing:
            raise serializers.ValidationError({"centres": f"IDs inexistants: {missing}"})

        user.centres.set(centres_qs)

    @extend_schema_field(OpenApiTypes.STR)
    def create(self, validated_data):
        """Crée l'utilisateur ; si centres fourni, seuls admin/superadmin peuvent les assigner (sinon ValidationError)."""
        centres_ids = validated_data.pop("centres", None)
        user = CustomUser.objects.create_user(**validated_data)
        if centres_ids is not None:
            request = self.context.get("request")
            if request and self._is_admin_user(request.user):
                self._assign_centres(user, centres_ids)
            elif request:
                raise serializers.ValidationError({"centres": "Seul un admin/superadmin peut affecter des centres."})
        return user

    @extend_schema_field(OpenApiTypes.STR)
    def update(self, instance, validated_data):
        """Met à jour l'instance ; si centres fourni, seuls admin/superadmin peuvent les modifier (sinon ValidationError)."""
        centres_ids = validated_data.pop("centres", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if centres_ids is not None:
            request = self.context.get("request")
            if request and self._is_admin_user(request.user):
                self._assign_centres(instance, centres_ids)
            elif request:
                raise serializers.ValidationError({"centres": "Seul un admin/superadmin peut modifier les centres."})
        return instance

    @extend_schema_field(OpenApiTypes.STR)
    def validate_role(self, value):
        """Superadmin seul peut attribuer superadmin ; admin/superadmin seuls peuvent attribuer admin ; interdiction de modifier son propre rôle."""
        request = self.context.get("request")
        current_user = request.user if request else None
        if not current_user:
            return value
        if value == "superadmin" and current_user.role != "superadmin":
            raise serializers.ValidationError("Seul un superadmin peut attribuer ce rôle.")
        if value == "admin" and current_user.role not in ["superadmin", "admin"]:
            raise serializers.ValidationError("Seul un admin ou un superadmin peut attribuer ce rôle.")
        if self.instance and current_user.id == self.instance.id and value != current_user.role:
            raise serializers.ValidationError("Tu ne peux pas changer ton propre rôle.")
        return value


class BaseCustomUserWriteSerializer(CustomUserSerializer):
    """
    Base commune d'écriture pour les utilisateurs.

    Le serializer de lecture `CustomUserSerializer` conserve les champs enrichis
    destinés au front. Les opérations d'écriture utilisent ce contrat dédié
    pour rendre explicites les champs réellement attendus en create/update.
    """

    class Meta(CustomUserSerializer.Meta):
        read_only_fields = [
            "id",
            "avatar_url",
            "role_display",
            "date_joined",
            "full_name",
            "formation_info",
            "centres_info",
            "centre",
            "consent_date",
            "is_staff",
            "is_superuser",
            "is_admin",
            "is_staff_read",
        ]


class CustomUserCreateSerializer(BaseCustomUserWriteSerializer):
    """Contrat d'écriture pour la création d'un utilisateur."""

    pass


class CustomUserUpdateSerializer(BaseCustomUserWriteSerializer):
    """Contrat d'écriture pour la mise à jour partielle ou complète d'un utilisateur."""

    email = serializers.EmailField(required=False)
    username = serializers.CharField(required=False)
    role = serializers.ChoiceField(choices=CustomUser.ROLE_CHOICES, required=False)


class RoleChoiceSerializer(serializers.Serializer):
    """
    Option (value, label) pour un choix de rôle. Pas de validation personnalisée.
    """

    value = serializers.CharField(help_text="Identifiant du rôle (ex: 'admin')")
    label = serializers.CharField(help_text="Libellé du rôle (ex: 'Administrateur')")


from django.utils import timezone


class RegistrationSerializer(serializers.ModelSerializer):
    """
    Contrat d'inscription publique d'un nouvel utilisateur.

    Le serializer exige le consentement RGPD et crée un compte :
    - `is_active=False`
    - `role='stagiaire'`
    - avec `consent_date` renseignée si le consentement est validé

    Il s'agit d'un flux d'entrée simple ; l'attribution d'autres rôles ou de
    centres relève ensuite des écrans et endpoints d'administration.
    """

    consent_rgpd = serializers.BooleanField(
        required=True, help_text="Consentement explicite au traitement des données personnelles (RGPD)."
    )

    class Meta:
        model = CustomUser
        fields = ["email", "password", "first_name", "last_name", "consent_rgpd"]
        extra_kwargs = {"password": {"write_only": True}}

    @extend_schema_field(OpenApiTypes.STR)
    def validate_consent_rgpd(self, value):
        """Exige value == True ; sinon ValidationError."""
        if not value:
            raise serializers.ValidationError("Vous devez accepter la politique de confidentialité (RGPD).")
        return value

    @extend_schema_field(OpenApiTypes.STR)
    def create(self, validated_data):
        """Crée un utilisateur is_active=False, role='stagiaire' ; si consent_rgpd, enregistre consent_rgpd et consent_date."""
        consent_rgpd = validated_data.pop("consent_rgpd", False)

        user = CustomUser.objects.create_user(is_active=False, role="stagiaire", **validated_data)

        if consent_rgpd:
            user.consent_rgpd = True
            user.consent_date = timezone.now()
            user.save(update_fields=["consent_rgpd", "consent_date"])

        return user
