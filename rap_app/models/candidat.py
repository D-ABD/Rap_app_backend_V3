"""Modèle métier des candidats et de leur historique de placement.

Le modèle porte les données métier persistantes ; les créations de compte,
liaisons utilisateur et synchronisations cross-modules sont désormais pilotées
par les services applicatifs plutôt que par des effets implicites de signaux.
"""

import logging
import re
import unicodedata
from datetime import date

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .base import BaseModel
from .custom_user import CustomUser
from ..services.historique_service import (
    PLACEMENT_FIELDS,
    creer_historique_placement_si_necessaire,
)

# Pour éviter les imports circulaires, le modèle "Appairage" est référencé par une chaîne de caractères.

logger = logging.getLogger("application.candidats")

NIVEAU_CHOICES = [(i, f"{i} ★") for i in range(1, 6)]


def slugify_username(value: str) -> str:
    """
    Nettoie et convertit un identifiant en slug compatible ASCII, utilisé pour les usernames candidats.
    """
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w.@+-]", "", value)
    return value.lower()


def generate_unique_username(base: str) -> str:
    """
    Génère un identifiant utilisateur unique basé sur la valeur fournie, avec suffixe en cas de collision.
    """
    User = get_user_model()
    username = base
    suffix = 1
    while User.objects.filter(username=username).exists():
        username = f"{base}_{suffix}"
        suffix += 1
    return username


class ResultatPlacementChoices(models.TextChoices):
    """
    Etats possibles pour le résultat du placement ou appairage.
    """

    ADMIS = "admis", _("Admis")
    NON_ADMIS = "non_admis", _("Non admis")
    SECOND_ENTRETIEN = "second_entretien", _("Second entretien")
    EN_ATTENTE = "en_attente", _("En attente")
    ABANDON_CANDIDAT = "abandon_candidat", _("Abandon candidat")
    ABANDON_ETS = "abandon_ets", _("Abandon entreprise")
    DEJA_PLACE = "deja_place", _("Déjà placé")
    ABSENT = "absent", _("Absent")
    APPAIRAGE_EN_COURS = "appairage_en_cours", _("Appairage en cours")


class Candidat(BaseModel):
    """
    Modèle principal représentant un candidat et son parcours.

    Les champs couvrent l'identité, la situation de formation et les données de
    placement ; les workflows de compte utilisateur et de promotion de rôle
    sont délégués aux services métier.
    """

    class StatutCandidat(models.TextChoices):
        """
        Etats de progression d'un candidat dans le parcours.
        """

        EN_ATTENTE_ENTRETIEN = "att_entretien", _("En attente d'entretien")
        EN_ATTENTE_RENTREE = "att_rentee", _("En attente de rentrée")
        EN_ATTENTE_COMMISSION = "att_commission", _("En attente de commission")
        EN_ACCOMPAGNEMENT = "accompagnement", _("En accompagnement")
        EN_APPAIRAGE = "appairage", _("En appairage")
        EN_FORMATION = "formation", _("En formation")
        ABANDON = "abandon", _("Abandon")
        AUTRE = "autre", _("Autre")

    class ParcoursPhase(models.TextChoices):
        """
        Phase métier cible du parcours candidat.

        Cette phase est introduite en mode compatible : elle n'écrase pas
        encore le champ legacy `statut`, mais prépare la future source de
        vérité du cycle candidat -> inscrit -> stagiaire.
        """

        POSTULANT = "postulant", _("Candidat postulant")
        INSCRIT_VALIDE = "inscrit_valide", _("Inscrit validé")
        STAGIAIRE_EN_FORMATION = "stagiaire_en_formation", _("Stagiaire / en cours de formation")
        SORTI = "sorti", _("Sorti de formation")
        ABANDON = "abandon", _("Abandon")

    class TypeContrat(models.TextChoices):
        """
        Types de contrat possibles.
        """

        APPRENTISSAGE = "apprentissage", _("Apprentissage")
        PROFESSIONNALISATION = "professionnalisation", _("Professionnalisation")
        SANS_CONTRAT = "sans_contrat", _("Sans contrat")
        POEI_POEC = "poei_poec", _("POEI / POEC")
        CRIF = "crif", _("Crif")
        AUTRE = "autre", _("Autre")

    class Disponibilite(models.TextChoices):
        """
        Disponibilité pour un placement.
        """

        IMMEDIATE = "immediate", _("Immédiate")
        DEUX_TROIS_MOIS = "2_3_mois", _("2-3 mois")
        SIX_MOIS = "6_mois", _("6 mois")

    class ContratSigne(models.TextChoices):
        """
        Etat de signature du contrat.
        """

        EN_COURS = "en_cours", _("En cours")
        OUI = "oui", _("Oui")
        NON = "non", _("Non")

    class CVStatut(models.TextChoices):
        """
        Statut d'avancement du CV.
        """

        OUI = "oui", _("Oui")
        EN_COURS = "en_cours", _("En cours")
        A_MODIFIER = "a_modifier", _("À modifier")

    # Champs principaux

    sexe = models.CharField(max_length=1, choices=[("M", "Masculin"), ("F", "Féminin")], blank=True, null=True)
    nom_naissance = models.CharField(max_length=100, blank=True, null=True)
    nom = models.CharField(max_length=100, verbose_name=_("Nom d'usage"))
    prenom = models.CharField(max_length=100, verbose_name=_("Prénom"))
    date_naissance = models.DateField(null=True, blank=True, verbose_name=_("Date de naissance"))
    departement_naissance = models.CharField(max_length=3, blank=True, null=True)
    commune_naissance = models.CharField(max_length=100, blank=True, null=True)
    pays_naissance = models.CharField(
        max_length=100, blank=True, null=True, verbose_name=_("Pays de naissance"), default="France"
    )
    nationalite = models.CharField(max_length=100, blank=True, null=True, default="Française")
    nir = models.CharField(max_length=15, blank=True, null=True, verbose_name=_("Numéro de sécurité sociale (NIR)"))
    # Contact
    email = models.EmailField(blank=True, null=True, verbose_name=_("Email"))
    phone_regex = RegexValidator(
        regex=r"^0\d{9}$",
        message=_("Le numéro doit comporter 10 chiffres et commencer par 0 (ex : 0612345678)."),
    )
    telephone = models.CharField(
        validators=[phone_regex], max_length=10, blank=True, null=True, verbose_name=_("Téléphone")
    )
    # Adresse
    street_number = models.CharField(max_length=10, blank=True, null=True, verbose_name=_("Numéro de voie"))
    street_name = models.CharField(max_length=255, blank=True, null=True, verbose_name=_("Nom de la rue"))
    street_complement = models.CharField(max_length=255, blank=True, null=True, verbose_name=_("Complément d'adresse"))
    ville = models.CharField(max_length=100, blank=True, null=True, verbose_name=_("Ville"))
    code_postal = models.CharField(max_length=10, blank=True, null=True, verbose_name=_("Code postal"))

    compte_utilisateur = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="candidat_associe",
        verbose_name=_("Compte utilisateur"),
        null=True,
        blank=True,
    )
    # Statut & formation
    entretien_done = models.BooleanField(default=False, verbose_name=_("Entretien réalisé"))
    test_is_ok = models.BooleanField(default=False, verbose_name=_("Test d'entrée réussi"))
    cv_statut = models.CharField(
        max_length=15,
        choices=CVStatut.choices,
        null=True,
        blank=True,
        db_index=True,
        verbose_name=_("CV"),
    )
    statut = models.CharField(
        max_length=30,
        choices=StatutCandidat.choices,
        default=StatutCandidat.AUTRE,
        verbose_name=_("Statut"),
        db_index=True,
    )
    parcours_phase = models.CharField(
        max_length=32,
        choices=ParcoursPhase.choices,
        null=True,
        blank=True,
        db_index=True,
        verbose_name=_("Phase de parcours"),
        help_text=_("Nouvelle phase métier cible. Ajoutée en compatibilité sans remplacer immédiatement le statut legacy."),
    )
    date_validation_inscription = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Date de validation d'inscription"),
    )
    date_entree_formation_effective = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Date d'entrée en formation effective"),
    )
    date_sortie_formation = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Date de sortie de formation"),
    )
    formation = models.ForeignKey(
        "Formation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="candidats",
        verbose_name=_("Formation"),
    )
    evenement = models.ForeignKey(
        "Evenement",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="candidats",
        verbose_name=_("Événement"),
    )
    notes = models.TextField(blank=True, null=True, verbose_name=_("Notes"))
    origine_sourcing = models.CharField(max_length=255, blank=True, null=True, verbose_name=_("Origine du sourcing"))
    date_inscription = models.DateTimeField(auto_now_add=True, verbose_name=_("Date d’inscription"), db_index=True)
    rqth = models.BooleanField(default=False, verbose_name=_("RQTH"))
    type_contrat = models.CharField(
        max_length=30, choices=TypeContrat.choices, blank=True, null=True, verbose_name=_("Type de contrat")
    )
    disponibilite = models.CharField(
        max_length=30, choices=Disponibilite.choices, blank=True, null=True, verbose_name=_("Disponibilité")
    )
    permis_b = models.BooleanField(default=False, verbose_name=_("Permis B"))
    communication = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Communication (étoiles)"),
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        choices=NIVEAU_CHOICES,
    )
    experience = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Expérience (étoiles)"),
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        choices=NIVEAU_CHOICES,
    )
    csp = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name=_("CSP (étoiles)"),
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        choices=NIVEAU_CHOICES,
    )
    vu_par = models.ForeignKey(
        get_user_model(),
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="candidats_vus",
        verbose_name=_("Vu par (staff)"),
    )

    # Champs complémentaires
    regime_social = models.CharField(
        max_length=100, blank=True, null=True, verbose_name=_("Régime social (Sécurité sociale)")
    )
    sportif_haut_niveau = models.BooleanField(default=False, verbose_name=_("Sportif de haut niveau?"))
    equivalence_jeunes = models.BooleanField(default=False, verbose_name=_("Equivalence jeune?"))
    extension_boe = models.BooleanField(default=False, verbose_name=_("Extension BOE?"))
    situation_actuelle = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name=_("Situation avant ce contrat"),
        help_text=_("Ex. demandeur d’emploi, lycéen, salarié…"),
    )
    dernier_diplome_prepare = models.CharField(
        max_length=255, blank=True, null=True, verbose_name=_("Dernier diplôme préparé")
    )
    diplome_plus_eleve_obtenu = models.CharField(
        max_length=255, blank=True, null=True, verbose_name=_("Diplôme ou titre le plus élevé obtenu")
    )
    derniere_classe = models.CharField(
        max_length=255, blank=True, null=True, verbose_name=_("Dernière classe fréquentée")
    )
    intitule_diplome_prepare = models.CharField(
        max_length=255, blank=True, null=True, verbose_name=_("Intitulé du diplôme préparé")
    )
    situation_avant_contrat = models.CharField(
        max_length=255, blank=True, null=True, verbose_name=_("Situation avant le contrat")
    )
    projet_creation_entreprise = models.BooleanField(default=False)
    representant_lien = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name=_("Lien avec le candidat"),
        help_text=_("Ex. père, mère, tuteur, autre"),
    )
    representant_nom_naissance = models.CharField(
        max_length=150, blank=True, null=True, verbose_name=_("Nom de naissance du représentant légal")
    )
    representant_prenom = models.CharField(
        max_length=150, blank=True, null=True, verbose_name=_("Prénom du représentant légal")
    )
    representant_email = models.EmailField(blank=True, null=True, verbose_name=_("Courriel du représentant légal"))
    representant_street_name = models.CharField(
        max_length=255, blank=True, null=True, verbose_name=_("Adresse du représentant légal")
    )
    representant_zip_code = models.CharField(
        max_length=10, blank=True, null=True, verbose_name=_("Code postal du représentant légal")
    )
    representant_city = models.CharField(
        max_length=100, blank=True, null=True, verbose_name=_("Commune du représentant légal")
    )
    # Placement
    responsable_placement = models.ForeignKey(
        get_user_model(),
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="candidats_gérés",
        verbose_name=_("Responsable placement"),
    )
    date_placement = models.DateField(null=True, blank=True, verbose_name=_("Date de placement"))
    entreprise_placement = models.ForeignKey(
        "Partenaire",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="placements",
        verbose_name=_("Entreprise de placement"),
    )
    resultat_placement = models.CharField(
        max_length=30,
        choices=ResultatPlacementChoices.choices,
        null=True,
        blank=True,
        verbose_name=_("Résultat du placement"),
    )
    entreprise_validee = models.ForeignKey(
        "Partenaire",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="entreprises_validees",
        verbose_name=_("Entreprise validée"),
    )
    contrat_signe = models.CharField(
        max_length=10, choices=ContratSigne.choices, null=True, blank=True, verbose_name=_("Contrat signé")
    )
    inscrit_gespers = models.BooleanField(
        default=False, verbose_name=_("Inscrit GESPERS"), help_text="Indique si le candidat est inscrit dans GESPERS."
    )
    courrier_rentree = models.BooleanField(default=False, verbose_name=_("Courrier de rentrée envoyé"))
    date_rentree = models.DateField(null=True, blank=True, verbose_name=_("Date de rentrée"))
    admissible = models.BooleanField(default=False, verbose_name=_("Admissible"))
    numero_osia = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        unique=True,
        help_text="Numéro OSIA du contrat signé",
    )
    # Appairage courant
    placement_appairage = models.ForeignKey(
        "Appairage",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="as_current_for",
        verbose_name=_("Appairage courant (placement)"),
    )

    class DemandeCompteStatut(models.TextChoices):
        """
        Statut d'une demande de création de compte utilisateur associé au candidat.
        """

        AUCUNE = "aucune", _("Aucune demande")
        EN_ATTENTE = "en_attente", _("Demande en attente")
        ACCEPTEE = "acceptee", _("Demande acceptée")
        REFUSEE = "refusee", _("Demande refusée")

    demande_compte_statut = models.CharField(
        max_length=20,
        choices=DemandeCompteStatut.choices,
        default=DemandeCompteStatut.AUCUNE,
        verbose_name=_("Statut de demande de compte"),
        help_text=_("Suivi minimal de la demande de création de compte utilisateur associée au candidat."),
    )
    demande_compte_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Date de demande de compte"),
        help_text=_("Horodatage de la dernière demande de création de compte effectuée par le candidat."),
    )
    demande_compte_traitee_par = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="demandes_compte_traitees",
        verbose_name=_("Demande de compte traitée par"),
        help_text=_("Utilisateur staff/admin ayant validé ou refusé la demande de compte."),
    )
    demande_compte_traitee_le = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Demande de compte traitée le"),
        help_text=_("Horodatage de la validation ou du refus de la demande de compte."),
    )

    class Meta:
        verbose_name = _("Candidat")
        verbose_name_plural = _("Candidats")
        ordering = ["-date_inscription"]
        indexes = [
            models.Index(fields=["evenement"]),
            models.Index(fields=["nom", "prenom"]),
            models.Index(fields=["placement_appairage"]),
        ]

    def __init__(self, *args, **kwargs):
        """
        Stocke un snapshot initial des valeurs pour permettre le suivi des changements.
        """
        super().__init__(*args, **kwargs)
        self._refresh_initial_snapshot()

    def _refresh_initial_snapshot(self):
        """
        Rafraîchit le snapshot interne utilisé pour comparer les changements
        entre deux sauvegardes successives.
        """
        init = {}
        for f in self._meta.concrete_fields:
            init[f.name] = self.__dict__.get(f.attname, None)
        self._initial = init

    def __str__(self):
        """
        Retourne le nom complet du candidat.
        """
        return self.nom_complet

    def __repr__(self):
        """
        Affiche un identifiant technique du candidat.
        """
        return f"<Candidat id={self.pk} nom='{self.nom}' prenom='{self.prenom}'>"

    @property
    def cv_statut_display(self):
        """
        Affiche le label du statut CV.
        """
        return self.get_cv_statut_display() if self.cv_statut else None

    @property
    def nom_complet(self):
        """
        Retourne la chaine "Prénom Nom".
        """
        return f"{self.prenom} {self.nom}".strip()

    @property
    def age(self):
        """
        Calcule l'âge en années à partir de la date de naissance.
        """
        if self.date_naissance:
            today = date.today()
            return (
                today.year
                - self.date_naissance.year
                - ((today.month, today.day) < (self.date_naissance.month, self.date_naissance.day))
            )
        return None

    @property
    def nb_appairages(self) -> int:
        """
        Retourne le nombre d'appairages liés.
        """
        return self.appairages.count()

    @property
    def placement_statut(self):
        """
        Retourne le statut de l'appairage courant (placement_appairage).
        """
        a = getattr(self, "placement_appairage", None)
        return getattr(a, "statut", None) if a else None

    @property
    def placement_statut_display(self):
        """
        Affiche le label du statut de l'appairage courant.
        """
        a = getattr(self, "placement_appairage", None)
        return a.get_statut_display() if a else None

    @property
    def placement_partenaire(self):
        """
        Retourne le partenaire lié à l'appairage courant.
        """
        a = getattr(self, "placement_appairage", None)
        return getattr(a, "partenaire", None) if a else None

    @property
    def placement_partenaire_nom(self):
        """
        Retourne le nom du partenaire de l'appairage courant.
        """
        p = self.placement_partenaire
        return getattr(p, "nom", None) if p else None

    @property
    def placement_responsable(self):
        """
        Retourne le responsable principal du placement courant.
        """
        a = getattr(self, "placement_appairage", None)
        if not a:
            return None
        return getattr(a, "created_by", None) or getattr(a, "updated_by", None)

    @property
    def placement_responsable_nom(self):
        """
        Retourne le nom du responsable du placement courant, ou l'email ou username si indisponible.
        """
        u = self.placement_responsable
        if not u:
            return None
        full = u.get_full_name()
        return full or getattr(u, "email", None) or getattr(u, "username", None)

    def valider_comme_stagiaire(self, actor=None):
        """
        Garantit qu'un compte existe puis le passe au rôle 'stagiaire'.
        """
        from ..services.candidate_account_service import CandidateAccountService

        return CandidateAccountService.promote_to_stagiaire(self, actor=actor)

    def valider_comme_candidatuser(self, actor=None):
        """
        Garantit qu'un compte existe puis le passe au rôle 'CANDIDAT_USER'.
        """
        from ..services.candidate_account_service import CandidateAccountService

        return CandidateAccountService.ensure_candidate_user(self, actor=actor)

    @property
    def est_valide_comme_stagiaire(self) -> bool:
        """
        Indique si le compte est validé comme stagiaire.
        """
        return bool(self.compte_utilisateur and self.compte_utilisateur.role == CustomUser.ROLE_STAGIAIRE)

    @property
    def est_valide_comme_candidatuser(self) -> bool:
        """
        Indique si le compte utilisateur lié est de type CANDIDAT_USER.
        """
        return bool(self.compte_utilisateur and self.compte_utilisateur.role == CustomUser.ROLE_CANDIDAT_USER)

    @property
    def role_utilisateur(self):
        """
        Retourne le libellé du rôle du compte utilisateur associé, ou '-' si absent.
        """
        if self.compte_utilisateur:
            return self.compte_utilisateur.get_role_display()
        return "-"

    @property
    def has_compte_utilisateur(self) -> bool:
        """
        Indique si un compte utilisateur est lié au candidat.
        """
        return bool(self.compte_utilisateur_id)

    @property
    def parcours_phase_display(self):
        """
        Retourne le libellé de la phase persistée, si elle existe.
        """
        return self.get_parcours_phase_display() if self.parcours_phase else None

    @property
    def is_en_formation_now(self) -> bool:
        """
        Indique si la session liée est actuellement en cours selon ses dates.
        """
        formation = getattr(self, "formation", None)
        if not formation:
            return False

        today = timezone.localdate()
        start_date = getattr(formation, "start_date", None)
        end_date = getattr(formation, "end_date", None)

        if start_date and end_date:
            return start_date <= today <= end_date
        if start_date:
            return start_date <= today
        return False

    @property
    def parcours_phase_calculee(self):
        """
        Dérive une phase métier lisible à partir des données déjà présentes.

        Cette propriété reste volontairement conservatrice pendant la phase M1 :
        elle n'écrit rien et ne remplace pas encore `statut`.
        """
        if self.statut == self.StatutCandidat.ABANDON:
            return self.ParcoursPhase.ABANDON

        formation = getattr(self, "formation", None)
        today = timezone.localdate()
        formation_end = getattr(formation, "end_date", None) if formation else None
        has_stagiaire_role = bool(
            self.compte_utilisateur and self.compte_utilisateur.role == CustomUser.ROLE_STAGIAIRE
        )

        if formation and formation_end and formation_end < today and (
            has_stagiaire_role
            or bool(self.date_entree_formation_effective)
            or self.statut == self.StatutCandidat.EN_FORMATION
        ):
            return self.ParcoursPhase.SORTI

        if formation and self.is_en_formation_now and (
            has_stagiaire_role
            or bool(self.date_entree_formation_effective)
            or self.statut == self.StatutCandidat.EN_FORMATION
        ):
            return self.ParcoursPhase.STAGIAIRE_EN_FORMATION

        if formation and (
            self.admissible
            or bool(self.date_validation_inscription)
            or self.inscrit_gespers
            or self.statut in {self.StatutCandidat.EN_ATTENTE_RENTREE, self.StatutCandidat.EN_FORMATION}
        ):
            return self.ParcoursPhase.INSCRIT_VALIDE

        return self.ParcoursPhase.POSTULANT

    @property
    def is_inscrit_valide(self) -> bool:
        """
        Indique si le candidat a dépassé la phase postulant.
        """
        return self.parcours_phase_calculee in {
            self.ParcoursPhase.INSCRIT_VALIDE,
            self.ParcoursPhase.STAGIAIRE_EN_FORMATION,
            self.ParcoursPhase.SORTI,
        }

    @property
    def is_stagiaire_role_aligned(self) -> bool:
        """
        Vérifie si le rôle utilisateur `stagiaire` est cohérent avec la phase calculée.
        """
        expects_stagiaire_role = self.parcours_phase_calculee == self.ParcoursPhase.STAGIAIRE_EN_FORMATION
        has_stagiaire_role = bool(
            self.compte_utilisateur and self.compte_utilisateur.role == CustomUser.ROLE_STAGIAIRE
        )
        return expects_stagiaire_role == has_stagiaire_role

    def clean(self):
        """
        Valide l'intégrité métier du candidat et normalise les champs sensibles.
        """
        super().clean()
        errors = {}

        self.nom = (self.nom or "").strip()
        self.prenom = (self.prenom or "").strip()

        if self.email:
            self.email = self.email.strip().lower()

        if self.nir:
            normalized_nir = re.sub(r"\s+", "", str(self.nir))
            if not normalized_nir.isdigit() or len(normalized_nir) not in (13, 15):
                errors["nir"] = _("Le NIR doit contenir 13 ou 15 chiffres.")
            else:
                self.nir = normalized_nir

        if not self.nom or not self.prenom:
            logger.warning(f"Candidat incomplet : nom ou prénom manquant (id={self.pk})")
        if self.statut == self.StatutCandidat.AUTRE:
            logger.info(f"Candidat #{self.pk} a un statut 'autre'")
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        """
        Gère la sauvegarde, la validation et la gestion d'historique de placement.
        """
        user = kwargs.pop("user", None)
        update_fields = kwargs.get("update_fields", None)

        is_new = self.pk is None
        original = None
        if not is_new:
            original = self.__class__.objects.filter(pk=self.pk).only(*PLACEMENT_FIELDS).first()

        if update_fields is None:
            self.full_clean()

        with transaction.atomic():
            super().save(*args, user=user, **kwargs)

            if original:
                self._log_changes()

            if not getattr(self, "_skip_placement_history", False):
                creer_historique_placement_si_necessaire(self, original=original)

        self._refresh_initial_snapshot()

    def delete(self, *args, **kwargs):
        """
        Supprime le candidat (sans supprimer le compte utilisateur associé).
        """
        logger.warning(f"Suppression du candidat : {self} (id={self.pk})")
        super().delete(*args, **kwargs)

    def _log_changes(self):
        """
        Journalise les modifications détectées sur l'objet.
        """
        changements = []
        for champ in self._initial:
            old = self._initial.get(champ)
            new = getattr(self, champ)
            if old != new:
                changements.append(f"{champ}: '{old}' → '{new}'")
        if changements:
            logger.info(f"Candidat modifié (id={self.pk}) – changements : " + "; ".join(changements))

    @property
    def ateliers_effectues(self):
        """
        Nombre d'ateliers TRE suivis par le candidat.
        """
        return self.ateliers_tre.count()

    @property
    def ateliers_labels(self):
        """
        Liste des labels des ateliers suivis.
        """
        return [a.get_type_atelier_display() for a in self.ateliers_tre.all()]

    @property
    def ateliers_resume(self):
        """
        Labels des ateliers suivis sous forme de texte concaténé.
        """
        return ", ".join(self.ateliers_labels)

    def lier_utilisateur(self, mot_de_passe: str | None = None, actor=None):
        """
        Alias legacy vers la source de vérité du service de compte candidat.
        """
        from ..services.candidate_account_service import CandidateAccountService

        return CandidateAccountService.provision_candidate_account(self, actor=actor)

    def creer_ou_lier_compte_utilisateur(self, actor=None):
        """
        Crée un nouveau compte utilisateur ou lie un compte existant basé sur l'email du candidat.
        """
        from ..services.candidate_account_service import CandidateAccountService

        return CandidateAccountService.provision_candidate_account(self, actor=actor)


class HistoriquePlacement(BaseModel):
    """
    Historique des modifications de placement d'un candidat.
    """

    candidat = models.ForeignKey(
        "Candidat", on_delete=models.CASCADE, related_name="historique_placements", verbose_name=_("Candidat")
    )
    date_placement = models.DateField(verbose_name=_("Date du placement"))
    entreprise = models.ForeignKey(
        "Partenaire",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="placements_historique",
        verbose_name=_("Entreprise"),
    )
    resultat = models.CharField(max_length=30, choices=ResultatPlacementChoices.choices, verbose_name=_("Résultat"))
    responsable = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="placements_realises",
        verbose_name=_("Responsable"),
    )
    commentaire = models.TextField(blank=True, null=True, verbose_name=_("Commentaire"))

    class Meta:
        verbose_name = _("Historique de placement")
        verbose_name_plural = _("Historique de placements")
        ordering = ["-date_placement"]

    def __str__(self):
        """
        Retourne une représentation lisible pour l'historique de placement.
        """
        return f"{self.candidat} – {self.date_placement} – {self.resultat}"
