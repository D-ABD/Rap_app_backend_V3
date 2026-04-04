"""Signaux historiques autour des candidats et de la synchronisation compte.

Dans l'état actuel du projet, ce fichier sert surtout d'audit et de
traçabilité : plusieurs synchronisations métier ont été sorties des signals au
profit de services explicites. Les docstrings ci-dessous indiquent donc quand
un signal est réellement actif et quand il est seulement conservé pour
détection / compatibilité.
"""

import logging

from django.contrib.auth.hashers import make_password
from django.db import IntegrityError, transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils.crypto import get_random_string

from ..models.candidat import Candidat
from ..models.custom_user import CustomUser
from ..models.prospection import Prospection
from ..services.candidate_account_service import is_candidate_user_sync_deferred
from ..services.prospection_ownership_service import is_prospection_owner_sync_deferred
from ..utils.signals import signal_processing

logger = logging.getLogger(__name__)

# Définition des rôles considérés comme "candidats"
CANDIDATE_ROLES = {
    getattr(CustomUser, "ROLE_CANDIDAT", "candidat"),
    getattr(CustomUser, "ROLE_STAGIAIRE", "stagiaire"),
    getattr(CustomUser, "ROLE_CANDIDAT_USER", "candidatuser"),
}


# Helpers internes pour gestion des champs texte et de la génération d'identifiants uniques
def _nn(val: str | None) -> str:
    """Retourne une chaîne normalisée non nulle et sans espaces périphériques."""
    return (val or "").strip()


def _email_local(email: str | None) -> str:
    """Retourne la partie locale d'un email normalisé en minuscules."""
    e = _nn(email).lower()
    return e.split("@", 1)[0] if "@" in e else e


def _safe_non_blank(primary: str | None, *fallbacks: str, default: str = "Inconnu") -> str:
    """Retourne la première valeur non vide parmi plusieurs candidats."""
    for v in (primary, *fallbacks):
        v = _nn(v)
        if v:
            return v
    return default


def _build_unique_username(base: str) -> str:
    """Construit un username unique en suffixant si nécessaire."""
    base = _nn(base).lower().replace(" ", "").strip(".") or "user"
    username = base
    i = 1
    while CustomUser.objects.filter(username=username).exists():
        i += 1
        username = f"{base}{i}"
    return username


@receiver(pre_save, sender=CustomUser, dispatch_uid="rap_app.candidats_signals._remember_old_role")
def _remember_old_role(sender, instance: CustomUser, **kwargs):
    """
    Stocke l'ancien rôle sur l'instance avant sauvegarde.

    Ce helper sert uniquement aux handlers de transition autour des changements
    de rôle ; il ne porte pas de synchronisation métier en lui-même.
    """
    if not instance.pk:
        instance._old_role = None  # type: ignore[attr-defined]
    else:
        try:
            old = sender.objects.get(pk=instance.pk)
            instance._old_role = old.role  # type: ignore[attr-defined]
        except sender.DoesNotExist:
            instance._old_role = None  # type: ignore[attr-defined]


@receiver(post_save, sender=CustomUser, dispatch_uid="rap_app.candidats_signals.sync_candidat_for_user")
def sync_candidat_for_user(sender, instance: CustomUser, created: bool, **kwargs):
    """
    Handler conservé en mode `audit-only` pendant la Phase 4.

    Le code actuel ne synchronise plus `CustomUser` et `Candidat` :
    il journalise uniquement qu'un ancien point d'entrée signal a été touché,
    puis retourne immédiatement.

    La logique métier cible a été déplacée vers `CandidateAccountService`.
    """

    with signal_processing(instance) as can_run:
        if not can_run:
            return

        if is_candidate_user_sync_deferred():
            logger.debug("⏭️ Sync candidat différée par le service pour user #%s", instance.pk)
            return

        if getattr(instance, "_skip_candidate_sync", False):
            logger.debug("⏭️ Sync candidat ignoré (flag admin actif) pour user #%s", instance.pk)
            return

        if instance.is_superadmin() or instance.is_admin():
            logger.debug("⏭️ Sync candidat ignoré pour admin/superadmin user #%s", instance.pk)
            return

        logger.warning(
            "SIGNAL_EXECUTION_DETECTED: sync_candidat_for_user user_id=%s created=%s role=%s email=%s",
            getattr(instance, "pk", None),
            created,
            getattr(instance, "role", None),
            getattr(instance, "email", None),
        )

        # Legacy logic intentionally disabled during Phase 4.
        # Previous behavior:
        # - if role was a candidate role, reconcile an existing Candidat by email
        # - otherwise create a Candidat linked to the CustomUser
        # - on role change away from candidate roles, unlink candidat.compte_utilisateur
        # - use transaction.atomic() around reconciliation / creation paths
        return

@receiver(pre_save, sender=Prospection, dispatch_uid="rap_app.candidats_signals.sync_formation_from_owner")
def sync_formation_from_owner(sender, instance: Prospection, **kwargs):
    """
    Handler conservé en mode `audit-only` pendant la Phase 4.

    Le code actuel ne copie plus la formation depuis `owner.candidat_associe` :
    il journalise uniquement un warning de détection.

    La résolution métier explicite owner/formation/centre relève désormais de
    `ProspectionOwnershipService`.
    """
    if is_prospection_owner_sync_deferred():
        return

    logger.warning(
        "SIGNAL_EXECUTION_DETECTED: sync_formation_from_owner prospection_id=%s owner_id=%s formation_id=%s creating=%s",
        getattr(instance, "pk", None),
        getattr(instance, "owner_id", None),
        getattr(instance, "formation_id", None),
        getattr(instance._state, "adding", False),
    )

    # Legacy logic intentionally disabled during Phase 4.
    # Previous behavior:
    # - infer formation from owner.candidat_associe
    # - set prospection.formation_id on create
    # - refresh formation_id on owner change or when formation_id was empty
    return
