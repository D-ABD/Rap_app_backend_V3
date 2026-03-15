from __future__ import annotations

from typing import Literal, Optional

from django.db.models import Count, Q, Value
from django.db.models.functions import Coalesce, Substr
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from rap_app.api.serializers.base_serializers import EmptySerializer

from ....models.commentaires_appairage import CommentaireAppairage
from ...permissions import IsStaffOrAbove, is_staff_or_staffread

try:
    from ..permissions import IsOwnerOrStaffOrAbove  # type: ignore
except Exception:  # pragma: no cover
    IsOwnerOrStaffOrAbove = IsAuthenticated

try:
    from ..mixins import RestrictToUserOwnedQueryset  # type: ignore
except Exception:  # pragma: no cover

    class RestrictToUserOwnedQueryset:
        def restrict_queryset_to_user(self, qs):
            return qs


GroupKey = Literal[
    "centre",
    "departement",
    "formation",
    "partenaire",
    "statut_snapshot",
    "appairage",
]


class AppairageCommentaireStatsViewSet(RestrictToUserOwnedQueryset, GenericViewSet):
    """
    ViewSet read-only proposant des agrégats (KPIs, statistiques, regroupements)
    sur les Commentaires d’Appairage.

    ─────────────────────────────────────────────
    Permissions
    ─────────────────────────────────────────────
    - Basé sur la permission IsStaffOrAbove (définie ailleurs).
      → Permet l’accès aux utilisateurs de type staff ou supérieur (ex : admin, superadmin).
      → Les utilisateurs non staffs ou non authentifiés n’ont pas accès.
      → L’étendue “admin” ou “admin-like” est jugée via méthode _is_admin_like (cf. code).

    ─────────────────────────────────────────────
    Filtrage et limitations visuelles
    ─────────────────────────────────────────────
    - get_queryset() :
        - Base = tous les objets CommentaireAppairage avec select_related sur relations principales.
        - Appelle restrict_queryset_to_user si disponible (mixin optionnel). En l'absence du mixin RestrictToUserOwnedQueryset, un stub local (restrict_queryset_to_user retourne qs) est utilisé.
        - Restreint l’accès selon l’utilisateur via _scope_queryset_for_user :
            - Utilisateur “admin-like” : visibilité sur tout le queryset.
            - Staff : restriction possible via centres (user.centres) ou départements (user.departements_codes ou user.departements).
            - Si aucun périmètre staff détecté : queryset vide.

    - _apply_common_filters(qs) :
        - Prend en compte les query params date_from/date_to (filter created_at).
        - Prend en compte centre, departement, formation, partenaire, statut comme clés de filtrage.
        - Pas de filter_backends, search_fields ou ordering_fields explicitement définis.

    ─────────────────────────────────────────────
    Serializers
    ─────────────────────────────────────────────
    - EmptySerializer (aucune validation d’input, utilisé ici car endpoints readonly).

    ─────────────────────────────────────────────
    Actions exposées
    ─────────────────────────────────────────────
    - list (GET /)
        - Agrégats globaux sur les commentaires.
        - Ne retourne pas des instances CommentaireAppairage mais des statistiques.
        - Voir détaillé plus bas.

    - latest (GET /latest)
        - Action personnalisée : derniers commentaires (sliced via param “limit”).
        - Voir docstring dans la méthode.

    - grouped (GET /grouped)
        - Action personnalisée : statistiques agrégées par dimension.
        - Paramétrable via query ?by=…
        - Voir docstring dans la méthode.

    ─────────────────────────────────────────────
    Méthodes “standards” non exposées
    ─────────────────────────────────────────────
    - retrieve, create, update, destroy, partial_update ne sont pas définies/actives.

    ─────────────────────────────────────────────
    Limites de documentation
    ─────────────────────────────────────────────
    - La granularité exacte d’IsStaffOrAbove dépend d’un composant externe (non visible ici).
    - La logique de RestrictToUserOwnedQueryset dépend d’un mixin optionnel qui n’est pas documenté ici.
    - Le format exhaustif des objets liés (“created_by”, “appairage”, etc.) n’est pas détaillé ici.
    """

    serializer_class = EmptySerializer

    permission_classes = [IsStaffOrAbove]

    # ───────────────────────────────
    # Helpers périmètre
    # ───────────────────────────────
    def _is_admin_like(self, user) -> bool:
        """
        Détermine si l’utilisateur est “admin-like” :
         - Superuser OU
         - dispose d’une méthode is_admin() renvoyant True.
        """
        return getattr(user, "is_superuser", False) or (
            hasattr(user, "is_admin") and callable(user.is_admin) and user.is_admin()
        )

    def _staff_centre_ids(self, user) -> Optional[list[int]]:
        """
        Récupère les centres accessibles pour un staff given user (None = admin, [] si aucun).
        Si admin, retourne None (= vision totale).
        """
        if self._is_admin_like(user):
            return None
        if is_staff_or_staffread(user) and hasattr(user, "centres"):
            return list(user.centres.values_list("id", flat=True))
        return []

    def _staff_departement_codes(self, user) -> list[str]:
        """
        Récupère la liste des codes de départements associés à un staff.
        Plusieurs conventions sont cherchées ('departements_codes', 'departements').
        Applicable principalement pour certains profils utilisateurs métier.
        """

        def _norm(val):
            if not val:
                return []
            if hasattr(val, "all"):
                return list({str(getattr(x, "code", x))[:2] for x in val.all()})
            if isinstance(val, (list, tuple, set)):
                return list({str(x)[:2] for x in val if x})
            return [str(val)[:2]]

        for owner in (user, getattr(user, "profile", None)):
            if not owner:
                continue
            for attr in ("departements_codes", "departements"):
                if hasattr(owner, attr):
                    codes = _norm(getattr(owner, attr))
                    if codes:
                        return codes
        return []

    def _scope_queryset_for_user(self, qs, user):
        """
        Applique la restriction de visibilité sur le queryset selon le type d’utilisateur.
        - Si non authentifié : queryset vide.
        - Si admin-like : accès total.
        - Si staff : accès restreint à ses centres/départements.
        - Sinon : queryset non filtré (aucun cas prévu ici).
        """
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
                q |= Q(appairage__formation__centre_id__in=centre_ids)
            if dep_codes:
                q_dep = Q()
                for code in dep_codes:
                    q_dep |= Q(appairage__formation__centre__code_postal__startswith=code)
                q |= q_dep
            return qs.filter(q).distinct()
        return qs

    # ───────────────────────────────
    # Base queryset + filtres
    # ───────────────────────────────
    def get_queryset(self):
        """
        Base queryset sur les CommentaireAppairage :
        - select_related sur :
            - appairage (relation principale)
            - formation de l’appairage
            - centre de la formation
            - partenaire de l’appairage
            - created_by
        - Appelle restrict_queryset_to_user si le mixin le permet (portée dépendante du projet.
        - Filtrage business : appelle _scope_queryset_for_user selon l’utilisateur courant (= self.request.user).
        - La visibilité effective dépend donc (a) du périmètre staff / admin, (b) des éventuels mixins.
        """
        qs = CommentaireAppairage.objects.select_related(
            "appairage",
            "appairage__formation",
            "appairage__formation__centre",
            "appairage__partenaire",
            "created_by",
        )
        if hasattr(self, "restrict_queryset_to_user"):
            qs = self.restrict_queryset_to_user(qs)
        qs = self._scope_queryset_for_user(qs, getattr(self.request, "user", None))
        return qs

    def _apply_common_filters(self, qs):
        """
        Applique les filtres à partir des query parameters :
        - date_from, date_to : borne d’inclusion sur la date de création (YYYY-MM-DD)
        - centre : id centre formation (exact)
        - departement : code postal commencant par les 2 premiers chiffres (code département)
        - formation : id formation (exact)
        - partenaire : id partenaire (exact)
        - statut : statut d’appairage (exact)
        Paramètres ignorés si absents.
        """
        p = self.request.query_params
        dfrom = parse_date(p.get("date_from") or "") if p.get("date_from") else None
        dto = parse_date(p.get("date_to") or "") if p.get("date_to") else None
        if dfrom:
            qs = qs.filter(created_at__date__gte=dfrom)
        if dto:
            qs = qs.filter(created_at__date__lte=dto)

        if p.get("centre"):
            qs = qs.filter(appairage__formation__centre_id=p["centre"])
        if p.get("departement"):
            qs = qs.filter(appairage__formation__centre__code_postal__startswith=str(p["departement"])[:2])
        if p.get("formation"):
            qs = qs.filter(appairage__formation_id=p["formation"])
        if p.get("partenaire"):
            qs = qs.filter(appairage__partenaire_id=p["partenaire"])
        if p.get("statut"):
            qs = qs.filter(appairage__statut=p["statut"])
        return qs

    # ───────────────────────────────
    # LIST = KPIs globaux
    # ───────────────────────────────
    def list(self, request, *args, **kwargs):
        """
        Point d’entrée : GET /api/commentaires-appairage-stats/ (action “list”)
        ─────────────────────────────────────────────
        Objectif : Retourner les agrégats globaux (KPIs) sur les commentaires d’appairage accessibles à l’utilisateur.
        ─────────────────────────────────────────────
        Permissions (héritées : voir ViewSet)
        ─────────────────────────────────────────────
        Intention métier :
        - Aider au pilotage et à la compréhension de l’activité “commentaire” (nombre de commentaires, nombre distincts d’appairages concernés, nombre d’auteurs différents participant à la discussion, etc.).
        ─────────────────────────────────────────────
        Filtres : tous les query params gérés dans _apply_common_filters (cf. ci-dessus).
        ─────────────────────────────────────────────
        Structure typique de la réponse JSON :
        {
            "kpis": {      // Agrégats bruts au global
                "total": int,                  // nombre total de commentaires
                "distinct_appairages": int,    // nombre d’appairages différents ayant au moins un commentaire
                "distinct_auteurs": int        // nombre d’utilisateurs distincts ayant commenté
            },
            "repartition": { // Répartitions complémentaires
                "par_statut_snapshot": [ { "statut_snapshot": str|null, "count": int }, ... ],
                "par_auteur": [ { "created_by": id, "count": int }, ... ],
            },
            "filters_echo": { ... } // Echo des query params reçus
        }
        """
        qs = self._apply_common_filters(self.get_queryset())

        agg = qs.aggregate(
            total=Count("id"),
            distinct_appairages=Count("appairage", distinct=True),
            distinct_auteurs=Count("created_by", distinct=True),
        )

        by_statut = list(qs.values("statut_snapshot").annotate(count=Count("id")).order_by("statut_snapshot"))
        by_auteur = list(qs.values("created_by").annotate(count=Count("id")).order_by("-count"))

        payload = {
            "kpis": {k: int(v or 0) for k, v in agg.items()},
            "repartition": {
                "par_statut_snapshot": by_statut,
                "par_auteur": by_auteur,
            },
            "filters_echo": dict(request.query_params),
        }
        return Response(payload)

    # ───────────────────────────────
    # LATEST = derniers commentaires
    # ───────────────────────────────
    @action(detail=False, methods=["GET"], url_path="latest")
    def latest(self, request):
        """
        Point d’entrée : GET /api/commentaires-appairage-stats/latest
        ─────────────────────────────────────────────
        Objectif : Retourner les derniers commentaires créés par date décroissante (non paginé, limite paramétrable).
        ─────────────────────────────────────────────
        Permissions (héritées : voir ViewSet)
        ─────────────────────────────────────────────
        Intention métier :
        - Vue “activité récente” sur les commentaires d’appairage visibles pour l’utilisateur.
        ─────────────────────────────────────────────
        Paramètres :
        - limit (query param, entier > 0, défaut : 20)
        - Tous les autres params filtrent via _apply_common_filters
        ─────────────────────────────────────────────
        Structure typique de la réponse JSON :
        {
            "count": int,      // nombre total de commentaires visibles après filtrage (hors limitation “limit” !)
            "results": [
                {
                    "id": int,
                    "appairage_id": int,
                    "centre_nom": string|null,
                    "formation_nom": string|null,
                    "num_offre": string|int|null,
                    "type_offre_nom": string|null,
                    "partenaire_nom": string|null,
                    "statut_snapshot": str|null,
                    "body": string,       // tronqué à 280 caractères max.
                    "auteur": string|null, // rendu via c.auteur_nom()
                    "date": string|null,   // format “dd/mm/YYYY”
                    "heure": string|null,  // format “HH:MM”
                    "created_at": string|null,  // ISO-8601
                    "updated_at": string|null,  // ISO-8601
                    "is_recent": bool,
                    "is_edited": bool
                },
                ...
            ],
            "filters_echo": { ... } // Echo des query params reçus
        }
        """
        qs = self._apply_common_filters(self.get_queryset()).order_by("-created_at")

        try:
            limit = int(request.query_params.get("limit") or 20)
        except ValueError:
            limit = 20
        qs = qs[:limit]

        now = timezone.now()
        results = []
        for c in qs:
            results.append(
                {
                    "id": c.id,
                    "appairage_id": c.appairage_id,
                    "centre_nom": getattr(c.appairage.formation.centre, "nom", None),
                    "formation_nom": getattr(c.appairage.formation, "nom", None),
                    "num_offre": getattr(c.appairage.formation, "num_offre", None),  # ✅ ajouté
                    "type_offre_nom": getattr(getattr(c.appairage.formation, "type_offre", None), "nom", None),
                    "partenaire_nom": getattr(c.appairage.partenaire, "nom", None),
                    "statut_snapshot": c.statut_snapshot,
                    "body": c.body[:280],
                    "auteur": c.auteur_nom(),
                    "date": c.created_at.strftime("%d/%m/%Y") if c.created_at else None,
                    "heure": c.created_at.strftime("%H:%M") if c.created_at else None,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                    "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                    "is_recent": c.created_at and c.created_at.date() == now.date(),
                    "is_edited": bool(c.updated_at and c.updated_at > c.created_at),
                }
            )

        payload = {
            "count": self.get_queryset().count(),
            "results": results,
            "filters_echo": dict(request.query_params),
        }
        return Response(payload)

    # ───────────────────────────────
    # GROUPED = regroupements dynamiques
    # ───────────────────────────────
    @action(detail=False, methods=["GET"], url_path="grouped")
    def grouped(self, request):
        """
        Point d’entrée : GET /api/commentaires-appairage-stats/grouped
        ─────────────────────────────────────────────
        Objectif : Retourner des statistiques groupées/agrégées selon un axe paramétrable.
        ─────────────────────────────────────────────
        Permissions (héritées : voir ViewSet)
        ─────────────────────────────────────────────
        Intention métier :
        - Produire des rapports dynamiques (par centre, département, formation, partenaire, statut, appairage).
        ─────────────────────────────────────────────
        Paramètres :
        - by (query : centre|departement|formation|partenaire|statut_snapshot|appairage) [défaut “departement”]
        - Tous les autres params filtrent via _apply_common_filters
        ─────────────────────────────────────────────
        Structure de la réponse JSON :
        {
            "group_by": string,   // Axe de regroupement sélectionné (“by”)
            "results": [
                // Pour chaque élément du regroupement, objet composé :
                {
                    ... [clés variables selon l’axe, ex : appairage__formation__centre_id, …]
                    "total": int,                   // nombre total de commentaires sur le groupe
                    "distinct_appairages": int,     // nombre d’appairages distincts dans le groupe
                    "distinct_auteurs": int,        // nombre d’utilisateurs distincts
                    "group_key": val,               // clé de regroupement cohérente selon axe
                    "group_label": string           // label descriptif du groupe
                }
            ]
        }
        - Les champs exacts dépendant du “by” demandé : voir mapping group_fields_map dans le code.
        - En cas de mauvaise valeur “by”, retourne statut HTTP 400 avec message explicite.
        """
        by: GroupKey = (request.query_params.get("by") or "departement").lower()
        allowed = {"centre", "departement", "formation", "partenaire", "statut_snapshot", "appairage"}
        if by not in allowed:
            return Response({"detail": "Paramètre 'by' invalide."}, status=400)

        qs = self._apply_common_filters(self.get_queryset())
        qs = qs.annotate(departement=Coalesce(Substr("appairage__formation__centre__code_postal", 1, 2), Value("NA")))

        group_fields_map = {
            "centre": ["appairage__formation__centre_id", "appairage__formation__centre__nom"],
            "departement": ["departement"],
            "formation": [
                "appairage__formation_id",
                "appairage__formation__nom",
                "appairage__formation__type_offre__nom",
                "appairage__formation__num_offre",
            ],
            "partenaire": ["appairage__partenaire_id", "appairage__partenaire__nom"],
            "statut_snapshot": ["statut_snapshot"],
            "appairage": ["appairage_id"],
        }

        rows = list(
            qs.values(*group_fields_map[by])
            .annotate(
                total=Count("id"),
                distinct_appairages=Count("appairage", distinct=True),
                distinct_auteurs=Count("created_by", distinct=True),
            )
            .order_by(*group_fields_map[by])
        )

        for r in rows:
            if by == "centre":
                r["group_key"] = r.get("appairage__formation__centre_id")
                r["group_label"] = r.get("appairage__formation__centre__nom") or "—"
            elif by == "departement":
                r["group_key"] = r.get("departement")
                r["group_label"] = r.get("departement") or "—"
            elif by == "formation":
                r["group_key"] = r.get("appairage__formation_id")
                r["group_label"] = r.get("appairage__formation__nom") or "—"
                r["group_label"] = (
                    f"{r.get('appairage__formation__nom') or '—'} "
                    f"(#{r.get('appairage__formation__num_offre') or '?'}, "
                    f"{r.get('appairage__formation__type_offre__nom') or '?'})"
                )
            elif by == "partenaire":
                r["group_key"] = r.get("appairage__partenaire_id")
                r["group_label"] = r.get("appairage__partenaire__nom") or "—"
            elif by == "statut_snapshot":
                r["group_key"] = r.get("statut_snapshot")
                r["group_label"] = r.get("statut_snapshot") or "—"
            elif by == "appairage":
                r["group_key"] = r.get("appairage_id")
                r["group_label"] = f"Appairage #{r.get('appairage_id')}"
        return Response({"group_by": by, "results": rows})
