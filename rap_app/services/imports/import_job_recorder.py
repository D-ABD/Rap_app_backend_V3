"""Persistance optionnelle des imports Excel (modèle technique ``ImportJob`` — §2.14)."""

from __future__ import annotations

from typing import Any

from django.conf import settings

from rap_app.models.import_job import ImportJob


def _json_safe_mapping(data: dict[str, Any]) -> dict[str, Any]:
    """Normalise un ``message_dict`` ou payload d’erreur pour ``JSONField``."""
    out: dict[str, Any] = {}
    for k, v in data.items():
        if isinstance(v, (list, tuple)):
            out[k] = [str(x) for x in v]
        elif v is None or isinstance(v, (str, int, float, bool)):
            out[k] = v
        else:
            out[k] = str(v)
    return out


def record_excel_import_job(
    *,
    user,
    resource: str,
    url_resource: str,
    dry_run: bool,
    status: str,
    http_status: int,
    original_filename: str = "",
    summary: dict[str, Any] | None = None,
    error_payload: dict[str, Any] | None = None,
) -> ImportJob | None:
    """
    Crée une ligne ``ImportJob`` si ``RAP_IMPORT_PERSIST_JOBS`` est vrai (défaut).

    Retourne ``None`` si la persistance est désactivée.
    """
    if not getattr(settings, "RAP_IMPORT_PERSIST_JOBS", True):
        return None
    u = user if user is not None and getattr(user, "is_authenticated", False) else None
    return ImportJob.objects.create(
        user=u,
        resource=resource,
        url_resource=url_resource or "",
        dry_run=dry_run,
        status=status,
        original_filename=(original_filename or "")[:255],
        http_status=http_status,
        summary=summary,
        error_payload=_json_safe_mapping(error_payload) if error_payload else None,
    )
