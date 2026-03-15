from datetime import date
from typing import Optional, Dict, Any

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils.timezone import localdate

from .base import BaseModel
from .centres import Centre

class PrepaQuerySet(models.QuerySet):
    """
    QuerySet pour filtrer les activités Prépa.
    """
    def ateliers(self):
        """
        Retourne les activités de type atelier ou 'autre'.
        """
        return self.filter(
            models.Q(type_prepa__startswith="atelier") | models.Q(type_prepa="autre")
        )

    def ic(self):
        """
        Retourne les activités d'Information Collective.
        """
        return self.filter(type_prepa=Prepa.TypePrepa.INFO_COLLECTIVE)


class Prepa(BaseModel):
    """
    Modèle d'activité Prépa.
    """

    objects = PrepaQuerySet.as_manager()

    class TypePrepa(models.TextChoices):
        """
        Types d'activités Prépa.
        """
        INFO_COLLECTIVE = "info_collective", _("Information collective")
        ATELIER1 = "atelier_1", _("Atelier 1")
        ATELIER2 = "atelier_2", _("Atelier 2")
        ATELIER3 = "atelier_3", _("Atelier 3")
        ATELIER4 = "atelier_4", _("Atelier 4")
        ATELIER5 = "atelier_5", _("Atelier 5")
        ATELIER6 = "atelier_6", _("Atelier 6")
        AUTRE = "autre", _("Autre activité Prépa")

    type_prepa = models.CharField(
        max_length=40,
        choices=TypePrepa.choices,
        verbose_name=_("Type d’activité")
    )
    date_prepa = models.DateField(
        _("Date"),
        help_text=_("Date de la séance ou de la semaine concernée")
    )

    centre = models.ForeignKey(
        Centre,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prepas",
        verbose_name=_("Centre de formation"),
    )

    nombre_places_ouvertes = models.PositiveIntegerField(default=0, verbose_name=_("Places ouvertes (IC)"))
    nombre_prescriptions = models.PositiveIntegerField(default=0, verbose_name=_("Prescriptions (IC)"))
    nb_presents_info = models.PositiveIntegerField(default=0, verbose_name=_("Présents (IC)"))
    nb_absents_info = models.PositiveIntegerField(default=0, verbose_name=_("Absents (IC)"))
    nb_adhesions = models.PositiveIntegerField(default=0, verbose_name=_("Adhésions (IC)"))

    nb_inscrits_prepa = models.PositiveIntegerField(default=0, verbose_name=_("Inscrits (Atelier)"))
    nb_presents_prepa = models.PositiveIntegerField(default=0, verbose_name=_("Présents (Atelier)"))
    nb_absents_prepa = models.PositiveIntegerField(default=0, verbose_name=_("Absents (Atelier)"))

    commentaire = models.TextField(blank=True, null=True, verbose_name=_("Commentaire / notes"))

    class Meta:
        verbose_name = _("Séance Prépa")
        verbose_name_plural = _("Séances Prépa")
        ordering = ["-date_prepa", "-id"]
        indexes = [
            models.Index(fields=["centre"]),
            models.Index(fields=["date_prepa"]),
            models.Index(fields=["type_prepa"]),
        ]

    def __str__(self):
        """
        Affichage lisible d'une séance Prépa.
        """
        return f"{self.get_type_prepa_display()} – {self.date_prepa:%d/%m/%Y}"

    def save(self, *args, user=None, **kwargs):
        """
        Sauvegarde le modèle en mettant à jour les absents et les utilisateurs si fournis.
        """
        self.nb_absents_prepa = max(0, (self.nb_inscrits_prepa or 0) - (self.nb_presents_prepa or 0))
        self.nb_absents_info = max(0, (self.nombre_prescriptions or 0) - (self.nb_presents_info or 0))

        if user is not None:
            if not self.pk:
                self.created_by = user
            self.updated_by = user

        super().save(*args, **kwargs)

    @property
    def taux_prescription(self):
        """
        Pourcentage de prescriptions rapporté aux places ouvertes.
        """
        if not self.nombre_places_ouvertes:
            return 0
        return round((self.nombre_prescriptions / self.nombre_places_ouvertes) * 100, 1)

    @property
    def taux_presence_info(self):
        """
        Taux de présence à l'Information Collective.
        """
        if not self.nombre_prescriptions:
            return 0
        return round((self.nb_presents_info / self.nombre_prescriptions) * 100, 1)

    @property
    def taux_adhesion(self):
        """
        Taux d’adhésion parmi les présents à l’Information Collective.
        """
        if not self.nb_presents_info:
            return 0
        return round((self.nb_adhesions / self.nb_presents_info) * 100, 1)

    @property
    def taux_presence_prepa(self):
        """
        Taux de présence à l’atelier.
        """
        if not self.nb_inscrits_prepa:
            return 0
        return round((self.nb_presents_prepa / self.nb_inscrits_prepa) * 100, 1)

    @property
    def objectif_annuel(self):
        """
        Valeur de l'objectif annuel du centre pour l'année de la séance.
        """
        return ObjectifPrepa.get_objectif(self.centre, self.date_prepa)

    @property
    def taux_atteinte_annuel(self):
        """
        Taux d’atteinte de l’objectif annuel.
        """
        obj_annuel = self.objectif_annuel
        centre = self.centre
        date = self.date_prepa
        if not obj_annuel or not centre or not date:
            return 0

        realise = (
            Prepa.objects.filter(
                centre=centre,
                date_prepa__year=date.year,
                type_prepa=self.TypePrepa.ATELIER1,
            )
            .aggregate(total=models.Sum("nb_presents_prepa"))["total"]
            or 0
        )

        if not obj_annuel:
            return 0
        return round((realise / obj_annuel) * 100, 1)

    @property
    def reste_a_faire(self):
        """
        Différence entre objectif annuel et réalisé sur l’année et le centre.
        """
        obj_annuel = self.objectif_annuel
        centre = self.centre
        date = self.date_prepa
        if not obj_annuel or not centre or not date:
            return 0

        realise = (
            Prepa.objects.filter(
                centre=centre,
                date_prepa__year=date.year,
                type_prepa=self.TypePrepa.ATELIER1,
            )
            .aggregate(total=models.Sum("nb_presents_prepa"))["total"]
            or 0
        )
        return max(obj_annuel - realise, 0)

    @classmethod
    def taux_retention(cls, centre, annee):
        """
        Taux de rétention de l’Atelier 1 à l’Atelier 6 sur une année donnée pour un centre.
        """
        if not centre or not annee:
            return 0
        debut = (
            cls.objects.filter(
                centre=centre,
                type_prepa=cls.TypePrepa.ATELIER1,
                date_prepa__year=annee,
            ).aggregate(total=models.Sum("nb_presents_prepa"))["total"]
            or 0
        )
        fin = (
            cls.objects.filter(
                centre=centre,
                type_prepa=cls.TypePrepa.ATELIER6,
                date_prepa__year=annee,
            ).aggregate(total=models.Sum("nb_presents_prepa"))["total"]
            or 0
        )
        return round((fin / debut) * 100, 1) if debut else 0

    @classmethod
    def total_accueillis(cls, annee: Optional[int] = None, centre=None, departement=None) -> int:
        """
        Nombre de personnes présentes à l’Atelier 1 pour l’année et les filtres donnés.
        """
        annee = annee or localdate().year
        qs = cls.objects.filter(
            date_prepa__year=annee,
            type_prepa=cls.TypePrepa.ATELIER1,
        )

        if centre is not None:
            qs = qs.filter(centre=centre)

        if departement is not None:
            qs = qs.select_related("centre")
            return sum(
                d.nb_presents_prepa
                for d in qs
                if d.centre and getattr(d.centre, "departement", None) == departement
            )

        return qs.aggregate(total=models.Sum("nb_presents_prepa"))["total"] or 0

    @classmethod
    def accueillis_par_centre(cls, annee: Optional[int] = None) -> Dict[str, int]:
        """
        Dictionnaire des présents (Atelier 1) par centre pour une année.
        """
        annee = annee or localdate().year
        data = {}
        for centre in Centre.objects.all():
            total = cls.total_accueillis(annee=annee, centre=centre)
            data[getattr(centre, "nom", str(centre))] = total
        return data

    @classmethod
    def accueillis_par_departement(cls, annee: Optional[int] = None) -> Dict[str, int]:
        """
        Dictionnaire des présents (Atelier 1) agrégés par département pour une année.
        """
        annee = annee or localdate().year
        data: Dict[str, int] = {}
        for centre in Centre.objects.all():
            dep = getattr(centre, "departement", None)
            if not dep:
                continue
            total = cls.total_accueillis(annee=annee, departement=dep)
            data[dep] = data.get(dep, 0) + total
        return dict(sorted(data.items()))

    @classmethod
    def reste_a_faire_centre(cls, annee: Optional[int] = None) -> Dict[str, int]:
        """
        Dictionnaire du reste à faire (objectif - réalisés) par centre pour une année.
        """
        annee = annee or localdate().year
        data = {}
        objectifs = ObjectifPrepa.objects.filter(annee=annee).select_related("centre")
        for obj in objectifs:
            realise = cls.total_accueillis(annee=annee, centre=obj.centre)
            reste = max(obj.valeur_objectif - realise, 0)
            data[getattr(obj.centre, "nom", str(obj.centre))] = reste
        return data

    @classmethod
    def reste_a_faire_departement(cls, annee: Optional[int] = None) -> Dict[str, int]:
        """
        Dictionnaire du reste à faire par département pour une année.
        """
        annee = annee or localdate().year
        data: Dict[str, int] = {}
        objectifs = ObjectifPrepa.objects.filter(annee=annee).select_related("centre")
        for obj in objectifs:
            dep = getattr(obj.centre, "departement", None)
            if not dep:
                continue
            realise_dep = cls.total_accueillis(annee=annee, departement=dep)
            data[dep] = data.get(dep, 0) + max(obj.valeur_objectif - realise_dep, 0)
        return dict(sorted(data.items()))

    @classmethod
    def reste_a_faire_total(cls, annee: Optional[int] = None) -> int:
        """
        Reste à faire national (objectif total moins réalisés) pour l’année.
        """
        annee = annee or localdate().year
        objectif_total = (
            ObjectifPrepa.objects.filter(annee=annee)
            .aggregate(total=models.Sum("valeur_objectif"))["total"]
            or 0
        )
        realise_total = cls.total_accueillis(annee=annee)
        return max(objectif_total - realise_total, 0)

    @classmethod
    def synthese_objectifs(cls, annee: Optional[int] = None) -> Dict[str, Any]:
        """
        Synthèse des objectifs/réalisations pour l’année.
        """
        annee = annee or localdate().year
        objectif_total = (
            ObjectifPrepa.objects.filter(annee=annee)
            .aggregate(total=models.Sum("valeur_objectif"))["total"]
            or 0
        )
        realise_total = (
            cls.objects.filter(
                date_prepa__year=annee,
                type_prepa=cls.TypePrepa.ATELIER1
            ).aggregate(total=models.Sum("nb_presents_prepa"))["total"]
            or 0
        )
        taux_atteinte = round((realise_total / objectif_total) * 100, 1) if objectif_total else 0

        return {
            "annee": annee,
            "objectif_total": objectif_total,
            "realise_total": realise_total,
            "taux_atteinte_total": taux_atteinte,
            "reste_a_faire_total": max(objectif_total - realise_total, 0),
            "par_centre": cls.reste_a_faire_centre(annee),
            "par_departement": cls.reste_a_faire_departement(annee),
        }

    @classmethod
    def ateliers_filtered(cls, **filters):
        """
        Retourne les ateliers filtrés selon les critères.
        """
        return cls.objects.ateliers().filter(**filters)

    @classmethod
    def ic_filtered(cls, **filters):
        """
        Retourne les informations collectives filtrées selon les critères.
        """
        return cls.objects.ic().filter(**filters)


class ObjectifPrepa(BaseModel):
    """
    Objectifs annuels Prépa par centre.
    """

    centre = models.ForeignKey(
        Centre,
        on_delete=models.CASCADE,
        related_name="objectifs_prepa",
        verbose_name=_("Centre de formation"),
    )
    departement = models.CharField(
        max_length=3,
        blank=True,
        null=True,
        verbose_name=_("Département"),
    )
    annee = models.PositiveIntegerField(verbose_name=_("Année"))
    valeur_objectif = models.PositiveIntegerField(verbose_name=_("Objectif annuel (personnes)"))
    commentaire = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = _("Objectif Prépa (centre)")
        verbose_name_plural = _("Objectifs Prépa (centres)")
        ordering = ["-annee"]
        constraints = [
            models.UniqueConstraint(fields=["centre", "annee"], name="uniq_objectif_prepa_centre_annee")
        ]
        indexes = [models.Index(fields=["centre", "annee"])]

    def __str__(self):
        """
        Représentation textuelle de l'objectif Prépa.
        """
        base = str(self.centre)
        if self.departement:
            base += f" ({self.departement})"
        return f"{base} – {self.annee}"

    @property
    def data_prepa(self) -> Dict[str, int]:
        """
        Retourne les données agrégées Prepa pour ce centre et cette année.
        """
        if hasattr(self, "_data_prepa_cache"):
            return self._data_prepa_cache

        agg_info = (
            Prepa.objects.filter(
                centre=self.centre,
                date_prepa__year=self.annee,
                type_prepa=Prepa.TypePrepa.INFO_COLLECTIVE,
            ).aggregate(
                total_places=models.Sum("nombre_places_ouvertes"),
                total_prescriptions=models.Sum("nombre_prescriptions"),
                total_presents_info=models.Sum("nb_presents_info"),
                total_adhesions=models.Sum("nb_adhesions"),
            ) or {}
        )

        agg_ateliers = (
            Prepa.objects.filter(
                centre=self.centre,
                date_prepa__year=self.annee,
                type_prepa__startswith="atelier",
            ).aggregate(
                total_inscrits=models.Sum("nb_inscrits_prepa"),
                total_presents=models.Sum("nb_presents_prepa"),
                total_absents=models.Sum("nb_absents_prepa"),
                total_atelier1=models.Sum(
                    models.Case(
                        models.When(type_prepa=Prepa.TypePrepa.ATELIER1, then="nb_presents_prepa"),
                        default=0,
                        output_field=models.IntegerField(),
                    )
                ),
                total_atelier6=models.Sum(
                    models.Case(
                        models.When(type_prepa=Prepa.TypePrepa.ATELIER6, then="nb_presents_prepa"),
                        default=0,
                        output_field=models.IntegerField(),
                    )
                ),
            ) or {}
        )

        self._data_prepa_cache = {
            "places": agg_info.get("total_places") or 0,
            "prescriptions": agg_info.get("total_prescriptions") or 0,
            "presents_info": agg_info.get("total_presents_info") or 0,
            "adhesions": agg_info.get("total_adhesions") or 0,
            "inscrits": agg_ateliers.get("total_inscrits") or 0,
            "presents": agg_ateliers.get("total_presents") or 0,
            "absents": agg_ateliers.get("total_absents") or 0,
            "atelier1": agg_ateliers.get("total_atelier1") or 0,
            "atelier6": agg_ateliers.get("total_atelier6") or 0,
        }
        return self._data_prepa_cache

    def _ratio(self, num, den):
        """
        Calcule un taux en pourcentage, arrondi à 1 décimale, avec protection zéro division.
        """
        return round((num / den) * 100, 1) if den else 0

    @property
    def taux_prescription(self):
        """
        Taux de prescription sur les places ouvertes.
        """
        return self._ratio(self.data_prepa["prescriptions"], self.data_prepa["places"])

    @property
    def taux_presence_info(self):
        """
        Taux de présence à l’Info Collective.
        """
        return self._ratio(self.data_prepa["presents_info"], self.data_prepa["prescriptions"])

    @property
    def taux_adhesion(self):
        """
        Taux d'adhésion sur présents Info Collective.
        """
        return self._ratio(self.data_prepa["adhesions"], self.data_prepa["presents_info"])

    @property
    def taux_presence_ateliers(self):
        """
        Taux de présence global sur les ateliers.
        """
        return self._ratio(self.data_prepa["presents"], self.data_prepa["inscrits"])

    @property
    def taux_atteinte(self):
        """
        Taux d’atteinte de l’objectif (Atelier 1 / objectif).
        """
        return self._ratio(self.data_prepa["atelier1"], self.valeur_objectif)

    @property
    def reste_a_faire(self):
        """
        Reste à faire (objectif - Atelier 1 réalisés, non négatif).
        """
        return max(self.valeur_objectif - self.data_prepa["atelier1"], 0)

    def synthese_globale(self) -> Dict[str, Any]:
        """
        Fournit une synthèse sous forme de dictionnaire des agrégats et taux pour ce centre et cette année.
        """
        return {
            "objectif_id": self.id,
            "centre_id": getattr(self.centre, "id", None),
            "centre": getattr(self.centre, "nom", str(self.centre)),
            "annee": self.annee,
            "objectif": self.valeur_objectif,
            "realise": self.data_prepa["atelier1"],
            "adhesions": self.data_prepa["adhesions"],
            "absents": self.data_prepa["absents"],
            "taux_prescription": self.taux_prescription,
            "taux_presence": self.taux_presence_info,
            "taux_adhesion": self.taux_adhesion,
            "taux_presence_ateliers": self.taux_presence_ateliers,
            "taux_atteinte": self.taux_atteinte,
            "reste_a_faire": self.reste_a_faire,
        }

    @classmethod
    def get_objectif(cls, centre, date):
        """
        Retourne la valeur brute de l'objectif annuel d'un centre pour une année donnée.
        """
        if not centre or not date:
            return 0
        return (
            cls.objects.filter(centre=centre, annee=getattr(date, "year", date))
            .values_list("valeur_objectif", flat=True)
            .first()
            or 0
        )

    def save(self, *args, user=None, **kwargs):
        """
        Met à jour éventuellement le département à partir du centre lié et le créateur/modificateur si fourni.
        """
        if user is not None:
            if not self.pk:
                self.created_by = user
            self.updated_by = user

        centre = getattr(self, "centre", None)
        if centre:
            centre_dept = getattr(centre, "departement", None)
            if centre_dept and self.departement != centre_dept:
                self.departement = centre_dept

        super().save(*args, **kwargs)
