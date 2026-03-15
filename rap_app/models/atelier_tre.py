# models/atelier_tre.py

from django.db import models, transaction
from django.utils.translation import gettext_lazy as _
from django.db.models import Exists, OuterRef, Count, Q, QuerySet

from .base import BaseModel
from .centres import Centre
from .candidat import Candidat

class AtelierTRE(BaseModel):
    """
    Atelier collectif TRE (Techniques de Recherche d'Emploi) rattaché à un centre.
    """

    class TypeAtelier(models.TextChoices):
        ATELIER_1 = "atelier_1", _("Atelier 1 - Exploration et positionnement")
        ATELIER_2 = "atelier_2", _("Atelier 2 - CV et lettre de motivation")
        ATELIER_3 = "atelier_3", _("Atelier 3 - Simulation entretien")
        ATELIER_4 = "atelier_4", _("Atelier 4 - Prospection entreprise")
        ATELIER_5 = "atelier_5", _("Atelier 5 - Réseaux sociaux pro")
        ATELIER_6 = "atelier_6", _("Atelier 6 - Posture professionnelle")
        ATELIER_7 = "atelier_7", _("Atelier 7 - Bilan et plan d’action")
        AUTRE     = "autre",     _("Autre")

    type_atelier = models.CharField(
        max_length=30,
        choices=TypeAtelier.choices,
        verbose_name=_("Type d’atelier"),
        help_text=_("Type d’atelier collectif"),
    )
    # Type d’atelier collectif

    date_atelier = models.DateTimeField(
        _("Date de l'atelier"),
        null=True, blank=True,
        help_text=_("Date/heure de l’atelier"),
    )
    # Date prévue de l’atelier

    centre = models.ForeignKey(
        Centre,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="ateliers_tre",
        verbose_name=_("Centre de formation"),
        help_text=_("Centre où se déroule la formation"),
    )
    # Centre associé à l’atelier

    candidats = models.ManyToManyField(
        Candidat,
        related_name="ateliers_tre",
        blank=True,
        verbose_name=_("Candidats inscrits"),
        help_text=_("Candidats liés à cet atelier"),
    )
    # Candidats inscrits à l’atelier (relation m2m)

    class Meta:
        verbose_name = _("Atelier TRE")
        verbose_name_plural = _("Ateliers TRE")
        ordering = ["-date_atelier", "-id"]  # tri prioritaire sur la date, puis sur id
        indexes = [
            models.Index(fields=["type_atelier"], name="idx_ateliertre_type"),
            models.Index(fields=["centre"], name="idx_ateliertre_centre"),
            models.Index(fields=["date_atelier"], name="idx_ateliertre_date"),
        ]
        # Index sur les axes principaux : type, centre, date

    def __str__(self):
        """
        Retourne un libellé court avec type d’atelier et date si renseignée.
        """
        label = self.get_type_atelier_display()
        if self.date_atelier:
            return f"{label} – {self.date_atelier:%d/%m/%Y %H:%M}"
        return label

    @property
    def nb_inscrits(self) -> int:
        """
        Retourne le nombre de candidats inscrits via la relation m2m.
        """
        if hasattr(self, '_prefetched_objects_cache') and 'candidats' in self._prefetched_objects_cache:
            return len(self._prefetched_objects_cache['candidats'])
        return self.candidats.count()

    @staticmethod
    def annotate_candidats_with_atelier_flags(qs: QuerySet) -> QuerySet:
        """
        Annote un QuerySet de Candidat avec : has_<type> (bool) et count_<type> (int) pour chaque type d’atelier.
        """
        annotations = {}
        for key, _label in AtelierTRE.TypeAtelier.choices:
            annotations[f"has_{key}"] = Exists(
                AtelierTRE.objects.filter(type_atelier=key, candidats=OuterRef("pk"))
            )
            annotations[f"count_{key}"] = Count(
                "ateliers_tre",
                filter=Q(ateliers_tre__type_atelier=key),
                distinct=True,
            )
        if "count_autre" in annotations:
            annotations["count_atelier_autre"] = annotations["count_autre"]
        return qs.annotate(**annotations)
    
    def set_presence(self, candidat: Candidat, statut: str, commentaire: str | None = None, user=None):
        """
        Crée ou met à jour l’état de présence d’un candidat à cet atelier.
        Renvoie l’instance AtelierTREPresence créée ou modifiée.
        """
        with transaction.atomic():
            obj, created = AtelierTREPresence.objects.get_or_create(
                atelier=self, candidat=candidat,
                defaults={"statut": statut, "commentaire": commentaire},
            )
            update_fields = []
            if obj.statut != statut:
                obj.statut = statut
                update_fields.append('statut')
            if commentaire is not None and obj.commentaire != commentaire:
                obj.commentaire = commentaire
                update_fields.append('commentaire')
            if update_fields:
                try:
                    obj.save(update_fields=update_fields, user=user)
                except TypeError:
                    obj.save(update_fields=update_fields)
            return obj

class PresenceStatut(models.TextChoices):
    """
    Statuts possibles de présence à un atelier TRE.
    """
    PRESENT = "present", "Présent"
    ABSENT = "absent", "Absent"
    EXCUSE = "excuse", "Excusé"
    INCONNU = "inconnu", "Non renseigné"

class AtelierTREPresence(BaseModel):
    """
    Association Atelier x Candidat avec un statut de présence et commentaire.
    """

    atelier = models.ForeignKey(
        "AtelierTRE", on_delete=models.CASCADE,
        related_name="presences", verbose_name=_("Atelier")
    )
    # Lien vers l’atelier

    candidat = models.ForeignKey(
        Candidat, on_delete=models.CASCADE,
        related_name="presences_ateliers", verbose_name=_("Candidat")
    )
    # Lien vers le candidat

    statut = models.CharField(
        max_length=15, choices=PresenceStatut.choices,
        default=PresenceStatut.INCONNU, verbose_name=_("Statut de présence")
    )
    # Statut de présence

    commentaire = models.TextField(blank=True, null=True, verbose_name=_("Commentaire"))
    # Commentaire libre

    class Meta:
        verbose_name = _("Présence à un atelier")
        verbose_name_plural = _("Présences à des ateliers")
        constraints = [
            models.UniqueConstraint(
                fields=["atelier", "candidat"],
                name="uniq_presence_atelier_candidat",
            )
        ]

    def __str__(self):
        """
        Retourne une synthèse textuelle de la présence pour l’admin.
        """
        return f"{self.atelier_id} / {self.candidat_id} → {self.get_statut_display()}"

# Compatibilité backward: monkey patch pour interface legacy (pas recommandé en usage moderne)
AtelierTRE.set_presence = AtelierTRE.set_presence
