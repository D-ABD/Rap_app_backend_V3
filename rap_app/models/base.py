import logging

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import FieldError, ValidationError
from django.db import models
from django.forms.models import model_to_dict
from django.utils.timezone import now

from ..middleware import get_current_user

logger = logging.getLogger(__name__)


class BaseModel(models.Model):
    """
    Modèle abstrait Django fournissant audit, timestamps et méthodes utilitaires.
    """

    created_at = models.DateTimeField(
        auto_now_add=True,
        editable=False,
        verbose_name="Date de création",
        help_text="Date et heure de création de l'enregistrement",
    )

    updated_at = models.DateTimeField(
        auto_now=True, verbose_name="Date de mise à jour", help_text="Date et heure de la dernière modification"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        editable=False,
        on_delete=models.SET_NULL,
        related_name="created_%(class)s_set",
        verbose_name="Créé par",
        help_text="Utilisateur ayant créé l'enregistrement",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_%(class)s_set",
        verbose_name="Modifié par",
        help_text="Dernier utilisateur ayant modifié l'enregistrement",
    )

    is_active = models.BooleanField(
        default=True, verbose_name="Actif", help_text="Indique si l'objet est actif ou archivé"
    )

    class Meta:
        abstract = True
        ordering = ["-created_at"]
        get_latest_by = "created_at"
        verbose_name = "Objet de base"
        verbose_name_plural = "Objets de base"
        indexes = [
            models.Index(fields=["is_active"], name="%(app_label)s_%(class)s_active_idx"),
        ]

    def __str__(self):
        """
        Représentation lisible de l'objet.
        """
        return f"{self.__class__.__name__} #{self.pk}"

    def __repr__(self):
        """
        Représentation technique pour le débogage.
        """
        return f"<{self.__class__.__name__}(id={self.pk})>"

    def clean(self):
        """
        Point d'extension pour validations personnalisées dans les sous-classes.
        """
        pass

    def validate_unique(self, exclude=None):
        """
        Ajoute les noms verbeux des champs dans les erreurs d'unicité.
        """
        try:
            super().validate_unique(exclude=exclude)
        except ValidationError as e:
            if hasattr(e, "message_dict"):
                for field, msgs in e.message_dict.items():
                    try:
                        field_verbose = self._meta.get_field(field).verbose_name
                        e.message_dict[field] = [f"{field_verbose}: {msg}" for msg in msgs]
                    except Exception:
                        continue
            raise e

    @classmethod
    def get_current_user(cls):
        """
        Retourne l'utilisateur courant via le middleware, ou None.
        """
        try:
            return get_current_user()
        except ImportError:
            logger.debug("Middleware get_current_user() non disponible.")
            return None
        except AttributeError:
            logger.debug("Aucun utilisateur trouvé dans le contexte.")
            return None
        except Exception as e:
            logger.debug(f"Erreur lors de la récupération de l'utilisateur: {str(e)}")
            return None

    def get_changed_fields(self):
        """
        Retourne un dict des champs modifiés depuis la BDD, hors audit.
        """
        if not self.pk:
            return {}
        try:
            old = type(self).objects.get(pk=self.pk)
            changes = {}
            for field in self._meta.fields:
                name = field.name
                if name in ("created_at", "updated_at", "created_by", "updated_by"):
                    continue
                old_val = getattr(old, name, None)
                new_val = getattr(self, name, None)
                if old_val != new_val:
                    changes[name] = (old_val, new_val)
            return changes
        except type(self).DoesNotExist:
            return {}

    def log_debug(self, message):
        """
        Loggue un message debug si la configuration l'autorise.
        """
        if getattr(settings, "ENABLE_MODEL_LOGGING", settings.DEBUG):
            logger.debug(f"[{self.__class__.__name__}] {message}")

    def save(self, *args, **kwargs):
        """
        Surcharge save pour gérer audit utilisateur, validation, log, cache.
        """
        user = kwargs.pop("user", None) or self.get_current_user()
        skip_validation = kwargs.pop("skip_validation", False)
        is_new = self.pk is None
        changed_fields = {} if is_new else self.get_changed_fields()

        if user and getattr(user, "is_authenticated", True):
            if is_new and not self.created_by:
                self.created_by = user
            self.updated_by = user

        try:
            if not skip_validation:
                self.clean()
        except Exception as e:
            model_name = self.__class__.__name__
            logger.error(f"Erreur de validation pour {model_name} (ID: {self.pk or 'nouveau'}): {e}")
            raise

        self.log_debug(f"{'Création' if is_new else 'Mise à jour'} par {user}")
        if changed_fields:
            self.log_debug(f"Changements détectés : {changed_fields}")

        super().save(*args, **kwargs)
        self.invalidate_caches()
        self.log_debug(f"#{self.pk} sauvegardé.")

    def delete(self, *args, **kwargs):
        """
        Surcharge delete pour gestion du log et des caches liés à l'objet.
        """
        user = kwargs.pop("user", None) or self.get_current_user()
        self.log_debug(f"Suppression de #{self.pk} par {user}")
        self.invalidate_caches()
        result = super().delete(*args, **kwargs)
        self.log_debug(f"#{self.pk} supprimé.")
        return result

    def to_serializable_dict(self, exclude=None):
        """
        Retourne un snapshot de l'instance sous forme de dictionnaire.
        """
        exclude = exclude or []
        data = {}

        for field in self._meta.fields:
            name = field.name
            if name in exclude:
                continue
            value = getattr(self, name)

            if hasattr(value, "isoformat"):
                data[name] = value.isoformat()
            elif hasattr(value, "url"):
                data[name] = value.url
            elif isinstance(value, models.Model):
                data[name] = {"id": value.pk, "str": str(value)}
            else:
                data[name] = value

        for field in self._meta.many_to_many:
            if field.name in exclude:
                continue
            related_objects = getattr(self, field.name).all()
            data[field.name] = [{"id": obj.pk, "str": str(obj)} for obj in related_objects]

        return data

    @classmethod
    def get_verbose_name(cls):
        """
        Retourne le verbose_name du modèle.
        """
        return cls._meta.verbose_name

    @classmethod
    def get_by_id(cls, id, active_only=True):
        """
        Récupère une instance par id, optionnellement filtrée par is_active.
        """
        if not id:
            raise ValueError("L'identifiant ne peut pas être vide.")
        try:
            id = int(id)
            qs = cls.objects
            if active_only:
                qs = qs.filter(is_active=True)
            return qs.get(pk=id)
        except (ValueError, TypeError):
            raise ValueError(f"Identifiant invalide : {id}")
        except cls.DoesNotExist:
            logger.warning(f"{cls.__name__} avec ID={id} non trouvé")
            raise

    def invalidate_caches(self):
        """
        Supprime les caches d'instance et de liste du modèle.
        """
        cache.delete(f"{self.__class__.__name__}_{self.pk}")
        cache.delete(f"{self.__class__.__name__}_list")

    @classmethod
    def get_filtered_queryset(cls, **filters):
        """
        Retourne un queryset filtré ou vide en cas d'erreur de mapping.
        """
        try:
            return cls.objects.filter(**filters)
        except (FieldError, ValueError) as e:
            logger.error(f"Erreur de filtrage sur {cls.__name__}: {e}")
            return cls.objects.none()
