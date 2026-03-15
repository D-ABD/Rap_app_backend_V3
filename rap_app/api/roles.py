# Helpers de détection de rôles utilisateur pour le contrôle d'accès applicatif.


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
    ou a pour rôle 'admin', 'superadmin', 'staff' ou 'staff_read'.
    """
    if not getattr(u, "is_authenticated", False):
        return False
    role = getattr(u, "role", None)
    role_val = role.lower() if isinstance(role, str) else ""
    if getattr(u, "is_superuser", False):
        return True
    if role_val in {"admin", "superadmin", "staff", "staff_read"}:
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
    Retourne les IDs de centres liés à l'utilisateur staff ou assimilé.
    - [] si non authentifié ou non concerné
    - None si admin_like (accès tous centres)
    - Liste d'IDs sinon, ou [] si absence de centres ou erreur d'accès.
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
    Retourne le périmètre centre en cache sur un objet request.
    Utilise staff_centre_ids(request.user).
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


def role_of(u) -> str:
    """
    Retourne un libellé de rôle en fonction des helpers :
    'admin', 'declic_staff', 'prepa_staff', 'staff_read', 'staff', 'candidate', rôle custom, 'anonymous', ou 'other'.
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
    if is_staff_standard(u):
        return "staff"
    if is_candidate(u):
        return "candidate"
    role = getattr(u, "role", None)
    if isinstance(role, str) and role:
        return role.lower()
    return "other"
