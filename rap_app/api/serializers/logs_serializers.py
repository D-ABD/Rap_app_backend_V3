from rest_framework import serializers
from drf_spectacular.utils import extend_schema_serializer, extend_schema_field, OpenApiExample
from django.utils.translation import gettext_lazy as _
from ...models.logs import LogUtilisateur


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            name="Exemple de log",
            value={
                "id": 1,
                "action": "modification",
                "model": "formation",
                "object_id": 42,
                "details": "Mise à jour du nom",
                "user": "admin",
                "date": "2024-01-01 12:00"
            },
            response_only=True,
            description="Exemple d'entrée dans l'historique des actions utilisateur"
        )
    ]
)
class LogUtilisateurSerializer(serializers.ModelSerializer):
    """
    Sérialiseur en lecture seule pour les logs utilisateur. Expose les champs du modèle et les champs calculés (model, user, date) via SerializerMethodField.
    """

    id = serializers.IntegerField(read_only=True)
    action = serializers.CharField(read_only=True, help_text="Type d'action réalisée (création, modification, suppression).")
    model = serializers.SerializerMethodField(help_text="Nom du modèle concerné par l'action.")
    object_id = serializers.IntegerField(read_only=True, help_text="Identifiant de l'objet modifié.")
    details = serializers.CharField(read_only=True, help_text="Détails de l'action enregistrée.")
    user = serializers.SerializerMethodField(help_text="Nom de l'utilisateur ayant effectué l'action.")
    date = serializers.SerializerMethodField(help_text="Date et heure de l'action (format : AAAA-MM-JJ HH:MM).")

    class Meta:
        model = LogUtilisateur
        fields = [
            "id", "action", "model", "object_id", "details", "user", "date"
        ]
        read_only_fields = fields

    @extend_schema_field(str)
    def get_model(self, obj) -> str:
        """Retourne obj.content_type.model ou chaîne vide."""
        return obj.content_type.model if obj.content_type else ""

    @extend_schema_field(str)
    def get_user(self, obj) -> str:
        """Retourne obj.created_by.username ou 'Système'."""
        return obj.created_by.username if obj.created_by else "Système"

    @extend_schema_field(str)
    def get_date(self, obj) -> str:
        """Retourne obj.created_at formaté (YYYY-MM-DD HH:MM) ou chaîne vide."""
        return obj.created_at.strftime("%Y-%m-%d %H:%M") if obj.created_at else ""


from rest_framework import serializers
from ...models.logs import LogUtilisateur

class LogActionChoiceSerializer(serializers.Serializer):
    """
    Expose value et label pour une action de log (option de filtre/affichage). Pas de validation personnalisée.
    """
    value = serializers.CharField(help_text="Nom technique de l'action (ex: 'création')")
    label = serializers.CharField(help_text="Libellé lisible de l'action (ex: 'Création')")

class LogChoicesSerializer(serializers.Serializer):
    """
    Structure de sortie pour les choix de logs : champ actions (liste de LogActionChoiceSerializer).
    """
    actions = serializers.ListField(
        child=LogActionChoiceSerializer(),
        help_text="Liste des actions possibles de log"
    )
