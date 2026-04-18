"""Modèle des statuts paramétrables."""

import logging
import re

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.html import format_html

from .base import BaseModel

logger = logging.getLogger("application.statut")


def get_default_color(statut_nom):
    """
    Retourne la couleur hexadécimale associée à un nom de statut.
    """
    COULEURS_PREDEFINIES = {
        "non_defini": "#080807",
        "projet_de_developpement": "#0E0E11",
        "a_recruter": "#051401",
        "recrutement_en_cours": "#0A54F4",
        "formation_en_cours": "#110452",
        "formation_a_annuler": "#FD570A",
        "formation_a_repousser": "#D6C424",
        "formation_annulee": "#922119",
        "formation_terminee": "#546E7A",
        "pleine": "#00980F",
        "quasi_pleine": "#04758C",
        "autre": "#7B8386",
    }
    return COULEURS_PREDEFINIES.get(statut_nom, "#607D8B")  # Valeur par défaut si clé inconnue


def calculer_couleur_texte(couleur_fond):
    """
    Retourne une couleur de texte contrastée selon la couleur de fond.
    """
    r = int(couleur_fond[1:3], 16)
    g = int(couleur_fond[3:5], 16)
    b = int(couleur_fond[5:7], 16)
    luminosite = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return "#000000" if luminosite > 0.5 else "#FFFFFF"


class Statut(BaseModel):
    """
    Modèle pour les statuts de formation avec nom, couleur et description personnalisée.
    """

    NON_DEFINI = "non_defini"
    PROJET_DE_DEVELOPPEMENT = "projet_de_developpement"
    A_RECRUTER = "a_recruter"
    RECRUTEMENT_EN_COURS = "recrutement_en_cours"
    FORMATION_EN_COURS = "formation_en_cours"
    FORMATION_A_ANNULER = "formation_a_annuler"
    FORMATION_A_REPOUSSER = "formation_a_repousser"
    FORMATION_ANNULEE = "formation_annulee"
    FORMATION_TERMINEE = "formation_terminee"
    PLEINE = "pleine"
    QUASI_PLEINE = "quasi_pleine"
    AUTRE = "autre"

    STATUT_CHOICES = [
        (NON_DEFINI, "Non défini"),
        (PROJET_DE_DEVELOPPEMENT, "Projet de développement"),
        (A_RECRUTER, "À recruter"),
        (RECRUTEMENT_EN_COURS, "Recrutement en cours"),
        (FORMATION_EN_COURS, "Formation en cours"),
        (FORMATION_A_ANNULER, "Formation à annuler"),
        (FORMATION_A_REPOUSSER, "Formation à repousser"),
        (FORMATION_ANNULEE, "Formation annulée"),
        (FORMATION_TERMINEE, "Formation terminée"),
        (PLEINE, "Pleine"),
        (QUASI_PLEINE, "Quasi-pleine"),
        (AUTRE, "Autre"),
    ]

    nom = models.CharField(
        max_length=100,
        choices=STATUT_CHOICES,
        verbose_name="Nom du statut",
        help_text="Identifiant du statut parmi les choix prédéfinis",
    )

    couleur = models.CharField(
        max_length=7,
        blank=True,
        verbose_name="Couleur",
        help_text="Couleur hexadécimale (#RRGGBB) pour l'affichage visuel",
    )

    description_autre = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Description personnalisée",
        help_text="Description requise quand le statut est 'Autre'",
    )

    def clean(self):
        """
        Vérifie la validité des champs : description_autre obligatoire pour 'autre', couleur au format hexadécimal.
        """
        if self.nom == self.AUTRE and not self.description_autre:
            raise ValidationError(
                {"description_autre": "Le champ 'description personnalisée' est requis pour le statut 'Autre'."}
            )

        if self.couleur:
            if not re.match(r"^#[0-9A-Fa-f]{6}$", self.couleur):
                raise ValidationError({"couleur": "La couleur doit être au format hexadécimal valide (#RRGGBB)."})

    def get_nom_display(self):
        """
        Retourne le libellé affiché du statut, ou la description personnalisée pour 'autre'.
        """
        if self.nom == self.AUTRE and self.description_autre:
            return self.description_autre
        return dict(self.STATUT_CHOICES).get(self.nom, self.nom)

    def get_badge_html(self):
        """
        Retourne le code HTML du badge pour le statut.
        """
        couleur = self.couleur or get_default_color(self.nom)
        couleur_texte = calculer_couleur_texte(couleur)
        return format_html(
            '<span class="badge" style="background-color:{}; color:{}; padding: 3px 8px; border-radius: 5px;">{}</span>',
            couleur,
            couleur_texte,
            self.get_nom_display(),
        )

    def to_csv_row(self) -> list[str]:
        """
        Retourne une liste de valeurs pour l'export CSV.
        """
        return [
            self.pk,
            self.get_nom_display(),
            self.nom,
            self.couleur,
            self.description_autre or "",
            self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else "",
            self.updated_at.strftime("%Y-%m-%d %H:%M:%S") if self.updated_at else "",
            self.created_by.username if hasattr(self, "created_by") and self.created_by else "Système",
        ]

    @classmethod
    def get_csv_fields(cls) -> list[str]:
        """
        Retourne la liste des champs d'export CSV.
        """
        return ["id", "libelle", "nom", "couleur", "description_autre", "created_at", "updated_at", "created_by"]

    @classmethod
    def get_csv_headers(cls) -> list[str]:
        """
        Retourne les entêtes des colonnes pour l'export CSV.
        """
        return [
            "ID",
            "Libellé affiché",
            "Nom interne",
            "Couleur",
            "Description personnalisée",
            "Créé le",
            "Modifié le",
            "Créé par",
        ]

    def save(self, *args, **kwargs):
        """
        Assigne une couleur par défaut si nécessaire, valide, puis enregistre.
        """
        is_new = self._state.adding
        user = kwargs.pop("user", None)
        skip_validation = kwargs.pop("skip_validation", False)

        if user:
            self._user = user

        if not self.couleur:
            self.couleur = get_default_color(self.nom)

        if not skip_validation:
            self.full_clean()

        super().save(*args, user=user, skip_validation=True, **kwargs)

        logger.info(
            "%s : %s (%s)", "Nouveau statut" if is_new else "Statut modifié", self.get_nom_display(), self.couleur
        )

    def invalidate_caches(self):
        """
        Supprime les entrées de cache liées à l'instance.
        """
        super().invalidate_caches()
        from django.core.cache import cache

        cache_keys = [f"statut_{self.pk}", f"statut_liste", f"statut_{self.nom}"]

        for key in cache_keys:
            cache.delete(key)

    def __str__(self):
        """
        Retourne le libellé du statut.
        """
        return self.get_nom_display()

    def __repr__(self):
        """
        Représentation technique du statut.
        """
        return f"<Statut(id={self.pk}, nom='{self.nom}', couleur='{self.couleur}')>"

    def to_serializable_dict(self, exclude=None):
        """
        Retourne un dictionnaire sérialisable comprenant le libellé et le badge HTML.
        """
        exclude = exclude or []
        data = super().to_serializable_dict(exclude)
        data.update(
            {
                "libelle": self.get_nom_display(),
                "badge_html": self.get_badge_html(),
            }
        )
        return data

    class Meta:
        """
        Options ORM pour le modèle Statut.
        """

        verbose_name = "Statut"
        verbose_name_plural = "Statuts"
        ordering = ["nom"]
        indexes = [
            models.Index(fields=["nom"], name="statut_nom_idx"),
            models.Index(fields=["couleur"], name="statut_couleur_idx"),
        ]
