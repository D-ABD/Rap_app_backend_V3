# rap_app/api/serializers/centre_serializers.py

from rest_framework import serializers
from ...models.centres import Centre


class CentreSerializer(serializers.ModelSerializer):
    """
    Expose les champs du modèle Centre et le champ calculé full_address (lecture seule).
    Les contraintes et validations sont celles du modèle.
    """

    full_address = serializers.CharField(
        read_only=True,
        help_text="Adresse complète du centre."
    )

    class Meta:
        model = Centre
        fields = [
            "id",
            "created_at",
            "updated_at",
            "is_active",

            "nom",
            "numero_voie",
            "nom_voie",
            "complement_adresse",
            "code_postal",
            "commune",
            "numero_uai_centre",
            "siret_centre",

            "cfa_entreprise",

            "cfa_responsable_est_lieu_principal",
            "cfa_responsable_denomination",
            "cfa_responsable_uai",
            "cfa_responsable_siret",
            "cfa_responsable_numero",
            "cfa_responsable_voie",
            "cfa_responsable_complement",
            "cfa_responsable_code_postal",
            "cfa_responsable_commune",

            "full_address",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "full_address",
        ]


class CentreConstantsSerializer(serializers.Serializer):
    """
    Expose les constantes du modèle Centre (nom_max_length, code_postal_length) pour la validation côté client.
    Tous les champs sont en lecture seule.
    """
    nom_max_length = serializers.IntegerField(default=Centre.NOM_MAX_LENGTH)
    code_postal_length = serializers.IntegerField(default=Centre.CODE_POSTAL_LENGTH)
