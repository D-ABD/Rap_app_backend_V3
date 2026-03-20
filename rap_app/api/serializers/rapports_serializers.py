from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import OpenApiExample, extend_schema_serializer
from rest_framework import serializers

from ...models.centres import Centre
from ...models.formations import Formation
from ...models.rapports import Rapport
from ...models.statut import Statut
from ...models.types_offre import TypeOffre


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            name="Exemple de rapport",
            value={
                "id": 1,
                "nom": "Rapport test",
                "type_rapport": "occupation",
                "type_rapport_display": "Rapport d'occupation des formations",
                "periode": "mensuel",
                "periode_display": "Mensuel",
                "date_debut": "2024-05-01",
                "date_fin": "2024-05-31",
                "format": "pdf",
                "format_display": "PDF",
                "centre_id": 2,
                "centre_nom": "Centre Test",
                "donnees": {},
                "temps_generation": 3.21,
                "created_at": "2024-05-17T13:00:00Z",
                "created_by": 5,
                "is_active": True,
            },
            response_only=True,
        )
    ]
)
class RapportSerializer(serializers.ModelSerializer):
    """
    Sérialiseur principal du modèle `Rapport`.

    Etat actuel du code :
    - sérialise les champs du modèle et plusieurs champs dérivés en lecture
    - délègue la validation métier à `Rapport.clean()`
    - conserve encore une logique legacy dans `to_representation()` qui
      encapsule la sortie dans `{success, message, data}`

    Cette enveloppe HTTP dans le serializer ne correspond plus à la cible
    architecturale du projet, mais elle reste la source de vérité tant que le
    code n'est pas refactoré.
    """

    type_rapport_display = serializers.CharField(source="get_type_rapport_display", read_only=True)
    periode_display = serializers.CharField(source="get_periode_display", read_only=True)
    format_display = serializers.CharField(source="get_format_display", read_only=True)

    centre_nom = serializers.CharField(source="centre.nom", read_only=True)
    type_offre_nom = serializers.CharField(source="type_offre.nom", read_only=True)
    statut_nom = serializers.CharField(source="statut.nom", read_only=True)
    formation_nom = serializers.CharField(source="formation.nom", read_only=True)

    class Meta:
        model = Rapport
        fields = [
            "id",
            "nom",
            "type_rapport",
            "type_rapport_display",
            "periode",
            "periode_display",
            "date_debut",
            "date_fin",
            "format",
            "format_display",
            "centre",
            "centre_nom",
            "type_offre",
            "type_offre_nom",
            "statut",
            "statut_nom",
            "formation",
            "formation_nom",
            "donnees",
            "temps_generation",
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
            "is_active",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "is_active",
            "type_rapport_display",
            "periode_display",
            "format_display",
            "centre_nom",
            "type_offre_nom",
            "statut_nom",
            "formation_nom",
        ]
        extra_kwargs = {
            "nom": {"help_text": "Titre descriptif du rapport"},
            "type_rapport": {"help_text": "Catégorie du rapport (occupation, centre, etc.)"},
            "periode": {"help_text": "Périodicité du rapport"},
            "date_debut": {"help_text": "Date de début de la période analysée"},
            "date_fin": {"help_text": "Date de fin de la période analysée"},
            "format": {"help_text": "Format de sortie du rapport"},
            "centre": {"help_text": "Centre à filtrer (facultatif)"},
            "type_offre": {"help_text": "Type d'offre à filtrer (facultatif)"},
            "statut": {"help_text": "Statut à filtrer (facultatif)"},
            "formation": {"help_text": "Formation spécifique à filtrer (facultatif)"},
            "donnees": {"help_text": "Contenu JSON du rapport"},
            "temps_generation": {"help_text": "Temps mis pour générer le rapport, en secondes"},
        }

    def to_representation(self, instance):
        """
        Retourne encore une enveloppe HTTP legacy autour de
        `instance.to_serializable_dict()`.

        Ce comportement est conservé pour compatibilité avec le code actuel,
        mais devrait à terme être déplacé vers les viewsets.
        """
        return {"success": True, "message": "Rapport récupéré avec succès.", "data": instance.to_serializable_dict()}

    def validate(self, attrs):
        """
        Instancie un `Rapport` temporaire et appelle `clean()` afin
        d'appliquer la validation métier centralisée au niveau modèle.
        """
        instance = Rapport(**attrs)
        instance.clean()
        return attrs


from rest_framework import serializers

from ...models.rapports import Rapport


class RapportChoiceSerializer(serializers.Serializer):
    """
    Représente une option simple `(value, label)` pour les listes de choix
    associées aux rapports.
    """

    value = serializers.CharField(help_text="Valeur interne (ex: 'occupation')")
    label = serializers.CharField(help_text="Libellé lisible (ex: 'Rapport d'occupation des formations')")


class RapportChoiceGroupSerializer(serializers.Serializer):
    """
    Regroupe les listes de choix exposées au client pour `type_rapport`,
    `periode` et `format`.
    """

    type_rapport = RapportChoiceSerializer(many=True)
    periode = RapportChoiceSerializer(many=True)
    format = RapportChoiceSerializer(many=True)
    parcours_phase = RapportChoiceSerializer(many=True)
    reporting_contract = serializers.DictField()
