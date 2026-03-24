from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import (
    OpenApiExample,
    extend_schema_field,
    extend_schema_serializer,
)
from rest_framework import serializers

from ...models.formations import Formation
from ...models.prospection import HistoriqueProspection, Prospection, ProspectionChoices
from ..serializers.prospection_comment_serializers import ProspectionCommentSerializer
from .rich_text_utils import sanitize_rich_text


class BaseProspectionSerializer(serializers.ModelSerializer):
    """
    Base pour les prospections : champs liés (partenaire_nom, centre, centre_nom, formation_nom, num_offre), commentaires annotés (last_comment, last_comment_at, last_comment_id, comments_count), displays, activite, moyen_contact, champs calculés (is_active, relance_necessaire), owner, et champs confort partenaire/formation (SerializerMethodField).
    """

    partenaire_nom = serializers.CharField(source="partenaire.nom", read_only=True)
    centre = serializers.PrimaryKeyRelatedField(read_only=True)
    centre_nom = serializers.CharField(source="centre.nom", read_only=True)
    formation_nom = serializers.CharField(source="formation.nom", read_only=True)
    num_offre = serializers.CharField(source="formation.num_offre", read_only=True)

    last_comment = serializers.CharField(read_only=True)
    last_comment_at = serializers.DateTimeField(read_only=True)
    last_comment_id = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)

    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    objectif_display = serializers.CharField(source="get_objectif_display", read_only=True)
    motif_display = serializers.CharField(source="get_motif_display", read_only=True)
    type_prospection_display = serializers.CharField(source="get_type_prospection_display", read_only=True)
    activite = serializers.ChoiceField(
        choices=Prospection.ACTIVITE_CHOICES,
        default=Prospection.ACTIVITE_ACTIVE,
    )
    activite_display = serializers.CharField(source="get_activite_display", read_only=True)

    moyen_contact = serializers.ChoiceField(
        choices=ProspectionChoices.MOYEN_CONTACT_CHOICES,
        required=False,
        allow_null=True,
    )
    moyen_contact_display = serializers.CharField(source="get_moyen_contact_display", read_only=True)

    is_active = serializers.BooleanField(read_only=True)
    relance_necessaire = serializers.BooleanField(read_only=True)

    created_by = serializers.StringRelatedField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    owner = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.all(),
        required=False,
        allow_null=True,
    )
    owner_username = serializers.StringRelatedField(source="owner", read_only=True)

    partenaire_ville = serializers.SerializerMethodField()
    partenaire_tel = serializers.SerializerMethodField()
    partenaire_email = serializers.SerializerMethodField()

    formation_date_debut = serializers.DateField(source="formation.start_date", read_only=True, allow_null=True)
    formation_date_fin = serializers.DateField(source="formation.end_date", read_only=True, allow_null=True)
    type_offre_display = serializers.SerializerMethodField()
    formation_statut_display = serializers.SerializerMethodField()
    places_disponibles = serializers.SerializerMethodField()

    @extend_schema_field(str)
    def get_partenaire_ville(self, obj):
        """Retourne obj.partenaire.city ou None."""
        p = getattr(obj, "partenaire", None)
        return getattr(p, "city", None) if p else None

    @extend_schema_field(str)
    def get_partenaire_tel(self, obj):
        """Retourne obj.partenaire.contact_telephone ou None."""
        p = getattr(obj, "partenaire", None)
        return getattr(p, "contact_telephone", None) if p else None

    @extend_schema_field(str)
    def get_partenaire_email(self, obj):
        """Retourne obj.partenaire.contact_email ou None."""
        p = getattr(obj, "partenaire", None)
        return getattr(p, "contact_email", None) if p else None

    @extend_schema_field(str)
    def get_type_offre_display(self, obj):
        """Retourne obj.formation.type_offre.nom ou None."""
        f = getattr(obj, "formation", None)
        to = getattr(f, "type_offre", None) if f else None
        return getattr(to, "nom", None) if to else None

    @extend_schema_field(str)
    def get_formation_statut_display(self, obj):
        """Retourne obj.formation.statut.nom ou None."""
        f = getattr(obj, "formation", None)
        st = getattr(f, "statut", None) if f else None
        return getattr(st, "nom", None) if st else None

    @extend_schema_field(str)
    def get_places_disponibles(self, obj):
        """Retourne int(obj.formation.places_disponibles) ou None."""
        f = getattr(obj, "formation", None)
        return int(f.places_disponibles) if f and f.places_disponibles is not None else None


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            name="Exemple de prospection",
            value={
                "partenaire": 1,
                "formation": 2,
                "date_prospection": "2025-05-10T14:00:00",
                "type_prospection": "premier_contact",
                "motif": "partenariat",
                "statut": "en_cours",
                "objectif": "presentation_offre",
                "commentaire": "Entretien en cours",
                "relance_prevue": "2025-05-20",
                "moyen_contact": "email",
            },
            response_only=False,
        )
    ]
)
class ProspectionSerializer(BaseProspectionSerializer):
    """
    Sérialiseur principal pour création/mise à jour des prospections.

    La résolution métier de `owner`, `formation` et `centre` relève
    désormais de `ProspectionOwnershipService` côté viewset. Le serializer
    se limite donc au contrat de validation DRF.
    """

    formation = serializers.PrimaryKeyRelatedField(
        queryset=Formation.objects.all(),
        required=False,
        allow_null=True,
    )
    relance_prevue = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = Prospection
        fields = [
            "id",
            "partenaire",
            "partenaire_nom",
            "formation",
            "formation_nom",
            "centre",
            "centre_nom",
            "num_offre",
            "date_prospection",
            "type_prospection",
            "type_prospection_display",
            "motif",
            "motif_display",
            "statut",
            "statut_display",
            "objectif",
            "objectif_display",
            "commentaire",
            "relance_prevue",
            "moyen_contact",
            "moyen_contact_display",
            "activite",
            "activite_display",
            "is_active",
            "relance_necessaire",
            "created_by",
            "created_at",
            "updated_at",
            "owner",
            "owner_username",
            "last_comment",
            "last_comment_at",
            "last_comment_id",
            "comments_count",
            "partenaire_ville",
            "partenaire_tel",
            "partenaire_email",
            "formation_date_debut",
            "formation_date_fin",
            "type_offre_display",
            "formation_statut_display",
            "places_disponibles",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "partenaire_nom",
            "formation_nom",
            "centre",
            "centre_nom",
            "num_offre",
            "statut_display",
            "objectif_display",
            "type_prospection_display",
            "motif_display",
            "is_active",
            "relance_necessaire",
            "owner_username",
            "partenaire_ville",
            "partenaire_tel",
            "partenaire_email",
            "formation_date_debut",
            "formation_date_fin",
            "type_offre_display",
            "formation_statut_display",
            "places_disponibles",
            "moyen_contact_display",
            "last_comment",
            "last_comment_at",
            "last_comment_id",
            "comments_count",
        ]

    def validate_activite(self, value):
        """Vérifie que value est dans Prospection.ACTIVITE_CHOICES."""
        if value not in dict(Prospection.ACTIVITE_CHOICES):
            raise serializers.ValidationError(_("Valeur d'activité invalide."))
        return value

    def validate(self, data):
        """Si statut refusée ou annulée, commentaire obligatoire."""
        if data.get("statut") in [
            ProspectionChoices.STATUT_REFUSEE,
            ProspectionChoices.STATUT_ANNULEE,
        ] and not data.get("commentaire"):
            raise serializers.ValidationError(
                {"commentaire": _("Un commentaire est requis pour les statuts refusé ou annulé.")}
            )
        return data

    def validate_date_prospection(self, value):
        """Validation : la date de prospection ne peut pas être dans le futur."""
        if value and value > timezone.now():
            raise serializers.ValidationError(_("La date de prospection ne peut pas être dans le futur."))
        return value

    def validate_relance_prevue(self, value):
        """Si value fournie, exige value >= date du jour."""
        if value and value < timezone.now().date():
            raise serializers.ValidationError(_("La date de relance prévue doit être dans le futur."))
        return value

    def validate_commentaire(self, value):
        return sanitize_rich_text(value)


class ProspectionWriteSerializer(ProspectionSerializer):
    """
    Contrat d'écriture dédié aux créations et mises à jour de prospection.

    Le serializer de lecture garde les champs enrichis utiles au front,
    tandis que cette variante borne explicitement les champs attendus en
    entrée pour create/update.
    """

    class Meta:
        model = Prospection
        fields = [
            "id",
            "partenaire",
            "formation",
            "date_prospection",
            "type_prospection",
            "motif",
            "statut",
            "objectif",
            "commentaire",
            "relance_prevue",
            "moyen_contact",
            "activite",
            "owner",
        ]
        read_only_fields = ["id"]


class ProspectionListSerializer(BaseProspectionSerializer):
    """
    Liste de prospections : mêmes champs que ProspectionSerializer (hérités de la base), lecture seule.
    """

    class Meta:
        model = Prospection
        fields = ProspectionSerializer.Meta.fields


class ProspectionDetailSerializer(ProspectionSerializer):
    """
    Détail d'une prospection : hérite de ProspectionSerializer et ajoute commentaires (liste ProspectionCommentSerializer, source=comments).
    """

    commentaires = ProspectionCommentSerializer(many=True, read_only=True, source="comments")

    class Meta(ProspectionSerializer.Meta):
        fields = ProspectionSerializer.Meta.fields + ["commentaires"]


class ChangerStatutSerializer(serializers.Serializer):
    """
    Payload pour changement de statut : statut (choix), commentaire, moyen_contact, relance_prevue, prochain_contact. validate : si prochain_contact fourni et relance_prevue absent, copie prochain_contact dans relance_prevue.
    """

    statut = serializers.ChoiceField(choices=ProspectionChoices.PROSPECTION_STATUS_CHOICES)
    commentaire = serializers.CharField(required=False, allow_blank=True)
    moyen_contact = serializers.ChoiceField(choices=ProspectionChoices.MOYEN_CONTACT_CHOICES, required=False)
    relance_prevue = serializers.DateField(required=False)
    prochain_contact = serializers.DateField(required=False)

    def validate(self, data):
        """Copie prochain_contact dans relance_prevue si relance_prevue absent."""
        if data.get("prochain_contact") and not data.get("relance_prevue"):
            data["relance_prevue"] = data["prochain_contact"]
        return data


class EnumChoiceSerializer(serializers.Serializer):
    """
    Option (value, label) pour un choix enum. Pas de validation personnalisée.
    """

    value = serializers.CharField(help_text="Valeur brute utilisée en base")
    label = serializers.CharField(help_text="Libellé affiché (traduction)")


class ProspectionChoiceListSerializer(serializers.Serializer):
    """
    Structure de sortie des choix prospection : statut, objectif, type_prospection, motif, moyen_contact, owners, partenaires (listes).
    """

    statut = EnumChoiceSerializer(many=True)
    objectif = EnumChoiceSerializer(many=True)
    type_prospection = EnumChoiceSerializer(many=True)
    motif = EnumChoiceSerializer(many=True)
    moyen_contact = EnumChoiceSerializer(many=True)
    owners = serializers.ListField()
    partenaires = EnumChoiceSerializer(many=True)
