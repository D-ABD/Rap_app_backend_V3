"""Permissions DRF communes pour l'API RapApp.

Ce module centralise les permissions réutilisables par les viewsets. Les
docstrings cherchent à décrire le comportement réel du code, notamment depuis
l'introduction des rôles `commercial` et `charge_recrutement`.

Règles de lecture à garder en tête :
- `admin-like` = admin, superadmin, superuser ;
- `staff_like` = admin-like + commercial + charge_recrutement + staff +
  staff_read ;
- certains modules spécialisés restent volontairement exclus pour
  `commercial`/`charge_recrutement` même s'ils sont `staff_like`.
"""

from django.db.models import Q
from rest_framework.permissions import SAFE_METHODS, BasePermission

from .roles import (
    get_staff_centre_ids_cached,
    is_admin_like,
    is_candidate,
    is_centre_scoped_staff,
    is_declic_staff,
    is_prepa_staff,
    is_staff_like,
    is_staff_or_staffread,
    is_staff_read,
    is_staff_standard,
)


class CanAccessProspectionComment(BasePermission):
    """
    Gère l'accès objet aux commentaires de prospection selon le rôle et la méthode.
    """

    message = "Accès refusé."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            self.message = "Authentification requise."
            return False

        role = str(getattr(user, "role", "")).lower()

        if is_admin_like(user):
            return True

        if is_staff_like(user) and role != "staff_read":
            return True

        if role == "staff_read":
            return request.method in SAFE_METHODS

        if is_candidate(user):
            if request.method in SAFE_METHODS:
                return (not getattr(obj, "is_internal", True)) and (
                    getattr(getattr(obj, "prospection", None), "owner_id", None) == user.id
                )
            return (
                (not getattr(obj, "is_internal", True))
                and (getattr(getattr(obj, "prospection", None), "owner_id", None) == user.id)
                and (getattr(obj, "created_by_id", None) == user.id)
            )

        if request.method in SAFE_METHODS:
            return True
        return getattr(obj, "created_by_id", None) == user.id


class IsSuperAdminOnly(BasePermission):
    """
    Autorise uniquement les superadmins.
    """

    message = "Accès réservé aux superadmins uniquement."

    def has_permission(self, request, view):
        user = request.user
        return getattr(user, "is_authenticated", False) and user.is_superadmin()


class IsAdminLikeOnly(BasePermission):
    """
    Autorise uniquement les utilisateurs admin ou superadmin selon is_admin_like.
    """

    message = "Accès réservé aux administrateurs et superadministrateurs."

    def has_permission(self, request, view):
        user = request.user
        return getattr(user, "is_authenticated", False) and is_admin_like(user)


class IsAdmin(BasePermission):
    """
    Autorise uniquement `admin-like`, `staff` et `staff_read`.

    Cette permission historique n'inclut volontairement pas les rôles
    `commercial` et `charge_recrutement`. Pour les modules coeur pilotés par
    centre, préférer `IsStaffOrAbove`.
    """

    message = "Accès réservé au staff, admin ou superadmin."

    def has_permission(self, request, view):
        user = request.user
        return getattr(user, "is_authenticated", False) and (is_admin_like(user) or is_staff_or_staffread(user))


class ReadWriteAdminReadStaff(BasePermission):
    """
    Accès lecture à `staff`, `staff_read` et `admin-like` ; écriture réservée
    à `admin-like`.

    Les rôles `commercial` et `charge_recrutement` n'entrent pas dans cette
    permission historique.
    """

    message = "Lecture réservée au staff/staff_read. Écriture réservée aux admins."

    def has_permission(self, request, view):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            self.message = "Authentification requise."
            return False

        role = str(getattr(user, "role", "")).lower()

        if request.method in SAFE_METHODS:
            return is_staff_or_staffread(user) or is_admin_like(user) or role == "staff_read"
        return is_admin_like(user) or getattr(user, "is_superuser", False)


class ReadWriteAdminReadCentresScoped(BasePermission):
    """
    Accès lecture aux rôles internes pouvant consulter des centres dans leur
    propre périmètre ; écriture réservée aux admins.

    Inclut en lecture :
    - `staff`
    - `staff_read`
    - `prepa_staff`
    - `declic_staff`
    - `admin-like`

    Les rôles spécialisés conservent un accès limité à leurs centres
    attribués via le queryset du viewset.
    """

    message = "Lecture réservée aux rôles internes autorisés. Écriture réservée aux admins."

    def has_permission(self, request, view):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            self.message = "Authentification requise."
            return False

        if request.method in SAFE_METHODS:
            return (
                is_admin_like(user)
                or is_staff_or_staffread(user)
                or is_prepa_staff(user)
                or is_declic_staff(user)
            )
        return is_admin_like(user) or getattr(user, "is_superuser", False)


class IsStaffOrAbove(BasePermission):
    """
    Autorise les rôles coeur opérés par centre ainsi que les admins.

    Inclut :
    - commercial
    - charge_recrutement
    - staff
    - staff_read
    - admin
    - superadmin

    Refuse les candidats et autres.
    """

    message = "Accès réservé aux rôles métier internes autorisés."

    def has_permission(self, request, view):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            return False

        if is_candidate(user):
            return False

        if is_admin_like(user):
            return True

        role = str(getattr(user, "role", "")).lower()
        if role == "staff_read":
            return request.method in SAFE_METHODS
        if is_centre_scoped_staff(user):
            return True
        return False


class ReadOnlyOrAdmin(BasePermission):
    """
    Lecture ouverte à tous ; modification réservée à admin ou superadmin.
    """

    message = "Lecture publique. Modifications réservées aux admins ou superadmins."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return getattr(user, "is_authenticated", False) and user.has_role("admin", "superadmin")


class IsOwnerOrSuperAdmin(BasePermission):
    """
    Autorise le créateur de l'objet ou le superadmin.
    """

    message = "Accès refusé : vous n'êtes pas le créateur ni superadmin."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not getattr(user, "is_authenticated", False):
            self.message = "Authentification requise."
            return False
        return user.is_superadmin() or getattr(obj, "created_by_id", None) == user.id


class IsOwnerOrStaffOrAbove(BasePermission):
    """
    Autorise l'accès selon une combinaison de règles globales et objet.

    Règles principales :
    - admin-like : accès complet
    - staff : accès complet
    - `staff_read` : lecture seule
    - utilisateur propriétaire via `owner_id`
    - utilisateur créateur via `created_by_id`

    `has_permission()` vérifie surtout l'éligibilité générale de la requête.
    `has_object_permission()` applique ensuite la logique objet sur les champs
    `owner_id`, `created_by_id` et, pour certains objets liés à des
    prospections, un fallback de lecture via `obj.prospections`.
    """

    message = "Accès restreint."

    def has_permission(self, request, view):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            return False
        role = str(getattr(user, "role", "")).lower()
        if role == "staff_read" and request.method not in SAFE_METHODS:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        role = str(getattr(user, "role", "")).lower()

        if is_admin_like(user):
            return True
        if is_staff_like(user) and role != "staff_read":
            return True
        if role == "staff_read":
            return request.method in SAFE_METHODS
        if getattr(obj, "owner_id", None) == user.id:
            return True
        if getattr(obj, "created_by_id", None) == user.id:
            return True

        if request.method in SAFE_METHODS and hasattr(obj, "prospections"):
            qs = getattr(obj, "prospections", None)
            if hasattr(qs, "all"):
                try:
                    if qs.filter(owner_id=user.id).exists():
                        return True
                except Exception:
                    pass
        return False


class UserVisibilityScopeMixin:
    """
    Ajoute un filtre de visibilité queryset basé sur un champ utilisateur.

    Comportement :
    - admin-like : accès global
    - `staff` / `staff_read` : pas de restriction supplémentaire dans ce mixin
    - autres utilisateurs authentifiés : restreints à `user_field`

    Ce mixin ne remplace pas le scoping par centres. Il sert surtout pour les
    ressources où la visibilité non-admin non-staff repose sur un lien direct
    avec un champ utilisateur (`created_by` par défaut).

    Important : ce mixin historique ne traite pas `commercial` et
    `charge_recrutement` comme des profils staff génériques ; pour ces rôles,
    le scoping recommandé passe par les viewsets centre-scopés.
    """

    user_field = "created_by"

    def user_visibility_q(self, user):
        return Q(**{self.user_field: user})

    def apply_user_scope(self, qs):
        user = self.request.user
        if not getattr(user, "is_authenticated", False):
            return qs.none()
        if is_admin_like(user):
            return qs
        if is_staff_or_staffread(user):
            return qs
        return qs.filter(self.user_visibility_q(user)).distinct()

    def get_queryset(self):
        qs = super().get_queryset()
        return self.apply_user_scope(qs)


class IsStaffReadOnly(BasePermission):
    """
    Autorise staff_read en lecture seule ; pas de restriction pour les autres.
    """

    message = "Accès en lecture seule uniquement pour le rôle staff_read."

    def has_permission(self, request, view):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            return False
        role = str(getattr(user, "role", "")).lower()
        if role == "staff_read":
            return request.method in SAFE_METHODS
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        role = str(getattr(user, "role", "")).lower()
        if role == "staff_read":
            return request.method in SAFE_METHODS
        return True


class IsDeclicStaffOrAbove(BasePermission):
    """
    Autorise admin, superadmin, staff standard, declic_staff ; staff_read en lecture seule.

    Les rôles coeur centre-scopés `commercial` et `charge_recrutement` ne
    sont volontairement pas inclus dans ce module spécialisé.
    """

    message = "Accès réservé au staff Déclic ou supérieur."

    def has_permission(self, request, view):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            return False

        if is_admin_like(user):
            return True
        if is_staff_standard(user):
            return True
        if is_staff_read(user):
            return request.method in SAFE_METHODS
        if is_declic_staff(user):
            return True
        if is_candidate(user):
            self.message = "Les candidats n’ont pas accès à ce module."
            return False
        return False


class IsPrepaStaffOrAbove(BasePermission):
    """
    Autorise `admin-like`, `staff`, `prepa_staff` et `staff_read` en lecture.

    Les rôles coeur `commercial` et `charge_recrutement` sont exclus de ce
    module spécialisé.
    """

    message = "Accès réservé au staff PrépaComp ou supérieur."

    def has_permission(self, request, view):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            return False
        if is_admin_like(user):
            return True
        if is_staff_standard(user):
            return True
        if is_prepa_staff(user):
            return True
        if is_staff_read(user):
            return request.method in SAFE_METHODS
        return False


class CanAccessCVTheque(BasePermission):
    """
    Permission dédiée à la CVThèque.

    `has_permission()` vérifie seulement que l'utilisateur est authentifié.
    `has_object_permission()` applique ensuite les règles métier :
    - admin-like : accès complet ;
    - `staff_read` : lecture seule sur les CV de son périmètre centre ;
    - autres profils staff : accès lecture/écriture dans leur périmètre centre ;
    - candidat : accès à son propre CV ;
    - autres utilisateurs : lecture limitée à leurs objets créés ou liés.
    """

    message = "Accès refusé."

    def has_permission(self, request, view):
        """
        Vérifie uniquement l'authentification avant résolution de l'objet.
        """
        user = request.user
        return bool(user and getattr(user, "is_authenticated", False))

    def has_object_permission(self, request, view, obj):
        """
        Affine l'accès sur un objet CVthèque selon le rôle, le centre visible
        et le lien entre l'objet candidat et l'utilisateur courant.
        """
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            return False

        is_preview = getattr(view, "action", None) == "preview"
        is_download = getattr(view, "action", None) == "download"
        is_readonly = request.method in SAFE_METHODS or is_preview or is_download

        cand = getattr(obj, "candidat", None)
        form = getattr(cand, "formation", None) if cand else None

        if is_admin_like(user):
            return True

        if is_staff_read(user):
            centres = get_staff_centre_ids_cached(request)
            return is_readonly and form is not None and centres is not None and form.centre_id in centres

        if is_staff_like(user):
            centres = get_staff_centre_ids_cached(request)
            if centres is None:
                return True
            return form is not None and form.centre_id in centres

        if is_candidate(user):
            return cand is not None and getattr(cand, "compte_utilisateur_id", None) == user.id

        if is_readonly:
            return getattr(obj, "created_by_id", None) == user.id or (
                cand and getattr(cand, "compte_utilisateur_id", None) == user.id
            )

        return False


class CanAccessCandidatObject(BasePermission):
    """Permission objet pour limiter l'accès aux candidats.

    Règles :
    - admin-like : accès complet ;
    - staff-like internes (`commercial`, `charge_recrutement`, `staff`,
      `staff_read`) : accès selon le périmètre centre du candidat ;
    - candidat : accès uniquement à son propre profil ;
    - autres profils : refus.

    `has_permission()` contrôle l'entrée générale dans la vue.
    `has_object_permission()` applique ensuite le périmètre centre ou
    l'égalité `compte_utilisateur_id == request.user.id`.
    """

    message = "Accès refusé."

    def has_permission(self, request, view):
        """Autorisation préalable avant résolution de l'objet."""
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            self.message = "Authentification requise."
            return False

        # Les rôles internes staff-like peuvent entrer dans la vue ; le
        # périmètre exact est ensuite affiné au niveau objet.
        if is_admin_like(user) or is_staff_like(user):
            return True

        # Les candidats ne peuvent pas créer / supprimer, mais peuvent consulter / modifier leur propre profil.
        if is_candidate(user):
            if request.method in SAFE_METHODS + ("PUT", "PATCH"):
                return True
        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            self.message = "Authentification requise."
            return False

        if is_admin_like(user):
            return True

        # Les rôles internes staff-like restent limités au périmètre centre.
        if is_staff_like(user):
            centres = get_staff_centre_ids_cached(request)
            if centres is None:
                return True
            if not centres:
                return False

            formation = getattr(obj, "formation", None)
            return formation is not None and getattr(formation, "centre_id", None) in centres

        # Les candidats n'ont accès qu'à leur propre profil
        if is_candidate(user):
            return getattr(obj, "compte_utilisateur_id", None) == user.id

        return False
