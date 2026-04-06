"""Helpers OpenAPI réutilisables pour documenter les enveloppes JSON métier."""

from __future__ import annotations

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, inline_serializer
from rest_framework import serializers


def api_envelope_serializer(name: str, data_schema) -> serializers.Serializer:
    """Construit l'enveloppe JSON standard `{success, message, data}`."""
    return inline_serializer(
        name=name,
        fields={
            "success": serializers.BooleanField(),
            "message": serializers.CharField(),
            "data": data_schema,
        },
    )


def api_paginated_envelope_serializer(name: str, item_schema) -> serializers.Serializer:
    """Construit l'enveloppe JSON standard avec pagination DRF dans `data`."""
    page_schema = inline_serializer(
        name=f"{name}Page",
        fields={
            "count": serializers.IntegerField(),
            "next": serializers.CharField(allow_null=True, required=False),
            "previous": serializers.CharField(allow_null=True, required=False),
            "results": item_schema,
        },
    )
    return api_envelope_serializer(name=name, data_schema=page_schema)


def api_object_envelope_serializer(name: str) -> serializers.Serializer:
    """Construit une enveloppe standard avec `data` libre mais JSON."""
    return api_envelope_serializer(name=name, data_schema=serializers.JSONField(allow_null=True))


def api_action_data_serializer(name: str, fields: dict[str, serializers.Field]) -> serializers.Serializer:
    """Construit une enveloppe standard avec `data` typé pour une action custom."""
    return api_envelope_serializer(
        name=name,
        data_schema=inline_serializer(name=f"{name}Data", fields=fields),
    )


def binary_file_response(description: str) -> OpenApiResponse:
    """Réponse de téléchargement binaire."""
    return OpenApiResponse(response=OpenApiTypes.BINARY, description=description)
