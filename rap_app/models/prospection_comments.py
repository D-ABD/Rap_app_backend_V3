"""Modèle des commentaires de prospection."""

import logging

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils.translation import gettext_lazy as _

from ..api.roles import is_staff_or_staffread
from .base import BaseModel
from .prospection import Prospection

logger = logging.getLogger(__name__)


class ProspectionCommentQuerySet(models.QuerySet):
    """
    QuerySet spécifique pour les commentaires de prospection.
    Fournit des méthodes de filtrage selon le statut et la visibilité.
    """

    def actifs(self):
        """
        Retourne les commentaires dont le statut est "actif".
        """
        return self.filter(statut_commentaire="actif")

    def archives(self):
        """
        Retourne les commentaires dont le statut est "archive".
        """
        return self.filter(statut_commentaire="archive")

    def visibles_pour_candidat(self):
        """
        Retourne les commentaires actifs et non internes.
        """
        return self.filter(statut_commentaire="actif", is_internal=False)


class ProspectionCommentManager(models.Manager):
    """
    Manager principal des commentaires de prospection.
    Expose les méthodes de filtrage personnalisées.
    """

    def get_queryset(self):
        """
        Retourne un ProspectionCommentQuerySet personnalisé.
        """
        return ProspectionCommentQuerySet(self.model, using=self._db)

    def actifs(self):
        """
        Retourne les commentaires actifs.
        """
        return self.get_queryset().actifs()

    def archives(self):
        """
        Retourne les commentaires archivés.
        """
        return self.get_queryset().archives()

    def visibles_pour_candidat(self):
        """
        Retourne les commentaires visibles pour les candidats.
        """
        return self.get_queryset().visibles_pour_candidat()


class ProspectionComment(BaseModel):
    """
    Modèle d'un commentaire associé à une prospection.
    Gère l'archivage, la visibilité interne et externe.
    """

    prospection = models.ForeignKey(
        Prospection,
        on_delete=models.CASCADE,
        related_name="comments",
        verbose_name=_("Prospection"),
    )
    body = models.TextField(verbose_name=_("Commentaire"))
    is_internal = models.BooleanField(
        default=False,
        verbose_name=_("Interne (staff uniquement)"),
    )

    STATUT_CHOICES = [
        ("actif", _("Actif")),
        ("archive", _("Archivé")),
    ]
    statut_commentaire = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default="actif",
        db_index=True,
        verbose_name=_("Statut du commentaire"),
        help_text=_("Permet d’archiver logiquement un commentaire sans le supprimer."),
    )

    objects = ProspectionCommentManager()

    class Meta:
        verbose_name = _("Commentaire de prospection")
        verbose_name_plural = _("Commentaires de prospection")
        ordering = ["-updated_at", "-created_at"]
        indexes = [
            models.Index(fields=["prospection"]),
            models.Index(fields=["is_internal"]),
            models.Index(fields=["statut_commentaire"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        """
        Représentation textuelle du commentaire, incluant son id, la prospection et l'auteur.
        """
        who = getattr(self.created_by, "username", "anonyme")
        return f"Commentaire #{self.pk} – prosp #{self.prospection_id} – {who}"

    def clean(self) -> None:
        """
        Valide que le texte du commentaire n'est pas vide ou uniquement composé d'espaces.
        """
        super().clean()
        if not (self.body or "").strip():
            raise ValidationError({"body": _("Le commentaire ne peut pas être vide.")})

    def save(self, *args, **kwargs):
        """
        Sauvegarde l'instance avec validation et transaction.
        """
        if not kwargs.pop("skip_clean", False):
            self.full_clean()
        with transaction.atomic():
            return super().save(*args, **kwargs)

    def archiver(self, save: bool = True):
        """
        Met le statut du commentaire à "archive". Sauvegarde si demandé.
        """
        self.statut_commentaire = "archive"
        if save:
            self.save(update_fields=["statut_commentaire"])
        logger.info("Commentaire #%s archivé", self.pk)

    def desarchiver(self, save: bool = True):
        """
        Met le statut du commentaire à "actif". Sauvegarde si demandé.
        """
        self.statut_commentaire = "actif"
        if save:
            self.save(update_fields=["statut_commentaire"])
        logger.info("Commentaire #%s désarchivé", self.pk)

    @property
    def activite(self) -> str:
        """
        Retourne "archivee" si archivé, sinon "active".
        """
        return "archivee" if self.est_archive else "active"

    def archive(self):
        """
        Alias de la méthode archiver.
        """
        return self.archiver()

    def restore(self):
        """
        Alias de la méthode desarchiver.
        """
        return self.desarchiver()

    @property
    def est_archive(self) -> bool:
        """
        Indique si le commentaire est archivé.
        """
        return self.statut_commentaire == "archive"

    @property
    def is_visible_for_candidate(self) -> bool:
        """
        Indique si le commentaire est visible pour un candidat.
        """
        return not self.is_internal and not self.est_archive

    def is_visible_to(self, user) -> bool:
        """
        Vérifie si un utilisateur a accès à ce commentaire.
        """
        if not user or not getattr(user, "is_authenticated", False):
            return False
        if is_staff_or_staffread(user) or getattr(user, "is_admin", False) or getattr(user, "is_superuser", False):
            return True
        if hasattr(user, "is_candidat_or_stagiaire") and getattr(user, "is_candidat_or_stagiaire")():
            return (
                not self.is_internal and not self.est_archive and getattr(self.prospection, "owner_id", None) == user.id
            )
        return False

    @property
    def prospection_text(self) -> str:
        """
        Retourne une courte description de la prospection liée ou son id si absent.
        """
        try:
            partner = getattr(self.prospection, "partenaire_nom", None)
            formation = getattr(self.prospection, "formation_nom", None)
        except Exception:
            partner = formation = None

        parts = [p for p in (partner, formation) if p]
        return " • ".join(parts) if parts else f"#{self.prospection_id}"
