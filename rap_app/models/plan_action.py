"""Modèles de synthèse et de plan d'action hebdomadaire (commentaires de formation).

Ce module isole l'entité `PlanActionFormation`, qui s'appuie sur les commentaires
existantes sans en modifier le modèle : sélection, synthèse éditoriale et
plan d'action structuré sont gérés dans un périmètre propre, avec comptage
dérivé maintenu par signal sur la relation M2M.
"""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify

from .base import BaseModel
from .centres import Centre
from .commentaires import Commentaire
from .formations import Formation

SLUG_MAX_LENGTH = 255


class PlanActionFormation(BaseModel):
    """
    Plan de synthèse et d'actions rattaché à un ensemble de commentaires de formation.

    Représente une période d'analyse (journalière, hebdomadaire ou mensuelle) avec
    périmètre optionnel (centre et/ou formation), textes de travail
    (synthèse, points clés, plan d'action) et un lien explicite vers les
    commentaires sources via un ManyToMany. Le compteur `nb_commentaires` est
    synchronisé automatiquement lors des changements de cette relation
    (voir `signals/plan_action_signals.py`).
    """

    PERIODE_JOUR = "jour"
    PERIODE_SEMAINE = "semaine"
    PERIODE_MOIS = "mois"

    PERIODE_CHOICES = [
        (PERIODE_JOUR, "Journalier"),
        (PERIODE_SEMAINE, "Hebdomadaire"),
        (PERIODE_MOIS, "Mensuel"),
    ]

    STATUT_BROUILLON = "brouillon"
    STATUT_VALIDE = "valide"
    STATUT_ARCHIVE = "archive"

    STATUT_CHOICES = [
        (STATUT_BROUILLON, "Brouillon"),
        (STATUT_VALIDE, "Validé"),
        (STATUT_ARCHIVE, "Archivé"),
    ]

    titre = models.CharField(
        max_length=255,
        verbose_name="Titre",
        help_text="Intitulé court du plan (utilisé aussi comme base du slug).",
    )

    slug = models.SlugField(
        max_length=SLUG_MAX_LENGTH,
        unique=True,
        blank=True,
        null=True,
        verbose_name="Slug",
        help_text="Identifiant d'URL unique, généré automatiquement à partir du titre et du contexte.",
    )

    date_debut = models.DateField(
        verbose_name="Date de début de période",
        help_text="Borne basse de la période couverte par le plan (incluse).",
    )
    date_fin = models.DateField(
        verbose_name="Date de fin de période",
        help_text="Borne haute de la période couverte par le plan (incluse).",
    )

    periode_type = models.CharField(
        max_length=20,
        choices=PERIODE_CHOICES,
        default=PERIODE_SEMAINE,
        verbose_name="Type de période",
        help_text="Échelle métier d'analyse (jour, semaine ou mois).",
    )

    centre = models.ForeignKey(
        Centre,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="plans_action_formation",
        verbose_name="Centre",
        help_text="Périmètre optionnel : centre de formation concerné.",
    )
    formation = models.ForeignKey(
        Formation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="plans_action_formation",
        verbose_name="Formation",
        help_text="Périmètre optionnel : formation concernée (sinon le contexte est plus large).",
    )

    synthese = models.TextField(
        blank=True,
        default="",
        verbose_name="Synthèse",
        help_text="Synthèse rédigée à partir de la sélection de commentaires.",
    )
    resume_points_cles = models.TextField(
        blank=True,
        default="",
        verbose_name="Résumé des points clés",
        help_text="Vue courte, exploitable en lecture rapide.",
    )
    plan_action = models.TextField(
        blank=True,
        default="",
        verbose_name="Plan d'action (texte)",
        help_text="Plan d'action rédigé en texte libre (V1).",
    )
    plan_action_structured = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Plan d'action (structuré)",
        help_text="Données structurées optionnelles pour des évolutions futures (actions, échéances, etc.).",
    )

    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default=STATUT_BROUILLON,
        db_index=True,
        verbose_name="Statut",
        help_text="Cycle de vie : brouillon, validé ou archivé.",
    )

    commentaires = models.ManyToManyField(
        Commentaire,
        blank=True,
        related_name="plans_action_formation",
        verbose_name="Commentaires sources",
        help_text="Commentaires de formation explicitement retenus pour ce plan.",
    )

    nb_commentaires = models.IntegerField(
        default=0,
        verbose_name="Nombre de commentaires",
        help_text="Décompte des commentaires liés, synchronisé via la relation M2M (ne pas mettre à jour manuellement).",
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Métadonnées",
        help_text="Filtres, contexte de génération ou paramètres métier (snapshot souple).",
    )

    class Meta:
        verbose_name = "Plan d'action formation"
        verbose_name_plural = "Plans d'action formation"
        ordering = ["-date_debut", "-updated_at"]
        indexes = [
            models.Index(fields=["slug"], name="plan_action_slug_idx"),
            models.Index(fields=["date_debut"], name="plan_action_debut_idx"),
            models.Index(fields=["statut"], name="plan_action_statut_idx"),
            models.Index(fields=["centre", "formation"], name="plan_action_scope_idx"),
        ]

    def __str__(self):
        """
        Représentation lisible : titre, plage de dates et identifiant technique.
        """
        plage = ""
        if self.date_debut and self.date_fin:
            plage = f"{self.date_debut} → {self.date_fin}"
        return f"{self.titre} ({plage})" if plage else f"{self.titre} (pk={self.pk})"

    def __repr__(self):
        """
        Représentation technique pour le shell et le débogage.
        """
        return f"<PlanActionFormation(id={self.pk}, slug={self.slug!r}, statut={self.statut!r})>"

    def _slug_base(self) -> str:
        """
        Construit un segment d'identification pour le slug (titre, type de période, dates, périmètre).

        Returns:
            str: Texte relu par `slugify` pour obtenir un segment ASCII stable.
        """
        parts: list[str] = []
        if self.titre:
            parts.append(self.titre)
        parts.append(self.get_periode_type_display())
        if self.date_debut:
            parts.append(str(self.date_debut))
        if self.date_fin:
            parts.append(str(self.date_fin))
        if self.formation_id and getattr(self, "formation", None) is not None:
            parts.append(self.formation.nom)
        elif self.centre_id and getattr(self, "centre", None) is not None:
            parts.append(self.centre.nom)
        raw = " ".join(p for p in parts if p)
        return slugify(raw) or slugify(f"plan-{self.pk or 'new'}")

    def clean(self):
        """
        Règles d'intégrité sur le titre, les dates (et délégué au parent pour la cohérence générique).
        """
        super().clean()
        if self.titre is not None:
            self.titre = self.titre.strip()
        if not self.titre:
            raise ValidationError(
                {
                    "titre": "Le titre est obligatoire.",
                }
            )
        if self.date_debut and self.date_fin and self.date_fin < self.date_debut:
            raise ValidationError(
                {
                    "date_fin": "La date de fin doit être postérieure ou égale à la date de début.",
                }
            )

    def save(self, *args, **kwargs):
        """
        Génère le slug si absent, applique unicité par suffixe numérique, puis sauvegarde.

        S'appuie sur `django.utils.text.slugify` et sur le même principe de dédoublonnage
        que d'autres entités de l'application (ex. partenaires).
        """
        if not self.slug:
            self.slug = self._unique_slug()
        self.full_clean()
        super().save(*args, **kwargs)

    def _unique_slug(self) -> str:
        """
        Retourne un slug unique, dérivé de `_slug_base` avec incrément si collision.

        Returns:
            str: Valeur prête à être affectée à `self.slug` (max SLUG_MAX_LENGTH caractères).
        """
        base = self._slug_base() or "plan"
        if len(base) > SLUG_MAX_LENGTH - 10:
            base = base[: SLUG_MAX_LENGTH - 10]
        slug = base
        counter = 1
        qs = PlanActionFormation.objects.all()
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        while qs.filter(slug=slug).exists():
            suffix = f"-{counter}"
            slug = (base + suffix)[:SLUG_MAX_LENGTH]
            counter += 1
        return slug[:SLUG_MAX_LENGTH]
