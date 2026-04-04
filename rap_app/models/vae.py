"""Modèles du périmètre VAE."""

import logging
from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .base import BaseModel
from .centres import Centre

logger = logging.getLogger("application.vae")


class PeriodeMixin(models.Model):
    """
    Classe abstraite pour rattacher un objet à un centre, un mois et une année donnés.
    Apporte une validation du mois (1-12).
    """

    MOIS_CHOICES = [
        (1, _("Janvier")),
        (2, _("Février")),
        (3, _("Mars")),
        (4, _("Avril")),
        (5, _("Mai")),
        (6, _("Juin")),
        (7, _("Juillet")),
        (8, _("Août")),
        (9, _("Septembre")),
        (10, _("Octobre")),
        (11, _("Novembre")),
        (12, _("Décembre")),
    ]

    centre = models.ForeignKey(
        Centre, on_delete=models.CASCADE, verbose_name=_("Centre"), help_text=_("Centre associé à cet enregistrement")
    )
    annee = models.PositiveIntegerField(
        default=date.today().year,
        validators=[MinValueValidator(2000)],
        verbose_name=_("Année"),
        help_text=_("Année au format YYYY (ex: 2024)"),
    )
    mois = models.PositiveSmallIntegerField(
        default=date.today().month, choices=MOIS_CHOICES, verbose_name=_("Mois"), help_text=_("Mois de l'année (1-12)")
    )

    class Meta:
        abstract = True
        ordering = ["annee", "mois", "centre"]
        indexes = [
            models.Index(fields=["annee", "mois"], name="periode_idx"),
            models.Index(fields=["centre", "annee", "mois"], name="cent_periode_idx"),
        ]

    def clean(self):
        """
        Valide que le mois est compris entre 1 et 12.
        """
        super().clean()
        if self.mois < 1 or self.mois > 12:
            raise ValidationError({"mois": _("Le mois doit être compris entre 1 et 12.")})

    def get_periode_display(self):
        """
        Retourne la période sous forme 'NomDuMois Année'.
        """
        return f"{self.get_mois_display()} {self.annee}"


class VAE(BaseModel):
    """
    Modèle principal de Validation des Acquis de l'Expérience (VAE).
    Gère les statuts, la référence, le rattachement à un centre, et l'historique métier.
    """

    STATUT_CHOICES = [
        ("info", _("Demande d'informations")),
        ("dossier", _("Dossier en cours")),
        ("attente_financement", _("En attente de financement")),
        ("accompagnement", _("Accompagnement en cours")),
        ("jury", _("En attente de jury")),
        ("terminee", _("VAE terminée")),
        ("abandonnee", _("VAE abandonnée")),
    ]
    STATUTS_EN_COURS = ["info", "dossier", "attente_financement", "accompagnement", "jury"]
    STATUTS_TERMINES = ["terminee", "abandonnee"]

    centre = models.ForeignKey(
        Centre,
        on_delete=models.CASCADE,
        related_name="vaes",
        verbose_name=_("Centre"),
        help_text=_("Centre responsable de cette VAE"),
    )
    reference = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Référence"),
        help_text=_("Référence unique de la VAE (générée automatiquement si vide)"),
    )
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default="info",
        verbose_name=_("Statut"),
        help_text=_("Statut actuel de la VAE"),
    )
    commentaire = models.TextField(
        blank=True, verbose_name=_("Commentaire"), help_text=_("Notes ou informations supplémentaires sur cette VAE")
    )

    class Meta:
        verbose_name = _("VAE")
        verbose_name_plural = _("VAEs")
        ordering = ["-created_at", "centre"]
        indexes = [
            models.Index(fields=["statut"], name="vae_statut_idx"),
            models.Index(fields=["created_at"], name="vae_created_idx"),
            models.Index(fields=["reference"], name="vae_reference_idx"),
            models.Index(fields=["centre", "statut"], name="vae_centre_statut_idx"),
            models.Index(fields=["centre", "created_at"], name="vae_centre_created_idx"),
        ]

    def __str__(self):
        """
        Affichage lisible de la VAE.
        """
        return f"VAE {self.reference or self.id} - {self.get_statut_display()}"

    def __repr__(self):
        """
        Représentation technique de l'objet VAE.
        """
        return f"<VAE(id={self.pk}, ref='{self.reference}', statut='{self.statut}')>"

    def save(self, *args, **kwargs):
        """
        Génère la référence si absente. Exécute la validation et l'audit simple avant sauvegarde.
        """
        skip_validation = kwargs.pop("skip_validation", False)
        user = kwargs.pop("user", None)
        is_new = self.pk is None

        if not self.created_at:
            self.created_at = timezone.now()

        if not self.reference:
            prefix = "VAE"
            date_str = self.created_at.strftime("%Y%m%d")
            centre_id = self.centre_id if self.centre_id else "000"
            existing_refs = (
                VAE.objects.filter(reference__startswith=f"{prefix}-{date_str}-{centre_id}").only("id").count()
            )
            self.reference = f"{prefix}-{date_str}-{centre_id}-{existing_refs + 1:03d}"

        if not skip_validation:
            self.full_clean()

        if is_new:
            logger.info(f"Création VAE {self.reference} pour centre {self.centre}")
        else:
            logger.info(f"Mise à jour VAE {self.reference} - Statut: {self.get_statut_display()}")

        super().save(*args, user=user, **kwargs)

    def changer_statut(self, nouveau_statut, date_effet=None, commentaire="", user=None):
        """
        Change le statut et crée une entrée HistoriqueStatutVAE liée.
        """
        if nouveau_statut not in dict(self.STATUT_CHOICES):
            raise ValidationError(f"Statut invalide: {nouveau_statut}")

        date_effet = date_effet or timezone.now().date()
        self.statut = nouveau_statut
        self.save(skip_validation=True, user=user)

        HistoriqueStatutVAE.objects.create(
            vae=self, statut=nouveau_statut, date_changement_effectif=date_effet, commentaire=commentaire
        )

    def is_en_cours(self):
        """
        Retourne True si le statut de la VAE est en cours.
        """
        return self.statut in self.STATUTS_EN_COURS

    def is_terminee(self):
        """
        Retourne True si la VAE est terminée ou abandonnée.
        """
        return self.statut in self.STATUTS_TERMINES

    def dernier_changement_statut(self):
        """
        Retourne le dernier changement de statut de la VAE.
        """
        return self.historique_statuts.all().order_by("-date_changement_effectif", "-created_at").first()

    def duree_statut_actuel(self):
        """
        Retourne la durée en jours du statut actuel.
        """
        dernier_changement = self.dernier_changement_statut()
        if dernier_changement:
            return (timezone.now().date() - dernier_changement.date_changement_effectif).days
        return self.duree_jours

    @property
    def annee_creation(self):
        """
        Année de création de la VAE.
        """
        return self.created_at.year

    @property
    def mois_creation(self):
        """
        Mois de création de la VAE.
        """
        return self.created_at.month

    @property
    def duree_jours(self):
        """
        Nombre de jours depuis la création de la VAE.
        """
        return (timezone.now().date() - self.created_at.date()).days

    def to_csv_row(self):
        """
        Retourne une liste de données métier pour l'export CSV.
        """
        dernier_changement = self.dernier_changement_statut()
        return [
            self.id,
            self.reference,
            self.centre.nom if self.centre else "",
            self.get_statut_display(),
            self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else "",
            self.commentaire,
            self.duree_jours,
            self.is_en_cours(),
            self.is_terminee(),
            dernier_changement.get_statut_display() if dernier_changement else "",
            self.duree_statut_actuel(),
        ]

    def to_serializable_dict(self, exclude=None):
        """
        Retourne un dictionnaire sérialisable pour API.
        """
        exclude = exclude or []
        data = super().to_serializable_dict(exclude)
        dernier_changement = self.dernier_changement_statut()
        data.update(
            {
                "reference": self.reference,
                "centre_id": self.centre_id,
                "centre_nom": str(self.centre),
                "statut": self.statut,
                "statut_libelle": self.get_statut_display(),
                "commentaire": self.commentaire,
                "duree_jours": self.duree_jours,
                "is_en_cours": self.is_en_cours(),
                "is_terminee": self.is_terminee(),
                "dernier_changement_statut": (
                    {
                        "date": dernier_changement.date_changement_effectif.isoformat() if dernier_changement else None,
                        "statut": dernier_changement.statut if dernier_changement else None,
                        "statut_libelle": (dernier_changement.get_statut_display() if dernier_changement else None),
                    }
                    if dernier_changement
                    else None
                ),
                "duree_statut_actuel": self.duree_statut_actuel(),
            }
        )
        return data

    def clean(self):
        """
        Valide que la référence commence par 'VAE-' si présente.
        """
        super().clean()
        if self.reference and not self.reference.startswith("VAE-"):
            raise ValidationError({"reference": "La référence doit commencer par 'VAE-'"})


class HistoriqueStatutVAE(BaseModel):
    """
    Enregistre chaque changement de statut sur les VAE.
    """

    vae = models.ForeignKey(
        VAE,
        on_delete=models.CASCADE,
        related_name="historique_statuts",
        verbose_name=_("VAE"),
        help_text=_("VAE concernée par ce changement de statut"),
    )
    statut = models.CharField(
        max_length=20, choices=VAE.STATUT_CHOICES, verbose_name=_("Statut"), help_text=_("Nouveau statut de la VAE")
    )
    date_changement_effectif = models.DateField(
        verbose_name=_("Date effective du changement"), help_text=_("Date à laquelle le changement de statut a eu lieu")
    )
    commentaire = models.TextField(
        blank=True, verbose_name=_("Commentaire"), help_text=_("Notes ou informations supplémentaires")
    )

    class Meta:
        verbose_name = _("Historique de statut VAE")
        verbose_name_plural = _("Historiques de statuts VAE")
        ordering = ["-date_changement_effectif", "-created_at"]
        indexes = [
            models.Index(fields=["vae", "statut"], name="hist_vae_statut_idx"),
            models.Index(fields=["date_changement_effectif"], name="hist_vae_date_idx"),
            models.Index(fields=["vae", "date_changement_effectif"], name="hist_vae_vae_date_idx"),
        ]

    def __str__(self):
        """
        Affichage lisible d'un changement de statut.
        """
        return f"{self.vae} - {self.get_statut_display()} le {self.date_changement_effectif.strftime('%d/%m/%Y')}"

    def __repr__(self):
        """
        Représentation technique de l'objet HistoriqueStatutVAE.
        """
        return f"<HistoriqueStatutVAE(id={self.pk}, vae='{self.vae_id}', statut='{self.statut}')>"

    def clean(self):
        """
        Valide que la date de changement n'est pas future et postérieure à la création de la VAE.
        """
        super().clean()
        if self.date_changement_effectif > timezone.now().date():
            raise ValidationError(
                {"date_changement_effectif": _("La date du changement ne peut pas être dans le futur.")}
            )
        if self.vae and self.vae.created_at:
            if self.date_changement_effectif < self.vae.created_at.date():
                raise ValidationError(
                    {
                        "date_changement_effectif": _(
                            "La date du changement ne peut pas être antérieure à la date de création de la VAE."
                        )
                    }
                )

    def save(self, *args, **kwargs):
        """
        Valide puis sauvegarde l'objet. Ajoute un log lors de la création.
        """
        skip_validation = kwargs.pop("skip_validation", False)
        user = kwargs.pop("user", None)
        if not skip_validation:
            self.full_clean()
        if self.pk is None:
            logger.info(
                f"Nouveau statut enregistré pour {self.vae}: {self.get_statut_display()} le {self.date_changement_effectif}"
            )
        super().save(*args, user=user, **kwargs)

    def invalidate_caches(self):
        """
        Invalide les éventuels caches liés à cet historique et à la VAE associée.
        """
        super().invalidate_caches()
        from django.core.cache import cache

        cache_keys = [
            f"historiquestatut_{self.pk}",
            f"vae_{self.vae_id}_historique",
            f"vae_statuts_{self.vae_id}",
            f"vae_historique_{self.vae.reference}" if self.vae else None,
        ]
        for key in cache_keys:
            if key:
                cache.delete(key)

    def to_serializable_dict(self, exclude=None):
        """
        Retourne un dictionnaire sérialisable de l'objet.
        """
        exclude = exclude or []
        data = super().to_serializable_dict(exclude)
        data.update(
            {
                "vae_id": self.vae_id,
                "vae_reference": self.vae.reference if self.vae else None,
                "statut": self.statut,
                "statut_libelle": self.get_statut_display(),
                "date_changement_effectif": self.date_changement_effectif.isoformat(),
                "commentaire": self.commentaire,
            }
        )
        return data
