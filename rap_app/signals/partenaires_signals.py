import logging
import sys
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.db import transaction
from django.core.mail import send_mail
from django.conf import settings
from django.apps import apps

from ..models.logs import LogUtilisateur
from ..models.partenaires import Partenaire
from ..models.formations import HistoriqueFormation

logger = logging.getLogger("application.partenaires")


def skip_during_migrations():
    """
    Retourne True si l'application est en migration.
    """
    return not apps.ready or 'migrate' in sys.argv or 'makemigrations' in sys.argv


@receiver(pre_save, sender=Partenaire, dispatch_uid="rap_app.partenaires_signals.partenaire_pre_save")
def partenaire_pre_save(sender, instance, **kwargs):
    """
    Nettoie certaines valeurs du Partenaire avant sauvegarde :
    - Noms (ENTREPRISE) en majuscules.
    - Email en minuscules, espaces retirés.
    - Ajout de 'https://' aux URLs si manquant.
    """
    if skip_during_migrations():
        return

    try:
        if instance.type == Partenaire.TYPE_ENTREPRISE and instance.nom:
            if not instance.nom.isupper() and not instance.nom.istitle():
                instance.nom = instance.nom.upper()
                logger.debug(f"Nom d'entreprise normalisé : {instance.nom}")
    except (AttributeError, TypeError) as e:
        logger.warning(f"Erreur lors de la normalisation du nom : {e}")

    try:
        if instance.contact_email:
            instance.contact_email = instance.contact_email.lower().strip()
    except AttributeError:
        pass

    for field in ['website', 'social_network_url']:
        try:
            value = getattr(instance, field, None)
            if value and isinstance(value, str) and not value.startswith(('http://', 'https://')):
                setattr(instance, field, f"https://{value}")
                logger.debug(f"URL corrigée pour {field} : {getattr(instance, field)}")
        except (AttributeError, TypeError) as e:
            logger.warning(f"Erreur lors de la correction de l'URL pour {field} : {e}")


@receiver(post_save, sender=Partenaire, dispatch_uid="rap_app.partenaires_signals.partenaire_post_save")
def partenaire_post_save(sender, instance, created, **kwargs):
    """
    Log l'action utilisateur liée à la création ou modification d'un Partenaire.
    Met à jour l'historique des formations liées si modification.
    Envoie une notification email si création d'une entreprise.
    """
    if skip_during_migrations():
        return

    user = getattr(instance, '_user', None)
    action = LogUtilisateur.ACTION_CREATE if created else LogUtilisateur.ACTION_UPDATE

    try:
        LogUtilisateur.log_action(
            instance=instance,
            action=action,
            user=user,
            details=f"{action.capitalize()} du partenaire {instance.nom} (type: {instance.get_type_display()})"
        )
        logger.info(f"[Signal] Log enregistré pour {action} du partenaire {instance.nom} (ID: {instance.pk})")
    except Exception as e:
        logger.error(f"[Signal] Erreur lors du log du partenaire {instance.nom} : {e}", exc_info=True)

    if not created:
        try:
            formations_liees = instance.formations.all()
            if formations_liees.exists():
                with transaction.atomic():
                    for formation in formations_liees:
                        HistoriqueFormation.objects.create(
                            formation=formation,
                            champ_modifie="partenaire",
                            ancienne_valeur="",
                            nouvelle_valeur=instance.nom,
                            commentaire=f"Partenaire {instance.nom} modifié",
                            created_by=user
                        )
                        logger.debug(f"[Signal] Historique mis à jour pour formation {formation.pk}")
        except Exception as e:
            logger.error(f"[Signal] Erreur lors de la mise à jour des formations liées : {e}", exc_info=True)

    if created and hasattr(instance, 'type') and instance.type == Partenaire.TYPE_ENTREPRISE:
        try:
            admin_email = getattr(settings, 'ADMIN_EMAIL', None)
            url = instance.get_absolute_url() if hasattr(instance, 'get_absolute_url') else ''
            full_url = f"{settings.BASE_URL}{url}" if hasattr(settings, 'BASE_URL') else url

            if admin_email:
                send_mail(
                    subject=f"Nouveau partenaire entreprise : {instance.nom}",
                    message=(
                        f"Un nouveau partenaire entreprise a été créé :\n\n"
                        f"Nom : {instance.nom}\n"
                        f"Secteur : {instance.secteur_activite or 'Non spécifié'}\n"
                        f"Contact : {instance.contact_info if hasattr(instance, 'contact_info') else 'Non spécifié'}\n\n"
                        f"Lien : {full_url}"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[admin_email],
                    fail_silently=True,
                )
                logger.info(f"[Signal] Notification envoyée pour nouveau partenaire entreprise : {instance.nom}")
        except Exception as e:
            logger.error(f"[Signal] Erreur lors de l'envoi du mail : {e}", exc_info=True)


@receiver(post_delete, sender=Partenaire, dispatch_uid="rap_app.partenaires_signals.partenaire_post_delete")
def partenaire_post_delete(sender, instance, **kwargs):
    """
    Log la suppression d'un Partenaire.
    """
    if skip_during_migrations():
        return

    try:
        partenaire_id = getattr(instance, 'pk', 'Unknown')
        partenaire_nom = getattr(instance, 'nom', 'Unknown')
        partenaire_type = getattr(instance, 'get_type_display', lambda: 'Unknown')()
        user = getattr(instance, '_user', None)
    except Exception as e:
        logger.error(f"[Signal] Erreur lors de la récupération des informations du partenaire supprimé : {e}", exc_info=True)
        partenaire_id = "Unknown"
        partenaire_nom = "Unknown"
        partenaire_type = "Unknown"
        user = None

    try:
        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_DELETE,
            user=user,
            details=f"Suppression du partenaire {partenaire_nom} (type: {partenaire_type})"
        )
        logger.warning(f"[Signal] Partenaire supprimé : {partenaire_nom} (ID: {partenaire_id})")
    except Exception as e:
        logger.error(f"[Signal] Erreur lors du log de suppression du partenaire : {e}", exc_info=True)