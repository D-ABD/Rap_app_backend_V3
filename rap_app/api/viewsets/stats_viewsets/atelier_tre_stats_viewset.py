from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from django.db.models import Case, Count, IntegerField, Q, Sum, Value, When
from django.db.models.functions import Coalesce, Substr
from django.utils.dateparse import parse_date
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ....models.atelier_tre import AtelierTRE, AtelierTREPresence, PresenceStatut
from ...permissions import IsStaffOrAbove, is_staff_or_staffread
from ...serializers.base_serializers import EmptySerializer


def _parse_date(value: str | None):
    if not value:
        return None
    try:
        return parse_date(value)  # YYYY-MM-DD
    except Exception:
        return None


def _to_int_or_none(v) -> Optional[int]:
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


class AtelierTREStatsViewSet(viewsets.ViewSet):
    """
    ViewSet API REST pour la consultation agrégée des statistiques des ateliers TRE (Techniques Recherche d’Emploi).

    Points d’entrée :
      - GET /api/ateliertre-stats/ (→ list)
          → Vue synthétique (indicateurs globaux)
      - GET /api/ateliertre-stats/grouped/ (→ grouped)
          → Vue groupée par centre, département ou type d’atelier (statistiques par groupe)
      - GET /api/ateliertre-stats/tops/ (→ tops)
          → Top 10 des types d’ateliers et des centres selon le volume d’ateliers

    ─────────────────────────────────────────────────────────────
    1. Permissions d’accès
    ─────────────────────────────────────────────────────────────
    - permission_classes = [IsStaffOrAbove]
        - Seuls les utilisateurs avec permission “IsStaffOrAbove” peuvent accéder aux points d’API de ce ViewSet.
        - Cette permission inclut : les superadmin, admin, et certain staff (voir code “IsStaffOrAbove” pour le détail complet).
        - Les autres utilisateurs reçoivent une réponse d’accès refusé.

    ─────────────────────────────────────────────────────────────
    2. Filtrage & queryset
    ─────────────────────────────────────────────────────────────
    - Il n’existe pas de méthode `get_queryset()`, mais un équivalent via get_base_queryset().
        - Cette méthode restreint les données visibles selon le rôle :
            * Administrateur/superadmin : accès à tous les ateliers
            * Staff rattaché à des centres/départements spécifiques : accès restreint à leur périmètre (centres ou départements)
            * Autres : aucun accès
    - Filtres via paramètres de requête sur chaque action :
        - date_from (YYYY-MM-DD) et date_to : filtre sur la date de l’atelier
        - centre, centre_id : filtre par identifiant du centre
        - departement : filtre par code département (2 lettres/chiffres)
        - type_atelier, type : filtre par type d’atelier
      Les filtres sont appliqués dynamiquement dans `_apply_filters`.
    - Pas de filter_backends, search_fields, ordering_fields, filterset_class en place dans cette vue (tout est fait à la main).

    ─────────────────────────────────────────────────────────────
    3. Actions standards (list seulement)
    ─────────────────────────────────────────────────────────────
    - list (GET)
        - Objectif métier : fournir une vue synthétique chiffrée des ateliers TRE, sur le périmètre de visibilité de l’utilisateur, éventuellement filtré.
        - Serializer utilisé : EmptySerializer (pas de validation sur l’entrée)
        - Structure de réponse :
            {
                "kpis": {
                    "nb_ateliers": <int>,                # Nombre total d'ateliers trouvés
                    "nb_candidats_uniques": <int>,       # Nombre de candidats distincts inscrits sur ces ateliers
                    "inscrits_total": <int>,             # Nombre total d'inscriptions (pas forcément unique)
                    "ateliers": {<type>: <count>, ...},  # Détail par type d’atelier
                    "presences_total": <int>,            # Nombre total de présences enregistrées
                    "presences": {...},                  # Répartition des présences par statut (clé = valeur PresenceStatut)
                    "taux_presence": <float|null>,       # Taux de présence (%) global
                },
                "filters_echo": { ... }   # Echo brut des filtres GET utilisés
            }

        - Aucun autre action standard (retrieve, create, update, destroy) n’est implémentée/documentée dans ce ViewSet.

    ─────────────────────────────────────────────────────────────
    4. Actions personnalisées
    ─────────────────────────────────────────────────────────────

    - grouped (GET /grouped/)
        - Objectif métier : obtenir des statistiques agrégées groupées selon l’un des axes suivants :
            centre, département ou type d’atelier (paramètre required : by=centre|departement|type_atelier, par défaut centre).
        - Structure de la requête :
            - Paramètre GET “by” obligatoire (centre|departement|type_atelier)
            - Filtres additionnels identiques à ceux de list
        - Structure de la réponse :
            {
                "by": "<axe de regroupement>",
                "results": [
                    {
                        "group_key": ...,
                        "group_label": ...,
                        "nb_ateliers": <int>,
                        "candidats_uniques": <int>,
                        "presences_total": <int>,
                        "present": <int>,
                        "absent": <int>,
                        "excuse": <int>,
                        "inconnu": <int>,
                        "taux_presence": <float|null>
                    },
                    ...
                ],
                "filters_echo": { ... }    # Echo brut des filtres GET utilisés
            }
        - Si le paramètre “by” est absent ou invalide, retourne 400.

    - tops (GET /tops/)
        - Objectif métier : afficher les “top 10” des types d’atelier et des centres les plus nombreux sur le périmètre de l’utilisateur (optionnellement filtré).
        - Requête : accepte les mêmes filtres standard via GET.
        - Structure de la réponse :
            {
                "top_types": [
                    { "type_atelier": <str>, "label": <str>, "count": <int> },
                    ...
                ],
                "top_centres": [
                    { "id": <int>, "nom": <str>, "count": <int> },
                    ...
                ],
                "filters_echo": { ... }
            }

    ─────────────────────────────────────────────────────────────
    5. Éléments non parfaitement documentables
    ─────────────────────────────────────────────────────────────
    - Le détail exact du mapping de certains choix (type_atelier, PresenceStatut) dépend de la configuration du modèle (cf. AtelierTRE, PresenceStatut), non recapitulé ici.
    - Le serializer utilisé est un EmptySerializer, donc pas de schéma d’entrée attendu/certifié côté API.
    - Les permissions “IsStaffOrAbove” dépendent de l’implémentation externe (vérifier code pour plus de détail).
    """

    serializer_class = EmptySerializer
    permission_classes = [IsStaffOrAbove]

    # ─────────────────────────────────────────────────────────────
    # Helpers scope staff/admin
    # ─────────────────────────────────────────────────────────────

    def _is_admin_like(self, user) -> bool:
        """
        Détermine si l'utilisateur dispose du statut d'administrateur ou équivalent.

        - Renvoie True pour les superutilisateurs ou ceux qui exposent la méthode is_admin() et qu'elle retourne True.
        - Utilisé pour élargir le scope des données accessibles dans le ViewSet.
        """
        return bool(
            getattr(user, "is_superuser", False)
            or (hasattr(user, "is_admin") and callable(user.is_admin) and user.is_admin())
        )

    def _staff_centre_ids(self, user) -> Optional[List[int]]:
        """
        Retourne la liste des ids de centres accessibles pour un utilisateur staff/staff_read,
        ou None si administrateur (droit total sur tous les centres).

        - Si l’utilisateur n’a pas accès à de centres, retourne [] (liste vide).
        """
        if self._is_admin_like(user):
            return None
        if is_staff_or_staffread(user) and hasattr(user, "centres"):
            return list(user.centres.values_list("id", flat=True))
        return []

    def _staff_departement_codes(self, user) -> List[str]:
        """
        Retourne la liste (chaînes 'XX') des départements associés à l'utilisateur, via attributs .departements_codes ou .departements,
        sur l'objet user directement ou profil utilisateur si présent.

        - Si aucun département, retourne [].
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

    def _scope_ateliers_for_user(self, qs):
        """
        Restreint le queryset d’ateliers selon le scope donné par le rôle de l’utilisateur courant :
        - Admin/superuser : pas de restriction
        - Staff/staff_read : ateliers limités aux centres et/ou départements rattachés à l’utilisateur
        - Autres : aucun accès (qs.none())
        N.B. : Le mécanisme repose sur self.request.user et sur les fonctions helpers ci-dessus.
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
                q |= Q(centre_id__in=centre_ids)
            if dep_codes:
                q_dep = Q()
                for code in dep_codes:
                    q_dep |= Q(centre__code_postal__startswith=str(code)[:2])
                q |= q_dep
            return qs.filter(q).distinct()
        return qs.none()

    def get_base_queryset(self):
        """
        Retourne la base queryset des ateliers TRE, incluant centre lié,
        déjà restreint avec _scope_ateliers_for_user pour garantir la visibilité correcte selon le rôle.
        """
        qs = AtelierTRE.objects.select_related("centre")
        return self._scope_ateliers_for_user(qs)

    # ─────────────────────────────────────────────────────────────
    # Filtres
    # ─────────────────────────────────────────────────────────────

    def _apply_filters(self, qs, request):
        """
        Applique les filtres reçus en paramètres GET sur un queryset d’ateliers TRE.

        Filtres acceptés :
          - date_from (YYYY-MM-DD) : inclusif (>=)
          - date_to (YYYY-MM-DD) : inclusif (<=)
          - centre / centre_id : identifiant du centre
          - departement : code département (2 caractères)
          - type_atelier / type : valeur type d’atelier

        Si un filtre n’est pas fourni ou erroné, il est ignoré.
        """
        date_from = _parse_date(request.query_params.get("date_from"))
        date_to = _parse_date(request.query_params.get("date_to"))
        centre_raw = request.query_params.get("centre") or request.query_params.get("centre_id")
        centre_id = _to_int_or_none(centre_raw)
        departement_raw = request.query_params.get("departement")
        departement = (str(departement_raw).strip().zfill(2)[:2]) if departement_raw else None
        type_atelier = request.query_params.get("type_atelier") or request.query_params.get("type")

        if date_from:
            qs = qs.filter(date_atelier__date__gte=date_from)
        if date_to:
            qs = qs.filter(date_atelier__date__lte=date_to)
        if centre_id is not None:
            qs = qs.filter(centre_id=centre_id)
        if departement:
            qs = qs.filter(centre__code_postal__startswith=departement)
        if type_atelier:
            qs = qs.filter(type_atelier=type_atelier)
        return qs

    def _presence_counts_for_qs(self, qs):
        """
        Calcule le nombre de présences par statut pour la liste d’ateliers passée.

        - Retour : (total présences, {statut: count})
        - Statuts : INCONNU, PRESENT, ABSENT, EXCUSE
        """
        pres_qs = AtelierTREPresence.objects.filter(atelier__in=qs)
        total = pres_qs.count()
        by_status = dict(pres_qs.values_list("statut").annotate(c=Count("id", distinct=True)))
        norm = {
            PresenceStatut.INCONNU: by_status.get(PresenceStatut.INCONNU, 0),
            PresenceStatut.PRESENT: by_status.get(PresenceStatut.PRESENT, 0),
            PresenceStatut.ABSENT: by_status.get(PresenceStatut.ABSENT, 0),
            PresenceStatut.EXCUSE: by_status.get(PresenceStatut.EXCUSE, 0),
        }
        return total, norm

    # ─────────────────────────────────────────────────────────────
    # Overview (list)
    # ─────────────────────────────────────────────────────────────

    def list(self, request, *args, **kwargs):
        """
        Action standard DRF (GET /api/ateliertre-stats/ ):
        Fournit une vue synthétique agrégée des ateliers TRE accessibles à l’utilisateur courant,
        comprenant les principaux indicateurs quantitatifs, répartitions, et taux de présence (filtrables via GET).

        - Permissions : voir permission_classes (IsStaffOrAbove)
        - S’applique strictement au périmètre des centres/départements autorisés pour l’utilisateur, potentiellement restreint par les filtres GET.
        - Response : voir docstring de la classe (détail de la structure “kpis”, “filters_echo”)
        """
        qs = self._apply_filters(self.get_base_queryset(), request)
        nb_ateliers = qs.count()

        from rap_app.models.candidat import Candidat

        nb_candidats_uniques = Candidat.objects.filter(ateliers_tre__in=qs).distinct().count()

        inscrits_total = qs.aggregate(total=Count("candidats", distinct=True))["total"] or 0
        type_map = dict(qs.values_list("type_atelier").annotate(c=Count("id", distinct=True)))
        pres_total, pres_map = self._presence_counts_for_qs(qs)

        # 🔢 Calcul du taux de présence global si applicable
        denom = (
            pres_map.get(PresenceStatut.PRESENT, 0)
            + pres_map.get(PresenceStatut.ABSENT, 0)
            + pres_map.get(PresenceStatut.EXCUSE, 0)
        )
        taux_presence = round((pres_map.get(PresenceStatut.PRESENT, 0) / denom * 100.0), 1) if denom > 0 else None

        data = {
            "kpis": {
                "nb_ateliers": nb_ateliers,
                "nb_candidats_uniques": nb_candidats_uniques,
                "inscrits_total": inscrits_total,
                "ateliers": type_map,
                "presences_total": pres_total,
                "presences": pres_map,
                "taux_presence": taux_presence,  # ✅ ajouté
            },
            "filters_echo": {k: v for k, v in request.query_params.items()},
        }
        return Response(data)

    # ─────────────────────────────────────────────────────────────
    # Grouped
    # ─────────────────────────────────────────────────────────────
    @action(detail=False, methods=["GET"], url_path="grouped")
    def grouped(self, request, *args, **kwargs):
        """
        Action personnalisée GET /grouped/
        Fournit des statistiques agrégées, groupées :
            - par centre (par défaut)
            - ou par département
            - ou par type d’atelier
        selon le paramètre GET “by”.
        Retourne les KPIs (nombre d’ateliers, participants, présences, absences, taux de présence, etc.) pour chaque groupe.

        Permissions :
            - Identiques à l’action list (IsStaffOrAbove, scope restreint utilisateur)
        Requête :
            - GET /api/ateliertre-stats/grouped/?by=centre|departement|type_atelier
            - Filtres additionnels identiques (facultatifs)
        Réponse : voir docstring de la classe et ci-dessous pour structure exacte.

        Retourne 400 si le paramètre "by" est absent ou invalide.
        """
        by = request.query_params.get("by") or "centre"
        if by not in ("centre", "departement", "type_atelier"):
            return Response({"detail": "Paramètre 'by' invalide."}, status=400)

        qs = self._apply_filters(self.get_base_queryset(), request)

        # Détermination des champs de groupage selon l’axe choisi
        if by == "centre":
            group_fields: Tuple[str, ...] = ("centre_id", "centre__nom")
        elif by == "departement":
            qs = qs.annotate(departement=Coalesce(Substr("centre__code_postal", 1, 2), Value("NA")))
            group_fields = ("departement",)
        else:
            group_fields = ("type_atelier",)

        # Pré-calcul des présences par statut avec annotation
        present = Sum(
            Case(When(presences__statut=PresenceStatut.PRESENT, then=1), default=0, output_field=IntegerField())
        )
        absent = Sum(
            Case(When(presences__statut=PresenceStatut.ABSENT, then=1), default=0, output_field=IntegerField())
        )
        excuse = Sum(
            Case(When(presences__statut=PresenceStatut.EXCUSE, then=1), default=0, output_field=IntegerField())
        )
        inconnu = Sum(
            Case(When(presences__statut=PresenceStatut.INCONNU, then=1), default=0, output_field=IntegerField())
        )

        base = (
            qs.values(*group_fields)
            .annotate(
                nb_ateliers=Count("id", distinct=True),
                candidats_uniques=Count("candidats", distinct=True),
                presences_total=Count("presences", distinct=True),
                present=present,
                absent=absent,
                excuse=excuse,
                inconnu=inconnu,
            )
            .order_by(*group_fields)
        )

        results: List[Dict[str, Any]] = []
        for row in base:
            if by == "centre":
                group_key = row.get("centre_id")
                group_label = row.get("centre__nom") or (f"Centre #{group_key}" if group_key else "—")
            elif by == "departement":
                group_key = row.get("departement")
                group_label = group_key or "—"
            else:
                group_key = row.get("type_atelier")
                # Si le mapping human readable du type_atelier n'est pas trouvé, renvoyer la valeur brute ou "—"
                group_label = dict(AtelierTRE.TypeAtelier.choices).get(group_key, group_key or "—")

            # 🔢 Calcul du taux de présence pour le groupe
            denom = (row["present"] or 0) + (row["absent"] or 0) + (row["excuse"] or 0)
            taux_presence = round((row["present"] / denom * 100.0), 1) if denom > 0 else None

            results.append(
                {
                    "group_key": group_key,
                    "group_label": group_label,
                    **row,
                    "taux_presence": taux_presence,  # ✅ ajouté
                }
            )

        return Response(
            {
                "by": by,
                "results": results,
                "filters_echo": {k: v for k, v in request.query_params.items()},
            }
        )

    # ─────────────────────────────────────────────────────────────
    # Tops
    # ─────────────────────────────────────────────────────────────
    @action(detail=False, methods=["GET"], url_path="tops")
    def tops(self, request, *args, **kwargs):
        """
        Action personnalisée GET /tops/
        Retourne les "top 10" parmi :
            - les types d’atelier les plus proposés
            - les centres organisant le plus d’ateliers
        ainsi que le “filters_echo”.

        - Permissions : IsStaffOrAbove, visibilité restreinte utilisateur.
        - Filtres GET supportés (identiques).
        - Structure de la réponse : voir docstring de la classe et ci-dessous.

        Format de la réponse :
        {
            "top_types": [
                {"type_atelier": <str>, "label": <str>, "count": <int> },
                ...
            ],
            "top_centres": [
                {"id": <int>, "nom": <str>, "count": <int> },
                ...
            ],
            "filters_echo": { ... }
        }
        """
        qs = self._apply_filters(self.get_base_queryset(), request)

        top_types_qs = qs.values("type_atelier").annotate(count=Count("id", distinct=True)).order_by("-count")[:10]
        top_types = [
            {
                "type_atelier": r["type_atelier"],
                "label": dict(AtelierTRE.TypeAtelier.choices).get(r["type_atelier"], r["type_atelier"]),
                "count": r["count"],
            }
            for r in top_types_qs
        ]

        top_centres_qs = (
            qs.values("centre_id", "centre__nom").annotate(count=Count("id", distinct=True)).order_by("-count")[:10]
        )
        top_centres = [
            {"id": r["centre_id"], "nom": r["centre__nom"] or f"Centre #{r['centre_id']}", "count": r["count"]}
            for r in top_centres_qs
        ]

        return Response(
            {
                "top_types": top_types,
                "top_centres": top_centres,
                "filters_echo": {k: v for k, v in request.query_params.items()},
            }
        )
