"""Mixins DRF transverses pour réponses API, masquage et scoping historique.

Le fichier mélange des briques récentes (ex. `ApiResponseMixin`) et quelques
mixins plus anciens encore utilisés sur des modules spécialisés. Les
docstrings ci-dessous précisent quand une brique est historique et quand il
vaut mieux privilégier les helpers plus récents du backend.
"""

from typing import Any, Mapping, Optional, Tuple

from django.db import models
from django.db.models import Q, QuerySet
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from ..models.logs import LogUtilisateur
from .permissions import IsAdminLikeOnly
from .roles import get_staff_centre_ids_cached, is_admin_like, is_staff_or_staffread, is_staff_like


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
        return is_staff_like(user)

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
        return is_admin_like(u)

    def _is_staff_or_read(self, u) -> bool:
        """
        Retourne True si l'utilisateur est `staff` ou `staff_read`.

        Ce helper reste volontairement étroit, car `StaffCentresScopeMixin`
        est une brique historique pensée pour ces deux rôles. Les rôles coeur
        plus récents (`commercial`, `charge_recrutement`) doivent plutôt
        passer par les helpers centralisés de `roles.py` et les viewsets
        centre-scopés plus récents.
        """
        return is_staff_or_staffread(u)

    def _user_centre_ids(self) -> Optional[list[int]]:
        """
        Retourne les ids de centres visibles pour ce mixin historique.

        Convention :
        - `None` pour un accès global admin-like ;
        - `list[int]` pour `staff` / `staff_read` ;
        - `[]` pour les autres profils.
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
        Retourne les codes départements visibles pour ce mixin historique.

        Cette méthode ne pilote pas le nouveau scope opérationnel coeur des
        rôles `commercial` / `charge_recrutement`. Elle reste utile sur
        certains modules anciens où un filtrage départemental d'appoint existe
        encore.
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
        error_code: str | None = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ) -> Response:
        payload: dict[str, Any] = {
            "success": False,
            "message": message or self.default_error_message,
            "data": None,
        }
        if errors is not None:
            payload["errors"] = errors
        if error_code is not None:
            payload["error_code"] = error_code
        return Response(payload, status=status_code)


class HardDeleteArchivedMixin:
    """
    Ajoute une suppression physique explicite et sécurisée.

    Le contrat cible est volontairement strict :
    - action séparée `POST .../<id>/hard-delete/`
    - réservée aux profils admin/superadmin
    - refusée tant que la ressource n'est pas déjà archivée
    """

    hard_delete_enabled: bool = False

    def _hard_delete_response(
        self,
        success: bool,
        message: str,
        data: Any = None,
        status_code: int = status.HTTP_200_OK,
    ) -> Response:
        return Response(
            {
                "success": success,
                "message": message,
                "data": data,
            },
            status=status_code,
        )

    def get_hard_delete_model(self):
        for queryset_attr in ("base_queryset", "queryset"):
            queryset = getattr(self, queryset_attr, None)
            model = getattr(queryset, "model", None)
            if model is not None:
                return model

        serializer_factory = getattr(self, "get_serializer_class", None)
        serializer_cls = serializer_factory() if callable(serializer_factory) else None
        return getattr(getattr(serializer_cls, "Meta", None), "model", None)

    def get_hard_delete_queryset(self):
        model = self.get_hard_delete_model()
        if model is None:
            raise NotFound("Modele introuvable pour la suppression definitive.")

        manager = model._default_manager
        if hasattr(manager, "all_including_archived"):
            return manager.all_including_archived()
        return manager.all()

    def get_hard_delete_object(self):
        lookup_field = getattr(self, "lookup_field", "pk")
        lookup_url_kwarg = getattr(self, "lookup_url_kwarg", None) or lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        instance = self.get_hard_delete_queryset().filter(**{lookup_field: lookup_value}).first()
        if instance is None:
            raise NotFound("Element introuvable pour suppression definitive.")
        return instance

    def is_instance_archived_for_hard_delete(self, instance) -> bool:
        for attr in ("est_archivee", "est_archive"):
            if hasattr(instance, attr):
                value = getattr(instance, attr)
                return bool(value() if callable(value) else value)

        if hasattr(instance, "is_active"):
            return not bool(getattr(instance, "is_active"))

        if hasattr(instance, "activite"):
            return str(getattr(instance, "activite", "")).lower() in {"archive", "archivee", "archived"}

        return False

    def get_hard_delete_label(self, instance) -> str:
        return str(getattr(instance._meta, "verbose_name", instance.__class__.__name__)).strip()

    def get_hard_delete_success_message(self, instance) -> str:
        return f"Suppression definitive de {self.get_hard_delete_label(instance)} effectuee avec succes."

    def get_hard_delete_requires_archive_message(self, instance) -> str:
        return f"{self.get_hard_delete_label(instance).capitalize()} doit d'abord etre archive avant suppression definitive."

    def build_hard_delete_payload(self, instance) -> dict[str, Any]:
        return {
            "id": instance.pk,
            "hard_deleted": True,
            "resource": instance._meta.model_name,
        }

    def cleanup_hard_delete_files(self, instance) -> None:
        for field in instance._meta.fields:
            if isinstance(field, models.FileField):
                file_ref = getattr(instance, field.name, None)
                if file_ref:
                    try:
                        file_ref.delete(save=False)
                    except Exception:
                        continue

    def perform_hard_delete(self, instance, user=None) -> None:
        details = f"Suppression definitive de {self.get_hard_delete_label(instance)} #{instance.pk}"
        LogUtilisateur.log_action(instance, LogUtilisateur.ACTION_DELETE, user, details)
        self.cleanup_hard_delete_files(instance)
        instance.delete()

    @extend_schema(
        summary="Supprimer définitivement un élément archivé",
        description=(
            "Action explicite réservée aux admins/superadmins. "
            "Elle ne fonctionne que sur un élément déjà archivé et réalise "
            "une suppression physique irréversible."
        ),
        responses={200: OpenApiResponse(description="Suppression définitive effectuée avec succès.")},
    )
    @action(detail=True, methods=["post"], url_path="hard-delete", permission_classes=[IsAdminLikeOnly])
    def hard_delete(self, request, *args, **kwargs):
        """
        Supprime physiquement une ressource déjà archivée.
        """
        if not getattr(self, "hard_delete_enabled", False):
            raise NotFound("Action indisponible sur cette ressource.")

        instance = self.get_hard_delete_object()
        if not self.is_instance_archived_for_hard_delete(instance):
            return self._hard_delete_response(
                success=False,
                message=self.get_hard_delete_requires_archive_message(instance),
                data=None,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        payload = self.build_hard_delete_payload(instance)
        success_message = self.get_hard_delete_success_message(instance)
        self.perform_hard_delete(instance, user=request.user)
        return self._hard_delete_response(
            success=True,
            message=success_message,
            data=payload,
            status_code=status.HTTP_200_OK,
        )
