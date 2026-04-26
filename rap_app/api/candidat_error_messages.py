"""
Messages d'erreur unifiés pour l'API fiche candidat, le compte et le parcours.

Cohérence : contexte, cause, et piste d'action lorsque c'est utile pour le
diagnostic côté utilisateur ou le support.
"""

# --- Accès (authentification, « me », introuvable, périmètre) ---

CANDIDAT_MSG_AUTH_REQUIRED = (
    "Authentification requise. Connectez-vous pour accéder ou modifier la fiche candidat."
)
CANDIDAT_MSG_NO_CANDIDAT_ON_ACCOUNT = (
    "Aucune fiche candidat n'est liée à ce compte utilisateur. "
    "Contactez l'équipe pédagogique si un rattachement devrait exister."
)
CANDIDAT_MSG_CANDIDAT_NOT_FOUND = (
    "Candidat introuvable : identifiant inconnu, fiche archivée, ou accès refusé "
    "(hors de votre périmètre de centres ou rôle inadapté)."
)
CANDIDAT_MSG_FORMATION_HORS_CENTRE = (
    "Formation hors de votre périmètre. Vous ne pouvez affecter un candidat qu'à des formations "
    "d'un de vos centres, ou laisser un collègue / administrateur du centre concerné effectuer l'affectation."
)

# Permissions CanAccessCandidatObject
CANDIDAT_PERM_NOT_YOUR_CANDIDAT = (
    "Vous n'êtes autorisé qu'à consulter ou modifier la fiche rattachée à votre propre compte."
)
CANDIDAT_PERM_CANDIDAT_HORS_CENTRE_STAFF = (
    "Cette fiche n'est pas gérable depuis votre compte : la formation n'est pas renseignée "
    "ou n'appartient pas à l'un de vos centres."
)
CANDIDAT_PERM_AUCUN_CENTRE_ASSIGNE = (
    "Aucun centre n'est associé à votre compte. Contactez l'administrateur pour définir votre périmètre."
)
CANDIDAT_PERM_ACTION_ROLES_CANDIDAT = (
    "Cette action (création, suppression, etc.) n'est pas disponible pour un compte candidat ; "
    "les candidats n'ont accès qu'à la lecture et la mise à jour de leur fiche (PUT/PATCH)."
)
CANDIDAT_PERM_ACCES_CANDIDAT_REFUSE = (
    "Accès à la fiche candidat refusé pour ce compte. Votre rôle n'autorise pas cette ressource."
)
CANDIDAT_MSG_RGPD_APP_REQUIS = (
    "Vous devez d'abord valider le consentement RGPD (depuis Mon profil sur le compte, "
    "ou par le biais de votre fiche si le centre l'a enregistré) avant d'utiliser l'application."
)

# Création / actions bulk
CANDIDAT_MSG_FORMATION_OBLIGATOIRE_CREATION = (
    "La formation est obligatoire pour créer une fiche. Sélectionnez une session (formation) "
    "avant d'enregistrer le candidat."
)
CANDIDAT_MSG_BULK_CANDIDATE_IDS = (
    "Le corps de la requête doit inclure une liste d'entiers (identifiants de fiches candidat), par ex. : [1, 2, 3]."
)
CANDIDAT_MSG_BULK_ATELIER_TRE_ID = (
    "Champ requis : indiquez l'identifiant numérique (entier) de l'atelier TRE, par ex. 42."
)
CANDIDAT_MSG_ATELIER_TRE_HORS_PERIMETRE = (
    "Atelier TRE introuvable ou non visible : l'identifiant n'existe pas ou l'atelier n'est rattaché à aucun de vos centres."
)

# --- Serializer CandidatCreateUpdateSerializer ---
CANDIDAT_MSG_CHAMP_RESERVE_ADMIN = (
    "Champ réservé aux administrateurs. Seuls l'équipe admin ou l'import système peuvent le modifier "
    "(placement, notes internes, visibilité, entreprise, courrier, etc.)."
)
CANDIDAT_MSG_CHAMP_RESERVE_STAFF = (
    "Champ réservé à l'équipe recrutement / pédagogique. Votre rôle ne permet pas de modifier "
    "ces drapeaux (admissible, GESPERS, TRE, appairage)."
)
CANDIDAT_MSG_NUMERO_OSIA_INTERDIT = (
    "Numéro OSIA : seuls les comptes habilités (équipe) peuvent le saisir ou le modifier. "
    "Ce n'est pas modifiable avec un compte candidat seul."
)
CANDIDAT_MSG_NUMERO_OSIA_VERROUILLE = (
    "Un numéro OSIA est déjà enregistré sur cette fiche et n'est plus modifiable. En cas d'erreur, contactez l'administrateur."
)
CANDIDAT_MSG_NUMERO_OSIA_REQUIS_CONTRAT_SIGN = (
    "Si le contrat est indiqué comme signé, le numéro OSIA est obligatoire. Renseignez l'OSIA connu "
    "ou corrigez l'état du contrat si c'était une saisie erronée."
)
CANDIDAT_MSG_EMAIL_REQUISE_SI_COMPTE = (
    "Un compte utilisateur est rattaché : une adresse e-mail est obligatoire sur la fiche candidat."
)
CANDIDAT_MSG_RGPD_LEGAL_BASIS_REQUIS = (
    "Base légale RGPD requise pour la création manuelle d'une fiche par l'équipe. Choisissez une base légale."
)
CANDIDAT_MSG_RGPD_CONSENT_REQUIS = (
    "Avec la base légale « consentement », l'indication (ou la date) de consentement explicite est obligatoire."
)
# Auto-édition candidat (PATCH fiche) : seul le booléen de consentement explicite est autorisé, sous conditions.
CANDIDAT_MSG_RGPD_SELF_CHAMPS_INTERDITS = (
    "Depuis votre espace, vous ne pouvez pas modifier les autres champs RGPD du dossier (base légale, notices, etc.). "
    "Contactez l'équipe pour toute rectification."
)
CANDIDAT_MSG_RGPD_SELF_CONSENT_PAS_BAL_CONSENTEMENT = (
    "Vous ne pouvez confirmer le consentement explicite sur le dossier que si la base légale enregistrée par "
    "l'organisme est « consentement ». Demandez l'ajustement à l'équipe si besoin."
)
CANDIDAT_MSG_RGPD_SELF_CONSENT_UNIQUEMENT_OUI = (
    "Depuis votre espace, vous ne pouvez qu'accepter le consentement (valeur « oui »), pas le retirer."
)
CANDIDAT_MSG_CERFA_INCOMPATIBLE = (
    "Le code CERFA ne correspond pas au type de contrat choisi (apprentissage / professionnalisation). "
    "Ajustez le type ou le code CERFA."
)
CANDIDAT_MSG_SELF_READ_ONLY = (
    "Ce champ est en lecture seule pour votre profil (contrat, OSIA, demande de compte, etc.)."
)
CANDIDAT_MSG_FORMATION_STAFF_UNIQUEMENT = (
    "Affectation ou changement de formation : réservé aux comptes habilités (équipe). "
    "Cette opération n'est pas disponible depuis l'espace candidat."
)

# Parcours (CandidateLifecycleService, codes métier hérités)
CANDIDAT_MSG_FORMATION_AFFECTATION_REQUISE = (
    "Le candidat doit être affecté à une formation. Indiquez d'abord une session sur la fiche, "
    "puis relancez l'opération (validation, entrée, fin de parcours, etc.)."
)

# Compte (CandidateAccountService)
CANDIDAT_ACCOUNT_CANDIDAT_A_DEJA_UN_COMPTE = (
    "Cette fiche est déjà liée à un autre compte utilisateur. La liaison a été refusée pour éviter un doublon."
)
CANDIDAT_ACCOUNT_EMAIL_LIE_AUTRE_CANDIDAT = (
    "Cette adresse e-mail est déjà utilisée pour une autre fiche candidat. Chaque e-mail ne peut servir qu'à un seul dossier."
)
CANDIDAT_ACCOUNT_EMAIL_REQUIS = (
    "La fiche doit comporter une adresse e-mail pour créer ou lier un compte utilisateur."
)
CANDIDAT_ACCOUNT_NOT_ADMISSIBLE = (
    "Le candidat n'est pas en état « admissible ». Cette opération n'est possible qu'une fois l'admission validée côté recrutement."
)
CANDIDAT_ACCOUNT_UN_COMPTE_DEJA_LIE = (
    "Un compte utilisateur est déjà rattaché à ce candidat. Cette opération n'a pas d'effet (doublon évité)."
)
CANDIDAT_ACCOUNT_AUCUN_COMPTE_LIE = (
    "Aucun compte utilisateur n'est lié à cette fiche : il n'y a pas de liaison à retirer."
)
CANDIDAT_ACCOUNT_DEMANDE_DEJA_EN_ATTENTE = (
    "Une demande de compte est déjà en attente. Patientez jusqu'au traitement par l'équipe, ou annulez via un administrateur."
)
CANDIDAT_ACCOUNT_AUCUNE_DEMANDE_EN_ATTENTE = (
    "Aucune demande de compte n'est en attente sur cette fiche. Vérifiez le statut (déjà traitée, refusée ou jamais demandée)."
)
