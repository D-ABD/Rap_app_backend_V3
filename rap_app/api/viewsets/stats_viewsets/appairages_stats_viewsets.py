# rap_app/api/viewsets/stats_viewsets/appairages_stats_viewsets.py
from __future__ import annotations
from ...serializers.base_serializers import EmptySerializer
from typing import Dict, Optional, List, Literal
import logging
from drf_spectacular.utils import extend_schema, OpenApiParameter

from django.db.models import Count, Q, QuerySet, Value
from django.db.models.functions import Substr, Coalesce
from django.utils.dateparse import parse_date

from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import GenericViewSet
from rest_framework.decorators import action
from rest_framework.response import Response

from ....models.appairage import Appairage, AppairageActivite, AppairageStatut
from ...permissions import IsStaffOrAbove, is_staff_or_staffread

logger = logging.getLogger(__name__)

GroupKey = Literal["centre", "departement", "statut", "formation", "partenaire"]


def _safe_status_key(raw: str) -> str:
    """Normalise un code de statut en clé safe: espaces → '_'."""
    return (raw or "").replace(" ", "_").lower()


def _to_int_or_none(val) -> Optional[int]:
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


class AppairageStatsViewSet(GenericViewSet):
    """
    ViewSet d'agrégation statistique pour les objets Appairage.

    ──────────────────────────────────────────────────────────────
    Permissions
    -----------
    - permission_classes = [IsStaffOrAbove]
      → La permission d'accès dépend du composant 'IsStaffOrAbove' importé localement :
        - Seul un utilisateur évalué comme staff ou "above" (incluant potentiellement admin, selon l'implémentation de IsStaffOrAbove)
          peut accéder à n'importe quelle action de ce ViewSet.
      → D'autres vérifications de périmètre sont présentes dans le code interne pour restreindre le scope selon le "type" d'utilisateur (voir
        les helpers _is_admin_like, _staff_centre_ids...).
      → Le contrat global d'accès n'est pas lisible sans voir le code d'IsStaffOrAbove.

    ──────────────────────────────────────────────────────────────
    Filtres & requêtes
    ------------------
    - Ce ViewSet ne déclare pas de filter_backends ni de filterset_class.
    - Les filtres sont appliqués exclusivement à la main dans get_queryset() puis dans _apply_common_filters().
    - Les restrictions de visibilité dépendent à la fois de la permission globale and du périmètre calculé dynamiquement par
      _scope_appairages_for_user (centré sur 'centres', 'départements', nature admin/staff), cf. ci-dessous.

    Méthodes de filtrage :
    - get_queryset() :
      - Appairage.objects.select_related(...) pour éviter le N+1
      - Application du filtre de périmètre restreint via _scope_appairages_for_user pour ne garder que le scope vu par l'utilisateur connecté.
        * admin-like → tout voir
        * staff/staffread → limitation par centres ou départements d'affectation éventuels (récupérés dynamiquement sur user)
        * Aucun other accès
      - Par défaut, seuls les Appairages actifs sont retournés, sauf si le flag 'avec_archivees' (query param) est activé.
    - _apply_common_filters(qs) :
      - Applique les query_params :
          * date_from / date_to (dates au format YYYY-MM-DD)
          * centre (ID numérique)
          * departement (code sur les 2 premiers chiffres du code postal du partenaire)
          * formation (ID)
          * partenaire (ID)
          * statut (clé statut reconnue, sinon comportement fallback)
      - Ne concerne QUE les actions qui utilisent _apply_common_filters.

    ──────────────────────────────────────────────────────────────
    Serializers
    -----------
    - Toutes les actions standard et custom utilisent EmptySerializer (n'est pas détaillé ici, il s'agit potentiellement d'un placeholder pour désactiver la sérialisation DRF standard).
      - Les réponses sont construites dynamiquement et envoyées via Response(payload).
      - Le format précis de chaque payload est analysé méthode par méthode.

    ──────────────────────────────────────────────────────────────
    Actions standard et personnalisées
    ----------------------------------
    - list (GET /appairage-stats/):
        Objectif métier :
            → Retourne des KPI globaux sur les appairages visibles par l'utilisateur, avec cumuls et taux de transformation.
        Permissions :
            - Restreint selon le scope staff/admin via IsStaffOrAbove + restriction dans get_queryset.
        Filtres utilisables :
            - voir .get_queryset() et ._apply_common_filters (voir ci-dessus)
        Type de réponse JSON (structure visible dans le code) :
            {
                "kpis": {
                    "appairages_total": int,
                    "nb_candidats_distincts": int,
                    "nb_partenaires_distincts": int,
                    "nb_formations_distinctes": int,
                    "statuts": { <clé_statut>: int, ... },
                    "taux_transformation": float
                },
                "repartition": {
                    "par_statut": [
                        {"code": str, "label": str, "count": int},
                        ... (par statut déclaré dans AppairageStatut.choices)
                    ]
                },
                "filters_echo": { ... paramètres reçus ... }
            }
        Serializer utilisé :
            - EmptySerializer (aucune transformation, tout dans le payload explicite).
        Note :
            - Toutes les valeurs sont calculées pour le scope vue/filtré par l'utilisateur.

    - grouped (GET /appairage-stats/grouped/?by=...):
        Objectif métier :
            → Permet d'obtenir des KPI (dont le taux de transformation) groupés par une clé d'agrégation (centre, département, statut, formation, partenaire).
        Permissions :
            - Même modèle d'accès que pour list : IsStaffOrAbove + restriction sur le queryset utilisateur.
        Arguments d'entrée attendus :
            - Query param 'by' obligatoire, default="centre" (cf. GroupKey)
                valeurs possibles : "centre", "departement", "statut", "formation", "partenaire"
                -> Requête GET.
            - Les mêmes filtres que pour list peuvent être fournis.
        Structure de la réponse JSON (visibilité du code explicite) :
            {
                "group_by": str,  # la clé de groupement (valeur du paramètre 'by')
                "results": [
                    {
                        ... champs du groupe sélectionné,
                        "group_key": ... (clé unique du groupe, dépend de 'by')
                        "group_label": ... (libellé, dépend de 'by')
                        "appairages_total": int,
                        "nb_candidats": int,
                        "nb_partenaires": int,
                        "nb_formations": int,
                        <1...n clefs statut ex: appairage_ok, ...>: int,
                        "taux_transformation": float,
                    }, ...
                ],
                "filters_echo": { ... }
            }
        Serializer utilisé :
            - EmptySerializer (pas de sérialisation DRF autom.)
        Note :
            - En cas de paramètre 'by' non reconnu, retourne un 400 avec message.
            - La logique d'agrégation exacte dépend de la clé (voir group_fields_map).

    - tops (GET /appairage-stats/tops/):
        Objectif métier :
            → Retourne les 10 meilleurs partenaires et 10 meilleures formations (triés sur le nombre d'appairages visibles dans le scope de l'utilisateur courant).
        Permissions :
            - Identique aux autres (scope staff/admin uniquement).
        Arguments :
            - GET, pas de paramètre particulier imposé, mais accepte tous les filtres standards via query params.
        Structure de réponse JSON (visible explicitement) :
            {
                "top_partenaires": [ {"id": int, "nom": str, "count": int}, ... max 10 ],
                "top_formations": [ {"id": int, "nom": str, "count": int}, ... max 10 ],
                "filters_echo": { ... }
            }
        Serializer utilisé :
            - EmptySerializer

    ──────────────────────────────────────────────────────────────
    Points non documentés / incertains
    ----------------------------------
    - Les noms de permissions et les mécanismes précis de 'IsStaffOrAbove'/'is_staff_or_staffread' dépendent de code externe (non visible ici).
    - Si le format JSON devait changer dans une sous-classe ou via un renderer custom, ce ne serait pas visible ici.
    """

    serializer_class = EmptySerializer
    """
    Endpoints
    ---------
    GET /appairage-stats/                  → KPIs globaux (résumé)
    GET /appairage-stats/grouped/?by=...   → groupés par centre|departement|statut|formation|partenaire
    GET /appairage-stats/tops/             → tops partenaires / formations
    """
    permission_classes = [IsStaffOrAbove]

    # ────────────────────────────────────────────────────────────
    # Helpers périmètre staff/admin
    # ────────────────────────────────────────────────────────────

    def _is_admin_like(self, user) -> bool:
        # Renvoie True si l'utilisateur a un profil "admin-like" (superuser ou méthode is_admin() vraie).
        # Utilisés pour le périmètre maximal sur la visibilité.
        return bool(
            getattr(user, "is_superuser", False)
            or (hasattr(user, "is_admin") and callable(user.is_admin) and user.is_admin())
        )

    def _staff_centre_ids(self, user) -> Optional[List[int]]:
        """
        Détermine les centres autorisés pour un staff/staff_read.
        - None signifie accès global (admin-like)
        - [] signifie staff sans centre → aucun résultat visible.
        """
        if self._is_admin_like(user):
            return None
        if is_staff_or_staffread(user) and hasattr(user, "centres"):
            return list(user.centres.values_list("id", flat=True))
        return []


    def _staff_departement_codes(self, user) -> List[str]:
        """
        Récupère les codes département ([:2]) depuis user / user.profile via
        attributs departements_codes|departements (liste/M2M/str).
        Cela sert à restreindre la visibilité pour certains comptes staff.
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

        for owner in (self.request.user, getattr(self.request.user, "profile", None)):
            if not owner:
                continue
            for attr in ("departements_codes", "departements"):
                if hasattr(owner, attr):
                    codes = _norm_codes(getattr(owner, attr))
                    if codes:
                        return codes
        return []

    def _scope_appairages_for_user(self, qs: QuerySet) -> QuerySet:
        """
        Restreint dynamiquement le queryset selon le type d'utilisateur connecté :
            - Si admin-like : toute la base.
            - Si staff/staff_read :
                - Restriction par centres associés OU départements associés.
                - Si aucun des deux → aucun résultat.
            - Si autre statut utilisateur, ou non connecté → aucun résultat visible.
        Cette logique s'applique en surcouche de la permission DRF 'IsStaffOrAbove'.
        """
        user = getattr(self.request, "user", None)
        if not (user and user.is_authenticated):
            return qs.none()

        if self._is_admin_like(user):
            return qs

        if is_staff_or_staffread(user):
            centre_ids = self._staff_centre_ids(user)
            dep_codes = self._staff_departement_codes(user)

            if centre_ids is None:
                return qs
            if not centre_ids and not dep_codes:
                return qs.none()

            q = Q()
            if centre_ids:
                q |= Q(formation__centre_id__in=centre_ids)
            if dep_codes:
                q_dep = Q()
                for code in dep_codes:
                    q_dep |= Q(
                        formation__centre__code_postal__startswith=code
                    ) | Q(partenaire__zip_code__startswith=code)
                q |= q_dep
            return qs.filter(q).distinct()

        return qs.none()

    # ────────────────────────────────────────────────────────────
    # Base QS + filtres
    # ────────────────────────────────────────────────────────────
    def get_queryset(self) -> QuerySet:
        """
        Produit le queryset de base pour toutes les actions :
            - Prend tous les appairages + select_related sur formation, centre, partenaire, candidat.
            - Restreint le scope selon le périmètre utilisateur (voir _scope_appairages_for_user).
            - Exclut par défaut les lignes archivées, sauf query param 'avec_archivees=true'.
        """
        qs = Appairage.objects.select_related("formation", "formation__centre", "partenaire", "candidat")
        qs = self._scope_appairages_for_user(qs)

        # 🔹 Gestion des archivés via query param
        inclure_archivees = str(self.request.query_params.get("avec_archivees", "false")).lower() in [
            "1", "true", "yes", "on"
        ]
        if not inclure_archivees:
            qs = qs.filter(activite=AppairageActivite.ACTIF)

        return qs


    def _apply_common_filters(self, qs: QuerySet) -> QuerySet:
        """
        Applique un ensemble de filtres additionnels sur le queryset, selon query_params disponibles :
            - date_from / date_to : sur date_appairage
            - centre, departement, formation, partenaire, statut : sur les relations et colonnes simples.
            - Les valeurs sont cast/récupérées selon le type attendu.
        """
        p = self.request.query_params

        # Dates (YYYY-MM-DD)
        dfrom = parse_date(str(p.get("date_from"))) if p.get("date_from") else None
        dto = parse_date(str(p.get("date_to"))) if p.get("date_to") else None
        if dfrom:
            qs = qs.filter(date_appairage__date__gte=dfrom)
        if dto:
            qs = qs.filter(date_appairage__date__lte=dto)

        # Centre (via formation.centre)
        centre = _to_int_or_none(p.get("centre"))
        if centre is not None:
            qs = qs.filter(formation__centre_id=centre)

        # Département (via partenaire.zip_code -> 2 premiers chiffres)
        departement = p.get("departement")
        if departement:
            qs = qs.filter(partenaire__zip_code__startswith=str(departement)[:2])

        # Formation / Partenaire
        formation = _to_int_or_none(p.get("formation"))
        if formation is not None:
            qs = qs.filter(formation_id=formation)

        partenaire = _to_int_or_none(p.get("partenaire"))
        if partenaire is not None:
            qs = qs.filter(partenaire_id=partenaire)

        # Statut (clé sécurité + fallback)
        statut = p.get("statut")
        if statut:
            statut_key = _safe_status_key(statut)
            inv = { _safe_status_key(k): k for k, _ in AppairageStatut.choices }
            if statut_key in inv:
                qs = qs.filter(statut=inv[statut_key])
            else:
                # fallback historique: tentative "statut" format libre (messages de log inclus)
                raw_guess = statut_key.replace("_", " ")
                logger.warning("AppairageStatsViewSet: statut inconnu '%s' (fallback='%s')", statut, raw_guess)
                qs = qs.filter(statut=raw_guess)

        return qs

    def _pct(self, num, den) -> float:
        """Utilitaire pour calculer un pourcentage sécurisé, 0 % si dénominateur nul."""
        try:
            n = int(num or 0)
            d = int(den or 0)
        except Exception:
            return 0.0
        return round((n * 100.0 / d), 2) if d > 0 else 0.0

    # ────────────────────────────────────────────────────────────
    # LIST (overview) — KPIs globaux + taux de transformation
    # ────────────────────────────────────────────────────────────
    @extend_schema(
    parameters=[
        OpenApiParameter(
            name="avec_archivees",
            type=bool,
            required=False,
            description="Inclure les appairages archivés (true/false)"
        ),
    ],
)
    def list(self, request, *args, **kwargs):
        """
        Endpoint GET /appairage-stats/

        Objectif métier :
            Retourne une synthèse chiffrée des appairages visibles (KPIs globaux et taux de transformation).
        Permissions :
            - Restreint à staff/admin (voir permission_classes et get_queryset).
        Filtres acceptés :
            - voir _apply_common_filters (date_from/date_to, centre, departement, formation, partenaire, statut, etc.)
            - query param 'avec_archivees'
        Type de réponse JSON :
            Structure explicitement visible :
            {
                "kpis": {
                    "appairages_total": int,
                    "nb_candidats_distincts": int,
                    "nb_partenaires_distincts": int,
                    "nb_formations_distinctes": int,
                    "statuts": { <clé_statut>: int, ... },
                    "taux_transformation": float
                },
                "repartition": {
                    "par_statut": [
                        {"code": str, "label": str, "count": int},
                        ... (statuts connus)
                    ]
                },
                "filters_echo": { ... (rappel de la query string) ... }
            }
        Serializer : EmptySerializer (pas de sérialisation DRF standard).
        """
        qs = self._apply_common_filters(self.get_queryset())

        # KPIs distincts (1 requête)
        agg = qs.aggregate(
            appairages_total=Count("id", distinct=True),
            nb_candidats_distincts=Count("candidat", distinct=True),
            nb_partenaires_distincts=Count("partenaire", distinct=True),
            nb_formations_distinctes=Count("formation", distinct=True),
        )

        # Comptes par statut (sécurisé avec distinct)
        raw_counts = dict(
            qs.values("statut").annotate(c=Count("id", distinct=True)).values_list("statut", "c")
        )
        status_map: Dict[str, int] = {
            _safe_status_key(code): int(raw_counts.get(code, 0))
            for code, _ in AppairageStatut.choices
        }

        # Taux de transformation = appairage_ok / total
        total = int(agg.get("appairages_total") or 0)
        ok = int(status_map.get("appairage_ok") or 0)
        taux_transformation = self._pct(ok, total)

        # Répartition par statut (tableau code/label/count)
        statut_labels = dict(AppairageStatut.choices)
        by_statut = [
            {"code": code, "label": statut_labels.get(code, code), "count": raw_counts.get(code, 0)}
            for code, _ in AppairageStatut.choices
        ]

        payload = {
            "kpis": {**{k: int(v or 0) for k, v in agg.items()}, "statuts": status_map, "taux_transformation": taux_transformation},
            "repartition": {"par_statut": by_statut},
            "filters_echo": {k: v for k, v in request.query_params.items()},
        }
        return Response(payload)

    # ────────────────────────────────────────────────────────────
    # Grouped — KPIs par groupe + taux_transformation
    # ────────────────────────────────────────────────────────────
    @extend_schema(
    parameters=[
        OpenApiParameter(
            name="avec_archivees",
            type=bool,
            required=False,
            description="Inclure les appairages archivés (true/false)"
        ),
    ],
)
    @action(detail=False, methods=["GET"], url_path="grouped")
    def grouped(self, request):
        """
        Endpoint GET /appairage-stats/grouped/?by=<clé>

        Objectif métier :
            Agrège les statistiques d'appairage par sous-groupes (centre, département, statut, formation ou partenaire).
        Permissions :
            - Même modèle d'accès que 'list', scope staff/admin restreint sur les objets via get_queryset().
        Paramètres entrée :
            - 'by' dans query string, valeurs autorisées : centre, departement, statut, formation, partenaire (default = centre).
            - Les autres filtres usuels sont acceptés.
        Réponse attendue (format explicite dans le code) :
            {
                "group_by": str,  # valeur du paramètre by
                "results": [
                    {
                        ... champs groupés selon la clé,
                        "group_key": ...,          # identifiant du groupe
                        "group_label": ...,        # libellé lisible
                        "appairages_total": int,
                        "nb_candidats": int,
                        "nb_partenaires": int,
                        "nb_formations": int,
                        <clés statuts individuellement annotés>: int,
                        "taux_transformation": float
                    }, ...
                ],
                "filters_echo": { ... }
            }
        Cas d'erreur :
            - Si 'by' absent ou invalide, HTTP 400 avec message.
        Serializer : EmptySerializer
        """
        by: GroupKey = (request.query_params.get("by") or "centre").lower()  # défaut utile
        allowed = {"centre", "departement", "statut", "formation", "partenaire"}
        if by not in allowed:
            return Response({"detail": f"'by' doit être dans {sorted(allowed)}"}, status=400)

        qs = self._apply_common_filters(self.get_queryset())

        # pré-annotation departement (2 premiers chiffres du CP partenaire)
        qs = qs.annotate(departement=Coalesce(Substr("partenaire__zip_code", 1, 2), Value("—")))

        # Champs de groupage
        group_fields_map = {
            "centre": ["formation__centre_id", "formation__centre__nom"],
            "departement": ["departement"],
            "statut": ["statut"],
            "formation": ["formation_id", "formation__nom", "formation__centre__nom"],
            "partenaire": ["partenaire_id", "partenaire__nom"],
        }
        group_fields = group_fields_map[by]

        # Annotations par statut (sécurisé avec distinct)
        status_annots = {
            _safe_status_key(code): Count("id", filter=Q(statut=code), distinct=True)
            for code, _ in AppairageStatut.choices
        }

        rows = list(
            qs.values(*group_fields).annotate(
                appairages_total=Count("id", distinct=True),
                nb_candidats=Count("candidat", distinct=True),
                nb_partenaires=Count("partenaire", distinct=True),
                nb_formations=Count("formation", distinct=True),
                **status_annots,
            ).order_by(*group_fields)
        )

        # Post-traitement : group_key / group_label + taux_transformation
        results = []
        for r in rows:
            out = dict(r)

            # Attribution group_key et group_label selon le regroupement
            if by == "centre":
                out["group_key"] = r.get("formation__centre_id")
                out["group_label"] = r.get("formation__centre__nom") or (
                    f"Centre #{r.get('formation__centre_id')}" if r.get("formation__centre_id") is not None else "—"
                )
            elif by == "departement":
                out["group_key"] = r.get("departement") or "—"
                out["group_label"] = out["group_key"]
            elif by == "statut":
                raw = r.get("statut") or ""
                out["group_key"] = _safe_status_key(raw)
                out["group_label"] = dict(AppairageStatut.choices).get(raw, raw) or "—"
            elif by == "formation":
                out["group_key"] = r.get("formation_id")
                out["group_label"] = r.get("formation__nom") or (
                    f"Formation #{r.get('formation_id')}" if r.get("formation_id") is not None else "—"
                )
            elif by == "partenaire":
                out["group_key"] = r.get("partenaire_id")
                out["group_label"] = r.get("partenaire__nom") or (
                    f"Partenaire #{r.get('partenaire_id')}" if r.get("partenaire_id") is not None else "—"
                )

            total = int(out.get("appairages_total") or 0)
            ok = int(out.get("appairage_ok") or 0)  # ← annotation safe ci-dessus
            out["taux_transformation"] = self._pct(ok, total)

            results.append(out)

        return Response({
            "group_by": by,
            "results": results,
            "filters_echo": {k: v for k, v in request.query_params.items()},
        })

    # ────────────────────────────────────────────────────────────
    # Tops — partenaires / formations
    # ────────────────────────────────────────────────────────────
    @extend_schema(
    parameters=[
        OpenApiParameter(
            name="avec_archivees",
            type=bool,
            required=False,
            description="Inclure les appairages archivés (true/false)"
        ),
    ],
)
    @action(detail=False, methods=["GET"], url_path="tops")
    def tops(self, request):
        """
        Endpoint GET /appairage-stats/tops/

        Objectif métier :
            Retourne les 10 partenaires et 10 formations ayant le plus d'appairages dans le scope restreint de l'utilisateur courant.
        Permissions :
            - Restreint staff/admin (cf. get_queryset + permission_classes)
        Filtres acceptés :
            - Toutes les query_params applicables dans _apply_common_filters.
        Format de réponse JSON (visible explicitement) :
            {
                "top_partenaires": [ {"id": int, "nom": str, "count": int}, ... max 10 ],
                "top_formations": [ {"id": int, "nom": str, "count": int}, ... max 10 ],
                "filters_echo": { ... (query params utilisés) ... }
            }
        Serializer : EmptySerializer
        """
        qs = self._apply_common_filters(self.get_queryset())

        def _top(qs: QuerySet, id_field: str, label_field: str, label_fallback_prefix: str):
            rows = list(
                qs.values(id_field, label_field)
                .annotate(cnt=Count("id", distinct=True))
                .order_by("-cnt")[:10]
            )
            out = []
            for r in rows:
                _id = r.get(id_field)
                _nom = r.get(label_field) or f"{label_fallback_prefix} #{_id}"
                out.append({"id": _id, "nom": _nom, "count": r["cnt"]})
            return out

        top_partenaires = _top(qs, "partenaire_id", "partenaire__nom", "Partenaire")
        top_formations = _top(qs, "formation_id", "formation__nom", "Formation")

        return Response({
            "top_partenaires": top_partenaires,
            "top_formations": top_formations,
            "filters_echo": {k: v for k, v in request.query_params.items()},
        })