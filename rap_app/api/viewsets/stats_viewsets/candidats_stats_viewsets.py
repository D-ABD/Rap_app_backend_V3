from __future__ import annotations

import logging
from typing import Iterable, Literal, Optional

from django.db import models
from django.db.models import Count, Q, Value
from django.db.models.functions import Coalesce, Substr
from django.utils.dateparse import parse_date
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from ...permissions import IsStaffOrAbove, is_staff_or_staffread
from ...roles import is_admin_like
from ...serializers.base_serializers import EmptySerializer

# rap_app/api/viewsets/stats_viewsets/candidats_stats_viewsets.py

# ViewSet DRF — Statistiques des candidats (scope centre + département + appairages)
# =============================================================================
# DOCUMENTATION API
#
# Ce fichier expose des endpoints de statistiques agrégées sur les objets "Candidat".
#
# ▶️ Endpoints principaux :
#   - GET /candidat-stats/                  → KPIs globaux candidats (action "list")
#   - GET /candidat-stats/grouped/?by=...  → KPIs groupés (action @action "grouped")
#
# Permissions & filtrage d’accès, structure de réponse, intention métier : cf. docstrings plus bas.
# =============================================================================






logger = logging.getLogger("application.candidat_stats")

try:
    from ..permissions import IsOwnerOrStaffOrAbove  # type: ignore
except Exception:  # pragma: no cover
    IsOwnerOrStaffOrAbove = IsAuthenticated

try:
    from ..mixins import RestrictToUserOwnedQueryset  # type: ignore
except Exception:  # pragma: no cover

    class RestrictToUserOwnedQueryset:  # stub minimal
        def restrict_queryset_to_user(self, qs):
            return qs


# ⚠️ adaptez l'import à votre arborescence
from ....models.candidat import Candidat

GroupKey = Literal[
    "centre",
    "departement",
    "formation",
    "statut",
    "statut_metier",
    "parcours_phase",
    "type_contrat",
    "cv_statut",
    "resultat_placement",
    "contrat_signe",
    "responsable",
    "entreprise",
]


def _poei_poec_values() -> list[str]:
    """
    Support des valeurs historiques et de la nouvelle valeur unique.
    """
    return [
        "poei",
        "poe_i",
        "poec",
        "poe_c",
        getattr(Candidat.TypeContrat, "POEI_POEC", "poei_poec"),
    ]


def _candidate_phase_equals(value: str) -> Q:
    return Q(parcours_phase=value)


def _candidate_en_formation_q() -> Q:
    return (
        Q(parcours_phase=Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION)
        | Q(statut=Candidat.StatutCandidat.EN_FORMATION)
    )


def _candidate_inscrit_valide_q() -> Q:
    return Q(parcours_phase=Candidat.ParcoursPhase.INSCRIT_VALIDE)


def _candidate_statut_metier_q(value: str, prefix: str = "") -> Q:
    return Candidat.statut_metier_q(value, prefix=prefix)


# =============================================================================
class CandidatStatsViewSet(RestrictToUserOwnedQueryset, GenericViewSet):
    """
    Statistiques agrégées sur les candidats visibles par l'utilisateur courant.

    Le périmètre combine la permission staff/admin, un éventuel mixin de
    restriction propriétaire et un scoping par centres ou départements.

    Les endpoints exposent des KPI globaux (`list`) et des agrégats groupés
    (`grouped`). Les réponses sont construites manuellement plutôt que via des
    serializers de sortie DRF.

    En plus des champs legacy, ce viewset expose désormais une lecture métier
    unifiée des statuts candidat (candidat, non admissible, admissible,
    accompagnement TRE, appairage, GESPERS, formation, abandon).
    """

    serializer_class = EmptySerializer

    # Permissions : voir docstring de la classe.
    permission_classes = [IsStaffOrAbove]

    # ───────────────────────────────
    # Helpers périmètre staff
    # ───────────────────────────────

    def _is_admin_like(self, user) -> bool:
        """
        Détermine si un utilisateur possède un rôle admin/superadmin global.
        """
        return is_admin_like(user)

    def _staff_centre_ids(self, user) -> Optional[list[int]]:
        """
        Retourne la liste des IDs de centres (foreign key) auxquels l'utilisateur staff a accès.
        Si admin-like, retourne None (= pas de restriction).
        """
        if self._is_admin_like(user):
            return None
        if is_staff_or_staffread(user) and hasattr(user, "centres"):
            return list(user.centres.values_list("id", flat=True))
        return []

    def _staff_departement_codes(self, user) -> list[str]:
        """
        Retourne la liste des codes départementaux (2 chiffres) auxquels l'utilisateur a accès
        (récupérés depuis "departements_codes" ou "departements" sur user ou user.profile).
        """

        def _norm_codes(val):
            if val is None:
                return []
            if hasattr(val, "all"):  # M2M
                return list({str(getattr(o, "code", o))[:2] for o in val.all() if o})
            if isinstance(val, (list, tuple, set)):
                return list({str(x)[:2] for x in val if x})
            s = str(val).strip()
            return [s[:2]] if s else []

        for owner in (user, getattr(user, "profile", None)):
            if not owner:
                continue
            for attr in ("departements_codes", "departements"):
                if hasattr(owner, attr):
                    codes = _norm_codes(getattr(owner, attr))
                    if codes:
                        return codes
        return []

    def _scope_candidats_for_user(self, qs, user):
        """
        Filtre le QuerySet de candidats pour appliquer les règles de visibilité selon le rôle utilisateur.

        - admin/superadmin : pas de restriction, accès total.
        - staff           : candidats uniquement liés à ses centres ou codes départementaux.
            - Soit via formation.centre (ForeignKey)
            - Soit via code_postal (données du candidat lui-même, fallback)
        - non-staff       : sans restriction, sauf si RestrictToUserOwnedQueryset fournit un filtrage propriétaire.

        Si aucun centre/département n’est trouvé pour un staff, retourne un queryset vide.

        Permissions dépendantes en partie de "is_staff_or_staffread" — la logique et le mapping précis sont hors-champ de ce fichier.
        """
        if not (user and user.is_authenticated):
            return qs.none()

        if self._is_admin_like(user):
            return qs

        if is_staff_or_staffread(user):
            centre_ids = self._staff_centre_ids(user)
            dep_codes = self._staff_departement_codes(user)

            if not centre_ids and not dep_codes:
                return qs.none()

            q = Q()
            if centre_ids:
                q |= Q(formation__centre_id__in=centre_ids)
            if dep_codes:
                q_dep = Q()
                for code in dep_codes:
                    q_dep |= Q(formation__centre__code_postal__startswith=code) | Q(code_postal__startswith=code)
                q |= q_dep

            return qs.filter(q).distinct()

        return qs

    # ───────────────────────────────
    # Data / QuerySet principal
    # ───────────────────────────────
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="avec_archivees",
                type=bool,
                required=False,
                description="Inclure les candidats liés à des formations archivées (true/false)",
            ),
        ],
    )
    def get_queryset(self):
        """
        Construit le queryset filtré de Candidats selon la portée utilisateur + des options GET.

        1. Le filtre principal applique le scope défini par _scope_candidats_for_user().
        2. Si "avec_archivees" non présent ou à false, exclut les candidats des formations archivées.
        3. Pour les utilisateurs autres que 'staff'/'admin', applique potentiellement le mixin RestrictToUserOwnedQueryset (dépend d’une implémentation non visible ici).

        WARNING : Pas de filter_backends/search_fields déclarés ici.
        """
        qs = Candidat.objects.select_related(
            "formation",
            "formation__centre",
            "entreprise_placement",
            "responsable_placement",
        )
        # 1️⃣ Scope utilisateur
        qs = self._scope_candidats_for_user(qs, getattr(self.request, "user", None))

        # 2️⃣ Gestion des formations archivées : exclusion par défaut, sauf si demandé.
        inclure_archivees = str(self.request.query_params.get("avec_archivees", "false")).lower() in [
            "1",
            "true",
            "yes",
            "on",
        ]
        if not inclure_archivees:
            qs = qs.exclude(formation__activite="archivee")

        # 3️⃣ Restriction "owned" éventuelle si utilisateur non staff/admin
        user = getattr(self.request, "user", None)
        is_staff_like = bool(
            user
            and (
                getattr(user, "is_superuser", False)
                or is_staff_or_staffread(user)
                or (hasattr(user, "is_admin") and callable(user.is_admin) and user.is_admin())
            )
        )
        if not is_staff_like and hasattr(self, "restrict_queryset_to_user"):
            qs = self.restrict_queryset_to_user(qs)
        return qs

    # Bool parsing
    @staticmethod
    def _as_bool(v: str | None) -> Optional[bool]:
        if v is None:
            return None
        return str(v).lower() in {"1", "true", "t", "yes", "on"}

    def _apply_common_filters(self, qs):
        """
        Applique les filtres GET communs à tous les endpoints statistiques :
         - date_from, date_to (sur 'date_inscription')
         - formation, centre, departement (matching sur formation__centre/code_postal)
         - statut, type_contrat, cv_statut, resultat_placement, contrat_signe, responsable, entreprise
         - Flags booléens : entretien_ok, test_ok, gespers, admissible, rqth
        """
        p = self.request.query_params

        dfrom = parse_date(p.get("date_from") or "") if p.get("date_from") else None
        dto = parse_date(p.get("date_to") or "") if p.get("date_to") else None
        if dfrom:
            qs = qs.filter(date_inscription__date__gte=dfrom)
        if dto:
            qs = qs.filter(date_inscription__date__lte=dto)

        if p.get("formation"):
            qs = qs.filter(formation_id=p.get("formation"))
        if p.get("centre"):
            qs = qs.filter(formation__centre_id=p.get("centre"))

        # Département — couvre CP du centre **ou** du candidat (cohérent avec le scope staff)
        if p.get("departement"):
            dep = str(p.get("departement"))[:2]
            qs = qs.filter(Q(formation__centre__code_postal__startswith=dep) | Q(code_postal__startswith=dep))

        if p.get("statut"):
            qs = qs.filter(statut=p.get("statut"))
        if p.get("type_contrat"):
            qs = qs.filter(type_contrat=p.get("type_contrat"))
        if p.get("cv_statut"):
            qs = qs.filter(cv_statut=p.get("cv_statut"))
        if p.get("resultat_placement"):
            qs = qs.filter(resultat_placement=p.get("resultat_placement"))
        if p.get("contrat_signe"):
            qs = qs.filter(contrat_signe=p.get("contrat_signe"))
        if p.get("responsable"):
            qs = qs.filter(responsable_placement_id=p.get("responsable"))
        if p.get("enterprise") or p.get("entreprise"):  # tolère une typo
            qs = qs.filter(entreprise_placement_id=p.get("enterprise") or p.get("entreprise"))

        b = self._as_bool
        if (v := b(p.get("entretien_ok"))) is not None:
            qs = qs.filter(entretien_done=v)
        if (v := b(p.get("test_ok"))) is not None:
            qs = qs.filter(test_is_ok=v)
        if (v := b(p.get("gespers"))) is not None:
            qs = qs.filter(inscrit_gespers=v)
        if (v := b(p.get("admissible"))) is not None:
            qs = qs.filter(admissible=v)
        if (v := b(p.get("rqth"))) is not None:
            qs = qs.filter(rqth=v)

        return qs

    # ---------- résolution de libellés pour FK ----------
    @staticmethod
    def _guess_label_field(model: type[models.Model]) -> Optional[str]:
        """Tente de trouver un champ 'nom', 'name', 'label', etc. pour les FK utilisés dans les regroupements."""
        preferred = {
            "nom",
            "name",
            "label",
            "libelle",
            "libellé",
            "titre",
            "username",
            "email",
            "first_name",
            "last_name",
        }
        name_map = {f.name: f for f in model._meta.get_fields() if isinstance(f, models.Field)}
        for cand in preferred:
            f = name_map.get(cand)
            if f and isinstance(f, models.CharField):
                return cand
        for f in model._meta.get_fields():
            if isinstance(f, models.CharField):
                return f.name
        return None

    def _fk_label_map(self, model: type[models.Model], ids: Iterable[int | str]) -> dict[int | str, str]:
        """
        Produit un mapping id → libellé pour affichage groupé sur les foreign keys (ex: users, entreprises, etc.).
        """
        ids_list = [i for i in ids if i is not None]
        if not ids_list:
            return {}

        # cas particulier: utilisateur → full_name || email || username
        if getattr(model, "__name__", "") in {"User", "CustomUser"}:
            rows = model.objects.filter(pk__in=ids_list).values("pk", "first_name", "last_name", "email", "username")
            out: dict[int | str, str] = {}
            for r in rows:
                full = f"{(r.get('first_name') or '').strip()} {(r.get('last_name') or '').strip()}".strip()
                out[r["pk"]] = full or r.get("email") or r.get("username") or f"User #{r['pk']}"
            return out

        label_field = self._guess_label_field(model)
        if label_field:
            rows = model.objects.filter(pk__in=ids_list).values_list("pk", label_field)
            return {pk: (label or f"{model.__name__} #{pk}") for pk, label in rows}
        objs = model.objects.filter(pk__in=ids_list)
        return {obj.pk: str(obj) for obj in objs}

    # ───────────────────────────────
    # LIST — KPIs globaux
    # ───────────────────────────────
    def list(self, request, *args, **kwargs):
        """
        Endpoint GET /candidat-stats/
        ---------------------------------
        ▶️ Objectif :
            Retourner la synthèse globale des candidats sur le périmètre autorisé de l'utilisateur.

        ▶️ Permissions :
            - Restreint à : admin/superadmin, staff (via permission_classes).
            - Les droits d’accès sont ensuite affinés par centre/département et filtrage de visibilité (voir get_queryset).

        ▶️ Filtres GET disponibles (voir _apply_common_filters) :
            - Dates d'inscription (date_from, date_to)
            - formation, centre, departement, statut, type_contrat, cv_statut, resultat_placement,
              contrat_signe, responsable, entreprise, entretien_ok, test_ok, gespers, admissible, rqth

        ▶️ Format de réponse (extrait du code, contractuel sur ce point) :

        {
            "kpis": {           # agrégat global
                "total": int,
                "entretien_ok": int,
                "test_ok": int,
                ...
            },
            "appairages": {     # KPIs sur la table de relation appairages
                "appairages_total": int,
                ...
            },
            "repartition": {    # Répartitions par valeurs distinctes
                "par_statut": [ { "statut": ..., "count": ... }, ... ],
                "par_type_contrat": [ ... ],
                "par_cv": [ ... ],
                "par_resultat": [ ... ],
            },
            "filters_echo": { ... } # copie brute des paramètres GET appliqués
        }

        ▶️ Aucune action de modification ou suppression n'est disponible via ce ViewSet.
        """
        qs = self._apply_common_filters(self.get_queryset())

        # KPI candidats + appairages en une seule agrégation SQL.
        stats = qs.aggregate(
            total=Count("id", distinct=True),
            entretien_ok=Count("id", filter=Q(entretien_done=True), distinct=True),
            test_ok=Count("id", filter=Q(test_is_ok=True), distinct=True),
            gespers=Count("id", filter=Q(inscrit_gespers=True), distinct=True),
            admissibles=Count("id", filter=Q(admissible=True), distinct=True),
            non_admissibles=Count(
                "id",
                filter=_candidate_statut_metier_q(Candidat.StatutMetier.NON_ADMISSIBLE),
                distinct=True,
            ),
            en_formation=Count(
                "id",
                filter=_candidate_statut_metier_q(Candidat.StatutMetier.EN_FORMATION),
                distinct=True,
            ),
            en_appairage=Count(
                "id",
                filter=_candidate_statut_metier_q(Candidat.StatutMetier.EN_APPAIRAGE),
                distinct=True,
            ),
            en_accompagnement=Count(
                "id",
                filter=_candidate_statut_metier_q(Candidat.StatutMetier.EN_ACCOMPAGNEMENT_TRE),
                distinct=True,
            ),
            inscrits_valides=Count("id", filter=_candidate_inscrit_valide_q(), distinct=True),
            inscrits_gespers=Count(
                "id",
                filter=_candidate_statut_metier_q(Candidat.StatutMetier.INSCRIT_GESPERS),
                distinct=True,
            ),
            stagiaires_en_formation=Count(
                "id",
                filter=_candidate_phase_equals(Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION),
                distinct=True,
            ),
            sortis=Count("id", filter=_candidate_phase_equals(Candidat.ParcoursPhase.SORTI), distinct=True),
            abandons_phase=Count("id", filter=_candidate_phase_equals(Candidat.ParcoursPhase.ABANDON), distinct=True),
            # ⭐️ nouveaux compteurs
            osia_count=Count("id", filter=Q(numero_osia__isnull=False) & ~Q(numero_osia=""), distinct=True),
            cv_renseigne=Count("id", filter=Q(cv_statut__isnull=False) & ~Q(cv_statut=""), distinct=True),
            courrier_rentree_count=Count("id", filter=Q(courrier_rentree=True), distinct=True),
            # 🆕 Ateliers TRE — nombre d'ateliers distincts impliquant ≥1 candidat du périmètre
            ateliers_tre_total=Count("ateliers_tre", distinct=True),
            # contrats (POEI/POEC fusionnés)
            contrat_apprentissage=Count("id", filter=Q(type_contrat=Candidat.TypeContrat.APPRENTISSAGE), distinct=True),
            contrat_professionnalisation=Count(
                "id", filter=Q(type_contrat=Candidat.TypeContrat.PROFESSIONNALISATION), distinct=True
            ),
            contrat_poei_poec=Count("id", filter=Q(type_contrat__in=_poei_poec_values()), distinct=True),
            contrat_sans=Count("id", filter=Q(type_contrat=Candidat.TypeContrat.SANS_CONTRAT), distinct=True),
            contrat_crif=Count("id", filter=Q(type_contrat=Candidat.TypeContrat.CRIF), distinct=True),
            contrat_autre=Count("id", filter=Q(type_contrat=Candidat.TypeContrat.AUTRE), distinct=True),
            appairages_total=Count("appairages", distinct=True),
            app_transmis=Count("appairages", filter=Q(appairages__statut="transmis"), distinct=True),
            app_en_attente=Count("appairages", filter=Q(appairages__statut="en_attente"), distinct=True),
            app_accepte=Count("appairages", filter=Q(appairages__statut="accepte"), distinct=True),
            app_refuse=Count("appairages", filter=Q(appairages__statut="refuse"), distinct=True),
            app_annule=Count("appairages", filter=Q(appairages__statut="annule"), distinct=True),
            app_a_faire=Count("appairages", filter=Q(appairages__statut="a_faire"), distinct=True),
            app_contrat_a_signer=Count("appairages", filter=Q(appairages__statut="contrat a signer"), distinct=True),
            app_contrat_en_attente=Count(
                "appairages", filter=Q(appairages__statut="contrat en attente"), distinct=True
            ),
            app_appairage_ok=Count("appairages", filter=Q(appairages__statut="appairage ok"), distinct=True),
        )
        kpi_keys = {
            "total",
            "entretien_ok",
            "test_ok",
            "gespers",
            "admissibles",
            "non_admissibles",
            "en_formation",
            "en_appairage",
            "en_accompagnement",
            "inscrits_valides",
            "inscrits_gespers",
            "stagiaires_en_formation",
            "sortis",
            "abandons_phase",
            "osia_count",
            "cv_renseigne",
            "courrier_rentree_count",
            "ateliers_tre_total",
            "contrat_apprentissage",
            "contrat_professionnalisation",
            "contrat_poei_poec",
            "contrat_sans",
            "contrat_crif",
            "contrat_autre",
        }
        kpis = {key: stats[key] for key in kpi_keys}
        app = {key: value for key, value in stats.items() if key not in kpi_keys}

        # Répartitions principales
        rep_statut = list(qs.values("statut").annotate(count=Count("id", distinct=True)).order_by("statut"))
        rep_parcours_phase = list(
            qs.values("parcours_phase").annotate(count=Count("id", distinct=True)).order_by("parcours_phase")
        )
        rep_statut_metier = [
            {"statut_metier": status, "count": qs.filter(_candidate_statut_metier_q(status)).count()}
            for status, _label in Candidat.StatutMetier.choices
        ]
        rep_type_contrat = list(
            qs.values("type_contrat").annotate(count=Count("id", distinct=True)).order_by("type_contrat")
        )
        rep_cv = list(qs.values("cv_statut").annotate(count=Count("id", distinct=True)).order_by("cv_statut"))
        rep_resultat = list(
            qs.values("resultat_placement").annotate(count=Count("id", distinct=True)).order_by("resultat_placement")
        )

        payload = {
            "kpis": {k: int(v or 0) for k, v in kpis.items()},
            "appairages": {k: int(v or 0) for k, v in app.items()},
            "repartition": {
                "par_statut": rep_statut,
                "par_statut_metier": rep_statut_metier,
                "par_parcours_phase": rep_parcours_phase,
                "par_type_contrat": rep_type_contrat,
                "par_cv": rep_cv,
                "par_resultat": rep_resultat,
            },
            "filters_echo": {k: v for k, v in request.query_params.items()},
        }
        logger.debug("CandidatStats overview computed (total=%s)", payload["kpis"]["total"])
        return Response(payload)

    # ───────────────────────────────
    # GROUPED — par centre / département / …
    # ───────────────────────────────
    @action(detail=False, methods=["GET"], url_path="grouped")
    def grouped(self, request):
        """
        Endpoint GET /candidat-stats/grouped/?by=....
        ---------------------------------------------
        ▶️ Objectif métier :
          - Fournir en une seule requête les statistiques agrégées, groupées selon une clé métier :
            - centre, departement, formation, statut, type_contrat, cv_statut,
              resultat_placement, contrat_signe, responsable, entreprise

        ▶️ Permissions & scope :
          - Identique à list() : accès staff/admin, visibilité filtrée par scope métier.
          - Aucune permission action personnalisée.

        ▶️ Paramètre GET requis :
          - by : (obligatoire) clé de regroupement (centre, departement, ...).
            Si absent, valeur défaut = 'centre'.
            Si mauvaise valeur : code HTTP 400.

        ▶️ Structure de réponse (extrait contractuel du code) :

        {
          "group_by": <clé string, ex: "centre">,
          "results": [
            {
              <group_fields...>,          # cf mapping group_fields_map
              "total": ...,
              "entretien_ok": ...,
              ...
              "group_key": ...,
              "group_label": ...,
              ... (autres colonnes contextuelles selon le groupement)
            },
            ...
          ]
        }

        ▶️ La granularité de group_label/group_key dépend du type de regroupement.
        ▶️ Les libellés humains pour les FK sont résolus si possible.
        """
        by: GroupKey = (request.query_params.get("by") or "centre").lower()  # type: ignore[assignment]
        if by not in {
            "centre",
            "departement",
            "formation",
            "statut",
            "statut_metier",
            "parcours_phase",
            "type_contrat",
            "cv_statut",
            "resultat_placement",
            "contrat_signe",
            "responsable",
            "entreprise",
        }:
            return Response({"success": False, "message": "Paramètre 'by' invalide.", "data": None}, status=400)

        qs = self._apply_common_filters(self.get_queryset()).annotate(
            departement=Coalesce(Substr("formation__centre__code_postal", 1, 2), Value("NA"))
        )

        # Mapping logique entre le paramètre 'by' et les champs à extraire/group_by.
        group_fields_map = {
            "centre": ["formation__centre_id", "formation__centre__nom", "formation__num_offre"],
            "departement": ["departement"],
            "formation": ["formation_id", "formation__nom", "formation__num_offre"],
            "statut": ["statut"],
            "parcours_phase": ["parcours_phase"],
            "statut_metier": [],
            "type_contrat": ["type_contrat"],
            "cv_statut": ["cv_statut"],
            "resultat_placement": ["resultat_placement"],
            "contrat_signe": ["contrat_signe"],
            "responsable": ["responsable_placement_id"],
            "entreprise": ["entreprise_placement_id", "entreprise_placement__nom"],
        }

        if by == "statut_metier":
            rows = []
            for status_value, status_label in Candidat.StatutMetier.choices:
                grouped_qs = qs.filter(_candidate_statut_metier_q(status_value))
                rows.append(
                    {
                        "group_key": status_value,
                        "group_label": status_label,
                        "total": grouped_qs.values("id").distinct().count(),
                        "entretien_ok": grouped_qs.filter(entretien_done=True).values("id").distinct().count(),
                        "test_ok": grouped_qs.filter(test_is_ok=True).values("id").distinct().count(),
                        "gespers": grouped_qs.filter(inscrit_gespers=True).values("id").distinct().count(),
                        "admissibles": grouped_qs.filter(admissible=True).values("id").distinct().count(),
                        "non_admissibles": grouped_qs.filter(
                            _candidate_statut_metier_q(Candidat.StatutMetier.NON_ADMISSIBLE)
                        )
                        .values("id")
                        .distinct()
                        .count(),
                        "en_formation": grouped_qs.filter(_candidate_en_formation_q()).values("id").distinct().count(),
                        "en_appairage": grouped_qs.filter(
                            _candidate_statut_metier_q(Candidat.StatutMetier.EN_APPAIRAGE)
                        )
                        .values("id")
                        .distinct()
                        .count(),
                        "en_accompagnement": grouped_qs.filter(
                            _candidate_statut_metier_q(Candidat.StatutMetier.EN_ACCOMPAGNEMENT_TRE)
                        )
                        .values("id")
                        .distinct()
                        .count(),
                        "inscrits_valides": grouped_qs.filter(_candidate_inscrit_valide_q())
                        .values("id")
                        .distinct()
                        .count(),
                        "inscrits_gespers": grouped_qs.filter(
                            _candidate_statut_metier_q(Candidat.StatutMetier.INSCRIT_GESPERS)
                        )
                        .values("id")
                        .distinct()
                        .count(),
                        "stagiaires_en_formation": grouped_qs.filter(
                            _candidate_phase_equals(Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION)
                        )
                        .values("id")
                        .distinct()
                        .count(),
                        "sortis": grouped_qs.filter(_candidate_phase_equals(Candidat.ParcoursPhase.SORTI))
                        .values("id")
                        .distinct()
                        .count(),
                        "abandons_phase": grouped_qs.filter(
                            _candidate_phase_equals(Candidat.ParcoursPhase.ABANDON)
                        )
                        .values("id")
                        .distinct()
                        .count(),
                        "rqth_count": grouped_qs.filter(rqth=True).values("id").distinct().count(),
                        "osia_count": grouped_qs.exclude(numero_osia__isnull=True)
                        .exclude(numero_osia="")
                        .values("id")
                        .distinct()
                        .count(),
                        "cv_renseigne": grouped_qs.exclude(cv_statut__isnull=True)
                        .exclude(cv_statut="")
                        .values("id")
                        .distinct()
                        .count(),
                        "courrier_rentree_count": grouped_qs.filter(courrier_rentree=True)
                        .values("id")
                        .distinct()
                        .count(),
                        "ateliers_tre_total": grouped_qs.values("ateliers_tre").distinct().count(),
                        "appairages_total": grouped_qs.values("appairages").distinct().count(),
                    }
                )
            logger.debug("CandidatStats grouped by %s → %d lignes", by, len(rows))
            return Response({"group_by": by, "results": rows})

        fields = group_fields_map[by]

        rows = list(
            qs.values(*fields)
            .annotate(
                total=Count("id", distinct=True),
                entretien_ok=Count("id", filter=Q(entretien_done=True), distinct=True),
                test_ok=Count("id", filter=Q(test_is_ok=True), distinct=True),
                gespers=Count("id", filter=Q(inscrit_gespers=True), distinct=True),
                admissibles=Count("id", filter=Q(admissible=True), distinct=True),
                non_admissibles=Count(
                    "id",
                    filter=_candidate_statut_metier_q(Candidat.StatutMetier.NON_ADMISSIBLE),
                    distinct=True,
                ),
                en_formation=Count(
                    "id",
                    filter=_candidate_statut_metier_q(Candidat.StatutMetier.EN_FORMATION),
                    distinct=True,
                ),
                en_appairage=Count(
                    "id",
                    filter=_candidate_statut_metier_q(Candidat.StatutMetier.EN_APPAIRAGE),
                    distinct=True,
                ),
                en_accompagnement=Count(
                    "id",
                    filter=_candidate_statut_metier_q(Candidat.StatutMetier.EN_ACCOMPAGNEMENT_TRE),
                    distinct=True,
                ),
                inscrits_valides=Count("id", filter=_candidate_inscrit_valide_q(), distinct=True),
                inscrits_gespers=Count(
                    "id",
                    filter=_candidate_statut_metier_q(Candidat.StatutMetier.INSCRIT_GESPERS),
                    distinct=True,
                ),
                stagiaires_en_formation=Count(
                    "id",
                    filter=_candidate_phase_equals(Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION),
                    distinct=True,
                ),
                sortis=Count("id", filter=_candidate_phase_equals(Candidat.ParcoursPhase.SORTI), distinct=True),
                abandons_phase=Count(
                    "id",
                    filter=_candidate_phase_equals(Candidat.ParcoursPhase.ABANDON),
                    distinct=True,
                ),
                # ⭐️ nouveaux compteurs (groupés)
                rqth_count=Count("id", filter=Q(rqth=True), distinct=True),
                osia_count=Count("id", filter=Q(numero_osia__isnull=False) & ~Q(numero_osia=""), distinct=True),
                cv_renseigne=Count("id", filter=Q(cv_statut__isnull=False) & ~Q(cv_statut=""), distinct=True),
                courrier_rentree_count=Count("id", filter=Q(courrier_rentree=True), distinct=True),
                # 🆕 Ateliers TRE — nombre d'ateliers distincts impliquant ≥1 candidat du groupe
                ateliers_tre_total=Count("ateliers_tre", distinct=True),
                # contrats (POEI/POEC fusionnés)
                contrat_apprentissage=Count(
                    "id", filter=Q(type_contrat=Candidat.TypeContrat.APPRENTISSAGE), distinct=True
                ),
                contrat_professionnalisation=Count(
                    "id", filter=Q(type_contrat=Candidat.TypeContrat.PROFESSIONNALISATION), distinct=True
                ),
                contrat_poei_poec=Count("id", filter=Q(type_contrat__in=_poei_poec_values()), distinct=True),
                contrat_sans=Count("id", filter=Q(type_contrat=Candidat.TypeContrat.SANS_CONTRAT), distinct=True),
                contrat_autre=Count("id", filter=Q(type_contrat=Candidat.TypeContrat.AUTRE), distinct=True),
                contrat_crif=Count("id", filter=Q(type_contrat=Candidat.TypeContrat.CRIF), distinct=True),
                # appairages (distinct pour éviter les doublons)
                appairages_total=Count("appairages", distinct=True),
                app_transmis=Count("appairages", filter=Q(appairages__statut="transmis"), distinct=True),
                app_en_attente=Count("appairages", filter=Q(appairages__statut="en_attente"), distinct=True),
                app_accepte=Count("appairages", filter=Q(appairages__statut="accepte"), distinct=True),
                app_refuse=Count("appairages", filter=Q(appairages__statut="refuse"), distinct=True),
                app_annule=Count("appairages", filter=Q(appairages__statut="annule"), distinct=True),
                app_a_faire=Count("appairages", filter=Q(appairages__statut="a_faire"), distinct=True),
                app_contrat_a_signer=Count(
                    "appairages", filter=Q(appairages__statut="contrat a signer"), distinct=True
                ),
                app_contrat_en_attente=Count(
                    "appairages", filter=Q(appairages__statut="contrat en attente"), distinct=True
                ),
                app_appairage_ok=Count("appairages", filter=Q(appairages__statut="appairage ok"), distinct=True),
            )
            .order_by(*fields)
        )

        # Ajout de group_key / group_label selon la clé de regroupement demandée.
        if by == "centre":
            for r in rows:
                r["group_key"] = r.get("formation__centre_id")
                r["group_label"] = r.get("formation__centre__nom") or (
                    f"Centre #{r.get('formation__centre_id')}" if r.get("formation__centre_id") is not None else "—"
                )
        elif by == "departement":
            for r in rows:
                r["group_key"] = r.get("departement")
                r["group_label"] = r.get("departement") or "—"
        elif by == "formation":
            for r in rows:
                r["group_key"] = r.get("formation_id")
                num = r.get("formation__num_offre")
                nom = r.get("formation__nom")
                if nom and num:
                    r["group_label"] = f"{nom} ({num})"
                else:
                    r["group_label"] = nom or (
                        f"Formation #{r.get('formation_id')}" if r.get("formation_id") is not None else "—"
                    )

        elif by in {"statut", "parcours_phase", "type_contrat", "cv_statut", "resultat_placement", "contrat_signe"}:
            key = fields[0]
            for r in rows:
                gid = r.get(key)
                r["group_key"] = gid
                r["group_label"] = gid or "—"
        elif by == "responsable":
            from django.contrib.auth import get_user_model

            ids = [r.get("responsable_placement_id") for r in rows if r.get("responsable_placement_id") is not None]
            if ids:
                User = get_user_model()
                raw = User.objects.filter(pk__in=ids).values("pk", "first_name", "last_name", "email", "username")
                label = {}
                for u in raw:
                    full = f"{(u.get('first_name') or '').strip()} {(u.get('last_name') or '').strip()}".strip()
                    label[u["pk"]] = full or u.get("email") or u.get("username") or f"User #{u['pk']}"
            else:
                label = {}
            for r in rows:
                gid = r.get("responsable_placement_id")
                r["group_key"] = gid
                r["group_label"] = label.get(gid, f"User #{gid}" if gid is not None else "—")
        elif by == "entreprise":
            for r in rows:
                r["group_key"] = r.get("entreprise_placement_id")
                r["group_label"] = r.get("entreprise_placement__nom") or (
                    f"Entreprise #{r.get('entreprise_placement_id')}"
                    if r.get("entreprise_placement_id") is not None
                    else "—"
                )

        logger.debug("CandidatStats grouped by %s → %d lignes", by, len(rows))
        return Response({"group_by": by, "results": rows})


# End of documentation. Les méthodes non présentes (create, update, partial_update, destroy, retrieve) ne sont ni implémentées ni autorisées ici.
# Start/end pointes par le code ci-dessous.
