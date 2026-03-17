"""Modèle d'appairage entre candidat, partenaire et formation.

Le modèle conserve la donnée persistante et un filet d'observation legacy
autour de l'ancien snapshot de placement. La source de vérité métier visée pour
la synchronisation vers `Candidat` est désormais `AppairagePlacementService`.
"""

import logging

from django.conf import settings
from django.db import models, transaction
from django.db.models import Q
from django.forms import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .base import BaseModel
from .candidat import Candidat, ResultatPlacementChoices
from .formations import Formation
from .partenaires import Partenaire
from ..services.placement_services import is_appairage_snapshot_sync_deferred

logger = logging.getLogger("application.appairages")


class AppairageManager(models.Manager):
    """
    Manager pour filtrer les appairages actifs ou archivés.
    """

    def actifs(self):
        """
        Retourne les appairages actifs.
        """
        return self.filter(activite=AppairageActivite.ACTIF)

    def archives(self):
        """
        Retourne les appairages archivés.
        """
        return self.filter(activite=AppairageActivite.ARCHIVE)


class AppairageStatut(models.TextChoices):
    """
    Liste des statuts possibles pour un appairage.
    """

    TRANSMIS = "transmis", _("Transmis au partenaire")
    EN_ATTENTE = "en_attente", _("En attente de réponse")
    ACCEPTE = "accepte", _("Accepté")
    REFUSE = "refuse", _("Refusé")
    ANNULE = "annule", _("Annulé")
    A_FAIRE = "a_faire", _("À faire")
    CONTRAT_A_SIGNER = "contrat_a_signer", _("Contrat à signer")
    CONTRAT_EN_ATTENTE = "contrat_en_attente", _("Contrat en attente")
    APPAIRAGE_OK = "appairage_ok", _("Appairage OK")


class AppairageActivite(models.TextChoices):
    """
    Niveau d'activité d'un appairage.
    """

    ACTIF = "actif", _("Actif")
    ARCHIVE = "archive", _("Archivé")


class Appairage(BaseModel):
    """
    Appairage entre un candidat, un partenaire et, optionnellement, une formation.

    Le modèle reste responsable de la cohérence des champs persistés et de
    l'historisation locale, mais ne doit plus être considéré comme la source
    principale de synchronisation métier vers `Candidat`.
    """

    objects = AppairageManager()

    candidat = models.ForeignKey(Candidat, on_delete=models.CASCADE, related_name="appairages")
    partenaire = models.ForeignKey(Partenaire, on_delete=models.CASCADE, related_name="appairages")
    formation = models.ForeignKey(Formation, on_delete=models.CASCADE, related_name="appairages", null=True, blank=True)

    date_appairage = models.DateTimeField(default=timezone.now, verbose_name=_("Date de mise en relation"))

    statut = models.CharField(
        max_length=30,
        choices=AppairageStatut.choices,
        default=AppairageStatut.TRANSMIS,
        verbose_name=_("Statut de l'appairage"),
    )

    activite = models.CharField(
        max_length=10,
        choices=AppairageActivite.choices,
        default=AppairageActivite.ACTIF,
        verbose_name=_("Activité"),
        db_index=True,
    )

    retour_partenaire = models.TextField(blank=True, null=True, verbose_name=_("Retour du partenaire"))
    date_retour = models.DateTimeField(blank=True, null=True, verbose_name=_("Date du retour du partenaire"))

    class Meta:
        verbose_name = _("Appairage")
        verbose_name_plural = _("Appairages")
        ordering = ["-date_appairage"]
        constraints = [
            models.UniqueConstraint(
                fields=["candidat", "partenaire", "formation"],
                condition=Q(formation__isnull=False),
                name="unique_appairage_avec_formation",
            ),
            models.UniqueConstraint(
                fields=["candidat", "partenaire"],
                condition=Q(formation__isnull=True),
                name="unique_appairage_sans_formation",
            ),
        ]
        indexes = [
            models.Index(fields=["candidat"]),
            models.Index(fields=["partenaire"]),
            models.Index(fields=["formation"]),
            models.Index(fields=["statut"]),
            models.Index(fields=["activite"]),
            models.Index(fields=["date_appairage"]),
        ]

    def __str__(self):
        """
        Représentation compacte : <candidat> → <partenaire> (<statut>).
        """
        return f"{self.candidat} → {self.partenaire} ({self.get_statut_display()})"

    def clean(self):
        """
        Valide la cohérence de l'appairage.
        """
        super().clean()
        if self.formation and self.candidat.formation_id != self.formation_id:
            raise ValidationError(_("L'appairage doit lier le candidat à sa formation d'origine."))

    def get_formation_identite_complete(self):
        """
        Retourne l'identité complète de la formation liée, ou None.
        """
        return self.formation.get_formation_identite_complete() if self.formation else None

    def get_formation_identite_bref(self):
        """
        Retourne le nom bref de la formation liée, ou None.
        """
        return self.formation.get_formation_identite_bref() if self.formation else None

    def set_user(self, user):
        """
        Enregistre l'utilisateur ayant modifié l'appairage.
        """
        self._user = user

    def archiver(self, user=None):
        """
        Archive l'appairage s'il ne l'est pas déjà.
        """
        if self.activite != AppairageActivite.ARCHIVE:
            self.activite = AppairageActivite.ARCHIVE
            self.save(user=user, update_fields=["activite"])
            logger.info(
                "Appairage #%s archivé (%s → %s)",
                self.pk,
                self.candidat_id if hasattr(self, "candidat_id") else self.candidat,
                self.partenaire_id if hasattr(self, "partenaire_id") else self.partenaire,
            )

    def desarchiver(self, user=None):
        """
        Désarchive l'appairage s'il ne l'est pas déjà.
        """
        if self.activite != AppairageActivite.ACTIF:
            self.activite = AppairageActivite.ACTIF
            self.save(user=user, update_fields=["activite"])
            logger.info(
                "Appairage #%s désarchivé (%s → %s)",
                self.pk,
                self.candidat_id if hasattr(self, "candidat_id") else self.candidat,
                self.partenaire_id if hasattr(self, "partenaire_id") else self.partenaire,
            )

    @classmethod
    def archiver_pour_formation(cls, formation, user=None):
        """
        Archive tous les appairages actifs liés à une formation.
        """
        qs = cls.objects.filter(formation=formation, activite=AppairageActivite.ACTIF)
        updated = qs.update(activite=AppairageActivite.ARCHIVE)
        if updated:
            for app_id in qs.values_list("id", flat=True):
                logger.info("Appairage #%s archivé (batch, formation)", app_id)

    @classmethod
    def desarchiver_pour_formation(cls, formation, user=None):
        """
        Désarchive tous les appairages archivés liés à une formation.
        """
        qs = cls.objects.filter(formation=formation, activite=AppairageActivite.ARCHIVE)
        updated = qs.update(activite=AppairageActivite.ACTIF)
        if updated:
            for app_id in qs.values_list("id", flat=True):
                logger.info("Appairage #%s désarchivé (batch, formation)", app_id)

    _STATUS_TO_RESULTAT = {
        AppairageStatut.APPAIRAGE_OK: ResultatPlacementChoices.ADMIS,
        AppairageStatut.ACCEPTE: ResultatPlacementChoices.ADMIS,
        AppairageStatut.CONTRAT_A_SIGNER: ResultatPlacementChoices.EN_ATTENTE,
        AppairageStatut.CONTRAT_EN_ATTENTE: ResultatPlacementChoices.EN_ATTENTE,
        AppairageStatut.EN_ATTENTE: ResultatPlacementChoices.EN_ATTENTE,
        AppairageStatut.TRANSMIS: ResultatPlacementChoices.APPAIRAGE_EN_COURS,
        AppairageStatut.A_FAIRE: ResultatPlacementChoices.EN_ATTENTE,
        AppairageStatut.REFUSE: ResultatPlacementChoices.NON_ADMIS,
        AppairageStatut.ANNULE: ResultatPlacementChoices.ABANDON_ETS,
    }

    _ACCEPTED_STATUSES = {AppairageStatut.APPAIRAGE_OK, AppairageStatut.ACCEPTE}
    _CONTRACT_STATUSES = {
        AppairageStatut.CONTRAT_A_SIGNER,
        AppairageStatut.CONTRAT_EN_ATTENTE,
        AppairageStatut.APPAIRAGE_OK,
    }

    def _last_appairage_for(self, candidat: Candidat):
        """
        Retourne le dernier appairage actif pour un candidat donné, ou None.
        """
        return (
            type(self)
            .objects.filter(candidat_id=candidat.pk, activite=AppairageActivite.ACTIF)
            .order_by("-date_appairage", "-pk")
            .select_related("partenaire")
            .only("id", "date_appairage", "statut", "partenaire_id", "updated_by_id", "created_by_id")
            .first()
        )

    def _sync_candidat_snapshot(self, candidat: Candidat):
        """
        Ancienne implémentation locale de synchronisation du snapshot de
        placement sur `Candidat`.

        Cette méthode est conservée comme référence technique pendant la
        transition, mais le flux métier cible doit désormais passer par
        `AppairagePlacementService`. Elle ne doit plus être vue comme la
        responsabilité métier principale du modèle.
        """
        try:
            if not candidat:
                return

            last = self._last_appairage_for(candidat)
            if not last:
                new_vals = dict(
                    entreprise_placement=None,
                    responsable_placement=None,
                    resultat_placement=None,
                    date_placement=None,
                    entreprise_validee=None,
                    contrat_signe=None,
                    statut=Candidat.StatutCandidat.AUTRE,
                )
            else:
                resultat = self._STATUS_TO_RESULTAT.get(last.statut)
                responsable = getattr(last, "created_by", None) or getattr(last, "updated_by", None)
                entreprise = (
                    last.partenaire if last.statut not in (AppairageStatut.REFUSE, AppairageStatut.ANNULE) else None
                )
                entreprise_validee = last.partenaire if last.statut in self._ACCEPTED_STATUSES else None
                contrat = Candidat.ContratSigne.EN_COURS if last.statut in self._CONTRACT_STATUSES else None
                date_pl = last.date_appairage.date() if last.date_appairage else timezone.now().date()
                new_vals = dict(
                    entreprise_placement=entreprise,
                    responsable_placement=responsable,
                    resultat_placement=resultat,
                    date_placement=date_pl,
                    entreprise_validee=entreprise_validee,
                    contrat_signe=contrat,
                    statut=Candidat.StatutCandidat.EN_APPAIRAGE,
                )

            dirty = False
            for field, value in new_vals.items():
                if getattr(candidat, field) != value:
                    setattr(candidat, field, value)
                    dirty = True

            if dirty:
                user = getattr(self, "_user", None)
                try:
                    candidat.save(user=user)
                except TypeError:
                    candidat.save()
                logger.info(
                    "Snapshot candidat #%s mis à jour: statut=%s, entreprise=%s, resultat=%s",
                    candidat.pk,
                    candidat.get_statut_display(),
                    getattr(getattr(candidat, "entreprise_placement", None), "nom", None),
                    candidat.resultat_placement,
                )
        except Exception as e:
            logger.exception(
                "Sync candidat (dernier appairage) impossible (candidat id=%s): %s",
                getattr(candidat, "pk", None),
                str(e),
            )

    def save(self, *args, **kwargs):
        """
        Sauvegarde l'appairage et gère l'historique propre au modèle.

        Dans l'état actuel du code, le modèle ne synchronise plus directement
        le snapshot candidat : il émet seulement un warning
        `MODEL_SYNC_TRIGGERED` lorsqu'un ancien flux modèle aurait pu se
        déclencher.
        """
        user = kwargs.pop("user", None)
        is_new = self.pk is None
        actor = user or getattr(self, "_user", None) or getattr(self, "updated_by", None) or getattr(self, "created_by", None)

        original = None
        original_candidat_id = None

        if not is_new:
            original = type(self).objects.only("id", "candidat_id", "statut", "retour_partenaire").get(pk=self.pk)
            original_candidat_id = original.candidat_id

        with transaction.atomic():
            if actor:
                self.set_user(actor)

            super().save(*args, **kwargs)

            if is_new:
                logger.info("Appairage créé : %s", self)
                HistoriqueAppairage.objects.create(
                    appairage=self,
                    statut=self.statut,
                    auteur=getattr(self, "_user", None),
                    commentaire="Création de l’appairage",
                )
            else:
                self._log_changes(original)

            if not is_appairage_snapshot_sync_deferred() and not getattr(self, "_skip_snapshot_sync", False):
                logger.warning("MODEL_SYNC_TRIGGERED: appairage %s candidat %s", self.pk, self.candidat_id)
                # Legacy snapshot sync intentionally disabled during Phase 4.
                # Previous behavior:
                # self._sync_candidat_snapshot(self.candidat)

            if (
                not is_new
                and original_candidat_id
                and original_candidat_id != self.candidat_id
                and not is_appairage_snapshot_sync_deferred()
                and not getattr(self, "_skip_snapshot_sync", False)
            ):
                logger.warning(
                    "MODEL_SYNC_TRIGGERED: appairage %s previous_candidat %s",
                    self.pk,
                    original_candidat_id,
                )
                # Legacy snapshot sync intentionally disabled during Phase 4.
                # Previous behavior:
                # try:
                #     old_cand = Candidat.objects.get(pk=original_candidat_id)
                #     self._sync_candidat_snapshot(old_cand)
                # except Candidat.DoesNotExist:
                #     pass

    def delete(self, *args, **kwargs):
        """
        Supprime l'appairage et conserve un warning d'observation si un ancien
        flux de synchronisation modèle aurait dû mettre à jour le candidat.
        """
        cand = self.candidat
        with transaction.atomic():
            logger.warning("Suppression appairage : %s", self)
            super().delete(*args, **kwargs)
            if not is_appairage_snapshot_sync_deferred() and not getattr(self, "_skip_snapshot_sync", False):
                logger.warning(
                    "MODEL_SYNC_TRIGGERED: appairage %s deleted_candidat %s",
                    self.pk,
                    getattr(cand, "pk", None),
                )
                # Legacy snapshot sync intentionally disabled during Phase 4.
                # Previous behavior:
                # self._sync_candidat_snapshot(cand)

    def _log_changes(self, original):
        """
        Enregistre l'historique et le log si le statut ou le retour partenaire est modifié.
        """
        changements = []

        if self.statut != original.statut:
            changements.append(f"Statut : '{original.get_statut_display()}' → '{self.get_statut_display()}'")
            HistoriqueAppairage.objects.create(
                appairage=self,
                statut=self.statut,
                auteur=getattr(self, "_user", None),
                commentaire="Changement de statut",
            )

        if self.retour_partenaire != original.retour_partenaire:
            changements.append("Retour partenaire modifié")

        if changements:
            logger.info("Appairage modifié (id=%s) – %s", self.pk, "; ".join(changements))


class HistoriqueAppairage(models.Model):
    """
    Historique des statuts d'un appairage.
    """

    appairage = models.ForeignKey(
        Appairage,
        on_delete=models.CASCADE,
        related_name="historiques",
    )
    date = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(
        max_length=30,
        choices=AppairageStatut.choices,
    )
    commentaire = models.TextField(blank=True, verbose_name=_("Commentaire"))

    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name=_("Auteur"),
    )

    class Meta:
        verbose_name = _("Historique d’appairage")
        verbose_name_plural = _("Historiques d’appairages")
        ordering = ["-date"]

    def __str__(self):
        """
        Affichage de l'historique d'appairage.
        """
        return f"{self.appairage} – {self.get_statut_display()} ({self.date.strftime('%d/%m/%Y')})"

    def archiver(self, user=None):
        """
        Archive l'appairage lié si besoin et ajoute une entrée d'historique.
        """
        app = self.appairage
        if app.activite != AppairageActivite.ARCHIVE:
            app.activite = AppairageActivite.ARCHIVE
            app.save(update_fields=["activite", "updated_by", "updated_at"], user=user)
            HistoriqueAppairage.objects.create(
                appairage=app,
                statut=app.statut,
                auteur=user,
                commentaire="Appairage archivé",
            )
            logger.info("Appairage #%s archivé", app.pk)

    def desarchiver(self, user=None):
        """
        Désarchive l'appairage lié si besoin et ajoute une entrée d'historique.
        """
        app = self.appairage
        if app.activite != AppairageActivite.ACTIF:
            app.activite = AppairageActivite.ACTIF
            app.save(update_fields=["activite", "updated_by", "updated_at"], user=user)
            HistoriqueAppairage.objects.create(
                appairage=app,
                statut=app.statut,
                auteur=user,
                commentaire="Appairage désarchivé",
            )
            logger.info("Appairage #%s désarchivé", app.pk)
