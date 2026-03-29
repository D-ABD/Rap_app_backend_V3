from typing import Any, Dict, Optional

from django.conf import settings
from django.db import models

from ..services.cerfa_mapping_service import sync_cerfa_choice_labels
from .cerfa_codes import (
    CerfaDerniereClasseCode,
    CerfaDiplomeCode,
    CerfaEmployeurSpecifiqueCode,
    CerfaMaitreNiveauDiplomeCode,
    CerfaNationaliteCode,
    CerfaNsfSpecialiteCode,
    CerfaProTypeQualificationViseeCode,
    CerfaRegimeSocialCode,
    CerfaSituationAvantContratCode,
    CerfaTypeContratCode,
    CerfaTypeDerogationCode,
    CerfaTypeEmployeurCode,
)


CERFA_AUTOFILL_SOURCES: Dict[str, Dict[str, str]] = {
    # Employeur / entreprise
    "employeur_nom": {"source": "partenaire.nom"},
    "employeur_adresse_numero": {"source": "partenaire.street_number"},
    "employeur_adresse_voie": {"source": "partenaire.street_name"},
    "employeur_adresse_complement": {"source": "partenaire.street_complement"},
    "employeur_code_postal": {"source": "partenaire.zip_code"},
    "employeur_commune": {"source": "partenaire.city"},
    "employeur_telephone": {"source": "partenaire.telephone"},
    "employeur_email": {"source": "partenaire.email"},
    "employeur_siret": {"source": "partenaire.siret"},
    "employeur_type": {"source": "partenaire.type_employeur_code"},
    "employeur_specifique": {"source": "partenaire.employeur_specifique_code"},
    "employeur_code_ape": {"source": "partenaire.code_ape"},
    "employeur_effectif": {"source": "partenaire.effectif_total"},
    "employeur_code_idcc": {"source": "partenaire.idcc"},
    "employeur_regime_assurance_chomage": {"source": "partenaire.assurance_chomage_speciale"},
    # Maitres d'apprentissage
    "maitre1_nom": {"source": "partenaire.maitre1_nom_naissance"},
    "maitre1_prenom": {"source": "partenaire.maitre1_prenom"},
    "maitre1_date_naissance": {"source": "partenaire.maitre1_date_naissance"},
    "maitre1_email": {"source": "partenaire.maitre1_courriel"},
    "maitre1_emploi": {"source": "partenaire.maitre1_emploi_occupe"},
    "maitre1_diplome": {"source": "partenaire.maitre1_diplome_titre"},
    "maitre1_niveau_diplome": {"source": "partenaire.maitre1_niveau_diplome_code"},
    "maitre2_nom": {"source": "partenaire.maitre2_nom_naissance"},
    "maitre2_prenom": {"source": "partenaire.maitre2_prenom"},
    "maitre2_date_naissance": {"source": "partenaire.maitre2_date_naissance"},
    "maitre2_email": {"source": "partenaire.maitre2_courriel"},
    "maitre2_emploi": {"source": "partenaire.maitre2_emploi_occupe"},
    "maitre2_diplome": {"source": "partenaire.maitre2_diplome_titre"},
    "maitre2_niveau_diplome": {"source": "partenaire.maitre2_niveau_diplome_code"},
    # Apprenti
    "apprenti_nom_naissance": {"source": "candidat.nom_naissance"},
    "apprenti_nom_usage": {"source": "candidat.nom"},
    "apprenti_prenom": {"source": "candidat.prenom"},
    "apprenti_nir": {"source": "candidat.nir"},
    "apprenti_numero": {"source": "candidat.street_number"},
    "apprenti_voie": {"source": "candidat.street_name"},
    "apprenti_complement": {"source": "candidat.street_complement"},
    "apprenti_code_postal": {"source": "candidat.code_postal"},
    "apprenti_commune": {"source": "candidat.ville"},
    "apprenti_telephone": {"source": "candidat.telephone"},
    "apprenti_email": {"source": "candidat.email"},
    "apprenti_date_naissance": {"source": "candidat.date_naissance"},
    "apprenti_sexe": {"source": "candidat.sexe"},
    "apprenti_departement_naissance": {"source": "candidat.departement_naissance"},
    "apprenti_commune_naissance": {"source": "candidat.commune_naissance"},
    "apprenti_nationalite": {"source": "candidat.nationalite_code"},
    "apprenti_regime_social": {"source": "candidat.regime_social_code"},
    "apprenti_sportif_haut_niveau": {"source": "candidat.sportif_haut_niveau"},
    "apprenti_rqth": {"source": "candidat.rqth"},
    "apprenti_equivalence_jeunes": {"source": "candidat.equivalence_jeunes"},
    "apprenti_extension_boe": {"source": "candidat.extension_boe"},
    "apprenti_projet_entreprise": {"source": "candidat.projet_creation_entreprise"},
    "apprenti_situation_avant": {"source": "candidat.situation_avant_contrat_code"},
    "apprenti_dernier_diplome_prepare": {"source": "candidat.dernier_diplome_prepare_code"},
    "apprenti_derniere_annee_suivie": {"source": "candidat.derniere_classe_code"},
    "apprenti_intitule_dernier_diplome": {"source": "candidat.intitule_diplome_prepare"},
    "apprenti_plus_haut_diplome": {"source": "candidat.diplome_plus_eleve_obtenu_code"},
    # Representant legal
    "representant_nom": {"source": "candidat.representant_nom_naissance"},
    "representant_prenom": {"source": "candidat.representant_prenom"},
    "representant_lien": {"source": "candidat.representant_lien"},
    "representant_adresse_voie": {"source": "candidat.representant_street_name"},
    "representant_code_postal": {"source": "candidat.representant_zip_code"},
    "representant_commune": {"source": "candidat.representant_city"},
    "representant_email": {"source": "candidat.representant_email"},
    # CFA / formation
    "cfa_denomination": {"source": "formation.centre.cfa_responsable_denomination"},
    "cfa_uai": {"source": "formation.centre.cfa_responsable_uai"},
    "cfa_siret": {"source": "formation.centre.cfa_responsable_siret"},
    "cfa_adresse_numero": {"source": "formation.centre.cfa_responsable_numero"},
    "cfa_adresse_voie": {"source": "formation.centre.cfa_responsable_voie"},
    "cfa_adresse_complement": {"source": "formation.centre.cfa_responsable_complement"},
    "cfa_code_postal": {"source": "formation.centre.cfa_responsable_code_postal"},
    "cfa_commune": {"source": "formation.centre.cfa_responsable_commune"},
    "cfa_entreprise": {"source": "formation.centre.cfa_entreprise"},
    "cfa_est_lieu_formation_principal": {"source": "formation.centre.cfa_responsable_est_lieu_principal"},
    # Le modele Formation ne distingue pas aujourd'hui "diplome vise" et
    # "intitule precis" : les deux champs CERFA sont alimentes depuis
    # `formation.intitule_diplome`, puis peuvent etre ajustes manuellement.
    "diplome_vise": {"source": "formation.intitule_diplome"},
    "diplome_intitule": {"source": "formation.intitule_diplome"},
    "code_diplome": {"source": "formation.code_diplome"},
    "code_rncp": {"source": "formation.code_rncp"},
    "specialite_formation": {"source": "formation.specialite_formation"},
    "formation_debut": {"source": "formation.start_date"},
    "formation_fin": {"source": "formation.end_date"},
    "formation_duree_heures": {"source": "formation.total_heures"},
    "formation_heures_enseignements": {"source": "formation.heures_enseignements_generaux"},
    "formation_distance_heures": {"source": "formation.heures_distanciel"},
    "formation_lieu_denomination": {"source": "formation.centre.nom"},
    "formation_lieu_uai": {"source": "formation.centre.numero_uai_centre"},
    "formation_lieu_siret": {"source": "formation.centre.siret_centre"},
    "formation_lieu_voie": {"source": "formation.centre.nom_voie"},
    "formation_lieu_code_postal": {"source": "formation.centre.code_postal"},
    "formation_lieu_commune": {"source": "formation.centre.commune"},
    "organisme_declaration_activite": {"source": "formation.centre.organisme_declaration_activite"},
    # Contrat
    "type_contrat": {"source": "candidat.type_contrat"},
}

CERFA_AUTOFILL_MISSING_FIELDS: Dict[str, str] = {
    "employeur_prive": "Dérivable seulement si on normalise clairement le mapping du type employeur vers la case CERFA.",
    "employeur_public": "Dérivable seulement si on normalise clairement le mapping du type employeur vers la case CERFA.",
    "maitre_eligible": "Aucune règle métier explicite actuelle pour calculer l'éligibilité.",
    "apprenti_droits_rqth": "Aucun champ source équivalent dans candidat.",
    "type_derogation": "Pas de champ métier source.",
    "numero_contrat_precedent": "Pas de gestion native des avenants/contrats précédents.",
    "date_conclusion": "Pas de champ métier source explicite.",
    "date_debut_execution": "Peut être inférée métier, mais pas de champ source dédié explicite.",
    "date_fin_contrat": "Pas de champ métier source explicite.",
    "date_debut_formation_pratique_employeur": "Pas de champ métier source.",
    "date_effet_avenant": "Pas de gestion métier de l'avenant à ce niveau.",
    "travail_machines_dangereuses": "Pas de champ métier source.",
    "duree_hebdo_heures": "Pas de champ métier source.",
    "duree_hebdo_minutes": "Pas de champ métier source.",
    "salaire_brut_mensuel": "Pas de champ métier source.",
    "caisse_retraite": "Pas de champ métier source.",
    "lieu_signature": "Pas de champ métier source.",
}


def _resolve_attr(obj: Any, path: str) -> Any:
    current = obj
    for part in path.split("."):
        if current is None:
            return None
        current = getattr(current, part, None)
    return current


def _compact_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    return {key: value for key, value in data.items() if value not in (None, "", [], {}, ())}


def _pick_code(root_obj: Any, code_attr: str, text_attr: str) -> Any:
    if root_obj is None:
        return None
    code_value = getattr(root_obj, code_attr, None)
    if code_value not in (None, ""):
        return code_value
    return getattr(root_obj, text_attr, None)


class CerfaContrat(models.Model):
    """
    Modèle snapshot complet du CERFA 10103*14.
    N'hérite pas de BaseModel : pas de traçabilité automatique (created_by, updated_by, etc.).

    Ce modèle stocke à plat les données administratives du contrat afin de :
    - figer les informations au moment de la génération,
    - permettre un pré-remplissage depuis les modèles métier,
    - conserver un historique stable même si les données sources évoluent ensuite.
    """

    pdf_fichier = models.FileField(
        upload_to="cerfas/",
        blank=True,
        null=True,
        verbose_name="Fichier PDF généré",
        help_text="PDF CERFA généré à partir des données du contrat.",
    )

    auto_generated = models.BooleanField(
        default=False,
        help_text="Indique si le CERFA a été pré-rempli automatiquement à partir des données métier.",
    )

    candidat = models.ForeignKey(
        "Candidat",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cerfa_contrats",
        help_text="Candidat source utilise pour pre-remplir le CERFA.",
    )
    formation = models.ForeignKey(
        "Formation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cerfa_contrats",
        help_text="Formation source utilisee pour pre-remplir le CERFA.",
    )
    employeur = models.ForeignKey(
        "Partenaire",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cerfa_contrats",
        help_text="Partenaire source utilise pour pre-remplir le CERFA.",
    )
    cerfa_type = models.CharField(
        max_length=24,
        choices=(
            ("apprentissage", "Contrat apprentissage"),
            ("professionnalisation", "Contrat de professionnalisation"),
        ),
        default="apprentissage",
        help_text="Nature du contrat CERFA : apprentissage ou professionnalisation.",
    )

    # ───────────────────────── EMPLOYEUR ─────────────────────────
    employeur_prive = models.BooleanField(
        default=True,
        help_text="Case employeur privé.",
    )
    employeur_public = models.BooleanField(
        default=False,
        help_text="Case employeur public.",
    )
    employeur_nom = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Nom ou raison sociale de l’employeur.",
    )
    employeur_adresse_numero = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Numéro dans la voie de l’adresse de l’employeur.",
    )
    employeur_adresse_voie = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Libellé de voie de l’employeur.",
    )
    employeur_adresse_complement = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Complément d’adresse de l’employeur.",
    )
    employeur_code_postal = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Code postal de l’employeur.",
    )
    employeur_commune = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Commune de l’employeur.",
    )
    employeur_telephone = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Téléphone de l’employeur.",
    )
    employeur_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Adresse e-mail de l’employeur.",
    )
    employeur_siret = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="SIRET de l’employeur.",
    )
    employeur_type = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Type d’employeur ou catégorie administrative utile au CERFA.",
    )
    employeur_type_code = models.CharField(
        max_length=2,
        blank=True,
        null=True,
        choices=CerfaTypeEmployeurCode.choices,
        help_text="Code CERFA du type d'employeur.",
    )
    employeur_specifique = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Précision complémentaire sur la nature de l’employeur si nécessaire.",
    )
    employeur_specifique_code = models.CharField(
        max_length=1,
        blank=True,
        null=True,
        choices=CerfaEmployeurSpecifiqueCode.choices,
        help_text="Code CERFA de l'employeur specifique.",
    )
    employeur_code_ape = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Code APE / NAF de l’employeur.",
    )
    employeur_effectif = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Effectif salarié de l’entreprise.",
    )
    employeur_code_idcc = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Code IDCC de la convention collective applicable.",
    )
    employeur_urssaf_particulier = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Numero URSSAF du particulier-employeur pour le CERFA professionnalisation.",
    )
    employeur_organisme_prevoyance = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Organisme de prevoyance, le cas echeant, pour le CERFA professionnalisation.",
    )
    employeur_numero_projet = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Numero de projet associe au contrat de professionnalisation, si applicable.",
    )
    employeur_regime_assurance_chomage = models.BooleanField(
        default=False,
        help_text="Indique si l’employeur relève d’un régime spécifique d’assurance chômage.",
    )

    # ─────────────────── MAÎTRES D’APPRENTISSAGE ───────────────────
    maitre1_nom = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Nom du premier maître d’apprentissage.",
    )
    maitre1_prenom = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Prénom du premier maître d’apprentissage.",
    )
    maitre1_date_naissance = models.DateField(
        blank=True,
        null=True,
        help_text="Date de naissance du premier maître d’apprentissage.",
    )
    maitre1_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Adresse e-mail du premier maître d’apprentissage.",
    )
    maitre1_emploi = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Emploi occupé par le premier maître d’apprentissage.",
    )
    maitre1_diplome = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Diplôme du premier maître d’apprentissage.",
    )
    maitre1_niveau_diplome = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Niveau de diplôme du premier maître d’apprentissage.",
    )
    maitre1_niveau_diplome_code = models.CharField(
        max_length=1,
        blank=True,
        null=True,
        choices=CerfaMaitreNiveauDiplomeCode.choices,
        help_text="Code CERFA du niveau de diplome du maitre 1.",
    )

    maitre2_nom = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Nom du second maître d’apprentissage.",
    )
    maitre2_prenom = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Prénom du second maître d’apprentissage.",
    )
    maitre2_date_naissance = models.DateField(
        blank=True,
        null=True,
        help_text="Date de naissance du second maître d’apprentissage.",
    )
    maitre2_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Adresse e-mail du second maître d’apprentissage.",
    )
    maitre2_emploi = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Emploi occupé par le second maître d’apprentissage.",
    )
    maitre2_diplome = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Diplôme du second maître d’apprentissage.",
    )
    maitre2_niveau_diplome = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Niveau de diplôme du second maître d’apprentissage.",
    )
    maitre2_niveau_diplome_code = models.CharField(
        max_length=1,
        blank=True,
        null=True,
        choices=CerfaMaitreNiveauDiplomeCode.choices,
        help_text="Code CERFA du niveau de diplome du maitre 2.",
    )
    maitre_eligible = models.BooleanField(
        default=True,
        help_text="Indique si le ou les maîtres d’apprentissage sont considérés éligibles.",
    )

    # ───────────────────────── APPRENTI ─────────────────────────
    apprenti_nom_naissance = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Nom de naissance de l’apprenti.",
    )
    apprenti_nom_usage = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Nom d’usage de l’apprenti.",
    )
    apprenti_prenom = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Prénom de l’apprenti.",
    )
    apprenti_nir = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        help_text="NIR / numéro de sécurité sociale de l’apprenti.",
    )
    apprenti_numero = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Numéro dans la voie de l’adresse de l’apprenti.",
    )
    apprenti_voie = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Voie de l’adresse de l’apprenti.",
    )
    apprenti_complement = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Complément d’adresse de l’apprenti.",
    )
    apprenti_code_postal = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Code postal de l’apprenti.",
    )
    apprenti_commune = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Commune de résidence de l’apprenti.",
    )
    apprenti_telephone = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Téléphone de l’apprenti.",
    )
    apprenti_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Adresse e-mail de l’apprenti.",
    )
    apprenti_date_naissance = models.DateField(
        blank=True,
        null=True,
        help_text="Date de naissance de l’apprenti.",
    )
    apprenti_sexe = models.CharField(
        max_length=1,
        choices=[("M", "Masculin"), ("F", "Féminin")],
        blank=True,
        null=True,
        help_text="Sexe de l’apprenti.",
    )
    apprenti_departement_naissance = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Département de naissance de l’apprenti.",
    )
    apprenti_commune_naissance = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Commune de naissance de l’apprenti.",
    )
    apprenti_nationalite = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Nationalité de l’apprenti.",
    )
    apprenti_nationalite_code = models.CharField(
        max_length=1,
        blank=True,
        null=True,
        choices=CerfaNationaliteCode.choices,
        help_text="Code CERFA de nationalite.",
    )
    apprenti_regime_social = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Régime social applicable à l’apprenti.",
    )
    apprenti_regime_social_code = models.CharField(
        max_length=1,
        blank=True,
        null=True,
        choices=CerfaRegimeSocialCode.choices,
        help_text="Code CERFA du regime social.",
    )
    apprenti_sportif_haut_niveau = models.BooleanField(
        default=False,
        help_text="Indique si l’apprenti est sportif de haut niveau.",
    )
    apprenti_rqth = models.BooleanField(
        default=False,
        help_text="Indique si l’apprenti bénéficie d’une RQTH.",
    )
    apprenti_droits_rqth = models.BooleanField(
        default=False,
        help_text="Indique si les droits liés à la RQTH sont ouverts.",
    )
    apprenti_equivalence_jeunes = models.BooleanField(
        default=False,
        help_text="Case relative à l’équivalence jeunes / situation assimilée.",
    )
    apprenti_extension_boe = models.BooleanField(
        default=False,
        help_text="Case relative à l’extension BOE.",
    )
    apprenti_projet_entreprise = models.BooleanField(
        default=False,
        help_text="Indique si l’apprentissage s’inscrit dans un projet de création ou reprise d’entreprise.",
    )
    apprenti_situation_avant = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Situation de l’apprenti avant le contrat.",
    )
    apprenti_situation_avant_code = models.CharField(
        max_length=2,
        blank=True,
        null=True,
        choices=CerfaSituationAvantContratCode.choices,
        help_text="Code CERFA de la situation avant contrat.",
    )
    apprenti_dernier_diplome_prepare = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Dernier diplôme ou titre préparé par l’apprenti.",
    )
    apprenti_dernier_diplome_prepare_code = models.CharField(
        max_length=2,
        blank=True,
        null=True,
        choices=CerfaDiplomeCode.choices,
        help_text="Code CERFA du dernier diplome prepare.",
    )
    apprenti_derniere_annee_suivie = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Dernière classe / année suivie.",
    )
    apprenti_derniere_annee_suivie_code = models.CharField(
        max_length=2,
        blank=True,
        null=True,
        choices=CerfaDerniereClasseCode.choices,
        help_text="Code CERFA de la derniere classe ou annee suivie.",
    )
    apprenti_intitule_dernier_diplome = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Intitulé du dernier diplôme obtenu ou préparé.",
    )
    apprenti_plus_haut_diplome = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Plus haut diplôme ou titre obtenu.",
    )
    apprenti_plus_haut_diplome_code = models.CharField(
        max_length=2,
        blank=True,
        null=True,
        choices=CerfaDiplomeCode.choices,
        help_text="Code CERFA du plus haut diplome obtenu.",
    )
    apprenti_inscrit_france_travail = models.BooleanField(
        blank=True,
        null=True,
        help_text="Indique explicitement si le beneficiaire est inscrit a France Travail.",
    )
    apprenti_france_travail_numero = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Numero d'inscription France Travail pour le CERFA professionnalisation.",
    )
    apprenti_france_travail_duree_mois = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Duree d'inscription a France Travail en mois pour le CERFA professionnalisation.",
    )
    apprenti_minimum_social_type = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Type de minimum social perçu, si beneficiaire, pour le CERFA professionnalisation.",
    )

    # ───────────────────── REPRÉSENTANT LÉGAL ─────────────────────
    representant_nom = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Nom de naissance du représentant légal.",
    )
    representant_prenom = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Prénom du représentant légal.",
    )
    representant_lien = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Lien avec l’apprenti. Champ utile métier, non strictement requis par le CERFA.",
    )
    representant_adresse_numero = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Numéro dans la voie de l’adresse du représentant légal.",
    )
    representant_adresse_voie = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Voie de l’adresse du représentant légal.",
    )
    representant_adresse_complement = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Complément d’adresse du représentant légal.",
    )
    representant_code_postal = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Code postal du représentant légal.",
    )
    representant_commune = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Commune du représentant légal.",
    )
    representant_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Adresse e-mail du représentant légal.",
    )

    # ─────────────────────── FORMATION / CFA ───────────────────────
    cfa_denomination = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Dénomination du CFA responsable.",
    )
    cfa_uai = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Code UAI du CFA responsable.",
    )
    cfa_siret = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="SIRET du CFA responsable.",
    )
    cfa_adresse_numero = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Numéro dans la voie de l’adresse du CFA responsable.",
    )
    cfa_adresse_voie = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Voie de l’adresse du CFA responsable.",
    )
    cfa_adresse_complement = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Complément d’adresse du CFA responsable.",
    )
    cfa_code_postal = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Code postal du CFA responsable.",
    )
    cfa_commune = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Commune du CFA responsable.",
    )
    cfa_entreprise = models.BooleanField(
        default=True,
        help_text="Case indiquant si le CFA est un CFA d’entreprise.",
    )

    diplome_vise = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Diplôme ou titre visé.",
    )
    diplome_vise_code = models.CharField(
        max_length=2,
        blank=True,
        null=True,
        choices=CerfaDiplomeCode.choices,
        help_text="Code CERFA du diplome ou titre vise.",
    )
    diplome_intitule = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Intitulé exact du diplôme ou titre préparé.",
    )
    code_diplome = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Code diplôme.",
    )
    code_rncp = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Code RNCP de la certification visée.",
    )
    type_qualification_visee = models.CharField(
        max_length=1,
        blank=True,
        null=True,
        choices=CerfaProTypeQualificationViseeCode.choices,
        help_text="Type de qualification visee pour le CERFA professionnalisation.",
    )
    organisme_declaration_activite = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Numero de declaration d'activite de l'organisme de formation principal.",
    )
    nombre_organismes_formation = models.PositiveIntegerField(
        blank=True,
        null=True,
        default=1,
        help_text="Nombre d'organismes de formation intervenant dans le contrat de professionnalisation.",
    )
    specialite_formation = models.CharField(
        max_length=3,
        blank=True,
        null=True,
        choices=CerfaNsfSpecialiteCode.choices,
        help_text="Code NSF de specialite de formation pour le CERFA professionnalisation.",
    )
    organisation_formation = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Organisation de la formation pour le CERFA professionnalisation.",
    )
    formation_heures_enseignements = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Duree des enseignements generaux, professionnels et technologiques en heures.",
    )
    formation_debut = models.DateField(
        blank=True,
        null=True,
        help_text="Date de début de formation en CFA.",
    )
    formation_fin = models.DateField(
        blank=True,
        null=True,
        help_text="Date de fin de formation ou date prévue de fin des épreuves/examens selon les données disponibles.",
    )
    formation_duree_heures = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Durée totale de formation en heures.",
    )
    formation_distance_heures = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Nombre d’heures à distance prévues dans la formation.",
    )
    cfa_est_lieu_formation_principal = models.BooleanField(
        default=False,
        help_text="Case indiquant si le CFA responsable est aussi le lieu de formation principal.",
    )

    formation_lieu_denomination = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Dénomination du lieu principal de formation, si différent du CFA responsable.",
    )
    formation_lieu_uai = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Code UAI du lieu principal de formation.",
    )
    formation_lieu_siret = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="SIRET du lieu principal de formation.",
    )
    formation_lieu_voie = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Voie du lieu principal de formation.",
    )
    formation_lieu_code_postal = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Code postal du lieu principal de formation.",
    )
    formation_lieu_commune = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Commune du lieu principal de formation.",
    )
    pieces_justificatives_ok = models.BooleanField(
        default=True,
        help_text="Indique que l'employeur atteste disposer de l'ensemble des pieces justificatives necessaires au depot du contrat.",
    )

    # ───────────────────────── CONTRAT ─────────────────────────
    type_contrat = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Type de contrat ou type d’avenant selon le CERFA.",
    )
    type_contrat_code = models.CharField(
        max_length=2,
        blank=True,
        null=True,
        help_text=(
            "Code CERFA du type de contrat ou avenant. La nomenclature depend du type de CERFA "
            "(apprentissage ou professionnalisation)."
        ),
    )
    type_derogation = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Type de dérogation applicable, si concerné.",
    )
    type_derogation_code = models.CharField(
        max_length=2,
        blank=True,
        null=True,
        choices=CerfaTypeDerogationCode.choices,
        help_text="Code CERFA du type de derogation.",
    )
    numero_contrat_precedent = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Numéro du contrat précédent ou du contrat sur lequel porte l’avenant.",
    )
    emploi_occupe_pendant_contrat = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Emploi occupe pendant le contrat (intitule precis), utile pour le CERFA professionnalisation.",
    )
    classification_emploi = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Classification de l'emploi dans la convention collective pour le CERFA professionnalisation.",
    )
    classification_niveau = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Niveau de classification pour le CERFA professionnalisation.",
    )
    coefficient_hierarchique = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Coefficient hierarchique pour le CERFA professionnalisation.",
    )
    duree_periode_essai_jours = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Duree de la periode d'essai en jours pour le CERFA professionnalisation.",
    )
    date_conclusion = models.DateField(
        blank=True,
        null=True,
        help_text="Date de conclusion du contrat.",
    )
    date_debut_execution = models.DateField(
        blank=True,
        null=True,
        help_text="Date de début d’exécution du contrat.",
    )
    date_fin_contrat = models.DateField(
        blank=True,
        null=True,
        help_text="Date de fin du contrat.",
    )
    date_debut_formation_pratique_employeur = models.DateField(
        blank=True,
        null=True,
        help_text="Date de début de la formation pratique chez l’employeur.",
    )
    date_effet_avenant = models.DateField(
        blank=True,
        null=True,
        help_text="Date d’effet de l’avenant, si applicable.",
    )
    travail_machines_dangereuses = models.BooleanField(
        default=False,
        help_text="Indique si l’apprenti est affecté à des travaux sur machines dangereuses ou exposé à des risques particuliers.",
    )
    duree_hebdo_heures = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Durée hebdomadaire moyenne de travail en heures.",
    )
    duree_hebdo_minutes = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Complément en minutes de la durée hebdomadaire moyenne.",
    )
    salaire_brut_mensuel = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Salaire brut mensuel prévu.",
    )
    caisse_retraite = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Nom de la caisse de retraite complémentaire.",
    )

    # ───────────────────────── SIGNATURES ─────────────────────────
    lieu_signature = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Lieu de signature du contrat.",
    )
    opco_nom = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Nom de l'OPCO auquel est adresse le dossier complet pour le CERFA professionnalisation.",
    )
    opco_adherent_numero = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Numero d'adherent employeur a l'OPCO, s'il existe, pour le CERFA professionnalisation.",
    )

    # ─────────────────────── MÉTADONNÉES ───────────────────────
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Date de création de l’enregistrement.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Date de dernière mise à jour de l’enregistrement.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        editable=False,
        on_delete=models.SET_NULL,
        related_name="created_cerfacontrat_set",
        help_text="Utilisateur ayant cree le CERFA.",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_cerfacontrat_set",
        help_text="Utilisateur ayant modifie le CERFA en dernier.",
    )

    class Meta:
        """Options de métadonnées : libellés admin et ordre par défaut (created_at décroissant)."""

        verbose_name = "CERFA Contrat complet"
        verbose_name_plural = "CERFAs Contrat complets"
        ordering = ["-created_at"]

    def __str__(self):
        """Représentation lisible : CERFA <id> - <nom apprenti ou 'Apprenti'>."""
        return f"CERFA {self.id or '?'} - {self.apprenti_nom_naissance or 'Apprenti'}"

    @classmethod
    def get_autofill_source_map(cls) -> Dict[str, Dict[str, str]]:
        """Retourne la matrice des champs CERFA déjà couverts par les modèles métier."""
        return CERFA_AUTOFILL_SOURCES

    @classmethod
    def get_missing_autofill_fields(cls) -> Dict[str, str]:
        """Retourne les champs CERFA encore non couverts automatiquement."""
        return CERFA_AUTOFILL_MISSING_FIELDS

    @classmethod
    def build_prefill_payload(
        cls,
        *,
        candidat: Optional[Any] = None,
        formation: Optional[Any] = None,
        partenaire: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Construit un payload de pré-remplissage depuis les modèles métier existants.

        Aucun accès BDD n'est fait ici : la méthode suppose que les objets transmis
        sont déjà chargés avec leurs relations utiles.
        """
        roots = {
            "candidat": candidat,
            "formation": formation,
            "partenaire": partenaire,
        }
        payload: Dict[str, Any] = {}
        for cerfa_field, meta in CERFA_AUTOFILL_SOURCES.items():
            source = meta["source"]
            root_name, _, attr_path = source.partition(".")
            root_obj = roots.get(root_name)
            if root_obj is None or not attr_path:
                continue
            payload[cerfa_field] = _resolve_attr(root_obj, attr_path)

        if partenaire is not None:
            payload["employeur_type_code"] = getattr(partenaire, "type_employeur_code", None)
            payload["employeur_specifique_code"] = getattr(partenaire, "employeur_specifique_code", None)
            payload["maitre1_niveau_diplome_code"] = getattr(partenaire, "maitre1_niveau_diplome_code", None)
            payload["maitre2_niveau_diplome_code"] = getattr(partenaire, "maitre2_niveau_diplome_code", None)
            payload["employeur_type"] = getattr(partenaire, "type_employeur_code", None)
            payload["employeur_specifique"] = getattr(partenaire, "employeur_specifique_code", None)
            payload["maitre1_niveau_diplome"] = getattr(partenaire, "maitre1_niveau_diplome_code", None)
            payload["maitre2_niveau_diplome"] = getattr(partenaire, "maitre2_niveau_diplome_code", None)

        if candidat is not None:
            cerfa_type = (
                "professionnalisation"
                if getattr(candidat, "type_contrat", None) == "professionnalisation"
                else "apprentissage"
            )
            payload["cerfa_type"] = cerfa_type
            payload["apprenti_nationalite_code"] = getattr(candidat, "nationalite_code", None)
            payload["apprenti_regime_social_code"] = getattr(candidat, "regime_social_code", None)
            payload["apprenti_situation_avant_code"] = getattr(candidat, "situation_avant_contrat_code", None)
            payload["apprenti_dernier_diplome_prepare_code"] = getattr(
                candidat, "dernier_diplome_prepare_code", None
            )
            payload["apprenti_plus_haut_diplome_code"] = getattr(
                candidat, "diplome_plus_eleve_obtenu_code", None
            )
            payload["apprenti_derniere_annee_suivie_code"] = getattr(candidat, "derniere_classe_code", None)
            payload["type_contrat_code"] = getattr(candidat, "type_contrat_code", None)

            payload["apprenti_nationalite"] = getattr(candidat, "nationalite_code", None)
            payload["apprenti_regime_social"] = getattr(candidat, "regime_social_code", None)
            payload["apprenti_situation_avant"] = getattr(candidat, "situation_avant_contrat_code", None)
            payload["apprenti_dernier_diplome_prepare"] = getattr(candidat, "dernier_diplome_prepare_code", None)
            payload["apprenti_plus_haut_diplome"] = getattr(candidat, "diplome_plus_eleve_obtenu_code", None)
            payload["apprenti_derniere_annee_suivie"] = getattr(candidat, "derniere_classe_code", None)
            payload["type_contrat"] = (
                _pick_code(candidat, "type_contrat_code", "type_contrat")
                if cerfa_type == "apprentissage"
                else getattr(candidat, "type_contrat_code", None)
            )
            payload["apprenti_inscrit_france_travail"] = getattr(candidat, "inscrit_france_travail", None)
            payload["apprenti_france_travail_numero"] = getattr(
                candidat, "numero_inscription_france_travail", None
            )
            payload["apprenti_france_travail_duree_mois"] = getattr(
                candidat, "duree_inscription_france_travail_mois", None
            )

        if formation is not None:
            payload["diplome_vise_code"] = getattr(formation, "diplome_vise_code", None)
            payload["diplome_vise"] = _pick_code(formation, "diplome_vise_code", "intitule_diplome")
            payload["diplome_intitule"] = getattr(formation, "intitule_diplome", None)
            payload["type_qualification_visee"] = getattr(formation, "type_qualification_visee", None)
        payload = sync_cerfa_choice_labels(payload, payload.get("cerfa_type"))
        return _compact_dict(payload)

    @classmethod
    def get_coverage_report(cls) -> Dict[str, Any]:
        """Synthèse exploitable pour auditer le niveau réel de couverture automatique."""
        covered_fields = sorted(CERFA_AUTOFILL_SOURCES.keys())
        missing_fields = sorted(CERFA_AUTOFILL_MISSING_FIELDS.keys())
        return {
            "covered_count": len(covered_fields),
            "missing_count": len(missing_fields),
            "covered_fields": covered_fields,
            "missing_fields": {name: CERFA_AUTOFILL_MISSING_FIELDS[name] for name in missing_fields},
        }
