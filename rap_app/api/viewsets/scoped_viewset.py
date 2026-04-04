"""Base de viewset centre-scopé / owner-scopé."""

from __future__ import annotations

from typing import Literal

from django.db.models import Q, QuerySet

from ..roles import is_admin_like, is_centre_scoped_staff, staff_centre_ids
from .base import BaseApiViewSet

ScopeMode = Literal["none", "centre", "owner", "centre_or_owner"]


class ScopedModelViewSet(BaseApiViewSet):
    """
    Base de scoping réutilisable pour centraliser la visibilité par centre
    ou par ownership avec une stratégie deny-by-default.
    """

    scope_mode: ScopeMode = "none"
    centre_lookup_paths: tuple[str, ...] = ()
    owner_lookup_paths: tuple[str, ...] = ()

    def get_base_queryset(self) -> QuerySet:
        return super().get_queryset()

    def get_user_centre_ids(self) -> list[int] | None:
        user = getattr(self.request, "user", None)
        if not getattr(user, "is_authenticated", False):
            return []
        return staff_centre_ids(user)

    def build_centre_scope_q(self) -> Q | None:
        centre_ids = self.get_user_centre_ids()
        if centre_ids is None:
            return None
        if not centre_ids or not self.centre_lookup_paths:
            return Q(pk__in=[])

        parts = [Q(**{f"{path}__in": centre_ids}) for path in self.centre_lookup_paths]
        q = parts[0]
        for part in parts[1:]:
            q |= part
        return q

    def build_owner_scope_q(self) -> Q | None:
        user = getattr(self.request, "user", None)
        if not getattr(user, "is_authenticated", False):
            return Q(pk__in=[])
        if not self.owner_lookup_paths:
            return Q(pk__in=[])

        parts = [Q(**{path: user}) for path in self.owner_lookup_paths]
        q = parts[0]
        for part in parts[1:]:
            q |= part
        return q

    def apply_centre_scope(self, qs: QuerySet) -> QuerySet:
        user = getattr(self.request, "user", None)
        if is_admin_like(user):
            return qs
        if not is_centre_scoped_staff(user):
            return qs.none()

        centre_q = self.build_centre_scope_q()
        if centre_q is None:
            return qs
        return qs.filter(centre_q).distinct()

    def apply_owner_scope(self, qs: QuerySet) -> QuerySet:
        owner_q = self.build_owner_scope_q()
        if owner_q is None:
            return qs.none()
        return qs.filter(owner_q).distinct()

    def apply_centre_or_owner_scope(self, qs: QuerySet) -> QuerySet:
        user = getattr(self.request, "user", None)
        if is_admin_like(user):
            return qs

        q = Q()
        centre_q = self.build_centre_scope_q()
        owner_q = self.build_owner_scope_q()

        if is_centre_scoped_staff(user) and centre_q is not None:
            q |= centre_q
        if getattr(user, "is_authenticated", False) and owner_q is not None:
            q |= owner_q

        if not q.children:
            return qs.none()

        return qs.filter(q).distinct()

    def scope_queryset(self, qs: QuerySet) -> QuerySet:
        user = getattr(self.request, "user", None)
        if not getattr(user, "is_authenticated", False):
            return qs.none()

        if self.scope_mode == "none":
            return qs
        if self.scope_mode == "centre":
            return self.apply_centre_scope(qs)
        if self.scope_mode == "owner":
            return self.apply_owner_scope(qs)
        if self.scope_mode == "centre_or_owner":
            return self.apply_centre_or_owner_scope(qs)
        return qs.none()

    def get_queryset(self) -> QuerySet:
        return self.scope_queryset(self.get_base_queryset())
