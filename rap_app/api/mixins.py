from typing import Any, Mapping, Optional, Tuple

from django.db.models import Q, QuerySet
from rest_framework import status
from rest_framework.response import Response

from .roles import get_staff_centre_ids_cached


class FieldMaskingMixin:
    """
    Mixin DRF pour masquer des champs sensibles dans `to_representation`.

    Les serializers peuvent surcharger `masked_fields_for_non_staff`,
    `masked_fields_for_non_owner` et `owner_attr` si nécessaire.

    Hypothèses :
    - le `request.user` est fourni dans `serializer.context`
    - la notion de "propriétaire" repose sur `owner_attr`
    - le masquage est purement de présentation et ne remplace pas une
      permission d'accès ou un scoping queryset
    """

    masked_fields_for_non_staff: Tuple[str, ...] = ()
    masked_fields_for_non_owner: Tuple[str, ...] = ()
    owner_attr: str = "compte_utilisateur_id"

    def _get_request_user(self):
        request = getattr(self, "context", {}).get("request")
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            return user
        return None

    def _is_staff_like(self, user) -> bool:
        if not user:
            return False
        return bool(getattr(user, "is_superuser", False) or getattr(user, "role", "") in {"staff", "staff_read", "admin", "superadmin"})

    def _is_owner(self, instance, user) -> bool:
        if not user:
            return False
        owner_id = getattr(instance, self.owner_attr, None)
        return owner_id == getattr(user, "id", None)

    def to_representation(self, instance):
        data = super().to_representation(instance)

        user = self._get_request_user()

        if not self._is_staff_like(user):
            for field in self.masked_fields_for_non_staff:
                data.pop(field, None)

        if not self._is_owner(instance, user):
            for field in self.masked_fields_for_non_owner:
                data.pop(field, None)

        return data


class StaffCentresScopeMixin:
    """
    Mixin historique de scoping par centres/départements pour les profils
    staff.

    Il reste utile pour certains modules spécialisés, mais la brique commune
    à privilégier pour les nouveaux viewsets est `ScopedModelViewSet`.
    """

    centre_lookups: Tuple[str, ...] = ("centre_id",)
    departement_lookups: Tuple[str, ...] = ("centre__code_postal",)
    departement_code_len: int = 2

    staff_centres_attr: str = "centres"
    staff_departements_attrs: Tuple[str, ...] = ("departements_codes", "departements")

    def _is_admin_like(self, u) -> bool:
        """
        Retourne True si l'utilisateur est admin ou superuser.
        """
        return bool(
            getattr(u, "is_superuser", False) or (hasattr(u, "is_admin") and callable(u.is_admin) and u.is_admin())
        )

    def _is_staff_or_read(self, u) -> bool:
        """
        Retourne True si l'utilisateur est staff ou staff_read.
        """
        if not u:
            return False
        return getattr(u, "is_staff", False) or getattr(u, "role", "") == "staff_read"

    def _user_centre_ids(self) -> Optional[list[int]]:
        """
        Retourne la liste des ids de centres visibles par l'utilisateur, ou None pour un accès global.
        """
        request = getattr(self, "request", None)
        if request is not None:
            return get_staff_centre_ids_cached(request)
        u = self.request.user
        if self._is_admin_like(u):
            return None
        if self._is_staff_or_read(u):
            centres_rel = getattr(u, self.staff_centres_attr, None)
            if hasattr(centres_rel, "values_list"):
                return list(centres_rel.values_list("id", flat=True))
            return []
        return []

    def _user_departement_codes(self) -> Optional[list[str]]:
        """
        Retourne la liste des codes départements visibles par l'utilisateur, ou None pour un accès global.
        """
        u = self.request.user
        if self._is_admin_like(u):
            return None
        if not self._is_staff_or_read(u):
            return []

        for owner in (u, getattr(u, "profile", None)):
            if not owner:
                continue
            for attr in self.staff_departements_attrs:
                val = getattr(owner, attr, None)
                if val is None:
                    continue

                if hasattr(val, "all"):
                    codes = []
                    try:
                        for obj in val.all():
                            code = getattr(obj, "code", None) or str(obj)
                            if code:
                                codes.append(str(code)[: self.departement_code_len])
                    except Exception:
                        pass
                    if codes:
                        return list(set(codes))

                if isinstance(val, (list, tuple, set)):
                    codes = [str(x)[: self.departement_code_len] for x in val if x is not None and str(x).strip() != ""]
                    if codes:
                        return list(set(codes))

                s = str(val).strip()
                if s:
                    return [s[: self.departement_code_len]]

        return []

    def scope_queryset_to_centres(self, qs: QuerySet):
        """
        Filtre un queryset selon les centres ou départements accessibles à l'utilisateur.
        """
        ids = self._user_centre_ids()
        dep_codes = self._user_departement_codes()

        if ids is None or dep_codes is None:
            return qs

        if not ids and not dep_codes:
            return qs.none()

        q = Q()

        if ids:
            q_centres = Q()
            for path in self.centre_lookups:
                q_centres |= Q(**{f"{path}__in": ids})
            q |= q_centres

        if dep_codes:
            q_deps = Q()
            for path in self.departement_lookups:
                for code in dep_codes:
                    q_deps |= Q(**{f"{path}__startswith": code})
            q |= q_deps

        return qs.filter(q).distinct()

    def get_queryset(self):
        """
        Retourne le queryset filtré par la portée staff.
        """
        base = super().get_queryset()
        return self.scope_queryset_to_centres(base)


class ApiResponseMixin:
    """
    Mixin DRF pour standardiser les réponses JSON de l'API.
    """

    default_success_message: str = "Operation reussie."
    default_error_message: str = "Une erreur est survenue."

    def success_response(
        self,
        data: Any = None,
        message: str | None = None,
        status_code: int = status.HTTP_200_OK,
    ) -> Response:
        return Response(
            {
                "success": True,
                "message": message or self.default_success_message,
                "data": data,
            },
            status=status_code,
        )

    def error_response(
        self,
        message: str | None = None,
        errors: Mapping[str, Any] | list[Any] | None = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ) -> Response:
        payload: dict[str, Any] = {
            "success": False,
            "message": message or self.default_error_message,
            "data": None,
        }
        if errors is not None:
            payload["errors"] = errors
        return Response(payload, status=status_code)
