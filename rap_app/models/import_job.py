"""Traçabilité technique des imports Excel sous ``/api/import-export/…`` (§2.14)."""

from django.conf import settings
from django.db import models


class ImportJob(models.Model):
    """
    Une ligne par tentative d’import (succès ou échec), sans modifier les modèles métier.

    Les champs JSON restent volontairement « snapshot » (réponse API ou erreur normalisée).
    """

    class Status(models.TextChoices):
        SUCCESS = "success", "Succès"
        ERROR = "error", "Erreur"

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="excel_import_jobs",
    )
    resource = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Identifiant canonique (ex. centre, formation) — aligné sur la feuille Meta.",
    )
    url_resource = models.CharField(
        max_length=64,
        blank=True,
        help_text="Segment d’URL ``/api/import-export/<slug>/…``.",
    )
    dry_run = models.BooleanField(default=False)
    status = models.CharField(max_length=16, choices=Status.choices, db_index=True)
    original_filename = models.CharField(max_length=255, blank=True)
    http_status = models.PositiveSmallIntegerField(null=True, blank=True)
    summary = models.JSONField(null=True, blank=True)
    error_payload = models.JSONField(null=True, blank=True)

    class Meta:
        verbose_name = "Import Excel (trace)"
        verbose_name_plural = "Imports Excel (traces)"
        ordering = ("-created_at",)

    def __str__(self):
        return f"ImportJob #{self.pk} {self.resource} {self.status}"
