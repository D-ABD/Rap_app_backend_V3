# rap_app/api/viewsets/stats_viewsets/prospection_comment_stats_viewset.py
from __future__ import annotations

from typing import Optional

from django.db.models import Count, Q, Value
from django.db.models.functions import Coalesce, Substr
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from ....models.prospection_comments import ProspectionComment
from ...permissions import is_staff_or_staffread
from ...serializers.base_serializers import EmptySerializer

try:
    from ...permissions import IsOwnerOrStaffOrAbove  # type: ignore
except Exception:  # pragma: no cover
    IsOwnerOrStaffOrAbove = IsAuthenticated  # fallback

try:
    from ...mixins import RestrictToUserOwnedQueryset  # type: ignore
except Exception:  # pragma: no cover

    class RestrictToUserOwnedQueryset:  # stub minimal
        def restrict_queryset_to_user(self, qs):
            return qs


class ProspectionCommentStatsViewSet(RestrictToUserOwnedQueryset, GenericViewSet):
    """
    ViewSet dédié à l’analyse et au reporting sur les commentaires de prospection.

    ⚠️ Ce ViewSet n’est pas CRUD sur les commentaires eux-mêmes, mais expose deux endpoints "stats" :
    - /prospection-comment-stats/latest/   : derniers commentaires pertinents (analyse)
    - /prospection-comment-stats/grouped/  : options groupées pour alimenter des filtres UI (<select>).

    ───────────────
    1. Permissions
    ───────────────
    - `permission_classes = [IsOwnerOrStaffOrAbove]`
      → La permission dépend d'un composant externe non visible ici (is_owner, staff ou plus).
      → Si `IsOwnerOrStaffOrAbove` indisponible, repli sur `IsAuthenticated`.
      → Logique métier (voir _scope_for_user):
          * Superuser/admin : accès global.
          * Staff/staffread : accès limité à certains centres/départements (voir _staff_centre_ids et _staff_departement_codes).
          * Utilisateur "candidat ou stagiaire" : uniquement ses propres commentaires non-internes.
          * Tous les autres : accès refusé (aucun résultat).
      - Note : la composition exacte de `IsOwnerOrStaffOrAbove` n’est pas visible ici.

    ──────────────────────────
    2. Filtrage & Queryset
    ──────────────────────────
    - La méthode `get_queryset()` prépare une queryset sur ProspectionComment (jointures: prospection, centre, formation, partenaire, auteur).
    - Si un mixin RestrictToUserOwnedQueryset existe, il restreint encore le queryset (le détail dépend d’un code externe non visible ici).
    - Application d’un filtrage métier via `_scope_for_user()` selon le profil utilisateur.
    - Aucun filter_backend, search_field, ordering_field, ni filterset_class explicite dans ce ViewSet : tout le filtrage passe par `_apply_filters` :
        • Filters acceptés via query params (tous optionnels, voir docstring classe et _apply_filters):
            - date_from, date_to (filtre sur created_at)
            - centre (id), departement (code), formation (id), partenaire (id), owner (user id)
            - is_internal (booléen dans différents formats)
            - search (mot-clé dans body, username, nom formation, nom partenaire)
            - limit (pour /latest)
      → Le format exact des query params autorisés est listé dans la docstring de classe et dans la logique de `_apply_filters`.

    ──────────────────────────
    3. Actions standard (list, retrieve…)
    ──────────────────────────
    - Ce ViewSet ne définit PAS d’actions list/create/retrieve/update/destroy.
      → Seules des actions personnalisées readonly sont exposées.

    ──────────────────────────
    4. Actions personnalisées
    ──────────────────────────

    a) GET /prospection-comment-stats/latest/

      - Objectif : Récupérer les derniers commentaires pertinents pour l’utilisateur courant, avec preview et infos enrichies.
      - Permissions : logique restreinte décrite ci-dessus.
      - Query params : tous ceux de _apply_filters + limit (défaut 5, max 200).
      - Structure de réponse JSON : (clairement visible dans le code)
        ```
        {
            "count": int,         # nombre de résultats
            "results": [ {       # liste des commentaires filtrés et formatés
                "id": int,
                "prospection_id": int | null,
                "prospection_text": str,
                "centre_nom": str | null,
                "formation_nom": str | null,
                "partenaire_nom": str | null,
                "num_offre": str | null,
                "type_offre_nom": str | null,
                "start_date": date | null,
                "end_date": date | null,
                "statut": any,
                "type_prospection": any,
                "objectif": any,
                "body": str,            # extrait du body (180 caractères max + "…")
                "is_internal": bool,
                "auteur": str,
                "date": str,            # format DD/MM/YYYY
                "heure": str,           # format HH:MM
                "created_at": ISO str,
                "updated_at": ISO str | null,
                "is_recent": bool,      # ≤7 jours
                "is_edited": bool,      # modifié (>60s après création)
            }, ... ],
            "filters_echo": { ... }     # tous les query params reçus, en écho
        }
        ```

    b) GET /prospection-comment-stats/grouped/?by=centre|departement|formation

      - Objectif : Retourner la liste des options (clé, label, total) pour alimenter les <select> de filtre côté front, groupées selon le paramètre by.
      - Permissions : même logique business.
      - Query params : tous les filtres sauf le champ groupé (ex : /grouped/?by=centre&centre=5 retire centre du filtrage de ce endpoint)
      - Structure de réponse JSON : (visiblement explicite dans le code)
        ```
        {
            "group_by": str,               # valeur du paramètre by
            "results": [
                {
                    ...                   # toutes les valeurs de group_fields (voir code selon by)
                    "group_key": ...,     # valeur de regroupement (id ou code selon le cas)
                    "group_label": str,   # libellé utilisable dans un select (voir code exact)
                    "total": int,         # nombre de commentaires dans ce groupe
                },
                ...
            ],
            "filters_echo": { ... }        # écho des query params reçus
        }
        ```

    ────────────────────────
    ⚠️ Points particuliers :
    ────────────────────────
    - Ce ViewSet ne permet pas de création/modification/suppression de commentaires via l’API.
    - Les droits sont strictement filtrés en amont (voir _scope_for_user et permissions).
    - Si un paramètre (permission, mixin, ou champs user) dépend d’un composant ailleurs dans le code ou de la configuration projet, la documentation ne peut en donner le détail exhaustif.
    """

    serializer_class = EmptySerializer

    permission_classes = [IsOwnerOrStaffOrAbove]

    # ────────────────────────────────────────────────────────────
    # Helpers périmètre (aligné sur ProspectionStats)
    # ────────────────────────────────────────────────────────────
    def _is_admin_like(self, user) -> bool:
        # Détermine si l'utilisateur est superuser ou dispose d'une méthode is_admin (cas admin fonctionnel).
        return bool(
            getattr(user, "is_superuser", False)
            or (hasattr(user, "is_admin") and callable(user.is_admin) and user.is_admin())
        )

    def _staff_centre_ids(self, user) -> Optional[list[int]]:
        # Pour un staff, retourne la liste des centres à laquelle il a accès.
        # Admin : retour None (pas de restriction supplémentaire).
        # Staff authentifié : ses centres, si attribut .centres existe (dépend du modèle user).
        # Autres : []
        if self._is_admin_like(user):
            return None
        if is_staff_or_staffread(user) and hasattr(user, "centres"):
            return list(user.centres.values_list("id", flat=True))
        return []

    def _staff_departement_codes(self, user) -> list[str]:
        # Pour un staff, retourne la liste des codes département (2 chiffres) disponibles.
        # Divers cas de stockage possibles selon le user ou son profil.
        def _norm_codes(val):
            if val is None:
                return []
            if hasattr(val, "all"):
                out = []
                for obj in val.all():
                    code = getattr(obj, "code", None) or str(obj)
                    if code:
                        out.append(str(code)[:2])
                return list(set(out))
            if isinstance(val, (list, tuple, set)):
                return list({str(x)[:2] for x in val if x is not None and str(x).strip()})
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

    def _scope_for_user(self, qs, user):
        """
        Filtrage de périmètre utilisateur :
        - Admin : accès global
        - Staff/staffread : accès restreint à certains centres/départements selon attributs user
        - Candidat/stagiaire : uniquement commentaires (non internes) où il est owner
        - Tous les autres : aucun accès / queryset vide
        """
        if not (user and user.is_authenticated):
            return qs.none()

        # Admin = accès global
        if self._is_admin_like(user):
            return qs

        # Staff = périmètre centres/départements
        if is_staff_or_staffread(user):
            centre_ids = self._staff_centre_ids(user)
            if centre_ids is None:
                return qs
            dep_codes = self._staff_departement_codes(user)

            if not centre_ids and not dep_codes:
                return qs.none()

            q = Q()
            if centre_ids:
                q |= Q(prospection__centre_id__in=centre_ids)
            if dep_codes:
                q_dep = Q()
                for code in dep_codes:
                    q_dep |= Q(prospection__centre__code_postal__startswith=code)
                q |= q_dep
            return qs.filter(q).distinct()

        # Candidat/stagiaire : visibles = commentaires non internes dont il est owner
        if hasattr(user, "is_candidat_or_stagiaire") and user.is_candidat_or_stagiaire():
            return qs.filter(is_internal=False, prospection__owner_id=user.id)

        # Tous les autres → aucun accès
        return qs.none()

    # ────────────────────────────────────────────────────────────
    # Data (filtrages principaux)
    # ────────────────────────────────────────────────────────────
    def get_queryset(self):
        """
        Prépare le queryset selon :
        - permission métier (_scope_for_user)
        - potentiellement RestrictToUserOwnedQueryset (si importé)
        - selects/joins optimisées pour accès rapide (voir select_related)
        """
        qs = ProspectionComment.objects.select_related(
            "prospection",
            "prospection__centre",
            "prospection__formation",
            "prospection__partenaire",
            "created_by",
        )
        if hasattr(self, "restrict_queryset_to_user"):
            qs = self.restrict_queryset_to_user(qs)
        qs = self._scope_for_user(qs, getattr(self.request, "user", None))
        return qs

    @staticmethod
    def _as_bool(v: str | None):
        # Conversion robuste d'un param string en booléen (supporte divers formats).
        if v is None:
            return None
        return str(v).lower() in {"1", "true", "t", "yes", "on", "oui"}

    def _apply_filters(self, qs, params=None):
        """
        Filtres dynamiques sur le queryset, appliqués selon :
        - date_from / date_to (created_at)
        - centre, departement, formation, partenaire, owner
        - is_internal (true/false)
        - search (body, username, nom formation, nom partenaire)
        Si `params` est fourni (dict-like), il est utilisé à la place de self.request.query_params (utile pour /grouped).
        """
        p = params or self.request.query_params

        dfrom = parse_date(p.get("date_from") or "") if p.get("date_from") else None
        dto = parse_date(p.get("date_to") or "") if p.get("date_to") else None
        if dfrom:
            qs = qs.filter(created_at__date__gte=dfrom)
        if dto:
            qs = qs.filter(created_at__date__lte=dto)

        if p.get("centre"):
            qs = qs.filter(prospection__centre_id=p.get("centre"))
        if p.get("departement"):
            qs = qs.filter(prospection__centre__code_postal__startswith=str(p.get("departement"))[:2])
        if p.get("formation"):
            qs = qs.filter(prospection__formation_id=p.get("formation"))
        if p.get("partenaire"):
            qs = qs.filter(prospection__partenaire_id=p.get("partenaire"))
        if p.get("owner"):
            qs = qs.filter(prospection__owner_id=p.get("owner"))

        b = self._as_bool(p.get("is_internal"))
        if b is True:
            qs = qs.filter(is_internal=True)
        elif b is False:
            qs = qs.filter(is_internal=False)

        search = (p.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(body__icontains=search)
                | Q(created_by__username__icontains=search)
                | Q(prospection__formation__nom__icontains=search)
                | Q(prospection__partenaire__nom__icontains=search)
            )
        return qs

    # ────────────────────────────────────────────────────────────
    # Latest (limit, tri desc)
    # ────────────────────────────────────────────────────────────
    @action(detail=False, methods=["GET"], url_path="latest")
    def latest(self, request):
        """
        GET /prospection-comment-stats/latest/
        Retourne les derniers commentaires de prospection accessibles à l'utilisateur.
        - Permissions : filtrées selon scope métier (voir classe).
        - Query params : tous de _apply_filters + "limit" (int, par défaut 5, max 200)
        - Réponse : voir docstring de classe (structure JSON explicitement visible dans le code).
        """
        qs = self._apply_filters(self.get_queryset())

        try:
            limit = int(request.query_params.get("limit", 5))
        except Exception:
            limit = 5
        limit = max(1, min(200, limit))

        qs = qs.order_by("-created_at")[:limit]
        now = timezone.now()

        def _full_name(u):
            # Génère un nom affichable pour l'auteur du commentaire.
            if not u:
                return "Anonyme"
            full = (
                f"{(getattr(u, 'first_name', '') or '').strip()} {(getattr(u, 'last_name', '') or '').strip()}".strip()
            )
            return full or getattr(u, "email", None) or getattr(u, "username", None) or "Anonyme"

        results = []
        for c in qs:
            p = c.prospection
            centre_nom = getattr(getattr(p, "centre", None), "nom", None)
            formation_nom = getattr(getattr(p, "formation", None), "nom", None)
            partenaire_nom = getattr(getattr(p, "partenaire", None), "nom", None)
            statut = getattr(p, "statut", None)
            type_prospection = getattr(p, "type_prospection", None)
            objectif = getattr(p, "objectif", None)

            body = c.body or ""
            preview_len = 180
            body_preview = body if len(body) <= preview_len else f"{body[:preview_len]}…"

            is_edited = bool(c.updated_at and (c.updated_at - c.created_at).total_seconds() > 60)
            is_recent = (now - c.created_at).days <= 7

            results.append(
                {
                    "id": c.pk,
                    "prospection_id": p.id if p else None,
                    "prospection_text": getattr(c, "prospection_text", f"#{getattr(p, 'id', None)}"),
                    "centre_nom": centre_nom,
                    "formation_nom": formation_nom,
                    "partenaire_nom": partenaire_nom,
                    "num_offre": getattr(getattr(p, "formation", None), "num_offre", None),
                    "type_offre_nom": getattr(getattr(getattr(p, "formation", None), "type_offre", None), "nom", None),
                    "start_date": getattr(getattr(p, "formation", None), "date_debut", None),
                    "end_date": getattr(getattr(p, "formation", None), "date_fin", None),
                    "statut": statut,
                    "type_prospection": type_prospection,
                    "objectif": objectif,
                    "body": body_preview,
                    "is_internal": bool(c.is_internal),
                    "auteur": _full_name(c.created_by),
                    "date": c.created_at.strftime("%d/%m/%Y"),
                    "heure": c.created_at.strftime("%H:%M"),
                    "created_at": c.created_at.isoformat(),
                    "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                    "is_recent": is_recent,
                    "is_edited": is_edited,
                }
            )

        return Response(
            {
                "count": len(results),
                "results": results,
                "filters_echo": {k: v for k, v in request.query_params.items()},
            }
        )

    # ────────────────────────────────────────────────────────────
    # Grouped (centre / departement) — pour alimenter les selects
    # ────────────────────────────────────────────────────────────
    @action(detail=False, methods=["GET"], url_path="grouped")
    def grouped(self, request):
        """
        GET /prospection-comment-stats/grouped/?by=centre|departement|formation
        Retourne des options (clé + label + total) pour alimenter les <select> côté UI ;
        groupement selon le champ "by" demandé (centre ou departement ou formation).

        Permissions : même logique que sur latest().
        - Query params : tous ceux de _apply_filters, sauf le champ du groupement ("by")
        - Structure réponse JSON : voir docstring de classe et ci-dessous.
        """
        by = (request.query_params.get("by") or "centre").lower()
        allowed = {"centre", "departement", "formation"}
        if by not in allowed:
            return Response({"detail": f"'by' doit être dans {sorted(allowed)}"}, status=400)

        params = request.query_params.copy()
        params.pop(by, None)  # on supprime le filtre correspondant

        qs = self._apply_filters(self.get_queryset(), params)
        qs = qs.annotate(departement=Coalesce(Substr("prospection__centre__code_postal", 1, 2), Value("NA")))

        if by == "centre":
            group_fields = ["prospection__centre_id", "prospection__centre__nom"]
        elif by == "formation":
            group_fields = [
                "prospection__formation_id",
                "prospection__formation__nom",
                "prospection__formation__num_offre",
                "prospection__formation__type_offre__nom",
            ]
        else:  # departement
            group_fields = ["departement"]

        rows = list(qs.values(*group_fields).annotate(total=Count("id")).order_by(*group_fields))

        results = []
        for r in rows:
            if by == "centre":
                key = r.get("prospection__centre_id")
                label = r.get("prospection__centre__nom") or (f"Centre #{key}" if key is not None else "—")
            elif by == "formation":
                key = r.get("prospection__formation_id")
                label = (
                    f"{r.get('prospection__formation__nom') or '—'} "
                    f"(#{r.get('prospection__formation__num_offre') or '?'}, "
                    f"{r.get('prospection__formation__type_offre__nom') or '?'})"
                )
            else:
                key = r.get("departement")
                label = key or "—"

            results.append(
                {
                    **r,
                    "group_key": key,
                    "group_label": label,
                    "total": int(r.get("total") or 0),
                }
            )

        return Response(
            {
                "group_by": by,
                "results": results,
                "filters_echo": {k: v for k, v in request.query_params.items()},
            }
        )
