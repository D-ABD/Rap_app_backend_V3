from rest_framework import serializers


class EmptySerializer(serializers.Serializer):
    """Serializer DRF sans champ, pour endpoints sans payload (ex. statistiques, exports)."""

    pass
