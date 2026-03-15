import logging

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Avg, Count, F, Prefetch, Q, Sum
from django.urls import reverse
from django.utils import timezone
from django.utils.functional import cached_property
from django.utils.translation import gettext_lazy as _

from .base import BaseModel

logger = logging.getLogger("application.evenements")


class EvenementManager(models.Manager):
    """Manager fournissant des filtres et des annotations pour les événements."""

    def a_venir(self, days=30):
        """Retourne les événements dans les prochains 'days' jours triés par date."""
        today = timezone.now().date()
        limit_date = today + timezone.timedelta(days=days)
        return self.filter(event_date__gte=today, event_date__lte=limit_date).order_by("event_date")

    def passes(self):
        """Retourne les événements passés triés par date décroissante."""
        today = timezone.now().date()
        return self.filter(event_date__lt=today).order_by("-event_date")

    def aujourd_hui(self):
        """Retourne les événements ayant lieu aujourd'hui."""
        today = timezone.now().date()
        return self.filter(event_date=today)

    def par_type(self, type_evenement):
        """Filtre par type d'événement."""
        return self.filter(type_evenement=type_evenement)

    def par_formation(self, formation_id):
        """Filtre par identifiant de formation."""
        return self.filter(formation_id=formation_id)

    def avec_statistiques(self):
        """Ajoute le taux de participation si participants prévus > 0."""
        return self.annotate(
            taux_participation=models.Case(
                models.When(
                    participants_prevus__gt=0,
                    then=models.ExpressionWrapper(
                        100 * F("participants_reels") / F("participants_prevus"), output_field=models.FloatField()
                    ),
                ),
                default=None,
                output_field=models.FloatField(),
            )
        )


class Evenement(BaseModel):
    """Modèle représentant un événement pouvant être lié à une formation."""

    MAX_TYPE_LENGTH = 100
    MAX_DESC_LENGTH = 255
    MAX_LIEU_LENGTH = 255
    DAYS_SOON = 7

    class TypeEvenement(models.TextChoices):
        """Types d'événement disponibles."""

        INFO_PRESENTIEL = "info_collective_presentiel", _("Information collective présentiel")
        INFO_DISTANCIEL = "info_collective_distanciel", _("Information collective distanciel")
        JOB_DATING = "job_dating", _("Job dating")
        EVENEMENT_EMPLOI = "evenement_emploi", _("Événement emploi")
        FORUM = "forum", _("Forum")
        JPO = "jpo", _("Journée Portes Ouvertes")
        AUTRE = "autre", _("Autre")

    class StatutTemporel(models.TextChoices):
        """Statuts temporels possibles."""

        PASSE = "past", _("Passé")
        AUJOURD_HUI = "today", _("Aujourd'hui")
        BIENTOT = "soon", _("Bientôt")
        FUTUR = "future", _("À venir")
        INCONNU = "unknown", _("Inconnu")

    formation = models.ForeignKey(
        "Formation",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="evenements",
        verbose_name=_("Formation"),
        help_text=_("Formation associée à l'événement"),
    )

    type_evenement = models.CharField(
        max_length=MAX_TYPE_LENGTH,
        choices=TypeEvenement.choices,
        db_index=True,
        verbose_name=_("Type d'événement"),
        help_text=_("Catégorie de l'événement (ex : forum, job dating, etc.)"),
    )

    description_autre = models.CharField(
        max_length=MAX_DESC_LENGTH,
        blank=True,
        null=True,
        verbose_name=_("Description personnalisée"),
        help_text=_("Détail du type si 'Autre' est sélectionné"),
    )

    details = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Détails complémentaires"),
        help_text=_("Détails ou informations supplémentaires"),
    )

    event_date = models.DateField(
        blank=True, null=True, verbose_name=_("Date de l'événement"), help_text=_("Date prévue pour l'événement")
    )

    lieu = models.CharField(
        max_length=MAX_LIEU_LENGTH,
        blank=True,
        null=True,
        verbose_name=_("Lieu"),
        help_text=_("Lieu où se déroule l'événement"),
    )

    participants_prevus = models.PositiveIntegerField(
        blank=True, null=True, verbose_name=_("Participants prévus"), help_text=_("Nombre de personnes attendues")
    )

    participants_reels = models.PositiveIntegerField(
        blank=True, null=True, verbose_name=_("Participants réels"), help_text=_("Nombre de participants présents")
    )

    objects = models.Manager()
    custom = EvenementManager()

    class Meta:
        """Options de métadonnées du modèle : tri, index, contraintes."""

        verbose_name = _("Événement")
        verbose_name_plural = _("Événements")
        ordering = ["-event_date"]
        indexes = [
            models.Index(fields=["event_date"], name="event_date_idx"),
            models.Index(fields=["type_evenement"], name="event_type_idx"),
            models.Index(fields=["formation"], name="event_formation_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(type_evenement="autre", description_autre__isnull=False) | ~Q(type_evenement="autre"),
                name="autre_needs_description",
            )
        ]

    def __str__(self):
        """Retourne une représentation lisible de l'événement."""
        label = (
            self.description_autre
            if self.type_evenement == self.TypeEvenement.AUTRE and self.description_autre
            else self.get_type_evenement_display()
        )
        date_str = self.event_date.strftime("%d/%m/%Y") if self.event_date else "Date inconnue"
        return f"{label} - {date_str} - {self.status_label}"

    def __repr__(self):
        """Retourne une représentation détaillée de l'événement."""
        return f"<Evenement(id={self.pk}, type='{self.type_evenement}', date='{self.event_date}')>"

    def get_edit_url(self):
        """Retourne l'URL d'édition de l'événement."""
        return reverse("evenement-edit", kwargs={"pk": self.pk})

    def get_delete_url(self):
        """Retourne l'URL de suppression de l'événement."""
        return reverse("evenement-delete", kwargs={"pk": self.pk})

    def get_absolute_url(self):
        """Retourne l'URL de détail de l'événement."""
        return reverse("evenement-detail", kwargs={"pk": self.pk})

    def clean(self):
        """Valide la cohérence des champs de l'événement et loggue certains cas."""
        super().clean()
        today = timezone.now().date()

        if self.type_evenement == self.TypeEvenement.AUTRE and not self.description_autre:
            raise ValidationError({"description_autre": _("Veuillez décrire l'événement de type 'Autre'.")})

        if self.event_date and self.event_date < today - timezone.timedelta(days=365):
            logger.warning(f"Date ancienne pour l'événement #{self.pk} : {self.event_date}")

        if self.participants_reels is not None and self.participants_prevus:
            if self.participants_reels > self.participants_prevus * 1.5:
                logger.warning(
                    f"Participants réels ({self.participants_reels}) dépassent largement les prévisions ({self.participants_prevus}) pour l'événement #{self.pk}"
                )
            if self.participants_reels == 0 and self.get_temporal_status() == self.StatutTemporel.PASSE:
                logger.warning(f"Événement passé #{self.pk} avec 0 participant réel")

    def save(self, *args, **kwargs):
        """Valide, sauvegarde et journalise l'événement."""
        user = kwargs.pop("user", None)
        is_new = self.pk is None
        original = None
        if not is_new:
            original = (
                self.__class__.objects.only(
                    "type_evenement",
                    "event_date",
                    "formation_id",
                    "lieu",
                    "participants_prevus",
                    "participants_reels",
                    "description_autre",
                )
                .filter(pk=self.pk)
                .first()
            )

        try:
            self.clean()
        except Exception as exc:
            logger.error(f"Erreur de validation lors de la sauvegarde de l'événement : {exc}")
            raise

        with transaction.atomic():
            super().save(*args, **kwargs)
            if is_new:
                logger.info(f"Nouvel événement '{self}' créé (ID: {self.pk}).")
            elif original:
                self._log_changes(original)

    def _log_changes(self, original):
        """Journalise les changements sur certains champs si modification."""
        fields_to_watch = [
            ("type_evenement", "Type d'événement"),
            ("event_date", "Date"),
            ("formation_id", "Formation"),
            ("lieu", "Lieu"),
            ("participants_prevus", "Participants prévus"),
            ("participants_reels", "Participants réels"),
            ("description_autre", "Description personnalisée"),
        ]

        changes = []
        for field, label in fields_to_watch:
            old_value = getattr(original, field)
            new_value = getattr(self, field)
            if old_value != new_value:
                changes.append(f"{label}: '{old_value}' → '{new_value}'")
        if changes:
            logger.info(f"Événement #{self.pk} modifié. Changements : " + "; ".join(changes))

    def get_temporal_status(self, days=None):
        """Retourne le statut temporel selon la date de l'événement."""
        days = days if days is not None else self.DAYS_SOON

        if not self.event_date:
            return self.StatutTemporel.INCONNU

        today = timezone.now().date()
        if self.event_date < today:
            return self.StatutTemporel.PASSE
        if self.event_date == today:
            return self.StatutTemporel.AUJOURD_HUI
        if self.event_date <= today + timezone.timedelta(days=days):
            return self.StatutTemporel.BIENTOT
        return self.StatutTemporel.FUTUR

    @property
    def status_label(self):
        """Libellé du statut temporel."""
        return {
            self.StatutTemporel.PASSE: _("Passé"),
            self.StatutTemporel.AUJOURD_HUI: _("Aujourd'hui"),
            self.StatutTemporel.BIENTOT: _("Bientôt"),
            self.StatutTemporel.FUTUR: _("À venir"),
            self.StatutTemporel.INCONNU: _("Date inconnue"),
        }.get(self.get_temporal_status(), _("Inconnu"))

    @property
    def status_color(self):
        """Couleur Bootstrap associée au statut temporel."""
        return {
            self.StatutTemporel.PASSE: "text-secondary",
            self.StatutTemporel.AUJOURD_HUI: "text-danger",
            self.StatutTemporel.BIENTOT: "text-warning",
            self.StatutTemporel.FUTUR: "text-primary",
            self.StatutTemporel.INCONNU: "text-muted",
        }.get(self.get_temporal_status(), "text-muted")

    @property
    def status_badge_class(self):
        """Classe de badge Bootstrap associée au statut temporel."""
        return {
            self.StatutTemporel.PASSE: "badge-secondary",
            self.StatutTemporel.AUJOURD_HUI: "badge-danger",
            self.StatutTemporel.BIENTOT: "badge-warning",
            self.StatutTemporel.FUTUR: "badge-primary",
            self.StatutTemporel.INCONNU: "badge-light",
        }.get(self.get_temporal_status(), "badge-light")

    @property
    def is_past(self):
        """Vrai si l'événement est passé."""
        return self.get_temporal_status() == self.StatutTemporel.PASSE

    @property
    def is_today(self):
        """Vrai si l'événement est aujourd'hui."""
        return self.get_temporal_status() == self.StatutTemporel.AUJOURD_HUI

    @property
    def is_future(self):
        """Vrai si l'événement est bientôt ou à venir."""
        status = self.get_temporal_status()
        return status in [self.StatutTemporel.BIENTOT, self.StatutTemporel.FUTUR]

    def get_participation_rate(self):
        """Retourne le taux de participation ou None."""
        if self.participants_prevus and self.participants_reels is not None and self.participants_prevus > 0:
            return round((self.participants_reels / self.participants_prevus) * 100, 1)
        return None

    @property
    def taux_participation(self):
        """Retourne le taux de participation."""
        return self.get_participation_rate()

    @property
    def taux_participation_formatted(self):
        """Retourne le taux de participation formaté ou 'N/A'."""
        taux = self.get_participation_rate()
        return f"{taux}%" if taux is not None else "N/A"

    @cached_property
    def participation_status(self):
        """Retourne un statut selon le taux de participation."""
        taux = self.get_participation_rate()
        if taux is None:
            return "neutral"
        if taux >= 90:
            return "success"
        if taux >= 60:
            return "warning"
        return "danger"

    @property
    def nombre_candidats(self):
        """Retourne le nombre de candidats liés à l'événement."""
        return self.candidats.count()

    def to_serializable_dict(self):
        """Retourne un dictionnaire sérialisable de l'événement, utilisé pour l'API."""
        return {
            "id": self.pk,
            "formation_id": self.formation_id,
            "formation_nom": self.formation.nom if self.formation else None,
            "type_evenement": self.type_evenement,
            "type_evenement_display": self.get_type_evenement_display(),
            "description_autre": self.description_autre,
            "details": self.details,
            "event_date": self.event_date.isoformat() if self.event_date else None,
            "event_date_formatted": self.event_date.strftime("%d/%m/%Y") if self.event_date else None,
            "lieu": self.lieu,
            "participants_prevus": self.participants_prevus,
            "participants_reels": self.participants_reels,
            "taux_participation": self.get_participation_rate(),
            "status": self.get_temporal_status(),
            "status_label": self.status_label,
            "status_color": self.status_color,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def get_evenements_du_mois(cls, annee=None, mois=None):
        """Retourne les événements du mois et de l'année donnés, ou du mois courant par défaut."""
        today = timezone.now().date()
        annee = annee or today.year
        mois = mois or today.month
        return cls.objects.filter(event_date__year=annee, event_date__month=mois).order_by("event_date")

    @classmethod
    def get_stats_by_type(cls, start_date=None, end_date=None):
        """Retourne des statistiques par type d'événement, avec filtres optionnels de date."""
        queryset = cls.objects.all()
        if start_date:
            queryset = queryset.filter(event_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(event_date__lte=end_date)
        stats = (
            queryset.values("type_evenement")
            .annotate(
                count=Count("id"),
                total_prevus=Sum("participants_prevus"),
                total_reels=Sum("participants_reels"),
                taux_moyen=Avg(
                    models.Case(
                        models.When(
                            participants_prevus__gt=0, then=100 * F("participants_reels") / F("participants_prevus")
                        ),
                        default=None,
                        output_field=models.FloatField(),
                    )
                ),
            )
            .order_by("-count")
        )
        result = {}
        type_choices = dict(cls.TypeEvenement.choices)
        for item in stats:
            type_key = item["type_evenement"]
            result[type_key] = {
                "libelle": type_choices.get(type_key, type_key),
                "nombre": item["count"],
                "participants_prevus": item["total_prevus"] or 0,
                "participants_reels": item["total_reels"] or 0,
                "taux_participation": round(item["taux_moyen"], 1) if item["taux_moyen"] is not None else None,
            }
        return result
