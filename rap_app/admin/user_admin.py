import csv
import logging
from io import StringIO

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.db.models import Q
from django.http import HttpResponse
from django.utils.html import format_html
from django.utils.timezone import localtime

from ..models.custom_user import CustomUser

logger = logging.getLogger("application.customuser")


# ───────────────────────────────────────────────
# ACTIONS ADMIN GLOBALES
# ───────────────────────────────────────────────
@admin.action(description="🎓 Passer en stagiaire")
def passer_en_stagiaire(modeladmin, request, queryset):
    updated = 0
    for user in queryset:
        if user.role != CustomUser.ROLE_STAGIAIRE:
            user._skip_candidate_sync = True  # 🚫 empêche le signal de recréer un user candidat
            user.role = CustomUser.ROLE_STAGIAIRE
            user.save()
            delattr(user, "_skip_candidate_sync")
            updated += 1
    if updated:
        messages.success(request, f"{updated} utilisateur(s) passé(s) au rôle « stagiaire ».")
        logger.info("🎓 %s utilisateur(s) passés en stagiaire par %s", updated, request.user)


@admin.action(description="📤 Exporter la sélection en CSV")
def export_csv(modeladmin, request, queryset):
    """Export CSV rapide depuis l’admin."""
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(CustomUser.get_csv_headers())
    for u in queryset:
        writer.writerow(
            [
                u.pk,
                u.email,
                u.username,
                u.first_name,
                u.last_name,
                u.get_role_display(),
                u.date_joined.strftime("%Y-%m-%d %H:%M") if u.date_joined else "",
                "Oui" if u.is_active else "Non",
            ]
        )
    buffer.seek(0)
    response = HttpResponse(buffer, content_type="text/csv")
    response["Content-Disposition"] = "attachment; filename=utilisateurs_export.csv"
    logger.info("📤 Export CSV %s lignes par %s", queryset.count(), request.user)
    return response


# ───────────────────────────────────────────────
# ADMIN PRINCIPAL : CustomUser
# ───────────────────────────────────────────────
@admin.register(CustomUser)
class CustomUserAdmin(DjangoUserAdmin):
    """
    🛠️ Interface d'administration pour CustomUser.
    - Seuls les rôles admin / superadmin peuvent y accéder.
    - Empêche la désynchronisation forcée Candidat <-> User quand un admin modifie un rôle.
    """

    model = CustomUser

    # Liste
    list_display = (
        "full_name_display",
        "email",
        "role_badge",
        "centres_display",
        "is_active",
        "is_staff",
        "is_superuser",
        "last_login_display",
        "date_joined_display",
    )
    list_filter = (
        "role",
        "is_active",
        "is_staff",
        "is_superuser",
        "centres",
        ("date_joined", admin.DateFieldListFilter),
    )
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("-date_joined",)
    list_per_page = 50

    readonly_fields = ("date_joined", "last_login", "avatar_preview")
    filter_horizontal = ("groups", "user_permissions", "centres")

    fieldsets = (
        (
            "🧾 Informations de connexion",
            {
                "fields": ("email", "username", "password"),
            },
        ),
        (
            "👤 Informations personnelles",
            {
                "fields": ("first_name", "last_name", "phone", "avatar", "avatar_preview", "bio"),
            },
        ),
        (
            "🏢 Portée par centres",
            {
                "fields": ("centres",),
                "description": "Les administrateurs peuvent attribuer des centres au staff.",
            },
        ),
        (
            "🔐 Permissions",
            {
                "fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions"),
            },
        ),
        (
            "🕒 Dates importantes",
            {
                "fields": ("last_login", "date_joined"),
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "username",
                    "password1",
                    "password2",
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "centres",
                ),
            },
        ),
    )

    actions = [passer_en_stagiaire, export_csv]

    # ───────────────────────────────
    # Permissions d'accès
    # ───────────────────────────────
    def has_view_permission(self, request, obj=None):
        """Seuls admin et superadmin peuvent voir le module."""
        return request.user.is_authenticated and (
            request.user.role in {CustomUser.ROLE_ADMIN, CustomUser.ROLE_SUPERADMIN}
        )

    def has_module_permission(self, request):
        return self.has_view_permission(request)

    def has_change_permission(self, request, obj=None):
        return self.has_view_permission(request)

    def has_delete_permission(self, request, obj=None):
        return self.has_view_permission(request)

    # ───────────────────────────────
    # Helpers d'affichage
    # ───────────────────────────────
    def full_name_display(self, obj):
        return obj.full_name or "—"

    full_name_display.short_description = "Nom complet"

    def role_badge(self, obj):
        """Affichage stylisé du rôle."""
        color = {
            CustomUser.ROLE_SUPERADMIN: "#b71c1c",
            CustomUser.ROLE_ADMIN: "#d84315",
            CustomUser.ROLE_COMMERCIAL: "#00897b",
            CustomUser.ROLE_CHARGE_RECRUTEMENT: "#5e35b1",
            CustomUser.ROLE_STAFF: "#1565c0",
            CustomUser.ROLE_STAFF_READ: "#0277bd",
            CustomUser.ROLE_STAGIAIRE: "#2e7d32",
            CustomUser.ROLE_CANDIDAT: "#6a1b9a",
            CustomUser.ROLE_CANDIDAT_USER: "#8e24aa",
            CustomUser.ROLE_PREPA_STAFF: "#f9a825",
            CustomUser.ROLE_DECLIC_STAFF: "#6d4c41",
            CustomUser.ROLE_TEST: "#757575",
        }.get(obj.role, "#444")
        return format_html(
            f'<span style="color:white; background:{color}; padding:2px 8px; border-radius:8px;">'
            f"{obj.get_role_display()}</span>"
        )

    role_badge.short_description = "Rôle"

    def centres_display(self, obj):
        noms = list(obj.centres.values_list("nom", flat=True))
        if not noms:
            return "—"
        text = ", ".join(noms[:3])
        if len(noms) > 3:
            text += f" +{len(noms) - 3}"
        return text

    centres_display.short_description = "Centres"

    def last_login_display(self, obj):
        return localtime(obj.last_login).strftime("%Y-%m-%d %H:%M") if obj.last_login else "—"

    last_login_display.short_description = "Dernière connexion"

    def date_joined_display(self, obj):
        return localtime(obj.date_joined).strftime("%Y-%m-%d %H:%M") if obj.date_joined else "—"

    date_joined_display.short_description = "Inscrit le"

    def avatar_preview(self, obj):
        if obj.avatar:
            return format_html('<img src="{}" style="max-height:80px; border-radius:5px;" />', obj.avatar.url)
        return "—"

    avatar_preview.short_description = "Aperçu de l’avatar"

    # ───────────────────────────────
    # Sauvegarde & logs
    # ───────────────────────────────
    def save_model(self, request, obj, form, change):
        """
        Désactive temporairement la synchronisation User↔Candidat
        quand un admin/superadmin modifie un utilisateur.
        """
        is_admin_like = (hasattr(request.user, "is_superadmin") and request.user.is_superadmin()) or (
            hasattr(request.user, "is_admin") and request.user.is_admin()
        )

        if is_admin_like:
            # ✅ Appel explicite de la méthode save() avec le flag
            obj.save(_skip_candidate_sync=True)
        else:
            # 🔹 Comportement normal pour les autres rôles
            super().save_model(request, obj, form, change)

        action = "créé" if not change else "modifié"
        logger.info(f"👤 Utilisateur {action} : {obj.email} par {request.user}")
