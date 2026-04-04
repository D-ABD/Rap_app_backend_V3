"""Modèles métier des formations et de leur historique.

Le fichier concentre la donnée persistante et plusieurs helpers de calcul. Les
recalculs transverses restent encore partiellement déclenchés par des signaux,
en attendant une extraction plus explicite vers des services dédiés.
"""

import datetime
import logging
from datetime import timedelta
from typing import Dict, Optional

from django.apps import apps
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import (
    Case,
    Count,
    ExpressionWrapper,
    F,
    FloatField,
    Q,
    Sum,
    Value,
    When,
)
from django.urls import reverse
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.functional import cached_property
from django.utils.translation import gettext_lazy as _

from .base import BaseModel
from .cerfa_codes import CerfaDiplomeCode, CerfaNsfSpecialiteCode, CerfaProTypeQualificationViseeCode
from .centres import Centre
from .statut import Statut, get_default_color
from .types_offre import TypeOffre

logger = logging.getLogger("application.formation")


class Activite(models.TextChoices):
    """
    Enumération indiquant si une formation est active ou archivée.
    """

    ACTIVE = "active", _("Active")
    ARCHIVEE = "archivee", _("Archivée")


class FormationManager(models.Manager):
    """
    Manager pour Formation filtrant par défaut les formations actives
    et fournissant des méthodes de filtrage et d'annotation.
    """

    def get_queryset(self):
        """
        Retourne les Formations actives uniquement.
        """
        return super().get_queryset().filter(activite=Activite.ACTIVE)

    def archivees(self):
        """
        Retourne uniquement les formations archivées.
        """
        return super().get_queryset().filter(activite=Activite.ARCHIVEE)

    def all_including_archived(self):
        """
        Retourne toutes les formations (actives et archivées).
        """
        return super().get_queryset()

    def formations_actives(self):
        """
        Retourne les formations dont la date courante est dans l'intervalle [start_date, end_date].
        """
        today = timezone.localdate()
        return self.filter(start_date__lte=today, end_date__gte=today)

    def formations_a_venir(self, dans=None):
        """
        Retourne les formations dont start_date est future,
        éventuellement limitée à une période passée en paramètre.
        """
        today = timezone.localdate()
        queryset = self.filter(start_date__gt=today)

        if dans:
            mapping = {
                "4w": timedelta(weeks=4),
                "3m": timedelta(days=90),
                "6m": timedelta(days=180),
            }
            delta = None
            if isinstance(dans, str):
                delta = mapping.get(dans.lower())
            elif isinstance(dans, (int, float)):
                delta = timedelta(days=int(dans))
            if delta:
                end_limit = today + delta
                queryset = queryset.filter(start_date__lte=end_limit)
        return queryset

    def formations_terminees(self):
        """
        Retourne les formations terminées (end_date < aujourd'hui).
        """
        today = timezone.localdate()
        return self.filter(end_date__lt=today)

    def formations_dans_4_semaines(self):
        """Retourne les formations débutant dans 4 semaines."""
        return self.formations_a_venir(dans="4w")

    def formations_dans_3_mois(self):
        """Retourne les formations débutant dans 3 mois."""
        return self.formations_a_venir(dans="3m")

    def formations_dans_6_mois(self):
        """Retourne les formations débutant dans 6 mois."""
        return self.formations_a_venir(dans="6m")

    def formations_a_recruter(self):
        """
        Retourne les formations avec au moins une place disponible.
        """
        return self.annotate(
            total_places=F("prevus_crif") + F("prevus_mp"), total_inscrits=F("inscrits_crif") + F("inscrits_mp")
        ).filter(total_places__gt=F("total_inscrits"))

    def formations_toutes(self):
        """
        Retourne toutes les formations via ce manager (actives par défaut).
        """
        return self.all()

    def trier_par(self, champ_tri):
        """
        Trie le queryset selon le champ proposé, inclut les annotations nécessaires pour certains tris.
        """
        champs_autorises = [
            "centre",
            "-centre",
            "statut",
            "-statut",
            "type_offre",
            "-type_offre",
            "start_date",
            "-start_date",
            "end_date",
            "-end_date",
            "nom",
            "-nom",
            "total_places",
            "-total_places",
            "total_inscrits",
            "-total_inscrits",
            "taux_saturation",
            "-taux_saturation",
        ]
        queryset = self.get_queryset()
        if champ_tri in [
            "total_places",
            "-total_places",
            "total_inscrits",
            "-total_inscrits",
            "taux_saturation",
            "-taux_saturation",
        ]:
            queryset = queryset.annotate(
                total_places=F("prevus_crif") + F("prevus_mp"),
                total_inscrits=F("inscrits_crif") + F("inscrits_mp"),
                taux_saturation=Case(
                    When(
                        prevus_crif__gt=0,
                        then=ExpressionWrapper(
                            100.0 * (F("inscrits_crif") + F("inscrits_mp")) / (F("prevus_crif") + F("prevus_mp")),
                            output_field=FloatField(),
                        ),
                    ),
                    When(
                        prevus_mp__gt=0,
                        then=ExpressionWrapper(
                            100.0 * (F("inscrits_crif") + F("inscrits_mp")) / (F("prevus_crif") + F("prevus_mp")),
                            output_field=FloatField(),
                        ),
                    ),
                    default=Value(0.0),
                    output_field=FloatField(),
                ),
            )
            return queryset.order_by(champ_tri)
        return queryset.order_by(champ_tri) if champ_tri in champs_autorises else queryset

    def recherche(
        self,
        texte=None,
        type_offre=None,
        centre=None,
        statut=None,
        date_debut=None,
        date_fin=None,
        places_disponibles=False,
    ):
        """
        Recherche multi-critères sur les formations : texte, relations, dates, et filtrage des places restantes.
        """
        queryset = self.get_queryset()

        if texte:
            queryset = queryset.filter(
                Q(nom__icontains=texte)
                | Q(num_kairos__icontains=texte)
                | Q(num_offre__icontains=texte)
                | Q(num_produit__icontains=texte)
            )
        if type_offre:
            queryset = queryset.filter(type_offre_id=type_offre)
        if centre:
            queryset = queryset.filter(centre_id=centre)
        if statut:
            queryset = queryset.filter(statut_id=statut)
        if date_debut:
            queryset = queryset.filter(start_date__gte=date_debut)
        if date_fin:
            queryset = queryset.filter(end_date__lte=date_fin)
        if places_disponibles:
            queryset = queryset.annotate(
                total_places=F("prevus_crif") + F("prevus_mp"), total_inscrits=F("inscrits_crif") + F("inscrits_mp")
            ).filter(total_places__gt=F("total_inscrits"))
        return queryset

    def get_formations_with_metrics(self):
        """
        Annotate le queryset avec les métriques principales : places, inscrits, disponibilité, saturation.
        """
        return self.annotate(
            total_places=F("prevus_crif") + F("prevus_mp"),
            total_inscrits=F("inscrits_crif") + F("inscrits_mp"),
            places_disponibles=ExpressionWrapper(
                (F("prevus_crif") + F("prevus_mp")) - (F("inscrits_crif") + F("inscrits_mp")),
                output_field=models.IntegerField(),
            ),
            taux_saturation=Case(
                When(
                    prevus_crif__gt=0,
                    then=ExpressionWrapper(
                        100.0 * (F("inscrits_crif") + F("inscrits_mp")) / (F("prevus_crif") + F("prevus_mp")),
                        output_field=FloatField(),
                    ),
                ),
                When(
                    prevus_mp__gt=0,
                    then=ExpressionWrapper(
                        100.0 * (F("inscrits_crif") + F("inscrits_mp")) / (F("prevus_crif") + F("prevus_mp")),
                        output_field=FloatField(),
                    ),
                ),
                default=Value(0.0),
                output_field=FloatField(),
            ),
        )

    def increment_attendees(self, formation_id, count=1, user=None, crif=True):
        """
        Incrémente de façon atomique le nombre d'inscrits CRIF ou MP pour une formation.
        """
        with transaction.atomic():
            formation = self.select_for_update().get(pk=formation_id)
            field = "inscrits_crif" if crif else "inscrits_mp"
            old_val = getattr(formation, field)
            setattr(formation, field, old_val + count)
            formation.save(update_fields=[field], user=user)
            return formation


class Formation(BaseModel):
    """Modèle principal d'une formation et de ses indicateurs persistés."""

    """
    Modèle principal décrivant une offre de formation, ses propriétés, et ses méthodes associées.
    """

    # Constants for field lengths (inchangés - legacy)
    NOM_MAX_LENGTH = 255
    NUM_MAX_LENGTH = 50
    ASSISTANTE_MAX_LENGTH = 255

    FIELDS_CALCULATED = ["nombre_candidats", "nombre_entretiens", "nombre_evenements"]
    FIELDS_TO_TRACK = [
        "nom",
        "centre",
        "type_offre",
        "statut",
        "start_date",
        "end_date",
        "num_kairos",
        "num_offre",
        "num_produit",
        "prevus_crif",
        "prevus_mp",
        "inscrits_crif",
        "inscrits_mp",
        "assistante",
        "cap",
        "convocation_envoie",
        "entree_formation",
        "nombre_candidats",
        "nombre_entretiens",
        "dernier_commentaire",
    ]

    # Champs principaux

    activite = models.CharField(
        max_length=20,
        choices=Activite.choices,
        default=Activite.ACTIVE,
        verbose_name=_("Activité"),
        help_text=_("Indique si la formation est active ou archivée"),
    )

    nom = models.CharField(
        max_length=NOM_MAX_LENGTH,
        verbose_name=_("Nom de la formation"),
        help_text=_("Intitulé complet de la formation"),
    )
    centre = models.ForeignKey(
        Centre,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="formations",
        verbose_name=_("Centre de formation"),
        help_text=_("Centre où se déroule la formation"),
    )
    type_offre = models.ForeignKey(
        TypeOffre,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="formations",
        verbose_name=_("Type d'offre"),
        help_text=_("Catégorie d'offre de formation"),
    )
    statut = models.ForeignKey(
        Statut,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="formations",
        verbose_name=_("Statut de la formation"),
        help_text=_("État actuel de la formation"),
    )
    start_date = models.DateField(
        null=True, blank=True, verbose_name=_("Date de début"), help_text=_("Date de début de la formation")
    )
    end_date = models.DateField(
        null=True, blank=True, verbose_name=_("Date de fin"), help_text=_("Date de fin de la formation")
    )
    num_kairos = models.CharField(
        max_length=NUM_MAX_LENGTH,
        null=True,
        blank=True,
        verbose_name=_("Numéro Kairos"),
        help_text=_("Identifiant Kairos de la formation"),
    )
    num_offre = models.CharField(
        max_length=NUM_MAX_LENGTH,
        null=True,
        blank=True,
        verbose_name=_("Numéro de l'offre"),
        help_text=_("Identifiant de l'offre"),
    )
    num_produit = models.CharField(
        max_length=NUM_MAX_LENGTH,
        null=True,
        blank=True,
        verbose_name=_("Numéro du produit"),
        help_text=_("Identifiant du produit de formation"),
    )
    prevus_crif = models.PositiveIntegerField(
        default=0, verbose_name=_("Places prévues CRIF"), help_text=_("Nombre de places disponibles CRIF")
    )
    prevus_mp = models.PositiveIntegerField(
        default=0, verbose_name=_("Places prévues MP"), help_text=_("Nombre de places disponibles MP")
    )
    inscrits_crif = models.PositiveIntegerField(
        default=0, verbose_name=_("Inscrits CRIF"), help_text=_("Nombre d'inscrits CRIF")
    )
    inscrits_mp = models.PositiveIntegerField(
        default=0, verbose_name=_("Inscrits MP"), help_text=_("Nombre d'inscrits MP")
    )
    saturation = models.FloatField(
        null=True,
        blank=True,
        editable=False,
        verbose_name=_("Niveau de saturation moyen"),
        help_text=_("Pourcentage moyen de saturation basé sur le taux d’inscrits"),
    )
    intitule_diplome = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name=_("Diplôme ou titre visé par l’apprenti"),
        help_text=_("Intitulé précis du diplôme ou titre préparé"),
    )
    diplome_vise_code = models.CharField(
        max_length=2,
        null=True,
        blank=True,
        choices=CerfaDiplomeCode.choices,
        verbose_name=_("Diplome vise CERFA"),
        help_text=_("Code CERFA du diplome ou titre vise par l'apprenti."),
    )
    code_diplome = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name=_("Code diplôme"),
        help_text=_("Code du diplôme visé par la formation"),
    )
    code_rncp = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name=_("Code RNCP"),
        help_text=_("Code RNCP du diplôme"),
    )
    type_qualification_visee = models.CharField(
        max_length=1,
        null=True,
        blank=True,
        choices=CerfaProTypeQualificationViseeCode.choices,
        verbose_name=_("Type de qualification visée"),
        help_text=_(
            "Code de qualification visée utile au pré-remplissage du CERFA professionnalisation."
        ),
    )
    specialite_formation = models.CharField(
        max_length=3,
        null=True,
        blank=True,
        choices=CerfaNsfSpecialiteCode.choices,
        verbose_name=_("Code NSF spécialité de formation"),
        help_text=_(
            "Code NSF à 3 chiffres utilisé pour la spécialité de formation dans le CERFA professionnalisation."
        ),
    )
    total_heures = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Durée totale (heures)"),
        help_text=_("Nombre total d'heures de formation en présentiel + distanciel"),
    )
    heures_enseignements_generaux = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Heures d'enseignements généraux"),
        help_text=_("Volume d'heures à reporter dans le CERFA professionnalisation pour les enseignements généraux."),
    )
    heures_distanciel = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_("Heures en distanciel"),
        help_text=_("Nombre d'heures effectuées à distance"),
    )
    assistante = models.CharField(
        max_length=ASSISTANTE_MAX_LENGTH,
        null=True,
        blank=True,
        verbose_name=_("Assistante"),
        help_text=_("Nom de l'assistante responsable"),
    )
    cap = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Capacité maximale"), help_text=_("Capacité maximale d'accueil")
    )
    convocation_envoie = models.BooleanField(
        default=False,
        verbose_name=_("Convocation envoyée"),
        help_text=_("Indique si les convocations ont été envoyées"),
    )
    entree_formation = models.PositiveIntegerField(
        default=0, verbose_name=_("Entrées en formation"), help_text=_("Nombre de personnes entrées en formation")
    )
    nombre_candidats = models.PositiveIntegerField(
        default=0, verbose_name=_("Nombre de candidats"), help_text=_("Nombre total de candidats pour cette formation")
    )
    nombre_entretiens = models.PositiveIntegerField(
        default=0, verbose_name=_("Nombre d'entretiens"), help_text=_("Nombre d'entretiens réalisés")
    )
    nombre_evenements = models.PositiveIntegerField(
        default=0, verbose_name=_("Nombre d'événements"), help_text=_("Nombre d'événements liés à cette formation")
    )
    dernier_commentaire = models.TextField(
        null=True,
        blank=True,
        verbose_name=_("Dernier commentaire"),
        help_text=_("Contenu du dernier commentaire ajouté"),
    )
    partenaires = models.ManyToManyField(
        "Partenaire",
        related_name="formations",
        verbose_name=_("Partenaires"),
        blank=True,
        help_text=_("Partenaires associés à cette formation"),
    )

    objects = FormationManager()

    def clean(self):
        """
        Valide la cohérence des données de la formation.
        """
        super().clean()
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError(
                {
                    "start_date": _("La date de début doit être antérieure à la date de fin."),
                    "end_date": _("La date de fin doit être postérieure à la date de début."),
                }
            )
        if self.inscrits_crif > self.prevus_crif and self.prevus_crif > 0:
            logger.warning(
                f"Inscrits CRIF ({self.inscrits_crif}) supérieurs aux prévus ({self.prevus_crif}) pour {self.nom}"
            )
        if self.inscrits_mp > self.prevus_mp and self.prevus_mp > 0:
            logger.warning(f"Inscrits MP ({self.inscrits_mp}) supérieurs aux prévus ({self.prevus_mp}) pour {self.nom}")
        if not self.nom or not self.nom.strip():
            raise ValidationError({"nom": _("Le nom de la formation ne peut pas être vide.")})

    def save(self, *args, **kwargs):
        """
        Sauvegarde une instance Formation et gère la mise à jour du champ 'saturation' et l'historique si besoin.
        """
        user = kwargs.pop("user", None)
        skip_history = kwargs.pop("skip_history", False)
        update_fields = kwargs.get("update_fields", None)

        is_new = self.pk is None
        original = None
        if not is_new:
            if not skip_history:
                original = self.__class__.objects.only(*self.FIELDS_TO_TRACK).filter(pk=self.pk).first()

        self.full_clean()
        self.saturation = self.taux_saturation

        with transaction.atomic():
            if user:
                self._user = user

            if is_new:
                logger.info(f"[Formation] Créée : {self.nom}")
            else:
                logger.info(f"[Formation] Modifiée : {self.nom} (#{self.pk})")

            super().save(*args, **kwargs)
            if original and not skip_history:
                self._create_history_entries(original, user, update_fields)

    @staticmethod
    def _as_label(value) -> Optional[str]:
        """
        Renvoie une représentation textuelle lisible d'un champ enum, FK ou statut.
        """
        if value is None:
            return None
        if isinstance(value, (str, int, float, bool)):
            return str(value)
        for attr in ("label", "libelle", "nom", "name", "value", "code"):
            v = getattr(value, attr, None)
            if v is not None:
                s = str(v).strip()
                if s:
                    return s
        try:
            s = str(value).strip()
            return s or None
        except Exception:
            return None

    @staticmethod
    def _fmt_date_iso(d):
        """
        Transforme une date ou datetime en chaîne ISO 8601, ou None.
        """
        if not d:
            return None
        try:
            return d.isoformat()
        except Exception:
            return None

    def get_formation_identite_complete(self) -> Dict[str, Optional[str]]:
        """
        Retourne l'identité complète de la formation pour affichage ou API.
        """
        statut_txt = None
        get_disp = getattr(self, "get_statut_display", None)
        if callable(get_disp):
            try:
                statut_txt = (get_disp() or "").strip() or None
            except Exception:
                statut_txt = None
        if not statut_txt:
            statut_txt = self._as_label(getattr(self, "statut", None))

        return {
            "formation_nom": getattr(self, "nom", None) or None,
            "centre_id": getattr(self.centre, "id", None),
            "centre_nom": (
                getattr(getattr(self, "centre", None), "nom", None) or None
                if getattr(self, "centre", None) is not None
                else None
            ),
            "type_offre": (
                getattr(getattr(self, "type_offre", None), "nom", None) or None
                if getattr(self, "type_offre", None) is not None
                else None
            ),
            "num_offre": getattr(self, "num_offre", None) or None,
            "start_date": self._fmt_date_iso(getattr(self, "start_date", None)),
            "end_date": self._fmt_date_iso(getattr(self, "end_date", None)),
            "statut": statut_txt,
        }

    def get_formation_identite_bref(self) -> Dict[str, Optional[str]]:
        """
        Retourne l'identité synthétique d'une formation (nom, centre, num_offre, dates).
        """
        return {
            "formation_nom": getattr(self, "nom", None) or None,
            "centre_id": getattr(self.centre, "id", None),
            "centre_nom": (
                getattr(getattr(self, "centre", None), "nom", None) or None
                if getattr(self, "centre", None) is not None
                else None
            ),
            "num_offre": getattr(self, "num_offre", None) or None,
            "start_date": self._fmt_date_iso(getattr(self, "start_date", None)),
            "end_date": self._fmt_date_iso(getattr(self, "end_date", None)),
        }

    def get_transformation_badge(self):
        """
        Retourne un code couleur de badge selon le taux de transformation.
        """
        if self.taux_transformation is None:
            return "badge-dark"
        if self.taux_transformation >= 60:
            return "badge-success"
        elif self.taux_transformation >= 40:
            return "badge-warning"
        else:
            return "badge-danger"

    def get_resume_info(self):
        """
        Retourne un résumé des informations principales nécessaires à l'affichage.
        """
        badge = "❓"
        if self.saturation is not None:
            badge = "🔴" if self.saturation >= 80 else "🟡" if self.saturation >= 50 else "🟢"
        return {
            "formation_nom": self.nom or "Formation inconnue",
            "centre_nom": getattr(self.centre, "nom", "Centre ?") if self.centre else "Centre ?",
            "type_offre": getattr(self.type_offre, "nom", "Type ?") if self.type_offre else "Type ?",
            "num_offre": self.num_offre or "N/A",
            "statut": getattr(self.statut, "nom", "Inconnu") if self.statut else "Inconnu",
            "start_date": self.start_date.isoformat() if self.start_date else "??",
            "end_date": self.end_date.isoformat() if self.end_date else "??",
            "saturation_formation": self.saturation,
            "saturation_badge": badge,
        }

    def _create_history_entries(self, original, user, update_fields=None):
        """
        Crée une entrée d'historique pour chaque champ modifié entre l'objet original et actuel.
        """
        if original is None:
            logger.debug(f"[Formation] Pas de comparaison possible (original=None) pour {self.nom}")
            return
        fields_to_check = update_fields or self.FIELDS_TO_TRACK
        any_change = False
        for field in fields_to_check:
            if field not in self.FIELDS_TO_TRACK:
                continue
            old_val = getattr(original, field, None)
            new_val = getattr(self, field, None)
            if old_val != new_val:
                any_change = True
                old_val_str = self._format_field_for_history(field, old_val)
                new_val_str = self._format_field_for_history(field, new_val)
                if not Formation.objects.filter(pk=self.pk).exists():
                    logger.warning(f"Formation introuvable (ID={self.pk}), historique ignoré pour champ {field}")
                    continue
                HistoriqueFormation.objects.create(
                    formation=self,
                    champ_modifie=field,
                    ancienne_valeur=old_val_str,
                    nouvelle_valeur=new_val_str,
                    commentaire=f"Changement dans le champ {field}",
                    created_by=user,
                    details={
                        "user": getattr(user, "pk", None) if user else None,
                        "saturation": self.saturation,
                        "saturation_badge": self.get_saturation_badge(),
                        "taux_transformation": self.taux_transformation,
                        "transformation_badge": self.get_transformation_badge(),
                    },
                )
                logger.debug(f"[Formation] Historique créé pour {field}: {old_val_str} → {new_val_str}")
        if not any_change:
            logger.debug(f"[Formation] Aucun champ modifié pour {self.nom} (ID={self.pk})")

    def _format_field_for_history(self, field_name, value):
        """
        Formate une valeur pour stockage en historique.
        """
        if value is None:
            return ""
        if isinstance(value, models.Model):
            return str(value.pk)
        if isinstance(value, (datetime.date, datetime.datetime)):
            return value.isoformat()
        return str(value)

    def to_serializable_dict(self):
        """
        Retourne un dictionnaire JSON-serializable des informations principales.
        """

        def convert_value(value):
            if isinstance(value, datetime.datetime):
                return value.strftime("%Y-%m-%d %H:%M")
            elif isinstance(value, datetime.date):
                return value.strftime("%Y-%m-%d")
            elif isinstance(value, models.Model):
                return {"id": value.pk, "nom": str(value)}
            return value

        base_data = {
            key: convert_value(getattr(self, key))
            for key in [
                "nom",
                "start_date",
                "end_date",
                "statut",
                "num_kairos",
                "num_offre",
                "num_produit",
                "prevus_crif",
                "prevus_mp",
                "inscrits_crif",
                "inscrits_mp",
                "assistante",
                "cap",
                "convocation_envoie",
                "entree_formation",
                "nombre_candidats",
                "nombre_entretiens",
                "nombre_evenements",
                "dernier_commentaire",
            ]
        }
        base_data.update(
            {
                "id": self.pk,
                "centre": convert_value(self.centre),
                "type_offre": convert_value(self.type_offre),
                "statut": convert_value(self.statut),
                "statut_color": self.get_status_color(),
                "created_at": convert_value(self.created_at),
                "updated_at": convert_value(self.updated_at),
                "saturation": self.saturation,
            }
        )
        for prop in [
            "total_places",
            "total_inscrits",
            "taux_transformation",
            "taux_saturation",
            "places_disponibles",
            "is_a_recruter",
        ]:
            base_data[prop] = getattr(self, prop)
        return base_data

    @classmethod
    def get_csv_fields(cls):
        """
        Retourne la liste des champs exportés pour un export CSV.
        """
        return ["id", "nom", "centre", "type_offre", "statut", "start_date", "end_date", "created_at", "updated_at"]

    @classmethod
    def get_csv_headers(cls):
        """
        Retourne les en-têtes correspondantes à get_csv_fields.
        """
        return ["ID", "Nom", "Centre", "Type d'offre", "Statut", "Date début", "Date fin", "Créé le", "Modifié le"]

    def to_csv_row(self):
        """
        Retourne une ligne de valeurs pour export CSV (ordre conforme à get_csv_fields).
        """
        return [
            self.pk,
            self.nom or "",
            str(self.centre) if self.centre else "",
            str(self.type_offre) if self.type_offre else "",
            str(self.statut) if self.statut else "",
            self.start_date.isoformat() if self.start_date else "",
            self.end_date.isoformat() if self.end_date else "",
            self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else "",
            self.updated_at.strftime("%Y-%m-%d %H:%M") if self.updated_at else "",
        ]

    def __str__(self):
        """
        Représentation texte principale d'une formation.
        """
        return f"{self.nom} ({self.centre.nom if self.centre else 'Centre inconnu'})"

    def __repr__(self):
        """
        Représentation technique de la formation (pour debug).
        """
        return f"<Formation(id={self.pk}, nom='{self.nom}', statut='{self.statut}' if self.statut else 'None')>"

    def get_edit_url(self):
        """
        Retourne l'URL pour éditer la formation.
        """
        return reverse("formation-edit", kwargs={"pk": self.pk})

    def get_delete_url(self):
        """
        Retourne l'URL pour supprimer la formation.
        """
        return reverse("formation-delete", kwargs={"pk": self.pk})

    # Propriétés calculées

    @property
    def total_places(self):
        """
        Retourne le nombre total de places prévues.
        """
        return (self.prevus_crif or 0) + (self.prevus_mp or 0)

    @property
    def total_inscrits(self):
        """
        Retourne le nombre total d'inscrits.
        """
        return (self.inscrits_crif or 0) + (self.inscrits_mp or 0)

    @property
    def places_restantes_crif(self):
        """
        Retourne le nombre de places CRIF restantes (>=0).
        """
        return max((self.prevus_crif or 0) - (self.inscrits_crif or 0), 0)

    @property
    def places_restantes_mp(self):
        """
        Retourne le nombre de places MP restantes (>=0).
        """
        return max((self.prevus_mp or 0) - (self.inscrits_mp or 0), 0)

    @property
    def places_disponibles(self):
        """
        Retourne le nombre global de places restantes.
        """
        return max(0, self.total_places - self.total_inscrits)

    @property
    def places_restantes(self):
        """
        Alias pour places_disponibles.
        """
        return self.places_disponibles

    @property
    def taux_saturation(self):
        """
        Retourne le taux d'occupation des places.
        """
        places = self.total_places
        return round(100.0 * self.total_inscrits / places, 2) if places else 0.0

    @property
    def taux_transformation(self):
        """
        Retourne le taux de transformation candidats → inscrits.
        """
        nb_candidats = self.nombre_candidats or 0
        if nb_candidats <= 0:
            return 0.0
        return round(100.0 * self.total_inscrits / nb_candidats, 2)

    @property
    def a_recruter(self):
        """
        Retourne le nombre de places restantes à recruter.
        """
        return self.places_disponibles

    @property
    def is_a_recruter(self):
        """
        True si la formation a au moins une place disponible.
        """
        return self.places_disponibles > 0

    @property
    def is_active(self):
        """
        True si la formation est en cours (start_date <= aujourd'hui <= end_date).
        """
        today = timezone.localdate()
        return self.start_date and self.end_date and self.start_date <= today <= self.end_date

    @property
    def is_future(self):
        """
        True si la formation n'a pas encore commencé.
        """
        today = timezone.localdate()
        return self.start_date and self.start_date > today

    @property
    def is_past(self):
        """
        True si la formation est terminée.
        """
        today = timezone.localdate()
        return self.end_date and self.end_date < today

    @cached_property
    def status_temporel(self):
        """
        Retourne le statut temporel : 'active', 'future', 'past', 'unknown'.
        """
        if self.is_active:
            return "active"
        elif self.is_future:
            return "future"
        elif self.is_past:
            return "past"
        return "unknown"

    @property
    def est_archivee(self) -> bool:
        """
        True si la formation est archivée.
        """
        return self.activite == Activite.ARCHIVEE

    @property
    def est_active(self) -> bool:
        """
        True si la formation est active.
        """
        return self.activite == Activite.ACTIVE

    # Méthodes d'ajout de contenu

    def add_commentaire(self, user, contenu: str, saturation=None):
        """
        Ajoute un commentaire et historise le changement.

        Le champ persistant `saturation` reste piloté par `taux_saturation`
        (inscrits / places). Les valeurs de saturation portées par les
        commentaires restent consultables via `get_saturation_moyenne_commentaires()`
        mais ne redéfinissent plus la source de vérité de la formation.
        """
        from .commentaires import Commentaire

        if not contenu or not contenu.strip():
            raise ValidationError("Le commentaire ne peut pas être vide.")
        commentaire = Commentaire.objects.create(
            formation=self, contenu=contenu, saturation=saturation, created_by=user
        )
        last_comment = self.dernier_commentaire
        self.dernier_commentaire = contenu
        self.save(update_fields=["dernier_commentaire"], skip_history=True)
        HistoriqueFormation.objects.create(
            formation=self,
            champ_modifie="dernier_commentaire",
            ancienne_valeur=last_comment or "",
            nouvelle_valeur=contenu,
            commentaire=f"Commentaire ajouté par {user.get_full_name() or user.username}",
            created_by=user,
        )
        return commentaire

    def add_document(self, user, fichier, titre: str, type_document=None):
        """
        Ajoute un document lié à la formation et historise l'ajout.
        """
        from .documents import Document

        if not titre or not titre.strip():
            raise ValidationError("Le titre du document ne peut pas être vide.")
        if not fichier:
            raise ValidationError("Aucun fichier fourni.")
        titre = titre.strip()
        document = Document.objects.create(
            formation=self,
            fichier=fichier,
            nom_fichier=titre,
            type_document=type_document or Document.AUTRE,
            created_by=user,
        )
        HistoriqueFormation.objects.create(
            formation=self,
            champ_modifie="document",
            ancienne_valeur="—",
            nouvelle_valeur=titre,
            commentaire=f"Ajout du document « {titre} »",
            created_by=user,
        )
        return document

    def add_evenement(self, type_evenement, event_date, details=None, description_autre=None, user=None):
        """
        Ajoute un événement lié à la formation et met à jour l'historique.
        """
        from .evenements import Evenement

        if type_evenement == Evenement.TypeEvenement.AUTRE and not description_autre:
            raise ValidationError("Veuillez fournir une description pour un événement de type 'Autre'.")
        if isinstance(event_date, str):
            event_date = parse_date(event_date) or event_date
        evenement = Evenement.objects.create(
            formation=self,
            type_evenement=type_evenement,
            event_date=event_date,
            details=details,
            description_autre=description_autre if type_evenement == Evenement.TypeEvenement.AUTRE else None,
            created_by=user,
        )
        Formation.objects.filter(pk=self.pk).update(nombre_evenements=F("nombre_evenements") + 1)
        self.refresh_from_db(fields=["nombre_evenements"])
        event_date_str = event_date.strftime("%Y-%m-%d") if event_date else "Date non définie"
        type_display = (
            description_autre
            if type_evenement == Evenement.TypeEvenement.AUTRE
            else dict(Evenement.TypeEvenement.choices).get(type_evenement, type_evenement)
        )
        HistoriqueFormation.objects.create(
            formation=self,
            champ_modifie="evenement",
            nouvelle_valeur=f"{type_display} le {event_date_str}",
            commentaire="Ajout d'un événement",
            created_by=user,
        )
        return evenement

    def add_partenaire(self, partenaire, user=None) -> None:
        """
        Ajoute un partenaire à la formation et historise l'ajout.
        """
        if partenaire in self.partenaires.all():
            raise ValidationError(f"Le partenaire « {partenaire.nom} » est déjà lié à cette formation.")
        self.partenaires.add(partenaire)
        self.save(update_fields=[], skip_history=True)
        HistoriqueFormation.objects.create(
            formation=self,
            champ_modifie="partenaire",
            ancienne_valeur="—",
            nouvelle_valeur=partenaire.nom,
            commentaire=f"Ajout du partenaire « {partenaire.nom} »",
            created_by=user,
            action=HistoriqueFormation.ActionType.AJOUT,
        )

    # Accès aux contenus liés

    def get_partenaires(self):
        """
        Retourne le queryset des partenaires liés à la formation.
        """
        return self.partenaires.all()

    def get_commentaires(self, include_saturation=False, limit=None):
        """
        Retourne les commentaires liés à la formation, éventuellement filtrés par présence de saturation.
        """
        queryset = self.commentaires.select_related("created_by").order_by("-created_at")
        if include_saturation:
            queryset = queryset.filter(saturation__isnull=False)
        if limit is not None:
            return queryset[:limit]
        return queryset

    def get_evenements(self):
        """
        Retourne les événements liés à la formation classés par date décroissante.
        """
        return self.evenements.select_related("created_by").order_by("-event_date")

    def get_documents(self, est_public=None):
        """
        Retourne les documents liés, filtrés par est_public si précisé.
        """
        queryset = self.documents.select_related("created_by")
        if est_public is not None:
            queryset = queryset.filter(est_public=est_public)
        return queryset

    def get_prospections(self):
        """
        Retourne les prospections liées à la formation.
        """
        return self.prospections.all()

    def get_historique(self, limit=None):
        """
        Retourne l’historique des modifications.
        """
        queryset = self.historiques.select_related("created_by").order_by("-created_at")
        return queryset[:limit] if limit else queryset

    # Méthodes de calcul et de mise à jour

    def update_saturation_from_commentaires(self):
        """
        Méthode de compatibilité : réaligne `saturation` sur sa source de
        vérité, `taux_saturation`.

        Les saturations de commentaires restent disponibles via
        `get_saturation_moyenne_commentaires()`, mais ne pilotent plus le
        champ persistant de la formation.
        """
        target = self.taux_saturation
        if self.saturation != target:
            self.saturation = target
            self.save(update_fields=["saturation"])
            logger.info(f"[Formation] Saturation réalignée sur taux_saturation pour {self.nom}: {self.saturation}%")
            return True
        return False

    def get_saturation_moyenne_commentaires(self):
        """
        Retourne la moyenne des saturations des commentaires liés, ou None.
        """
        saturations = list(self.commentaires.filter(saturation__isnull=False).values_list("saturation", flat=True))
        return round(sum(saturations) / len(saturations), 2) if saturations else None

    def get_status_color(self):
        """
        Retourne la couleur CSS du statut associé (ou défaut).
        """
        return (
            self.statut.couleur
            if self.statut and self.statut.couleur
            else get_default_color(self.statut.nom if self.statut else "")
        )

    def duplicate(self, user=None, **kwargs):
        """
        Crée un duplicata de la formation avec possibilité de surcharger certains champs.
        """
        exclude_fields = [
            "id",
            "pk",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "dernier_commentaire",
            "nombre_candidats",
            "nombre_entretiens",
            "nombre_evenements",
        ]
        field_dict = {f.name: getattr(self, f.name) for f in self._meta.fields if f.name not in exclude_fields}
        field_dict.update(kwargs)
        if "nom" not in kwargs:
            field_dict["nom"] = f"{self.nom} (Copie)"
        new_formation = Formation.objects.create(**field_dict)
        new_formation.partenaires.set(self.partenaires.all())
        HistoriqueFormation.objects.create(
            formation=new_formation,
            champ_modifie="creation",
            nouvelle_valeur="Duplication",
            commentaire=f"Dupliqué depuis la formation #{self.pk}: {self.nom}",
            created_by=user,
            action=HistoriqueFormation.ActionType.AJOUT,
        )
        return new_formation

    def archiver(self, user=None, commentaire=None):
        """
        Passe la formation en mode archivée et historise le changement.
        """
        ancien_etat = self.activite
        if ancien_etat == Activite.ARCHIVEE:
            logger.info(f"[Formation] {self.nom} déjà archivée.")
            return self
        self.activite = Activite.ARCHIVEE
        self.save(update_fields=["activite"], user=user)
        HistoriqueFormation.objects.create(
            formation=self,
            champ_modifie="activite",
            ancienne_valeur=ancien_etat,
            nouvelle_valeur=self.activite,
            commentaire=commentaire or "Formation archivée",
            created_by=user,
            action=HistoriqueFormation.ActionType.SUPPRESSION,
        )
        logger.info(f"[Formation] Formation #{self.pk} archivée par {user or 'système'}.")
        return self

    def desarchiver(self, user=None, commentaire=None):
        """
        Restaure une formation archivée et historise le changement.
        """
        ancien_etat = self.activite
        if ancien_etat == Activite.ACTIVE:
            logger.info(f"[Formation] {self.nom} déjà active.")
            return self
        self.activite = Activite.ACTIVE
        self.save(update_fields=["activite"], user=user)
        HistoriqueFormation.objects.create(
            formation=self,
            champ_modifie="activite",
            ancienne_valeur=ancien_etat,
            nouvelle_valeur=self.activite,
            commentaire=commentaire or "Formation restaurée",
            created_by=user,
            action=HistoriqueFormation.ActionType.AJOUT,
        )
        logger.info(f"[Formation] Formation #{self.pk} restaurée par {user or 'système'}.")
        return self

    @classmethod
    def get_stats_par_mois(cls, annee=None):
        """
        Calcule, par mois d'une année, le nombre de formations et la somme des inscrits par mois.
        """
        annee = annee or timezone.localdate().year
        mois_labels = [
            "Janvier",
            "Février",
            "Mars",
            "Avril",
            "Mai",
            "Juin",
            "Juillet",
            "Août",
            "Septembre",
            "Octobre",
            "Novembre",
            "Décembre",
        ]
        result = {i + 1: {"label": mois_labels[i], "count": 0, "inscrits": 0} for i in range(12)}
        formations_par_mois = (
            cls.objects.filter(start_date__year=annee)
            .values("start_date__month")
            .annotate(count=Count("id"), inscrits=Sum(F("inscrits_crif") + F("inscrits_mp")))
        )
        for item in formations_par_mois:
            mois = item["start_date__month"]
            if mois in result:
                result[mois]["count"] = item["count"]
                result[mois]["inscrits"] = item["inscrits"] or 0
        return result

    def get_saturation_badge(self):
        """
        Retourne un badge front pour le niveau de saturation.
        """
        if self.saturation is None:
            return "—"
        if self.saturation < 50:
            return "🟢 Faible"
        elif self.saturation < 80:
            return "🟡 Moyenne"
        else:
            return "🔴 Saturée"

    class Meta:
        verbose_name = _("Formation")
        verbose_name_plural = _("Formations")
        ordering = ["-start_date", "nom"]
        indexes = [
            models.Index(fields=["start_date"], name="form_start_date_idx"),
            models.Index(fields=["end_date"], name="form_end_date_idx"),
            models.Index(fields=["nom"], name="form_nom_idx"),
            models.Index(fields=["statut"], name="form_statut_idx"),
            models.Index(fields=["type_offre"], name="form_type_offre_idx"),
            models.Index(fields=["convocation_envoie"], name="form_convoc_idx"),
            models.Index(fields=["centre"], name="form_centre_idx"),
            models.Index(fields=["start_date", "end_date"], name="form_dates_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(Q(start_date__isnull=True) | Q(end_date__isnull=True) | Q(start_date__lte=F("end_date"))),
                name="formation_dates_coherentes",
            )
        ]


class HistoriqueFormation(BaseModel):
    """
    Table de suivi des modifications des objets Formation.
    """

    ACTION_MAX_LENGTH = 100
    CHAMP_MAX_LENGTH = 100

    class ActionType(models.TextChoices):
        """
        Enumération typant les actions d'historique.
        """

        MODIFICATION = "modification", _("Modification")
        AJOUT = "ajout", _("Ajout")
        SUPPRESSION = "suppression", _("Suppression")
        COMMENTAIRE = "commentaire", _("Commentaire")
        DOCUMENT = "document", _("Document")
        EVENEMENT = "evenement", _("Événement")

    formation = models.ForeignKey(
        "Formation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="historiques",
        verbose_name=_("Formation concernée"),
        help_text="Formation liée (null si supprimée)",
    )
    action = models.CharField(
        max_length=ACTION_MAX_LENGTH,
        choices=ActionType.choices,
        default=ActionType.MODIFICATION,
        verbose_name=_("Type d'action"),
        help_text=_("Nature de l'action réalisée (ex : modification, ajout)"),
    )
    champ_modifie = models.CharField(
        max_length=CHAMP_MAX_LENGTH, verbose_name=_("Champ modifié"), help_text=_("Nom du champ ayant été modifié")
    )
    ancienne_valeur = models.TextField(
        null=True, blank=True, verbose_name=_("Ancienne valeur"), help_text=_("Valeur avant la modification")
    )
    nouvelle_valeur = models.TextField(
        null=True, blank=True, verbose_name=_("Nouvelle valeur"), help_text=_("Valeur après la modification")
    )
    commentaire = models.TextField(
        null=True,
        blank=True,
        verbose_name=_("Commentaire de modification"),
        help_text=_("Commentaire explicatif (facultatif)"),
    )
    details = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Détails supplémentaires"),
        help_text=_("Données contextuelles (ex : ID utilisateur, origine, etc.)"),
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("Historique de modification de formation")
        verbose_name_plural = _("Historiques de modifications de formations")
        indexes = [
            models.Index(fields=["-created_at"], name="hist_form_date_idx"),
            models.Index(fields=["formation"], name="hist_form_formation_idx"),
            models.Index(fields=["action"], name="hist_form_action_idx"),
            models.Index(fields=["champ_modifie"], name="hist_form_champ_idx"),
        ]

    def __str__(self):
        """
        Représentation texte synthétique pour un log d'historique.
        """
        return f"Modification de {self.champ_modifie} le {self.created_at.strftime('%d/%m/%Y à %H:%M')}"

    def save(self, *args, **kwargs):
        """
        Sauvegarde une instance d'historique avec contrôle d'intégrité et anti-doublon.
        """
        skip_duplicate_check = kwargs.pop("skip_duplicate_check", False)
        if self.formation_id is not None:
            FormationModel = apps.get_model("rap_app", "Formation")
            if not FormationModel.objects.filter(pk=self.formation_id).exists():
                self.formation = None

        if not skip_duplicate_check and not self.pk:
            time_threshold = kwargs.pop("time_threshold", timezone.timedelta(minutes=5))
            cutoff_time = timezone.now() - time_threshold
            recent_similar = HistoriqueFormation.objects.filter(
                formation=self.formation,
                champ_modifie=self.champ_modifie,
                created_by=self.created_by,
                nouvelle_valeur=self.nouvelle_valeur,
                created_at__gte=cutoff_time,
            ).exists()
            if recent_similar:
                logger.info(f"[Historique] Doublon ignoré: {self.champ_modifie} pour {self.formation}")
                return False

        with transaction.atomic():
            super().save(*args, **kwargs)

        logger.info(f"[Historique] {self}")
        return True

    def to_serializable_dict(self):
        """
        Retourne une version serializable du log d'historique.
        """
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat(),
            "utilisateur": str(self.created_by) if self.created_by else None,
            "champ": self.champ_modifie,
            "ancienne_valeur": self.ancienne_valeur,
            "nouvelle_valeur": self.nouvelle_valeur,
            "commentaire": self.commentaire,
            "saturation": self.details.get("saturation"),
            "saturation_badge": self.details.get("saturation_badge"),
            "taux_transformation": self.details.get("taux_transformation"),
            "transformation_badge": self.details.get("transformation_badge"),
        }

    @property
    def utilisateur_nom(self):
        """
        Retourne le nom complet du créateur de la modification.
        """
        u = self.created_by
        if u:
            return f"{u.first_name} {u.last_name}".strip() or u.username
        return "Inconnu"

    @property
    def valeur_changement(self):
        """
        Synthèse du changement sous forme de chaîne.
        """
        if self.ancienne_valeur and self.nouvelle_valeur:
            return f"{self.ancienne_valeur} → {self.nouvelle_valeur}"
        elif self.nouvelle_valeur:
            return f"Ajout: {self.nouvelle_valeur}"
        elif self.ancienne_valeur:
            return f"Suppression: {self.ancienne_valeur}"
        return "Aucun changement spécifié"

    @classmethod
    def get_latest_changes(cls, limit=10):
        """
        Retourne les derniers changements d'historique de formation, avec select_related utile.
        """
        return cls.objects.select_related("formation", "created_by").order_by("-created_at")[:limit]
