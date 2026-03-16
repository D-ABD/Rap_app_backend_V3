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
    return (val or "").strip()


def _email_local(email: str | None) -> str:
    e = _nn(email).lower()
    return e.split("@", 1)[0] if "@" in e else e


def _safe_non_blank(primary: str | None, *fallbacks: str, default: str = "Inconnu") -> str:
    for v in (primary, *fallbacks):
        v = _nn(v)
        if v:
            return v
    return default


def _build_unique_username(base: str) -> str:
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
    Stocke l'ancien rôle du CustomUser dans _old_role avant sauvegarde.
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
    Maintient la cohérence entre CustomUser et Candidat selon le rôle de l'utilisateur.
    Lie ou dissocie un Candidat en fonction du rôle actuel.
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

        role = (instance.role or "").strip().lower()

        if role in CANDIDATE_ROLES:
            if Candidat.objects.filter(compte_utilisateur=instance).exists():
                return

        email = (instance.email or "").lower()
        local = _email_local(email)
        safe_nom = _safe_non_blank(instance.last_name, instance.username, local)
        safe_prenom = _safe_non_blank(instance.first_name)

        if email:
            # Si un candidat existe déjà et est déjà lié à un utilisateur (différent), on n'intervient pas.
            if Candidat.objects.filter(email__iexact=email, compte_utilisateur__isnull=False).exists():
                logger.warning(
                    "⚠️ Candidat déjà lié à un utilisateur avec email %s, pas de création pour User #%s",
                    email,
                    instance.pk,
                )
                return

            try:
                with transaction.atomic():
                    cand = (
                        Candidat.objects.select_for_update(skip_locked=True)
                        .filter(compte_utilisateur__isnull=True, email__iexact=email)
                        .order_by("id")
                        .first()
                    )
                    if cand:
                        cand.nom = cand.nom or safe_nom
                        cand.prenom = cand.prenom or safe_prenom
                        cand.compte_utilisateur = instance
                        cand.save(update_fields=["compte_utilisateur", "nom", "prenom"])
                        logger.info("🔗 Réconciliation Candidat #%s ↔ User #%s", cand.pk, instance.pk)
                        return
            except IntegrityError as e:
                logger.warning("⚠️ Conflit réconciliation User->Candidat (email=%s): %s", email, e)
                return  # Ajout : sortir en cas d'erreur pour éviter la création

        # Envelopper la création dans une transaction pour rollback si échec
        try:
            with transaction.atomic():
                Candidat.objects.get_or_create(
                    compte_utilisateur=instance,
                    defaults={"nom": safe_nom, "prenom": safe_prenom, "email": email or None},
                )
                logger.info("➕ Candidat créé pour User #%s (role=%s)", instance.pk, role)
        except IntegrityError as e:
            logger.error("❌ Erreur création Candidat pour User #%s : %s", instance.pk, e)
            # Rollback automatique via atomic()

        return

    cand = getattr(instance, "candidat_associe", None)
    if cand:
        cand._unlinking_from_user_sync = True  # type: ignore[attr-defined]
        try:
            cand.compte_utilisateur = None
            cand.save(update_fields=["compte_utilisateur"])
            logger.info("🚫 Lien Candidat #%s ↔ User #%s supprimé (role=%s)", cand.pk, instance.pk, role)
        finally:
            if getattr(cand, "_unlinking_from_user_sync", False):
                delattr(cand, "_unlinking_from_user_sync")

@receiver(pre_save, sender=Prospection, dispatch_uid="rap_app.candidats_signals.sync_formation_from_owner")
def sync_formation_from_owner(sender, instance: Prospection, **kwargs):
    """
    Copie l'identifiant de formation du candidat associé à l'owner vers la prospection, selon le contexte.
    """
    if is_prospection_owner_sync_deferred():
        return

    owner = getattr(instance, "owner", None)
    if not owner:
        return
    cand = getattr(owner, "candidat_associe", None) or getattr(owner, "candidat", None)
    f_id = getattr(cand, "formation_id", None)
    if not f_id:
        return

    if instance._state.adding:
        instance.formation_id = f_id
        return

    try:
        old = Prospection.objects.only("owner_id", "formation_id").get(pk=instance.pk)
    except Prospection.DoesNotExist:
        instance.formation_id = f_id
        return

    if old.owner_id != getattr(instance, "owner_id", None) or not getattr(instance, "formation_id", None):
        instance.formation_id = f_id
