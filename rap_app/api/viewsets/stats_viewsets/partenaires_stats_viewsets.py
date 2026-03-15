# rap_app/api/viewsets/stats_viewsets/partenaires_stats_viewsets.py
from __future__ import annotations

from collections import OrderedDict
from typing import Dict, List, Optional, Tuple

from django.db.models import Count, F, IntegerField, Q, QuerySet, Value
from django.db.models.functions import Substr
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ....models.appairage import AppairageStatut
from ....models.partenaires import Partenaire
from ....models.prospection_choices import ProspectionChoices
from ...permissions import IsStaffOrAbove, is_staff_or_staffread
from ...serializers.base_serializers import EmptySerializer


class PartenaireStatsViewSet(viewsets.ViewSet):
    """
    ViewSet exposant des statistiques sur les Partenaires.

    Points d'entrée principaux :
        - GET /api/partenaire-stats/             : Statistiques globales sur les partenaires (action 'list')
        - GET /api/partenaire-stats/grouped/     : Statistiques groupées selon critère paramétrable (action personnalisée 'grouped')
        - GET /api/partenaire-stats/tops/        : Tops (classements) des partenaires selon critères (action personnalisée 'tops')

    ---------------
    Permissions :
    ---------------
    - Limite d'accès globale : permissions.IsAuthenticated (uniquement utilisateurs authentifiés)
    - Restrictions supplémentaires basées sur le périmètre métier :
        - Administrateur (is_superuser ou méthode is_admin du user): accès global à toutes les données partenaires
        - Staff (selon fonction is_staff_or_staffread(user)):
            - Accès limité à certains centres et/ou départements qui sont associés au user ou à son profil
            - Voir la docstring de _scope_partenaires_for_user pour détails précis sur les règles de visibilité (reproduction métier).
        - Candidats/Stagiaires ayant .is_candidat_or_stagiaire() : accès uniquement aux partenaires liés à leurs prospections
        - Utilisateurs "autres" (rôle non reconnu ou non authentifié): aucun accès aux statistiques (résultats vides)
    - À noter : La logique précise de reconnaissance staff/admin/candidat dépend de la fonction is_staff_or_staffread (permission importée) et des méthodes utilisateur, qui ne sont pas définies ici.

    ---------------
    Filtrage / queryset :
    ---------------
    - La totalité des actions web (list/grouped/tops) s'appuie sur une logique maison (_base_qs et _scope_partenaires_for_user) pour restreindre dynamiquement le QuerySet en fonction de l'utilisateur courant.
    - Pas de filter_backends explicite, ni de search_fields, ordering_fields ou filterset_class sur ce ViewSet.
    - _base_qs applique d'abord des 'filtres structurants' (personnalisables, mais laissés neutres dans _apply_base_filters), puis la restriction utilisateur.
    - Les paramètres de dates ('date_from', 'date_to') peuvent être passés en query params, utilisés pour filtrer les événements de prospection et d'appairage.

    ---------------
    Serializers :
    ---------------
    - Unique serializer utilisé : EmptySerializer, car ce ViewSet ne retourne que des objets Response JSON "faits main".
    """

    serializer_class = EmptySerializer
    permission_classes = [IsStaffOrAbove]

    # ------------------------------
    # Helpers scope staff/admin
    # ------------------------------

    def _is_admin_like(self, user) -> bool:
        """
        Détecte les utilisateurs ayant un rôle admin global (is_superuser ou méthode is_admin).
        Utilisé pour donner un accès sans restriction de périmètre métier.
        """
        return bool(
            getattr(user, "is_superuser", False)
            or (hasattr(user, "is_admin") and callable(user.is_admin) and user.is_admin())
        )

    def _staff_centre_ids(self, user) -> Optional[List[int]]:
        """
        Récupère la liste des IDs de centres autorisés pour le staff.
        Retourne None pour les admin/superadmin (accès global), [] pour un staff sans centre.
        """
        if self._is_admin_like(user):
            return None
        if is_staff_or_staffread(user) and hasattr(user, "centres"):
            return list(user.centres.values_list("id", flat=True))
        return []

    def _staff_departement_codes(self, user) -> List[str]:
        """
        Récupère les codes département autorisés pour le staff à partir de propriétés connues sur l'utilisateur ou son profil.
        Supporte différents formats de valeurs (str, collection, M2M...).
        """

        def _norm(val):
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
                    codes = _norm(getattr(owner, attr))
                    if codes:
                        return codes
        return []

    def _base_qs(self, request) -> QuerySet:
        """
        Produit le queryset de base, restricté selon l'utilisateur authentifié.
        Sert de fondation à toutes les actions list/grouped/tops.

        Explicitation métier :
            - Applique potentiellement des filtres "structurants" (_apply_base_filters)
            - Puis si staff/candidat/... restreint le périmètre visible (_scope_partenaires_for_user)

        Voir la docstring de _scope_partenaires_for_user pour la logique précise des restrictions.
        """
        qs = Partenaire.objects.all()
        qs = self._apply_base_filters(qs, request)
        qs = self._scope_partenaires_for_user(qs, getattr(request, "user", None))
        return qs

    def _scope_partenaires_for_user(self, qs: QuerySet, user):
        """
        Logique centrale du périmètre d'accès (filtrage métier).
        Règle : visibilité des partenaires selon rôle utilisateur.

        - admin/superadmin : accès global, pas de filtre supplémentaire
        - staff : union des partenaires associés à au moins un des centres du user OU à au moins un des départements du user/profil,
            pour :
                - Partenaire.default_centre
                - Partenaire.zip_code
                - Prospections.centre
                - Appairages.formation.centre
        - candidats/stagiaires (méthode is_candidat_or_stagiaire du user) : uniquement les partenaires liés à leurs prospections
        - tout autre cas (user inconnu, rôle test, non authentifié) : aucun accès

        À noter : La logique exacte du rôle staff/admin/candidat dépend de fonctions externes (is_staff_or_staffread, user.is_*), leur détail n'est pas visible ici.
        """
        if not (user and user.is_authenticated):
            return qs.none()

        # Accès complet pour admin/superadmin
        if self._is_admin_like(user):
            return qs

        # Restriction staff
        if is_staff_or_staffread(user):
            centre_ids = self._staff_centre_ids(user)
            dep_codes = self._staff_departement_codes(user)

            if not centre_ids and not dep_codes:
                return qs.none()

            q = Q()
            if centre_ids:
                q |= Q(default_centre_id__in=centre_ids)
                q |= Q(prospections__centre_id__in=centre_ids)
                q |= Q(appairages__formation__centre_id__in=centre_ids)
            if dep_codes:
                q_dep = Q()
                for code in dep_codes:
                    q_dep |= Q(zip_code__startswith=code)
                    q_dep |= Q(prospections__centre__code_postal__startswith=code)
                    q_dep |= Q(appairages__formation__centre__code_postal__startswith=code)
                q |= q_dep
            return qs.filter(q).distinct()

        # Cas candidat / stagiaire : uniquement ses partenaires via prospections
        if hasattr(user, "is_candidat_or_stagiaire") and user.is_candidat_or_stagiaire():
            return qs.filter(prospections__owner_id=user.id).distinct()

        # Aucun accès pour les autres cas non explicitement listés
        return qs.none()

    # ------------------------------
    # Helpers filtres
    # ------------------------------
    @staticmethod
    def _date_filters(request) -> Tuple[Optional[str], Optional[str]]:
        """
        Helper pour extraire les paramètres de dates ('date_from', 'date_to') dans la query.
        Utilisé par les différents calculs de stats sur la période.
        """
        df = request.query_params.get("date_from") or None
        dt = request.query_params.get("date_to") or None
        return df, dt

    @staticmethod
    def _apply_base_filters(qs, request):
        """
        Point d'extension pour d'éventuels filtres supplémentaires (non activé ici).
        (exemple possible : filtrer par centre_id/departement/pagination/etc. en fonction des besoins front)
        Par défaut : neutre, renvoie le queryset d'origine.
        """
        return qs

    @staticmethod
    def _mk_pros_filters(date_from: Optional[str], date_to: Optional[str]) -> Q:
        """
        Construit un objet Q pour filtrer les prospections sur une période donnée (entre date_from et date_to).
        """
        q = Q()
        if date_from:
            q &= Q(prospections__date_prospection__date__gte=date_from)
        if date_to:
            q &= Q(prospections__date_prospection__date__lte=date_to)
        return q

    @staticmethod
    def _mk_app_filters(date_from: Optional[str], date_to: Optional[str]) -> Q:
        """
        Construit un objet Q pour filtrer les appairages sur une période donnée (entre date_from et date_to).
        """
        q = Q()
        if date_from:
            q &= Q(appairages__date_appairage__date__gte=date_from)
        if date_to:
            q &= Q(appairages__date_appairage__date__lte=date_to)
        return q

    # ------------------------------
    # GET /api/partenaire-stats/  (overview)
    # ------------------------------
    def list(self, request):
        """
        Action standard : Liste (GET) – Statistiques globales sur l'ensemble des partenaires.

        Permission :
            - Uniquement utilisateur authentifié (permissions.IsAuthenticated)
            - Périmètre métiers supplémentaire : filtrage personnalisé selon le rôle (voir _scope_partenaires_for_user)
                - admin : global, staff : selon centre/dpt, candidat : partenaires de ses prospections, autre : aucun

        Intention métier :
            - Fournir une vue d’ensemble sur les KPIs des partenaires accessibles à l'utilisateur courant pour le périmètre filtré:
                - Nombre total de partenaires
                - Nombre avec contact, site web, adresse
                - Total de prospections/appairages liées
                - Nb de formations associées via appairage/prospection
                - Statut détaillé des prospections et appairages

        Filtres :
            - Peut prendre `date_from` et `date_to` en query params pour limiter la période des prospections et appairages inclus.

        Sérializer :
            - EmptySerializer (les données sont retournées sous forme de dictionnaire JSON personnalisé)

        Structure de réponse JSON (extrait du code, structure réelle, contraction possible selon vocabulaire du fichier) :
        {
            "kpis": {
                "nb_partenaires": ...,
                "nb_avec_contact": ...,
                "nb_avec_web": ...,
                "nb_avec_adresse": ...,
                "nb_formations_liees": ...,
                "prospections_total": ...,
                "appairages_total": ...,
                "prospections": {statut1: n1, statut2: n2, ...},
                "appairages": {statutX: mX, ...}
            }
        }
        """
        date_from, date_to = self._date_filters(request)
        base_qs = self._base_qs(request)

        pros_q = self._mk_pros_filters(date_from, date_to)
        app_q = self._mk_app_filters(date_from, date_to)

        # KPIs globaux
        agg = base_qs.aggregate(
            nb_partenaires=Count("id", distinct=True),
            nb_avec_contact=Count(
                "id",
                distinct=True,
                filter=(
                    (Q(contact_nom__isnull=False) & ~Q(contact_nom=""))
                    | (Q(contact_email__isnull=False) & ~Q(contact_email=""))
                    | (Q(contact_telephone__isnull=False) & ~Q(contact_telephone=""))
                ),
            ),
            nb_avec_web=Count(
                "id",
                distinct=True,
                filter=Q(website__isnull=False) | Q(social_network_url__isnull=False),
            ),
            nb_avec_adresse=Count(
                "id",
                distinct=True,
                filter=Q(street_name__isnull=False) | Q(zip_code__isnull=False) | Q(city__isnull=False),
            ),
            prospections_total=Count("prospections", distinct=True, filter=pros_q),
            appairages_total=Count("appairages", distinct=True, filter=app_q),
            # formations liées via appairages + prospections
            nb_formations_app=Count(
                "appairages__formation",
                distinct=True,
                filter=app_q & Q(appairages__formation__isnull=False),
            ),
            nb_formations_pros=Count(
                "prospections__formation",
                distinct=True,
                filter=pros_q & Q(prospections__formation__isnull=False),
            ),
        )

        nb_formations_liees = (agg.get("nb_formations_app") or 0) + (agg.get("nb_formations_pros") or 0)

        # Détails par statut (prospections)
        pros_status_map = OrderedDict(
            [
                ("a_faire", ProspectionChoices.STATUT_A_FAIRE),
                ("en_cours", ProspectionChoices.STATUT_EN_COURS),
                ("a_relancer", ProspectionChoices.STATUT_A_RELANCER),
                ("acceptee", ProspectionChoices.STATUT_ACCEPTEE),
                ("refusee", ProspectionChoices.STATUT_REFUSEE),
                ("annulee", ProspectionChoices.STATUT_ANNULEE),
                ("non_renseigne", ProspectionChoices.STATUT_NON_RENSEIGNE),
            ]
        )
        pros_counts: Dict[str, int] = {}
        for key, val in pros_status_map.items():
            pros_counts[key] = (
                base_qs.filter(pros_q & Q(prospections__statut=val)).values("prospections__id").distinct().count()
            )

        # Détails par statut (appairages)
        app_status_map = OrderedDict(
            [
                ("transmis", AppairageStatut.TRANSMIS),
                ("en_attente", AppairageStatut.EN_ATTENTE),
                ("accepte", AppairageStatut.ACCEPTE),
                ("refuse", AppairageStatut.REFUSE),
                ("annule", AppairageStatut.ANNULE),
                ("a_faire", AppairageStatut.A_FAIRE),
                ("contrat_a_signer", AppairageStatut.CONTRAT_A_SIGNER),
                ("contrat_en_attente", AppairageStatut.CONTRAT_EN_ATTENTE),
                ("appairage_ok", AppairageStatut.APPAIRAGE_OK),
            ]
        )
        app_counts: Dict[str, int] = {}
        for key, val in app_status_map.items():
            app_counts[key] = (
                base_qs.filter(app_q & Q(appairages__statut=val)).values("appairages__id").distinct().count()
            )

        data = {
            "kpis": {
                "nb_partenaires": agg.get("nb_partenaires") or 0,
                "nb_avec_contact": agg.get("nb_avec_contact") or 0,
                "nb_avec_web": agg.get("nb_avec_web") or 0,
                "nb_avec_adresse": agg.get("nb_avec_adresse") or 0,
                "nb_formations_liees": nb_formations_liees,
                "prospections_total": agg.get("prospections_total") or 0,
                "appairages_total": agg.get("appairages_total") or 0,
                "prospections": pros_counts,
                "appairages": app_counts,
            }
        }
        return Response(data)

    # ------------------------------
    # GET /api/partenaire-stats/grouped/?by=...
    # ------------------------------
    @action(detail=False, methods=["get"])
    def grouped(self, request):
        """
        Action personnalisée (GET) : Statistiques groupées par critère métier.

        Permissions :
            - Uniquement utilisateur authentifié (cf. permission globale)
            - Data filtrée comme pour list (périmètre personnalisé via _base_qs/_scope_partenaires_for_user ; voir plus haut)

        Intention métier :
            - Fournir les mêmes indicateurs globaux que 'list', mais regroupés par un ou plusieurs champs,
              selon le paramètre `by` passé dans la query string.
              Exemples : type, secteur, centre, département, actions.
            - Support des statuts détaillés (prospection, appairage) dans l'agrégation groupée : pour chaque groupe,
              le nombre d'occurrences par statut individuel

        Filtres supportés :
            - 'by' en query param (par défaut : type), parmi {"type", "secteur", "centre", "departement", "actions"}
            - Paramètres de période (date_from/date_to) pour limiter la période sur les actions concernées

        Structure exacte de la réponse JSON : visible dans le code :
        {
            'by': ...,
            'results': [
                {
                    ...fields de groupement (ex : 'type', 'secteur_activite', etc.)
                    nb_partenaires,
                    nb_avec_contact,
                    nb_avec_web,
                    nb_avec_adresse,
                    prospections_total,
                    appairages_total,
                    ...statutX...
                },
                ...
            ]
        }
        - Les clés statutX correspondent aux noms des statuts de prospections/appairages selon fusion (voir fusion annot_status)
        - Les champs de groupement dépendent de la valeur du paramètre 'by'.
        """
        by = (request.query_params.get("by") or "type").strip()

        allowed = {"type", "secteur", "centre", "departement", "actions"}
        if by not in allowed:
            by = "type"

        date_from, date_to = self._date_filters(request)
        pros_q = self._mk_pros_filters(date_from, date_to)
        app_q = self._mk_app_filters(date_from, date_to)

        qs = self._base_qs(request)

        # Group fields
        group_fields: List[str] = []
        if by == "type":
            group_fields = ["type"]
        elif by == "secteur":
            group_fields = ["secteur_activite"]
        elif by == "centre":
            group_fields = ["default_centre_id", "default_centre__nom"]
        elif by == "departement":
            qs = qs.annotate(departement=Substr("zip_code", 1, 2))
            group_fields = ["departement"]
        elif by == "actions":
            group_fields = ["actions"]

        # Prospection status annotations
        pros_status_pairs = [
            ("a_faire", ProspectionChoices.STATUT_A_FAIRE),
            ("en_cours", ProspectionChoices.STATUT_EN_COURS),
            ("a_relancer", ProspectionChoices.STATUT_A_RELANCER),
            ("acceptee", ProspectionChoices.STATUT_ACCEPTEE),
            ("refusee", ProspectionChoices.STATUT_REFUSEE),
            ("annulee", ProspectionChoices.STATUT_ANNULEE),
            ("non_renseigne", ProspectionChoices.STATUT_NON_RENSEIGNE),
        ]
        pros_status_counts = {
            key: Count("prospections", filter=pros_q & Q(prospections__statut=val), distinct=True)
            for key, val in pros_status_pairs
        }

        # Appairage status annotations
        app_status_pairs = [
            ("transmis", AppairageStatut.TRANSMIS),
            ("en_attente", AppairageStatut.EN_ATTENTE),
            ("accepte", AppairageStatut.ACCEPTE),
            ("refuse", AppairageStatut.REFUSE),
            ("annule", AppairageStatut.ANNULE),
            ("a_faire", AppairageStatut.A_FAIRE),
            ("contrat_a_signer", AppairageStatut.CONTRAT_A_SIGNER),
            ("contrat_en_attente", AppairageStatut.CONTRAT_EN_ATTENTE),
            ("appairage_ok", AppairageStatut.APPAIRAGE_OK),
        ]
        app_status_counts_raw = {
            key: Count("appairages", filter=app_q & Q(appairages__statut=val), distinct=True)
            for key, val in app_status_pairs
        }

        # Fusion : on évite les doublons de statuts (par exemple 'a_faire' peut exister dans chaque famille, on préfixe)
        annot_status = {**pros_status_counts}
        for k, v in app_status_counts_raw.items():
            key = k if k not in annot_status else f"app_{k}"
            annot_status[key] = v

        results = (
            qs.values(*group_fields)
            .annotate(
                nb_partenaires=Count("id", distinct=True),
                nb_avec_contact=Count(
                    "id",
                    distinct=True,
                    filter=(
                        (Q(contact_nom__isnull=False) & ~Q(contact_nom=""))
                        | (Q(contact_email__isnull=False) & ~Q(contact_email=""))
                        | (Q(contact_telephone__isnull=False) & ~Q(contact_telephone=""))
                    ),
                ),
                nb_avec_web=Count(
                    "id",
                    distinct=True,
                    filter=Q(website__isnull=False) | Q(social_network_url__isnull=False),
                ),
                nb_avec_adresse=Count(
                    "id",
                    distinct=True,
                    filter=Q(street_name__isnull=False) | Q(zip_code__isnull=False) | Q(city__isnull=False),
                ),
                prospections_total=Count("prospections", distinct=True, filter=pros_q),
                appairages_total=Count("appairages", distinct=True, filter=app_q),
                **annot_status,
            )
            .order_by(*group_fields)
        )

        return Response(
            {
                "by": by,
                "results": list(results),
            }
        )

    # ------------------------------
    # GET /api/partenaire-stats/tops/
    # ------------------------------
    @action(detail=False, methods=["get"])
    def tops(self, request):
        """
        Action personnalisée (GET) : Classements "top" des partenaires les plus actifs (appairages/prospections).

        Permissions :
            - Uniquement utilisateur authentifié (cf. globaux)
            - Périmètre métier, filtre personnalisé (voir _base_qs/_scope_partenaires_for_user)

        Intention métier :
            - Fournir deux classements TOP :
                * top_appairages : les 10 partenaires avec le plus grand nombre d’appairages (dans la période filtrée)
                * top_prospections : les 10 partenaires avec le plus grand nombre de prospections (dans la période filtrée)
            - Classement décroissant puis alphabétique

        Filtres :
            - `date_from`, `date_to` en query params pour filtrer la période des actions.

        Structure exacte de la réponse JSON :
        {
            "top_appairages": [{"id":..., "nom":..., "count":...}, ...],
            "top_prospections": [{"id":..., "nom":..., "count":...}, ...],
        }
        N.B. : Le nombre d’objets dans chaque liste est limité à 10 éléments.

        """
        date_from, date_to = self._date_filters(request)
        pros_q = self._mk_pros_filters(date_from, date_to)
        app_q = self._mk_app_filters(date_from, date_to)

        base_qs = self._base_qs(request)

        # TOP par appairages
        top_appairages = (
            base_qs.annotate(appairages_count=Count("appairages", distinct=True, filter=app_q))
            .filter(appairages_count__gt=0)
            .values("id", "nom", "appairages_count")
            .order_by("-appairages_count", "nom")[:10]
        )
        top_appairages = [{"id": r["id"], "nom": r["nom"], "count": r["appairages_count"]} for r in top_appairages]

        # TOP par prospections
        top_prospections = (
            base_qs.annotate(prospections_count=Count("prospections", distinct=True, filter=pros_q))
            .filter(prospections_count__gt=0)
            .values("id", "nom", "prospections_count")
            .order_by("-prospections_count", "nom")[:10]
        )
        top_prospections = [
            {"id": r["id"], "nom": r["nom"], "count": r["prospections_count"]} for r in top_prospections
        ]

        return Response(
            {
                "top_appairages": top_appairages,
                "top_prospections": top_prospections,
            }
        )
