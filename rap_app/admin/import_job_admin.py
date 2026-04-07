"""Admin — traces d’import Excel (lecture seule)."""

from django.contrib import admin
from django.utils.timezone import localtime

from rap_app.models.import_job import ImportJob


@admin.register(ImportJob)
class ImportJobAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "created_at_display",
        "user",
        "resource",
        "url_resource",
        "dry_run",
        "status",
        "http_status",
        "original_filename",
    )
    list_filter = ("resource", "status", "dry_run")
    search_fields = ("original_filename", "resource", "url_resource")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    readonly_fields = (
        "created_at",
        "user",
        "resource",
        "url_resource",
        "dry_run",
        "status",
        "original_filename",
        "http_status",
        "summary",
        "error_payload",
    )

    def created_at_display(self, obj):
        if obj.created_at:
            return localtime(obj.created_at).strftime("%Y-%m-%d %H:%M:%S")
        return "—"

    created_at_display.short_description = "Créé le"
