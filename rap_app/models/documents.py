"""Modèle des documents liés aux formations."""

import logging
import os

import magic
from django.apps import apps
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models, transaction
from django.urls import reverse
from django.utils.functional import cached_property
from django.utils.html import escape
from django.utils.translation import gettext_lazy as _

from .base import BaseModel

logger = logging.getLogger("application.documents")


class DocumentManager(models.Manager):
    """Manager personnalisé pour Document."""

    def by_type(self, type_doc):
        """Filtre par type_document."""
        return self.filter(type_document=type_doc)

    def for_formation(self, formation_id):
        """Filtre par formation_id."""
        return self.filter(formation_id=formation_id)

    def pdfs(self):
        """Filtre les documents de type PDF."""
        return self.by_type(Document.PDF)

    def images(self):
        """Filtre les documents de type IMAGE."""
        return self.by_type(Document.IMAGE)

    def contrats(self):
        """Filtre les documents de type CONTRAT."""
        return self.by_type(Document.CONTRAT)

    def with_mime_and_size(self):
        """Exclut les documents sans mime_type ou taille_fichier."""
        return self.exclude(mime_type__isnull=True).exclude(taille_fichier__isnull=True)


def validate_file_extension(value, type_doc=None):
    """Valide l'extension du fichier selon le type de document."""
    ext = os.path.splitext(value.name)[1].lower()
    valides = {
        Document.PDF: [".pdf"],
        Document.IMAGE: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
        Document.CONTRAT: [".pdf", ".doc", ".docx"],
        Document.AUTRE: [],
    }

    if not type_doc or type_doc == Document.AUTRE:
        return

    if type_doc not in valides:
        raise ValidationError(f"Type de document non reconnu : {type_doc}")

    extensions_attendues = valides[type_doc]
    if ext not in extensions_attendues:
        raise ValidationError(
            f"Extension « {ext} » invalide pour le type « {type_doc} ». "
            f"Extensions autorisées : {', '.join(extensions_attendues)}"
        )


def validate_detected_mime_against_extension(filename: str, detected_mime: str | None):
    """Valide la cohérence entre l'extension du fichier et son MIME détecté."""
    if not filename or not detected_mime:
        return

    # `python-magic` peut renvoyer des types génériques sur certains fixtures
    # de tests ou petits fichiers artificiels. On reste strict uniquement quand
    # la détection est suffisamment discriminante pour conclure à une incohérence.
    if detected_mime in {"application/octet-stream", "text/plain"}:
        return

    ext = os.path.splitext(filename)[1].lower()
    allowed_mimes_by_extension = {
        ".pdf": {"application/pdf"},
        ".jpg": {"image/jpeg"},
        ".jpeg": {"image/jpeg"},
        ".png": {"image/png"},
        ".gif": {"image/gif"},
        ".webp": {"image/webp"},
        ".doc": {"application/msword"},
        ".docx": {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/zip",
        },
    }

    allowed = allowed_mimes_by_extension.get(ext)
    if allowed and detected_mime not in allowed:
        raise ValidationError(
            {
                "fichier": (
                    f"Incohérence détectée entre l'extension « {ext} » et le type MIME « {detected_mime} »."
                )
            }
        )


def filepath_for_document(instance, filename):
    """Construit le chemin d'upload du fichier document."""
    base_name, ext = os.path.splitext(filename)
    safe_name = "".join([c for c in base_name if c.isalnum() or c in " ._-"]).strip()
    safe_name = safe_name.replace(" ", "_")
    formation_id = getattr(instance.formation, "id", "unknown")
    return f"formations/documents/{instance.type_document}/{formation_id}/{safe_name}{ext}"


class Document(BaseModel):
    """Modèle de document associé à une formation."""

    PDF = "pdf"
    IMAGE = "image"
    CONTRAT = "contrat"
    AUTRE = "autre"

    TYPE_DOCUMENT_CHOICES = [
        (PDF, "PDF"),
        (IMAGE, "Image"),
        (CONTRAT, "Contrat signé"),
        (AUTRE, "Autre"),
    ]

    MAX_FILENAME_LENGTH = 255
    MAX_FILE_SIZE_KB = 10 * 1024
    MAX_MIME_LENGTH = 100

    formation = models.ForeignKey(
        "Formation",
        on_delete=models.CASCADE,
        related_name="documents",
        verbose_name=_("Formation associée"),
        help_text=_("Formation à laquelle ce document est rattaché"),
    )

    nom_fichier = models.CharField(
        max_length=MAX_FILENAME_LENGTH,
        db_index=True,
        verbose_name=_("Nom du fichier"),
        help_text=_("Nom lisible du fichier (sera nettoyé automatiquement)"),
    )

    fichier = models.FileField(
        upload_to=filepath_for_document,
        verbose_name=_("Fichier"),
        help_text=_(f"Fichier à téléverser (PDF, image, etc.). Max : {MAX_FILE_SIZE_KB // 1024} Mo"),
    )

    type_document = models.CharField(
        max_length=20,
        choices=TYPE_DOCUMENT_CHOICES,
        default=AUTRE,
        db_index=True,
        verbose_name=_("Type de document"),
        help_text=_("Catégorie du document selon son usage ou son format"),
    )

    source = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Source"),
        help_text=_("Texte optionnel indiquant la provenance du document"),
    )

    taille_fichier = models.PositiveIntegerField(
        blank=True,
        null=True,
        verbose_name=_("Taille (Ko)"),
        help_text=_("Taille du fichier en kilo-octets (calculée automatiquement)"),
    )

    mime_type = models.CharField(
        max_length=MAX_MIME_LENGTH,
        blank=True,
        null=True,
        verbose_name=_("Type MIME"),
        help_text=_("Type MIME détecté automatiquement (ex : application/pdf)"),
    )

    objects = models.Manager()
    custom = DocumentManager()

    class Meta:
        verbose_name = _("Document")
        verbose_name_plural = _("Documents")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["nom_fichier"], name="doc_filename_idx"),
            models.Index(fields=["formation"], name="doc_formation_idx"),
            models.Index(fields=["type_document"], name="doc_type_idx"),
            models.Index(fields=["created_at"], name="doc_created_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(nom_fichier__isnull=False) & ~models.Q(nom_fichier=""), name="doc_filename_not_empty"
            )
        ]

    def __str__(self):
        """Affichage texte court : nom_fichier tronqué et type."""
        max_length = 50
        nom = self.nom_fichier[:max_length]
        return f"{nom}{'...' if len(self.nom_fichier) > max_length else ''} ({self.get_type_document_display()})"

    def __repr__(self):
        """Représentation pour debug."""
        return f"<Document(id={self.pk}, type='{self.type_document}', formation_id={self.formation_id})>"

    def get_file_extension(self):
        """Retourne l'extension du fichier (avec point)."""
        return os.path.splitext(self.fichier.name)[1].lower() if self.fichier else ""

    def get_icon_class(self):
        """Retourne la classe CSS FontAwesome liée au type_document."""
        return {
            self.PDF: "fa-file-pdf",
            self.IMAGE: "fa-file-image",
            self.CONTRAT: "fa-file-contract",
            self.AUTRE: "fa-file",
        }.get(self.type_document, "fa-file")

    @property
    def icon_class(self):
        """Classe CSS associée au type."""
        return self.get_icon_class()

    def get_download_url(self):
        """URL de téléchargement du fichier ou None."""
        return self.fichier.url if self.fichier else None

    @property
    def extension(self):
        """Extension du fichier sans point."""
        return self.get_file_extension().replace(".", "")

    @property
    def human_size(self):
        """Retourne la taille du fichier sous forme lisible."""
        if not self.taille_fichier:
            return "Inconnu"
        if self.taille_fichier < 1024:
            return f"{self.taille_fichier} Ko"
        else:
            return f"{self.taille_fichier / 1024:.1f} Mo"

    @cached_property
    def is_viewable_in_browser(self):
        """Indique si le document est affichable dans le navigateur (PDF ou image)."""
        return self.type_document in [self.PDF, self.IMAGE] or (
            self.mime_type and (self.mime_type.startswith("image/") or self.mime_type == "application/pdf")
        )

    def to_serializable_dict(self):
        """Retourne un dictionnaire représentant le document pour sérialisation."""
        return {
            "id": self.pk,
            "nom_fichier": self.nom_fichier,
            "type_document": self.type_document,
            "type_document_display": self.get_type_document_display(),
            "taille_fichier": self.taille_fichier,
            "taille_readable": self.human_size,
            "mime_type": self.mime_type,
            "extension": self.extension,
            "icon_class": self.get_icon_class(),
            "download_url": self.get_download_url(),
            "formation_id": self.formation_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by": str(self.created_by) if self.created_by else None,
            "updated_at": self.updated_at.isoformat() if hasattr(self, "updated_at") and self.updated_at else None,
        }

    def clean(self):
        """Valide et nettoie les champs du document. Met à jour nom_fichier, taille_fichier et mime_type."""
        if not self.nom_fichier or not self.nom_fichier.strip():
            raise ValidationError({"nom_fichier": "Le nom du fichier ne peut pas être vide."})

        self.nom_fichier = escape(self.nom_fichier.strip())

        if self.fichier:
            validate_file_extension(self.fichier, self.type_document)
            try:
                self.fichier.seek(0)
            except Exception as e:
                logger.warning(f"Impossible de déplacer le curseur fichier {self.nom_fichier}: {e}")

            try:
                taille_ko = self.fichier.size // 1024
                if taille_ko > self.MAX_FILE_SIZE_KB:
                    raise ValidationError(
                        {"fichier": f"Le fichier est trop volumineux (max. {self.MAX_FILE_SIZE_KB // 1024} Mo)."}
                    )
                self.taille_fichier = max(1, taille_ko)
            except AttributeError:
                pass

            try:
                if hasattr(self.fichier, "file") and hasattr(self.fichier.file, "read"):
                    position = self.fichier.file.tell()
                    self.fichier.file.seek(0)
                    data = self.fichier.file.read(2048)
                    self.mime_type = magic.from_buffer(data, mime=True)
                    self.fichier.file.seek(position)
                    validate_detected_mime_against_extension(self.fichier.name, self.mime_type)
                    allowed_mimes = self.get_mime_types_by_type(self.type_document).get(self.type_document, [])
                    if allowed_mimes and self.mime_type not in allowed_mimes and self.mime_type not in {
                        "application/octet-stream",
                        "text/plain",
                    }:
                        raise ValidationError(
                            {
                                "fichier": (
                                    f"Le type MIME détecté « {self.mime_type} » n'est pas autorisé pour "
                                    f"le type_document « {self.type_document} »."
                                )
                            }
                        )
            except Exception as e:
                if isinstance(e, ValidationError):
                    raise
                logger.warning(f"Impossible de détecter le MIME type pour {self.nom_fichier}: {e}")

    @transaction.atomic
    def save(self, *args, **kwargs):
        """Valide, sauvegarde et historise l'ajout si applicable."""
        skip_history = kwargs.pop("skip_history", False)
        is_new = self.pk is None

        self.full_clean()

        if not self.taille_fichier and self.fichier and hasattr(self.fichier, "size"):
            self.taille_fichier = max(1, self.fichier.size // 1024)

        super().save(*args, **kwargs)

        if is_new and self.formation_id and not skip_history:
            try:
                HistoriqueFormation = apps.get_model("rap_app", "HistoriqueFormation")
                HistoriqueFormation.objects.create(
                    formation_id=self.formation_id,
                    champ_modifie="document",
                    ancienne_valeur="—",
                    nouvelle_valeur=self.nom_fichier,
                    commentaire=f"Ajout du document « {self.nom_fichier} »",
                    created_by=self.created_by,
                )
                logger.info(f"[Document] Document ajouté : {self.nom_fichier} (formation #{self.formation_id})")
            except Exception as e:
                logger.error(f"[Document] Erreur lors de la création de l'historique : {e}")

    def delete(self, *args, **kwargs):
        """Supprime le document et historise la suppression si applicable."""
        skip_history = kwargs.pop("skip_history", False)
        user = kwargs.pop("user", None) or getattr(self, "created_by", None)
        formation_id = self.formation_id
        nom_fichier = self.nom_fichier

        result = super().delete(*args, **kwargs)

        if formation_id and not skip_history:
            try:
                HistoriqueFormation = apps.get_model("rap_app", "HistoriqueFormation")
                HistoriqueFormation.objects.create(
                    formation_id=formation_id,
                    champ_modifie="document",
                    ancienne_valeur=nom_fichier,
                    nouvelle_valeur="—",
                    commentaire=f"Suppression du document « {nom_fichier} »",
                    created_by=user,
                )
                logger.info(f"[Document] Document supprimé : {nom_fichier} (formation #{formation_id})")
            except Exception as e:
                logger.error(f"[Document] Erreur lors de la création de l'historique de suppression : {e}")
        return result

    @classmethod
    def get_extensions_by_type(cls, type_doc=None):
        """Retourne les extensions de fichier attendues par type_document."""
        extensions = {
            cls.PDF: [".pdf"],
            cls.IMAGE: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
            cls.CONTRAT: [".pdf", ".doc", ".docx"],
            cls.AUTRE: [],
        }
        if type_doc:
            return {type_doc: extensions.get(type_doc, [])}
        return extensions

    @classmethod
    def get_mime_types_by_type(cls, type_doc=None):
        """Retourne les MIME types attendus par type_document."""
        mime_types = {
            cls.PDF: ["application/pdf"],
            cls.IMAGE: ["image/jpeg", "image/png", "image/gif", "image/webp"],
            cls.CONTRAT: [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ],
            cls.AUTRE: [],
        }
        if type_doc:
            return {type_doc: mime_types.get(type_doc, [])}
        return mime_types

    @classmethod
    def get_by_formation_and_type(cls, formation_id, type_doc=None):
        """Retourne les documents filtrés par formation et type_document, liste limitée de champs."""
        queryset = cls.objects.filter(formation_id=formation_id)
        if type_doc:
            queryset = queryset.filter(type_document=type_doc)
        return queryset.only(
            "id", "nom_fichier", "type_document", "taille_fichier", "mime_type", "created_at"
        ).order_by("-created_at")
