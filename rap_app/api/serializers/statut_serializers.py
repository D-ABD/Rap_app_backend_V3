from rest_framework import serializers
from drf_spectacular.utils import extend_schema_serializer, extend_schema_field
import re
from ...models.statut import Statut


@extend_schema_serializer(
)
class StatutSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour le modèle Statut : champs du modèle, libelle et badge_html (SerializerMethodField), created_by et updated_by (SerializerMethodField). validate : si nom == Statut.AUTRE, description_autre obligatoire ; si couleur fournie, format hexadécimal #RRGGBB requis.
    """

    libelle = serializers.SerializerMethodField(
        help_text="Libellé affiché du statut (remplace 'Autre' par une description personnalisée si définie)."
    )
    badge_html = serializers.SerializerMethodField(
        help_text="Code HTML pour un badge coloré représentant le statut visuellement."
    )

    id = serializers.IntegerField(read_only=True, help_text="ID unique du statut.")
    nom = serializers.ChoiceField(
        choices=Statut.STATUT_CHOICES,
        help_text="Nom interne du statut (valeurs définies en base)."
    )
    couleur = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Couleur hexadécimale du badge (#RRGGBB)."
    )
    description_autre = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Texte personnalisé pour le statut 'Autre'."
    )

    created_at = serializers.DateTimeField(read_only=True, help_text="Date de création.")
    updated_at = serializers.DateTimeField(read_only=True, help_text="Dernière mise à jour.")
    created_by = serializers.SerializerMethodField(help_text="Nom de l'utilisateur ayant créé ce statut.")
    updated_by = serializers.SerializerMethodField(help_text="Nom de l'utilisateur ayant modifié ce statut.")
    is_active = serializers.BooleanField(read_only=True, help_text="Statut actif ou désactivé (suppression logique).")

    class Meta:
        model = Statut
        fields = [
            "id", "nom", "couleur", "description_autre",
            "libelle", "badge_html",
            "created_at", "updated_at", "created_by", "updated_by", "is_active"
        ]

    @extend_schema_field(serializers.CharField())
    def get_libelle(self, obj) -> str:
        """Retourne obj.get_nom_display()."""
        return obj.get_nom_display()

    @extend_schema_field(serializers.CharField())
    def get_badge_html(self, obj) -> str:
        """Retourne obj.get_badge_html()."""
        return obj.get_badge_html()

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_created_by(self, obj) -> str | None:
        """Retourne obj.created_by.username ou None."""
        return getattr(obj.created_by, 'username', None)

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_updated_by(self, obj) -> str | None:
        """Retourne obj.updated_by.username ou None."""
        return getattr(obj.updated_by, 'username', None)

    def validate(self, data):
        """Si nom == Statut.AUTRE, description_autre obligatoire. Si couleur fournie, format #RRGGBB requis."""
        nom = data.get("nom")
        couleur = data.get("couleur")
        description_autre = data.get("description_autre")

        if nom == Statut.AUTRE and not description_autre:
            raise serializers.ValidationError({
                "description_autre": "Le champ est requis pour un statut 'Autre'."
            })

        if couleur and not re.match(r'^#[0-9A-Fa-f]{6}$', couleur):
            raise serializers.ValidationError({
                "couleur": "La couleur doit être au format hexadécimal (#RRGGBB)."
            })

        return data

class StatutChoiceSerializer(serializers.Serializer):
    """
    Option (value, label, default_color, text_color) pour un choix de statut en liste déroulante. Pas de validation personnalisée.
    """
    value = serializers.CharField(
        help_text="Identifiant interne du statut (ex: 'non_defini')"
    )
    label = serializers.CharField(
        help_text="Libellé lisible du statut (ex: 'Non défini')"
    )
    default_color = serializers.CharField(
        help_text="Couleur hexadécimale par défaut du statut (ex: '#FFEB3B')"
    )
    text_color = serializers.CharField(
        help_text="Couleur de texte recommandée selon la lisibilité (ex: '#000000' ou '#FFFFFF')"
    )
