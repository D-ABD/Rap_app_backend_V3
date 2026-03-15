from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from ..models.statut import Statut


@admin.register(Statut)
class StatutAdmin(admin.ModelAdmin):
    """
    🏷️ Admin complet pour la gestion des statuts de formations.

    Améliorations :
    - Aperçu visuel du badge couleur.
    - Actions d’auto-réparation (réinitialiser les couleurs manquantes).
    - Filtrage et recherche améliorés.
    - Lecture seule sur les métadonnées.
    """

    list_display = (
        "badge_color",
        "nom_display",
        "description_autre",
        "couleur_display",
        "utilisation_display",
        "created_by_display",
        "created_at",
        "updated_at",
    )
    list_filter = ("nom", "created_at", "updated_at")
    search_fields = ("nom", "description_autre", "couleur")
    ordering = ("nom",)
    date_hierarchy = "created_at"

    readonly_fields = (
        "created_at",
        "updated_at",
        "badge_preview",
        "created_by",
    )

    actions = ["reinitialiser_couleurs"]

    fieldsets = (
        (
            _("🏷️ Informations générales"),
            {
                "fields": ("nom", "description_autre", "couleur", "badge_preview"),
            },
        ),
        (
            _("🧾 Métadonnées"),
            {
                "fields": ("created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    # ==== AFFICHAGE ====

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("created_by")

    def nom_display(self, obj):
        """Affiche le libellé user-friendly."""
        return obj.get_nom_display()

    nom_display.short_description = _("Libellé")

    def badge_color(self, obj):
        """Affiche le badge HTML de couleur."""
        return format_html(obj.get_badge_html())

    badge_color.short_description = _("Aperçu")

    def badge_preview(self, obj):
        """Prévisualisation du badge dans le formulaire d’édition."""
        if obj.pk:
            return format_html(obj.get_badge_html())
        return _("Le badge s’affichera après enregistrement.")

    badge_preview.short_description = _("Aperçu du badge")

    def couleur_display(self, obj):
        """Couleur affichée sous forme visuelle et texte."""
        if not obj.couleur:
            return format_html('<span style="color: #888;">(non définie)</span>')
        return format_html(
            '<span style="background-color:{}; color:white; padding:2px 6px; border-radius:3px;">{}</span>',
            obj.couleur,
            obj.couleur,
        )

    couleur_display.short_description = _("Couleur")

    def utilisation_display(self, obj):
        """Affiche combien de formations utilisent ce statut."""
        count = obj.formations.count()
        color = "#999" if count == 0 else "#007bff"
        return format_html('<span style="color:{};">{} formation(s)</span>', color, count)

    utilisation_display.short_description = _("Utilisation")

    def created_by_display(self, obj):
        """Affiche le créateur si connu."""
        return str(obj.created_by) if obj.created_by else "—"

    created_by_display.short_description = _("Créé par")

    # ==== ACTIONS ====

    @admin.action(description="🎨 Réinitialiser les couleurs manquantes")
    def reinitialiser_couleurs(self, request, queryset):
        """
        Réattribue les couleurs par défaut selon le nom du statut
        pour ceux qui n’en ont pas (ou qui ont un format invalide).
        """
        from ..models.statut import get_default_color

        updated = 0
        for statut in queryset:
            if not statut.couleur or not statut.couleur.startswith("#") or len(statut.couleur) != 7:
                statut.couleur = get_default_color(statut.nom)
                statut.save(skip_validation=True, user=request.user)
                updated += 1

        self.message_user(
            request,
            f"{updated} couleur(s) réinitialisée(s) selon les valeurs par défaut.",
            messages.SUCCESS if updated else messages.INFO,
        )

    # ==== LOGIQUE DE SAUVEGARDE ====

    def save_model(self, request, obj, form, change):
        """Assigne automatiquement le `created_by` si absent."""
        if not obj.pk and not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
