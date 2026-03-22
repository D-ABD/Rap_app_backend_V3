from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from ..models.candidat import Candidat
from ..models.custom_user import CustomUser

_DEFER_CANDIDATE_USER_SYNC: ContextVar[bool] = ContextVar(
    "defer_candidate_user_sync",
    default=False,
)


@contextmanager
def defer_candidate_user_sync():
    token = _DEFER_CANDIDATE_USER_SYNC.set(True)
    try:
        yield
    finally:
        _DEFER_CANDIDATE_USER_SYNC.reset(token)


def is_candidate_user_sync_deferred() -> bool:
    return _DEFER_CANDIDATE_USER_SYNC.get()


class CandidateAccountService:
    """
    Centralise la gestion explicite des comptes utilisateurs liés aux candidats.

    Ce service est la source de vérité pour :
    - lier un utilisateur existant à un candidat
    - provisionner un compte candidat quand un email est disponible
    - promouvoir un candidat vers un compte stagiaire

    Toutes les méthodes publiques sont transactionnelles et utilisent
    `defer_candidate_user_sync()` pour éviter de réinjecter le signal
    d'observation pendant les écritures contrôlées.
    """

    @staticmethod
    def _global_error(message: str) -> ValidationError:
        return ValidationError({"non_field_errors": [message]})

    @classmethod
    @transaction.atomic
    def link_user_to_candidate(
        cls,
        user: CustomUser,
        candidate: Candidat,
        actor: CustomUser | None = None,
    ) -> CustomUser:
        """
        Lie explicitement un utilisateur existant à un candidat.

        Refuse :
        - si le candidat a déjà un autre compte lié
        - si l'utilisateur est déjà lié à un autre candidat
        """
        if candidate.compte_utilisateur_id:
            if candidate.compte_utilisateur_id == user.id:
                return user
            raise ValidationError({"compte_utilisateur": ["Ce candidat a déjà un compte utilisateur lié."]})

        linked_candidate = getattr(user, "candidat_associe", None)
        if linked_candidate and linked_candidate.pk != candidate.pk:
            raise ValidationError(
                {
                    "email": [
                        f"Cette adresse email est déjà utilisée par un autre candidat (pk={linked_candidate.pk})."
                    ]
                }
            )

        candidate.compte_utilisateur = user
        candidate.full_clean()
        candidate.save(user=actor, update_fields=["compte_utilisateur"])
        return user

    @classmethod
    @transaction.atomic
    def provision_candidate_account(
        cls,
        candidate: Candidat,
        actor: CustomUser | None = None,
    ) -> CustomUser:
        """
        Crée ou réutilise un compte utilisateur pour un candidat à partir
        de son email, puis le lie explicitement au candidat.
        """
        if candidate.compte_utilisateur_id:
            return candidate.compte_utilisateur

        email = (candidate.email or "").strip().lower()
        if not email:
            raise ValidationError({"email": ["Le candidat doit avoir une adresse email définie."]})

        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()

        if user:
            linked_candidate = getattr(user, "candidat_associe", None)
            if linked_candidate and linked_candidate.pk != candidate.pk:
                raise ValidationError(
                    {
                        "email": [
                            f"Cette adresse email est déjà utilisée par un autre candidat (pk={linked_candidate.pk})."
                        ]
                    }
                )
            return cls.link_user_to_candidate(user=user, candidate=candidate, actor=actor)

        username_base = (candidate.prenom or "").strip() or (candidate.nom or "").strip() or email.split("@")[0]
        username = cls._build_unique_username(username_base)

        with defer_candidate_user_sync():
            user = User(
                email=email,
                username=username,
                first_name=(candidate.prenom or "").strip(),
                last_name=(candidate.nom or "").strip(),
                role=CustomUser.ROLE_CANDIDAT_USER,
            )
            user.set_unusable_password()
            user.save(_skip_candidate_sync=True)

        return cls.link_user_to_candidate(user=user, candidate=candidate, actor=actor)

    @classmethod
    @transaction.atomic
    def promote_to_stagiaire(
        cls,
        candidate: Candidat,
        actor: CustomUser | None = None,
    ) -> CustomUser:
        """
        Garantit qu'un candidat admissible possède un compte puis bascule ce
        compte vers le rôle `stagiaire`.
        """
        if not candidate.admissible:
            raise cls._global_error("Ce candidat n'est pas admissible.")

        user = candidate.compte_utilisateur or cls.provision_candidate_account(candidate, actor=actor)

        if user.role != CustomUser.ROLE_STAGIAIRE:
            with defer_candidate_user_sync():
                user.role = CustomUser.ROLE_STAGIAIRE
                user.save(_skip_candidate_sync=True)

        if candidate.compte_utilisateur_id != user.id:
            cls.link_user_to_candidate(user=user, candidate=candidate, actor=actor)

        return user

    @classmethod
    @transaction.atomic
    def ensure_candidate_user(
        cls,
        candidate: Candidat,
        actor: CustomUser | None = None,
    ) -> CustomUser:
        """
        Garantit qu'un candidat possède un compte au rôle `candidatuser`.

        Cette méthode est la bonne source de vérité pour les usages "créer ou
        lier un compte candidat" côté staff : le candidat conserve ce rôle tant
        qu'il n'est pas effectivement entré en formation.
        """
        user = candidate.compte_utilisateur or cls.provision_candidate_account(candidate, actor=actor)

        if user.role != CustomUser.ROLE_CANDIDAT_USER:
            with defer_candidate_user_sync():
                user.role = CustomUser.ROLE_CANDIDAT_USER
                user.save(_skip_candidate_sync=True)

        if candidate.compte_utilisateur_id != user.id:
            cls.link_user_to_candidate(user=user, candidate=candidate, actor=actor)

        return user

    @classmethod
    @transaction.atomic
    def revert_to_candidate_user(
        cls,
        candidate: Candidat,
        actor: CustomUser | None = None,
    ) -> CustomUser | None:
        """
        Ramène un compte stagiaire lié vers le rôle `candidatuser`.

        Utilisé quand une sortie de formation ou un abandon retire l'état
        `stagiaire` sans casser le lien entre le compte et le candidat.
        """
        user = candidate.compte_utilisateur
        if not user:
            return None

        if user.role != CustomUser.ROLE_CANDIDAT_USER:
            with defer_candidate_user_sync():
                user.role = CustomUser.ROLE_CANDIDAT_USER
                user.save(_skip_candidate_sync=True)

        if candidate.compte_utilisateur_id != user.id:
            cls.link_user_to_candidate(user=user, candidate=candidate, actor=actor)

        return user

    @classmethod
    @transaction.atomic
    def request_account(
        cls,
        candidate: Candidat,
        requester: CustomUser,
    ) -> Candidat:
        """
        Place une demande de compte en attente pour un candidat.
        """
        if candidate.compte_utilisateur_id and candidate.compte_utilisateur_id != requester.id:
            raise cls._global_error("Un compte utilisateur est déjà lié à ce candidat.")

        if candidate.demande_compte_statut == candidate.DemandeCompteStatut.EN_ATTENTE:
            raise cls._global_error("Une demande de compte est déjà en attente.")

        candidate.demande_compte_statut = candidate.DemandeCompteStatut.EN_ATTENTE
        candidate.demande_compte_date = timezone.now()
        candidate.demande_compte_traitee_par = None
        candidate.demande_compte_traitee_le = None
        candidate.save(
            user=requester,
            update_fields=[
                "demande_compte_statut",
                "demande_compte_date",
                "demande_compte_traitee_par",
                "demande_compte_traitee_le",
            ],
        )
        return candidate

    @classmethod
    @transaction.atomic
    def approve_account_request(
        cls,
        candidate: Candidat,
        actor: CustomUser,
    ) -> CustomUser:
        """
        Approuve une demande de compte en attente puis crée ou lie le compte.
        """
        if candidate.demande_compte_statut != Candidat.DemandeCompteStatut.EN_ATTENTE:
            raise cls._global_error("Aucune demande de compte en attente pour ce candidat.")
        if candidate.compte_utilisateur_id:
            raise cls._global_error("Un compte utilisateur est déjà lié à ce candidat.")

        user = cls.provision_candidate_account(candidate, actor=actor)
        candidate.demande_compte_statut = Candidat.DemandeCompteStatut.ACCEPTEE
        candidate.demande_compte_traitee_par = actor
        candidate.demande_compte_traitee_le = timezone.now()
        candidate.save(
            user=actor,
            update_fields=[
                "demande_compte_statut",
                "demande_compte_traitee_par",
                "demande_compte_traitee_le",
            ],
        )
        return user

    @classmethod
    @transaction.atomic
    def reject_account_request(
        cls,
        candidate: Candidat,
        actor: CustomUser,
    ) -> Candidat:
        """
        Refuse une demande de compte en attente.
        """
        if candidate.demande_compte_statut != Candidat.DemandeCompteStatut.EN_ATTENTE:
            raise cls._global_error("Aucune demande de compte en attente pour ce candidat.")

        candidate.demande_compte_statut = Candidat.DemandeCompteStatut.REFUSEE
        candidate.demande_compte_traitee_par = actor
        candidate.demande_compte_traitee_le = timezone.now()
        candidate.save(
            user=actor,
            update_fields=[
                "demande_compte_statut",
                "demande_compte_traitee_par",
                "demande_compte_traitee_le",
            ],
        )
        return candidate

    @staticmethod
    def _build_unique_username(base: str) -> str:
        base = (base or "").strip().lower().replace(" ", "").strip(".") or "user"
        username = base
        index = 1
        while CustomUser.objects.filter(username=username).exists():
            index += 1
            username = f"{base}{index}"
        return username
