"""Modèle des commentaires de formation et helpers d'export associés.

Les commentaires restent une source de données métier ; certains effets de
bord sur les statistiques de formation sont encore orchestrés par des signaux.
"""

import csv
import io
import logging
from datetime import timedelta

import bleach  # utilisé éventuellement ailleurs
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg, Count, F, Q
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils import timezone
from django.utils.html import strip_tags
from docx import Document
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from weasyprint import CSS, HTML  # utilisé éventuellement ailleurs

from .base import BaseModel
from .formations import Formation

logger = logging.getLogger(__name__)

# Les signaux liés à ce modèle sont définis dans signals/commentaires.py


class CommentaireQuerySet(models.QuerySet):
    """
    QuerySet pour filtrer les commentaires selon le statut.
    """

    def actifs(self):
        """
        Retourne les commentaires non archivés.
        """
        return self.filter(statut_commentaire="actif")

    def archives(self):
        """
        Retourne les commentaires archivés.
        """
        return self.filter(statut_commentaire="archive")


class CommentaireManager(models.Manager.from_queryset(CommentaireQuerySet)):
    """
    Manager pour le modèle Commentaire. Fournit des accès filtrés et des méthodes de recherche.
    """

    def recents(self, days=7):
        """
        Retourne les commentaires créés dans les X derniers jours.
        """
        date_limite = timezone.now() - timedelta(days=days)
        return self.filter(created_at__gte=date_limite)

    def for_formation(self, formation_id):
        """
        Retourne les commentaires associés à une formation.
        """
        return self.filter(formation_id=formation_id).select_related("created_by")

    def with_saturation(self):
        """
        Retourne les commentaires avec une valeur de saturation non nulle.
        """
        return self.exclude(saturation__isnull=True)

    def search(self, query):
        """
        Recherche dans le contenu, le username de l'auteur ou le nom de la formation.
        """
        if not query:
            return self.all()
        return self.filter(
            Q(contenu__icontains=query) | Q(created_by__username__icontains=query) | Q(formation__nom__icontains=query)
        )


class Commentaire(BaseModel):
    """
    Modèle principal pour les commentaires associés à une formation.

    Il stocke le contenu métier et quelques mesures dérivées (saturation,
    statut logique), tandis que la mise à jour de certains indicateurs de
    formation est encore traitée côté signaux.
    """

    SATURATION_MIN = 0
    SATURATION_MAX = 100
    PREVIEW_DEFAULT_LENGTH = 50
    RECENT_DEFAULT_DAYS = 7

    formation = models.ForeignKey(
        Formation,
        on_delete=models.CASCADE,
        related_name="commentaires",
        verbose_name="Formation",
        help_text="Formation à laquelle ce commentaire est associé",
    )

    contenu = models.TextField(
        verbose_name="Contenu du commentaire", help_text="Texte du commentaire (le HTML est automatiquement nettoyé)"
    )

    saturation = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Niveau de saturation (%)",
        help_text="Pourcentage de saturation perçue dans la formation (entre 0 et 100)",
        validators=[
            MinValueValidator(SATURATION_MIN, message="La saturation ne peut pas être négative"),
            MaxValueValidator(SATURATION_MAX, message="La saturation ne peut pas dépasser 100%"),
        ],
    )

    saturation_formation = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Saturation de la formation (copiée)",
        help_text="Valeur de la saturation de la formation au moment du commentaire",
    )

    objects = CommentaireManager()

    STATUT_ACTIF = "actif"
    STATUT_ARCHIVE = "archive"

    STATUT_CHOICES = [
        (STATUT_ACTIF, "Actif"),
        (STATUT_ARCHIVE, "Archivé"),
    ]

    statut_commentaire = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default=STATUT_ACTIF,
        db_index=True,
        verbose_name="Statut du commentaire",
        help_text="Permet d’archiver ou de restaurer logiquement un commentaire.",
    )

    def archiver(self, user=None, save: bool = True):
        """
        Place le commentaire en statut archivé.
        """
        if self.statut_commentaire != self.STATUT_ARCHIVE:
            self.statut_commentaire = self.STATUT_ARCHIVE
            if hasattr(self, "archived_by") and user:
                self.archived_by = user
            if hasattr(self, "archived_at"):
                self.archived_at = timezone.now()
            if save:
                super().save(
                    update_fields=["statut_commentaire"]
                    + (["archived_by"] if hasattr(self, "archived_by") else [])
                    + (["archived_at"] if hasattr(self, "archived_at") else [])
                )
            logger.info(f"Commentaire #{self.pk} archivé (formation #{self.formation_id})")

    def desarchiver(self, save: bool = True):
        """
        Restaure le commentaire en statut actif.
        """
        if self.statut_commentaire != self.STATUT_ACTIF:
            self.statut_commentaire = self.STATUT_ACTIF
            if hasattr(self, "archived_at"):
                self.archived_at = None
            if hasattr(self, "archived_by"):
                self.archived_by = None
            if save:
                super().save(
                    update_fields=["statut_commentaire"]
                    + (["archived_by"] if hasattr(self, "archived_by") else [])
                    + (["archived_at"] if hasattr(self, "archived_at") else [])
                )
            logger.info(f"Commentaire #{self.pk} désarchivé (formation #{self.formation_id})")

    def archive(self):
        """
        Alias pour archiver().
        """
        return self.archiver()

    def restore(self):
        """
        Alias pour desarchiver().
        """
        return self.desarchiver()

    @property
    def est_archive(self) -> bool:
        """
        Retourne True si le commentaire est archivé.
        """
        return self.statut_commentaire == self.STATUT_ARCHIVE

    @property
    def activite(self) -> str:
        """
        Retourne "archivee" si archivé, "active" sinon.
        """
        return "archivee" if self.est_archive else "active"

    class Meta:
        """
        Options de configuration du modèle Commentaire.
        """

        verbose_name = "Commentaire"
        verbose_name_plural = "Commentaires"
        ordering = ["formation", "-created_at"]
        indexes = [
            models.Index(fields=["created_at"], name="comment_created_idx"),
            models.Index(fields=["formation", "created_at"], name="comment_form_date_idx"),
            models.Index(fields=["created_by"], name="comment_author_idx"),
            models.Index(fields=["saturation"], name="comment_satur_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(saturation__isnull=True) | (Q(saturation__gte=0) & Q(saturation__lte=100)),
                name="commentaire_saturation_range",
            )
        ]

    def __str__(self):
        """
        Affichage lisible d’un commentaire : auteur, formation et date.
        """
        auteur = self.created_by.username if self.created_by else "Anonyme"
        return f"Commentaire de {auteur} sur {self.formation.nom} ({self.created_at.strftime('%d/%m/%Y')})"

    def __repr__(self):
        """
        Affichage technique en shell/debug.
        """
        return f"<Commentaire(id={self.pk}, formation={self.formation_id}, auteur={self.created_by_id})>"

    def clean(self):
        """
        Valide la valeur de saturation et l’absence de vide sur contenu.
        """
        super().clean()
        if self.saturation is not None:
            if not (self.SATURATION_MIN <= self.saturation <= self.SATURATION_MAX):
                raise ValidationError(
                    {
                        "saturation": f"La saturation doit être comprise entre {self.SATURATION_MIN} et {self.SATURATION_MAX}%"
                    }
                )
        if not self.contenu or not self.contenu.strip():
            raise ValidationError({"contenu": "Le contenu ne peut pas être vide."})

    def save(self, *args, **kwargs):
        """
        Clamp la saturation et fige la saturation métier de la formation à la création.
        """
        if self.saturation is not None:
            self.saturation = max(self.SATURATION_MIN, min(self.SATURATION_MAX, self.saturation))

        is_new = self.pk is None

        if is_new and self.formation_id and self.saturation_formation is None:
            formation = Formation.objects.filter(pk=self.formation_id).first()
            if formation is not None:
                taux = getattr(formation, "taux_saturation", None)
                self.saturation_formation = round(float(taux), 2) if taux is not None else None
            else:
                self.saturation_formation = None

        self.clean()
        super().save(*args, **kwargs)

        logger.debug(
            f"Commentaire #{self.pk} {'créé' if is_new else 'mis à jour'} "
            f"pour la formation #{self.formation_id} — sat_form={self.saturation_formation}"
        )

    def delete(self, *args, **kwargs):
        """
        Supprime le commentaire et met à jour la formation liée si nécessaire.
        """
        update_formation = kwargs.pop("update_formation", True)
        formation = self.formation if update_formation else None
        result = super().delete(*args, **kwargs)
        if update_formation and formation:
            self.update_formation_static(formation)
        logger.debug(f"Commentaire #{self.pk} supprimé pour la formation #{self.formation_id}")
        return result

    def update_formation(self):
        """
        Met à jour les champs statistiques de la formation liée.
        """
        formation = self.formation
        if hasattr(formation, "update_from_commentaires"):
            formation.update_from_commentaires()
        else:
            last_comment = (
                Commentaire.objects.filter(formation_id=formation.pk)
                .only("pk", "created_at")
                .order_by("-created_at")
                .first()
            )
            avg_dict = Commentaire.objects.filter(formation_id=formation.pk, saturation__isnull=False).aggregate(
                saturation_moyenne=Avg("saturation")
            )
            nb_comments = Commentaire.objects.filter(formation_id=formation.pk).count()
            if hasattr(formation, "dernier_commentaire"):
                formation.dernier_commentaire = last_comment
            if hasattr(formation, "saturation_moyenne"):
                formation.saturation_moyenne = avg_dict.get("saturation_moyenne")
            if hasattr(formation, "nb_commentaires"):
                formation.nb_commentaires = nb_comments
            update_fields = []
            if hasattr(formation, "dernier_commentaire"):
                update_fields.append("dernier_commentaire")
            if hasattr(formation, "saturation_moyenne"):
                update_fields.append("saturation_moyenne")
            if hasattr(formation, "nb_commentaires"):
                update_fields.append("nb_commentaires")
            if update_fields:
                formation.save(update_fields=update_fields)

    @staticmethod
    def update_formation_static(formation):
        """
        Met à jour les champs statistiques de la formation (méthode statique).
        """
        if hasattr(formation, "update_from_commentaires"):
            formation.update_from_commentaires()
        else:
            last_comment = (
                Commentaire.objects.filter(formation_id=formation.pk)
                .only("pk", "created_at")
                .order_by("-created_at")
                .first()
            )
            avg_dict = Commentaire.objects.filter(formation_id=formation.pk, saturation__isnull=False).aggregate(
                saturation_moyenne=Avg("saturation")
            )
            nb_comments = Commentaire.objects.filter(formation_id=formation.pk).count()
            if hasattr(formation, "dernier_commentaire"):
                formation.dernier_commentaire = last_comment
            if hasattr(formation, "saturation_moyenne"):
                formation.saturation_moyenne = avg_dict.get("saturation_moyenne")
            if hasattr(formation, "nb_commentaires"):
                formation.nb_commentaires = nb_comments
            update_fields = []
            if hasattr(formation, "dernier_commentaire"):
                update_fields.append("dernier_commentaire")
            if hasattr(formation, "saturation_moyenne"):
                update_fields.append("saturation_moyenne")
            if hasattr(formation, "nb_commentaires"):
                update_fields.append("nb_commentaires")
            if update_fields:
                formation.save(update_fields=update_fields)

    @property
    def auteur_nom(self) -> str:
        """
        Retourne le nom complet de l’auteur ou 'Anonyme' si absent.
        """
        if not self.created_by:
            return "Anonyme"
        full = f"{self.created_by.first_name} {self.created_by.last_name}".strip()
        return full or self.created_by.username

    @property
    def date_formatee(self) -> str:
        """
        Retourne la date de création au format jj/mm/aaaa.
        """
        return self.created_at.strftime("%d/%m/%Y") if self.created_at else ""

    @property
    def heure_formatee(self) -> str:
        """
        Retourne l'heure de création au format hh:mm.
        """
        return self.created_at.strftime("%H:%M") if self.created_at else ""

    @property
    def contenu_sans_html(self) -> str:
        """
        Retourne le contenu sans balises HTML.
        """
        return strip_tags(self.contenu)

    @property
    def formation_nom(self) -> str:
        """
        Retourne le nom de la formation ou 'Formation inconnue'.
        """
        return self.formation.nom if self.formation else "Formation inconnue"

    def get_content_preview(self, length=None) -> str:
        """
        Retourne un aperçu tronqué du contenu.
        """
        length = length or self.PREVIEW_DEFAULT_LENGTH
        return self.contenu if len(self.contenu) <= length else f"{self.contenu[:length]}..."

    def is_recent(self, days=None) -> bool:
        """
        Retourne True si le commentaire a été créé il y a moins de X jours.
        """
        days = days or self.RECENT_DEFAULT_DAYS
        try:
            cutoff = timezone.now() - timedelta(days=days)
            return self.created_at and self.created_at >= cutoff
        except Exception:
            return False

    def is_edited(self) -> bool:
        """
        Retourne True si le commentaire a été modifié plus d'une minute après sa création.
        """
        tolerance = timedelta(minutes=1)
        if self.updated_at and self.created_at:
            return (self.updated_at - self.created_at) > tolerance
        return False

    @classmethod
    def get_all_commentaires(cls, formation_id=None, auteur_id=None, search_query=None, order_by="-created_at"):
        """
        Retourne un QuerySet de commentaires filtré par formation, auteur ou recherche sur contenu.
        """
        queryset = cls.objects.select_related("formation", "created_by").order_by(order_by)
        filters = Q()
        if formation_id:
            filters &= Q(formation_id=formation_id)
        if auteur_id:
            filters &= Q(created_by_id=auteur_id)
        if search_query:
            filters &= Q(contenu__icontains=search_query)
        if filters:
            queryset = queryset.filter(filters)
        return queryset

    @classmethod
    def get_recent_commentaires(cls, days=None, limit=5):
        """
        Retourne les X commentaires les plus récents créés dans la période définie.
        """
        days = days or cls.RECENT_DEFAULT_DAYS
        date_limite = timezone.now() - timedelta(days=days)
        return (
            cls.objects.select_related("formation", "created_by")
            .filter(created_at__gte=date_limite)
            .order_by("-created_at")[:limit]
        )

    @classmethod
    def get_saturation_stats(cls, formation_id=None):
        """
        Retourne les statistiques de saturation pour une formation (ou toutes).
        """
        queryset = cls.objects.filter(saturation__isnull=False)
        if formation_id:
            queryset = queryset.filter(formation_id=formation_id)
        stats = queryset.aggregate(
            avg=Avg("saturation"), min=models.Min("saturation"), max=models.Max("saturation"), count=Count("id")
        )
        return stats

    def to_serializable_dict(self, include_full_content=False):
        """
        Retourne un dictionnaire sérialisable d’un commentaire.
        """
        formation = self.formation
        return {
            "id": self.pk,
            "formation_id": formation.id if formation else None,
            "formation_nom": formation.nom if formation else "N/A",
            "num_offre": getattr(formation, "num_offre", None),
            "centre_nom": getattr(formation, "centre", None) and getattr(formation.centre, "nom", None),
            "start_date": getattr(formation, "start_date", None) and formation.start_date.isoformat(),
            "end_date": getattr(formation, "end_date", None) and formation.end_date.isoformat(),
            "type_offre": getattr(formation, "type_offre", None) and formation.type_offre.nom,
            "statut": getattr(formation, "statut", None) and formation.statut.nom,
            "contenu": self.contenu if include_full_content else self.get_content_preview(),
            "saturation": self.saturation,
            "saturation_formation": self.saturation_formation,
            "auteur": self.auteur_nom,
            "date": self.date_formatee,
            "heure": self.heure_formatee,
            "is_recent": self.is_recent(),
            "is_edited": self.is_edited(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def get_edit_url(self):
        """
        Retourne l’URL d’édition du commentaire.
        """
        return reverse("commentaire-edit", kwargs={"pk": self.pk})

    def get_delete_url(self):
        """
        Retourne l’URL de suppression du commentaire.
        """
        return reverse("commentaire-delete", kwargs={"pk": self.pk})
