from __future__ import annotations

from typing import Iterable, Literal, Optional

from django.db import models
from django.db.models import Count, F, Q, Sum, Value
from django.db.models.functions import Coalesce, Greatest, NullIf, Substr
from django.forms import CharField
from django.utils import timezone
from django.utils.dateparse import parse_date
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from ....models.centres import Centre
from ....models.statut import Statut
from ....models.types_offre import TypeOffre
from ...permissions import IsStaffOrAbove, is_staff_or_staffread
from ...roles import is_admin_like
from ...serializers.base_serializers import EmptySerializer

try:
    from ..permissions import IsOwnerOrStaffOrAbove  # type: ignore
except Exception:  # pragma: no cover
    IsOwnerOrStaffOrAbove = IsAuthenticated  # fallback sécurisé

try:
    from ..mixins import RestrictToUserOwnedQueryset  # type: ignore
except Exception:  # pragma: no cover

    class RestrictToUserOwnedQueryset:  # stub minimal
        def restrict_queryset_to_user(self, qs):
            return qs


from ....models.appairage import Appairage, AppairageStatut  # ← NEW
from ....models.candidat import Candidat

# ⚠️ Ajustez les imports selon votre arborescence réelle
from ....models.formations import Formation

GroupKey = Literal["formation", "centre", "departement", "type_offre", "statut"]


def _candidate_en_formation_q(prefix: str = "") -> Q:
    field = lambda name: f"{prefix}{name}"
    return (
        Q(**{field("parcours_phase"): Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION})
        | Q(**{field("statut"): Candidat.StatutCandidat.EN_FORMATION})
    )


def _candidate_phase_q(phase: str, prefix: str = "") -> Q:
    return Q(**{f"{prefix}parcours_phase": phase})


def _candidate_statut_metier_q(value: str, prefix: str = "") -> Q:
    return Candidat.statut_metier_q(value, prefix=prefix)


class FormationStatsViewSet(RestrictToUserOwnedQueryset, GenericViewSet):
    """
    Statistiques formations enrichies avec des KPI candidat alignés sur la
    lecture métier actuelle du parcours (admissibilité, GESPERS, appairage,
    accompagnement TRE, formation, abandon).
    """
    """
    Reporting agrégé sur les formations visibles par l'utilisateur courant.

    Le queryset applique un scoping staff/admin-like, exclut les archives par
    défaut, puis accepte des filtres manuels sur les dates, le centre, le
    département, le type d'offre et le statut.

    Endpoints principaux :
    - `list` pour les KPI globaux ;
    - `grouped` pour les agrégats par axe métier ;
    - `tops` pour les classements opérationnels ;
    - `filter_options` pour alimenter les sélecteurs du front.
    """

    serializer_class = EmptySerializer
    permission_classes = [IsStaffOrAbove]

    def _error_response(self, message, status_code=status.HTTP_400_BAD_REQUEST, errors=None):
        payload = {
            "success": False,
            "message": message,
            "data": None,
        }
        if errors is not None:
            payload["errors"] = errors
        return Response(payload, status=status_code)

    # ────────────────────────────────────────────────────────────
    # Helpers périmètre user
    # ────────────────────────────────────────────────────────────
    def _is_admin_like(self, user) -> bool:
        """
        Helper interne : True si l’utilisateur est superuser ou admin.
        Logique :
          - user.is_superuser
          - ou user.is_admin() si la méthode existe sur l’objet user
        """
        return is_admin_like(user)

    def _staff_centre_ids(self, user) -> Optional[list[int]]:
        """
        Retourne les id de centres accessibles pour le staff/staffread.
        - Si admin-like : retourne None (accès global)
        - Si staff avec attribut centres : retourne la liste des ids
        - Sinon : liste vide (aucun accès)
        """
        if self._is_admin_like(user):
            return None
        if is_staff_or_staffread(user) and hasattr(user, "centres"):
            return list(user.centres.values_list("id", flat=True))
        return []

    def _staff_departement_codes(self, user) -> list[str]:
        """
        Retourne les codes départements accessibles (extraction sur centre, user ou user.profile)
        - Cherche des attributs 'departements_codes' ou 'departements' sur user ou user.profile
        - Retourne toujours liste de strings (codes sur 2 caractères)
        """

        def _norm_codes(val):
            if val is None:
                return []
            if hasattr(val, "all"):  # M2M
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

    def _scope_formations_for_user(self, qs, user):
        """
        Applique la logique de visibilité du périmètre utilisateur :
        - admin: toutes les formations
        - staff: limité aux centres/départements affectés à l’utilisateur
        - autre: aucun accès
        """
        if not (user and user.is_authenticated):
            return qs.none()

        if self._is_admin_like(user):
            return qs

        if is_staff_or_staffread(user):
            centre_ids = self._staff_centre_ids(user)  # [] si pas d'attribut/valeur
            dep_codes = self._staff_departement_codes(user)

            if not centre_ids and not dep_codes:
                return qs.none()

            q = Q()
            if centre_ids:
                q |= Q(centre_id__in=centre_ids)
            if dep_codes:
                q_dep = Q()
                for code in dep_codes:
                    q_dep |= Q(centre__code_postal__startswith=code)
                q |= q_dep

            return qs.filter(q).distinct()

        return qs

    # ────────────────────────────────────────────────────────────
    # Helpers data
    # ────────────────────────────────────────────────────────────

    def get_queryset(self):
        """
        [Voir docstring de classe §2 pour le comportement complet]

        - Sélection de toutes les formations visibles pour l’utilisateur actuel,
          jointures avec centre, type_offre, statut.
        - Exclut les formations archivées sauf si ?avec_archivees=true.
        - Applique _scope_formations_for_user pour le périmètre
        - Applique restriction supplémentaire via restrict_queryset_to_user
          pour les non-staff/non-admin si mixin présent.
        """
        qs = Formation._base_manager.select_related("centre", "type_offre", "statut")
        qs = self._scope_formations_for_user(qs, getattr(self.request, "user", None))

        # 🔹 Exclure les formations archivées par défaut
        #    Inclure si ?avec_archivees=true dans l’URL
        inclure_archivees = str(self.request.query_params.get("avec_archivees", "false")).lower() in [
            "1",
            "true",
            "yes",
            "on",
        ]
        if not inclure_archivees:
            qs = qs.exclude(activite="archivee")

        # 🔐 Restriction éventuelle pour les non-staffs
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
            # Permet une limitation supplémentaire pour certaines sous-classes/contexts
            qs = self.restrict_queryset_to_user(qs)

        return qs

    def _apply_common_filters(self, qs):
        """
        Applique les filtres standards depuis les query params DRF :
        - date_from, date_to (YYYY-MM-DD)
        - centre, departement, type_offre, statut
        """
        p = self.request.query_params
        raw_from = p.get("date_from")
        raw_to = p.get("date_to")
        dfrom = parse_date(str(raw_from)) if raw_from is not None and raw_from != "" else None
        dto = parse_date(str(raw_to)) if raw_to is not None and raw_to != "" else None

        centre_id = p.get("centre")
        dep = p.get("departement")
        type_offre_id = p.get("type_offre")
        statut_id = p.get("statut")

        if dfrom:
            qs = qs.filter(start_date__gte=dfrom)
        if dto:
            qs = qs.filter(end_date__lte=dto)
        if centre_id:
            qs = qs.filter(centre_id=centre_id)
        if dep:
            qs = qs.filter(centre__code_postal__startswith=str(dep)[:2])
        if type_offre_id:
            qs = qs.filter(type_offre_id=type_offre_id)
        if statut_id:
            qs = qs.filter(statut_id=statut_id)
        return qs

    @staticmethod
    def _pct(num: int | float | None, den: int | float | None) -> float:
        """
        Helper de calcul de pourcentage (précision décimale .2)
        """
        if not num or not den or float(den) == 0.0:
            return 0.0
        return round(float(num) * 100.0 / float(den), 2)

    def _base_metrics(self, qs):
        """
        Agrégation SQL sur les formations :
        - Structure du dictionnaire retourné : voir les clefs dans agg (nb_formations, nb_actives, etc.)
        - Structure jointe : + "repartition_financeur" (détail crif/mp), + "taux_saturation"
        """
        today = timezone.now().date()
        agg = qs.aggregate(
            nb_formations=Count("id"),
            nb_actives=Count("id", filter=Q(start_date__lte=today, end_date__gte=today)),
            nb_a_venir=Count("id", filter=Q(start_date__gt=today)),
            nb_terminees=Count("id", filter=Q(end_date__lt=today)),
            total_places_crif=Coalesce(Sum("prevus_crif"), Value(0)),
            total_places_mp=Coalesce(Sum("prevus_mp"), Value(0)),
            total_inscrits_crif=Coalesce(Sum("inscrits_crif"), Value(0)),
            total_inscrits_mp=Coalesce(Sum("inscrits_mp"), Value(0)),
            total_places=Coalesce(Sum(F("prevus_crif") + F("prevus_mp")), Value(0)),
            total_inscrits=Coalesce(Sum(F("inscrits_crif") + F("inscrits_mp")), Value(0)),
            total_dispo_crif=Coalesce(Sum(Greatest(F("prevus_crif") - F("inscrits_crif"), Value(0))), Value(0)),
            total_dispo_mp=Coalesce(Sum(Greatest(F("prevus_mp") - F("inscrits_mp"), Value(0))), Value(0)),
        )
        agg["total_disponibles"] = int(agg["total_dispo_crif"]) + int(agg["total_dispo_mp"])
        agg["taux_saturation"] = self._pct(agg["total_inscrits"], agg["total_places"])
        agg["repartition_financeur"] = {
            "crif": int(agg["total_inscrits_crif"]),
            "mp": int(agg["total_inscrits_mp"]),
            "crif_pct": self._pct(agg["total_inscrits_crif"], agg["total_inscrits"]),
            "mp_pct": self._pct(agg["total_inscrits_mp"], agg["total_inscrits"]),
        }
        return agg

    @staticmethod
    def _guess_label_field(model: type[models.Model]) -> Optional[str]:
        """
        Helper utilitaire :
        Retourne le champ string le plus logique servant de "libellé" pour un model :
         - Cherche d’abord parmi: nom, name, label, libelle, libellé, titre
         - Sinon, tout champ CharField trouvé
        """
        preferred = {"nom", "name", "label", "libelle", "libellé", "titre"}
        name_map = {f.name: f for f in model._meta.get_fields() if isinstance(f, models.Field)}
        for cand in preferred:
            field = name_map.get(cand)
            if field and isinstance(field, models.CharField):
                return cand
        for f in model._meta.get_fields():
            if isinstance(f, models.CharField):
                return f.name
        return None

    def _fk_label_map(self, model: type[models.Model], ids: Iterable[int | str]) -> dict[int | str, str]:
        """
        Utilitaire pour établir une correspondance pk → label (pour affichages de listes groupées)
        """
        ids_list = [i for i in ids if i is not None]
        if not ids_list:
            return {}
        label_field = self._guess_label_field(model)
        if label_field:
            rows = model.objects.filter(pk__in=ids_list).values_list("pk", label_field)
            return {pk: (label or f"{model.__name__} #{pk}") for pk, label in rows}
        objs = model.objects.filter(pk__in=ids_list)
        return {obj.pk: str(obj) for obj in objs}

    # ────────────────────────────────────────────────────────────
    # LIST (overview)
    # ────────────────────────────────────────────────────────────
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="avec_archivees",
                type=bool,
                required=False,
                description="Inclure les formations archivées (true/false)",
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        """
        [ACTION STANDARD DRF]
        ────────────────────
        Vue agrégée sur toutes les Formations visibles pour l’utilisateur courant.

        - Filtres : voir _apply_common_filters (date_from, date_to, centre, departement, type_offre, statut, avec_archivees)
        - Permissions : voir classe (seuls staff/admin)
        - Sortie : dictionnaire "payload" explicite type
           * kpis : agrégats (cf. _base_metrics et la structure construite ici)
           * filters_echo : echo de params d’entrée
        - Serializer : EmptySerializer (pas de serializer DRF appliqué aux lignes)
        """
        qs = self._apply_common_filters(self.get_queryset())
        base = self._base_metrics(qs)

        # Entrées formation (champ Formation)
        entree_total = qs.aggregate(x=Coalesce(Sum("entree_formation"), Value(0)))["x"]

        # ----- Candidats (scopés aux formations du qs)
        cand_qs = Candidat.objects.filter(formation__in=qs)
        cand_agg = cand_qs.aggregate(
            nb_candidats=Count("id", distinct=True),
            nb_entretien_ok=Count("id", filter=Q(entretien_done=True), distinct=True),
            nb_test_ok=Count("id", filter=Q(test_is_ok=True), distinct=True),
            nb_inscrits_gespers=Count("id", filter=Q(inscrit_gespers=True), distinct=True),
            nb_candidats_non_admissibles=Count(
                "id",
                filter=_candidate_statut_metier_q(Candidat.StatutMetier.NON_ADMISSIBLE),
                distinct=True,
            ),
            nb_candidats_admissibles=Count(
                "id",
                filter=_candidate_statut_metier_q(Candidat.StatutMetier.ADMISSIBLE),
                distinct=True,
            ),
            nb_en_accompagnement_tre=Count(
                "id",
                filter=_candidate_statut_metier_q(Candidat.StatutMetier.EN_ACCOMPAGNEMENT_TRE),
                distinct=True,
            ),
            nb_en_appairage=Count(
                "id",
                filter=_candidate_statut_metier_q(Candidat.StatutMetier.EN_APPAIRAGE),
                distinct=True,
            ),
            nb_entrees_formation=Count(
                "id",
                filter=_candidate_statut_metier_q(Candidat.StatutMetier.EN_FORMATION),
                distinct=True,
            ),
            nb_inscrits_valides=Count(
                "id",
                filter=_candidate_phase_q(Candidat.ParcoursPhase.INSCRIT_VALIDE),
                distinct=True,
            ),
            nb_stagiaires_en_formation=Count(
                "id",
                filter=_candidate_phase_q(Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION),
                distinct=True,
            ),
            nb_sortis=Count("id", filter=_candidate_phase_q(Candidat.ParcoursPhase.SORTI), distinct=True),
            nb_abandons_phase=Count("id", filter=_candidate_phase_q(Candidat.ParcoursPhase.ABANDON), distinct=True),
            # ── Contrats par type
            nb_contrats_apprentissage=Count(
                "id",
                filter=Q(type_contrat=Candidat.TypeContrat.APPRENTISSAGE),
                distinct=True,
            ),
            nb_contrats_professionnalisation=Count(
                "id",
                filter=Q(type_contrat=Candidat.TypeContrat.PROFESSIONNALISATION),
                distinct=True,
            ),
            nb_contrats_poei_poec=Count(
                "id",
                filter=Q(type_contrat=Candidat.TypeContrat.POEI_POEC),
                distinct=True,
            ),
            nb_contrats_autres=Count(
                "id",
                filter=Q(type_contrat__in=[Candidat.TypeContrat.AUTRE, Candidat.TypeContrat.SANS_CONTRAT]),
                distinct=True,
            ),
            nb_admissibles=Count("id", filter=Q(admissible=True), distinct=True),
        )
        cand = {k: int(v or 0) for k, v in cand_agg.items()}

        # ----- Appairages (scopés aux formations du qs)
        app_qs = Appairage.objects.filter(formation__in=qs)
        app_agg = app_qs.aggregate(
            total=Count("id", distinct=True),
            transmis=Count("id", filter=Q(statut=AppairageStatut.TRANSMIS), distinct=True),
            en_attente=Count("id", filter=Q(statut=AppairageStatut.EN_ATTENTE), distinct=True),
            accepte=Count("id", filter=Q(statut=AppairageStatut.ACCEPTE), distinct=True),
            refuse=Count("id", filter=Q(statut=AppairageStatut.REFUSE), distinct=True),
            annule=Count("id", filter=Q(statut=AppairageStatut.ANNULE), distinct=True),
            a_faire=Count("id", filter=Q(statut=AppairageStatut.A_FAIRE), distinct=True),
            contrat_a_signer=Count("id", filter=Q(statut=AppairageStatut.CONTRAT_A_SIGNER), distinct=True),
            contrat_en_attente=Count("id", filter=Q(statut=AppairageStatut.CONTRAT_EN_ATTENTE), distinct=True),
            appairage_ok=Count("id", filter=Q(statut=AppairageStatut.APPAIRAGE_OK), distinct=True),
        )
        appairages = {
            "total": int(app_agg["total"] or 0),
            "par_statut": {
                k: int(app_agg.get(k) or 0)
                for k in [
                    "transmis",
                    "en_attente",
                    "accepte",
                    "refuse",
                    "annule",
                    "a_faire",
                    "contrat_a_signer",
                    "contrat_en_attente",
                    "appairage_ok",
                ]
            },
        }

        payload = {
            "kpis": {
                **{
                    k: int(v) if isinstance(v, int) else v
                    for k, v in base.items()
                    if k not in {"repartition_financeur", "taux_saturation"}
                },
                "taux_saturation": base["taux_saturation"],
                "repartition_financeur": base["repartition_financeur"],
                "entrees_formation": int(entree_total or 0),
                "candidats": cand,
                "appairages": appairages,
            },
            "filters_echo": {k: v for k, v in request.query_params.items()},
        }
        return Response(payload)

    # ────────────────────────────────────────────────────────────
    # Grouped
    # ────────────────────────────────────────────────────────────

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="avec_archivees",
                type=bool,
                required=False,
                description="Inclure les formations archivées (true/false)",
            ),
        ],
    )
    @action(detail=False, methods=["GET"], url_path="grouped")
    def grouped(self, request):
        """
        [ACTION @action: GET /formation-stats/grouped/]
        ────────────────────────────────────────────────
        Objectif métier : Vue groupée des indicateurs Formation par « by »
        (by : formation, centre, departement, type_offre, statut)

        - Paramètre by = groupement (default : departement)
        - Filtres : voir _apply_common_filters + avec_archivees
        - Structure de la réponse :
            { "group_by": by, "results": [ …liste agrégats par groupe… ] }
        - Champs retournés : varie selon le groupement
        """
        by: GroupKey = (request.query_params.get("by") or "departement").lower()
        if by not in {"formation", "centre", "departement", "type_offre", "statut"}:
            return self._error_response("Paramètre 'by' invalide.", status_code=status.HTTP_400_BAD_REQUEST)

        qs = self._apply_common_filters(self.get_queryset())
        today = timezone.now().date()

        qs = qs.annotate(
            departement=Coalesce(Substr("centre__code_postal", 1, 2), Value("NA")),
        )

        # ✅ Ajout de centre__nom et num_offre quand by="formation"
        group_fields = {
            "formation": ["id", "nom", "centre__nom", "num_offre"],
            "centre": ["centre_id", "centre__nom"],
            "departement": ["departement"],
            "type_offre": ["type_offre_id"],
            "statut": ["statut_id"],
        }[by]
        qs = qs.distinct()

        rows = list(
            qs.values(*group_fields)
            .annotate(
                nb_formations=Count("id", distinct=True),
                nb_actives=Count("id", filter=Q(start_date__lte=today, end_date__gte=today), distinct=True),
                nb_a_venir=Count("id", filter=Q(start_date__gt=today), distinct=True),
                nb_terminees=Count("id", filter=Q(end_date__lt=today), distinct=True),
                total_places=Coalesce(Sum(F("prevus_crif") + F("prevus_mp")), Value(0)),
                total_places_crif=Coalesce(Sum("prevus_crif"), Value(0)),
                total_places_mp=Coalesce(Sum("prevus_mp"), Value(0)),
                total_inscrits=Coalesce(Sum(F("inscrits_crif") + F("inscrits_mp")), Value(0)),
                total_inscrits_crif=Coalesce(Sum("inscrits_crif"), Value(0)),
                total_inscrits_mp=Coalesce(Sum("inscrits_mp"), Value(0)),
                total_dispo_crif=Coalesce(Sum(Greatest(F("prevus_crif") - F("inscrits_crif"), Value(0))), Value(0)),
                total_dispo_mp=Coalesce(Sum(Greatest(F("prevus_mp") - F("inscrits_mp"), Value(0))), Value(0)),
                entrees_formation=Coalesce(Sum("entree_formation"), Value(0)),
                # ----- Candidats
                nb_candidats=Count("candidats", distinct=True),
                nb_entretien_ok=Count("candidats", filter=Q(candidats__entretien_done=True), distinct=True),
                nb_test_ok=Count("candidats", filter=Q(candidats__test_is_ok=True), distinct=True),
                nb_inscrits_gespers=Count("candidats", filter=Q(candidats__inscrit_gespers=True), distinct=True),
                nb_candidats_non_admissibles=Count(
                    "candidats",
                    filter=_candidate_statut_metier_q(Candidat.StatutMetier.NON_ADMISSIBLE, "candidats__"),
                    distinct=True,
                ),
                nb_candidats_admissibles=Count(
                    "candidats",
                    filter=_candidate_statut_metier_q(Candidat.StatutMetier.ADMISSIBLE, "candidats__"),
                    distinct=True,
                ),
                nb_en_accompagnement_tre=Count(
                    "candidats",
                    filter=_candidate_statut_metier_q(Candidat.StatutMetier.EN_ACCOMPAGNEMENT_TRE, "candidats__"),
                    distinct=True,
                ),
                nb_en_appairage=Count(
                    "candidats",
                    filter=_candidate_statut_metier_q(Candidat.StatutMetier.EN_APPAIRAGE, "candidats__"),
                    distinct=True,
                ),
                nb_entrees_formation=Count(
                    "candidats",
                    filter=_candidate_statut_metier_q(Candidat.StatutMetier.EN_FORMATION, "candidats__"),
                    distinct=True,
                ),
                nb_inscrits_valides=Count(
                    "candidats",
                    filter=_candidate_phase_q(Candidat.ParcoursPhase.INSCRIT_VALIDE, "candidats__"),
                    distinct=True,
                ),
                nb_stagiaires_en_formation=Count(
                    "candidats",
                    filter=_candidate_phase_q(Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION, "candidats__"),
                    distinct=True,
                ),
                nb_sortis=Count(
                    "candidats",
                    filter=_candidate_phase_q(Candidat.ParcoursPhase.SORTI, "candidats__"),
                    distinct=True,
                ),
                nb_abandons_phase=Count(
                    "candidats",
                    filter=_candidate_phase_q(Candidat.ParcoursPhase.ABANDON, "candidats__"),
                    distinct=True,
                ),
                # ── Contrats par type (groupés)
                nb_contrats_apprentissage=Count(
                    "candidats",
                    filter=Q(candidats__type_contrat=Candidat.TypeContrat.APPRENTISSAGE),
                    distinct=True,
                ),
                nb_contrats_professionnalisation=Count(
                    "candidats",
                    filter=Q(candidats__type_contrat=Candidat.TypeContrat.PROFESSIONNALISATION),
                    distinct=True,
                ),
                nb_contrats_poei_poec=Count(
                    "candidats",
                    filter=Q(candidats__type_contrat=Candidat.TypeContrat.POEI_POEC),
                    distinct=True,
                ),
                nb_contrats_autres=Count(
                    "candidats",
                    filter=Q(
                        candidats__type_contrat__in=[Candidat.TypeContrat.AUTRE, Candidat.TypeContrat.SANS_CONTRAT]
                    ),
                    distinct=True,
                ),
                nb_admissibles=Count("candidats", filter=Q(candidats__admissible=True), distinct=True),
                # ----- Appairages par statut
                app_total=Count("appairages", distinct=True),
                app_transmis=Count("appairages", filter=Q(appairages__statut=AppairageStatut.TRANSMIS), distinct=True),
                app_en_attente=Count(
                    "appairages", filter=Q(appairages__statut=AppairageStatut.EN_ATTENTE), distinct=True
                ),
                app_accepte=Count("appairages", filter=Q(appairages__statut=AppairageStatut.ACCEPTE), distinct=True),
                app_refuse=Count("appairages", filter=Q(appairages__statut=AppairageStatut.REFUSE), distinct=True),
                app_annule=Count("appairages", filter=Q(appairages__statut=AppairageStatut.ANNULE), distinct=True),
                app_a_faire=Count("appairages", filter=Q(appairages__statut=AppairageStatut.A_FAIRE), distinct=True),
                app_contrat_a_signer=Count(
                    "appairages", filter=Q(appairages__statut=AppairageStatut.CONTRAT_A_SIGNER), distinct=True
                ),
                app_contrat_en_attente=Count(
                    "appairages", filter=Q(appairages__statut=AppairageStatut.CONTRAT_EN_ATTENTE), distinct=True
                ),
                app_appairage_ok=Count(
                    "appairages", filter=Q(appairages__statut=AppairageStatut.APPAIRAGE_OK), distinct=True
                ),
            )
            .order_by(*group_fields)
        )

        for r in rows:
            r["total_disponibles"] = int(r["total_dispo_crif"]) + int(r["total_dispo_mp"])
            r["taux_saturation"] = self._pct(r["total_inscrits"], r["total_places"])
            r["repartition_financeur"] = {
                "crif": int(r["total_inscrits_crif"]),
                "mp": int(r["total_inscrits_mp"]),
                "crif_pct": self._pct(r["total_inscrits_crif"], r["total_inscrits"]),
                "mp_pct": self._pct(r["total_inscrits_mp"], r["total_inscrits"]),
            }

        # Ajout du group_key/group_label selon le groupement utilisé
        if by == "formation":
            for r in rows:
                r["group_key"] = r.get("id")
                r["group_label"] = r.get("nom") or (f"Formation #{r.get('id')}" if r.get("id") is not None else "—")
        elif by == "centre":
            for r in rows:
                r["group_key"] = r.get("centre_id")
                r["group_label"] = r.get("centre__nom") or (
                    f"Centre #{r.get('centre_id')}" if r.get("centre_id") is not None else "—"
                )
        elif by == "departement":
            for r in rows:
                r["group_key"] = r.get("departement")
                r["group_label"] = r.get("departement") or "—"
        elif by in {"type_offre", "statut"}:
            fk_field = Formation._meta.get_field(by)
            model = fk_field.remote_field.model  # type: ignore[attr-defined]
            ids = [r.get(f"{by}_id") for r in rows if r.get(f"{by}_id") is not None]
            label_map = self._fk_label_map(model, ids)
            for r in rows:
                gid = r.get(f"{by}_id")
                r["group_key"] = gid
                r["group_label"] = label_map.get(
                    gid, f"{by.replace('_', ' ').title()} #{gid}" if gid is not None else "—"
                )

        return Response({"group_by": by, "results": rows})

    # ────────────────────────────────────────────────────────────
    # Tops (règles: saturées ≥ 80%, tension < 50% & places > 0)
    # ────────────────────────────────────────────────────────────

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="avec_archivees",
                type=bool,
                required=False,
                description="Inclure les formations archivées (true/false)",
            ),
        ],
    )
    @action(detail=False, methods=["GET"], url_path="tops")
    def tops(self, request):
        """
        [ACTION @action: GET /formation-stats/tops/]
        ─────────────────────────────────────────────
        Objectif métier : Vue "top formations" selon :
         - à recruter (places dispos sort décroissant)
         - top saturées (taux ≥ 80 %, places > 0)
         - en tension (taux < 50 %, places > 0)
        - Filtres : voir _apply_common_filters + avec_archivees + limit (def:10)
        - Structure JSON :
            {
                "a_recruter": [ ... ],
                "top_saturees": [ ... ],
                "en_tension": [ ... ]
            }
        - Chaque élément : dict (valeurs id, nom, taux, places_disponibles, centre__nom, num_offre)
        """
        qs = self._apply_common_filters(self.get_queryset()).annotate(
            total_places=F("prevus_crif") + F("prevus_mp"),
            total_inscrits=F("inscrits_crif") + F("inscrits_mp"),
            places_disponibles=Greatest(
                (F("prevus_crif") + F("prevus_mp")) - (F("inscrits_crif") + F("inscrits_mp")),
                Value(0),
            ),
        )
        limit = int(request.query_params.get("limit", 10))

        # Taux = 100 * inscrits / places (0 si places = 0)
        qs_taux = qs.annotate(taux=Coalesce(100.0 * F("total_inscrits") / NullIf(F("total_places"), 0), Value(0.0)))

        # 1) À recruter : plus de places restantes d'abord
        a_recruter = list(
            qs.filter(places_disponibles__gt=0)
            .values("id", "nom", "places_disponibles", "centre__nom", "num_offre")
            .order_by("-places_disponibles")[:limit]
        )

        # 2) Top saturées : ≥ 80%
        top_saturees = list(
            qs_taux.filter(total_places__gt=0, taux__gte=80.0)
            .values("id", "nom", "taux", "places_disponibles", "centre__nom", "num_offre")
            .order_by("-taux")[:limit]
        )

        # 3) En tension : < 50% et encore des places
        en_tension = list(
            qs_taux.filter(total_places__gt=0, places_disponibles__gt=0, taux__lt=50.0)
            .values("id", "nom", "taux", "places_disponibles", "centre__nom", "num_offre")
            .order_by("taux", "-places_disponibles")[:limit]
        )

        return Response(
            {
                "a_recruter": a_recruter,
                "top_saturees": top_saturees,
                "en_tension": en_tension,
            }
        )

    # ────────────────────────────────────────────────────────────
    # Metrics (doublon interne — attention ne pas perdre ce code !)
    # ────────────────────────────────────────────────────────────

    def _base_metrics(self, qs):
        """
        [INTERNAL] Agrégation d’indicateurs bruts, inclut :
          - états de formations (active, à venir, etc.)
          - annulations, archivages, places
          - repartition financeur
        - Structure d’output : voir les clefs du dict agg.
        Utilisée en interne (pas un endpoint REST).
        """
        today = timezone.now().date()
        agg = qs.aggregate(
            # --- États des formations ---
            nb_formations=Count("id"),
            nb_actives=Count("id", filter=Q(start_date__lte=today, end_date__gte=today)),  # ← utilisé par le front
            nb_a_venir=Count("id", filter=Q(start_date__gt=today)),
            nb_terminees=Count("id", filter=Q(end_date__lt=today)),
            nb_annulees=Count("id", filter=Q(statut__nom__icontains="annul")),
            nb_archivees=Count("id", filter=Q(activite="archivee")),
            # --- Agrégats places/inscriptions ---
            total_places_crif=Coalesce(Sum("prevus_crif"), Value(0)),
            total_places_mp=Coalesce(Sum("prevus_mp"), Value(0)),
            total_inscrits_crif=Coalesce(Sum("inscrits_crif"), Value(0)),
            total_inscrits_mp=Coalesce(Sum("inscrits_mp"), Value(0)),
            total_places=Coalesce(Sum(F("prevus_crif") + F("prevus_mp")), Value(0)),
            total_inscrits=Coalesce(Sum(F("inscrits_crif") + F("inscrits_mp")), Value(0)),
            total_dispo_crif=Coalesce(Sum(Greatest(F("prevus_crif") - F("inscrits_crif"), Value(0))), Value(0)),
            total_dispo_mp=Coalesce(Sum(Greatest(F("prevus_mp") - F("inscrits_mp"), Value(0))), Value(0)),
        )

        # --- Post-traitements ---
        agg["total_disponibles"] = int(agg["total_dispo_crif"]) + int(agg["total_dispo_mp"])
        agg["taux_saturation"] = self._pct(agg["total_inscrits"], agg["total_places"])
        agg["repartition_financeur"] = {
            "crif": int(agg["total_inscrits_crif"]),
            "mp": int(agg["total_inscrits_mp"]),
            "crif_pct": self._pct(agg["total_inscrits_crif"], agg["total_inscrits"]),
            "mp_pct": self._pct(agg["total_inscrits_mp"], agg["total_inscrits"]),
        }
        return agg

    # ────────────────────────────────────────────────────────────
    # Filter options (pour les <Select> du front)
    # ────────────────────────────────────────────────────────────

    @action(detail=False, methods=["GET"], url_path="filter-options")
    def filter_options(self, request):
        """
        [ACTION @action: GET /formation-stats/filter-options/]
        ───────────────────────────────────────────────────────
        Objectif : Permettre au front d’obtenir les options pour alimenter les <Select> de recherche
        (centres visibles, types_offre actifs, statuts actifs, départements accessibles)

        - Permissions : scope staff/admin conforme au scope général (voir helpers)
        - Sortie :
            {
                "centresById": {id: nom, ...},
                "typeOffreById": {id: nom, ...},
                "statutById": {id: nom, ...},
                "departements": [...]
            }
        """
        try:
            user = request.user

            # 🔐 Déterminer le périmètre du staff
            if self._is_admin_like(user):
                qs_centre = Centre.objects.filter(is_active=True)
            elif is_staff_or_staffread(user):
                centre_ids = self._staff_centre_ids(user) or []
                dep_codes = self._staff_departement_codes(user) or []

                q = Q()
                if centre_ids:
                    q |= Q(id__in=centre_ids)
                if dep_codes:
                    for code in dep_codes:
                        q |= Q(code_postal__startswith=code)
                qs_centre = Centre.objects.filter(is_active=True).filter(q)
            else:
                # Non staff → aucun centre visible
                qs_centre = Centre.objects.none()

            qs_centre = qs_centre.order_by("nom")
            qs_type = TypeOffre.objects.filter(is_active=True).order_by("nom")
            qs_statut = Statut.objects.filter(is_active=True).order_by("nom")

            # Extraction des départements visibles : code_postal de chaque centre truncé sur 2 car.
            departements = (
                qs_centre.exclude(code_postal__isnull=True)
                .exclude(code_postal__exact="")
                .annotate(
                    dep=Substr(
                        Coalesce("code_postal", Value("")),
                        1,
                        2,
                        output_field=models.CharField(),
                    )
                )
                .values_list("dep", flat=True)
                .distinct()
                .order_by("dep")
            )

            data = {
                "centresById": {str(c.id): c.nom for c in qs_centre},
                "typeOffreById": {str(t.id): t.nom for t in qs_type},
                "statutById": {str(s.id): s.nom for s in qs_statut},
                "departements": list(departements),
            }
            return Response(data)

        except Exception as e:
            import traceback

            traceback.print_exc()
            return self._error_response(str(e), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
