"""Sérialiseurs principaux des formations."""

import logging

from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import (
    OpenApiExample,
    extend_schema_field,
    extend_schema_serializer,
)
from rest_framework import serializers

from ...models.centres import Centre
from ...models.commentaires import Commentaire
from ...models.documents import Document
from ...models.evenements import Evenement
from ...models.formations import Formation
from ...models.statut import Statut
from ...models.types_offre import TypeOffre
from ..serializers.centres_serializers import CentreSerializer
from ..serializers.commentaires_serializers import CommentaireSerializer
from ..serializers.documents_serializers import DocumentSerializer
from ..serializers.evenements_serializers import EvenementSerializer
from ..serializers.partenaires_serializers import PartenaireSerializer
from ..serializers.prospection_serializers import ProspectionSerializer
from ..serializers.types_offre_serializers import TypeOffreSerializer

logger = logging.getLogger("application.api.formation")


def _resolved_inscrits_crif(obj) -> int:
    """Retourne `inscrits_crif` depuis la saisie DB (champ stocké)."""
    return int(getattr(obj, "inscrits_crif", 0) or 0)


def _resolved_inscrits_mp(obj) -> int:
    """Retourne `inscrits_mp` depuis la saisie DB (champ stocké)."""
    return int(getattr(obj, "inscrits_mp", 0) or 0)


def _resolved_total_inscrits(obj) -> int:
    """Retourne le total saisi `inscrits_crif + inscrits_mp`."""
    return _resolved_inscrits_crif(obj) + _resolved_inscrits_mp(obj)


def _resolved_nombre_candidats(obj) -> int:
    """Retourne le nombre de candidats depuis le champ stocké Formation.nombre_candidats."""
    return int(getattr(obj, "nombre_candidats", 0) or 0)


def _resolved_total_places(obj) -> int:
    """Retourne le total théorique de places de la formation."""
    annotated = getattr(obj, "total_places_calc", None)
    if annotated is not None:
        return int(annotated or 0)
    return int((getattr(obj, "prevus_crif", 0) or 0) + (getattr(obj, "prevus_mp", 0) or 0))


def _resolved_places_restantes_crif(obj) -> int:
    """Retourne le nombre de places restantes côté CRIF."""
    return max((getattr(obj, "prevus_crif", 0) or 0) - _resolved_inscrits_crif(obj), 0)


def _resolved_places_restantes_mp(obj) -> int:
    """Retourne le nombre de places restantes côté marché public."""
    return max((getattr(obj, "prevus_mp", 0) or 0) - _resolved_inscrits_mp(obj), 0)


def _resolved_places_disponibles(obj) -> int:
    """Retourne le total de places encore disponibles."""
    return max(_resolved_total_places(obj) - _resolved_total_inscrits(obj), 0)


def _resolved_taux_saturation(obj) -> float:
    """Calcule le taux de saturation sur les inscrits saisis / total places."""
    total_places = _resolved_total_places(obj)
    if total_places <= 0:
        return 0.0
    return round((100.0 * _resolved_total_inscrits(obj)) / total_places, 2)


def _resolved_saturation(obj) -> float:
    """Alias historique du taux de saturation (basé saisie)."""
    annotated = getattr(obj, "saturation_calc", None)
    if annotated is not None:
        return round(float(annotated or 0.0), 2)
    return _resolved_taux_saturation(obj)


def _gespers_inscrits_crif(obj) -> int:
    """Contrôle GESPERS : inscrits GESPERS côté CRIF (annotation viewset)."""
    return int(getattr(obj, "inscrits_crif_gespers", 0) or 0)


def _gespers_inscrits_mp(obj) -> int:
    """Contrôle GESPERS : inscrits GESPERS côté MP (annotation viewset)."""
    return int(getattr(obj, "inscrits_mp_gespers", 0) or 0)


def _gespers_total_inscrits(obj) -> int:
    """Contrôle GESPERS : total inscrits GESPERS."""
    return _gespers_inscrits_crif(obj) + _gespers_inscrits_mp(obj)


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
                    "couleur": "#3399ff",
                },
                "statut": {"id": 3, "nom": "en_cours", "libelle": "En cours", "couleur": "#ffc107"},
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
                "candidats_list_url": "/api/candidats/?formation=42",
                "nombre_entretiens": 12,
                "entree_formation": 2,
                "presents_en_formation": 1,
            },
            response_only=True,
        )
    ]
)
class FormationListSerializer(serializers.Serializer):
    """
    Structure de sortie pour la liste des formations avec :
    - les compteurs saisis CRIF / MP ;
    - les agrégats calculés utiles à l'affichage ;
    - un taux de saturation basé sur les inscrits recalculés ;
    - un taux de transformation basé sur les candidats liés à la formation.
    """

    id = serializers.IntegerField()
    est_archivee = serializers.BooleanField(read_only=True)
    activite = serializers.CharField(read_only=True)

    nom = serializers.CharField()
    num_kairos = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    num_offre = serializers.CharField()
    num_produit = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    saturation = serializers.SerializerMethodField()

    saturation_badge = serializers.SerializerMethodField()
    centre = serializers.SerializerMethodField()
    statut = serializers.SerializerMethodField()
    type_offre = serializers.SerializerMethodField()

    inscrits_crif = serializers.SerializerMethodField()
    inscrits_mp = serializers.SerializerMethodField()
    prevus_crif = serializers.IntegerField()
    prevus_mp = serializers.IntegerField()
    cap = serializers.IntegerField(allow_null=True)
    assistante = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    nombre_candidats = serializers.IntegerField()
    candidats_list_url = serializers.SerializerMethodField()
    nombre_entretiens = serializers.IntegerField()
    entree_formation = serializers.IntegerField(required=False, default=0)
    presents_en_formation = serializers.IntegerField(required=False, default=0)
    nombre_evenements = serializers.IntegerField(required=False, allow_null=True)
    nombre_prospections = serializers.IntegerField(required=False, read_only=True)
    nombre_appairages = serializers.IntegerField(required=False, read_only=True)
    intitule_diplome = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    diplome_vise_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    type_qualification_visee = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    specialite_formation = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    code_diplome = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    code_rncp = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    total_heures = serializers.IntegerField(required=False, allow_null=True)
    heures_enseignements_generaux = serializers.IntegerField(required=False, allow_null=True)
    heures_distanciel = serializers.IntegerField(required=False, allow_null=True)

    inscrits_total = serializers.SerializerMethodField()
    prevus_total = serializers.SerializerMethodField()
    total_places = serializers.IntegerField(required=False, allow_null=True)
    total_inscrits = serializers.SerializerMethodField()
    places_restantes = serializers.SerializerMethodField()
    places_disponibles = serializers.SerializerMethodField()
    places_restantes_crif = serializers.SerializerMethodField()
    places_restantes_mp = serializers.SerializerMethodField()
    taux_transformation = serializers.SerializerMethodField()
    transformation_badge = serializers.SerializerMethodField()
    inscrits_crif_gespers = serializers.SerializerMethodField()
    inscrits_mp_gespers = serializers.SerializerMethodField()
    total_inscrits_gespers = serializers.SerializerMethodField()
    nombre_candidats_calc = serializers.SerializerMethodField()
    taux_saturation_gespers = serializers.SerializerMethodField()
    ecart_inscrits = serializers.SerializerMethodField()

    @extend_schema_field(int)
    def get_inscrits_crif(self, obj):
        return _resolved_inscrits_crif(obj)

    @extend_schema_field(int)
    def get_inscrits_mp(self, obj):
        return _resolved_inscrits_mp(obj)

    @extend_schema_field(int)
    def get_inscrits_total(self, obj):
        return _resolved_total_inscrits(obj)

    @extend_schema_field(int)
    def get_prevus_total(self, obj):
        return (obj.prevus_crif or 0) + (obj.prevus_mp or 0)

    @extend_schema_field(int)
    def get_total_inscrits(self, obj):
        return _resolved_total_inscrits(obj)

    @extend_schema_field(int)
    def get_places_disponibles(self, obj):
        return _resolved_places_disponibles(obj)

    @extend_schema_field(int)
    def get_places_restantes(self, obj):
        return _resolved_places_disponibles(obj)

    @extend_schema_field(int)
    def get_places_restantes_crif(self, obj):
        return _resolved_places_restantes_crif(obj)

    @extend_schema_field(int)
    def get_places_restantes_mp(self, obj):
        return _resolved_places_restantes_mp(obj)

    @extend_schema_field(float)
    def get_saturation(self, obj):
        return _resolved_saturation(obj)

    @extend_schema_field(float)
    def get_taux_transformation(self, obj):
        nombre_candidats = _resolved_nombre_candidats(obj)
        if nombre_candidats:
            total_inscrits = _resolved_total_inscrits(obj)
            return round((total_inscrits / nombre_candidats) * 100)
        return None

    @extend_schema_field(str)
    def get_transformation_badge(self, obj):
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
        taux = _resolved_saturation(obj)
        if taux is None:
            return "default"
        if taux >= 70:
            return "badge-success"
        if taux >= 40:
            return "badge-warning"
        return "badge-danger"

    @extend_schema_field(int)
    def get_inscrits_crif_gespers(self, obj):
        return _gespers_inscrits_crif(obj)

    @extend_schema_field(int)
    def get_inscrits_mp_gespers(self, obj):
        return _gespers_inscrits_mp(obj)

    @extend_schema_field(int)
    def get_total_inscrits_gespers(self, obj):
        return _gespers_total_inscrits(obj)

    @extend_schema_field(int)
    def get_nombre_candidats_calc(self, obj):
        return int(getattr(obj, "nombre_candidats_calc", 0) or 0)

    @extend_schema_field(float)
    def get_taux_saturation_gespers(self, obj):
        return round(float(getattr(obj, "taux_saturation_gespers", 0) or 0.0), 2)

    @extend_schema_field(int)
    def get_ecart_inscrits(self, obj):
        return _resolved_total_inscrits(obj) - _gespers_total_inscrits(obj)

    @extend_schema_field(dict)
    def get_centre(self, obj):
        return {"id": obj.centre.id, "nom": obj.centre.nom} if obj.centre else None

    @extend_schema_field(str)
    def get_candidats_list_url(self, obj):
        path = f"{reverse('candidat-list')}?formation={obj.id}"
        request = self.context.get("request")
        return request.build_absolute_uri(path) if request else path

    @extend_schema_field(dict)
    def get_statut(self, obj):
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
                        "couleur": "#3399ff",
                    },
                    "statut": {"id": 3, "nom": "en_cours", "libelle": "En cours", "couleur": "#ffc107"},
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
                    "candidats_list_url": "/api/candidats/?formation=42",
                    "nombre_entretiens": 12,
                    "dernier_commentaire": "Tout se passe bien.",
                    "created_at": "2025-06-20T10:15:00Z",
                    "updated_at": "2025-06-25T14:00:00Z",
                },
            },
            response_only=True,
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
    validate : start_date doit être antérieure à end_date.
    """

    id = serializers.IntegerField(read_only=True)
    est_archivee = serializers.BooleanField(read_only=True)
    activite = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    is_future = serializers.BooleanField(read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    is_a_recruter = serializers.BooleanField(read_only=True)
    status_temporel = serializers.CharField(read_only=True)
    statut_color = serializers.CharField(read_only=True, allow_null=True)

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
    inscrits_crif = serializers.SerializerMethodField()
    inscrits_mp = serializers.SerializerMethodField()
    assistante = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    cap = serializers.IntegerField(required=False, allow_null=True)
    convocation_envoie = serializers.BooleanField(default=False)
    entree_formation = serializers.IntegerField(required=False, default=0)
    presents_en_formation = serializers.IntegerField(required=False, default=0)
    nombre_candidats = serializers.IntegerField(required=False, default=0)
    candidats_list_url = serializers.SerializerMethodField()
    nombre_entretiens = serializers.IntegerField(required=False, default=0)
    nombre_evenements = serializers.IntegerField(required=False, default=0)
    dernier_commentaire = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    centre = serializers.SerializerMethodField(read_only=True)
    statut = serializers.SerializerMethodField(read_only=True)
    type_offre = serializers.SerializerMethodField(read_only=True)

    saturation = serializers.SerializerMethodField()
    saturation_badge = serializers.SerializerMethodField()
    inscrits_total = serializers.SerializerMethodField()
    prevus_total = serializers.SerializerMethodField()
    total_places = serializers.IntegerField(read_only=True)
    total_inscrits = serializers.SerializerMethodField()
    places_restantes = serializers.SerializerMethodField()
    places_disponibles = serializers.SerializerMethodField()
    places_restantes_crif = serializers.SerializerMethodField()
    places_restantes_mp = serializers.SerializerMethodField()
    taux_saturation = serializers.SerializerMethodField()
    taux_transformation = serializers.SerializerMethodField()
    transformation_badge = serializers.SerializerMethodField()
    inscrits_crif_gespers = serializers.SerializerMethodField()
    inscrits_mp_gespers = serializers.SerializerMethodField()
    total_inscrits_gespers = serializers.SerializerMethodField()
    nombre_candidats_calc = serializers.SerializerMethodField()
    taux_saturation_gespers = serializers.SerializerMethodField()
    ecart_inscrits = serializers.SerializerMethodField()

    intitule_diplome = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    diplome_vise_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    type_qualification_visee = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    specialite_formation = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    code_diplome = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    code_rncp = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    total_heures = serializers.IntegerField(required=False, allow_null=True)
    heures_enseignements_generaux = serializers.IntegerField(required=False, allow_null=True)
    heures_distanciel = serializers.IntegerField(required=False, allow_null=True)

    commentaires = CommentaireSerializer(many=True, read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    evenements = EvenementSerializer(many=True, read_only=True)
    partenaires = PartenaireSerializer(many=True, read_only=True)
    prospections = ProspectionSerializer(many=True, read_only=True)

    @extend_schema_field(int)
    def get_inscrits_crif(self, obj):
        return _resolved_inscrits_crif(obj)

    @extend_schema_field(int)
    def get_inscrits_mp(self, obj):
        return _resolved_inscrits_mp(obj)

    @extend_schema_field(int)
    def get_inscrits_total(self, obj):
        return _resolved_total_inscrits(obj)

    @extend_schema_field(int)
    def get_prevus_total(self, obj):
        return (obj.prevus_crif or 0) + (obj.prevus_mp or 0)

    @extend_schema_field(int)
    def get_total_inscrits(self, obj):
        return _resolved_total_inscrits(obj)

    @extend_schema_field(int)
    def get_places_disponibles(self, obj):
        return _resolved_places_disponibles(obj)

    @extend_schema_field(int)
    def get_places_restantes(self, obj):
        return _resolved_places_disponibles(obj)

    @extend_schema_field(int)
    def get_places_restantes_crif(self, obj):
        return _resolved_places_restantes_crif(obj)

    @extend_schema_field(int)
    def get_places_restantes_mp(self, obj):
        return _resolved_places_restantes_mp(obj)

    @extend_schema_field(float)
    def get_saturation(self, obj):
        return _resolved_saturation(obj)

    @extend_schema_field(float)
    def get_taux_saturation(self, obj):
        return _resolved_taux_saturation(obj)

    @extend_schema_field(float)
    def get_taux_transformation(self, obj):
        nombre_candidats = _resolved_nombre_candidats(obj)
        if nombre_candidats:
            total_inscrits = _resolved_total_inscrits(obj)
            return round((total_inscrits / nombre_candidats) * 100)
        return None

    @extend_schema_field(str)
    def get_transformation_badge(self, obj):
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
        taux = _resolved_saturation(obj)
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

    @extend_schema_field(int)
    def get_inscrits_crif_gespers(self, obj):
        return _gespers_inscrits_crif(obj)

    @extend_schema_field(int)
    def get_inscrits_mp_gespers(self, obj):
        return _gespers_inscrits_mp(obj)

    @extend_schema_field(int)
    def get_total_inscrits_gespers(self, obj):
        return _gespers_total_inscrits(obj)

    @extend_schema_field(int)
    def get_nombre_candidats_calc(self, obj):
        return int(getattr(obj, "nombre_candidats_calc", 0) or 0)

    @extend_schema_field(float)
    def get_taux_saturation_gespers(self, obj):
        return round(float(getattr(obj, "taux_saturation_gespers", 0) or 0.0), 2)

    @extend_schema_field(int)
    def get_ecart_inscrits(self, obj):
        return _resolved_total_inscrits(obj) - _gespers_total_inscrits(obj)

    @extend_schema_field(dict)
    def get_centre(self, obj):
        return {"id": obj.centre.id, "nom": obj.centre.nom} if obj.centre else None

    @extend_schema_field(str)
    def get_candidats_list_url(self, obj):
        path = f"{reverse('candidat-list')}?formation={obj.id}"
        request = self.context.get("request")
        return request.build_absolute_uri(path) if request else path

    @extend_schema_field(dict)
    def get_statut(self, obj):
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


class BaseFormationWriteSerializer(serializers.ModelSerializer):
    """
    Base commune d'écriture pour les formations.

    Le détail en lecture reste porté par `FormationDetailSerializer` tandis que
    les opérations create/update passent par ce contrat dédié pour éviter de
    mélanger champs read-only enrichis et payloads write.

    ``nombre_candidats`` est maintenu automatiquement par le signal
    ``formation_candidats_signals`` et ne doit jamais être écrit
    directement par l'API ou les imports.
    """

    centre_id = serializers.PrimaryKeyRelatedField(
        source="centre", queryset=Centre.objects.all(), write_only=True, required=True
    )
    type_offre_id = serializers.PrimaryKeyRelatedField(
        source="type_offre", queryset=TypeOffre.objects.all(), write_only=True, required=True
    )
    statut_id = serializers.PrimaryKeyRelatedField(
        source="statut", queryset=Statut.objects.all(), write_only=True, required=True
    )

    class Meta:
        model = Formation
        fields = [
            "id",
            "nom",
            "num_kairos",
            "num_offre",
            "num_produit",
            "start_date",
            "end_date",
            "centre_id",
            "type_offre_id",
            "statut_id",
            "intitule_diplome",
            "diplome_vise_code",
            "type_qualification_visee",
            "specialite_formation",
            "code_diplome",
            "code_rncp",
            "total_heures",
            "heures_enseignements_generaux",
            "heures_distanciel",
            "prevus_crif",
            "prevus_mp",
            "inscrits_crif",
            "inscrits_mp",
            "cap",
            "assistante",
            "entree_formation",
            "presents_en_formation",
            "nombre_candidats",
            "nombre_entretiens",
            "convocation_envoie",
        ]
        read_only_fields = ["nombre_candidats"]

    def validate(self, data):
        start = data.get("start_date")
        end = data.get("end_date")
        if start and end and start > end:
            raise serializers.ValidationError(
                {
                    "start_date": "La date de début doit être antérieure à la date de fin.",
                    "end_date": "La date de fin doit être postérieure à la date de début.",
                }
            )
        return data

    def _actor(self):
        request = self.context.get("request")
        return getattr(request, "user", None)

    def create(self, validated_data):
        user = self._actor()
        instance = Formation(**validated_data)
        instance.save(user=user)
        return instance

    def update(self, instance, validated_data):
        user = self._actor()
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save(user=user)
        return instance


class FormationCreateSerializer(BaseFormationWriteSerializer):
    """Contrat d'écriture utilisé pour la création d'une formation."""

    pass


class FormationUpdateSerializer(BaseFormationWriteSerializer):
    """Contrat d'écriture utilisé pour la mise à jour partielle ou complète d'une formation."""

    centre_id = serializers.PrimaryKeyRelatedField(
        source="centre", queryset=Centre.objects.all(), write_only=True, required=False
    )
    type_offre_id = serializers.PrimaryKeyRelatedField(
        source="type_offre", queryset=TypeOffre.objects.all(), write_only=True, required=False
    )
    statut_id = serializers.PrimaryKeyRelatedField(
        source="statut", queryset=Statut.objects.all(), write_only=True, required=False
    )

    class Meta(BaseFormationWriteSerializer.Meta):
        pass
