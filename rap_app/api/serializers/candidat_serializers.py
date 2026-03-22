from django.contrib.auth import get_user_model
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiExample,
    extend_schema_field,
    extend_schema_serializer,
)
from rest_framework import exceptions, serializers
import unicodedata
from django.utils import timezone

from ...models.appairage import Appairage
from ...models.atelier_tre import AtelierTRE
from ...models.candidat import (
    NIVEAU_CHOICES,
    Candidat,
    HistoriquePlacement,
    ResultatPlacementChoices,
)
from ...models.centres import Centre
from ...models.formations import Formation
from ...services.french_text_normalizer import normalize_candidate_payload
from ..mixins import FieldMaskingMixin
from ..serializers.commentaires_appairage_serializers import (
    CommentaireAppairageSerializer,
)


def _normalize_nom_prenom(instance):
    user = getattr(instance, "compte_utilisateur", None)
    nom = (getattr(instance, "nom", "") or "").strip()
    prenom = (getattr(instance, "prenom", "") or "").strip()
    if not nom and user:
        nom = (getattr(user, "last_name", "") or "").strip()
    if not prenom and user:
        prenom = (getattr(user, "first_name", "") or "").strip()

    nom_complet = " ".join(x for x in [nom, prenom] if x) or (
        getattr(user, "email", None) or f"Candidat #{getattr(instance, 'pk', '—')}"
    )
    return nom, prenom, nom_complet


def _user_display(u):
    if not u:
        return None
    full = u.get_full_name()
    return full or getattr(u, "email", None) or getattr(u, "username", None)


def _ateliers_counts_for(obj) -> dict[str, int]:
    out: dict[str, int] = {}
    for key, _label in AtelierTRE.TypeAtelier.choices:
        annot_name = f"count_{key}"
        if key == "autre" and hasattr(obj, "count_atelier_autre"):
            annot_name = "count_atelier_autre"

        val = getattr(obj, annot_name, None)
        if val is None:
            rel = getattr(obj, "ateliers_tre", None)
            if hasattr(rel, "all"):
                try:
                    val = sum(1 for a in rel.all() if getattr(a, "type_atelier", None) == key)
                except Exception:
                    val = 0
            else:
                val = 0

        k = key.replace("atelier_", "atelier")
        out[k] = int(val or 0)

    return out


def _get_last_prefetched_commentaire_body(obj) -> str | None:
    annotated = getattr(obj, "last_commentaire", None)
    if annotated not in (None, ""):
        return annotated

    prefetched = getattr(obj, "_prefetched_objects_cache", {}).get("commentaires")
    if prefetched is not None:
        if not prefetched:
            return None
        last = max(
            prefetched,
            key=lambda c: (
                getattr(c, "created_at", None),
                getattr(c, "pk", None),
            ),
        )
        return getattr(last, "body", None)

    last = obj.commentaires.order_by("-created_at", "-pk").first()
    return last.body if last else None


def _get_last_prefetched_appairage(obj):
    prefetched = getattr(obj, "_prefetched_objects_cache", {}).get("appairages")
    if prefetched is not None:
        if not prefetched:
            return None
        return max(
            prefetched,
            key=lambda a: (
                getattr(a, "date_appairage", None),
                getattr(a, "pk", None),
            ),
        )

    return obj.appairages.order_by("-date_appairage", "-pk").select_related("partenaire", "created_by").first()


class FormationLiteSerializer(serializers.ModelSerializer):
    """Formation compacte : centre, type_offre, date_debut/date_fin (read_only)."""

    centre = serializers.SerializerMethodField()
    type_offre = serializers.SerializerMethodField()
    date_debut = serializers.SerializerMethodField()
    date_fin = serializers.SerializerMethodField()

    class Meta:
        model = Formation
        fields = ("id", "nom", "num_offre", "centre", "type_offre", "date_debut", "date_fin")

    @extend_schema_field(str)
    def get_centre(self, obj):
        c = getattr(obj, "centre", None)
        return {"id": c.id, "nom": c.nom} if c else None

    @extend_schema_field(str)
    def get_type_offre(self, obj):
        to = getattr(obj, "type_offre", None)
        if not to:
            return None
        return {
            "id": to.id,
            "nom": getattr(to, "nom", None),
            "libelle": getattr(to, "libelle", None),
            "couleur": getattr(to, "couleur", None),
        }

    def _first_attr(self, obj, names):
        for name in names:
            if hasattr(obj, name):
                val = getattr(obj, name)
                if val not in (None, ""):
                    return val
        return None

    @extend_schema_field(str)
    def get_date_debut(self, obj):
        return self._first_attr(obj, ["date_debut", "date_rentree", "debut", "start_date", "startDate"])

    @extend_schema_field(str)
    def get_date_fin(self, obj):
        return self._first_attr(obj, ["date_fin", "fin", "end_date", "endDate"])


class AppairageLiteSerializer(serializers.ModelSerializer):
    """Appairage compact pour last_appairage : partenaire_nom, statut_display, commentaire, last_commentaire, commentaires."""

    partenaire_nom = serializers.CharField(source="partenaire.nom", read_only=True)
    created_by_nom = serializers.SerializerMethodField()
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)

    commentaire = serializers.SerializerMethodField()
    last_commentaire = serializers.SerializerMethodField()
    commentaires = CommentaireAppairageSerializer(many=True, read_only=True)

    class Meta:
        model = Appairage
        fields = [
            "id",
            "partenaire",
            "partenaire_nom",
            "date_appairage",
            "statut",
            "statut_display",
            "commentaire",
            "last_commentaire",
            "commentaires",
            "retour_partenaire",
            "date_retour",
            "created_at",
            "updated_at",
            "created_by_nom",
        ]
        read_only_fields = fields

    @extend_schema_field(str)
    def get_commentaire(self, obj):
        return _get_last_prefetched_commentaire_body(obj)

    @extend_schema_field(str)
    def get_last_commentaire(self, obj):
        return _get_last_prefetched_commentaire_body(obj)

    @extend_schema_field(str)
    def get_created_by_nom(self, obj: "Appairage") -> str | None:
        return _user_display(getattr(obj, "created_by", None))


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "Exemple de candidat",
            value={
                "id": 1,
                "nom": "Dupont",
                "prenom": "Alice",
                "email": "alice.dupont@example.com",
                "telephone": "0612345678",
                "ville": "Paris",
                "statut": "accompagnement",
                "cv_statut": "en_cours",
                "formation": 3,
                "date_naissance": "2000-01-01",
                "admissible": True,
            },
        )
    ]
)
class CandidatSerializer(FieldMaskingMixin, serializers.ModelSerializer):
    """Sérialiseur détail candidat : champs calculés, formation_info, last_appairage ; to_representation normalise nom et masque champs selon rôle ; NIR selon droits."""

    age = serializers.IntegerField(read_only=True)
    nom_complet = serializers.CharField(read_only=True)
    nb_appairages = serializers.IntegerField(source="nb_appairages_calc", read_only=True)
    nb_prospections = serializers.IntegerField(source="nb_prospections_calc", read_only=True)
    role_utilisateur = serializers.CharField(read_only=True)
    ateliers_resume = serializers.CharField(read_only=True)
    peut_modifier = serializers.SerializerMethodField()
    cv_statut_display = serializers.CharField(read_only=True)
    parcours_phase_display = serializers.CharField(read_only=True)
    parcours_phase_calculee = serializers.CharField(read_only=True)
    statut_metier_calcule = serializers.CharField(read_only=True)
    statut_metier_display = serializers.CharField(read_only=True)
    is_inscrit_valide = serializers.BooleanField(read_only=True)
    is_en_formation_now = serializers.BooleanField(read_only=True)
    is_stagiaire_role_aligned = serializers.BooleanField(read_only=True)
    has_compte_utilisateur = serializers.BooleanField(read_only=True)

    ateliers_counts = serializers.SerializerMethodField()

    centre_id = serializers.IntegerField(source="formation.centre_id", read_only=True)
    centre_nom = serializers.CharField(source="formation.centre.nom", read_only=True)
    formation_nom = serializers.CharField(source="formation.nom", read_only=True)
    formation_centre_nom = serializers.CharField(source="formation.centre.nom", read_only=True)
    formation_type_offre_nom = serializers.CharField(source="formation.type_offre.nom", read_only=True)
    formation_type_offre_libelle = serializers.CharField(source="formation.type_offre.libelle", read_only=True)
    formation_num_offre = serializers.CharField(source="formation.num_offre", read_only=True)

    formation_date_debut = serializers.SerializerMethodField()
    formation_date_fin = serializers.SerializerMethodField()

    formation_info = FormationLiteSerializer(source="formation", read_only=True)
    last_appairage = serializers.SerializerMethodField()

    responsable_placement_nom = serializers.SerializerMethodField()
    entreprise_placement_nom = serializers.SerializerMethodField()
    entreprise_validee_nom = serializers.SerializerMethodField()
    vu_par_nom = serializers.SerializerMethodField()
    resultat_placement_display = serializers.SerializerMethodField()

    class Meta:
        model = Candidat
        fields = [
            "id",
            "sexe",
            "nom_naissance",
            "nom",
            "prenom",
            "date_naissance",
            "departement_naissance",
            "commune_naissance",
            "pays_naissance",
            "nationalite",
            "nir",
            "email",
            "telephone",
            "street_number",
            "street_name",
            "street_complement",
            "ville",
            "code_postal",
            "compte_utilisateur",
            "role_utilisateur",
            "entretien_done",
            "test_is_ok",
            "cv_statut",
            "cv_statut_display",
            "statut",
            "parcours_phase",
            "parcours_phase_display",
            "parcours_phase_calculee",
            "statut_metier_calcule",
            "statut_metier_display",
            "is_inscrit_valide",
            "is_en_formation_now",
            "is_stagiaire_role_aligned",
            "has_compte_utilisateur",
            "date_validation_inscription",
            "date_entree_formation_effective",
            "date_sortie_formation",
            "formation",
            "formation_info",
            "formation_nom",
            "formation_centre_nom",
            "formation_type_offre_nom",
            "formation_type_offre_libelle",
            "formation_num_offre",
            "formation_date_debut",
            "formation_date_fin",
            "evenement",
            "notes",
            "origine_sourcing",
            "date_inscription",
            "rqth",
            "type_contrat",
            "disponibilite",
            "permis_b",
            "communication",
            "experience",
            "csp",
            "vu_par",
            "vu_par_nom",
            "regime_social",
            "sportif_haut_niveau",
            "equivalence_jeunes",
            "extension_boe",
            "situation_actuelle",
            "dernier_diplome_prepare",
            "diplome_plus_eleve_obtenu",
            "derniere_classe",
            "intitule_diplome_prepare",
            "situation_avant_contrat",
            "projet_creation_entreprise",
            "representant_lien",
            "representant_nom_naissance",
            "representant_prenom",
            "representant_email",
            "representant_street_name",
            "representant_zip_code",
            "representant_city",
            "responsable_placement",
            "responsable_placement_nom",
            "date_placement",
            "entreprise_placement",
            "entreprise_placement_nom",
            "resultat_placement",
            "resultat_placement_display",
            "entreprise_validee",
            "entreprise_validee_nom",
            "contrat_signe",
            "inscrit_gespers",
            "en_accompagnement_tre",
            "en_appairage",
            "courrier_rentree",
            "date_rentree",
            "admissible",
            "numero_osia",
            "placement_appairage",
            "age",
            "nom_complet",
            "nb_appairages",
            "nb_prospections",
            "ateliers_resume",
            "ateliers_counts",
            "peut_modifier",
            "centre_id",
            "centre_nom",
            "last_appairage",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "is_active",
        ]

        read_only_fields = [
            "id",
            "date_inscription",
            "created_at",
            "updated_at",
            "age",
            "nom_complet",
            "nb_appairages",
            "nb_prospections",
            "role_utilisateur",
            "ateliers_resume",
            "peut_modifier",
            "cv_statut_display",
            "parcours_phase",
            "parcours_phase_display",
            "parcours_phase_calculee",
            "statut_metier_calcule",
            "statut_metier_display",
            "is_inscrit_valide",
            "is_en_formation_now",
            "is_stagiaire_role_aligned",
            "has_compte_utilisateur",
            "date_validation_inscription",
            "date_entree_formation_effective",
            "date_sortie_formation",
            "formation_info",
            "centre_nom",
            "centre_id",
            "last_appairage",
            "responsable_placement_nom",
            "entreprise_placement_nom",
            "entreprise_validee_nom",
            "vu_par_nom",
            "resultat_placement_display",
            "ateliers_counts",
            "formation_nom",
            "formation_centre_nom",
            "formation_type_offre_nom",
            "formation_type_offre_libelle",
            "formation_num_offre",
            "formation_date_debut",
            "formation_date_fin",
        ]

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_ateliers_counts(self, obj):
        return _ateliers_counts_for(obj)

    @extend_schema_field(str)
    def get_responsable_placement_nom(self, obj):
        return _user_display(getattr(obj, "responsable_placement", None))

    @extend_schema_field(str)
    def get_entreprise_placement_nom(self, obj):
        p = getattr(obj, "entreprise_placement", None)
        return getattr(p, "nom", None) if p else None

    @extend_schema_field(str)
    def get_entreprise_validee_nom(self, obj):
        p = getattr(obj, "entreprise_validee", None)
        return getattr(p, "nom", None) if p else None

    @extend_schema_field(str)
    def get_vu_par_nom(self, obj):
        return _user_display(getattr(obj, "vu_par", None))

    @extend_schema_field(str)
    def get_resultat_placement_display(self, obj):
        return obj.get_resultat_placement_display() if getattr(obj, "resultat_placement", None) else None

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_last_appairage(self, obj):
        last = _get_last_prefetched_appairage(obj)
        return AppairageLiteSerializer(last, context=self.context).data if last else None

    @extend_schema_field(str)
    def get_formation_date_debut(self, obj):
        f = getattr(obj, "formation", None)
        if not f:
            return None
        for name in ["date_debut", "date_rentree", "debut", "start_date", "startDate"]:
            val = getattr(f, name, None)
            if val:
                return val
        return None

    @extend_schema_field(str)
    def get_formation_date_fin(self, obj):
        f = getattr(obj, "formation", None)
        if not f:
            return None
        for name in ["date_fin", "fin", "end_date", "endDate"]:
            val = getattr(f, name, None)
            if val:
                return val
        return None

    @extend_schema_field(bool)
    def get_peut_modifier(self, instance):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        if not user:
            return False
        return user.role in ["admin", "superadmin", "staff"] or instance.compte_utilisateur == user

    def to_representation(self, instance):
        data = super().to_representation(instance)

        nom, prenom, nom_complet = _normalize_nom_prenom(instance)
        data["nom"] = nom
        data["prenom"] = prenom
        data["nom_complet"] = nom_complet

        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        is_staff_or_admin = user and user.role in ["staff", "admin", "superadmin"]

        reserved = [
            "notes",
            "resultat_placement",
            "responsable_placement",
            "date_placement",
            "entreprise_placement",
            "contrat_signe",
            "entreprise_validee",
            "courrier_rentree",
            "vu_par",
            "admissible",
            "inscrit_gespers",
            "en_accompagnement_tre",
            "en_appairage",
            "entretien_done",
            "test_is_ok",
            "communication",
            "experience",
            "csp",
            "nb_appairages",
            "nb_prospections",
        ]

        if not is_staff_or_admin:
            for f in reserved:
                data.pop(f, None)

        can_see_nir = user and (
            user.role in ["staff", "staff_read", "admin", "superadmin"]
            or getattr(instance, "compte_utilisateur_id", None) == user.id
        )
        if not can_see_nir:
            data.pop("nir", None)

        return data


@extend_schema_serializer()
class CandidatListSerializer(serializers.ModelSerializer):
    """Liste de candidats (read_only) ; masquage champs et NIR selon rôle, comme CandidatSerializer."""

    formation_info = FormationLiteSerializer(source="formation", read_only=True)
    last_appairage = serializers.SerializerMethodField()
    nom_complet = serializers.CharField(read_only=True)
    age = serializers.IntegerField(read_only=True)
    nb_appairages = serializers.IntegerField(source="nb_appairages_calc", read_only=True)
    nb_prospections = serializers.IntegerField(source="nb_prospections_calc", read_only=True)
    role_utilisateur = serializers.CharField(read_only=True)
    ateliers_resume = serializers.CharField(read_only=True)
    peut_modifier = serializers.SerializerMethodField()
    cv_statut_display = serializers.CharField(read_only=True)
    parcours_phase_display = serializers.CharField(read_only=True)
    parcours_phase_calculee = serializers.CharField(read_only=True)
    statut_metier_calcule = serializers.CharField(read_only=True)
    statut_metier_display = serializers.CharField(read_only=True)
    is_inscrit_valide = serializers.BooleanField(read_only=True)
    is_en_formation_now = serializers.BooleanField(read_only=True)
    has_compte_utilisateur = serializers.BooleanField(read_only=True)
    ateliers_counts = serializers.SerializerMethodField()
    centre_id = serializers.IntegerField(source="formation.centre_id", read_only=True)
    centre_nom = serializers.CharField(source="formation.centre.nom", read_only=True)

    responsable_placement_nom = serializers.SerializerMethodField()
    entreprise_placement_nom = serializers.SerializerMethodField()
    entreprise_validee_nom = serializers.SerializerMethodField()
    vu_par_nom = serializers.SerializerMethodField()
    resultat_placement_display = serializers.SerializerMethodField()

    class Meta:
        model = Candidat
        fields = [
            "id",
            "sexe",
            "nom_naissance",
            "nom",
            "prenom",
            "nom_complet",
            "date_naissance",
            "departement_naissance",
            "commune_naissance",
            "pays_naissance",
            "nationalite",
            "nir",
            "email",
            "telephone",
            "street_number",
            "street_name",
            "street_complement",
            "ville",
            "code_postal",
            "compte_utilisateur",
            "role_utilisateur",
            "statut",
            "parcours_phase",
            "parcours_phase_display",
            "parcours_phase_calculee",
            "statut_metier_calcule",
            "statut_metier_display",
            "is_inscrit_valide",
            "is_en_formation_now",
            "has_compte_utilisateur",
            "cv_statut",
            "cv_statut_display",
            "entretien_done",
            "test_is_ok",
            "formation",
            "formation_info",
            "centre_id",
            "centre_nom",
            "evenement",
            "notes",
            "origine_sourcing",
            "date_inscription",
            "rqth",
            "type_contrat",
            "disponibilite",
            "permis_b",
            "communication",
            "experience",
            "csp",
            "vu_par",
            "vu_par_nom",
            "regime_social",
            "sportif_haut_niveau",
            "equivalence_jeunes",
            "extension_boe",
            "situation_actuelle",
            "dernier_diplome_prepare",
            "diplome_plus_eleve_obtenu",
            "derniere_classe",
            "intitule_diplome_prepare",
            "situation_avant_contrat",
            "projet_creation_entreprise",
            "representant_lien",
            "representant_nom_naissance",
            "representant_prenom",
            "representant_email",
            "representant_street_name",
            "representant_zip_code",
            "representant_city",
            "responsable_placement",
            "responsable_placement_nom",
            "date_placement",
            "entreprise_placement",
            "entreprise_placement_nom",
            "resultat_placement",
            "resultat_placement_display",
            "entreprise_validee",
            "entreprise_validee_nom",
            "contrat_signe",
            "inscrit_gespers",
            "en_accompagnement_tre",
            "en_appairage",
            "courrier_rentree",
            "date_rentree",
            "admissible",
            "numero_osia",
            "placement_appairage",
            "age",
            "nb_appairages",
            "nb_prospections",
            "ateliers_resume",
            "ateliers_counts",
            "peut_modifier",
            "last_appairage",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "is_active",
        ]
        read_only_fields = tuple(fields)

    @extend_schema_field(str)
    def get_responsable_placement_nom(self, obj):
        return _user_display(obj.responsable_placement)

    @extend_schema_field(str)
    def get_entreprise_placement_nom(self, obj):
        return getattr(obj.entreprise_placement, "nom", None)

    @extend_schema_field(str)
    def get_entreprise_validee_nom(self, obj):
        return getattr(obj.entreprise_validee, "nom", None)

    @extend_schema_field(str)
    def get_vu_par_nom(self, obj):
        return _user_display(obj.vu_par)

    @extend_schema_field(str)
    def get_resultat_placement_display(self, obj):
        return obj.get_resultat_placement_display() if obj.resultat_placement else None

    @extend_schema_field(str)
    def get_last_appairage(self, obj):
        last = _get_last_prefetched_appairage(obj)
        return AppairageLiteSerializer(last, context=self.context).data if last else None

    @extend_schema_field(str)
    def get_ateliers_counts(self, obj):
        return _ateliers_counts_for(obj)

    @extend_schema_field(str)
    def get_peut_modifier(self, instance):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return user.role in ["admin", "superadmin", "staff"] or instance.compte_utilisateur == user

    def to_representation(self, instance):
        data = super().to_representation(instance)

        nom, prenom, nom_complet = _normalize_nom_prenom(instance)
        data["nom"] = nom
        data["prenom"] = prenom
        data["nom_complet"] = nom_complet

        user = getattr(self.context.get("request"), "user", None)
        is_staff_or_admin = user and user.role in ["staff", "admin", "superadmin"]

        if not is_staff_or_admin:
            RESERVED = [
                "notes",
                "resultat_placement",
                "responsable_placement",
                "date_placement",
                "entreprise_placement",
                "contrat_signe",
                "entreprise_validee",
                "courrier_rentree",
                "vu_par",
                "admissible",
                "inscrit_gespers",
                "en_accompagnement_tre",
                "en_appairage",
                "entretien_done",
                "test_is_ok",
                "communication",
                "experience",
                "csp",
                "nb_appairages",
                "nb_prospections",
            ]
            for f in RESERVED:
                data.pop(f, None)

        can_see_nir = user and (
            user.role in ["staff", "staff_read", "admin", "superadmin"]
            or getattr(instance, "compte_utilisateur_id", None) == user.id
        )
        if not can_see_nir:
            data.pop("nir", None)

        return data


class CandidatCreateUpdateSerializer(serializers.ModelSerializer):
    """Création/mise à jour candidat ; validate selon rôle (champs réservés, numero_osia, formation) ; pas de création compte ici."""

    compte_utilisateur = serializers.PrimaryKeyRelatedField(read_only=True)

    def run_validation(self, data=...):
        allowed = set(self.fields.keys())
        cleaned = {k: v for k, v in data.items() if k in allowed}
        cleaned = normalize_candidate_payload(cleaned)
        return super().run_validation(cleaned)

    class Meta:
        model = Candidat

        fields = [f.name for f in Candidat._meta.concrete_fields] + ["compte_utilisateur"]

        read_only_fields = [
            "id",
            "date_inscription",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "compte_utilisateur",
            "statut",
            "parcours_phase",
            "date_validation_inscription",
            "date_entree_formation_effective",
            "date_sortie_formation",
            "rgpd_creation_source",
            "rgpd_consent_obtained_at",
            "rgpd_consent_recorded_by",
            "rgpd_notice_sent_at",
            "rgpd_notice_sent_by",
            "rgpd_data_reviewed_at",
            "rgpd_data_reviewed_by",
        ]

    def create(self, validated_data):
        validated_data.pop("compte_utilisateur", None)
        self._apply_rgpd_defaults(validated_data)
        return super().create(validated_data)

    def validate(self, data):
        request = self.context.get("request")
        user = request.user if request else None

        if not request or not user or not user.is_authenticated:
            raise exceptions.PermissionDenied("Authentification requise.")

        restricted_fields = [
            "notes",
            "resultat_placement",
            "responsable_placement",
            "date_placement",
            "entreprise_placement",
            "contrat_signe",
            "entreprise_validee",
            "courrier_rentree",
            "vu_par",
        ]
        if user.role not in ["admin", "superadmin"]:
            for field in restricted_fields:
                if field in data:
                    raise serializers.ValidationError(
                        {field: "Ce champ ne peut être modifié que par un administrateur."}
                    )

        if user.role not in ["admin", "superadmin", "staff"]:
            for field in ["admissible", "inscrit_gespers", "en_accompagnement_tre", "en_appairage"]:
                if field in data:
                    raise serializers.ValidationError(
                        {field: "Ce champ ne peut être modifié que par un membre du staff."}
                    )

        if "numero_osia" in data:
            if user.role not in ["admin", "superadmin", "staff"]:
                raise serializers.ValidationError({"numero_osia": "Non autorisé."})

            if self.instance and self.instance.numero_osia and data["numero_osia"] != self.instance.numero_osia:
                raise serializers.ValidationError({"numero_osia": "Déjà attribué et non modifiable."})

        # Cohérence obligatoire entre contrat signé et OSIA
        contrat_signe_val = data.get("contrat_signe", getattr(self.instance, "contrat_signe", None))
        numero_osia_val = data.get("numero_osia", getattr(self.instance, "numero_osia", None))

        SIGNED_VALUES = {"oui", "signed", "valide"}

        if isinstance(contrat_signe_val, str) and contrat_signe_val.lower() in SIGNED_VALUES and not numero_osia_val:
            raise serializers.ValidationError({"numero_osia": "Requis quand le contrat est signé."})

        cu = getattr(self.instance, "compte_utilisateur", None)
        email = data.get("email") or getattr(self.instance, "email", None)

        if cu and not email:
            raise serializers.ValidationError({"email": "Un compte utilisateur nécessite une adresse email."})

        if self.instance is None and user.role in ["admin", "superadmin", "staff"]:
            if not data.get("rgpd_legal_basis"):
                raise serializers.ValidationError(
                    {"rgpd_legal_basis": "Ce champ est requis pour une création manuelle de fiche candidat."}
                )
            if (
                data.get("rgpd_legal_basis") == Candidat.RgpdLegalBasis.CONSENTEMENT
                and not data.get("rgpd_consent_obtained")
            ):
                raise serializers.ValidationError(
                    {"rgpd_consent_obtained": "Le consentement explicite est requis avec cette base légale."}
                )

        return data

    def update(self, instance, validated_data):
        validated_data.pop("compte_utilisateur", None)
        self._apply_rgpd_notice_tracking(validated_data)
        return super().update(instance, validated_data)

    def validate_formation(self, value):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        if not user or user.role not in ["admin", "superadmin", "staff"]:
            raise serializers.ValidationError("Seul le staff peut créer/modifier la formation d’un candidat.")

        return value

    def _apply_rgpd_defaults(self, validated_data):
        request = self.context.get("request")
        actor = request.user if request and request.user.is_authenticated else None

        validated_data.setdefault("rgpd_creation_source", Candidat.RgpdCreationSource.MANUAL_ADMIN)
        validated_data.setdefault("rgpd_notice_status", Candidat.RgpdNoticeStatus.A_NOTIFIER)
        validated_data.setdefault("rgpd_data_reviewed_at", timezone.now())
        if actor:
            validated_data.setdefault("rgpd_data_reviewed_by", actor)

        self._apply_rgpd_consent_tracking(validated_data, actor=actor)
        self._apply_rgpd_notice_tracking(validated_data, actor=actor)

    def _apply_rgpd_notice_tracking(self, validated_data, actor=None):
        request = self.context.get("request")
        if actor is None and request and request.user.is_authenticated:
            actor = request.user

        notice_status = validated_data.get("rgpd_notice_status")
        if notice_status == Candidat.RgpdNoticeStatus.NOTIFIEE:
            validated_data.setdefault("rgpd_notice_sent_at", timezone.now())
            if actor:
                validated_data.setdefault("rgpd_notice_sent_by", actor)

    def _apply_rgpd_consent_tracking(self, validated_data, actor=None):
        request = self.context.get("request")
        if actor is None and request and request.user.is_authenticated:
            actor = request.user

        if validated_data.get("rgpd_consent_obtained"):
            validated_data.setdefault("rgpd_consent_obtained_at", timezone.now())
            if actor:
                validated_data.setdefault("rgpd_consent_recorded_by", actor)


class LabelOrValueChoiceField(serializers.ChoiceField):
    """ChoiceField acceptant labels FR ou valeurs (insensible à la casse), pour UI/import CSV."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._label2value = self.build_label_map(self.choices)

    @staticmethod
    def _normalize_token(value):
        normalized = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii")
        normalized = normalized.lower().replace("/", " ").replace("-", " ")
        return " ".join(normalized.split())

    @classmethod
    def build_label_map(cls, choices):
        return {cls._normalize_token(label): value for value, label in choices.items()}

    @classmethod
    def resolve_choice(cls, raw_value, choices):
        if raw_value in choices:
            return raw_value
        return cls.build_label_map(choices).get(cls._normalize_token(raw_value), raw_value)

    def to_internal_value(self, data):
        s = str(data)
        if s in self.choices:
            return s
        v = self._label2value.get(self._normalize_token(s))
        if v is not None:
            return v
        return super().to_internal_value(data)


class CandidatQueryParamsSerializer(serializers.Serializer):
    """Query params filtrage candidats : value ou label, __in en CSV, alias camelCase."""

    statut = LabelOrValueChoiceField(choices=dict(Candidat.StatutCandidat.choices), required=False)
    parcours_phase = LabelOrValueChoiceField(choices=dict(Candidat.ParcoursPhase.choices), required=False)
    type_contrat = LabelOrValueChoiceField(choices=dict(Candidat.TypeContrat.choices), required=False)
    cv_statut = LabelOrValueChoiceField(choices=dict(Candidat.CVStatut.choices), required=False)

    contrat_signe = LabelOrValueChoiceField(choices=dict(Candidat.ContratSigne.choices), required=False)

    parcours_phase__in = serializers.CharField(required=False)
    parcoursPhase = serializers.CharField(required=False)
    contrat_signe__in = serializers.CharField(required=False)
    contratSigne = serializers.CharField(required=False)
    statut__in = serializers.CharField(required=False)
    type_contrat__in = serializers.CharField(required=False)
    cv_statut__in = serializers.CharField(required=False)
    typeContrat = serializers.CharField(required=False)
    cvStatut = serializers.CharField(required=False)

    def _labels_to_values(self, values, choices_dict):
        out = []
        for item in values:
            s = str(item)
            if s in choices_dict:
                out.append(s)
            else:
                out.append(LabelOrValueChoiceField.resolve_choice(s, choices_dict))
        return out

    def validate(self, attrs):
        if "typeContrat" in attrs and "type_contrat" not in attrs:
            attrs["type_contrat"] = attrs.pop("typeContrat")
        if "cvStatut" in attrs and "cv_statut" not in attrs:
            attrs["cv_statut"] = attrs.pop("cvStatut")
        if "parcoursPhase" in attrs and "parcours_phase" not in attrs:
            raw_phase = attrs.pop("parcoursPhase")
            attrs["parcours_phase"] = LabelOrValueChoiceField.resolve_choice(
                raw_phase,
                dict(Candidat.ParcoursPhase.choices),
            )
        if "contratSigne" in attrs and "contrat_signe" not in attrs:
            attrs["contrat_signe"] = attrs.pop("contratSigne")

        for key, choices in (
            ("statut__in", dict(Candidat.StatutCandidat.choices)),
            ("parcours_phase__in", dict(Candidat.ParcoursPhase.choices)),
            ("type_contrat__in", dict(Candidat.TypeContrat.choices)),
            ("cv_statut__in", dict(Candidat.CVStatut.choices)),
            ("contrat_signe__in", dict(Candidat.ContratSigne.choices)),
        ):
            if key in attrs and isinstance(attrs[key], str):
                raw = [x.strip() for x in attrs[key].split(",") if x.strip()]
                attrs[key] = self._labels_to_values(raw, choices)

        return attrs


class CandidatLiteSerializer(serializers.ModelSerializer):
    """Candidat compact pour modale/sélection : id, nom, prenom, formation, centre, compte_utilisateur (read_only)."""

    formation_nom = serializers.CharField(source="formation.nom", read_only=True)
    formation_num_offre = serializers.CharField(source="formation.num_offre", read_only=True)
    formation_type_offre = serializers.CharField(source="formation.type_offre.nom", read_only=True)
    centre_nom = serializers.CharField(source="formation.centre.nom", read_only=True)

    compte_utilisateur_id = serializers.IntegerField(source="compte_utilisateur.id", read_only=True)
    compte_utilisateur = serializers.SerializerMethodField()

    def get_compte_utilisateur(self, obj):
        cu = getattr(obj, "compte_utilisateur", None)
        if cu:
            return {
                "id": cu.id,
                "role": getattr(cu, "role", None),
                "is_active": getattr(cu, "is_active", None),
            }
        return None

    class Meta:
        model = Candidat
        fields = [
            "id",
            "nom",
            "prenom",
            "formation_nom",
            "formation_num_offre",
            "formation_type_offre",
            "centre_nom",
            "compte_utilisateur_id",
            "compte_utilisateur",
        ]
