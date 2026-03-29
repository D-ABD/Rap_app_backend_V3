"""Services de traduction entre source métier et snapshots CERFA.

Le but est de permettre deux nomenclatures distinctes :

- apprentissage
- professionnalisation

Sans forcer les modeles source a stocker directement les codes finaux de chaque
CERFA. La couche de mapping traduit une valeur source en snapshot final
(`code` + `libelle`) selon le type de contrat.
"""

from __future__ import annotations

from typing import Any

from ..models.cerfa_codes import (
    CerfaDerniereClasseCode,
    CerfaDiplomeCode,
    CerfaEmployeurSpecifiqueCode,
    CerfaMaitreNiveauDiplomeCode,
    CerfaNationaliteCode,
    CerfaRegimeSocialCode,
    CerfaSituationAvantContratCode,
    CerfaTypeContratCode,
    CerfaTypeDerogationCode,
    CerfaTypeEmployeurCode,
)


GENERIC_CONTRACT_FAMILY_LABELS = {
    "apprentissage",
    "contrat apprentissage",
    "professionnalisation",
    "contrat de professionnalisation",
}


DEFAULT_CODE_CHOICES: dict[str, dict[str, str]] = {
    "employeur_type_code": dict(CerfaTypeEmployeurCode.choices),
    "employeur_specifique_code": dict(CerfaEmployeurSpecifiqueCode.choices),
    "maitre1_niveau_diplome_code": dict(CerfaMaitreNiveauDiplomeCode.choices),
    "maitre2_niveau_diplome_code": dict(CerfaMaitreNiveauDiplomeCode.choices),
    "apprenti_nationalite_code": dict(CerfaNationaliteCode.choices),
    "apprenti_regime_social_code": dict(CerfaRegimeSocialCode.choices),
    "apprenti_situation_avant_code": dict(CerfaSituationAvantContratCode.choices),
    "apprenti_dernier_diplome_prepare_code": dict(CerfaDiplomeCode.choices),
    "apprenti_derniere_annee_suivie_code": dict(CerfaDerniereClasseCode.choices),
    "apprenti_plus_haut_diplome_code": dict(CerfaDiplomeCode.choices),
    "diplome_vise_code": dict(CerfaDiplomeCode.choices),
    "type_contrat_code": dict(CerfaTypeContratCode.choices),
    "type_derogation_code": dict(CerfaTypeDerogationCode.choices),
}

CODE_TEXT_FIELD_MAP: dict[str, str] = {
    "employeur_type_code": "employeur_type",
    "employeur_specifique_code": "employeur_specifique",
    "maitre1_niveau_diplome_code": "maitre1_niveau_diplome",
    "maitre2_niveau_diplome_code": "maitre2_niveau_diplome",
    "apprenti_nationalite_code": "apprenti_nationalite",
    "apprenti_regime_social_code": "apprenti_regime_social",
    "apprenti_situation_avant_code": "apprenti_situation_avant",
    "apprenti_dernier_diplome_prepare_code": "apprenti_dernier_diplome_prepare",
    "apprenti_derniere_annee_suivie_code": "apprenti_derniere_annee_suivie",
    "apprenti_plus_haut_diplome_code": "apprenti_plus_haut_diplome",
    "diplome_vise_code": "diplome_vise",
    "type_contrat_code": "type_contrat",
    "type_derogation_code": "type_derogation",
}


# Socle de divergence future : les deux tables peuvent être enrichies sans
# toucher aux modèles métier ni au PDF.
CERFA_TYPE_OVERRIDES: dict[str, dict[str, dict[str, dict[str, str]]]] = {
    "apprentissage": {},
    "professionnalisation": {
        "apprenti_situation_avant_code": {
            "1": {"code": "1", "label": "1 - Scolaire"},
            "3": {"code": "3", "label": "3 - Etudiant"},
            "4": {"code": "4", "label": "4 - Contrat d'apprentissage"},
            "5": {"code": "5", "label": "5 - Contrat de professionnalisation"},
            "6": {"code": "6", "label": "6 - Salarie en contrat aide : CUI-CIE, CUI-CAE"},
            "7": {"code": "7", "label": "7 - Stagiaire de la formation professionnelle"},
            "8": {"code": "7", "label": "7 - Stagiaire de la formation professionnelle"},
            "9": {"code": "7", "label": "7 - Stagiaire de la formation professionnelle"},
            "10": {"code": "8", "label": "8 - Salarie"},
            "11": {"code": "9", "label": "9 - Personne a la recherche d'un emploi"},
            "12": {"code": "10", "label": "10 - Inactif"},
        },
        "apprenti_dernier_diplome_prepare_code": {
            "10": {"code": "10", "label": "10 - Doctorat"},
            "11": {"code": "11", "label": "11 - Master 2 professionnel / DESS / diplome grande ecole"},
            "12": {"code": "12", "label": "12 - Master 2 recherche / DEA"},
            "13": {"code": "60", "label": "60 - Aucun diplome ni titre professionnel"},
            "19": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "21": {"code": "21", "label": "21 - Master 1 professionnel"},
            "22": {"code": "22", "label": "22 - Master 1 general"},
            "23": {"code": "23", "label": "23 - Licence professionnelle"},
            "24": {"code": "24", "label": "24 - Licence generale"},
            "29": {"code": "29", "label": "29 - Autre diplome ou titre de niveau bac +3 ou 4"},
            "31": {"code": "31", "label": "31 - Brevet de Technicien Superieur"},
            "32": {"code": "32", "label": "32 - Diplome Universitaire de technologie"},
            "33": {"code": "51", "label": "51 - CAP"},
            "34": {"code": "52", "label": "52 - BEP"},
            "35": {"code": "53", "label": "53 - Mention complementaire"},
            "38": {"code": "59", "label": "59 - Autre diplome ou titre de niveau CAP/BEP"},
            "39": {"code": "39", "label": "39 - Autre diplome ou titre de niveau bac +2"},
            "41": {"code": "41", "label": "41 - Baccalaureat professionnel"},
            "42": {"code": "42", "label": "42 - Baccalaureat general"},
            "43": {"code": "43", "label": "43 - Baccalaureat technologique"},
            "49": {"code": "49", "label": "49 - Autre diplome ou titre de niveau bac"},
            "51": {"code": "51", "label": "51 - CAP"},
            "52": {"code": "52", "label": "52 - BEP"},
            "53": {"code": "53", "label": "53 - Mention complementaire"},
            "54": {"code": "31", "label": "31 - Brevet de Technicien Superieur"},
            "55": {"code": "32", "label": "32 - Diplome Universitaire de technologie"},
            "58": {"code": "39", "label": "39 - Autre diplome ou titre de niveau bac +2"},
            "59": {"code": "59", "label": "59 - Autre diplome ou titre de niveau CAP/BEP"},
            "60": {"code": "60", "label": "60 - Aucun diplome ni titre professionnel"},
            "62": {"code": "23", "label": "23 - Licence professionnelle"},
            "63": {"code": "24", "label": "24 - Licence generale"},
            "69": {"code": "29", "label": "29 - Autre diplome ou titre de niveau bac +3 ou 4"},
            "73": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "75": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "76": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "79": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "80": {"code": "10", "label": "10 - Doctorat"},
        },
        "apprenti_plus_haut_diplome_code": {
            "10": {"code": "10", "label": "10 - Doctorat"},
            "11": {"code": "11", "label": "11 - Master 2 professionnel / DESS / diplome grande ecole"},
            "12": {"code": "12", "label": "12 - Master 2 recherche / DEA"},
            "13": {"code": "60", "label": "60 - Aucun diplome ni titre professionnel"},
            "19": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "21": {"code": "21", "label": "21 - Master 1 professionnel"},
            "22": {"code": "22", "label": "22 - Master 1 general"},
            "23": {"code": "23", "label": "23 - Licence professionnelle"},
            "24": {"code": "24", "label": "24 - Licence generale"},
            "29": {"code": "29", "label": "29 - Autre diplome ou titre de niveau bac +3 ou 4"},
            "31": {"code": "31", "label": "31 - Brevet de Technicien Superieur"},
            "32": {"code": "32", "label": "32 - Diplome Universitaire de technologie"},
            "33": {"code": "51", "label": "51 - CAP"},
            "34": {"code": "52", "label": "52 - BEP"},
            "35": {"code": "53", "label": "53 - Mention complementaire"},
            "38": {"code": "59", "label": "59 - Autre diplome ou titre de niveau CAP/BEP"},
            "39": {"code": "39", "label": "39 - Autre diplome ou titre de niveau bac +2"},
            "41": {"code": "41", "label": "41 - Baccalaureat professionnel"},
            "42": {"code": "42", "label": "42 - Baccalaureat general"},
            "43": {"code": "43", "label": "43 - Baccalaureat technologique"},
            "49": {"code": "49", "label": "49 - Autre diplome ou titre de niveau bac"},
            "51": {"code": "51", "label": "51 - CAP"},
            "52": {"code": "52", "label": "52 - BEP"},
            "53": {"code": "53", "label": "53 - Mention complementaire"},
            "54": {"code": "31", "label": "31 - Brevet de Technicien Superieur"},
            "55": {"code": "32", "label": "32 - Diplome Universitaire de technologie"},
            "58": {"code": "39", "label": "39 - Autre diplome ou titre de niveau bac +2"},
            "59": {"code": "59", "label": "59 - Autre diplome ou titre de niveau CAP/BEP"},
            "60": {"code": "60", "label": "60 - Aucun diplome ni titre professionnel"},
            "62": {"code": "23", "label": "23 - Licence professionnelle"},
            "63": {"code": "24", "label": "24 - Licence generale"},
            "69": {"code": "29", "label": "29 - Autre diplome ou titre de niveau bac +3 ou 4"},
            "73": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "75": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "76": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "79": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "80": {"code": "10", "label": "10 - Doctorat"},
        },
        "diplome_vise_code": {
            "10": {"code": "10", "label": "10 - Doctorat"},
            "11": {"code": "11", "label": "11 - Master 2 professionnel / DESS / diplome grande ecole"},
            "12": {"code": "12", "label": "12 - Master 2 recherche / DEA"},
            "13": {"code": "60", "label": "60 - Aucun diplome ni titre professionnel"},
            "19": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "21": {"code": "21", "label": "21 - Master 1 professionnel"},
            "22": {"code": "22", "label": "22 - Master 1 general"},
            "23": {"code": "23", "label": "23 - Licence professionnelle"},
            "24": {"code": "24", "label": "24 - Licence generale"},
            "29": {"code": "29", "label": "29 - Autre diplome ou titre de niveau bac +3 ou 4"},
            "31": {"code": "31", "label": "31 - Brevet de Technicien Superieur"},
            "32": {"code": "32", "label": "32 - Diplome Universitaire de technologie"},
            "33": {"code": "51", "label": "51 - CAP"},
            "34": {"code": "52", "label": "52 - BEP"},
            "35": {"code": "53", "label": "53 - Mention complementaire"},
            "38": {"code": "59", "label": "59 - Autre diplome ou titre de niveau CAP/BEP"},
            "39": {"code": "39", "label": "39 - Autre diplome ou titre de niveau bac +2"},
            "41": {"code": "41", "label": "41 - Baccalaureat professionnel"},
            "42": {"code": "42", "label": "42 - Baccalaureat general"},
            "43": {"code": "43", "label": "43 - Baccalaureat technologique"},
            "49": {"code": "49", "label": "49 - Autre diplome ou titre de niveau bac"},
            "51": {"code": "51", "label": "51 - CAP"},
            "52": {"code": "52", "label": "52 - BEP"},
            "53": {"code": "53", "label": "53 - Mention complementaire"},
            "54": {"code": "31", "label": "31 - Brevet de Technicien Superieur"},
            "55": {"code": "32", "label": "32 - Diplome Universitaire de technologie"},
            "58": {"code": "39", "label": "39 - Autre diplome ou titre de niveau bac +2"},
            "59": {"code": "59", "label": "59 - Autre diplome ou titre de niveau CAP/BEP"},
            "60": {"code": "60", "label": "60 - Aucun diplome ni titre professionnel"},
            "62": {"code": "23", "label": "23 - Licence professionnelle"},
            "63": {"code": "24", "label": "24 - Licence generale"},
            "69": {"code": "29", "label": "29 - Autre diplome ou titre de niveau bac +3 ou 4"},
            "73": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "75": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "76": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "79": {"code": "19", "label": "19 - Autre diplome ou titre de niveau bac +5 ou plus"},
            "80": {"code": "10", "label": "10 - Doctorat"},
        },
        "type_contrat_code": {
            "11": {"code": "11", "label": "11 - Contrat initial (cas general)"},
            "12": {
                "code": "12",
                "label": (
                    "12 - Contrat initial conclu conjointement avec deux employeurs pour "
                    "l'exercice d'une activite saisonniere"
                ),
            },
            "21": {"code": "21", "label": "21 - Nouveau contrat en raison de l'echec aux epreuves d'evaluation"},
            "22": {"code": "22", "label": "22 - Nouveau contrat en raison de la defaillance de l'organisme de formation"},
            "23": {
                "code": "23",
                "label": "23 - Nouveau contrat en raison de la maternite, de la maladie ou d'un accident de travail",
            },
            "24": {
                "code": "24",
                "label": "24 - Nouveau contrat pour l'obtention d'une qualification superieure ou complementaire",
            },
            "30": {"code": "30", "label": "30 - Avenant"},
        },
    },
}

# Certains champs apprentissage ne doivent pas etre auto-traduits ni
# pre-remplis tels quels dans le CERFA professionnalisation tant que leur
# nomenclature propre n'est pas encore stabilisee.
PROFESSIONNALISATION_MANUAL_CODE_FIELDS = {
    "apprenti_situation_avant_code",
    "apprenti_plus_haut_diplome_code",
    "diplome_vise_code",
    "type_contrat_code",
}


def normalize_cerfa_type(cerfa_type: Any) -> str:
    return "professionnalisation" if str(cerfa_type or "").lower() == "professionnalisation" else "apprentissage"


def _normalize_generic_label(value: Any) -> str:
    return str(value or "").strip().lower()


def resolve_cerfa_value(
    cerfa_type: Any,
    code_field: str,
    code: Any,
    current_label: Any = None,
) -> dict[str, str] | None:
    if code in (None, "", "null", "undefined"):
        return None
    normalized_type = normalize_cerfa_type(cerfa_type)
    code_str = str(code)
    sanitized_label = current_label
    if (
        code_field == "type_contrat_code"
        and _normalize_generic_label(current_label) in GENERIC_CONTRACT_FAMILY_LABELS
    ):
        sanitized_label = None

    override_map = CERFA_TYPE_OVERRIDES.get(normalized_type, {}).get(code_field, {})
    if code_str in override_map:
        resolved = override_map[code_str]
        return {
            "code": resolved.get("code", code_str),
            "label": resolved.get("label", str(sanitized_label or code_str)),
        }

    if normalized_type == "professionnalisation" and code_field in PROFESSIONNALISATION_MANUAL_CODE_FIELDS:
        # Tant que la table "pro" n'est pas stabilisee pour ce code, on
        # conserve la saisie manuelle du snapshot si elle existe deja.
        return {
            "code": code_str,
            "label": str(sanitized_label or code_str),
        }

    default_label = DEFAULT_CODE_CHOICES.get(code_field, {}).get(code_str)
    if default_label:
        return {"code": code_str, "label": default_label}

    if sanitized_label not in (None, "", "null", "undefined"):
        return {"code": code_str, "label": str(sanitized_label)}

    return {"code": code_str, "label": code_str}


def resolve_cerfa_label(cerfa_type: Any, code_field: str, code: Any, current_label: Any = None) -> str | None:
    resolved = resolve_cerfa_value(cerfa_type, code_field, code, current_label=current_label)
    return resolved["label"] if resolved else None


def sync_cerfa_choice_labels(values: dict[str, Any], cerfa_type: Any = None) -> dict[str, Any]:
    """Hydrate les snapshots `code + libelle` pour le type de CERFA donne."""
    normalized_type = normalize_cerfa_type(cerfa_type or values.get("cerfa_type"))
    values["cerfa_type"] = normalized_type

    for code_field, text_field in CODE_TEXT_FIELD_MAP.items():
        code = values.get(code_field)
        resolved = resolve_cerfa_value(normalized_type, code_field, code, current_label=values.get(text_field))
        if resolved:
            values[code_field] = resolved["code"]
            values[text_field] = resolved["label"]

    return values
