import logging
import re

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.urls import reverse
from django.utils.html import format_html
from django.utils.text import slugify

from .base import BaseModel

logger = logging.getLogger("application.typeoffre")


class TypeOffre(BaseModel):
    """Type d'offre de formation avec gestion du nom, personnalisation et couleur."""

    CRIF = "crif"
    ALTERNANCE = "alternance"
    POEC = "poec"
    POEI = "poei"
    TOSA = "tosa"
    AUTRE = "autre"
    NON_DEFINI = "non_defini"

    TYPE_OFFRE_CHOICES = [
        (CRIF, "CRIF"),
        (ALTERNANCE, "Alternance"),
        (POEC, "POEC"),
        (POEI, "POEI"),
        (TOSA, "TOSA"),
        (AUTRE, "Autre"),
        (NON_DEFINI, "Non défini"),
    ]

    COULEURS_PAR_DEFAUT = {
        CRIF: "#D735B4",
        ALTERNANCE: "#063c68",
        POEC: "#260a5b",
        POEI: "#0b4f04",
        TOSA: "#323435",
        AUTRE: "#ff6207",
        NON_DEFINI: "#000000",
    }

    nom = models.CharField(
        max_length=100,
        choices=TYPE_OFFRE_CHOICES,
        default=NON_DEFINI,
        verbose_name="Type d'offre",
        help_text="Sélectionnez le type d'offre de formation parmi les choix prédéfinis",
    )
    autre = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Autre (personnalisé)",
        help_text="Si vous avez choisi 'Autre', précisez le type d'offre personnalisé",
    )
    couleur = models.CharField(
        max_length=7,
        blank=True,
        null=True,
        verbose_name="Couleur associée (hexadécimal)",
        help_text="Code couleur hexadécimal (ex: #FF5733) pour l'affichage visuel",
    )

    def to_csv_row(self) -> list[str]:
        """Retourne les champs exportés en CSV selon get_csv_fields."""
        return [
            str(self.pk),
            self.get_nom_display(),
            self.nom,
            self.autre or "",
            self.couleur,
            str(getattr(self, "_formations_count", self.get_formations_count())),
            self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else "",
            self.updated_at.strftime("%Y-%m-%d %H:%M:%S") if self.updated_at else "",
            self.created_by.username if self.created_by else "Système",
        ]

    @classmethod
    def get_csv_fields(cls) -> list[str]:
        """Liste des champs en ordre pour l'export CSV."""
        return [
            "id",
            "libelle_affiche",
            "nom_technique",
            "autre",
            "couleur",
            "nb_formations",
            "created_at",
            "updated_at",
            "created_by",
        ]

    @classmethod
    def get_csv_headers(cls) -> list[str]:
        """En-têtes des colonnes pour l'export CSV."""
        return [
            "ID",
            "Libellé affiché",
            "Nom technique",
            "Autre (perso)",
            "Couleur",
            "Nb formations",
            "Créé le",
            "Modifié le",
            "Créé par",
        ]

    def clean(self):
        """Valide les champs selon les règles du modèle."""
        if self.nom == self.AUTRE and not self.autre:
            raise ValidationError(
                {"autre": "Le champ 'autre' doit être renseigné lorsque le type d'offre est 'Autre'."}
            )

        if self.couleur:
            if not re.match(r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$", self.couleur):
                raise ValidationError(
                    {"couleur": "Le format de couleur doit être un code hexadécimal valide (ex: #FF5733)."}
                )

        if self.nom == self.AUTRE and self.autre:
            qs = TypeOffre.objects.filter(nom=self.AUTRE, autre=self.autre)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(
                    {"autre": f"Un type d'offre personnalisé avec le nom '{self.autre}' existe déjà."}
                )

    def save(self, *args, **kwargs):
        """Prétraite et valide les champs avant sauvegarde, puis journalise la création ou modification."""
        user = kwargs.pop("user", None)
        skip_validation = kwargs.pop("skip_validation", False)

        if self.autre:
            self.autre = self.autre.strip()

        if self.couleur:
            self.couleur = self.couleur.lower()

        if not self.couleur:
            self.couleur = "#6c757d"

        self.assign_default_color()

        if not skip_validation:
            self.full_clean()

        is_new = self.pk is None

        old_instance = None
        if not is_new:
            try:
                old_instance = TypeOffre.objects.only("nom", "autre", "couleur").get(pk=self.pk)
            except TypeOffre.DoesNotExist:
                old_instance = None

        with transaction.atomic():
            super().save(*args, user=user, skip_validation=skip_validation, **kwargs)

            if is_new:
                logger.info(f"Création du type d'offre : {self}")
            elif old_instance:
                modifications = []
                if old_instance.nom != self.nom:
                    modifications.append(f"nom: {old_instance.nom} → {self.nom}")
                if old_instance.autre != self.autre:
                    modifications.append(f"autre: {old_instance.autre} → {self.autre}")
                if old_instance.couleur != self.couleur:
                    modifications.append(f"couleur: {old_instance.couleur} → {self.couleur}")
                if modifications:
                    logger.info(f"Modification du type d'offre #{self.pk} : " + ", ".join(modifications))

    def assign_default_color(self):
        """Attribue une couleur par défaut si nécessaire."""
        if not self.couleur or self.couleur == "#6c757d":
            self.couleur = self.COULEURS_PAR_DEFAUT.get(self.nom, "#6c757d")
            logger.debug(f"Couleur par défaut assignée au type d'offre {self}: {self.couleur}")

    def __str__(self):
        """Renvoie le nom affiché."""
        if self.nom == self.AUTRE and self.autre:
            return self.autre
        return dict(self.TYPE_OFFRE_CHOICES).get(self.nom, self.nom)

    def __repr__(self):
        """Représentation technique de l'instance."""
        return f"<TypeOffre(id={self.pk}, nom='{self.nom}', autre='{self.autre if self.nom == self.AUTRE else ''}')>"

    def is_personnalise(self):
        """Retourne True si le type est personnalisé."""
        return self.nom == self.AUTRE

    def calculer_couleur_texte(self):
        """Retourne la couleur du texte selon la couleur de fond."""
        try:
            hex_color = (self.couleur or "").lstrip("#")
            if len(hex_color) == 3:
                hex_color = "".join([c * 2 for c in hex_color])
            r, g, b = [int(hex_color[i : i + 2], 16) for i in (0, 2, 4)]
            luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
            return "#000000" if luminance > 0.5 else "#FFFFFF"
        except Exception as e:
            logger.warning(f"Erreur calcul couleur texte pour {self.couleur}: {str(e)}")
            return "#FFFFFF"

    def get_badge_html(self):
        """Retourne un badge HTML avec couleur adaptée."""
        couleur_texte = self.calculer_couleur_texte()
        return format_html(
            '<span class="badge" style="background-color:{}; color:{}; padding: 3px 8px; border-radius: 5px;">{}</span>',
            self.couleur,
            couleur_texte,
            self.__str__(),
        )

    def get_formations_count(self):
        """Retourne le nombre de formations liées."""
        if hasattr(self, "_formations_count"):
            return self._formations_count
        return self.formations.count()

    def to_serializable_dict(self, exclude=None):
        """Dictionnaire sérialisable étendu du modèle."""
        exclude = exclude or []
        data = super().to_serializable_dict(exclude)
        data.update(
            {
                "libelle": self.__str__(),
                "is_personnalise": self.is_personnalise(),
                "formations_count": self.get_formations_count(),
                "badge_html": self.get_badge_html(),
            }
        )
        return data

    def invalidate_caches(self):
        """Supprime les entrées de cache associées à l'instance."""
        super().invalidate_caches()
        from django.core.cache import cache

        cache_keys = [
            f"typeoffre_{self.pk}",
            f"typeoffre_liste",
            f"typeoffre_{self.nom}",
            f"formations_par_typeoffre_{self.pk}",
        ]
        for key in cache_keys:
            cache.delete(key)

    class Meta:
        """Configuration ORM : ordonnancement, contraintes d'unicité, index."""

        verbose_name = "Type d'offre"
        verbose_name_plural = "Types d'offres"
        ordering = ["nom"]
        constraints = [
            models.UniqueConstraint(
                fields=["autre"], name="unique_autre_non_null", condition=models.Q(nom="autre", autre__isnull=False)
            )
        ]
        indexes = [
            models.Index(fields=["nom"], name="typeoffre_nom_idx"),
            models.Index(fields=["autre"], name="typeoffre_autre_idx"),
        ]
