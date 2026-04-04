"""Helpers centralisés de détection de rôles et de périmètre centre.

Ce module sert de brique commune pour les permissions, les viewsets et les
services qui doivent dériver un niveau d'accès à partir de `request.user`.
Le code reste volontairement simple :
- les helpers booléens répondent uniquement à la question "ce rôle appartient-il
  à telle famille ?" ;
- `staff_centre_ids()` calcule le périmètre centre courant ;
- `get_staff_centre_ids_cached()` évite de recalculer ce périmètre plusieurs
  fois sur la même requête.

Règle métier cible :
- le scope opérationnel reste piloté par les centres explicitement attribués ;
- les rôles commerciaux et recrutement sont traités comme des rôles métier
  staff-like pour le périmètre centre, sans leur ouvrir automatiquement
  tous les modules.
- le scope statistiques peut, lui, s'élargir au département des centres
  attribués quand une vue stats le demande explicitement.
"""

from django.db.models import Q


def is_candidate(u) -> bool:
    """
    Retourne True si l'utilisateur est authentifié et possède une méthode
    'is_candidat_or_stagiaire' qui renvoie True. Sinon, False.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    fn = getattr(u, "is_candidat_or_stagiaire", None)
    if callable(fn):
        return fn()
    return False


def is_staff_read(u) -> bool:
    """
    Retourne True si l'utilisateur est authentifié et a pour rôle 'staff_read'.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    role = getattr(u, "role", None)
    return isinstance(role, str) and role.lower() == "staff_read"


def is_commercial(u) -> bool:
    """
    Retourne True si l'utilisateur est authentifié et a pour rôle 'commercial'.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    role = getattr(u, "role", None)
    return isinstance(role, str) and role.lower() == "commercial"


def is_charge_recrutement(u) -> bool:
    """
    Retourne True si l'utilisateur est authentifié et a pour rôle
    'charge_recrutement'.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    role = getattr(u, "role", None)
    return isinstance(role, str) and role.lower() == "charge_recrutement"


def can_write_documents(u) -> bool:
    """Retourne True pour les rôles autorisés à créer/modifier des documents."""
    return bool(u and (is_admin_like(u) or is_staff_standard(u) or is_charge_recrutement(u)))


def can_write_commentaires_formation(u) -> bool:
    """Retourne True pour les rôles autorisés à écrire sur les commentaires formation."""
    return bool(u and (is_admin_like(u) or is_staff_standard(u) or is_charge_recrutement(u)))


def can_write_evenements(u) -> bool:
    """Retourne True pour les rôles autorisés à créer/modifier des événements."""
    return bool(u and (is_admin_like(u) or is_staff_standard(u) or is_charge_recrutement(u) or is_commercial(u)))


def is_staff_standard(u) -> bool:
    """
    Retourne True si l'utilisateur est authentifié et a pour rôle 'staff'.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    role = getattr(u, "role", None)
    return isinstance(role, str) and role.lower() == "staff"


def is_staff_or_staffread(u) -> bool:
    """
    Retourne True si l'utilisateur est authentifié et a pour rôle 'staff' ou 'staff_read'.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    role = getattr(u, "role", None)
    return isinstance(role, str) and role.lower() in {"staff", "staff_read"}


def is_centre_scoped_staff(u) -> bool:
    """
    Retourne True si l'utilisateur appartient à un rôle métier opéré par
    centre pour les modules coeur.

    Inclut :
    - commercial
    - charge_recrutement
    - staff
    - staff_read

    N'inclut pas volontairement les rôles spécialisés `prepa_staff` et
    `declic_staff`, qui gardent leurs règles dédiées.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    role = getattr(u, "role", None)
    return isinstance(role, str) and role.lower() in {"commercial", "charge_recrutement", "staff", "staff_read"}


def is_admin_like(u) -> bool:
    """
    Retourne True si l'utilisateur est authentifié et est superuser, ou a pour rôle 'admin' ou 'superadmin'.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    if getattr(u, "is_superuser", False):
        return True
    role = getattr(u, "role", None)
    return isinstance(role, str) and role.lower() in {"admin", "superadmin"}


def is_staff_like(u) -> bool:
    """
    Retourne True si l'utilisateur est authentifié et est superuser,
    ou a pour rôle 'admin', 'superadmin', 'commercial',
    'charge_recrutement', 'staff' ou 'staff_read'.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    role = getattr(u, "role", None)
    role_val = role.lower() if isinstance(role, str) else ""
    if getattr(u, "is_superuser", False):
        return True
    if role_val in {"admin", "superadmin", "commercial", "charge_recrutement", "staff", "staff_read"}:
        return True
    return False


def is_declic_staff(u) -> bool:
    """
    Retourne True si l'utilisateur est authentifié et a pour rôle 'declic_staff'.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    role = getattr(u, "role", None)
    return isinstance(role, str) and role.lower() == "declic_staff"


def is_prepa_staff(u) -> bool:
    """
    Retourne True si l'utilisateur est authentifié et a pour rôle 'prepa_staff'.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    role = getattr(u, "role", None)
    return isinstance(role, str) and role.lower() == "prepa_staff"


def staff_centre_ids(u):
    """
    Retourne le périmètre centre dérivé de l'utilisateur.

    Convention utilisée dans tout le backend :
    - `[]` si l'utilisateur n'est pas authentifié ou n'a pas de périmètre staff ;
    - `None` si l'utilisateur est admin-like et doit être traité comme ayant
      accès à tous les centres ;
    - `list[int]` pour un staff limité à un sous-ensemble de centres.

    En cas d'absence de relation `centres` exploitable ou d'erreur d'accès,
    la fonction retombe sur `[]`.
    """
    if not getattr(u, "is_authenticated", False):
        return []
    if is_admin_like(u):
        return None
    if any([is_staff_like(u), is_prepa_staff(u), is_declic_staff(u)]):
        centres = getattr(u, "centres", None)
        if hasattr(centres, "all") or hasattr(centres, "values_list"):
            try:
                return list(centres.values_list("id", flat=True))
            except Exception:
                return []
        return []
    return []


_STAFF_CENTRE_IDS_UNSET = object()


def get_staff_centre_ids_cached(request):
    """
    Retourne le périmètre centre en le mémorisant sur `request`.

    Le cache stocke exactement la convention de `staff_centre_ids()` :
    `None` pour un accès global admin-like, `[]` pour absence de périmètre,
    ou une liste d'identifiants de centres.
    """
    if request is None:
        return []
    cached = getattr(request, "_staff_centre_ids", _STAFF_CENTRE_IDS_UNSET)
    if cached is not _STAFF_CENTRE_IDS_UNSET:
        return cached
    user = getattr(request, "user", None)
    ids = staff_centre_ids(user) if user else []
    request._staff_centre_ids = ids
    return ids


_STAFF_DEPARTMENT_CODES_UNSET = object()


def staff_department_codes(u):
    """
    Retourne les codes département dérivés des centres attribués.

    Convention :
    - `None` pour un admin-like (accès stats global) ;
    - `[]` si aucun département exploitable n'est disponible ;
    - `list[str]` pour les départements accessibles en lecture statistique.
    """
    if not getattr(u, "is_authenticated", False):
        return []
    if is_admin_like(u):
        return None

    centres = getattr(u, "centres", None)
    if not hasattr(centres, "all"):
        return []

    deps = []
    for centre in centres.all():
        code_postal = (getattr(centre, "code_postal", "") or "").strip()
        if len(code_postal) >= 2:
            deps.append(code_postal[:2])
    return sorted(set(deps))


def get_staff_department_codes_cached(request):
    """
    Retourne le périmètre département stats en le mémorisant sur `request`.
    """
    if request is None:
        return []
    cached = getattr(request, "_staff_department_codes", _STAFF_DEPARTMENT_CODES_UNSET)
    if cached is not _STAFF_DEPARTMENT_CODES_UNSET:
        return cached
    user = getattr(request, "user", None)
    codes = staff_department_codes(user) if user else []
    request._staff_department_codes = codes
    return codes


def use_department_stats_scope(request) -> bool:
    """
    Retourne True si la requête demande explicitement un scope stats départemental.

    La convention retenue est `?scope=departement`. Toute autre valeur retombe
    sur le scope centre.
    """
    scope = ""
    if request is not None and getattr(request, "query_params", None) is not None:
        scope = str(request.query_params.get("scope", "") or "").strip().lower()
    return scope == "departement"


def build_department_scope_q(field_name: str, department_codes) -> Q:
    """
    Construit un `Q` équivalent à un OR sur plusieurs préfixes département.

    Exemple :
    - `build_department_scope_q("centre__code_postal", ["92", "78"])`
      produit `Q(centre__code_postal__startswith="92") | Q(...="78")`
    """
    query = Q()
    for code in department_codes or []:
        query |= Q(**{f"{field_name}__startswith": str(code)})
    return query


def role_of(u) -> str:
    """
    Retourne un libellé de rôle en fonction des helpers :
    'admin', 'declic_staff', 'prepa_staff', 'staff_read', 'commercial',
    'charge_recrutement', 'staff', 'candidate', rôle custom, 'anonymous',
    ou 'other'.
    """
    if not getattr(u, "is_authenticated", False):
        return "anonymous"
    if is_admin_like(u):
        return "admin"
    if is_declic_staff(u):
        return "declic_staff"
    if is_prepa_staff(u):
        return "prepa_staff"
    if is_staff_read(u):
        return "staff_read"
    if is_commercial(u):
        return "commercial"
    if is_charge_recrutement(u):
        return "charge_recrutement"
    if is_staff_standard(u):
        return "staff"
    if is_candidate(u):
        return "candidate"
    role = getattr(u, "role", None)
    if isinstance(role, str) and role:
        return role.lower()
    return "other"


def is_candidate_like(u) -> bool:
    """
    Retourne True pour les rôles candidats/stagiaires au sens métier.
    Alias explicite de `is_candidate()` pour améliorer la lisibilité
    des permissions et viewsets.

    Le rôle transitoire `candidatuser` reste inclus ici tant que le cycle de
    vie candidat conserve cette étape intermédiaire avant `stagiaire`.
    """
    return is_candidate(u)


def can_write_formations(u) -> bool:
    """
    Retourne True si l'utilisateur peut modifier les formations.

    Règle métier actuelle :
    - oui pour admin-like et staff transverse ;
    - non pour commercial et charge_recrutement ;
    - non pour prepa_staff / declic_staff dans cette première itération.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    return is_admin_like(u) or is_staff_standard(u)


def can_access_prepa(u) -> bool:
    """
    Retourne True si l'utilisateur peut accéder au bloc Prépa.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    return is_admin_like(u) or is_staff_standard(u) or is_staff_read(u) or is_prepa_staff(u)


def can_access_declic(u) -> bool:
    """
    Retourne True si l'utilisateur peut accéder au bloc Déclic.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    return is_admin_like(u) or is_staff_standard(u) or is_staff_read(u) or is_declic_staff(u)
