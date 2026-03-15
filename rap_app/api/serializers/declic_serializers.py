# rap_app/api/serializers/declic_serializers.py
from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers

from ...models.centres import Centre
from ...models.declic import Declic


@extend_schema_serializer(
    examples=[
        {
            "id": 1,
            "nom": "Centre de Lille",
            "departement": "59",
            "code_postal": "59000",
        }
    ]
)
class CentreLightSerializer(serializers.ModelSerializer):
    """
    Représentation minimale d'un centre (id, nom, departement, code_postal) pour les Déclics.
    Lecture seule.
    """

    class Meta:
        model = Centre
        fields = ["id", "nom", "departement", "code_postal"]


class DeclicSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour le modèle Declic (ateliers) : champs du modèle, centre (nested) / centre_id (write_only), champs calculés (taux_presence_atelier, objectif_annuel, taux_atteinte_annuel, reste_a_faire, date_display).
    create/update : passent request.user à save(user=user).
    """

    centre = CentreLightSerializer(read_only=True)
    centre_id = serializers.PrimaryKeyRelatedField(
        queryset=Centre.objects.all(),
        source="centre",
        write_only=True,
    )
    centre_nom = serializers.CharField(source="centre.nom", read_only=True)

    taux_presence_atelier = serializers.SerializerMethodField()
    objectif_annuel = serializers.SerializerMethodField()
    taux_atteinte_annuel = serializers.SerializerMethodField()
    reste_a_faire = serializers.SerializerMethodField()

    type_declic_display = serializers.CharField(source="get_type_declic_display", read_only=True)

    date_display = serializers.SerializerMethodField()

    class Meta:
        model = Declic
        fields = [
            "id",
            "type_declic",
            "type_declic_display",
            "date_declic",
            "date_display",
            "centre",
            "centre_id",
            "centre_nom",
            "nb_inscrits_declic",
            "nb_presents_declic",
            "nb_absents_declic",
            "taux_presence_atelier",
            "objectif_annuel",
            "taux_atteinte_annuel",
            "reste_a_faire",
            "commentaire",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_date_display(self, obj):
        """Retourne date_declic au format dd/mm/YYYY."""
        return obj.date_declic.strftime("%d/%m/%Y")

    def get_taux_presence_atelier(self, obj):
        """Taux de présence en % (nb_presents / (nb_presents + nb_absents) * 100), une décimale ; 0 si total nul."""
        total = obj.nb_presents_declic + obj.nb_absents_declic
        return round(obj.nb_presents_declic / total * 100, 1) if total else 0

    def get_objectif_annuel(self, obj):
        """Retourne la propriété objectif_annuel du modèle."""
        return obj.objectif_annuel

    def get_taux_atteinte_annuel(self, obj):
        """Retourne la propriété taux_atteinte_annuel du modèle."""
        return obj.taux_atteinte_annuel

    def get_reste_a_faire(self, obj):
        """Retourne la propriété reste_a_faire du modèle."""
        return obj.reste_a_faire

    def create(self, validated_data):
        """Crée une instance Declic et appelle save(user=request.user)."""
        user = self.context.get("request").user
        instance = Declic(**validated_data)
        instance.save(user=user)
        return instance

    def update(self, instance, validated_data):
        """Met à jour l'instance et appelle save(user=request.user)."""
        user = self.context.get("request").user
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save(user=user)
        return instance
