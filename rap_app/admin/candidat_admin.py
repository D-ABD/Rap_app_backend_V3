import logging

from django.contrib import admin, messages
from django.contrib.admin.sites import NotRegistered
from django.utils.translation import gettext_lazy as _

from ..models.candidat import Candidat as CandidatModel
from ..models.candidat import HistoriquePlacement
from ..services.candidate_lifecycle_service import CandidateLifecycleService

logger = logging.getLogger("application.candidats")


# ───────────────────────────────────────────────
# Inline : HistoriquePlacement
# ───────────────────────────────────────────────
class HistoriquePlacementInline(admin.TabularInline):
    model = HistoriquePlacement
    extra = 0
    can_delete = False
    ordering = ("-date_placement", "-id")
    readonly_fields = (
        "date_placement",
        "entreprise",
        "resultat",
        "responsable",
        "commentaire",
        "created_by",
        "created_at",
        "updated_at",
    )
    fields = readonly_fields
    verbose_name = _("Historique de placement")
    verbose_name_plural = _("Historique de placements")

    def has_add_permission(self, request, obj=None):
        return False


# ───────────────────────────────────────────────
# Admin principal : Candidat
# ───────────────────────────────────────────────
try:
    admin.site.unregister(CandidatModel)
except NotRegistered:
    pass


@admin.register(CandidatModel)
class CandidatAdmin(admin.ModelAdmin):
    """Administration complète des candidats."""

    date_hierarchy = "date_inscription"
    list_per_page = 50
    ordering = ("-date_inscription", "-id")

    list_display = (
        "id",
        "nom_complet",
        "email",
        "telephone",
        "ville",
        "statut",
        "formation",
        "cv_statut",
        "entretien_done",
        "test_is_ok",
        "admissible",
        "rqth",
        "resultat_placement",
        "entreprise_placement",
        "date_placement",
        "nb_appairages",
        "created_by",
        "created_at",
    )

    list_filter = (
        "statut",
        "cv_statut",
        "type_contrat",
        "disponibilite",
        "rqth",
        "admissible",
        "entretien_done",
        "test_is_ok",
        "formation",
        "entreprise_placement",
        "entreprise_validee",
        "resultat_placement",
        ("date_inscription", admin.DateFieldListFilter),
        ("date_placement", admin.DateFieldListFilter),
    )

    search_fields = (
        "id",
        "nom",
        "prenom",
        "email",
        "telephone",
        "ville",
        "code_postal",
        "numero_osia",
    )

    raw_id_fields = (
        "compte_utilisateur",
        "vu_par",
        "formation",
        "evenement",
        "responsable_placement",
        "entreprise_placement",
        "entreprise_validee",
        "placement_appairage",
        "created_by",
        "updated_by",
    )

    readonly_fields = (
        "id",
        "date_inscription",
        "created_by",
        "created_at",
        "updated_by",
        "updated_at",
        "nb_appairages",
    )

    fieldsets = (
        (
            _("Identité & contact"),
            {
                "fields": (
                    "nom",
                    "prenom",
                    "email",
                    "telephone",
                    "ville",
                    "code_postal",
                    "compte_utilisateur",
                )
            },
        ),
        (
            _("Parcours & profil"),
            {
                "fields": (
                    "statut",
                    "formation",
                    "evenement",
                    "cv_statut",
                    "entretien_done",
                    "test_is_ok",
                    "rqth",
                    "admissible",
                    "date_naissance",
                    "type_contrat",
                    "disponibilite",
                    "permis_b",
                    "communication",
                    "experience",
                    "csp",
                    "origine_sourcing",
                    "notes",
                )
            },
        ),
        (
            _("Placement (snapshot)"),
            {
                "fields": (
                    "responsable_placement",
                    "date_placement",
                    "entreprise_placement",
                    "resultat_placement",
                    "entreprise_validee",
                    "contrat_signe",
                    "numero_osia",
                    "placement_appairage",
                )
            },
        ),
        (
            _("Métadonnées"),
            {
                "fields": (
                    "vu_par",
                    "date_inscription",
                    "created_by",
                    "created_at",
                    "updated_by",
                    "updated_at",
                )
            },
        ),
    )

    inlines = [HistoriquePlacementInline]

    # ───────────────────────────────
    # Optimisation du queryset
    # ───────────────────────────────
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            "formation",
            "evenement",
            "entreprise_placement",
            "entreprise_validee",
            "responsable_placement",
            "compte_utilisateur",
            "vu_par",
            "placement_appairage",
            "created_by",
            "updated_by",
        )

    # ───────────────────────────────
    # Sauvegarde avec traçabilité
    # ───────────────────────────────
    def save_model(self, request, obj, form, change):
        obj.save(user=request.user)
        logger.info("💾 Candidat #%s sauvegardé par %s", obj.pk, request.user)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for inst in instances:
            try:
                inst.save(user=request.user)
            except TypeError:
                inst.save()
        formset.save_m2m()

    # ───────────────────────────────
    # Actions de masse utilitaires
    # ───────────────────────────────
    def _bulk_set(self, request, queryset, field, value, label=None):
        updated = 0
        for c in queryset:
            setattr(c, field, value)
            c.save(user=request.user)
            updated += 1
        msg = f"{updated} candidat(s) mis à jour ({field} = {label or value})."
        self.message_user(request, msg, level=messages.SUCCESS)
        logger.info(msg)

    # ---- Statut ----
    @admin.action(description="Statut → En appairage")
    def act_statut_appairage(self, request, queryset):
        self._bulk_set(request, queryset, "statut", CandidatModel.StatutCandidat.EN_APPAIRAGE)

    @admin.action(description="Statut → En formation")
    def act_statut_formation(self, request, queryset):
        ok = ko = 0
        for c in queryset:
            try:
                CandidateLifecycleService.start_formation(c, actor=request.user)
                ok += 1
            except Exception as e:
                ko += 1
                self.message_user(request, f"#{c.id} {c.nom_complet} : {e}", level=messages.ERROR)
        self.message_user(
            request,
            f"Transitions 'entrée en formation' : {ok} OK, {ko} erreur(s).",
            level=messages.SUCCESS,
        )

    @admin.action(description="Statut → Abandon")
    def act_statut_abandon(self, request, queryset):
        ok = ko = 0
        for c in queryset:
            try:
                CandidateLifecycleService.abandon(c, actor=request.user)
                ok += 1
            except Exception as e:
                ko += 1
                self.message_user(request, f"#{c.id} {c.nom_complet} : {e}", level=messages.ERROR)
        self.message_user(
            request,
            f"Transitions 'abandon' : {ok} OK, {ko} erreur(s).",
            level=messages.SUCCESS,
        )

    # ---- CV ----
    @admin.action(description="CV → Oui")
    def act_cv_oui(self, request, queryset):
        self._bulk_set(request, queryset, "cv_statut", CandidatModel.CVStatut.OUI)

    @admin.action(description="CV → En cours")
    def act_cv_en_cours(self, request, queryset):
        self._bulk_set(request, queryset, "cv_statut", CandidatModel.CVStatut.EN_COURS)

    @admin.action(description="CV → À modifier")
    def act_cv_a_modifier(self, request, queryset):
        self._bulk_set(request, queryset, "cv_statut", CandidatModel.CVStatut.A_MODIFIER)

    # ---- Entretien & tests ----
    @admin.action(description="Entretien réalisé → Oui")
    def act_entretien_on(self, request, queryset):
        self._bulk_set(request, queryset, "entretien_done", True, "✅ Oui")

    @admin.action(description="Entretien réalisé → Non")
    def act_entretien_off(self, request, queryset):
        self._bulk_set(request, queryset, "entretien_done", False, "❌ Non")

    @admin.action(description="Test OK → Oui")
    def act_test_on(self, request, queryset):
        self._bulk_set(request, queryset, "test_is_ok", True, "✅ Oui")

    @admin.action(description="Test OK → Non")
    def act_test_off(self, request, queryset):
        self._bulk_set(request, queryset, "test_is_ok", False, "❌ Non")

    # ---- Admissible ----
    @admin.action(description="Admissible → Oui")
    def act_admissible_on(self, request, queryset):
        self._bulk_set(request, queryset, "admissible", True, "✅ Oui")

    @admin.action(description="Admissible → Non")
    def act_admissible_off(self, request, queryset):
        self._bulk_set(request, queryset, "admissible", False, "❌ Non")

    # ---- Comptes utilisateurs ----
    @admin.action(description="Créer / poser un compte Stagiaire")
    def act_valider_stagiaire(self, request, queryset):
        ok = ko = 0
        for c in queryset:
            try:
                c.valider_comme_stagiaire(actor=request.user)
                ok += 1
            except Exception as e:
                ko += 1
                self.message_user(request, f"#{c.id} {c.nom_complet} : {e}", level=messages.ERROR)
        self.message_user(request, f"Comptes Stagiaire : {ok} OK, {ko} erreur(s).", level=messages.SUCCESS)

    @admin.action(description="Créer / poser un compte Candidat-User")
    def act_valider_candidat_user(self, request, queryset):
        ok = ko = 0
        for c in queryset:
            try:
                c.valider_comme_candidatuser(actor=request.user)
                ok += 1
            except Exception as e:
                ko += 1
                self.message_user(request, f"#{c.id} {c.nom_complet} : {e}", level=messages.ERROR)
        self.message_user(request, f"Comptes Candidat-User : {ok} OK, {ko} erreur(s).", level=messages.SUCCESS)

    actions = (
        "act_statut_appairage",
        "act_statut_formation",
        "act_statut_abandon",
        "act_cv_oui",
        "act_cv_en_cours",
        "act_cv_a_modifier",
        "act_entretien_on",
        "act_entretien_off",
        "act_test_on",
        "act_test_off",
        "act_admissible_on",
        "act_admissible_off",
        "act_valider_stagiaire",
        "act_valider_candidat_user",
    )


# ───────────────────────────────────────────────
# Admin secondaire : HistoriquePlacement
# ───────────────────────────────────────────────
@admin.register(HistoriquePlacement)
class HistoriquePlacementAdmin(admin.ModelAdmin):
    """Historique des placements de candidats."""

    date_hierarchy = "date_placement"
    list_display = (
        "id",
        "candidat",
        "entreprise",
        "resultat",
        "responsable",
        "date_placement",
        "created_by",
        "created_at",
    )
    list_filter = (
        "resultat",
        "entreprise",
        "responsable",
        ("date_placement", admin.DateFieldListFilter),
    )
    search_fields = (
        "id",
        "candidat__nom",
        "candidat__prenom",
        "entreprise__nom",
    )
    ordering = ("-date_placement", "-id")

    raw_id_fields = ("candidat", "entreprise", "responsable", "created_by", "updated_by")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        obj.save(user=request.user)
        logger.info("🧾 HistoriquePlacement #%s enregistré par %s", obj.pk, request.user)
