"""Sérialiseurs des séances Prépa et de leurs stagiaires."""

from django.db.models import Q
from drf_spectacular.utils import OpenApiExample, extend_schema_field, extend_schema_serializer
from rest_framework import serializers

from ...models.centres import Centre
from ...models.prepa import Prepa, PrepaPresenceStatut, PrepaStagiaireParticipation, StagiairePrepa
from ...services.prepa_parcours import (
    ETAPE_BILAN,
    StatutParcoursCourant,
    build_historique_ateliers,
    coerce_presence_statut_for_write,
    compute_action_suivante_recommandee,
    compute_date_entree_calculee,
    compute_date_fin_calculee,
    compute_derniere_etape,
    compute_derniere_presence_reelle,
    compute_statut_parcours_courant,
    derive_issue_bilan_from_orientation,
    has_at1_present_ever,
)
from .rich_text_utils import sanitize_rich_text


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "Centre light prepa",
            value={"id": 1, "nom": "Centre de Lille", "departement": "59", "code_postal": "59000"},
            response_only=True,
        )
    ]
)
class PrepaCentreLightSerializer(serializers.ModelSerializer):
    """
    Représentation minimale d'un centre pour le module Prépa.
    """

    class Meta:
        model = Centre
        fields = ["id", "nom", "departement", "code_postal"]


class StagiairePrepaNestedSerializer(serializers.ModelSerializer):
    """
    Représentation compacte d'un stagiaire Prépa rattaché à une séance d'origine.
    """

    statut_parcours_display = serializers.CharField(source="get_statut_parcours_display", read_only=True)

    class Meta:
        model = StagiairePrepa
        fields = ["id", "nom", "prenom", "telephone", "email", "statut_parcours", "statut_parcours_display"]
        read_only_fields = ["id"]


class PrepaStagiaireParticipationSerializer(serializers.ModelSerializer):
    """
    Participation nominative d'un stagiaire à une séance Prépa.
    """

    stagiaire_prepa = StagiairePrepaNestedSerializer(read_only=True)
    stagiaire_prepa_id = serializers.PrimaryKeyRelatedField(
        source="stagiaire_prepa",
        queryset=StagiairePrepa.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    nom = serializers.CharField(write_only=True, required=False, allow_blank=True)
    prenom = serializers.CharField(write_only=True, required=False, allow_blank=True)
    telephone = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(write_only=True, required=False, allow_blank=True, allow_null=True)
    statut_parcours = serializers.ChoiceField(
        choices=StagiairePrepa.StatutParcours.choices,
        write_only=True,
        required=False,
        default=StagiairePrepa.StatutParcours.EN_ATTENTE,
    )

    class Meta:
        model = PrepaStagiaireParticipation
        fields = [
            "id",
            "stagiaire_prepa",
            "stagiaire_prepa_id",
            "nom",
            "prenom",
            "telephone",
            "email",
            "statut_parcours",
            "statut",
            "statut_display",
            "commentaire",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "stagiaire_prepa", "statut_display", "created_at", "updated_at"]


class StagiairePrepaSerializer(serializers.ModelSerializer):
    """
    Sérialiseur complet du suivi nominatif des stagiaires Prépa.
    """

    PROCHAIN_ATELIER_PREVU_CHOICES = [*Prepa.TypePrepa.choices, (ETAPE_BILAN, "Bilan")]

    centre = PrepaCentreLightSerializer(read_only=True)
    centre_id = serializers.PrimaryKeyRelatedField(
        queryset=Centre.objects.all(),
        source="centre",
        write_only=True,
        required=False,
        allow_null=True,
    )
    centre_nom = serializers.CharField(source="centre.nom", read_only=True)
    centre_afpa_cible = PrepaCentreLightSerializer(read_only=True)
    centre_afpa_cible_id = serializers.PrimaryKeyRelatedField(
        queryset=Centre.objects.all(),
        source="centre_afpa_cible",
        write_only=True,
        required=False,
        allow_null=True,
    )
    centre_afpa_cible_nom = serializers.CharField(source="centre_afpa_cible.nom", read_only=True)
    centre_afpa_cible_texte = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    prepa_origine_id = serializers.PrimaryKeyRelatedField(
        queryset=Prepa.objects.select_related("centre").all(),
        source="prepa_origine",
        write_only=True,
        required=False,
        allow_null=True,
    )
    prepa_origine_label = serializers.SerializerMethodField()
    date_ic = serializers.SerializerMethodField()
    statut_parcours_display = serializers.CharField(source="get_statut_parcours_display", read_only=True)
    orientation_finale_display = serializers.CharField(source="get_orientation_finale_display", read_only=True)
    ateliers_realises_count = serializers.SerializerMethodField()
    ateliers_realises_labels = serializers.SerializerMethodField()
    ateliers_realises_ordonnes = serializers.SerializerMethodField()
    dernier_atelier_label = serializers.SerializerMethodField()
    dernier_atelier_date = serializers.SerializerMethodField()
    atelier_en_cours = serializers.SerializerMethodField()
    atelier_en_cours_display = serializers.SerializerMethodField()
    atelier_en_cours_date = serializers.SerializerMethodField()
    dernier_statut_participation = serializers.SerializerMethodField()
    dernier_statut_participation_display = serializers.SerializerMethodField()
    dernier_statut_participation_liberant = serializers.SerializerMethodField()
    prochain_atelier_prevu = serializers.ChoiceField(
        choices=PROCHAIN_ATELIER_PREVU_CHOICES,
        required=False,
        allow_null=True,
        allow_blank=True,
    )
    prochain_etape = serializers.SerializerMethodField()
    prochain_etape_display = serializers.SerializerMethodField()
    prochain_atelier_attendu = serializers.SerializerMethodField()
    prochain_atelier_attendu_display = serializers.SerializerMethodField()
    prochain_atelier_prevu_display = serializers.SerializerMethodField()
    est_oriente_afpa = serializers.SerializerMethodField()
    est_oriente_vers_autre_centre_afpa = serializers.SerializerMethodField()
    est_en_attente_entree = serializers.SerializerMethodField()
    est_a_integrer_atelier_1 = serializers.SerializerMethodField()
    est_en_attente_prochain_atelier = serializers.SerializerMethodField()
    statut_parcours_courant = serializers.SerializerMethodField()
    statut_parcours_courant_display = serializers.SerializerMethodField()
    derniere_presence_reelle = serializers.SerializerMethodField()
    derniere_etape = serializers.SerializerMethodField()
    date_entree_calculee = serializers.SerializerMethodField()
    date_fin_calculee = serializers.SerializerMethodField()
    action_suivante_recommandee = serializers.SerializerMethodField()
    historique_ateliers = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = StagiairePrepa
        fields = [
            "id",
            "is_active",
            "prepa_origine_id",
            "prepa_origine_label",
            "date_ic",
            "centre",
            "centre_id",
            "centre_nom",
            "centre_afpa_cible",
            "centre_afpa_cible_id",
            "centre_afpa_cible_nom",
            "centre_afpa_cible_texte",
            "nom",
            "prenom",
            "telephone",
            "email",
            "statut_parcours",
            "statut_parcours_display",
            "prochain_atelier_prevu",
            "prochain_atelier_prevu_display",
            "prochain_etape",
            "prochain_etape_display",
            "prochain_atelier_attendu",
            "prochain_atelier_attendu_display",
            "orientation_finale",
            "orientation_finale_display",
            "formation_afpa_cible",
            "est_oriente_afpa",
            "est_oriente_vers_autre_centre_afpa",
            "est_en_attente_entree",
            "est_a_integrer_atelier_1",
            "est_en_attente_prochain_atelier",
            "date_entree_calculee",
            "date_fin_calculee",
            "commentaire_suivi",
            "date_bilan",
            "statut_parcours_courant",
            "statut_parcours_courant_display",
            "derniere_presence_reelle",
            "derniere_etape",
            "action_suivante_recommandee",
            "historique_ateliers",
            "atelier_1_realise",
            "atelier_2_realise",
            "atelier_3_realise",
            "atelier_4_realise",
            "atelier_5_realise",
            "atelier_6_realise",
            "atelier_autre_realise",
            "date_atelier_1",
            "date_atelier_2",
            "date_atelier_3",
            "date_atelier_4",
            "date_atelier_5",
            "date_atelier_6",
            "date_atelier_autre",
            "ateliers_realises_count",
            "ateliers_realises_labels",
            "ateliers_realises_ordonnes",
            "dernier_atelier_label",
            "dernier_atelier_date",
            "atelier_en_cours",
            "atelier_en_cours_display",
            "atelier_en_cours_date",
            "dernier_statut_participation",
            "dernier_statut_participation_display",
            "dernier_statut_participation_liberant",
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
            "date_ic",
            "prepa_origine_label",
            "centre_nom",
            "centre_afpa_cible_nom",
            "statut_parcours_display",
            "prochain_atelier_prevu_display",
            "prochain_etape",
            "prochain_etape_display",
            "prochain_atelier_attendu",
            "prochain_atelier_attendu_display",
            "orientation_finale_display",
            "est_oriente_afpa",
            "est_oriente_vers_autre_centre_afpa",
            "est_en_attente_entree",
            "est_a_integrer_atelier_1",
            "est_en_attente_prochain_atelier",
            "ateliers_realises_count",
            "ateliers_realises_labels",
            "ateliers_realises_ordonnes",
            "dernier_atelier_label",
            "dernier_atelier_date",
            "atelier_en_cours",
            "atelier_en_cours_display",
            "atelier_en_cours_date",
            "dernier_statut_participation",
            "dernier_statut_participation_display",
            "dernier_statut_participation_liberant",
            "statut_parcours_courant",
            "statut_parcours_courant_display",
            "derniere_presence_reelle",
            "derniere_etape",
            "date_entree_calculee",
            "date_fin_calculee",
            "action_suivante_recommandee",
            "historique_ateliers",
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_prepa_origine_label(self, obj) -> str | None:
        prepa = getattr(obj, "prepa_origine", None)
        if not prepa:
            return None
        if prepa.type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE:
            centre_nom = getattr(getattr(prepa, "centre", None), "nom", None)
            return f"IC du {prepa.date_prepa:%d/%m/%Y}" + (f" - {centre_nom}" if centre_nom else "")
        centre_nom = getattr(getattr(prepa, "centre", None), "nom", None)
        return f"{prepa.get_type_prepa_display()} du {prepa.date_prepa:%d/%m/%Y}" + (
            f" - {centre_nom}" if centre_nom else ""
        )

    @extend_schema_field(serializers.DateField(allow_null=True))
    def get_date_ic(self, obj):
        return obj.date_ic

    @extend_schema_field(serializers.IntegerField())
    def get_ateliers_realises_count(self, obj) -> int:
        return obj.ateliers_realises_count

    @extend_schema_field(
        serializers.ListField(child=serializers.CharField(), allow_empty=True)
    )
    def get_ateliers_realises_labels(self, obj) -> list[str]:
        return obj.ateliers_realises_labels

    @extend_schema_field(
        serializers.ListField(
            child=serializers.DictField(
                child=serializers.CharField(allow_null=True),
            ),
            allow_empty=True,
        )
    )
    def get_ateliers_realises_ordonnes(self, obj) -> list[dict]:
        return obj.ateliers_realises_ordonnes

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_dernier_atelier_label(self, obj) -> str | None:
        return obj.dernier_atelier_label

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_dernier_atelier_date(self, obj) -> str | None:
        return obj.dernier_atelier_date

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_atelier_en_cours(self, obj) -> str | None:
        return obj.atelier_en_cours

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_atelier_en_cours_display(self, obj) -> str | None:
        return obj.atelier_en_cours_label

    @extend_schema_field(serializers.DateField(allow_null=True))
    def get_atelier_en_cours_date(self, obj):
        return obj.atelier_en_cours_date

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_dernier_statut_participation(self, obj) -> str | None:
        return obj.dernier_statut_participation

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_dernier_statut_participation_display(self, obj) -> str | None:
        return obj.dernier_statut_participation_label

    @extend_schema_field(serializers.BooleanField())
    def get_dernier_statut_participation_liberant(self, obj) -> bool:
        return obj.dernier_statut_participation_liberant

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_prochain_atelier_prevu_display(self, obj) -> str | None:
        value = getattr(obj, "prochain_atelier_prevu", None)
        if not value:
            return None
        if value == ETAPE_BILAN:
            return "Bilan"
        return dict(Prepa.TypePrepa.choices).get(value, value)

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_prochain_etape(self, obj) -> str | None:
        return obj.prochain_atelier_attendu

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_prochain_etape_display(self, obj) -> str | None:
        return obj.prochain_atelier_attendu_label

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_prochain_atelier_attendu(self, obj) -> str | None:
        return obj.prochain_atelier_attendu

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_prochain_atelier_attendu_display(self, obj) -> str | None:
        return obj.prochain_atelier_attendu_label

    @extend_schema_field(serializers.BooleanField())
    def get_est_oriente_afpa(self, obj) -> bool:
        return obj.est_oriente_afpa

    @extend_schema_field(serializers.BooleanField())
    def get_est_oriente_vers_autre_centre_afpa(self, obj) -> bool:
        return obj.est_oriente_vers_autre_centre_afpa

    @extend_schema_field(serializers.BooleanField())
    def get_est_en_attente_entree(self, obj) -> bool:
        return obj.est_en_attente_entree

    @extend_schema_field(serializers.BooleanField())
    def get_est_a_integrer_atelier_1(self, obj) -> bool:
        return obj.est_a_integrer_atelier_1

    @extend_schema_field(serializers.BooleanField())
    def get_est_en_attente_prochain_atelier(self, obj) -> bool:
        return obj.est_en_attente_prochain_atelier

    @extend_schema_field(serializers.CharField())
    def get_statut_parcours_courant(self, obj) -> str:
        return compute_statut_parcours_courant(obj)

    @extend_schema_field(serializers.CharField())
    def get_statut_parcours_courant_display(self, obj) -> str:
        return StatutParcoursCourant(compute_statut_parcours_courant(obj)).label

    @extend_schema_field(serializers.DictField(child=serializers.CharField(allow_null=True), allow_null=True))
    def get_derniere_presence_reelle(self, obj) -> dict | None:
        return compute_derniere_presence_reelle(obj)

    @extend_schema_field(serializers.DictField(child=serializers.CharField(allow_null=True), allow_null=True))
    def get_derniere_etape(self, obj) -> dict | None:
        return compute_derniere_etape(obj)

    @extend_schema_field(serializers.DateField(allow_null=True))
    def get_date_entree_calculee(self, obj) -> str | None:
        return compute_date_entree_calculee(obj)

    @extend_schema_field(serializers.DateField(allow_null=True))
    def get_date_fin_calculee(self, obj) -> str | None:
        return compute_date_fin_calculee(obj)

    @extend_schema_field(serializers.DictField(child=serializers.CharField()))
    def get_action_suivante_recommandee(self, obj) -> dict[str, str]:
        return compute_action_suivante_recommandee(obj)

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_historique_ateliers(self, obj) -> list[dict]:
        return build_historique_ateliers(obj)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        centre = attrs.get("centre", getattr(self.instance, "centre", None))
        duplicate = self._find_duplicate_stagiaire(attrs, centre=centre)
        statut = attrs.get("statut_parcours", getattr(self.instance, "statut_parcours", None))
        orientation = attrs.get("orientation_finale", getattr(self.instance, "orientation_finale", None))
        centre_afpa_cible = attrs.get("centre_afpa_cible", getattr(self.instance, "centre_afpa_cible", None))
        centre_afpa_cible_texte = attrs.get(
            "centre_afpa_cible_texte", getattr(self.instance, "centre_afpa_cible_texte", None)
        )
        formation_afpa_cible = attrs.get("formation_afpa_cible", getattr(self.instance, "formation_afpa_cible", None))
        date_bilan = attrs.get("date_bilan", getattr(self.instance, "date_bilan", None))
        errors = {}

        instance = self.instance
        new_orientation = attrs.get("orientation_finale", serializers.empty)
        if new_orientation is not serializers.empty and new_orientation and instance:
            if instance.orientation_finale != new_orientation:
                courant = compute_statut_parcours_courant(instance)
                orientation_msgs = []
                if courant != StatutParcoursCourant.EN_ATTENTE_BILAN:
                    orientation_msgs.append(
                        "L’orientation se renseigne uniquement lorsque le parcours est en attente de bilan."
                    )
                if not has_at1_present_ever(instance):
                    orientation_msgs.append("Un atelier 1 réalisé est requis avant de clôturer le bilan.")
                if orientation_msgs:
                    errors["orientation_finale"] = " ".join(orientation_msgs)

        if orientation in {
            StagiairePrepa.OrientationFinale.AFPA,
            StagiairePrepa.OrientationFinale.AUTRE_CENTRE_AFPA,
        }:
            if not centre_afpa_cible and not centre_afpa_cible_texte:
                errors["centre_afpa_cible_texte"] = "Le centre AFPA cible est requis pour une orientation AFPA."
            if not formation_afpa_cible:
                errors["formation_afpa_cible"] = "La formation AFPA cible est requise pour une orientation AFPA."
        if orientation and not date_bilan:
            errors["date_bilan"] = (
                "La date du bilan est requise lorsqu'une orientation finale est renseignée."
            )
        if duplicate:
            errors["non_field_errors"] = [
                "Une fiche Stagiaire Prépa existe déjà pour cette personne. Réutilisez la fiche existante."
            ]
        if errors:
            raise serializers.ValidationError(errors)

        if attrs.get("orientation_finale"):
            derived = derive_issue_bilan_from_orientation(attrs["orientation_finale"])
            if derived:
                attrs.setdefault("issue_bilan", derived)
        if attrs.get("centre_afpa_cible_texte"):
            attrs["centre_afpa_cible_texte"] = attrs["centre_afpa_cible_texte"].strip()
        if statut == StagiairePrepa.StatutParcours.ABANDON and attrs.get("date_bilan"):
            attrs.setdefault("issue_bilan", StagiairePrepa.IssueBilanPrepa.ABANDON)
        if attrs.get("date_bilan"):
            attrs["date_sortie_parcours"] = attrs["date_bilan"]

        return attrs

    def validate_commentaire_suivi(self, value):
        return sanitize_rich_text(value)

    def _find_duplicate_stagiaire(self, attrs, centre=None) -> StagiairePrepa | None:
        nom = (attrs.get("nom", getattr(self.instance, "nom", "")) or "").strip()
        prenom = (attrs.get("prenom", getattr(self.instance, "prenom", "")) or "").strip()
        telephone = (attrs.get("telephone", getattr(self.instance, "telephone", "")) or "").strip()
        email = (attrs.get("email", getattr(self.instance, "email", "")) or "").strip()

        if not nom or not prenom or not centre:
            return None

        queryset = StagiairePrepa.objects.filter(
            centre=centre,
            nom__iexact=nom,
            prenom__iexact=prenom,
        )
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if email:
            match = queryset.filter(email__iexact=email).first()
            if match:
                return match
        if telephone:
            match = queryset.filter(telephone=telephone).first()
            if match:
                return match
        if not email and not telephone and queryset.count() == 1:
            return queryset.first()

        return None


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "Prepa",
            value={
                "id": 45,
                "type_prepa": "info_collective",
                "type_prepa_display": "Information collective",
                "date_prepa": "2025-09-12",
                "centre": {"id": 2, "nom": "Centre de Lille", "departement": "59", "code_postal": "59000"},
                "centre_nom": "Centre de Lille",
                "formateur_animateur": "Sonia Martin",
                "stagiaires_prepa": [
                    {
                        "id": 3,
                        "nom": "Dupont",
                        "prenom": "Lina",
                        "telephone": "0600000000",
                        "email": "lina@example.com",
                        "statut_parcours": "en_attente",
                    }
                ],
                "nb_presents_info": 10,
                "nb_absents_info": 2,
                "nb_adhesions": 8,
                "nb_presents_prepa": 8,
                "nb_absents_prepa": 2,
                "taux_presence_info": 83.3,
                "taux_presence_atelier": None,
                "taux_presence_global": 83.3,
            },
            response_only=True,
        )
    ]
)
class PrepaSerializer(serializers.ModelSerializer):
    """
    Sérialiseur du module Prépa avec la liste compacte des stagiaires suivis.
    """

    centre = PrepaCentreLightSerializer(read_only=True)
    centre_id = serializers.PrimaryKeyRelatedField(
        queryset=Centre.objects.all(), source="centre", write_only=True, help_text="Identifiant du centre concerné."
    )
    centre_nom = serializers.CharField(source="centre.nom", read_only=True)
    stagiaires_prepa = StagiairePrepaNestedSerializer(many=True, required=False)
    participations_prepa = PrepaStagiaireParticipationSerializer(
        many=True,
        required=False,
        source="participations_stagiaires_prepa",
    )

    taux_prescription = serializers.SerializerMethodField()
    taux_presence_info = serializers.SerializerMethodField()
    taux_presence_atelier = serializers.SerializerMethodField()
    taux_presence_global = serializers.SerializerMethodField()
    taux_adhesion = serializers.SerializerMethodField()
    taux_presence_prepa = serializers.SerializerMethodField()
    objectif_annuel = serializers.SerializerMethodField()
    taux_atteinte_annuel = serializers.SerializerMethodField()
    reste_a_faire = serializers.SerializerMethodField()
    presence_counts_prepa = serializers.SerializerMethodField()
    nb_inscrits_prepa_nominatifs = serializers.SerializerMethodField()
    nb_presents_prepa_nominatifs = serializers.SerializerMethodField()
    nb_absents_prepa_nominatifs = serializers.SerializerMethodField()

    type_prepa_display = serializers.CharField(source="get_type_prepa_display", read_only=True)
    date_display = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)

    inscrits = serializers.SerializerMethodField()
    presents = serializers.SerializerMethodField()
    absents = serializers.SerializerMethodField()
    adhesions_ic = serializers.SerializerMethodField()

    class Meta:
        model = Prepa
        fields = [
            "id",
            "type_prepa",
            "type_prepa_display",
            "date_prepa",
            "date_debut_atelier",
            "date_fin_atelier",
            "date_display",
            "is_active",
            "centre",
            "centre_id",
            "centre_nom",
            "formateur_animateur",
            "stagiaires_prepa",
            "participations_prepa",
            "nombre_places_ouvertes",
            "nombre_prescriptions",
            "nb_presents_info",
            "nb_absents_info",
            "nb_adhesions",
            "nb_inscrits_prepa",
            "nb_presents_prepa",
            "nb_absents_prepa",
            "nb_inscrits_prepa_hors_liste",
            "nb_presents_prepa_hors_liste",
            "nb_absents_prepa_hors_liste",
            "nb_inscrits_prepa_nominatifs",
            "nb_presents_prepa_nominatifs",
            "nb_absents_prepa_nominatifs",
            "presence_counts_prepa",
            "inscrits",
            "presents",
            "absents",
            "adhesions_ic",
            "taux_prescription",
            "taux_presence_info",
            "taux_presence_atelier",
            "taux_presence_global",
            "taux_adhesion",
            "taux_presence_prepa",
            "objectif_annuel",
            "taux_atteinte_annuel",
            "reste_a_faire",
            "commentaire",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["created_at", "updated_at", "created_by", "updated_by"]

    @extend_schema_field(serializers.CharField)
    def get_date_display(self, obj):
        return obj.date_prepa.strftime("%d/%m/%Y") if obj.date_prepa else ""

    @extend_schema_field(serializers.FloatField)
    def get_taux_prescription(self, obj):
        return obj.taux_prescription

    @extend_schema_field(serializers.FloatField)
    def get_taux_presence_info(self, obj):
        if obj.type_prepa != Prepa.TypePrepa.INFO_COLLECTIVE:
            return None
        total = (obj.nb_presents_info or 0) + (obj.nb_absents_info or 0)
        return round(obj.nb_presents_info / total * 100, 1) if total else None

    @extend_schema_field(serializers.FloatField)
    def get_taux_presence_atelier(self, obj):
        if obj.type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE:
            return None
        total = (obj.nb_presents_prepa or 0) + (obj.nb_absents_prepa or 0)
        return round(obj.nb_presents_prepa / total * 100, 1) if total else None

    @extend_schema_field(serializers.FloatField)
    def get_taux_presence_global(self, obj):
        return (
            self.get_taux_presence_info(obj)
            if obj.type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE
            else self.get_taux_presence_atelier(obj)
        )

    @extend_schema_field(serializers.FloatField)
    def get_taux_adhesion(self, obj):
        return obj.taux_adhesion

    @extend_schema_field(serializers.FloatField)
    def get_taux_presence_prepa(self, obj):
        return obj.taux_presence_prepa

    @extend_schema_field(serializers.IntegerField)
    def get_objectif_annuel(self, obj):
        return obj.objectif_annuel or 0

    @extend_schema_field(serializers.FloatField)
    def get_taux_atteinte_annuel(self, obj):
        return obj.taux_atteinte_annuel

    @extend_schema_field(serializers.IntegerField)
    def get_reste_a_faire(self, obj):
        return obj.reste_a_faire

    @extend_schema_field(serializers.DictField(child=serializers.IntegerField()))
    def get_presence_counts_prepa(self, obj):
        return obj.presence_counts_prepa

    @extend_schema_field(serializers.IntegerField())
    def get_nb_inscrits_prepa_nominatifs(self, obj):
        return obj.nb_inscrits_prepa_nominatifs

    @extend_schema_field(serializers.IntegerField())
    def get_nb_presents_prepa_nominatifs(self, obj):
        return obj.nb_presents_prepa_nominatifs

    @extend_schema_field(serializers.IntegerField())
    def get_nb_absents_prepa_nominatifs(self, obj):
        return obj.nb_absents_prepa_nominatifs

    @extend_schema_field(serializers.IntegerField)
    def get_inscrits(self, obj):
        return obj.nombre_prescriptions if obj.type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE else obj.nb_inscrits_prepa

    @extend_schema_field(serializers.IntegerField)
    def get_presents(self, obj):
        return obj.nb_presents_info if obj.type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE else obj.nb_presents_prepa

    @extend_schema_field(serializers.IntegerField)
    def get_absents(self, obj):
        return obj.nb_absents_info if obj.type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE else obj.nb_absents_prepa

    @extend_schema_field(serializers.IntegerField)
    def get_adhesions_ic(self, obj):
        return obj.nb_adhesions if obj.type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE else 0

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        stagiaires_data = validated_data.pop("stagiaires_prepa", [])
        participations_data = validated_data.pop("participations_stagiaires_prepa", [])
        instance = Prepa(**validated_data)
        instance.save(user=user)
        if instance.type_prepa != Prepa.TypePrepa.INFO_COLLECTIVE:
            self._sync_stagiaires_prepa(instance, stagiaires_data, user=user)
            self._sync_participations_prepa(instance, participations_data, user=user)
            instance.save(user=user)
        return instance

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        stagiaires_data = validated_data.pop("stagiaires_prepa", None)
        participations_data = validated_data.pop("participations_stagiaires_prepa", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if instance.type_prepa != Prepa.TypePrepa.INFO_COLLECTIVE and stagiaires_data is not None:
            self._sync_stagiaires_prepa(instance, stagiaires_data, user=user)
        if instance.type_prepa != Prepa.TypePrepa.INFO_COLLECTIVE and participations_data is not None:
            self._sync_participations_prepa(instance, participations_data, user=user)
            if not participations_data and not any(
                [
                    instance.nb_inscrits_prepa_hors_liste,
                    instance.nb_presents_prepa_hors_liste,
                    instance.nb_absents_prepa_hors_liste,
                ]
            ):
                instance.nb_inscrits_prepa = 0
                instance.nb_presents_prepa = 0
                instance.nb_absents_prepa = 0
        instance.save(user=user)
        return instance

    def validate(self, attrs):
        type_prepa = attrs.get("type_prepa", getattr(self.instance, "type_prepa", None))
        stagiaires = attrs.get("stagiaires_prepa", None)
        participations = attrs.get("participations_stagiaires_prepa", None)
        errors = {}

        if type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE and attrs.get("nombre_places_ouvertes", 0) == 0:
            errors["nombre_places_ouvertes"] = (
                "Les informations collectives doivent avoir un nombre de places ouvert > 0."
            )

        if stagiaires is not None:
            attrs["stagiaires_prepa"] = self._normalize_stagiaires(stagiaires)
        if participations is not None:
            attrs["participations_stagiaires_prepa"] = self._normalize_participations(participations)
            self._validate_participations_uniques(
                attrs["participations_stagiaires_prepa"],
                type_prepa=type_prepa,
            )

        if type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE:
            if attrs.get("stagiaires_prepa"):
                errors["stagiaires_prepa"] = [
                    "Une information collective ne gère pas de stagiaires nominatifs."
                ]
            if attrs.get("participations_stagiaires_prepa"):
                errors["participations_prepa"] = [
                    "Une information collective ne gère pas de participations nominatives."
                ]

        date_debut = attrs.get("date_debut_atelier", getattr(self.instance, "date_debut_atelier", None))
        date_fin = attrs.get("date_fin_atelier", getattr(self.instance, "date_fin_atelier", None))
        if date_debut and date_fin and date_fin < date_debut:
            errors["date_fin_atelier"] = "La date de fin atelier doit être postérieure ou égale à la date de début."

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def validate_commentaire(self, value):
        return sanitize_rich_text(value)

    def _sync_stagiaires_prepa(self, instance: Prepa, stagiaires_data, user=None) -> None:
        existing = {stagiaire.id: stagiaire for stagiaire in instance.stagiaires_prepa.all()}
        keep_ids = set()

        for stagiaire_data in stagiaires_data or []:
            stagiaire_data = dict(stagiaire_data)
            stagiaire_id = stagiaire_data.pop("id", None)
            if stagiaire_id and stagiaire_id in existing:
                stagiaire = existing[stagiaire_id]
                for field in ["nom", "prenom", "telephone", "email", "statut_parcours"]:
                    if field in stagiaire_data:
                        setattr(stagiaire, field, stagiaire_data[field])
                stagiaire.save(user=user)
                keep_ids.add(stagiaire.id)
                continue

            stagiaire = self._find_existing_stagiaire_prepa(instance, stagiaire_data)
            if stagiaire:
                self._hydrate_existing_stagiaire(
                    stagiaire,
                    instance=instance,
                    data=stagiaire_data,
                    user=user,
                    default_prepa_origine=instance,
                    default_date_entree=None,
                )
            else:
                stagiaire = StagiairePrepa(
                    prepa_origine=instance,
                    centre=instance.centre,
                    **stagiaire_data,
                )
                stagiaire.save(user=user)
            keep_ids.add(stagiaire.id)

        for stagiaire in instance.stagiaires_prepa.exclude(id__in=keep_ids):
            if (
                not stagiaire.a_deja_commence
                and stagiaire.statut_parcours == StagiairePrepa.StatutParcours.EN_ATTENTE
            ):
                stagiaire.delete(user=user)

    def _sync_participations_prepa(self, instance: Prepa, participations_data, user=None) -> None:
        existing = {
            participation.stagiaire_prepa_id: participation
            for participation in instance.participations_stagiaires_prepa.select_related("stagiaire_prepa").all()
        }
        keep_ids = set()

        for participation_data in participations_data or []:
            participation_data = dict(participation_data)
            stagiaire = participation_data.pop("stagiaire_prepa", None)
            if not stagiaire:
                candidat_data = {
                    "nom": participation_data.pop("nom"),
                    "prenom": participation_data.pop("prenom"),
                    "telephone": participation_data.pop("telephone", None),
                    "email": participation_data.pop("email", None),
                    "statut_parcours": participation_data.pop(
                        "statut_parcours",
                        StagiairePrepa.StatutParcours.EN_ATTENTE,
                    ),
                }
                stagiaire = self._find_existing_stagiaire_prepa(instance, candidat_data)
                if stagiaire:
                    self._hydrate_existing_stagiaire(
                        stagiaire,
                        instance=instance,
                        data=candidat_data,
                        user=user,
                        default_prepa_origine=instance if instance.type_prepa == Prepa.TypePrepa.ATELIER1 else None,
                        default_date_entree=None,
                    )
                else:
                    stagiaire = StagiairePrepa(
                        prepa_origine=instance if instance.type_prepa == Prepa.TypePrepa.ATELIER1 else None,
                        centre=instance.centre,
                        **candidat_data,
                    )
                    stagiaire.save(user=user)
            else:
                for extra_key in ["nom", "prenom", "telephone", "email", "statut_parcours"]:
                    participation_data.pop(extra_key, None)

            participation = existing.get(stagiaire.id)
            if participation:
                changed_fields = []
                for field in ["statut", "commentaire"]:
                    if field in participation_data and getattr(participation, field) != participation_data[field]:
                        setattr(participation, field, participation_data[field])
                        changed_fields.append(field)
                if changed_fields:
                    participation.save(user=user, update_fields=changed_fields)
            else:
                participation = PrepaStagiaireParticipation(
                    prepa=instance,
                    stagiaire_prepa=stagiaire,
                    statut=participation_data.get("statut", PrepaPresenceStatut.INSCRIT),
                    commentaire=participation_data.get("commentaire"),
                )
                participation.save(user=user)

            if participation.statut in PrepaPresenceStatut.present_like_statuses():
                stagiaire.marquer_participation_atelier(
                    instance.type_prepa,
                    date_participation=instance.date_debut_atelier or instance.date_prepa,
                    user=user,
                )

            keep_ids.add(stagiaire.id)

        instance.participations_stagiaires_prepa.exclude(stagiaire_prepa_id__in=keep_ids).delete()

    def _find_existing_stagiaire_prepa(self, instance: Prepa, data: dict) -> StagiairePrepa | None:
        nom = (data.get("nom") or "").strip()
        prenom = (data.get("prenom") or "").strip()
        telephone = (data.get("telephone") or "").strip()
        email = (data.get("email") or "").strip()

        if not nom or not prenom or not instance.centre_id:
            return None

        queryset = StagiairePrepa.objects.filter(
            centre=instance.centre,
            nom__iexact=nom,
            prenom__iexact=prenom,
        )
        if email:
            match = queryset.filter(email__iexact=email).first()
            if match:
                return match
        if telephone:
            match = queryset.filter(telephone=telephone).first()
            if match:
                return match
        if not email and not telephone and queryset.count() == 1:
            return queryset.first()
        if email and telephone:
            match = queryset.filter(Q(email__isnull=True) | Q(email="")).filter(
                Q(telephone=telephone) | Q(telephone__isnull=True) | Q(telephone="")
            ).first()
            if match:
                return match

        return None

    def _hydrate_existing_stagiaire(
        self,
        stagiaire: StagiairePrepa,
        *,
        instance: Prepa,
        data: dict,
        user=None,
        default_prepa_origine=None,
        default_date_entree=None,
    ) -> None:
        changed_fields = []

        if not stagiaire.centre_id and instance.centre_id:
            stagiaire.centre = instance.centre
            changed_fields.append("centre")
        if not stagiaire.prepa_origine_id and default_prepa_origine is not None:
            stagiaire.prepa_origine = default_prepa_origine
            changed_fields.append("prepa_origine")
        if not stagiaire.date_entree_parcours and default_date_entree:
            stagiaire.date_entree_parcours = default_date_entree
            changed_fields.append("date_entree_parcours")

        for field in ["telephone", "email"]:
            incoming = data.get(field)
            current = getattr(stagiaire, field)
            if incoming and not current:
                setattr(stagiaire, field, incoming)
                changed_fields.append(field)

        incoming_statut = data.get("statut_parcours")
        if incoming_statut and stagiaire.statut_parcours == StagiairePrepa.StatutParcours.EN_ATTENTE:
            if incoming_statut != stagiaire.statut_parcours:
                stagiaire.statut_parcours = incoming_statut
                changed_fields.append("statut_parcours")

        if changed_fields:
            stagiaire.save(user=user, update_fields=list(dict.fromkeys(changed_fields)))

    def _normalize_stagiaires(self, stagiaires_data):
        normalized = []
        for index, stagiaire in enumerate(stagiaires_data or []):
            nom = (stagiaire.get("nom") or "").strip()
            prenom = (stagiaire.get("prenom") or "").strip()
            telephone = (stagiaire.get("telephone") or "").strip()
            email = (stagiaire.get("email") or "").strip()
            statut = stagiaire.get("statut_parcours") or StagiairePrepa.StatutParcours.EN_ATTENTE
            existing_id = stagiaire.get("id")

            if not any([nom, prenom, telephone, email]):
                continue

            if not nom or not prenom:
                raise serializers.ValidationError(
                    {"stagiaires_prepa": [f"Ligne stagiaire {index + 1} : le nom et le prénom sont obligatoires."]}
                )

            normalized.append(
                {
                    **({"id": existing_id} if existing_id else {}),
                    "nom": nom,
                    "prenom": prenom,
                    "telephone": telephone or None,
                    "email": email or None,
                    "statut_parcours": statut,
                }
            )

        return normalized

    def _normalize_participations(self, participations_data):
        normalized = []
        for index, participation in enumerate(participations_data or []):
            existing = participation.get("stagiaire_prepa")
            nom = (participation.get("nom") or "").strip()
            prenom = (participation.get("prenom") or "").strip()
            telephone = (participation.get("telephone") or "").strip() or None
            email = (participation.get("email") or "").strip() or None
            statut_parcours = participation.get("statut_parcours") or StagiairePrepa.StatutParcours.EN_ATTENTE
            statut = coerce_presence_statut_for_write(participation.get("statut") or PrepaPresenceStatut.INSCRIT)
            commentaire = (participation.get("commentaire") or "").strip() or None

            if not existing and not any([nom, prenom, telephone, email]):
                continue

            if not existing and (not nom or not prenom):
                raise serializers.ValidationError(
                    {
                        "participations_prepa": [
                            f"Ligne participation {index + 1} : le nom et le prénom sont obligatoires."
                        ]
                    }
                )

            normalized.append(
                {
                    "stagiaire_prepa": existing,
                    "nom": nom,
                    "prenom": prenom,
                    "telephone": telephone,
                    "email": email,
                    "statut_parcours": statut_parcours,
                    "statut": statut,
                    "commentaire": commentaire,
                }
            )

        return normalized

    def _validate_participations_uniques(self, participations_data, *, type_prepa=None) -> None:
        errors: list[str] = []
        seen_stagiaire_ids: set[int] = set()
        seen_identity_keys: set[tuple[str, str, str | None, str | None]] = set()
        current_participant_ids: set[int] = set()
        requires_at1 = type_prepa in {
            Prepa.TypePrepa.ATELIER2,
            Prepa.TypePrepa.ATELIER3,
            Prepa.TypePrepa.ATELIER4,
            Prepa.TypePrepa.ATELIER5,
            Prepa.TypePrepa.ATELIER6,
            Prepa.TypePrepa.AUTRE,
        }

        if self.instance and self.instance.pk:
            current_participant_ids = set(
                self.instance.participations_stagiaires_prepa.values_list("stagiaire_prepa_id", flat=True)
            )

        for participation in participations_data or []:
            stagiaire = participation.get("stagiaire_prepa")
            statut = participation.get("statut")
            if stagiaire:
                if stagiaire.id in seen_stagiaire_ids:
                    errors.append(
                        f"Doublon séance : {stagiaire.prenom} {stagiaire.nom} est renseigné plusieurs fois dans cet atelier."
                    )
                    continue
                seen_stagiaire_ids.add(stagiaire.id)
            else:
                identity_key = (
                    (participation.get("nom") or "").strip().lower(),
                    (participation.get("prenom") or "").strip().lower(),
                    (participation.get("email") or "").strip().lower() or None,
                    (participation.get("telephone") or "").strip() or None,
                )
                if identity_key[0] and identity_key[1]:
                    if identity_key in seen_identity_keys:
                        errors.append(
                            f"Doublon séance : {participation.get('prenom', '').strip()} "
                            f"{participation.get('nom', '').strip()} est renseigné plusieurs fois dans cet atelier."
                        )
                        continue
                    seen_identity_keys.add(identity_key)

            if not requires_at1 or not statut:
                continue

            if stagiaire:
                if stagiaire.id in current_participant_ids:
                    continue
                if not has_at1_present_ever(stagiaire):
                    errors.append(
                        f"Inscription impossible : {stagiaire.prenom} {stagiaire.nom} doit commencer le parcours par un Atelier 1."
                    )
            else:
                errors.append(
                    f"Inscription impossible : {(participation.get('prenom') or '').strip()} "
                    f"{(participation.get('nom') or '').strip()} doit commencer le parcours par un Atelier 1."
                )

        if errors:
            raise serializers.ValidationError({"participations_prepa": errors})
