import logging
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_serializer, OpenApiExample, extend_schema_field
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError

from ..serializers.centres_serializers import CentreSerializer

from ...models.centres import Centre
from ...models.statut import Statut
from ...models.types_offre import TypeOffre

from ..serializers.commentaires_serializers import CommentaireSerializer
from ..serializers.documents_serializers import DocumentSerializer
from ..serializers.evenements_serializers import EvenementSerializer
from ..serializers.partenaires_serializers import PartenaireSerializer
from ..serializers.prospection_serializers import ProspectionSerializer

from ..serializers.types_offre_serializers import TypeOffreSerializer

from ...models.formations import Formation
from ...models.commentaires import Commentaire
from ...models.documents import Document
from ...models.evenements import Evenement

logger = logging.getLogger("application.api.formation")

@extend_schema_serializer(
    examples=[
        OpenApiExample(
            name="Exemple de formation (liste)",
            value={
                "id": 42,
                "nom": "Formation CléA Numérique",
                "num_offre": "OFF-2025-123",
                "start_date": "2025-07-01",
                "end_date": "2025-09-15",
                "centre": {"id": 1, "nom": "Paris Est"},
                "type_offre": {
                    "id": 2,
                    "nom": "poec",
                    "libelle": "POEC (Préparation opérationnelle)",
                    "couleur": "#3399ff"
                },
                "statut": {
                    "id": 3,
                    "nom": "en_cours",
                    "libelle": "En cours",
                    "couleur": "#ffc107"
                },
                "prevus_crif": 8,
                "prevus_mp": 7,
                "inscrits_crif": 5,
                "inscrits_mp": 4,
                "cap": 15,
                "inscrits_total": 9,
                "prevus_total": 15,
                "places_restantes": 6,
                "saturation": 60.0,
                "saturation_badge": "badge-info",
                "taux_transformation": 45,
                "transformation_badge": "badge-warning",
                "nombre_candidats": 20,
                "nombre_entretiens": 12
            },
            response_only=True
        )
    ]
)

class FormationListSerializer(serializers.Serializer):
    """
    Structure de sortie pour la liste des formations : champs du modèle et champs calculés (inscrits_total, prevus_total, taux_transformation, transformation_badge, saturation_badge, centre, statut, type_offre).
    """

    id = serializers.IntegerField()
    est_archivee = serializers.BooleanField(read_only=True)
    activite = serializers.CharField(read_only=True)

    nom = serializers.CharField()
    num_offre = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    saturation = serializers.FloatField()

    saturation_badge = serializers.SerializerMethodField()
    centre = serializers.SerializerMethodField()
    statut = serializers.SerializerMethodField()
    type_offre = serializers.SerializerMethodField()

    inscrits_crif = serializers.IntegerField()
    inscrits_mp = serializers.IntegerField()
    prevus_crif = serializers.IntegerField()
    prevus_mp = serializers.IntegerField()
    cap = serializers.IntegerField(allow_null=True)
    nombre_candidats = serializers.IntegerField()
    nombre_entretiens = serializers.IntegerField()
    intitule_diplome = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    code_diplome = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    code_rncp = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    total_heures = serializers.IntegerField(required=False, allow_null=True)
    heures_distanciel = serializers.IntegerField(required=False, allow_null=True)

    inscrits_total = serializers.SerializerMethodField()
    prevus_total = serializers.SerializerMethodField()
    places_restantes = serializers.IntegerField(source="places_disponibles", read_only=True)
    taux_transformation = serializers.SerializerMethodField()
    transformation_badge = serializers.SerializerMethodField()

    @extend_schema_field(str)
    def get_inscrits_total(self, obj):
        """Somme inscrits_crif + inscrits_mp."""
        return (obj.inscrits_crif or 0) + (obj.inscrits_mp or 0)

    @extend_schema_field(str)
    def get_prevus_total(self, obj):
        """Somme prevus_crif + prevus_mp."""
        return (obj.prevus_crif or 0) + (obj.prevus_mp or 0)

    @extend_schema_field(str)
    def get_taux_transformation(self, obj):
        """Taux inscrits_total / nombre_candidats en %, ou None si nombre_candidats nul."""
        if obj.nombre_candidats:
            total_inscrits = self.get_inscrits_total(obj)
            return round((total_inscrits / obj.nombre_candidats) * 100)
        return None

    @extend_schema_field(str)
    def get_transformation_badge(self, obj):
        """Classe badge selon taux de transformation (>=70 succès, >=40 warning, sinon danger)."""
        taux = self.get_taux_transformation(obj)
        if taux is None:
            return "default"
        if taux >= 70:
            return "badge-success"
        if taux >= 40:
            return "badge-warning"
        return "badge-danger"

    @extend_schema_field(str)
    def get_saturation_badge(self, obj):
        """Classe badge selon obj.saturation (mêmes seuils que transformation_badge)."""
        taux = obj.saturation
        if taux is None:
            return "default"
        if taux >= 70:
            return "badge-success"
        if taux >= 40:
            return "badge-warning"
        return "badge-danger"

    @extend_schema_field(str)
    def get_centre(self, obj):
        """Dict {id, nom} du centre de la formation."""
        return {"id": obj.centre.id, "nom": obj.centre.nom} if obj.centre else None

    @extend_schema_field(str)
    def get_statut(self, obj):
        """Dict {id, nom, libelle, couleur} du statut de la formation."""
        if obj.statut:
            return {
                "id": obj.statut.id,
                "nom": obj.statut.nom,
                "libelle": obj.statut.get_nom_display(),
                "couleur": obj.statut.couleur,
            }
        return None

    @extend_schema_field(str)
    def get_type_offre(self, obj):
        """Dict {id, nom, libelle, couleur} du type d'offre."""
        if obj.type_offre:
            return {
                "id": obj.type_offre.id,
                "nom": obj.type_offre.nom,
                "libelle": str(obj.type_offre),
                "couleur": obj.type_offre.couleur,
            }
        return None


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            name="Exemple de formation détaillée",
            value={
                "success": True,
                "message": "Formation récupérée avec succès.",
                "data": {
                    "id": 42,
                    "nom": "Formation CléA Numérique",
                    "centre": {"id": 1, "nom": "Paris Est"},
                    "type_offre": {
                        "id": 2,
                        "nom": "poec",
                        "libelle": "POEC (Préparation opérationnelle)",
                        "couleur": "#3399ff"
                    },
                    "statut": {
                        "id": 3,
                        "nom": "en_cours",
                        "libelle": "En cours",
                        "couleur": "#ffc107"
                    },
                    "start_date": "2025-07-01",
                    "end_date": "2025-09-15",
                    "num_kairos": "KA-789456",
                    "num_offre": "OFF-2025-123",
                    "num_produit": "PROD-CLÉA",
                    "prevus_crif": 8,
                    "prevus_mp": 7,
                    "inscrits_crif": 5,
                    "inscrits_mp": 4,
                    "cap": 15,
                    "inscrits_total": 9,
                    "prevus_total": 15,
                    "places_restantes": 6,
                    "saturation": 60.0,
                    "saturation_badge": "badge-info",
                    "taux_transformation": 45,
                    "transformation_badge": "badge-warning",
                    "convocation_envoie": True,
                    "entree_formation": 1,
                    "nombre_candidats": 20,
                    "nombre_entretiens": 12,
                    "dernier_commentaire": "Tout se passe bien.",
                    "created_at": "2025-06-20T10:15:00Z",
                    "updated_at": "2025-06-25T14:00:00Z"
                }
            },
            response_only=True
        )
    ]
)
class FormationLightSerializer(serializers.ModelSerializer):
    """
    Version allégée d'une formation : id, nom, type_offre (TypeOffreSerializer), centre (CentreSerializer), num_offre. Lecture seule.
    """

    type_offre = TypeOffreSerializer(read_only=True)
    centre = CentreSerializer(read_only=True)

    class Meta:
        model = Formation
        fields = ["id", "nom", "type_offre", "centre", "num_offre"]

class FormationDetailSerializer(serializers.Serializer):
    """
    Structure de sortie pour le détail d'une formation : champs, relations (centre, statut, type_offre), champs calculés, listes commentaires, documents, evenements, partenaires, prospections.
    validate : start_date doit être antérieure à end_date. to_representation : enveloppe la sortie dans {success, message, data}.
    """

    id = serializers.IntegerField(read_only=True)
    est_archivee = serializers.BooleanField(read_only=True)
    activite = serializers.CharField(read_only=True)

    nom = serializers.CharField(required=True)
    centre_id = serializers.IntegerField(required=True)
    type_offre_id = serializers.IntegerField(required=True)
    statut_id = serializers.IntegerField(required=True)

    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    num_kairos = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    num_offre = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    num_produit = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    prevus_crif = serializers.IntegerField(required=False, default=0)
    prevus_mp = serializers.IntegerField(required=False, default=0)
    inscrits_crif = serializers.IntegerField(required=False, default=0)
    inscrits_mp = serializers.IntegerField(required=False, default=0)
    assistante = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    cap = serializers.IntegerField(required=False, allow_null=True)
    convocation_envoie = serializers.BooleanField(default=False)
    entree_formation = serializers.IntegerField(required=False, default=0)
    nombre_candidats = serializers.IntegerField(required=False, default=0)
    nombre_entretiens = serializers.IntegerField(required=False, default=0)
    nombre_evenements = serializers.IntegerField(required=False, default=0)
    dernier_commentaire = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    centre = serializers.SerializerMethodField(read_only=True)
    statut = serializers.SerializerMethodField(read_only=True)
    type_offre = serializers.SerializerMethodField(read_only=True)

    saturation = serializers.FloatField(read_only=True)
    saturation_badge = serializers.SerializerMethodField()
    inscrits_total = serializers.SerializerMethodField()
    prevus_total = serializers.SerializerMethodField()
    places_restantes = serializers.IntegerField(source="places_disponibles", read_only=True)
    taux_transformation = serializers.SerializerMethodField()
    transformation_badge = serializers.SerializerMethodField()

    intitule_diplome = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    code_diplome = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    code_rncp = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    total_heures = serializers.IntegerField(required=False, allow_null=True)
    heures_distanciel = serializers.IntegerField(required=False, allow_null=True)

    commentaires = CommentaireSerializer(many=True, read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    evenements = EvenementSerializer(many=True, read_only=True)
    partenaires = PartenaireSerializer(many=True, read_only=True)
    prospections = ProspectionSerializer(many=True, read_only=True)

    @extend_schema_field(float)
    def get_inscrits_total(self, obj):
        """Somme inscrits_crif + inscrits_mp."""
        return (obj.inscrits_crif or 0) + (obj.inscrits_mp or 0)

    @extend_schema_field(float)
    def get_prevus_total(self, obj):
        """Somme prevus_crif + prevus_mp."""
        return (obj.prevus_crif or 0) + (obj.prevus_mp or 0)

    @extend_schema_field(float)
    def get_taux_transformation(self, obj):
        """Taux inscrits_total / nombre_candidats en %, ou None si pas de candidats."""
        if obj.nombre_candidats:
            total_inscrits = self.get_inscrits_total(obj)
            return round((total_inscrits / obj.nombre_candidats) * 100)
        return None

    @extend_schema_field(str)
    def get_transformation_badge(self, obj):
        """Classe badge selon taux de transformation (seuils 100, 70, 50, 20, >0)."""
        taux = self.get_taux_transformation(obj)
        if taux is None:
            return "default"
        if taux >= 100:
            return "badge-dark"
        if taux >= 70:
            return "badge-success"
        if taux >= 50:
            return "badge-info"
        if taux >= 20:
            return "badge-warning"
        if taux > 0:
            return "badge-orange"
        return "badge-danger"

    @extend_schema_field(str)
    def get_saturation_badge(self, obj):
        """Classe badge selon obj.saturation (mêmes seuils que get_transformation_badge)."""
        taux = getattr(obj, "saturation", None)
        if taux is None:
            return "default"
        if taux >= 100:
            return "badge-dark"
        if taux >= 70:
            return "badge-success"
        if taux >= 50:
            return "badge-info"
        if taux >= 20:
            return "badge-warning"
        if taux > 0:
            return "badge-orange"
        return "badge-danger"

    @extend_schema_field(dict)
    def get_centre(self, obj):
        """Dict {id, nom} du centre."""
        return {"id": obj.centre.id, "nom": obj.centre.nom} if obj.centre else None

    @extend_schema_field(dict)
    def get_statut(self, obj):
        """Dict {id, nom, libelle, couleur} du statut."""
        if obj.statut:
            return {
                "id": obj.statut.id,
                "nom": obj.statut.nom,
                "libelle": obj.statut.get_nom_display(),
                "couleur": obj.statut.couleur,
            }
        return None

    @extend_schema_field(dict)
    def get_type_offre(self, obj):
        """Dict {id, nom, libelle, couleur} du type d'offre."""
        if obj.type_offre:
            return {
                "id": obj.type_offre.id,
                "nom": obj.type_offre.nom,
                "libelle": str(obj.type_offre),
                "couleur": obj.type_offre.couleur,
            }
        return None

    def validate(self, data):
        """Validation déléguée au modèle pour cohérence."""
        # La validation start_date < end_date est désormais dans le modèle Formation.clean()
        # Pas de duplication ici
        return data

    def create(self, validated_data):
        user = self.context["request"].user
        centre_id = validated_data.pop("centre_id", None)
        type_offre_id = validated_data.pop("type_offre_id", None)
        statut_id = validated_data.pop("statut_id", None)
        instance = Formation(
            **validated_data,
            centre_id=centre_id,
            type_offre_id=type_offre_id,
            statut_id=statut_id,
        )
        instance.save(user=user)
        return instance

    def update(self, instance, validated_data):
        user = self.context["request"].user
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save(user=user)
        return instance

    def to_representation(self, instance):
        base = super().to_representation(instance)
        return {
            "success": True,
            "message": "Formation récupérée avec succès.",
            "data": base,
        }


class FormationCreateSerializer(serializers.ModelSerializer):
    centre_id = serializers.PrimaryKeyRelatedField(
        source='centre',
        queryset=Centre.objects.all(),
        write_only=True,
        required=True
    )
    type_offre_id = serializers.PrimaryKeyRelatedField(
        source='type_offre',
        queryset=TypeOffre.objects.all(),
        write_only=True,
        required=True
    )
    statut_id = serializers.PrimaryKeyRelatedField(
        source='statut',
        queryset=Statut.objects.all(),
        write_only=True,
        required=True
    )

    class Meta:
        model = Formation
        fields = [
            "id", "nom", "num_offre", "start_date", "end_date",
            "centre_id", "type_offre_id", "statut_id",
            "intitule_diplome", "code_diplome", "code_rncp",
            "total_heures", "heures_distanciel",
            "prevus_crif", "prevus_mp", "inscrits_crif", "inscrits_mp",
            "cap", "nombre_candidats", "nombre_entretiens",
            "convocation_envoie",
        ]

    def validate(self, data):
        start = data.get("start_date")
        end = data.get("end_date")
        if start and end and start > end:
            raise serializers.ValidationError({
                "start_date": "La date de début doit être antérieure à la date de fin.",
                "end_date": "La date de fin doit être postérieure à la date de début.",
            })
        return data

    def create(self, validated_data):
        user = self.context["request"].user
        instance = Formation(**validated_data)
        instance.save(user=user)
        return instance
