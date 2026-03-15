# models/logs.py
from __future__ import annotations
import re
import logging
from django.conf import settings
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils.translation import gettext_lazy as _
from typing import Optional, Dict, Any, TYPE_CHECKING

from .base import BaseModel

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser as User
else:
    User = None


class LogUtilisateur(BaseModel):
    """
    Enregistre les actions des utilisateurs sur des objets avec ContentType et object_id.
    """

    ACTION_CREATE = 'création'
    ACTION_UPDATE = 'modification'
    ACTION_DELETE = 'suppression'
    ACTION_VIEW = 'consultation'
    ACTION_LOGIN = 'connexion'
    ACTION_LOGOUT = 'déconnexion'
    ACTION_EXPORT = 'export'
    ACTION_IMPORT = 'import'

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="logs_utilisateurs",
        verbose_name=_("Type d'objet")
    )

    object_id = models.PositiveIntegerField(
        verbose_name=_("ID de l'objet"),
        null=True,
        blank=True
    )

    content_object = GenericForeignKey('content_type', 'object_id')

    action = models.CharField(
        max_length=255,
        verbose_name=_("Action"),
        db_index=True
    )

    details = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Détails")
    )

    class Meta:
        verbose_name = _("Log utilisateur")
        verbose_name_plural = _("Logs utilisateurs")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["action"]),
        ]

    def __str__(self) -> str:
        """Affiche l'action et la date."""
        return f"{self.action} - {self.created_at.strftime('%d/%m/%Y %H:%M')}"

    @staticmethod
    def sanitize_details(details: str) -> str:
        """Masque les champs sensibles définis dans LOG_SENSITIVE_FIELDS."""
        if not details:
            return details

        sensitive_fields = getattr(settings, 'LOG_SENSITIVE_FIELDS',
                                ['password', 'token', 'secret', 'api_key'])

        pattern = re.compile(
            r'([\'"]?(' + '|'.join(sensitive_fields) + r')[\'"]?\s*[:=]\s*)[\'"]?([^\'"\s,}]+)[\'"]?',
            flags=re.IGNORECASE
        )

        sanitized = pattern.sub(r'\1"*****"', details)
        return sanitized

    @classmethod
    def log_action(cls, instance: models.Model, action: str,
                user: Optional['User'] = None, details: str = "") -> Optional['LogUtilisateur']:
        """
        Crée un log pour une action sur un objet, ou retourne None en cas de doublon.
        Masque les champs sensibles dans details.
        """
        try:
            content_type = ContentType.objects.get_for_model(instance)

            if cls.objects.filter(
                content_type=content_type,
                object_id=instance.pk,
                action=action,
                created_by=user
            ).exists():
                return None

            if details:
                details = cls.sanitize_details(details)

            log = cls.objects.create(
                content_type=content_type,
                object_id=instance.pk,
                action=action,
                details=details,
                created_by=user
            )
            return log
        except Exception as e:
            logger.error(f"Erreur log_action: {e}")
            return None

    @classmethod
    def log_system_action(cls, action: str, user: Optional['User'] = None,
                        details: str = "") -> Optional['LogUtilisateur']:
        """
        Crée un log système sans objet ciblé.
        Masque les champs sensibles dans details.
        """
        try:
            if details:
                details = cls.sanitize_details(details)

            content_type = ContentType.objects.get_for_model(LogUtilisateur)

            log = cls.objects.create(
                content_type=content_type,
                object_id=None,
                action=action,
                details=details,
                created_by=user
            )

            return log
        except Exception as e:
            logger.error(f"Erreur log_system_action: {e}")
            return None

    def to_dict(self) -> Dict[str, Any]:
        """
        Retourne le log sous forme de dictionnaire.
        """
        return {
            "id": self.pk,
            "action": self.action,
            "model": self.content_type.model if self.content_type else None,
            "object_id": self.object_id,
            "details": self.details,
            "user": self.created_by.username if self.created_by else "Système",
            "date": self.created_at.strftime("%Y-%m-%d %H:%M"),
        }