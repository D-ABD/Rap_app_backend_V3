"""Modèles du périmètre Prépa."""

from datetime import date
from typing import Any, Dict, Optional

from django.db import models
from django.utils.timezone import localdate
from django.utils.translation import gettext_lazy as _

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
        return self.filter(models.Q(type_prepa__startswith="atelier") | models.Q(type_prepa="autre"))

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

    type_prepa = models.CharField(max_length=40, choices=TypePrepa.choices, verbose_name=_("Type d’activité"))
    date_prepa = models.DateField(_("Date"), help_text=_("Date de la séance ou de la semaine concernée"))
    date_debut_atelier = models.DateField(
        _("Date de début atelier"),
        null=True,
        blank=True,
        help_text=_("Date de début effective de l'atelier quand elle diffère de la date principale."),
    )
    date_fin_atelier = models.DateField(
        _("Date de fin atelier"),
        null=True,
        blank=True,
        help_text=_("Date de fin effective de l'atelier quand elle diffère de la date principale."),
    )

    centre = models.ForeignKey(
        Centre,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prepas",
        verbose_name=_("Centre de formation"),
    )
    formateur_animateur = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name=_("Formateur / animateur"),
        help_text=_("Nom de la personne qui anime la séance ou l'atelier."),
    )

    nombre_places_ouvertes = models.PositiveIntegerField(default=0, verbose_name=_("Places ouvertes (IC)"))
    nombre_prescriptions = models.PositiveIntegerField(default=0, verbose_name=_("Prescriptions (IC)"))
    nb_presents_info = models.PositiveIntegerField(default=0, verbose_name=_("Présents (IC)"))
    nb_absents_info = models.PositiveIntegerField(default=0, verbose_name=_("Absents (IC)"))
    nb_adhesions = models.PositiveIntegerField(default=0, verbose_name=_("Adhésions (IC)"))

    nb_inscrits_prepa = models.PositiveIntegerField(default=0, verbose_name=_("Inscrits (Atelier)"))
    nb_presents_prepa = models.PositiveIntegerField(default=0, verbose_name=_("Présents (Atelier)"))
    nb_absents_prepa = models.PositiveIntegerField(default=0, verbose_name=_("Absents (Atelier)"))
    nb_inscrits_prepa_hors_liste = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Inscrits hors liste nominative"),
    )
    nb_presents_prepa_hors_liste = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Présents hors liste nominative"),
    )
    nb_absents_prepa_hors_liste = models.PositiveIntegerField(
        default=0,
        verbose_name=_("Absents hors liste nominative"),
    )

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
        self.sync_compteurs_prepa()
        self.nb_absents_info = max(0, (self.nombre_prescriptions or 0) - (self.nb_presents_info or 0))

        if user is not None:
            if not self.pk:
                self.created_by = user
            self.updated_by = user

        super().save(*args, **kwargs)

    def sync_compteurs_prepa(self) -> None:
        """
        Aligne les compteurs atelier sur les participations nominatives quand elles existent,
        tout en conservant un complément manuel hors liste.
        """
        hors_liste_inscrits = max(0, self.nb_inscrits_prepa_hors_liste or 0)
        hors_liste_presents = max(0, self.nb_presents_prepa_hors_liste or 0)
        hors_liste_absents = max(0, self.nb_absents_prepa_hors_liste or 0)

        if self.pk:
            counts = self.presence_counts_prepa
            nominatif_total = (
                counts["inscrit"] + counts["present"] + counts["absent"] + counts["termine"] + counts["a_repositionner"]
            )
            if nominatif_total > 0 or any([hors_liste_inscrits, hors_liste_presents, hors_liste_absents]):
                inscrits = nominatif_total + hors_liste_inscrits
                presents = counts["present"] + counts["termine"] + hors_liste_presents
                absents = counts["absent"] + counts["inscrit"] + counts["a_repositionner"] + hors_liste_absents

                self.nb_presents_prepa = max(0, presents)
                self.nb_absents_prepa = max(0, absents)
                self.nb_inscrits_prepa = max(inscrits, self.nb_presents_prepa + self.nb_absents_prepa)
                return

        self.nb_inscrits_prepa = max(0, self.nb_inscrits_prepa or 0)
        self.nb_presents_prepa = max(0, self.nb_presents_prepa or 0)
        self.nb_absents_prepa = max(0, (self.nb_inscrits_prepa or 0) - (self.nb_presents_prepa or 0))

    @property
    def presence_counts_prepa(self) -> Dict[str, int]:
        """
        Répartition des participations nominatives par statut pour cette séance Prépa.
        """
        empty = {code: 0 for code, _ in PrepaPresenceStatut.choices}
        if not self.pk:
            return empty

        qs = getattr(self, "participations_stagiaires_prepa", None)
        if qs is None:
            qs = PrepaStagiaireParticipation.objects.filter(prepa=self)

        rows = qs.values("statut").annotate(total=models.Count("id"))
        for row in rows:
            empty[row["statut"]] = row["total"]
        return empty

    @property
    def nb_inscrits_prepa_nominatifs(self) -> int:
        counts = self.presence_counts_prepa
        return counts["inscrit"] + counts["present"] + counts["absent"] + counts["termine"] + counts["a_repositionner"]

    @property
    def nb_presents_prepa_nominatifs(self) -> int:
        counts = self.presence_counts_prepa
        return counts["present"] + counts["termine"]

    @property
    def nb_absents_prepa_nominatifs(self) -> int:
        counts = self.presence_counts_prepa
        return counts["absent"] + counts["inscrit"] + counts["a_repositionner"]

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
            ).aggregate(total=models.Sum("nb_presents_prepa"))["total"]
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
            ).aggregate(total=models.Sum("nb_presents_prepa"))["total"]
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
            ).aggregate(
                total=models.Sum("nb_presents_prepa")
            )["total"]
            or 0
        )
        fin = (
            cls.objects.filter(
                centre=centre,
                type_prepa=cls.TypePrepa.ATELIER6,
                date_prepa__year=annee,
            ).aggregate(
                total=models.Sum("nb_presents_prepa")
            )["total"]
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
                d.nb_presents_prepa for d in qs if d.centre and getattr(d.centre, "departement", None) == departement
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
            ObjectifPrepa.objects.filter(annee=annee).aggregate(total=models.Sum("valeur_objectif"))["total"] or 0
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
            ObjectifPrepa.objects.filter(annee=annee).aggregate(total=models.Sum("valeur_objectif"))["total"] or 0
        )
        engages_total = (
            cls.objects.filter(date_prepa__year=annee, type_prepa=cls.TypePrepa.ATELIER1).aggregate(
                total=models.Sum("nb_inscrits_prepa")
            )["total"]
            or 0
        )
        realise_total = (
            cls.objects.filter(date_prepa__year=annee, type_prepa=cls.TypePrepa.ATELIER1).aggregate(
                total=models.Sum("nb_presents_prepa")
            )["total"]
            or 0
        )
        adhesions_total = (
            cls.objects.filter(date_prepa__year=annee, type_prepa=cls.TypePrepa.INFO_COLLECTIVE).aggregate(
                total=models.Sum("nb_adhesions")
            )["total"]
            or 0
        )
        taux_atteinte_inscrits = round((engages_total / objectif_total) * 100, 1) if objectif_total else 0
        taux_atteinte = round((realise_total / objectif_total) * 100, 1) if objectif_total else 0

        return {
            "annee": annee,
            "objectif_total": objectif_total,
            "engages_total": engages_total,
            "realise_total": realise_total,
            "adhesions_total": adhesions_total,
            "taux_atteinte_inscrits": taux_atteinte_inscrits,
            "taux_atteinte_total": taux_atteinte,
            "reste_a_faire_inscrits": max(objectif_total - engages_total, 0),
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


class StagiairePrepaQuerySet(models.QuerySet):
    """
    QuerySet métier pour piloter le parcours individuel Prépa.
    """

    def en_attente_entree(self):
        return self.filter(atelier_1_realise=False, date_entree_parcours__isnull=True)

    def a_integrer_atelier_1(self):
        return self.en_attente_entree().filter(
            models.Q(prepa_origine__type_prepa=Prepa.TypePrepa.INFO_COLLECTIVE) | models.Q(prepa_origine__isnull=False)
        )

    def en_attente_prochain_atelier(self):
        return self.filter(atelier_1_realise=True, atelier_6_realise=False).exclude(statut_parcours="abandon")

    def en_parcours(self):
        return self.filter(statut_parcours="en_parcours")

    def termines(self):
        return self.filter(models.Q(statut_parcours="parcours_termine") | models.Q(atelier_6_realise=True))

    def abandons(self):
        return self.filter(statut_parcours="abandon")

    def orientes_afpa(self):
        return self.filter(orientation_finale__in=["afpa", "autre_centre_afpa"])

    def orientes_vers_autre_centre_afpa(self):
        return self.filter(orientation_finale="autre_centre_afpa")

    def entrants_atelier_1(self):
        return self.filter(atelier_1_realise=True)

    def sortants_atelier_6(self):
        return self.filter(atelier_6_realise=True)

    def synthese_parcours(self) -> Dict[str, Any]:
        stagiaires = list(self)
        entrants = sum(1 for stagiaire in stagiaires if stagiaire.atelier_1_realise)
        en_attente_entree = sum(1 for stagiaire in stagiaires if stagiaire.est_en_attente_entree)
        a_integrer_atelier_1 = sum(1 for stagiaire in stagiaires if stagiaire.est_a_integrer_atelier_1)
        en_attente_prochain_atelier = sum(1 for stagiaire in stagiaires if stagiaire.est_en_attente_prochain_atelier)
        en_parcours = sum(1 for stagiaire in stagiaires if stagiaire.statut_parcours_calcule == "en_parcours")
        termines = sum(1 for stagiaire in stagiaires if stagiaire.statut_parcours_calcule == "parcours_termine")
        abandons = sum(1 for stagiaire in stagiaires if stagiaire.statut_parcours_calcule == "abandon")
        orientes_afpa = sum(1 for stagiaire in stagiaires if stagiaire.est_oriente_afpa)
        orientes_autre_centre_afpa = sum(1 for stagiaire in stagiaires if stagiaire.est_oriente_vers_autre_centre_afpa)
        sorties_atelier_6 = sum(1 for stagiaire in stagiaires if stagiaire.atelier_6_realise)
        return {
            "total_stagiaires": len(stagiaires),
            "en_attente_entree": en_attente_entree,
            "a_integrer_atelier_1": a_integrer_atelier_1,
            "en_attente_prochain_atelier": en_attente_prochain_atelier,
            "en_parcours": en_parcours,
            "termines": termines,
            "abandons": abandons,
            "orientes_afpa": orientes_afpa,
            "orientes_autre_centre_afpa": orientes_autre_centre_afpa,
            "entrees_atelier_1": entrants,
            "sorties_atelier_6": sorties_atelier_6,
            "taux_transformation_vers_afpa": round((orientes_afpa / entrants) * 100, 1) if entrants else 0,
            "taux_abandon_vers_entrees": round((abandons / entrants) * 100, 1) if entrants else 0,
            "taux_orientation_autre_centre_afpa": (
                round((orientes_autre_centre_afpa / entrants) * 100, 1) if entrants else 0
            ),
        }


class PrepaPresenceStatut(models.TextChoices):
    """
    Statuts de participation nominative à une séance Prépa.
    """

    INSCRIT = "inscrit", _("Inscrit")
    PRESENT = "present", _("Présent")
    ABSENT = "absent", _("Absent")
    TERMINE = "termine", _("Terminé")
    A_REPOSITIONNER = "a_repositionner", _("À repositionner")

    @classmethod
    def active_statuses(cls) -> set[str]:
        return {cls.INSCRIT, cls.PRESENT, cls.ABSENT}

    @classmethod
    def present_like_statuses(cls) -> set[str]:
        return {cls.PRESENT, cls.TERMINE}


class PrepaStagiaireParticipation(BaseModel):
    """
    Liaison nominative entre une séance Prépa et un stagiaire suivi.
    """

    prepa = models.ForeignKey(
        Prepa,
        on_delete=models.CASCADE,
        related_name="participations_stagiaires_prepa",
        verbose_name=_("Séance Prépa"),
    )
    stagiaire_prepa = models.ForeignKey(
        "StagiairePrepa",
        on_delete=models.CASCADE,
        related_name="participations_prepa",
        verbose_name=_("Stagiaire Prépa"),
    )
    statut = models.CharField(
        max_length=16,
        choices=PrepaPresenceStatut.choices,
        default=PrepaPresenceStatut.INSCRIT,
        verbose_name=_("Statut de participation"),
    )
    commentaire = models.TextField(blank=True, null=True, verbose_name=_("Commentaire de présence"))

    class Meta:
        verbose_name = _("Participation stagiaire Prépa")
        verbose_name_plural = _("Participations stagiaires Prépa")
        constraints = [
            models.UniqueConstraint(
                fields=["prepa", "stagiaire_prepa"],
                name="uniq_prepa_stagiaire_participation",
            )
        ]
        indexes = [
            models.Index(fields=["prepa", "statut"]),
            models.Index(fields=["stagiaire_prepa", "statut"]),
        ]

    def __str__(self):
        return f"{self.prepa_id} / {self.stagiaire_prepa_id} → {self.get_statut_display()}"


class StagiairePrepa(BaseModel):
    """
    Personne suivie dans un parcours Prépa sans compte utilisateur ni fiche candidat.
    """

    objects = StagiairePrepaQuerySet.as_manager()

    class StatutPositionnement(models.TextChoices):
        A_POSITIONNER = "a_positionner", _("A positionner")
        POSITIONNE = "positionne", _("Positionné")
        EN_ATTENTE = "en_attente", _("En attente")

    class OrientationFinale(models.TextChoices):
        AFPA = "afpa", _("Orienté AFPA")
        AUTRE_CENTRE_AFPA = "autre_centre_afpa", _("Orienté vers un autre centre AFPA")
        HORS_AFPA = "hors_afpa", _("Autre orientation")

    class StatutParcours(models.TextChoices):
        EN_ATTENTE = "en_attente", _("En attente de parcours")
        EN_PARCOURS = "en_parcours", _("En parcours")
        PARCOURS_TERMINE = "parcours_termine", _("Parcours terminé")
        ABANDON = "abandon", _("Abandon")

    prepa_origine = models.ForeignKey(
        Prepa,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stagiaires_prepa",
        verbose_name=_("Prépa d'origine"),
    )
    centre = models.ForeignKey(
        Centre,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stagiaires_prepa",
        verbose_name=_("Centre"),
    )
    nom = models.CharField(max_length=120, verbose_name=_("Nom"))
    prenom = models.CharField(max_length=120, verbose_name=_("Prénom"))
    telephone = models.CharField(max_length=30, blank=True, null=True, verbose_name=_("Téléphone"))
    email = models.EmailField(blank=True, null=True, verbose_name=_("Email"))
    statut_parcours = models.CharField(
        max_length=24,
        choices=StatutParcours.choices,
        default=StatutParcours.EN_ATTENTE,
        db_index=True,
        verbose_name=_("Statut de parcours"),
    )
    date_entree_parcours = models.DateField(blank=True, null=True, verbose_name=_("Date d'entrée parcours"))
    date_sortie_parcours = models.DateField(blank=True, null=True, verbose_name=_("Date de sortie parcours"))
    prochain_atelier_prevu = models.CharField(
        max_length=40,
        choices=Prepa.TypePrepa.choices,
        blank=True,
        null=True,
        verbose_name=_("Prochain atelier prévu"),
        help_text=_("Atelier explicitement attendu ensuite, si le parcours a déjà été positionné."),
    )
    statut_positionnement = models.CharField(
        max_length=24,
        choices=StatutPositionnement.choices,
        blank=True,
        null=True,
        db_index=True,
        verbose_name=_("Statut de positionnement"),
    )
    orientation_finale = models.CharField(
        max_length=32,
        choices=OrientationFinale.choices,
        blank=True,
        null=True,
        db_index=True,
        verbose_name=_("Orientation finale"),
    )
    centre_afpa_cible = models.ForeignKey(
        Centre,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stagiaires_prepa_orientes",
        verbose_name=_("Centre AFPA cible"),
    )
    formation_afpa_cible = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name=_("Formation AFPA cible"),
    )
    date_orientation = models.DateField(blank=True, null=True, verbose_name=_("Date d'orientation"))
    entree_formation_confirmee = models.BooleanField(
        default=False,
        verbose_name=_("Entrée en formation AFPA confirmée"),
    )
    commentaire_suivi = models.TextField(blank=True, null=True, verbose_name=_("Commentaire de suivi"))
    motif_abandon = models.CharField(max_length=255, blank=True, null=True, verbose_name=_("Motif d'abandon"))

    atelier_1_realise = models.BooleanField(default=False, verbose_name=_("Atelier 1 réalisé"))
    atelier_2_realise = models.BooleanField(default=False, verbose_name=_("Atelier 2 réalisé"))
    atelier_3_realise = models.BooleanField(default=False, verbose_name=_("Atelier 3 réalisé"))
    atelier_4_realise = models.BooleanField(default=False, verbose_name=_("Atelier 4 réalisé"))
    atelier_5_realise = models.BooleanField(default=False, verbose_name=_("Atelier 5 réalisé"))
    atelier_6_realise = models.BooleanField(default=False, verbose_name=_("Atelier 6 réalisé"))
    atelier_autre_realise = models.BooleanField(default=False, verbose_name=_("Autre atelier réalisé"))

    date_atelier_1 = models.DateField(blank=True, null=True, verbose_name=_("Date atelier 1"))
    date_atelier_2 = models.DateField(blank=True, null=True, verbose_name=_("Date atelier 2"))
    date_atelier_3 = models.DateField(blank=True, null=True, verbose_name=_("Date atelier 3"))
    date_atelier_4 = models.DateField(blank=True, null=True, verbose_name=_("Date atelier 4"))
    date_atelier_5 = models.DateField(blank=True, null=True, verbose_name=_("Date atelier 5"))
    date_atelier_6 = models.DateField(blank=True, null=True, verbose_name=_("Date atelier 6"))
    date_atelier_autre = models.DateField(blank=True, null=True, verbose_name=_("Date autre atelier"))

    class Meta:
        verbose_name = _("Stagiaire Prépa")
        verbose_name_plural = _("Stagiaires Prépa")
        ordering = ["nom", "prenom", "id"]
        indexes = [
            models.Index(fields=["prepa_origine"]),
            models.Index(fields=["centre"]),
            models.Index(fields=["statut_parcours"]),
            models.Index(fields=["statut_positionnement"]),
            models.Index(fields=["orientation_finale"]),
            models.Index(fields=["nom", "prenom"]),
        ]

    def __str__(self):
        """
        Affichage lisible d'un stagiaire Prépa.
        """
        nom_complet = " ".join(part for part in [self.prenom, self.nom] if part)
        return nom_complet or f"Stagiaire Prépa #{self.pk}"

    def save(self, *args, user=None, **kwargs):
        """
        Aligne les champs de pilotage dérivés sans écraser les saisies existantes.
        """
        if self.prepa_origine and not self.centre:
            self.centre = self.prepa_origine.centre
        for flag_field, date_field in self.atelier_flag_map().values():
            if getattr(self, date_field) and not getattr(self, flag_field):
                setattr(self, flag_field, True)
        if self.date_atelier_1 and not self.date_entree_parcours:
            self.date_entree_parcours = self.date_atelier_1
        if self.date_atelier_6 and not self.date_sortie_parcours:
            self.date_sortie_parcours = self.date_atelier_6
        super().save(*args, user=user, **kwargs)

    def marquer_participation_atelier(self, type_prepa: str, date_participation=None, user=None) -> None:
        """
        Répercute une participation effective sur le suivi du parcours individuel.
        """
        mapping = self.atelier_flag_map().get(type_prepa)
        if not mapping:
            return

        flag_field, date_field = mapping
        changed_fields: list[str] = []

        if not getattr(self, flag_field):
            setattr(self, flag_field, True)
            changed_fields.append(flag_field)

        if date_participation and not getattr(self, date_field):
            setattr(self, date_field, date_participation)
            changed_fields.append(date_field)

        if type_prepa == Prepa.TypePrepa.ATELIER1 and date_participation and not self.date_entree_parcours:
            self.date_entree_parcours = date_participation
            changed_fields.append("date_entree_parcours")

        if type_prepa == Prepa.TypePrepa.ATELIER6 and date_participation and not self.date_sortie_parcours:
            self.date_sortie_parcours = date_participation
            changed_fields.append("date_sortie_parcours")

        if changed_fields:
            self.save(user=user, update_fields=list(dict.fromkeys(changed_fields)))

    @classmethod
    def atelier_flag_map(cls) -> Dict[str, tuple[str, str]]:
        """
        Mapping centralisé entre type d'atelier, champ booléen et champ date.
        """
        return {
            Prepa.TypePrepa.ATELIER1: ("atelier_1_realise", "date_atelier_1"),
            Prepa.TypePrepa.ATELIER2: ("atelier_2_realise", "date_atelier_2"),
            Prepa.TypePrepa.ATELIER3: ("atelier_3_realise", "date_atelier_3"),
            Prepa.TypePrepa.ATELIER4: ("atelier_4_realise", "date_atelier_4"),
            Prepa.TypePrepa.ATELIER5: ("atelier_5_realise", "date_atelier_5"),
            Prepa.TypePrepa.ATELIER6: ("atelier_6_realise", "date_atelier_6"),
            Prepa.TypePrepa.AUTRE: ("atelier_autre_realise", "date_atelier_autre"),
        }

    @property
    def ateliers_realises_count(self) -> int:
        """
        Nombre d'ateliers marqués comme réalisés.
        """
        return sum(int(bool(getattr(self, flag))) for flag, _ in self.atelier_flag_map().values())

    @property
    def ateliers_realises_labels(self) -> list[str]:
        """
        Libellés des ateliers déjà réalisés pour affichage et export.
        """
        labels = []
        for type_prepa, (flag, _) in self.atelier_flag_map().items():
            if getattr(self, flag):
                labels.append(Prepa.TypePrepa(type_prepa).label)
        return labels

    @property
    def dernier_atelier_label(self) -> Optional[str]:
        """
        Libellé du dernier atelier réalisé connu via les dates renseignées.
        """
        dated = []
        for type_prepa, (flag, date_field) in self.atelier_flag_map().items():
            if getattr(self, flag) and getattr(self, date_field):
                dated.append((getattr(self, date_field), Prepa.TypePrepa(type_prepa).label))
        if not dated:
            return None
        dated.sort(key=lambda item: item[0], reverse=True)
        return dated[0][1]

    @property
    def dernier_atelier_date(self):
        """
        Date du dernier atelier réalisé connu.
        """
        dated = []
        for _, (flag, date_field) in self.atelier_flag_map().items():
            if getattr(self, flag) and getattr(self, date_field):
                dated.append(getattr(self, date_field))
        return max(dated) if dated else None

    @property
    def a_deja_commence(self) -> bool:
        """
        Indique si le stagiaire a un début de parcours ou au moins un atelier réalisé.
        """
        return bool(self.date_entree_parcours or self.ateliers_realises_count)

    @property
    def est_en_attente_entree(self) -> bool:
        return self.statut_parcours_calcule == self.StatutParcours.EN_ATTENTE and not self.a_deja_commence

    @property
    def est_a_integrer_atelier_1(self) -> bool:
        return self.est_en_attente_entree and self.prepa_origine_id is not None

    @property
    def date_ic(self):
        prepa = getattr(self, "prepa_origine", None)
        if not prepa or prepa.type_prepa != Prepa.TypePrepa.INFO_COLLECTIVE:
            return None
        return prepa.date_prepa

    @property
    def est_en_attente_prochain_atelier(self) -> bool:
        return (
            self.statut_parcours_calcule == self.StatutParcours.EN_PARCOURS
            and self.prochain_atelier_attendu is not None
            and self.atelier_en_cours is None
        )

    @property
    def statut_parcours_calcule(self) -> str:
        """
        Statut métier recalculé à partir des ateliers réalisés et de l'orientation.
        """
        if self.statut_parcours == self.StatutParcours.ABANDON:
            return self.StatutParcours.ABANDON
        if self.atelier_6_realise or self.date_sortie_parcours:
            return self.StatutParcours.PARCOURS_TERMINE
        if self.atelier_1_realise or self.date_entree_parcours:
            return self.StatutParcours.EN_PARCOURS
        return self.StatutParcours.EN_ATTENTE

    def get_statut_parcours_calcule_display(self) -> str:
        """
        Libellé lisible du statut de parcours recalculé.
        """
        return dict(self.StatutParcours.choices).get(self.statut_parcours_calcule, self.statut_parcours_calcule)

    @property
    def prochain_atelier_attendu(self) -> Optional[str]:
        """
        Atelier attendu selon les règles métier, avec priorité à la planification explicite.
        """
        if self.atelier_6_realise or self.statut_parcours_calcule in {
            self.StatutParcours.PARCOURS_TERMINE,
            self.StatutParcours.ABANDON,
        }:
            return None
        if self.prochain_atelier_prevu:
            flag_field = self.atelier_flag_map().get(self.prochain_atelier_prevu, (None, None))[0]
            if flag_field and not getattr(self, flag_field):
                return self.prochain_atelier_prevu
        if not self.atelier_1_realise:
            return Prepa.TypePrepa.ATELIER1
        return Prepa.TypePrepa.ATELIER6

    @property
    def prochain_atelier_attendu_label(self) -> Optional[str]:
        """
        Libellé lisible du prochain atelier attendu.
        """
        if not self.prochain_atelier_attendu:
            return None
        return Prepa.TypePrepa(self.prochain_atelier_attendu).label

    @property
    def atelier_en_cours(self) -> Optional[str]:
        """
        Atelier actuellement en cours pour un stagiaire en parcours, déduit de
        sa dernière inscription/présence nominative sur une séance atelier.
        """
        if self.statut_parcours_calcule != self.StatutParcours.EN_PARCOURS:
            return None

        participations = getattr(self, "participations_prepa", None)
        if participations is None:
            participations = (
                PrepaStagiaireParticipation.objects.filter(
                    stagiaire_prepa=self,
                    statut__in=PrepaPresenceStatut.active_statuses(),
                    prepa__type_prepa__in=[
                        Prepa.TypePrepa.ATELIER1,
                        Prepa.TypePrepa.ATELIER2,
                        Prepa.TypePrepa.ATELIER3,
                        Prepa.TypePrepa.ATELIER4,
                        Prepa.TypePrepa.ATELIER5,
                        Prepa.TypePrepa.ATELIER6,
                        Prepa.TypePrepa.AUTRE,
                    ],
                )
                .select_related("prepa")
                .order_by("-prepa__date_debut_atelier", "-prepa__date_prepa", "-id")
            )
        else:
            participations = [
                participation
                for participation in participations.all()
                if participation.statut in PrepaPresenceStatut.active_statuses()
                and getattr(participation, "prepa", None) is not None
                and participation.prepa.type_prepa in {
                    Prepa.TypePrepa.ATELIER1,
                    Prepa.TypePrepa.ATELIER2,
                    Prepa.TypePrepa.ATELIER3,
                    Prepa.TypePrepa.ATELIER4,
                    Prepa.TypePrepa.ATELIER5,
                    Prepa.TypePrepa.ATELIER6,
                    Prepa.TypePrepa.AUTRE,
                }
            ]
            participations = sorted(
                participations,
                key=lambda participation: (
                    participation.prepa.date_debut_atelier or date.min,
                    participation.prepa.date_prepa or date.min,
                    participation.id or 0,
                ),
                reverse=True,
            )

        participation = participations[0] if isinstance(participations, list) and participations else (
            participations.first() if not isinstance(participations, list) else None
        )
        if not participation or not participation.prepa:
            return None
        return participation.prepa.type_prepa

    @property
    def atelier_en_cours_label(self) -> Optional[str]:
        if not self.atelier_en_cours:
            return None
        return Prepa.TypePrepa(self.atelier_en_cours).label

    @property
    def atelier_en_cours_date(self):
        if self.statut_parcours_calcule != self.StatutParcours.EN_PARCOURS:
            return None
        participation = (
            PrepaStagiaireParticipation.objects.filter(
                stagiaire_prepa=self,
                statut__in=PrepaPresenceStatut.active_statuses(),
            )
            .select_related("prepa")
            .order_by("-prepa__date_debut_atelier", "-prepa__date_prepa", "-id")
            .first()
        )
        if not participation or not participation.prepa:
            return None
        return participation.prepa.date_debut_atelier or participation.prepa.date_prepa

    @property
    def derniere_participation_atelier(self):
        participations = (
            PrepaStagiaireParticipation.objects.filter(
                stagiaire_prepa=self,
                prepa__type_prepa__in=[
                    Prepa.TypePrepa.ATELIER1,
                    Prepa.TypePrepa.ATELIER2,
                    Prepa.TypePrepa.ATELIER3,
                    Prepa.TypePrepa.ATELIER4,
                    Prepa.TypePrepa.ATELIER5,
                    Prepa.TypePrepa.ATELIER6,
                    Prepa.TypePrepa.AUTRE,
                ],
            )
            .select_related("prepa")
            .order_by("-prepa__date_debut_atelier", "-prepa__date_prepa", "-id")
        )
        return participations.first()

    @property
    def dernier_statut_participation(self) -> Optional[str]:
        participation = self.derniere_participation_atelier
        return participation.statut if participation else None

    @property
    def dernier_statut_participation_label(self) -> Optional[str]:
        participation = self.derniere_participation_atelier
        return participation.get_statut_display() if participation else None

    @property
    def dernier_statut_participation_liberant(self) -> bool:
        return self.dernier_statut_participation in {
            PrepaPresenceStatut.TERMINE,
            PrepaPresenceStatut.A_REPOSITIONNER,
        }

    @property
    def est_oriente_afpa(self) -> bool:
        """
        Indique si la sortie visée est une orientation AFPA.
        """
        return self.orientation_finale in {
            self.OrientationFinale.AFPA,
            self.OrientationFinale.AUTRE_CENTRE_AFPA,
        }

    @property
    def est_oriente_vers_autre_centre_afpa(self) -> bool:
        """
        Indique si le stagiaire est orienté vers un autre centre AFPA.
        """
        if self.orientation_finale == self.OrientationFinale.AUTRE_CENTRE_AFPA:
            return True
        if self.est_oriente_afpa and self.centre and self.centre_afpa_cible:
            return self.centre_id != self.centre_afpa_cible_id
        return False

    @property
    def ateliers_realises_ordonnes(self) -> list[dict[str, Any]]:
        """
        Liste ordonnée des ateliers réalisés avec leur date quand elle est connue.
        """
        data = []
        for type_prepa, (flag_field, date_field) in self.atelier_flag_map().items():
            if getattr(self, flag_field):
                data.append(
                    {
                        "value": type_prepa,
                        "label": Prepa.TypePrepa(type_prepa).label,
                        "date": getattr(self, date_field),
                    }
                )
        return sorted(
            data,
            key=lambda item: (item["date"] is None, item["date"] or date.min, item["label"]),
        )

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
        constraints = [models.UniqueConstraint(fields=["centre", "annee"], name="uniq_objectif_prepa_centre_annee")]
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
            )
            or {}
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
                total_atelier1_inscrits=models.Sum(
                    models.Case(
                        models.When(type_prepa=Prepa.TypePrepa.ATELIER1, then="nb_inscrits_prepa"),
                        default=0,
                        output_field=models.IntegerField(),
                    )
                ),
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
            )
            or {}
        )

        self._data_prepa_cache = {
            "places": agg_info.get("total_places") or 0,
            "prescriptions": agg_info.get("total_prescriptions") or 0,
            "presents_info": agg_info.get("total_presents_info") or 0,
            "adhesions": agg_info.get("total_adhesions") or 0,
            "inscrits": agg_ateliers.get("total_inscrits") or 0,
            "presents": agg_ateliers.get("total_presents") or 0,
            "absents": agg_ateliers.get("total_absents") or 0,
            "atelier1_inscrits": agg_ateliers.get("total_atelier1_inscrits") or 0,
            "atelier1_presents": agg_ateliers.get("total_atelier1") or 0,
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
        return self.taux_atteinte_presents

    @property
    def taux_atteinte_inscrits(self):
        """
        Taux d’atteinte de l’objectif sur les inscrits en atelier 1.
        """
        return self._ratio(self.data_prepa["atelier1_inscrits"], self.valeur_objectif)

    @property
    def taux_atteinte_presents(self):
        """
        Taux d’atteinte de l’objectif sur les présents en atelier 1.
        """
        return self._ratio(self.data_prepa["atelier1_presents"], self.valeur_objectif)

    @property
    def reste_a_faire(self):
        """
        Reste à faire (objectif - Atelier 1 réalisés, non négatif).
        """
        return self.reste_a_faire_presents

    @property
    def reste_a_faire_inscrits(self):
        """
        Reste à faire selon les inscrits en atelier 1.
        """
        return max(self.valeur_objectif - self.data_prepa["atelier1_inscrits"], 0)

    @property
    def reste_a_faire_presents(self):
        """
        Reste à faire selon les présents en atelier 1.
        """
        return max(self.valeur_objectif - self.data_prepa["atelier1_presents"], 0)

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
            "engages_atelier_1": self.data_prepa["atelier1_inscrits"],
            "realise": self.data_prepa["atelier1_presents"],
            "realises_atelier_1": self.data_prepa["atelier1_presents"],
            "adhesions": self.data_prepa["adhesions"],
            "absents": self.data_prepa["absents"],
            "taux_prescription": self.taux_prescription,
            "taux_presence": self.taux_presence_info,
            "taux_adhesion": self.taux_adhesion,
            "taux_presence_ateliers": self.taux_presence_ateliers,
            "taux_atteinte_inscrits": self.taux_atteinte_inscrits,
            "taux_atteinte_presents": self.taux_atteinte_presents,
            "taux_atteinte": self.taux_atteinte,
            "reste_a_faire_inscrits": self.reste_a_faire_inscrits,
            "reste_a_faire_presents": self.reste_a_faire_presents,
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
