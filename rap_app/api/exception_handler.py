from __future__ import annotations

from typing import Any

from rest_framework import status
from rest_framework.exceptions import ErrorDetail, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def _normalize_error_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _normalize_error_value(subvalue) for key, subvalue in value.items()}
    if isinstance(value, list):
        return [_normalize_error_value(item) for item in value]
    if isinstance(value, ErrorDetail):
        return [str(value)]
    if isinstance(value, str):
        return [value]
    return value


def _normalize_errors(detail: Any) -> dict[str, Any]:
    if isinstance(detail, dict):
        return {str(key): _normalize_error_value(value) for key, value in detail.items()}
    return {"non_field_errors": _normalize_error_value(detail)}


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, ValidationError):
        message = "Erreur de validation."
        errors = _normalize_errors(getattr(exc, "detail", response.data))
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

    response.data = payload
    return response
