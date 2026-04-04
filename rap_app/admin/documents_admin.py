"""Configuration admin des documents."""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.timezone import localtime

from ..models.documents import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    """
    📎 Admin avancé pour les documents liés aux formations.
    """

    list_display = (
        "id",
        "nom_fichier_display",
        "formation_display",
        "type_document",
        "taille_readable",
        "mime_type",
        "is_active",
        "created_by_display",
        "created_at_display",
    )
    list_display_links = ("id", "nom_fichier_display")
    list_filter = ("type_document", "is_active", "formation")
    search_fields = ("nom_fichier", "formation__nom", "created_by__username")
    ordering = ("-created_at",)
    actions = ["activer_documents", "desactiver_documents"]

    readonly_fields = (
        "taille_fichier",
        "mime_type",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "download_preview",
    )

    fieldsets = (
        (
            "📄 Contenu du document",
            {
                "fields": (
                    "nom_fichier",
                    "formation",
                    "type_document",
                    "fichier",
                    "download_preview",
                    "is_active",
                ),
            },
        ),
        (
            "🔍 Métadonnées techniques",
            {
                "fields": ("mime_type", "taille_fichier"),
            },
        ),
        (
            "🧾 Suivi",
            {
                "fields": (
                    "created_by",
                    "created_at",
                    "updated_by",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def nom_fichier_display(self, obj):
        return format_html("<strong>{}</strong>", obj.nom_fichier)

    nom_fichier_display.short_description = "Nom du fichier"

    def formation_display(self, obj):
        return str(obj.formation)

    formation_display.short_description = "Formation"

    def taille_readable(self, obj):
        return obj.human_size

    taille_readable.short_description = "Taille"

    def created_by_display(self, obj):
        return str(obj.created_by) if obj.created_by else "-"

    created_by_display.short_description = "Ajouté par"

    def created_at_display(self, obj):
        return localtime(obj.created_at).strftime("%Y-%m-%d %H:%M") if obj.created_at else "-"

    created_at_display.short_description = "Ajouté le"

    def download_preview(self, obj):
        if obj.is_viewable_in_browser:
            return format_html('<a href="{}" target="_blank">📥 Ouvrir dans le navigateur</a>', obj.get_download_url())
        elif obj.fichier:
            return format_html('<a href="{}" download>⬇️ Télécharger</a>', obj.get_download_url())
        return "—"

    download_preview.short_description = "Téléchargement"

    @admin.action(description="✅ Activer les documents sélectionnés")
    def activer_documents(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} document(s) activé(s).")

    @admin.action(description="🚫 Désactiver les documents sélectionnés")
    def desactiver_documents(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} document(s) désactivé(s).")

    def save_model(self, request, obj, form, change):
        if not obj.pk and not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
