"""Serializers du module ``import_export`` (traces ``ImportJob``)."""

from rest_framework import serializers

from rap_app.models.import_job import ImportJob


class ImportJobSerializer(serializers.ModelSerializer):
    """Lecture seule — une trace d’appel **POST import-xlsx**."""

    username = serializers.SerializerMethodField()

    class Meta:
        model = ImportJob
        fields = [
            "id",
            "created_at",
            "user_id",
            "username",
            "resource",
            "url_resource",
            "dry_run",
            "status",
            "original_filename",
            "http_status",
            "summary",
            "error_payload",
        ]
        read_only_fields = fields

    def get_username(self, obj: ImportJob) -> str | None:
        u = obj.user
        return u.username if u else None
