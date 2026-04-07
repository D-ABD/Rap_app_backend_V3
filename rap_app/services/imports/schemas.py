"""
Constantes de schéma pour l'import / export Excel (référentiels Lot 1, partenaires Lot 2).

Les valeurs ``resource`` sont alignées sur le plan REFACTOR_IMPORT_EXPORT (§2.4.1).
Les listes de colonnes servent de **source de vérité** Lot 0 (§2.5.1 / §2.5.3).
"""

from __future__ import annotations

from typing import Final

#: Version incrémentée lorsque les colonnes ou la sémantique d'une ressource Lot 1 change.
SCHEMA_VERSION_LOT1: int = 1

#: Identifiant canonique pour les centres (feuille Meta, réponses JSON).
RESOURCE_CENTRE: str = "centre"

#: Identifiant canonique pour les types d'offre.
RESOURCE_TYPE_OFFRE: str = "type_offre"

#: Identifiant canonique pour les statuts de formation.
RESOURCE_STATUT: str = "statut"

#: Identifiant canonique pour les partenaires (Lot 2).
RESOURCE_PARTENAIRE: str = "partenaire"

#: Identifiant canonique pour les formations (Lot 3).
RESOURCE_FORMATION: str = "formation"

#: Identifiant canonique pour les documents (Lot 3 — métadonnées, import §2.10.1).
RESOURCE_DOCUMENT: str = "document"

#: Identifiant canonique pour les candidats (Lot 4).
RESOURCE_CANDIDAT: str = "candidat"

#: Identifiant canonique pour la CVThèque (Lot 4 — métadonnées, import §2.10.1).
RESOURCE_CVTHEQUE: str = "cvtheque"

# --- Colonnes Lot 1 (ordre d'export / template) — §2.5 ---

CENTRE_COLUMNS: Final[list[str]] = [
    "id",
    "is_active",
    "nom",
    "numero_voie",
    "nom_voie",
    "complement_adresse",
    "code_postal",
    "commune",
    "numero_uai_centre",
    "siret_centre",
    "organisme_declaration_activite",
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
]

TYPE_OFFRE_COLUMNS: Final[list[str]] = ["id", "nom", "autre", "couleur"]

STATUT_COLUMNS: Final[list[str]] = ["id", "nom", "couleur", "description_autre"]

# Lot 2 — aligné sur ``PartenaireSerializer`` (champs écritables + ``id`` pour upsert).
PARTENAIRE_COLUMNS: Final[list[str]] = [
    "id",
    "nom",
    "type",
    "secteur_activite",
    "street_number",
    "street_name",
    "street_complement",
    "zip_code",
    "city",
    "country",
    "telephone",
    "email",
    "contact_nom",
    "contact_poste",
    "contact_telephone",
    "contact_email",
    "website",
    "social_network_url",
    "actions",
    "action_description",
    "description",
    "siret",
    "type_employeur_code",
    "employeur_specifique_code",
    "code_ape",
    "effectif_total",
    "idcc",
    "assurance_chomage_speciale",
    "maitre1_nom_naissance",
    "maitre1_prenom",
    "maitre1_date_naissance",
    "maitre1_courriel",
    "maitre1_emploi_occupe",
    "maitre1_diplome_titre",
    "maitre1_niveau_diplome_code",
    "maitre2_nom_naissance",
    "maitre2_prenom",
    "maitre2_date_naissance",
    "maitre2_courriel",
    "maitre2_emploi_occupe",
    "maitre2_diplome_titre",
    "maitre2_niveau_diplome_code",
    "default_centre_id",
]

# Lot 3 — ``BaseFormationWriteSerializer`` + ``activite`` + M2M (ids séparés par virgule).
FORMATION_COLUMNS: Final[list[str]] = [
    "id",
    "nom",
    "activite",
    "centre_id",
    "type_offre_id",
    "statut_id",
    "num_kairos",
    "num_offre",
    "num_produit",
    "start_date",
    "end_date",
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
    "nombre_candidats",
    "nombre_entretiens",
    "convocation_envoie",
    "partenaire_ids",
]

# Métadonnées exportables / template Document (pas de binaire dans la feuille).
DOCUMENT_COLUMNS: Final[list[str]] = [
    "id",
    "formation_id",
    "nom_fichier",
    "type_document",
    "source",
    "taille_fichier",
    "mime_type",
    "fichier_storage_path",
]

# Métadonnées CVThèque (fichier = chemin logique export ; import non supporté §2.10.1).
CVTHEQUE_COLUMNS: Final[list[str]] = [
    "id",
    "candidat_id",
    "document_type",
    "titre",
    "fichier_storage_path",
    "est_public",
    "mots_cles",
    "consentement_stockage_cv",
    "consentement_transmission_cv",
    "date_depot",
    "is_active",
]

LOT1_RESOURCE_COLUMNS: Final[dict[str, list[str]]] = {
    RESOURCE_CENTRE: list(CENTRE_COLUMNS),
    RESOURCE_TYPE_OFFRE: list(TYPE_OFFRE_COLUMNS),
    RESOURCE_STATUT: list(STATUT_COLUMNS),
    RESOURCE_PARTENAIRE: list(PARTENAIRE_COLUMNS),
    RESOURCE_FORMATION: list(FORMATION_COLUMNS),
    RESOURCE_DOCUMENT: list(DOCUMENT_COLUMNS),
    RESOURCE_CVTHEQUE: list(CVTHEQUE_COLUMNS),
}


def lot1_expected_columns(resource: str) -> set[str]:
    """Ensemble des noms de colonnes attendus sur la feuille Données pour une ressource Lot 1."""
    cols = LOT1_RESOURCE_COLUMNS.get(resource)
    if cols is None:
        return set()
    return set(cols)


#: Champs système / audit — **non importables** via Excel métier (§2.5.3).
FORBIDDEN_IMPORT_COLUMN_NAMES: Final[frozenset[str]] = frozenset(
    {
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    }
)

# Taxonomie §2.8.2 — erreurs de **ligne** (handlers) et clés utiles pour les tests.
ERR_REQUIRED: Final[str] = "required"
ERR_INVALID: Final[str] = "invalid"
ERR_NOT_FOUND: Final[str] = "not_found"
ERR_OUT_OF_SCOPE: Final[str] = "out_of_scope"
ERR_CONFLICT: Final[str] = "conflict"
ERR_NOT_SUPPORTED: Final[str] = "not_supported"

# Taxonomie §2.8.2 — erreurs **fichier** (ValidationError / API 400, clé ``code``).
ERR_SCHEMA_MISMATCH: Final[str] = "schema_mismatch"
ERR_UNKNOWN_COLUMNS: Final[str] = "unknown_columns"
ERR_FILE_TOO_LARGE: Final[str] = "file_too_large"
ERR_INVALID_FILE: Final[str] = "invalid_file"
# Durée max d’analyse après ouverture du classeur (itération des lignes) — §2.7 / excel_io.
ERR_PARSE_TIMEOUT: Final[str] = "parse_timeout"
