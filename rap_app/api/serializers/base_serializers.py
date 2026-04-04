"""Sérialiseurs techniques et réutilisables de bas niveau."""

from rest_framework import serializers


class EmptySerializer(serializers.Serializer):
    """Serializer DRF sans champ, pour endpoints sans payload (ex. statistiques, exports)."""

    pass


class HealthStatusSerializer(serializers.Serializer):
    """Payload de santé minimal pour /api/health/."""

    status = serializers.CharField()
    database = serializers.CharField()
    timestamp = serializers.CharField()


class SimpleMessageSerializer(serializers.Serializer):
    """Payload générique minimal avec message de confirmation."""

    message = serializers.CharField()
