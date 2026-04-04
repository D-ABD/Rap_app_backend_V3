"""Sérialiseurs et helpers métier autour des contrats CERFA."""

from __future__ import annotations

from typing import Any

from django.db import transaction
from rest_framework import serializers

from ...models import Candidat, CerfaContrat, Formation, Partenaire
from ...services.cerfa_mapping_service import sync_cerfa_choice_labels
from ...services.placement_services import AppairagePlacementService


CODE_TO_TEXT_FIELDS: tuple[tuple[str, str], ...] = (
    ("employeur_type_code", "employeur_type"),
    ("employeur_specifique_code", "employeur_specifique"),
    ("maitre1_niveau_diplome_code", "maitre1_niveau_diplome"),
    ("maitre2_niveau_diplome_code", "maitre2_niveau_diplome"),
    ("apprenti_nationalite_code", "apprenti_nationalite"),
    ("apprenti_regime_social_code", "apprenti_regime_social"),
    ("apprenti_situation_avant_code", "apprenti_situation_avant"),
    ("apprenti_dernier_diplome_prepare_code", "apprenti_dernier_diplome_prepare"),
    ("apprenti_derniere_annee_suivie_code", "apprenti_derniere_annee_suivie"),
    ("apprenti_plus_haut_diplome_code", "apprenti_plus_haut_diplome"),
    ("diplome_vise_code", "diplome_vise"),
    ("type_contrat_code", "type_contrat"),
    ("type_derogation_code", "type_derogation"),
)

PROFESSIONNALISATION_TYPE_CONTRAT_CODES = {"11", "12", "21", "22", "23", "24", "30"}


def _choice_label(field_name: str, code: Any) -> str | None:
    """Retourne le libellé humain d'un code CERFA à partir du champ ciblé."""
    if code in (None, "", "null", "undefined"):
        return None
    field = CerfaContrat._meta.get_field(field_name)
    return dict(field.flatchoices).get(str(code))


def _sync_choice_labels(values: dict[str, Any]) -> dict[str, Any]:
    """Hydrate les libellés snapshot du CERFA à partir des codes fournis."""
    if values.get("type_contrat_code") in (None, "", "null", "undefined"):
        raw_type_contrat = str(values.get("type_contrat") or "").strip().lower()
        if raw_type_contrat in {
            "apprentissage",
            "contrat apprentissage",
            "professionnalisation",
            "contrat de professionnalisation",
        }:
            values["type_contrat"] = None
    values = sync_cerfa_choice_labels(values, values.get("cerfa_type"))
    for code_field, text_field in CODE_TO_TEXT_FIELDS:
        code = values.get(code_field)
        label = _choice_label(code_field, code)
        if label and not values.get(text_field):
            values[text_field] = label
    return values


def _apply_updates(instance: Any, updates: dict[str, Any]) -> None:
    """Applique et persiste uniquement les champs effectivement modifiés."""
    dirty_fields: list[str] = []
    for field_name, value in updates.items():
        if not hasattr(instance, field_name):
            continue
        if value in (None, ""):
            continue
        if getattr(instance, field_name) != value:
            setattr(instance, field_name, value)
            dirty_fields.append(field_name)
    if dirty_fields:
        instance.save(update_fields=dirty_fields)


def _sync_candidat_from_cerfa(cerfa: CerfaContrat) -> None:
    """Synchronise les champs candidat à partir du CERFA courant."""
    candidat = cerfa.candidat
    if candidat is None:
        return

    updates = {
        "nom_naissance": cerfa.apprenti_nom_naissance or None,
        "nom": cerfa.apprenti_nom_usage or cerfa.apprenti_nom_naissance or None,
        "prenom": cerfa.apprenti_prenom or None,
        "nir": cerfa.apprenti_nir or None,
        "street_number": cerfa.apprenti_numero or None,
        "street_name": cerfa.apprenti_voie or None,
        "street_complement": cerfa.apprenti_complement or None,
        "code_postal": cerfa.apprenti_code_postal or None,
        "ville": cerfa.apprenti_commune or None,
        "telephone": cerfa.apprenti_telephone or None,
        "email": cerfa.apprenti_email or None,
        "date_naissance": cerfa.apprenti_date_naissance,
        "sexe": cerfa.apprenti_sexe,
        "departement_naissance": cerfa.apprenti_departement_naissance or None,
        "commune_naissance": cerfa.apprenti_commune_naissance or None,
        "nationalite_code": cerfa.apprenti_nationalite_code or None,
        "regime_social_code": cerfa.apprenti_regime_social_code or None,
        "inscrit_france_travail": (
            cerfa.apprenti_inscrit_france_travail
            if cerfa.apprenti_inscrit_france_travail is not None
            else bool(cerfa.apprenti_france_travail_numero)
        ),
        "numero_inscription_france_travail": cerfa.apprenti_france_travail_numero or None,
        "duree_inscription_france_travail_mois": cerfa.apprenti_france_travail_duree_mois,
        "sportif_haut_niveau": cerfa.apprenti_sportif_haut_niveau,
        "rqth": cerfa.apprenti_rqth,
        "equivalence_jeunes": cerfa.apprenti_equivalence_jeunes,
        "extension_boe": cerfa.apprenti_extension_boe,
        "situation_avant_contrat_code": cerfa.apprenti_situation_avant_code or None,
        "dernier_diplome_prepare_code": cerfa.apprenti_dernier_diplome_prepare_code or None,
        "derniere_classe_code": cerfa.apprenti_derniere_annee_suivie_code or None,
        "diplome_plus_eleve_obtenu_code": cerfa.apprenti_plus_haut_diplome_code or None,
        "intitule_diplome_prepare": cerfa.apprenti_intitule_dernier_diplome or None,
        "projet_creation_entreprise": cerfa.apprenti_projet_entreprise,
        "representant_nom_naissance": cerfa.representant_nom or None,
        "representant_lien": cerfa.representant_lien or None,
        "representant_street_name": cerfa.representant_adresse_voie or None,
        "representant_zip_code": cerfa.representant_code_postal or None,
        "representant_city": cerfa.representant_commune or None,
        "representant_email": cerfa.representant_email or None,
        "type_contrat_code": cerfa.type_contrat_code or None,
    }
    _apply_updates(candidat, updates)


def _sync_partenaire_from_cerfa(cerfa: CerfaContrat) -> None:
    """Synchronise les champs partenaire à partir du CERFA courant."""
    partenaire = cerfa.employeur
    if partenaire is None:
        return

    updates = {
        "nom": cerfa.employeur_nom or None,
        "street_number": cerfa.employeur_adresse_numero or None,
        "street_name": cerfa.employeur_adresse_voie or None,
        "street_complement": cerfa.employeur_adresse_complement or None,
        "zip_code": cerfa.employeur_code_postal or None,
        "city": cerfa.employeur_commune or None,
        "telephone": cerfa.employeur_telephone or None,
        "email": cerfa.employeur_email or None,
        "siret": cerfa.employeur_siret or None,
        "type_employeur_code": cerfa.employeur_type_code or None,
        "employeur_specifique_code": cerfa.employeur_specifique_code or None,
        "code_ape": cerfa.employeur_code_ape or None,
        "effectif_total": cerfa.employeur_effectif,
        "idcc": cerfa.employeur_code_idcc or None,
        "assurance_chomage_speciale": cerfa.employeur_regime_assurance_chomage,
        "maitre1_nom_naissance": cerfa.maitre1_nom or None,
        "maitre1_prenom": cerfa.maitre1_prenom or None,
        "maitre1_date_naissance": cerfa.maitre1_date_naissance,
        "maitre1_courriel": cerfa.maitre1_email or None,
        "maitre1_emploi_occupe": cerfa.maitre1_emploi or None,
        "maitre1_diplome_titre": cerfa.maitre1_diplome or None,
        "maitre1_niveau_diplome_code": cerfa.maitre1_niveau_diplome_code or None,
        "maitre2_nom_naissance": cerfa.maitre2_nom or None,
        "maitre2_prenom": cerfa.maitre2_prenom or None,
        "maitre2_date_naissance": cerfa.maitre2_date_naissance,
        "maitre2_courriel": cerfa.maitre2_email or None,
        "maitre2_emploi_occupe": cerfa.maitre2_emploi or None,
        "maitre2_diplome_titre": cerfa.maitre2_diplome or None,
        "maitre2_niveau_diplome_code": cerfa.maitre2_niveau_diplome_code or None,
    }
    _apply_updates(partenaire, updates)


def _sync_centre_from_cerfa(cerfa: CerfaContrat) -> None:
    """Synchronise le centre lié à partir des informations du CERFA."""
    formation = cerfa.formation
    centre = getattr(formation, "centre", None) if formation is not None else None
    if centre is None:
        return

    lieu_updates: dict[str, Any] = {}
    if cerfa.formation_lieu_denomination:
        lieu_updates["nom"] = cerfa.formation_lieu_denomination
    if cerfa.cfa_est_lieu_formation_principal:
        lieu_updates["numero_voie"] = cerfa.cfa_adresse_numero or None
        lieu_updates["nom_voie"] = cerfa.cfa_adresse_voie or None
        lieu_updates["complement_adresse"] = cerfa.cfa_adresse_complement or None
        lieu_updates["code_postal"] = cerfa.cfa_code_postal or None
        lieu_updates["commune"] = cerfa.cfa_commune or None
        lieu_updates["numero_uai_centre"] = cerfa.cfa_uai or None
        lieu_updates["siret_centre"] = cerfa.cfa_siret or None
    else:
        if cerfa.formation_lieu_denomination:
            lieu_updates["nom"] = cerfa.formation_lieu_denomination
        if cerfa.formation_lieu_voie is not None:
            lieu_updates["nom_voie"] = cerfa.formation_lieu_voie or None
        if cerfa.formation_lieu_code_postal is not None:
            lieu_updates["code_postal"] = cerfa.formation_lieu_code_postal or None
        if cerfa.formation_lieu_commune is not None:
            lieu_updates["commune"] = cerfa.formation_lieu_commune or None
        if cerfa.formation_lieu_uai is not None:
            lieu_updates["numero_uai_centre"] = cerfa.formation_lieu_uai or None
        if cerfa.formation_lieu_siret is not None:
            lieu_updates["siret_centre"] = cerfa.formation_lieu_siret or None

    cfa_updates = {
        "cfa_entreprise": cerfa.cfa_entreprise,
        "cfa_responsable_est_lieu_principal": cerfa.cfa_est_lieu_formation_principal,
        "cfa_responsable_denomination": cerfa.cfa_denomination or None,
        "cfa_responsable_uai": cerfa.cfa_uai or None,
        "cfa_responsable_siret": cerfa.cfa_siret or None,
        "cfa_responsable_numero": cerfa.cfa_adresse_numero or None,
        "cfa_responsable_voie": cerfa.cfa_adresse_voie or None,
        "cfa_responsable_complement": cerfa.cfa_adresse_complement or None,
        "cfa_responsable_code_postal": cerfa.cfa_code_postal or None,
        "cfa_responsable_commune": cerfa.cfa_commune or None,
        "organisme_declaration_activite": cerfa.organisme_declaration_activite or None,
    }
    _apply_updates(centre, {**lieu_updates, **cfa_updates})


def _sync_formation_from_cerfa(cerfa: CerfaContrat) -> None:
    """Synchronise certains champs de la formation liée au CERFA."""
    formation = cerfa.formation
    if formation is None:
        return

    updates = {
        "intitule_diplome": cerfa.diplome_intitule or cerfa.diplome_vise or None,
        "diplome_vise_code": cerfa.diplome_vise_code or None,
        "code_diplome": cerfa.code_diplome or None,
        "code_rncp": cerfa.code_rncp or None,
        "type_qualification_visee": cerfa.type_qualification_visee or None,
        "specialite_formation": cerfa.specialite_formation or None,
        "start_date": cerfa.formation_debut,
        "end_date": cerfa.formation_fin,
        "total_heures": cerfa.formation_duree_heures,
        "heures_enseignements_generaux": cerfa.formation_heures_enseignements,
        "heures_distanciel": cerfa.formation_distance_heures,
    }
    _apply_updates(formation, updates)
    _sync_centre_from_cerfa(cerfa)


def _sync_source_models_from_cerfa(cerfa: CerfaContrat) -> None:
    """Propage les corrections relues dans le CERFA vers les modèles source."""
    with transaction.atomic():
        _sync_candidat_from_cerfa(cerfa)
        _sync_partenaire_from_cerfa(cerfa)
        _sync_formation_from_cerfa(cerfa)


def _merge_prefill_data(
    *,
    validated_data: dict[str, Any],
    candidat_id: int | None,
    formation_id: int | None,
    employeur_id: int | None,
) -> dict[str, Any]:
    """Fusionne les données validées avec les préremplissages CERFA déduits."""
    def _as_int(value: Any) -> int | None:
        if value in (None, "", "null", "undefined"):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    legacy_date_debut_formation = validated_data.pop("date_debut_formation", None)
    if legacy_date_debut_formation and "formation_debut" not in validated_data:
        validated_data["formation_debut"] = legacy_date_debut_formation

    candidat_id = _as_int(candidat_id)
    formation_id = _as_int(formation_id)
    employeur_id = _as_int(employeur_id)

    candidat = (
        Candidat.objects.select_related(
            "compte_utilisateur",
            "formation",
            "formation__centre",
            "entreprise_placement",
            "entreprise_validee",
            "placement_appairage",
            "placement_appairage__partenaire",
        ).get(pk=candidat_id)
        if candidat_id
        else None
    )
    inferred_formation = None
    if formation_id:
        inferred_formation = Formation.objects.filter(pk=formation_id).first()
    elif candidat and getattr(candidat, "formation_id", None):
        inferred_formation = candidat.formation

    inferred_employeur = None
    if employeur_id:
        inferred_employeur = Partenaire.objects.filter(pk=employeur_id).first()
    elif candidat is not None:
        reference_appairage = AppairagePlacementService.get_preferred_appairage_for_candidate(candidat)
        inferred_employeur = getattr(reference_appairage, "partenaire", None)
        if inferred_employeur is None:
            inferred_employeur = getattr(candidat, "entreprise_validee", None)
        if inferred_employeur is None:
            inferred_employeur = getattr(candidat, "entreprise_placement", None)

    prefill = CerfaContrat.build_prefill_payload(
        candidat=candidat,
        formation=inferred_formation,
        partenaire=inferred_employeur,
    )

    merged = {**prefill, **validated_data}
    merged = _sync_choice_labels(merged)
    if "formation" not in merged and inferred_formation is not None:
        merged["formation"] = inferred_formation
    if "employeur" not in merged and inferred_employeur is not None:
        merged["employeur"] = inferred_employeur
    if candidat_id or formation_id or employeur_id:
        merged["auto_generated"] = True
    return merged


class CerfaContratSerializer(serializers.ModelSerializer):
    """Contrat principal de lecture/écriture des CERFA enrichi côté métier."""

    candidat = serializers.IntegerField(source="candidat_id", required=False, allow_null=True)
    formation = serializers.IntegerField(source="formation_id", required=False, allow_null=True)
    employeur = serializers.IntegerField(source="employeur_id", required=False, allow_null=True)

    pdf_url = serializers.SerializerMethodField()
    pdf_status = serializers.SerializerMethodField()
    missing_fields = serializers.SerializerMethodField()
    created_by_nom = serializers.SerializerMethodField()
    updated_by_nom = serializers.SerializerMethodField()

    class Meta:
        model = CerfaContrat
        fields = "__all__"

    def get_pdf_url(self, obj: CerfaContrat) -> str | None:
        request = self.context.get("request")
        if not obj.pdf_fichier:
            return None
        url = obj.pdf_fichier.url
        return request.build_absolute_uri(url) if request is not None else url

    def get_pdf_status(self, obj: CerfaContrat) -> str:
        return "ready" if obj.pdf_fichier else "missing"

    def get_missing_fields(self, obj: CerfaContrat) -> list[str]:
        required_pairs = {
            "apprenti_nom_naissance": obj.apprenti_nom_naissance,
            "apprenti_prenom": obj.apprenti_prenom,
            "employeur_nom": obj.employeur_nom,
            "diplome_vise": obj.diplome_vise or obj.diplome_intitule,
            "date_conclusion": obj.date_conclusion,
        }
        return [label for label, value in required_pairs.items() if value in (None, "")]

    def _user_label(self, user: Any) -> str | None:
        if not user:
            return None
        full_name_getter = getattr(user, "get_full_name", None)
        if callable(full_name_getter):
            full_name = (full_name_getter() or "").strip()
            if full_name:
                return full_name
        for attr in ("username", "email"):
            value = getattr(user, attr, None)
            if value:
                return value
        return str(user)

    def get_created_by_nom(self, obj: CerfaContrat) -> str | None:
        return self._user_label(getattr(obj, "created_by", None))

    def get_updated_by_nom(self, obj: CerfaContrat) -> str | None:
        return self._user_label(getattr(obj, "updated_by", None))

    def to_representation(self, instance: CerfaContrat) -> dict[str, Any]:
        data = super().to_representation(instance)
        data = _sync_choice_labels(data)
        diplome_source = data.get("diplome_vise") or data.get("diplome_intitule")
        if diplome_source:
            data["diplome_vise"] = data.get("diplome_vise") or diplome_source
            data["diplome_intitule"] = data.get("diplome_intitule") or diplome_source
        return data

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        cerfa_type = attrs.get("cerfa_type", getattr(self.instance, "cerfa_type", None))
        type_contrat_code = attrs.get("type_contrat_code", getattr(self.instance, "type_contrat_code", None))
        if cerfa_type == "professionnalisation":
            if type_contrat_code not in (None, "", "null", "undefined"):
                if str(type_contrat_code) not in PROFESSIONNALISATION_TYPE_CONTRAT_CODES:
                    raise serializers.ValidationError(
                        {
                            "type_contrat_code": (
                                "Pour un CERFA professionnalisation, le type de contrat doit etre "
                                "parmi 11, 12, 21, 22, 23, 24 ou 30."
                            )
                        }
                    )
        return attrs

    def create(self, validated_data: dict[str, Any]) -> CerfaContrat:
        candidat_id = validated_data.pop("candidat_id", None)
        formation_id = validated_data.pop("formation_id", None)
        employeur_id = validated_data.pop("employeur_id", None)
        candidat_obj = Candidat.objects.filter(pk=candidat_id).first() if candidat_id else None
        merged = _merge_prefill_data(
            validated_data=validated_data,
            candidat_id=candidat_id,
            formation_id=formation_id,
            employeur_id=employeur_id,
        )
        inferred_formation = (
            Formation.objects.filter(pk=formation_id).first()
            if formation_id
            else getattr(candidat_obj, "formation", None)
        )
        inferred_employeur = (
            Partenaire.objects.filter(pk=employeur_id).first()
            if employeur_id
            else merged.get("employeur")
        )
        merged["candidat"] = candidat_obj
        merged["formation"] = inferred_formation
        merged["employeur"] = inferred_employeur
        request = self.context.get("request")
        if request is not None and getattr(request, "user", None) and request.user.is_authenticated:
            merged["created_by"] = request.user
            merged["updated_by"] = request.user
        instance = CerfaContrat.objects.create(**merged)
        _sync_source_models_from_cerfa(instance)
        return instance

    def update(self, instance: CerfaContrat, validated_data: dict[str, Any]) -> CerfaContrat:
        raw_candidat_id = validated_data.pop("candidat_id", None)
        raw_formation_id = validated_data.pop("formation_id", None)
        raw_employeur_id = validated_data.pop("employeur_id", None)
        candidat_id = raw_candidat_id if raw_candidat_id is not None else getattr(instance.candidat, "pk", None)
        formation_id = raw_formation_id if raw_formation_id is not None else getattr(instance.formation, "pk", None)
        employeur_id = raw_employeur_id if raw_employeur_id is not None else getattr(instance.employeur, "pk", None)
        candidat_obj = Candidat.objects.filter(pk=candidat_id).first() if candidat_id else None
        formation_obj = (
            Formation.objects.filter(pk=formation_id).first()
            if formation_id
            else getattr(candidat_obj, "formation", None)
        )
        employeur_obj = Partenaire.objects.filter(pk=employeur_id).first() if employeur_id else None
        merged = _merge_prefill_data(
            validated_data=validated_data,
            candidat_id=candidat_id,
            formation_id=formation_id,
            employeur_id=employeur_id,
        )
        if raw_candidat_id is not None:
            merged["candidat"] = candidat_obj
        if raw_formation_id is not None:
            merged["formation"] = formation_obj
        elif "formation" not in merged and instance.formation_id:
            merged["formation"] = instance.formation
        if raw_employeur_id is not None:
            merged["employeur"] = employeur_obj
        elif "employeur" not in merged and instance.employeur_id:
            merged["employeur"] = instance.employeur
        request = self.context.get("request")
        if request is not None and getattr(request, "user", None) and request.user.is_authenticated:
            merged["updated_by"] = request.user
        for field, value in merged.items():
            setattr(instance, field, value)
        instance.save()
        _sync_source_models_from_cerfa(instance)
        return instance
