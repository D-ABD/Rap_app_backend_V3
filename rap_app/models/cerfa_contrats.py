from django.db import models


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
    employeur_specifique = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Précision complémentaire sur la nature de l’employeur si nécessaire.",
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
    apprenti_regime_social = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Régime social applicable à l’apprenti.",
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
    apprenti_dernier_diplome_prepare = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Dernier diplôme ou titre préparé par l’apprenti.",
    )
    apprenti_derniere_annee_suivie = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Dernière classe / année suivie.",
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
        default=False,
        help_text="Case indiquant si le CFA est un CFA d’entreprise.",
    )

    diplome_vise = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Diplôme ou titre visé.",
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

    # ───────────────────────── CONTRAT ─────────────────────────
    type_contrat = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Type de contrat ou type d’avenant selon le CERFA.",
    )
    type_derogation = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Type de dérogation applicable, si concerné.",
    )
    numero_contrat_precedent = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Numéro du contrat précédent ou du contrat sur lequel porte l’avenant.",
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

    # ─────────────────────── MÉTADONNÉES ───────────────────────
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Date de création de l’enregistrement.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Date de dernière mise à jour de l’enregistrement.",
    )

    class Meta:
        """Options de métadonnées : libellés admin et ordre par défaut (created_at décroissant)."""
        verbose_name = "CERFA Contrat complet"
        verbose_name_plural = "CERFAs Contrat complets"
        ordering = ["-created_at"]

    def __str__(self):
        """Représentation lisible : CERFA <id> - <nom apprenti ou 'Apprenti'>."""
        return f"CERFA {self.id or '?'} - {self.apprenti_nom_naissance or 'Apprenti'}"