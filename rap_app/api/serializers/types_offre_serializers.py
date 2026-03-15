from rest_framework import serializers
from drf_spectacular.utils import extend_schema_serializer, OpenApiExample, extend_schema_field
from django.utils.translation import gettext_lazy as _
from ...models.types_offre import TypeOffre


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            name="Type d'offre standard",
            value={
                "nom": "crif",
                "autre": "",
                "couleur": "#4e73df",
            },
            response_only=False,
        ),
        OpenApiExample(
            name="Type d'offre personnalisé",
            value={
                "nom": "autre",
                "autre": "Bilan de compétences",
                "couleur": "#20c997",
            },
            response_only=False,
        )
    ],
)
class TypeOffreSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour le modèle TypeOffre : champs du modèle, nom_display, formations_count, badge_html (sources modèle), is_personnalise (SerializerMethodField). create/update : appellent full_clean() sur l'instance avant save.
    """

    nom_display = serializers.CharField(
        source='get_nom_display',
        read_only=True,
        help_text="Libellé affiché (lecture seule, calculé dynamiquement côté modèle via 'get_nom_display')."
    )

    formations_count = serializers.IntegerField(
        source='get_formations_count',
        read_only=True,
        help_text="Nombre de formations associées, lecture seule."
    )

    badge_html = serializers.CharField(
        source='get_badge_html',
        read_only=True,
        help_text="Badge HTML stylisé pour UI (lecture seule, méthode du modèle)."
    )

    @extend_schema_field(serializers.BooleanField())
    def get_is_personnalise(self, obj) -> bool:
        """Retourne obj.is_personnalise()."""
        return obj.is_personnalise()

    is_personnalise = serializers.SerializerMethodField(
        help_text="True si le champ 'autre' est renseigné (lecture seule, dynamique via get_is_personnalise)."
    )

    class Meta:
        model = TypeOffre
        fields = [
            "id", "nom", "nom_display", "autre", "couleur", "badge_html",
            "is_personnalise", "formations_count",
            "created_at", "updated_at", "created_by", "updated_by", "is_active"
        ]
        read_only_fields = [
            "id", "nom_display", "badge_html", "is_personnalise",
            "formations_count", "created_at", "updated_at", "created_by", "updated_by", "is_active"
        ]
        extra_kwargs = {
            "nom": {
                "help_text": "Nom interne du type d'offre (choix prédéfinis ; modifiable à la création/édition).",
                "error_messages": {
                    "required": _("Le champ 'nom' est requis."),
                    "blank": _("Le champ 'nom' ne peut pas être vide."),
                }
            },
            "autre": {
                "help_text": "Texte personnalisé pour les types d'offre marqués comme 'autre'. Editable.",
            },
            "couleur": {
                "help_text": "Couleur affichée pour ce type (code hexadécimal, ex: #FF5733). Optionnelle, modifiable.",
            }
        }

    def create(self, validated_data):
        """Crée une instance TypeOffre, appelle full_clean() puis save()."""
        instance = TypeOffre(**validated_data)
        instance.full_clean()
        instance.save()
        return instance

    def update(self, instance, validated_data):
        """Met à jour l'instance, appelle full_clean() puis save()."""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.full_clean()
        instance.save()
        return instance

class TypeOffreChoiceSerializer(serializers.Serializer):
    """
    Option (value, label, default_color) pour un choix de type d'offre en liste déroulante. Pas de validation personnalisée.
    """
    value = serializers.CharField(
        help_text="Identifiant du type (ex: 'crif', 'autre')."
    )
    label = serializers.CharField(
        help_text="Libellé lisible (ex: 'CRIF', 'Autre')."
    )
    default_color = serializers.CharField(
        help_text="Couleur hexadécimale par défaut (ex: '#4e73df')."
    )
