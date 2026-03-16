from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction

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
    """

    @classmethod
    @transaction.atomic
    def link_user_to_candidate(
        cls,
        user: CustomUser,
        candidate: Candidat,
        actor: CustomUser | None = None,
    ) -> CustomUser:
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
        if not candidate.admissible:
            raise ValidationError({"detail": "Ce candidat n'est pas admissible."})

        user = candidate.compte_utilisateur or cls.provision_candidate_account(candidate, actor=actor)

        if user.role != CustomUser.ROLE_STAGIAIRE:
            with defer_candidate_user_sync():
                user.role = CustomUser.ROLE_STAGIAIRE
                user.save(_skip_candidate_sync=True)

        if candidate.compte_utilisateur_id != user.id:
            cls.link_user_to_candidate(user=user, candidate=candidate, actor=actor)

        return user

    @staticmethod
    def _build_unique_username(base: str) -> str:
        base = (base or "").strip().lower().replace(" ", "").strip(".") or "user"
        username = base
        index = 1
        while CustomUser.objects.filter(username=username).exists():
            index += 1
            username = f"{base}{index}"
        return username
