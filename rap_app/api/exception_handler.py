"""Handler DRF unifié pour normaliser les réponses d'erreur de l'API."""

from __future__ import annotations

from typing import Any

from rest_framework import status
from rest_framework.exceptions import ErrorDetail, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


MESSAGE_ERROR_CODE_MAP = {
    "Une demande de compte est déjà en attente.": "candidate_account_request_already_pending",
    "Aucune demande de compte en attente pour ce candidat.": "candidate_account_request_missing",
    "Un compte utilisateur est déjà lié à ce candidat.": "candidate_account_already_linked",
    "Ce candidat n'est pas admissible.": "candidate_not_admissible",
    "Le candidat doit être affecté à une formation.": "candidate_requires_formation",
    "Un appairage existe déjà pour ce candidat, ce partenaire et cette formation.": "duplicate_appairage",
    "Déjà archivé.": "already_archived",
    "Déjà actif.": "already_active",
    "Cet appairage n’est pas archivé.": "appairage_not_archived",
    "La prospection n’est pas archivée.": "prospection_not_archived",
    "La prospection est déjà archivée.": "prospection_already_archived",
}


def _normalize_error_value(value: Any) -> Any:
    """Normalise récursivement une valeur d'erreur DRF en types simples."""
    if isinstance(value, dict):
        return {str(key): _normalize_error_value(subvalue) for key, subvalue in value.items()}
    if isinstance(value, list):
        normalized_items = []
        for item in value:
            normalized = _normalize_error_value(item)
            if isinstance(normalized, list):
                normalized_items.extend(normalized)
            else:
                normalized_items.append(normalized)
        return normalized_items
    if isinstance(value, ErrorDetail):
        return str(value)
    if isinstance(value, str):
        return value
    return value


def _normalize_errors(detail: Any) -> dict[str, Any]:
    """Convertit un détail DRF arbitraire en dictionnaire `errors` standardisé."""
    if isinstance(detail, dict):
        return {str(key): _normalize_error_value(value) for key, value in detail.items()}
    normalized = _normalize_error_value(detail)
    if isinstance(normalized, list):
        return {"non_field_errors": normalized}
    return {"non_field_errors": [normalized]}


def _extract_first_error_message(value: Any) -> str | None:
    """Extrait le premier message lisible depuis une structure d'erreurs imbriquée."""
    if isinstance(value, list):
        for item in value:
            extracted = _extract_first_error_message(item)
            if extracted:
                return extracted
        return None
    if isinstance(value, dict):
        for item in value.values():
            extracted = _extract_first_error_message(item)
            if extracted:
                return extracted
        return None
    if isinstance(value, ErrorDetail):
        return str(value)
    if isinstance(value, str):
        return value
    return str(value) if value is not None else None


def _resolve_error_code(message: str | None) -> str | None:
    """Résout un code d'erreur fonctionnel stable à partir d'un message connu."""
    if not message:
        return None
    return MESSAGE_ERROR_CODE_MAP.get(message)


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """Adapte les erreurs DRF à l'enveloppe JSON standard de l'application."""
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, ValidationError):
        errors = _normalize_errors(getattr(exc, "detail", response.data))
        message = _extract_first_error_message(errors.get("non_field_errors")) if isinstance(errors, dict) else None
        if not message:
            message = "Erreur de validation."
    else:
        data = response.data
        if isinstance(data, dict) and "detail" in data and isinstance(data["detail"], (str, ErrorDetail)):
            message = str(data["detail"])
            errors = None
        else:
            message = "Erreur de validation." if response.status_code == status.HTTP_400_BAD_REQUEST else "Erreur."
            errors = _normalize_errors(data)

    payload: dict[str, Any] = {
        "success": False,
        "message": message,
        "data": None,
    }
    if errors is not None:
        payload["errors"] = errors
    error_code = _resolve_error_code(message)
    if error_code is not None:
        payload["error_code"] = error_code

    response.data = payload
    return response
