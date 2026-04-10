"""Modèles du périmètre jury."""

import logging
from datetime import date
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils.translation import gettext_lazy as _

from .base import BaseModel
from .centres import Centre

logger = logging.getLogger("application.vae")


def current_year() -> int:
    return date.today().year


def current_month() -> int:
    return date.today().month


class PeriodeMixin(models.Model):
    """
    Mixin abstrait pour gérer les périodes mensuelles par centre.
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
        default=current_year,
        validators=[MinValueValidator(2000)],
        verbose_name=_("Année"),
        help_text=_("Année au format YYYY (ex: 2024)"),
    )
    mois = models.PositiveSmallIntegerField(
        default=current_month, choices=MOIS_CHOICES, verbose_name=_("Mois"), help_text=_("Mois de l'année (1-12)")
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
        Valide que le mois est entre 1 et 12.
        """
        super().clean()
        if self.mois < 1 or self.mois > 12:
            raise ValidationError({"mois": _("Le mois doit être compris entre 1 et 12.")})

    def get_periode_display(self):
        """
        Retourne la période sous forme de chaîne (ex : 'Janvier 2024').
        """
        return f"{self.get_mois_display()} {self.annee}"


class SuiviJury(BaseModel, PeriodeMixin):
    """
    Suivi mensuel du nombre de jurys par centre.
    """

    objectif_jury = models.PositiveIntegerField(
        default=0, verbose_name=_("Objectif jury"), help_text=_("Nombre de jurys à réaliser pour le mois")
    )
    jurys_realises = models.PositiveIntegerField(
        default=0, verbose_name=_("Jurys réalisés"), help_text=_("Nombre de jurys effectivement réalisés ce mois")
    )
    pourcentage_mensuel = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal("0.00"),
        editable=False,
        verbose_name=_("Pourcentage mensuel"),
        help_text=_("Pourcentage d'atteinte de l'objectif mensuel (calculé automatiquement)"),
    )

    class Meta(PeriodeMixin.Meta):
        unique_together = ("centre", "annee", "mois")
        verbose_name = _("Suivi des jurys")
        verbose_name_plural = _("Suivis des jurys")
        indexes = PeriodeMixin.Meta.indexes + [
            models.Index(fields=["pourcentage_mensuel"], name="sj_pct_idx"),
            models.Index(fields=["objectif_jury", "jurys_realises"], name="sj_obj_jr_idx"),
        ]

    def __str__(self):
        """
        Affichage lisible de l'enregistrement.
        """
        return f"Jurys {self.centre} - {self.get_mois_display()} {self.annee}"

    def __repr__(self):
        """
        Affichage technique de l'objet pour le debug.
        """
        return f"<SuiviJury(id={self.pk}, centre='{self.centre}', periode='{self.get_periode_display()}')>"

    def _compute_pourcentage_mensuel(self):
        """
        Calcule le pourcentage d'atteinte mensuel.
        """
        if self.objectif_jury > 0:
            try:
                return (Decimal(self.jurys_realises) / Decimal(self.objectif_jury) * Decimal("100")).quantize(
                    Decimal("0.01")
                )
            except (ZeroDivisionError, InvalidOperation) as e:
                logger.error(f"Erreur calcul pourcentage jury {self}: {str(e)}")
                return Decimal("0.00")
        return Decimal("0.00")

    def save(self, *args, **kwargs):
        """
        Met à jour le pourcentage mensuel avant sauvegarde et journalise l'opération.
        """
        skip_validation = kwargs.pop("skip_validation", False)
        user = kwargs.pop("user", None)
        is_new = self._state.adding or self.pk is None

        self.pourcentage_mensuel = self._compute_pourcentage_mensuel()

        log_msg = f"{'Création' if is_new else 'Mise à jour'} suivi jury {self}"
        if user:
            log_msg += f" par {getattr(user, 'username', user)}"
        logger.info(log_msg)

        try:
            with transaction.atomic():
                if not skip_validation:
                    self.full_clean()
                super().save(*args, **kwargs)
                logger.debug(f"Suivi jury {self.pk} sauvegardé avec succès")
        except Exception as e:
            logger.critical(
                f"Échec sauvegarde suivi jury {getattr(self, 'pk', 'Nouveau')} | "
                f"Centre: {getattr(self.centre, 'pk', None)} | "
                f"Erreur: {str(e)}",
                exc_info=True,
            )
            raise

    def compute_pourcentage_atteinte(self):
        """
        Calcule en mémoire le pourcentage d'atteinte selon l'objectif courant.
        """
        objectif = self.get_objectif_auto()
        if objectif > 0:
            return round((self.jurys_realises or 0) / objectif * 100, 1)
        return 0

    def ecart(self):
        """
        Retourne la différence entre jurys réalisés et l'objectif.
        """
        return self.jurys_realises - self.objectif_jury

    def get_objectif_auto(self):
        """
        Retourne l'objectif applicable pour la période.
        """
        if self.objectif_jury and self.objectif_jury > 0:
            return self.objectif_jury
        return getattr(self.centre, "objectif_mensuel_jury", 0) or 0

    def invalidate_caches(self):
        """
        Invalide les caches liés à cette instance.
        """
        super().invalidate_caches()
        from django.core.cache import cache

        cache_keys = [
            f"suivijury_{self.pk}",
            f"suivijury_centre_{self.centre_id}",
            f"suivijury_periode_{self.annee}_{self.mois}",
            f"suivijury_stats_{self.centre_id}_{self.annee}",
        ]
        for key in cache_keys:
            cache.delete(key)

    @property
    def pourcentage_atteinte(self):
        """
        Retourne la valeur du pourcentage mensuel sauvegardé.
        """
        return self.pourcentage_mensuel

    def to_csv_row(self):
        """
        Structure les champs principaux en liste pour export CSV.
        """
        return [
            self.id,
            getattr(self.centre, "nom", "") if self.centre else "",
            self.annee,
            self.mois,
            self.get_mois_display(),
            self.objectif_jury,
            self.jurys_realises,
            self.ecart(),
            float(self.pourcentage_atteinte),
            self.get_objectif_auto(),
        ]

    def to_serializable_dict(self, exclude=None):
        """
        Retourne un dictionnaire serialisable des principales données de suivi.
        """
        exclude = exclude or []
        data = super().to_serializable_dict(exclude)
        data.update(
            {
                "centre_id": self.centre_id,
                "centre_nom": str(self.centre),
                "annee": self.annee,
                "mois": self.mois,
                "mois_libelle": self.get_mois_display(),
                "periode": self.get_periode_display(),
                "objectif_jury": self.objectif_jury,
                "jurys_realises": self.jurys_realises,
                "ecart": self.ecart(),
                "pourcentage_atteinte": float(self.compute_pourcentage_atteinte()),
                "objectif_auto": self.get_objectif_auto(),
            }
        )
        return data
