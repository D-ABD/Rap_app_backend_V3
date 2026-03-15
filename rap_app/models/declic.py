# rap_app/models/declic.py
from datetime import date
from typing import Optional, Dict, Any

from django.db import models, transaction
from django.utils.translation import gettext_lazy as _
from django.utils.timezone import localdate

from .base import BaseModel
from .centres import Centre

class Declic(BaseModel):
    """
    Enregistre les sessions Déclic pour les ateliers thématiques, avec suivi des effectifs et participation.
    """

    class TypeDeclic(models.TextChoices):
        ATELIER1 = "atelier_1", _("Atelier 1")
        ATELIER2 = "atelier_2", _("Atelier 2")
        ATELIER3 = "atelier_3", _("Atelier 3")
        ATELIER4 = "atelier_4", _("Atelier 4")
        ATELIER5 = "atelier_5", _("Atelier 5")
        ATELIER6 = "atelier_6", _("Atelier 6")
        AUTRE = "autre", _("Autre activité Déclic")

    type_declic = models.CharField(max_length=40, choices=TypeDeclic.choices)
    date_declic = models.DateField(_("Date"))

    centre = models.ForeignKey(
        Centre,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="declics",
        verbose_name=_("Centre de formation"),
    )

    nb_inscrits_declic = models.PositiveIntegerField(default=0)
    nb_presents_declic = models.PositiveIntegerField(default=0)
    nb_absents_declic = models.PositiveIntegerField(default=0)

    commentaire = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["-date_declic", "-id"]

    def __str__(self):
        """
        Affiche le type d'atelier et la date de la session.
        """
        return f"{self.get_type_declic_display()} – {self.date_declic:%d/%m/%Y}"

    def save(self, *args, user=None, **kwargs):
        """
        Met à jour nb_absents_declic à chaque sauvegarde. Ajoute éventuellement l'utilisateur aux champs d'audit.
        """
        self.nb_absents_declic = max(
            0, self.nb_inscrits_declic - self.nb_presents_declic
        )
        if user and not self.pk:
            self.created_by = user
        if user:
            self.updated_by = user

        with transaction.atomic():
            super().save(*args, **kwargs)

    @property
    def taux_presence_declic(self):
        """
        Pourcentage de présence à la session. Retourne 0 si nb_inscrits_declic est nul.
        """
        return (
            round((self.nb_presents_declic / self.nb_inscrits_declic) * 100, 1)
            if self.nb_inscrits_declic
            else 0
        )

    @property
    def objectif_annuel(self):
        """
        Retourne la valeur chiffrée de l'objectif annuel pour le centre et l'année de la session.
        """
        return ObjectifDeclic.get_objectif(self.centre, self.date_declic)

    @property
    def taux_atteinte_annuel(self):
        """
        Pourcentage d'atteinte de l'objectif annuel pour le centre.
        """
        if not self.objectif_annuel or not self.centre:
            return 0

        year = self.date_declic.year
        centre = self.centre
        objectif_annuel = self.objectif_annuel

        realise = (
            Declic.objects
            .filter(centre=centre, date_declic__year=year)
            .aggregate(total=models.Sum("nb_presents_declic"))["total"]
            or 0
        )
        return round((realise / objectif_annuel) * 100, 1) if objectif_annuel else 0

    @property
    def reste_a_faire(self):
        """
        Nombre restant de participants à accueillir pour atteindre l'objectif annuel.
        """
        if not self.objectif_annuel or not self.centre:
            return 0

        year = self.date_declic.year
        centre = self.centre
        objectif_annuel = self.objectif_annuel

        realise = (
            Declic.objects
            .filter(centre=centre, date_declic__year=year)
            .aggregate(total=models.Sum("nb_presents_declic"))["total"]
            or 0
        )
        return max(objectif_annuel - realise, 0)

    @classmethod
    def total_accueillis(cls, annee=None, centre=None, departement=None):
        """
        Calcule le total de personnes présentes pour une année, un centre ou un département donné.
        """
        annee = annee or localdate().year

        qs = cls.objects.filter(date_declic__year=annee)

        if centre:
            qs = qs.filter(centre=centre)

        if departement:
            qs = qs.select_related("centre")
            return sum(
                d.nb_presents_declic
                for d in qs
                if d.centre and getattr(d.centre, "departement", None) == departement
            )

        return qs.aggregate(total=models.Sum("nb_presents_declic"))["total"] or 0


class ObjectifDeclic(BaseModel):
    """
    Modèle d'objectif annuel de participation pour un centre de formation.
    """

    centre = models.ForeignKey(
        Centre,
        on_delete=models.CASCADE,
        related_name="objectifs_declic",
        verbose_name=_("Centre de formation"),
    )
    departement = models.CharField(
        max_length=3,
        blank=True,
        null=True,
        verbose_name=_("Département"),
    )
    annee = models.PositiveIntegerField(verbose_name=_("Année"))
    valeur_objectif = models.PositiveIntegerField(
        verbose_name=_("Objectif annuel (personnes)")
    )
    commentaire = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = _("Objectif Déclic (centre)")
        verbose_name_plural = _("Objectifs Déclic (centres)")
        ordering = ["-annee"]
        constraints = [
            models.UniqueConstraint(
                fields=["centre", "annee"],
                name="uniq_objectif_declic_centre_annee",
            )
        ]
        indexes = [models.Index(fields=["centre", "annee"])]

    def __str__(self):
        """
        Affiche le centre, le département éventuel et l'année de l'objectif.
        """
        base = str(self.centre)
        if self.departement:
            base += f" ({self.departement})"
        return f"{base} – {self.annee}"

    @property
    def data_declic(self) -> Dict[str, int]:
        """
        Retourne les agrégats de participation du centre pour l'année de l'objectif : inscrits, présents, absents.
        """
        if hasattr(self, "_data_declic_cache"):
            return self._data_declic_cache

        agg_ateliers = (
            Declic.objects.filter(
                centre=self.centre,
                date_declic__year=self.annee,
            ).aggregate(
                total_inscrits=models.Sum("nb_inscrits_declic"),
                total_presents=models.Sum("nb_presents_declic"),
                total_absents=models.Sum("nb_absents_declic"),
            )
            or {}
        )

        inscrits = agg_ateliers.get("total_inscrits") or 0
        presents = agg_ateliers.get("total_presents") or 0
        absents = agg_ateliers.get("total_absents") or 0

        self._data_declic_cache = {
            "inscrits": inscrits,
            "presents": presents,
            "absents": absents,
            "total_ateliers": presents,
        }
        return self._data_declic_cache

    def _ratio(self, num, den):
        """
        Calcule un pourcentage arrondi à une décimale. Retourne 0 si dénominateur nul.
        """
        return round((num / den) * 100, 1) if den else 0

    @property
    def taux_presence_ateliers(self):
        """
        Taux de présence global sur l'ensemble des ateliers de l'année.
        """
        return self._ratio(self.data_declic["presents"], self.data_declic["inscrits"])

    @property
    def taux_atteinte(self):
        """
        Taux d'atteinte de l'objectif annuel.
        """
        return self._ratio(self.data_declic["total_ateliers"], self.valeur_objectif)

    @property
    def reste_a_faire(self):
        """
        Nombre restant de participants pour atteindre l'objectif.
        """
        return max(self.valeur_objectif - self.data_declic["total_ateliers"], 0)

    def synthese_globale(self) -> Dict[str, Any]:
        """
        Retourne un résumé agrégé et les taux principaux pour l'objectif et l'année.
        """
        return {
            "objectif_id": self.id,
            "centre_id": getattr(self.centre, "id", None),
            "centre": getattr(self.centre, "nom", str(self.centre)),
            "annee": self.annee,
            "objectif": self.valeur_objectif,
            "realise": self.data_declic["total_ateliers"],
            "absents": self.data_declic["absents"],
            "taux_presence_ateliers": self.taux_presence_ateliers,
            "taux_atteinte": self.taux_atteinte,
            "reste_a_faire": self.reste_a_faire,
        }

    @classmethod
    def get_objectif(cls, centre, date):
        """
        Retourne la valeur de l'objectif annuel pour un centre et une année donnée, ou 0 si absent.
        """
        if not centre or not date:
            return 0
        return (
            cls.objects.filter(centre=centre, annee=date.year)
            .values_list("valeur_objectif", flat=True)
            .first()
            or 0
        )

    def save(self, *args, user=None, **kwargs):
        """
        Met à jour éventuellement le champ departement. Renseigne les champs d'audit utilisateur si fournis.
        """
        if user and not self.pk:
            self.created_by = user
        if user:
            self.updated_by = user

        centre = getattr(self, "centre", None)
        if centre:
            centre_dept = getattr(centre, "departement", None)
            if centre_dept and self.departement != centre_dept:
                self.departement = centre_dept

        with transaction.atomic():
            super().save(*args, **kwargs)