"""Modèle métier des prospections et de leur historique.

Le modèle reste la source de vérité des champs métier de prospection, tandis
que le scoping et les résolutions owner/formation/centre sont désormais portés
par les couches API et services dédiées.
"""

import logging
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Count, OuterRef, Q, Subquery
from django.db.models.functions import Now
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .base import BaseModel
from .partenaires import Partenaire
from .prospection_choices import ProspectionChoices

logger = logging.getLogger(__name__)

# Constantes de longueur pour limiter la duplication et faciliter la maintenance
MAX_TYPE_LENGTH = 20
MAX_STATUT_LENGTH = 20
MAX_MOTIF_LENGTH = 30
MAX_OBJECTIF_LENGTH = 30
MAX_MOYEN_LENGTH = 50


class ProspectionManager(models.Manager):
    """
    Manager de requêtes utilisées pour filtrer les Prospection.
    """

    def actives(self):
        """
        Retourne les prospections actives (non archivées).
        """
        return self.filter(activite=Prospection.ACTIVITE_ACTIVE)

    def archivees(self):
        """
        Retourne les prospections archivées.
        """
        return self.filter(activite=Prospection.ACTIVITE_ARCHIVEE)

    def a_relancer(self, date=None):
        """
        Retourne les prospections actives dont la date de relance est échue ou atteinte.
        """
        date = date or timezone.now().date()
        return self.actives().filter(relance_prevue__isnull=False, relance_prevue__lte=date)

    def par_partenaire(self, partenaire_id):
        """
        Filtre les prospections pour un partenaire donné.
        """
        return self.filter(partenaire_id=partenaire_id).select_related("formation")

    def par_formation(self, formation_id):
        """
        Filtre les prospections par formation.
        """
        return self.filter(formation_id=formation_id).select_related("partenaire")

    def par_statut(self, statut):
        """
        Filtre les prospections par statut.
        """
        return self.filter(statut=statut)

    def statistiques_par_statut(self):
        """
        Retourne, pour chaque statut, le nombre de prospections correspondantes et leur label.
        """
        stats = self.values("statut").annotate(count=Count("id")).order_by("statut")
        labels = ProspectionChoices.get_statut_labels()
        return {
            s["statut"]: {
                "label": labels.get(s["statut"], s["statut"]),
                "count": s["count"],
            }
            for s in stats
        }


class Prospection(BaseModel):
    """
    Modèle principal de suivi des prospections partenaires.

    Il centralise l'état métier persistant d'une prospection ; les règles
    d'attribution et de visibilité sont traitées en amont par les services et
    viewsets spécialisés.
    """

    ACTIVITE_ACTIVE = "active"
    ACTIVITE_ARCHIVEE = "archivee"

    ACTIVITE_CHOICES = [
        (ACTIVITE_ACTIVE, _("Active")),
        (ACTIVITE_ARCHIVEE, _("Archivée")),
    ]

    activite = models.CharField(
        max_length=20,
        choices=ACTIVITE_CHOICES,
        default=ACTIVITE_ACTIVE,
        verbose_name=_("Activité"),
        db_index=True,
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prospections_attribuees",
        verbose_name=_("Responsable de la prospection"),
    )

    centre = models.ForeignKey(
        "rap_app.Centre",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_index=True,
        related_name="prospections",
        verbose_name="Centre",
    )

    formation = models.ForeignKey(
        "rap_app.Formation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prospections",
    )

    partenaire = models.ForeignKey(
        "rap_app.Partenaire",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prospections",
    )

    date_prospection = models.DateTimeField(default=timezone.now, verbose_name=_("Date de prospection"))

    relance_prevue = models.DateField(
        blank=True,
        null=True,
        verbose_name=_("Date de relance prévue"),
        help_text=_("Date de relance saisie par l’utilisateur"),
    )

    type_prospection = models.CharField(
        max_length=MAX_TYPE_LENGTH,
        choices=ProspectionChoices.TYPE_PROSPECTION_CHOICES,
        default=ProspectionChoices.TYPE_PREMIER_CONTACT,
        verbose_name=_("Type de prospection"),
    )
    motif = models.CharField(
        max_length=MAX_MOTIF_LENGTH,
        choices=ProspectionChoices.PROSPECTION_MOTIF_CHOICES,
        verbose_name=_("Motif"),
    )
    statut = models.CharField(
        max_length=MAX_STATUT_LENGTH,
        choices=ProspectionChoices.PROSPECTION_STATUS_CHOICES,
        default=ProspectionChoices.STATUT_A_FAIRE,
        verbose_name=_("Statut"),
    )
    objectif = models.CharField(
        max_length=MAX_OBJECTIF_LENGTH,
        choices=ProspectionChoices.PROSPECTION_OBJECTIF_CHOICES,
        default=ProspectionChoices.OBJECTIF_PRISE_CONTACT,
        verbose_name=_("Objectif"),
    )
    commentaire = models.TextField(blank=True, null=True, verbose_name=_("Commentaire"))

    moyen_contact = models.CharField(
        max_length=MAX_MOYEN_LENGTH,
        choices=ProspectionChoices.MOYEN_CONTACT_CHOICES,
        blank=True,
        null=True,
        verbose_name=_("Moyen de contact"),
    )

    objects = models.Manager()
    custom = ProspectionManager()

    class Meta:
        verbose_name = _("Suivi de prospection")
        verbose_name_plural = _("Suivis de prospections")
        ordering = ["-date_prospection"]
        indexes = [
            models.Index(fields=["statut"]),
            models.Index(fields=["date_prospection"]),
            models.Index(fields=["partenaire"]),
            models.Index(fields=["formation"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["owner"]),
            models.Index(fields=["centre"]),
            models.Index(fields=["motif"]),
            models.Index(fields=["objectif"]),
            models.Index(fields=["moyen_contact"]),
        ]
        constraints = [
            models.CheckConstraint(check=Q(date_prospection__lte=Now()), name="prosp_date_not_future"),
        ]

    def __str__(self):
        """
        Affichage synthétique en admin : partenaire, formation, statut et auteur.
        """
        formation = self.formation.nom if self.formation else _("Sans formation")
        partenaire_nom = self.partenaire.nom if self.partenaire else _("Sans partenaire")
        auteur = self.created_by.username if self.created_by else _("Anonyme")
        return f"{partenaire_nom} - {formation} - {self.get_statut_display()} ({auteur})"

    def clean(self):
        """
        Validation des champs avant sauvegarde :
        - Le centre doit correspondre à celui de la formation si définis.
        - La date de prospection ne peut être future.
        - Un commentaire est obligatoire si statut refusé ou annulé.
        """
        errors = {}

        if self.formation_id and self.centre_id:
            formation = getattr(self, "_formation_cache", None) or self.formation
            if formation and hasattr(formation, "centre_id"):
                if self.centre_id != formation.centre_id:
                    errors["centre"] = ValidationError(
                        "Le centre de la prospection doit correspondre au centre de la formation."
                    )

        if self.date_prospection and self.date_prospection > timezone.now():
            errors["date_prospection"] = ValidationError(_("La date de prospection ne peut pas être dans le futur."))

        if (
            self.statut
            in [
                ProspectionChoices.STATUT_REFUSEE,
                ProspectionChoices.STATUT_ANNULEE,
            ]
            and not self.commentaire
        ):
            errors["commentaire"] = ValidationError(
                _("Un commentaire est obligatoire pour un refus ou une annulation.")
            )

        if errors:
            raise ValidationError(errors)

    def sync_centre(self):
        """
        Synchronise le champ centre à partir de la formation ou du partenaire, si disponibles.
        """
        if self.formation_id:
            if hasattr(self, "formation") and self.formation:
                self.centre_id = self.formation.centre_id
        elif not self.centre_id and self.partenaire_id:
            if hasattr(self, "partenaire") and self.partenaire:
                self.centre_id = getattr(self.partenaire, "default_centre_id", None)

    def archiver(self, user=None, resultat=None):
        """
        Passe la prospection à l'état archivé. Crée une entrée d'historique.
        """
        if self.activite == Prospection.ACTIVITE_ARCHIVEE:
            logger.info(f"Prospection #{self.pk} déjà archivée.")
            return

        ancienne_activite = self.activite
        self.activite = Prospection.ACTIVITE_ARCHIVEE
        self.save(updated_by=user, update_fields=["activite", "updated_at"])

        self.creer_historique(
            champ_modifie="activite",
            ancienne_valeur=ancienne_activite,
            nouvelle_valeur=self.activite,
            commentaire=f"Prospection archivée (résultat : {resultat or 'n/a'})",
            user=user,
        )

    def desarchiver(self, user=None):
        """
        Restaure une prospection précédemment archivée. Crée une entrée d'historique.
        """
        if self.activite != Prospection.ACTIVITE_ARCHIVEE:
            return

        ancienne_activite = self.activite
        self.activite = Prospection.ACTIVITE_ACTIVE
        self.save(updated_by=user, update_fields=["activite", "updated_at"])

        self.creer_historique(
            champ_modifie="activite",
            ancienne_valeur=ancienne_activite,
            nouvelle_valeur=self.activite,
            commentaire="Prospection désarchivée",
            user=user,
        )

    def save(self, *args, **kwargs):
        """
        Surcharge du save pour garantir la synchronisation du centre, la cohérence statut/relance,
        et l'historisation sur modification des champs suivis.
        """
        self.sync_centre()

        updated_by = kwargs.pop("updated_by", None)
        skip_history = kwargs.pop("skip_history", False)
        is_new = self.pk is None
        user = updated_by or getattr(self, "created_by", None)

        TERMINAUX = {
            ProspectionChoices.STATUT_ACCEPTEE,
            ProspectionChoices.STATUT_REFUSEE,
            ProspectionChoices.STATUT_ANNULEE,
        }

        ancien = None
        if not is_new and self.pk:
            try:
                ancien = Prospection.objects.only(
                    "statut",
                    "relance_prevue",
                    "moyen_contact",
                    "formation_id",
                    "partenaire_id",
                    "centre_id",
                    "type_prospection",
                    "objectif",
                    "motif",
                    "commentaire",
                ).get(pk=self.pk)
            except Prospection.DoesNotExist:
                ancien = None

        old_statut = getattr(ancien, "statut", None)

        self.apply_relance_status_rules(terminal_statuses=TERMINAUX)

        self.full_clean()

        if "update_fields" in kwargs and kwargs.get("update_fields") is not None:
            update_fields = set(kwargs.get("update_fields") or [])
            if old_statut is not None and old_statut != self.statut:
                update_fields.add("statut")
            kwargs["update_fields"] = list(update_fields)

        super().save(*args, **kwargs)

        # Historisation des modifications des champs suivis
        if not is_new and not skip_history and ancien:
            changements = {}
            champs_suivis = [
                "statut",
                "type_prospection",
                "objectif",
                "motif",
                "commentaire",
                "formation_id",
                "partenaire_id",
                "centre_id",
                "relance_prevue",
                "moyen_contact",
            ]
            for champ in champs_suivis:
                old, new = getattr(ancien, champ, None), getattr(self, champ)
                if old != new:
                    changements[champ] = (old, new)

            if changements:
                username = getattr(user, "username", None) or "inconnu"
                logger.info(
                    f"[Prospection #{self.pk}] Changements par {username} : "
                    + "; ".join(f"{c}: {a}→{b}" for c, (a, b) in changements.items())
                )
                for champ, (old, new) in changements.items():
                    self.creer_historique(
                        champ_modifie=champ,
                        ancienne_valeur=str(old),
                        nouvelle_valeur=str(new),
                        ancien_statut=old if champ == "statut" else self.statut,
                        nouveau_statut=new if champ == "statut" else self.statut,
                        type_prospection=self.type_prospection,
                        commentaire=self.commentaire or "",
                        user=user,
                        prochain_contact=self.relance_prevue,
                        moyen_contact=self.moyen_contact if champ == "moyen_contact" else None,
                    )

    def apply_relance_status_rules(self, terminal_statuses=None):
        """
        Applique explicitement la règle métier liant `relance_prevue` et `statut`.

        Source de vérité retenue pour cette transition :
        - une prospection non terminale avec `relance_prevue` passe à `A_RELANCER`
        - une prospection `A_RELANCER` sans `relance_prevue` repasse à `EN_COURS`

        Le modèle reste responsable de cette cohérence afin que l'API, les
        services et les écritures directes convergent vers le même état.
        """
        terminal_statuses = terminal_statuses or {
            ProspectionChoices.STATUT_ACCEPTEE,
            ProspectionChoices.STATUT_REFUSEE,
            ProspectionChoices.STATUT_ANNULEE,
        }

        if self.relance_prevue and self.statut not in terminal_statuses:
            self.statut = ProspectionChoices.STATUT_A_RELANCER
        elif not self.relance_prevue and self.statut == ProspectionChoices.STATUT_A_RELANCER:
            self.statut = ProspectionChoices.STATUT_EN_COURS

        return self.statut

    def creer_historique(
        self,
        champ_modifie,
        ancienne_valeur=None,
        nouvelle_valeur=None,
        ancien_statut=None,
        nouveau_statut=None,
        type_prospection=None,
        commentaire="",
        user=None,
        prochain_contact=None,
        moyen_contact=None,
        resultat=None,
    ):
        """
        Ajoute une entrée HistoriqueProspection liée à cette Prospection.
        """
        from .prospection import HistoriqueProspection

        try:
            HistoriqueProspection.objects.create(
                prospection=self,
                champ_modifie=champ_modifie,
                ancienne_valeur=ancienne_valeur or "",
                nouvelle_valeur=nouvelle_valeur or "",
                ancien_statut=ancien_statut or self.statut,
                nouveau_statut=nouveau_statut or self.statut,
                type_prospection=type_prospection or self.type_prospection,
                commentaire=commentaire or "",
                prochain_contact=prochain_contact,
                moyen_contact=moyen_contact,
                resultat=resultat,
                created_by=user,
            )
        except Exception as e:
            logger.warning(f"Impossible de créer un historique pour Prospection #{self.pk} " f"({champ_modifie}) : {e}")

    @property
    def is_active(self):
        """
        Retourne True si la prospection est active.
        """
        return self.activite == Prospection.ACTIVITE_ACTIVE

    @property
    def relance_necessaire(self):
        """
        Retourne True si la prospection est active et que la date de relance est échue ou atteinte.
        """
        return bool(self.is_active and self.relance_prevue and self.relance_prevue <= timezone.now().date())

    @property
    def historique_recent(self):
        """
        Retourne les 5 derniers historiques liés à cette prospection, par date décroissante.
        """
        return self.historiques.order_by("-date_modification")[:5]


class HistoriqueProspectionManager(models.Manager):
    """
    Manager pour requêtes spécifiques sur HistoriqueProspection.
    """

    def a_relancer_cette_semaine(self):
        """
        Retourne les historiques avec un prochain_contact cette semaine.
        """
        today = timezone.now().date()
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        return self.filter(prochain_contact__range=(start, end)).select_related(
            "prospection", "prospection__partenaire"
        )

    def derniers_par_prospection(self):
        """
        Retourne le dernier historique pour chaque prospection.
        """
        sub = self.filter(prospection=OuterRef("prospection")).order_by("-date_modification").values("id")[:1]
        return self.filter(id__in=Subquery(sub))


class HistoriqueProspection(BaseModel):
    """
    Historique des modifications de Prospection.
    """

    prospection = models.ForeignKey(
        Prospection, on_delete=models.CASCADE, related_name="historiques", verbose_name=_("Prospection")
    )
    date_modification = models.DateTimeField(auto_now_add=True, verbose_name=_("Date de modification"))

    champ_modifie = models.CharField(max_length=50, verbose_name=_("Champ modifié"))
    ancienne_valeur = models.TextField(blank=True, null=True, verbose_name=_("Ancienne valeur"))
    nouvelle_valeur = models.TextField(blank=True, null=True, verbose_name=_("Nouvelle valeur"))

    ancien_statut = models.CharField(
        max_length=MAX_STATUT_LENGTH,
        choices=ProspectionChoices.PROSPECTION_STATUS_CHOICES,
        verbose_name=_("Ancien statut"),
    )
    nouveau_statut = models.CharField(
        max_length=MAX_STATUT_LENGTH,
        choices=ProspectionChoices.PROSPECTION_STATUS_CHOICES,
        verbose_name=_("Nouveau statut"),
    )
    type_prospection = models.CharField(
        max_length=MAX_TYPE_LENGTH,
        choices=ProspectionChoices.TYPE_PROSPECTION_CHOICES,
        default=ProspectionChoices.TYPE_NOUVEAU_PROSPECT,
        verbose_name=_("Type de prospection"),
    )
    commentaire = models.TextField(blank=True, null=True, verbose_name=_("Commentaire"))
    resultat = models.TextField(blank=True, null=True, verbose_name=_("Résultat"))
    # on garde ce champ côté historique pour tracer les choix saisis à ce moment-là
    prochain_contact = models.DateField(blank=True, null=True, verbose_name=_("Prochain contact"))

    moyen_contact = models.CharField(
        max_length=MAX_MOYEN_LENGTH,
        choices=ProspectionChoices.MOYEN_CONTACT_CHOICES,
        blank=True,
        null=True,
        verbose_name=_("Moyen de contact"),
    )

    objects = models.Manager()
    custom = HistoriqueProspectionManager()

    class Meta:
        verbose_name = _("Historique de prospection")
        verbose_name_plural = _("Historiques de prospections")
        ordering = ["-date_modification"]
        indexes = [
            models.Index(fields=["prospection"]),
            models.Index(fields=["date_modification"]),
            models.Index(fields=["prochain_contact"]),
            models.Index(fields=["nouveau_statut"]),
        ]

    def __str__(self):
        """
        Affichage : date de modification et nouveau statut.
        """
        return f"{self.date_modification.strftime('%d/%m/%Y')} – {self.get_nouveau_statut_display()}"

    def clean(self):
        """
        Ajoute un message de log si le statut n'est pas modifié.
        """
        super().clean()
        if self.ancien_statut == self.nouveau_statut:
            logger.warning(f"Historique sans changement de statut pour prospection #{self.prospection_id}")

    def save(self, *args, **kwargs):
        """
        Effectue la validation et la sauvegarde de l'historique.
        """
        skip_history = kwargs.pop("skip_history", False)
        self.full_clean()
        with transaction.atomic():
            super().save(*args, **kwargs)

    @property
    def est_recent(self) -> bool:
        """
        Retourne True si l'historique date de 7 jours ou moins.
        """
        return (timezone.now().date() - self.date_modification.date()).days <= 7

    @property
    def jours_avant_relance(self) -> int:
        """
        Retourne le nombre de jours avant le prochain contact, ou -1 si non applicable.
        """
        if not self.prochain_contact:
            return -1
        delta = (self.prochain_contact - timezone.now().date()).days
        return max(0, delta)

    @property
    def relance_urgente(self) -> bool:
        """
        Retourne True si la relance doit être faite dans 0 à 2 jours.
        """
        return 0 <= self.jours_avant_relance <= 2

    @classmethod
    def get_relances_a_venir(cls, jours=7):
        """
        Retourne les historiques avec un prochain_contact prévu dans le nombre de jours indiqué,
        en excluant les statuts refusé ou annulé.
        """
        today = timezone.now().date()
        limite = today + timedelta(days=jours)
        return (
            cls.objects.filter(prochain_contact__range=(today, limite))
            .exclude(
                prospection__statut__in=[
                    ProspectionChoices.STATUT_REFUSEE,
                    ProspectionChoices.STATUT_ANNULEE,
                ]
            )
            .select_related("prospection", "prospection__partenaire")
            .order_by("prochain_contact")
        )
