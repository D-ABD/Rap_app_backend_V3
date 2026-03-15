# rap_app/models/cvtheque.py

import os
import logging
from django.db import models, transaction
from django.core.validators import FileExtensionValidator
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.core.exceptions import ValidationError
from .base import BaseModel

logger = logging.getLogger(__name__)

def cv_upload_path(instance, filename):
    """
    Renvoie le chemin de stockage du fichier CV téléversé par le candidat.
    """
    base_name, ext = os.path.splitext(filename)
    safe_name = f"cv_{instance.candidat.id}_{base_name[:50]}{ext}".replace(' ', '_')
    path = f'cvtheque/candidat_{instance.candidat.id}/{safe_name}'
    logger.debug(f"Génération du chemin de stockage : {path}")
    return path

class CVTheque(BaseModel):
    """
    Modèle pour la gestion documentaire des candidats (CV, lettre de motivation, diplôme, etc).
    """

    DOCUMENT_TYPES = [
        ('CV', 'Curriculum Vitae'),
        ('LM', 'Lettre de motivation'),
        ('DIPLOME', 'Diplôme/Certificat'),
        ('AUTRE', 'Autre document'),
    ]

    candidat = models.ForeignKey(
        'Candidat',
        on_delete=models.CASCADE,
        related_name='cvs',
        verbose_name=_("Candidat")
    )
    document_type = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPES,
        default='CV',
        verbose_name=_("Type de document")
    )
    fichier = models.FileField(
        upload_to=cv_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx'])],
        verbose_name=_("Fichier"),
        help_text=_("Formats acceptés : PDF, DOC, DOCX (max. 5Mo)")
    )
    titre = models.CharField(
        max_length=255,
        verbose_name=_("Titre du document"),
        help_text=_("Ex: CV 2023, Lettre de motivation pour poste X")
    )
    date_depot = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Date de dépôt")
    )
    est_public = models.BooleanField(
        default=False,
        verbose_name=_("Visible par les recruteurs"),
        help_text=_("Ce document peut-il être visible par les recruteurs ?")
    )
    mots_cles = models.TextField(
        blank=True,
        verbose_name=_("Mots-clés"),
        help_text=_("Mots-clés pour la recherche (séparés par des virgules)")
    )
    consentement_stockage_cv = models.BooleanField(
        default=False,
        help_text="Le candidat accepte que son CV soit stocké dans la CVThèque."
    )
    consentement_transmission_cv = models.BooleanField(
        default=False,
        help_text="Le candidat accepte que son CV soit transmis à un employeur."
    )
    date_consentement_cv = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date du consentement donné ou retiré."
    )

    class Meta:
        verbose_name = _("CVthèque")
        verbose_name_plural = _("CVthèque")
        ordering = ['-date_depot']
        constraints = [
            models.UniqueConstraint(
                fields=['candidat', 'titre'],
                name='unique_cv_per_candidat'
            )
        ]

    def __str__(self):
        """
        Retourne une représentation lisible du document.
        """
        try:
            dt = self.date_depot.date() if self.date_depot else ""
        except Exception:
            dt = ""
        return f"{self.get_document_type_display()} - {self.candidat} ({dt})"

    @property
    def extension(self):
        """
        Retourne l’extension du fichier associé (ex : 'pdf').
        """
        ext = ""
        try:
            ext = os.path.splitext(self.fichier.name)[1][1:].lower()
        except Exception:
            logger.warning(f"Impossible de déterminer l'extension pour le document {self.pk}")
        logger.debug(f"Extension détectée pour le document {self.pk}: {ext}")
        return ext

    @property
    def taille(self):
        """
        Retourne la taille lisible du fichier associé.
        """
        if not self.fichier:
            logger.warning(f"Document {self.pk} sans fichier attaché")
            return "0 KB"
        try:
            size = self.fichier.size
            if size < 1024 * 1024:
                return f"{size / 1024:.1f} KB"
            return f"{size / (1024 * 1024):.1f} MB"
        except Exception as e:
            logger.error(f"Erreur lors du calcul de la taille pour le document {self.pk}: {str(e)}")
            return "Taille inconnue"

    def get_absolute_url(self):
        """
        Retourne l'URL vers le détail du document.
        """
        url = reverse('cvtheque:detail', kwargs={'pk': self.pk})
        logger.debug(f"URL absolue générée pour le document {self.pk}: {url}")
        return url

    def clean(self):
        """
        Valide le titre et la taille du fichier avant la sauvegarde.
        """
        super().clean()
        logger.info(f"Début du nettoyage pour le document {self.pk or 'nouveau'}")

        if not self.titre or not self.titre.strip():
            logger.error("Tentative de sauvegarde sans titre")
            raise ValidationError({"titre": _("Le titre du document est obligatoire.")})

        if self.fichier and hasattr(self.fichier, 'size'):
            max_size = 5 * 1024 * 1024
            if self.fichier.size > max_size:
                logger.warning(
                    f"Fichier trop volumineux ({self.fichier.size} bytes) pour le document {self.pk or 'nouveau'}"
                )
                raise ValidationError({
                    "fichier": _("Le fichier ne doit pas dépasser 5 Mo.")
                })
        logger.info(f"Nettoyage terminé pour le document {self.pk or 'nouveau'}")

    def save(self, *args, **kwargs):
        """
        Sauvegarde l'objet dans une transaction. Émet un signal en cas de création.
        """
        skip_clean = kwargs.pop("skip_clean", False)
        with transaction.atomic():
            is_new = self._state.adding
            if not skip_clean:
                self.clean()
            try:
                logger.info(f"Début de la sauvegarde du document {self.pk or 'nouveau'}")
                super().save(*args, **kwargs)
                if is_new:
                    logger.info(f"Nouveau document créé: {self} (ID: {self.pk})")
                    try:
                        from ..signals import document_created
                        document_created.send(sender=self.__class__, instance=self)
                    except ImportError:
                        logger.debug("Signal document_created non importé (aucun audit branché)")
                else:
                    logger.debug(f"Document mis à jour: {self.pk}")
            except Exception as e:
                logger.error(f"Erreur lors de la sauvegarde du document: {str(e)}", exc_info=True)
                raise
            logger.info(f"Sauvegarde terminée pour le document {self.pk}")

    def delete(self, *args, **kwargs):
        """
        Supprime le document et le fichier associé du disque.
        """
        file_path = self.fichier.path if self.fichier else None
        try:
            logger.info(f"Début de la suppression du document {self.pk}")
            super().delete(*args, **kwargs)
            logger.info(f"Document supprimé: {self.pk}")
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    logger.debug(f"Fichier physique supprimé: {file_path}")
                except OSError as e:
                    logger.error(f"Erreur lors de la suppression du fichier {file_path}: {str(e)}")
        except Exception as e:
            logger.error(f"Erreur lors de la suppression du document {self.pk}: {str(e)}", exc_info=True)
            raise

    @property
    def candidat_ville(self):
        """
        Retourne la ville du candidat associé si disponible.
        """
        if hasattr(self, '_candidat_cache'):
            return self._candidat_cache.ville
        if hasattr(self.candidat, 'ville'):
            return self.candidat.ville
        return None

    @property
    def candidat_type_contrat(self):
        """
        Retourne le type de contrat du candidat associé.
        """
        if hasattr(self, '_candidat_cache'):
            return self._candidat_cache.type_contrat
        return self.candidat.type_contrat

    @property
    def candidat_type_contrat_display(self):
        """
        Retourne le libellé du type de contrat du candidat.
        """
        if hasattr(self, '_candidat_cache'):
            if hasattr(self._candidat_cache, 'get_type_contrat_display'):
                return self._candidat_cache.get_type_contrat_display()
        if self.candidat.type_contrat:
            return self.candidat.get_type_contrat_display()
        return None

    @property
    def candidat_cv_statut(self):
        """
        Retourne le statut du CV principal du candidat.
        """
        if hasattr(self, '_candidat_cache'):
            return self._candidat_cache.cv_statut
        return self.candidat.cv_statut

    @property
    def candidat_cv_statut_display(self):
        """
        Retourne le libellé du statut du CV du candidat.
        """
        if hasattr(self, '_candidat_cache'):
            if hasattr(self._candidat_cache, 'get_cv_statut_display'):
                return self._candidat_cache.get_cv_statut_display()
        if self.candidat.cv_statut:
            return self.candidat.get_cv_statut_display()
        return None

    @property
    def formation(self):
        """
        Retourne l'objet Formation du candidat si disponible.
        """
        candidat_obj = getattr(self, '_candidat_cache', self.candidat)
        if hasattr(candidat_obj, 'formation'):
            return candidat_obj.formation
        return None

    @property
    def formation_nom(self):
        """
        Retourne le nom de la formation du candidat.
        """
        formation_obj = self.formation
        return getattr(formation_obj, "nom", None)

    @property
    def formation_num_offre(self):
        """
        Retourne le numéro d'offre de la formation du candidat.
        """
        formation_obj = self.formation
        return getattr(formation_obj, "num_offre", None)

    @property
    def formation_type_offre(self):
        """
        Retourne le nom du type d'offre lié à la formation.
        """
        formation_obj = self.formation
        if formation_obj and hasattr(formation_obj, 'type_offre'):
            return getattr(formation_obj.type_offre, "nom", None)
        return None

    @property
    def formation_statut(self):
        """
        Retourne le statut de la formation.
        """
        formation_obj = self.formation
        if formation_obj and hasattr(formation_obj, 'statut'):
            return getattr(formation_obj.statut, "nom", None)
        return None

    @property
    def formation_centre(self):
        """
        Retourne le nom du centre associé à la formation du candidat.
        """
        formation_obj = self.formation
        if formation_obj and hasattr(formation_obj, 'centre'):
            return getattr(formation_obj.centre, "nom", None)
        return None

    @property
    def formation_start_date(self):
        """
        Retourne la date de début de la formation.
        """
        formation_obj = self.formation
        return getattr(formation_obj, "start_date", None)

    @property
    def formation_end_date(self):
        """
        Retourne la date de fin de la formation.
        """
        formation_obj = self.formation
        return getattr(formation_obj, "end_date", None)

    @property
    def formation_resume(self):
        """
        Retourne le résumé de la formation si disponible.
        """
        f = self.formation
        if not f or not hasattr(f, 'get_formation_identite_complete'):
            return None
        return f.get_formation_identite_complete()
