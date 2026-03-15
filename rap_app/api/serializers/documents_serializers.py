from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import (
    OpenApiExample,
    extend_schema_field,
    extend_schema_serializer,
)
from rest_framework import serializers

from ...models.documents import Document, validate_file_extension
from ...models.formations import Formation


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            name="Exemple de document PDF",
            value={
                "id": 42,
                "nom_fichier": "programme.pdf",
                "type_document": "pdf",
                "type_document_display": "PDF",
                "taille_fichier": 512,
                "taille_readable": "512 Ko",
                "mime_type": "application/pdf",
                "extension": "pdf",
                "icon_class": "fa-file-pdf",
                "download_url": "/media/formations/documents/pdf/12/programme.pdf",
                "formation": 12,
                "created_at": "2025-05-11T10:00:00",
                "created_by": "admin",
            },
            response_only=True,
        )
    ]
)
class DocumentSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour les documents liés à une formation. Champs du modèle + champs enrichis (formation_nom, formation_num_offre, formation_start_date, formation_end_date, formation_centre_nom, formation_type_offre_libelle, formation_statut).
    validate : appelle validate_file_extension(fichier, type_document) si les deux sont présents ; en cas d'erreur, renvoie ValidationError sur 'fichier'. update : remplace le fichier si un nouveau est fourni.
    """

    type_document_display = serializers.CharField(source="get_type_document_display", read_only=True)
    taille_readable = serializers.CharField(read_only=True)
    extension = serializers.CharField(read_only=True)
    icon_class = serializers.CharField(read_only=True)
    download_url = serializers.CharField(read_only=True)
    created_by = serializers.CharField(source="created_by.username", read_only=True)
    is_viewable_in_browser = serializers.BooleanField(read_only=True)

    formation_nom = serializers.CharField(source="formation.nom", read_only=True)
    formation_num_offre = serializers.CharField(source="formation.num_offre", read_only=True)
    formation_start_date = serializers.DateField(source="formation.start_date", read_only=True)
    formation_end_date = serializers.DateField(source="formation.end_date", read_only=True)
    formation_centre_nom = serializers.CharField(source="formation.centre.nom", read_only=True)
    formation_type_offre_libelle = serializers.SerializerMethodField()
    formation_statut = serializers.SerializerMethodField()

    @extend_schema_field(str)
    def get_formation_type_offre_libelle(self, obj):
        """Retourne str(obj.formation.type_offre) ou None si absent."""
        if obj.formation and obj.formation.type_offre:
            return str(obj.formation.type_offre)
        return None

    @extend_schema_field(str)
    def get_formation_statut(self, obj):
        """Retourne un dict {id, nom, libelle, couleur} du statut de la formation, ou None."""
        statut = getattr(obj.formation, "statut", None)
        if statut:
            return {"id": statut.id, "nom": statut.nom, "libelle": statut.get_nom_display(), "couleur": statut.couleur}
        return None

    class Meta:
        model = Document
        fields = [
            "id",
            "nom_fichier",
            "fichier",
            "type_document",
            "type_document_display",
            "taille_fichier",
            "taille_readable",
            "mime_type",
            "extension",
            "icon_class",
            "download_url",
            "formation",
            "created_at",
            "created_by",
            "updated_at",
            "is_viewable_in_browser",
            "formation_nom",
            "formation_num_offre",
            "formation_start_date",
            "formation_end_date",
            "formation_centre_nom",
            "formation_type_offre_libelle",
            "formation_statut",
        ]
        read_only_fields = [
            "id",
            "type_document_display",
            "taille_readable",
            "extension",
            "icon_class",
            "download_url",
            "mime_type",
            "taille_fichier",
            "created_at",
            "created_by",
            "is_viewable_in_browser",
            "formation_nom",
            "formation_num_offre",
            "formation_start_date",
            "formation_end_date",
            "formation_centre_nom",
            "formation_type_offre_libelle",
            "formation_statut",
        ]

    def validate(self, data):
        """Vérifie la cohérence extension/type via validate_file_extension(fichier, type_document) ; lève ValidationError sur 'fichier' en cas d'échec."""
        fichier = data.get("fichier")
        type_doc = data.get("type_document")

        if fichier and type_doc:
            try:
                validate_file_extension(fichier, type_doc)
            except ValidationError as e:
                raise serializers.ValidationError({"fichier": str(e)})
        return data

    def update(self, instance, validated_data):
        """Si un nouveau fichier est fourni, l'assigne à instance.fichier avant l'appel à super().update."""
        fichier = validated_data.pop("fichier", None)
        if fichier:
            instance.fichier = fichier
        return super().update(instance, validated_data)


class TypeDocumentChoiceSerializer(serializers.Serializer):
    """
    Expose value et label pour les types de documents (choix API). Pas de validation personnalisée.
    """

    value = serializers.CharField(help_text="Valeur interne du type (ex: 'pdf')")
    label = serializers.CharField(help_text="Libellé lisible du type (ex: 'PDF')")
