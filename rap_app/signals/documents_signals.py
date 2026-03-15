"""
Signal post_delete pour le modèle Document.
Log l'action utilisateur et supprime le fichier associé après validation de la transaction.
"""

import logging
import sys

from django.apps import apps
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from ..models.documents import Document
from ..models.logs import LogUtilisateur

logger = logging.getLogger("rap_app.documents")


@receiver(post_delete, sender=Document, dispatch_uid="rap_app.documents.log_and_cleanup_document")
def log_and_cleanup_document(sender, instance, **kwargs):
    """
    Après suppression d'une instance Document :
    - Enregistre un log de suppression.
    - Supprime le fichier associé dans le stockage après la transaction.
    """
    if not apps.ready or "migrate" in sys.argv or "makemigrations" in sys.argv:
        return

    user = kwargs.get("user") or getattr(instance, "modified_by", None) or getattr(instance, "created_by", None)

    nom_fichier = getattr(instance, "nom_fichier", "Document inconnu")
    document_id = getattr(instance, "pk", "?")
    formation_id = getattr(instance, "formation_id", None)

    try:
        LogUtilisateur.log_action(
            instance=instance,
            action="suppression",
            user=user,
            details=f"Suppression du document : {nom_fichier} (formation #{formation_id})",
        )
        logger.info(f"[Signal] Log utilisateur enregistré pour la suppression du document #{document_id}")
    except Exception as e:
        logger.warning(f"Erreur lors du log de suppression du document #{document_id} : {e}")

    if instance.fichier and instance.fichier.name:
        file_path = instance.fichier.name

        def _delete_file_after_commit():
            """
            Supprime le fichier associé après validation de la transaction.
            """
            try:
                if default_storage.exists(file_path):
                    default_storage.delete(file_path)
                    logger.info(f"[Signal] Fichier supprimé physiquement : {file_path}")
                else:
                    logger.warning(f"[Signal] Fichier introuvable, pas de suppression : {file_path}")
            except Exception as e:
                logger.error(
                    f"Erreur lors de la suppression physique du fichier {file_path} : {e}",
                    exc_info=True,
                )

        transaction.on_commit(_delete_file_after_commit)
    else:
        logger.warning(f"[Signal] Aucun fichier à supprimer pour document #{document_id}")
