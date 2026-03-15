from django.contrib import admin, messages
from django.db.models import QuerySet
from django.utils.translation import gettext_lazy as _

from ..models import Appairage, HistoriqueAppairage
from ..models.appairage import AppairageStatut, AppairageActivite

class HistoriqueAppairageInline(admin.TabularInline):
    """Affiche l'historique d'un appairage en ligne dans l'admin."""
    model = HistoriqueAppairage
    extra = 0
    can_delete = False
    readonly_fields = ("date", "statut", "commentaire", "auteur")
    fields = ("date", "statut", "commentaire", "auteur")
    ordering = ("-date",)
    verbose_name = _("Historique")
    verbose_name_plural = _("Historiques d’appairages")

@admin.register(Appairage)
class AppairageAdmin(admin.ModelAdmin):
    """Administration des objets Appairage."""
    date_hierarchy = "date_appairage"
    ordering = ("-date_appairage", "-id")

    list_display = (
        "id",
        "candidat",
        "partenaire",
        "formation",
        "statut",
        "activite",
        "date_appairage",
        "created_by",
        "created_at",
    )
    list_filter = (
        "statut",
        "activite",
        ("date_appairage", admin.DateFieldListFilter),
        "partenaire",
        "formation",
    )
    search_fields = (
        "id",
        "candidat__nom",
        "candidat__prenom",
        "candidat__email",
        "partenaire__nom",
        "formation__intitule",
    )

    raw_id_fields = (
        "candidat",
        "partenaire",
        "formation",
        "created_by",
        "updated_by",
    )
    autocomplete_fields = ("candidat", "partenaire", "formation")

    readonly_fields = ("created_by", "created_at", "updated_at")
    fieldsets = (
        (_("Liaison"), {"fields": ("candidat", "partenaire", "formation")}),
        (
            _("Suivi de l’appairage"),
            {
                "fields": (
                    "date_appairage",
                    "statut",
                    "retour_partenaire",
                    "date_retour",
                    "activite",
                )
            },
        ),
        (_("Métadonnées"), {"fields": ("created_by", "created_at", "updated_at")}),
    )

    inlines = [HistoriqueAppairageInline]

    def get_queryset(self, request):
        """Optimise la récupération des objets liés."""
        qs = super().get_queryset(request)
        return qs.select_related("candidat", "partenaire", "formation", "created_by")

    def save_model(self, request, obj, form, change):
        """Enregistre l'objet avec l'utilisateur comme auteur."""
        obj.save(user=request.user)

    def save_formset(self, request, form, formset, change):
        """Enregistre les objets du formset avec l'utilisateur comme auteur si possible."""
        instances = formset.save(commit=False)
        for inst in instances:
            try:
                inst.save(user=request.user)
            except TypeError:
                inst.save()
        formset.save_m2m()

    def _bulk_set_statut(self, request, queryset: QuerySet[Appairage], new_statut: str):
        """Met à jour le statut de plusieurs appairages."""
        updated = 0
        for a in queryset:
            if a.statut != new_statut:
                a.statut = new_statut
                a.save(user=request.user)
                updated += 1
        if updated:
            self.message_user(
                request,
                _(f"{updated} appairage(s) mis à jour → {new_statut}"),
                level=messages.SUCCESS,
            )
        else:
            self.message_user(request, _("Aucun changement effectué."), level=messages.INFO)

    @admin.action(description="Statut → Transmis")
    def act_transmis(self, request, queryset):
        self._bulk_set_statut(request, queryset, AppairageStatut.TRANSMIS)

    @admin.action(description="Statut → En attente")
    def act_en_attente(self, request, queryset):
        self._bulk_set_statut(request, queryset, AppairageStatut.EN_ATTENTE)

    @admin.action(description="Statut → Accepté")
    def act_accepte(self, request, queryset):
        self._bulk_set_statut(request, queryset, AppairageStatut.ACCEPTE)

    @admin.action(description="Statut → Refusé")
    def act_refuse(self, request, queryset):
        self._bulk_set_statut(request, queryset, AppairageStatut.REFUSE)

    @admin.action(description="Statut → Annulé")
    def act_annule(self, request, queryset):
        self._bulk_set_statut(request, queryset, AppairageStatut.ANNULE)

    @admin.action(description="Statut → À faire")
    def act_a_faire(self, request, queryset):
        self._bulk_set_statut(request, queryset, AppairageStatut.A_FAIRE)

    @admin.action(description="Statut → Contrat à signer")
    def act_contrat_a_signer(self, request, queryset):
        self._bulk_set_statut(request, queryset, AppairageStatut.CONTRAT_A_SIGNER)

    @admin.action(description="Statut → Contrat en attente")
    def act_contrat_en_attente(self, request, queryset):
        self._bulk_set_statut(request, queryset, AppairageStatut.CONTRAT_EN_ATTENTE)

    @admin.action(description="Statut → Appairage OK")
    def act_appairage_ok(self, request, queryset):
        self._bulk_set_statut(request, queryset, AppairageStatut.APPAIRAGE_OK)

    @admin.action(description="Archiver les appairages sélectionnés")
    def act_archiver(self, request, queryset):
        """Archive les appairages sélectionnés."""
        updated = 0
        for app in queryset:
            if app.activite != AppairageActivite.ARCHIVE:
                app.archiver(user=request.user)
                updated += 1
        if updated:
            self.message_user(
                request,
                _(f"{updated} appairage(s) archivé(s)."),
                level=messages.SUCCESS,
            )
        else:
            self.message_user(request, _("Aucun appairage à archiver."), level=messages.INFO)

    @admin.action(description="Désarchiver les appairages sélectionnés")
    def act_desarchiver(self, request, queryset):
        """Désarchive les appairages sélectionnés."""
        updated = 0
        for app in queryset:
            if app.activite != AppairageActivite.ACTIF:
                app.desarchiver(user=request.user)
                updated += 1
        if updated:
            self.message_user(
                request,
                _(f"{updated} appairage(s) désarchivé(s)."),
                level=messages.SUCCESS,
            )
        else:
            self.message_user(request, _("Aucun appairage à désarchiver."), level=messages.INFO)

    actions = (
        "act_transmis",
        "act_en_attente",
        "act_accepte",
        "act_refuse",
        "act_annule",
        "act_a_faire",
        "act_contrat_a_signer",
        "act_contrat_en_attente",
        "act_appairage_ok",
        "act_archiver",
        "act_desarchiver",
    )

@admin.register(HistoriqueAppairage)
class HistoriqueAppairageAdmin(admin.ModelAdmin):
    """Administration des historiques d'appairage."""
    date_hierarchy = "date"
    ordering = ("-date", "-id")

    list_display = ("id", "appairage", "statut", "auteur", "date")
    list_filter = ("statut", ("date", admin.DateFieldListFilter), "auteur")
    search_fields = (
        "id",
        "appairage__id",
        "appairage__candidat__nom",
        "appairage__candidat__prenom",
        "appairage__partenaire__nom",
    )

    raw_id_fields = ("appairage", "auteur")
    readonly_fields = ("date", "statut", "auteur", "commentaire")

    fieldsets = (
        (None, {"fields": ("appairage", "statut", "commentaire", "auteur", "date")}),
    )
