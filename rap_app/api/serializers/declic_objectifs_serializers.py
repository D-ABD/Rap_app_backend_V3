from drf_spectacular.utils import OpenApiExample, extend_schema_serializer
from rest_framework import serializers

from ...models.centres import Centre
from ...models.declic import ObjectifDeclic
from .rich_text_utils import sanitize_rich_text


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "Centre light declic",
            value={"id": 1, "nom": "Centre de Lille", "departement": "59", "code_postal": "59000"},
            response_only=True,
        )
    ]
)
class CentreLightSerializer(serializers.ModelSerializer):
    """
    Représentation minimale d'un centre (id, nom, departement, code_postal) pour imbrication dans les objectifs Déclic.
    Lecture seule.
    """

    class Meta:
        model = Centre
        fields = ["id", "nom", "departement", "code_postal"]


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "Objectif declic",
            value={
                "id": 12,
                "centre": {
                    "id": 3,
                    "nom": "Centre de Roubaix",
                    "departement": "59",
                    "code_postal": "59100",
                },
                "annee": 2025,
                "valeur_objectif": 120,
                "commentaire": "Objectif ambitieux pour l'année 2025",
                "departement": "59",
                "taux_prescription": 80.5,
                "taux_presence": 72.3,
                "taux_adhesion": 65.0,
                "taux_atteinte": 60.4,
                "reste_a_faire": 48,
                "data_declic": {
                    "places": 150,
                    "prescriptions": 120,
                    "presents": 72,
                    "adhesions": 47,
                },
            },
            response_only=True,
        )
    ]
)
class ObjectifDeclicSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour ObjectifDeclic : centre (nested ou centre_id en écriture), annee, valeur_objectif, commentaire, departement (recalculé), et champs calculés (data_declic, taux_*, reste_a_faire).
    validate_valeur_objectif : valeur strictement positive. create/update : recalculent departement à partir du code_postal du centre.
    """

    centre = CentreLightSerializer(read_only=True)
    centre_id = serializers.PrimaryKeyRelatedField(source="centre", queryset=Centre.objects.all(), write_only=True)

    data_declic = serializers.SerializerMethodField()
    taux_prescription = serializers.SerializerMethodField()
    taux_presence = serializers.SerializerMethodField()
    taux_adhesion = serializers.SerializerMethodField()
    taux_atteinte = serializers.SerializerMethodField()
    reste_a_faire = serializers.SerializerMethodField()

    class Meta:
        model = ObjectifDeclic
        fields = [
            "id",
            "centre",
            "centre_id",
            "departement",
            "annee",
            "valeur_objectif",
            "commentaire",
            "data_declic",
            "taux_prescription",
            "taux_presence",
            "taux_adhesion",
            "taux_atteinte",
            "reste_a_faire",
        ]
        read_only_fields = [
            "data_declic",
            "taux_prescription",
            "taux_presence",
            "taux_adhesion",
            "taux_atteinte",
            "reste_a_faire",
        ]

    def validate_valeur_objectif(self, value):
        """Refuse une valeur nulle ou négative."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("La valeur de l'objectif doit être strictement positive.")
        return value

    def get_data_declic(self, obj):
        """Retourne la propriété data_declic du modèle (dict) ou {}."""
        return getattr(obj, "data_declic", {}) or {}

    def get_taux_prescription(self, obj):
        """Retourne la propriété taux_prescription du modèle."""
        return getattr(obj, "taux_prescription", None)

    def get_taux_presence(self, obj):
        """Retourne la propriété taux_presence du modèle."""
        return getattr(obj, "taux_presence", None)

    def get_taux_adhesion(self, obj):
        """Retourne la propriété taux_adhesion du modèle."""
        return getattr(obj, "taux_adhesion", None)

    def get_taux_atteinte(self, obj):
        """Retourne la propriété taux_atteinte du modèle."""
        return getattr(obj, "taux_atteinte", None)

    def get_reste_a_faire(self, obj):
        """Retourne la propriété reste_a_faire du modèle."""
        return getattr(obj, "reste_a_faire", None)

    def validate_commentaire(self, value):
        return sanitize_rich_text(value)

    def create(self, validated_data):
        """Crée l'objectif ; departement est déduit des deux premiers caractères du code_postal du centre. Passe request.user à save(user=user)."""
        user = self.context["request"].user if "request" in self.context else None
        centre = validated_data.get("centre")
        if centre and hasattr(centre, "code_postal"):
            validated_data["departement"] = (centre.code_postal or "")[:2]
        instance = ObjectifDeclic(**validated_data)
        instance.save(user=user)
        return instance

    def update(self, instance, validated_data):
        """Met à jour l'instance ; departement est recalculé à partir du centre. Passe request.user à save(user=user)."""
        user = self.context["request"].user if "request" in self.context else None
        centre = validated_data.get("centre", getattr(instance, "centre", None))
        if centre and hasattr(centre, "code_postal"):
            validated_data["departement"] = (centre.code_postal or "")[:2]
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save(user=user)
        return instance
