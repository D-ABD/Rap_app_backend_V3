# models/rapports.py

from django.core.exceptions import ValidationError
from django.db import models
from django.urls import reverse
from django.utils import timezone

from .base import BaseModel


class Rapport(BaseModel):
    """
    Modèle de rapport consolidé paramétrable.
    """

    # Constantes pour les types de rapport
    TYPE_OCCUPATION = "occupation"
    TYPE_CENTRE = "centre"
    TYPE_STATUT = "statut"
    TYPE_EVENEMENT = "evenement"
    TYPE_RECRUTEMENT = "recrutement"
    TYPE_PARTENAIRE = "partenaire"
    TYPE_REPARTITION = "repartition"
    TYPE_PERIODIQUE = "periodique"
    TYPE_ANNUEL = "annuel"
    TYPE_UTILISATEUR = "utilisateur"

    TYPE_CHOICES = [
        (TYPE_OCCUPATION, "Rapport d'occupation des formations"),
        (TYPE_CENTRE, "Rapport de performance par centre"),
        (TYPE_STATUT, "Rapport de suivi des statuts"),
        (TYPE_EVENEMENT, "Rapport d'efficacité des événements"),
        (TYPE_RECRUTEMENT, "Rapport de suivi du recrutement"),
        (TYPE_PARTENAIRE, "Rapport d'activité des partenaires"),
        (TYPE_REPARTITION, "Rapport de répartition des partenaires"),
        (TYPE_PERIODIQUE, "Rapport périodique"),
        (TYPE_ANNUEL, "Rapport annuel consolidé"),
        (TYPE_UTILISATEUR, "Rapport d'activité utilisateurs"),
    ]

    PERIODE_QUOTIDIEN = "quotidien"
    PERIODE_HEBDOMADAIRE = "hebdomadaire"
    PERIODE_MENSUEL = "mensuel"
    PERIODE_TRIMESTRIEL = "trimestriel"
    PERIODE_ANNUEL = "annuel"
    PERIODE_PERSONNALISE = "personnalise"

    PERIODE_CHOICES = [
        (PERIODE_QUOTIDIEN, "Quotidien"),
        (PERIODE_HEBDOMADAIRE, "Hebdomadaire"),
        (PERIODE_MENSUEL, "Mensuel"),
        (PERIODE_TRIMESTRIEL, "Trimestriel"),
        (PERIODE_ANNUEL, "Annuel"),
        (PERIODE_PERSONNALISE, "Période personnalisée"),
    ]

    FORMAT_PDF = "pdf"
    FORMAT_EXCEL = "excel"
    FORMAT_CSV = "csv"
    FORMAT_HTML = "html"
    FORMAT_CHOICES = [
        (FORMAT_PDF, "PDF"),
        (FORMAT_EXCEL, "Excel"),
        (FORMAT_CSV, "CSV"),
        (FORMAT_HTML, "HTML"),
    ]

    nom = models.CharField(max_length=255, verbose_name="Nom du rapport", help_text="Titre descriptif du rapport")

    type_rapport = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        verbose_name="Type de rapport",
        help_text="Catégorie du rapport déterminant son contenu",
    )

    periode = models.CharField(
        max_length=50,
        choices=PERIODE_CHOICES,
        verbose_name="Périodicité",
        help_text="Fréquence du rapport (pour les rapports récurrents)",
    )

    date_debut = models.DateField(
        verbose_name="Date de début", help_text="Date de début de la période couverte par le rapport"
    )

    date_fin = models.DateField(
        verbose_name="Date de fin", help_text="Date de fin de la période couverte par le rapport"
    )

    format = models.CharField(
        max_length=10,
        choices=FORMAT_CHOICES,
        default=FORMAT_HTML,
        verbose_name="Format",
        help_text="Format de génération du rapport (PDF, Excel, etc.)",
    )

    centre = models.ForeignKey(
        "Centre",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="Centre",
        help_text="Centre optionnel pour filtrer les données du rapport",
    )

    type_offre = models.ForeignKey(
        "TypeOffre",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="Type d'offre",
        help_text="Type d'offre optionnel pour filtrer les données du rapport",
    )

    statut = models.ForeignKey(
        "Statut",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="Statut",
        help_text="Statut optionnel pour filtrer les données du rapport",
    )

    formation = models.ForeignKey(
        "Formation",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="rapports",
        verbose_name="Formation",
        help_text="Formation spécifique pour les rapports ciblés",
    )

    donnees = models.JSONField(
        default=dict, verbose_name="Données du rapport", help_text="Contenu du rapport au format JSON"
    )

    temps_generation = models.FloatField(
        null=True,
        blank=True,
        verbose_name="Temps de génération (s)",
        help_text="Durée de génération du rapport en secondes",
    )

    class Meta:
        """
        Configuration ORM : tri par '-created_at', index sur certains champs.
        """

        verbose_name = "Rapport"
        verbose_name_plural = "Rapports"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at"], name="rapport_created_idx"),
            models.Index(fields=["date_debut", "date_fin"], name="rapport_periode_idx"),
            models.Index(fields=["type_rapport"], name="rapport_type_idx"),
            models.Index(fields=["format"], name="rapport_format_idx"),
            models.Index(fields=["centre"], name="rapport_centre_idx"),
            models.Index(fields=["formation"], name="rapport_formation_idx"),
        ]

    def __str__(self):
        """
        Affichage lisible du rapport.
        """
        return f"{self.nom} - {self.get_type_rapport_display()} ({self.date_debut} à {self.date_fin})"

    def __repr__(self):
        """
        Représentation technique du rapport.
        """
        return f"<Rapport(id={self.pk}, nom='{self.nom}', type='{self.type_rapport}')>"

    def clean(self):
        """
        Validation de la cohérence des dates et du respect de la périodicité sélectionnée.
        """
        super().clean()
        errors = {}

        if self.date_debut and self.date_fin:
            if self.date_debut > self.date_fin:
                errors["date_debut"] = "La date de début ne peut pas être postérieure à la date de fin."
                errors["date_fin"] = "La date de fin ne peut pas précéder la date de début."

            delta = (self.date_fin - self.date_debut).days

            max_days = {
                self.PERIODE_QUOTIDIEN: 1,
                self.PERIODE_HEBDOMADAIRE: 7,
                self.PERIODE_MENSUEL: 31,
                self.PERIODE_TRIMESTRIEL: 93,
                self.PERIODE_ANNUEL: 366,
            }

            if self.periode != self.PERIODE_PERSONNALISE:
                max_allowed = max_days.get(self.periode, None)
                if max_allowed is not None and delta > max_allowed:
                    errors["date_fin"] = f"La période sélectionnée ne doit pas dépasser {max_allowed} jour(s)."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        """
        Enregistre le rapport en déléguant à BaseModel.
        """
        super().save(*args, **kwargs)

    def to_serializable_dict(self, exclude=None):
        """
        Retourne une version sérialisable enrichie du rapport.
        """
        exclude = exclude or []
        data = super().to_serializable_dict(exclude)

        data.update(
            {
                "type_rapport_display": self.get_type_rapport_display(),
                "periode_display": self.get_periode_display(),
                "format_display": self.get_format_display(),
                "centre_nom": self.centre.nom if self.centre else None,
                "type_offre_nom": self.type_offre.nom if self.type_offre else None,
                "statut_nom": self.statut.nom if self.statut else None,
                "formation_nom": self.formation.nom if self.formation else None,
            }
        )

        return data

    def invalidate_caches(self):
        """
        Supprime du cache les entrées relatives au rapport courant.
        """
        super().invalidate_caches()

        cache_keys = [f"rapport_{self.pk}", f"rapport_liste_{self.type_rapport}", f"rapport_recent_{self.type_rapport}"]

        from django.core.cache import cache

        for key in cache_keys:
            cache.delete(key)
