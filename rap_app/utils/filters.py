import django_filters
import unicodedata
from django.db.models import Q

from ..models.appairage import Appairage
from ..models.atelier_tre import AtelierTRE
from ..models.candidat import Candidat, ResultatPlacementChoices
from ..models.custom_user import CustomUser
from ..models.formations import HistoriqueFormation
from ..models.prospection import Prospection
from ..models.prospection_comments import ProspectionComment


def _normalize_choice_token(value):
    normalized = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower().replace("/", " ").replace("-", " ")
    return " ".join(normalized.split())


# ─────────────────────────────────────────────────────────────────────────────
# Atelier TRE
# ─────────────────────────────────────────────────────────────────────────────
class AtelierTREFilter(django_filters.FilterSet):
    """
    Filtre sur le modèle AtelierTRE pour les besoins du front.

    Fonctionnalité :
        Permet de filtrer les objets AtelierTRE selon la date de début (jour ou heure précise)
        et selon le type d'atelier (via les choices du modèle).

    Contrat technique :
        - Hérite de django_filters.FilterSet.
        - Les filtres sont basés sur des champs du modèle (date, datetimes, choices).
        - Retourne un QuerySet filtré sur le modèle AtelierTRE.

    Exemple d'utilisation :
        AtelierTREFilter({"date_min": "2024-05-01", "type_atelier": "rdv"}).qs

    Limites et dépendances :
        - Dépend du modèle AtelierTRE et de ses champs (debut, type_atelier).
        - type_atelier suppose la présence de TypeAtelier.choices sur le modèle.
    """

    # ✅ Compat front : filtre par JOUR sur le champ DateTime "debut"
    date_min = django_filters.DateFilter(field_name="debut", lookup_expr="date__gte")
    date_max = django_filters.DateFilter(field_name="debut", lookup_expr="date__lte")

    # ✅ Bornes précises si on veut tenir compte de l’heure
    debut_min = django_filters.IsoDateTimeFilter(field_name="debut", lookup_expr="gte")
    debut_max = django_filters.IsoDateTimeFilter(field_name="debut", lookup_expr="lte")

    # ✅ type d’atelier (value des choices)
    type_atelier = django_filters.ChoiceFilter(
        field_name="type_atelier",
        choices=AtelierTRE.TypeAtelier.choices,
        lookup_expr="exact",
    )

    class Meta:
        model = AtelierTRE
        fields = ["type_atelier", "date_min", "date_max", "debut_min", "debut_max"]


# ─────────────────────────────────────────────────────────────────────────────
# IN filters “safe” (ignorent les valeurs vides)
# ─────────────────────────────────────────────────────────────────────────────
class _SafeBaseInFilter(django_filters.filters.BaseInFilter):
    """
    Variante "safe" des filtres __in de django-filter.

    Fonctionnalité :
        Ignore les filtres __in où la valeur passée est vide, nulle ou une liste vide.
        Nettoie en supprimant None, "", et [] des valeurs reçues, pour ne pas
        retourner 0 résultat par erreur sur "id__in=" vide.

    Contrat technique :
        - Méthode filter surchargée.
        - Args :
            - qs : QuerySet initial à filtrer.
            - value : iterable (souvent list ou QueryDict).
        - Retour : qs filtré (queryset du modèle d'origine).

    Exemple :
        filter(qs, ["a", "", None, "b"]) filtre sur a,b uniquement.
        filter(qs, []) renvoie qs non filtré.

    Limites et dépendances :
        - Dépend de django_filters.filters.BaseInFilter (dépendance forte au package).
        - Hypothèse sur l'accès à super().filter(qs, cleaned).
    """

    def filter(self, qs, value):
        if not value:
            return qs
        cleaned = [v for v in value if v not in (None, "", [])]
        if not cleaned:
            return qs
        return super().filter(qs, cleaned)


class SafeNumberInFilter(_SafeBaseInFilter, django_filters.NumberFilter):
    """
    Filtres __in "safe" pour les champs numériques.

    Fonctionnalité :
        Permet de filtrer un champ numérique avec un paramètre ?field__in=1,2,3,
        en ignorant les valeurs nulles/vides.

    Contrat technique :
        - Hérite de _SafeBaseInFilter et NumberFilter
        - Utilisé pour des champs int/float etc.
        - Retourne un QuerySet filtré.

    Limite :
        - Hypothèse sur la nature numérique du champ (vérification côté FilterSet).
    """

    pass


class SafeCharInFilter(_SafeBaseInFilter, django_filters.CharFilter):
    """
    Filtres __in "safe" pour les champs chaînes de caractères.

    Fonctionnalité :
        Permet de filtrer un champ string avec ?field__in=a,b,..., en ignorant les
        valeurs nulles/vides.

    Contrat technique :
        - Hérite de _SafeBaseInFilter et CharFilter
        - Utilisé pour des champs caractères.
        - Retour : QuerySet filtré.
    """

    pass


# (Compat éventuelle avec ancien code)
class CharInFilter(_SafeBaseInFilter, django_filters.CharFilter):
    """
    Alias rétro-compatible pour les anciens usages du pattern ?field__in=a,b,c.

    Fonctionnalité :
        Même logique que SafeCharInFilter.

    Contrat technique :
        - Arguments hérités.
        - Pas de différence d'implémentation.
    """

    pass


class NumberInFilter(_SafeBaseInFilter, django_filters.NumberFilter):
    """
    Alias rétro-compatible pour les anciens usages du pattern ?field__in=1,2,3.

    Fonctionnalité :
        Même logique que SafeNumberInFilter.

    Contrat technique :
        - Arguments hérités.
        - Pas de différence d'implémentation.
    """

    pass


# ─────────────────────────────────────────────────────────────────────────────
# Candidat
# ─────────────────────────────────────────────────────────────────────────────
class CandidatFilter(django_filters.FilterSet):
    """
    Filtre complexe sur le modèle Candidat.

    Fonctionnalité :
        Permet de filtrer les candidats selon de nombreux paramètres
        (dates, statuts, FK, booléens, etc.), compatibles front.

    Contrat technique :
        - Hérite de django_filters.FilterSet.
        - Utilise divers types de filtres (DateFilter, BooleanFilter, CharFilter...)
        - Les champs/filtres sont adaptés aux propriétés du modèle Candidat.
        - Retourne un QuerySet filtré sur Candidat.

    Exemple d'utilisation :
        CandidatFilter({"statut__in": ["admis", "en_cours"], "date_min": "2023-01-01"}).qs

    Limites et dépendances :
        - Dépend du modèle Candidat (structure, conventions, noms de champs).
        - Certains filtres utilisent des choices du modèle.
        - Le filtre has_osia dépend du champ numero_osia (et conventions associées).
    """

    id__in = SafeNumberInFilter(field_name="id", lookup_expr="in")

    # 📅 bornes date d'inscription + alias
    date_inscription_min = django_filters.DateFilter(field_name="date_inscription", lookup_expr="gte")
    date_inscription_max = django_filters.DateFilter(field_name="date_inscription", lookup_expr="lte")
    date_min = django_filters.DateFilter(field_name="date_inscription", lookup_expr="gte")
    date_max = django_filters.DateFilter(field_name="date_inscription", lookup_expr="lte")

    # 📅 date de naissance
    date_naissance_min = django_filters.DateFilter(field_name="date_naissance", lookup_expr="gte")
    date_naissance_max = django_filters.DateFilter(field_name="date_naissance", lookup_expr="lte")

    # 🔗 FK
    formation = django_filters.NumberFilter(field_name="formation_id")
    centre = django_filters.NumberFilter(field_name="formation__centre_id")

    # 🔤 choix + variantes IN
    statut = django_filters.ChoiceFilter(field_name="statut", choices=Candidat.StatutCandidat.choices)
    statut__in = SafeCharInFilter(field_name="statut", lookup_expr="in")
    statut_i = django_filters.CharFilter(field_name="statut", lookup_expr="iexact")
    parcours_phase = django_filters.CharFilter(method="filter_parcours_phase")
    parcoursPhase = django_filters.CharFilter(method="filter_parcours_phase")
    parcours_phase__in = django_filters.CharFilter(method="filter_parcours_phase_in")
    parcours_phase_i = django_filters.CharFilter(field_name="parcours_phase", lookup_expr="iexact")

    type_contrat = django_filters.ChoiceFilter(field_name="type_contrat", choices=Candidat.TypeContrat.choices)
    type_contrat__in = SafeCharInFilter(field_name="type_contrat", lookup_expr="in")
    type_contrat_i = django_filters.CharFilter(field_name="type_contrat", lookup_expr="iexact")
    type_contrat_isnull = django_filters.BooleanFilter(field_name="type_contrat", lookup_expr="isnull")

    disponibilite = django_filters.ChoiceFilter(field_name="disponibilite", choices=Candidat.Disponibilite.choices)

    # ✅ Nouveau : Contrat signé (avec variantes)
    contrat_signe = django_filters.ChoiceFilter(field_name="contrat_signe", choices=Candidat.ContratSigne.choices)
    contrat_signe__in = SafeCharInFilter(field_name="contrat_signe", lookup_expr="in")
    contrat_signe_i = django_filters.CharFilter(field_name="contrat_signe", lookup_expr="iexact")
    contrat_signe_isnull = django_filters.BooleanFilter(field_name="contrat_signe", lookup_expr="isnull")

    # 🔁 Résultat placement
    resultat_placement = django_filters.ChoiceFilter(
        field_name="resultat_placement", choices=ResultatPlacementChoices.choices
    )

    # ✅ statut de CV
    cv_statut = django_filters.ChoiceFilter(field_name="cv_statut", choices=Candidat.CVStatut.choices)
    cv_statut__in = SafeCharInFilter(field_name="cv_statut", lookup_expr="in")

    # 🏙️ Localisation
    ville = django_filters.CharFilter(field_name="ville", lookup_expr="icontains")
    code_postal = django_filters.CharFilter(field_name="code_postal", lookup_expr="istartswith")

    # ✅ booléens
    rqth = django_filters.BooleanFilter(field_name="rqth")
    permis_b = django_filters.BooleanFilter(field_name="permis_b")
    admissible = django_filters.BooleanFilter(field_name="admissible")
    entretien_done = django_filters.BooleanFilter(field_name="entretien_done")
    test_is_ok = django_filters.BooleanFilter(field_name="test_is_ok")

    # 🆕 a-t-il un OSIA ?
    has_osia = django_filters.BooleanFilter(method="filter_has_osia")

    def _parcours_phase_label_map(self):
        return {_normalize_choice_token(label): value for value, label in Candidat.ParcoursPhase.choices}

    def _resolve_parcours_phase_value(self, raw_value):
        if raw_value in dict(Candidat.ParcoursPhase.choices):
            return raw_value
        return self._parcours_phase_label_map().get(_normalize_choice_token(raw_value), raw_value)

    def filter_has_osia(self, qs, name, value):
        """
        Filtre les candidats ayant ou non un numéro OSIA.

        Fonctionnalité :
            Si value est True : recherche les candidats avec numero_osia non null/ni vide.
            Si value est False : uniquement ceux sans numero_osia ou chaine vide.

        Contrat technique :
            - qs : QuerySet[Candidat]
            - name : str (nom du filtre)
            - value : bool or None
            - Retour : QuerySet filtré

        Exemple :
            filter_has_osia(Candidat.objects.all(), "has_osia", True) => candidats avec OSIA
            filter_has_osia(Candidat.objects.all(), "has_osia", False) => candidats sans OSIA

        Limites/dépendances :
            - Dépend strictement du champ numero_osia sur Candidat.
            - Hypothèse métier : chaine vide = "pas d'OSIA".
        """
        if value is None:
            return qs
        if value:
            return qs.exclude(numero_osia__isnull=True).exclude(numero_osia__exact="")
        return qs.filter(Q(numero_osia__isnull=True) | Q(numero_osia__exact=""))

    def filter_parcours_phase(self, qs, name, value):
        if value in (None, ""):
            return qs
        return qs.filter(parcours_phase=self._resolve_parcours_phase_value(value))

    def filter_parcours_phase_in(self, qs, name, value):
        if value in (None, ""):
            return qs
        raw_values = value if isinstance(value, (list, tuple)) else str(value).split(",")
        resolved = [
            self._resolve_parcours_phase_value(item.strip())
            for item in raw_values
            if str(item).strip()
        ]
        if not resolved:
            return qs
        return qs.filter(parcours_phase__in=resolved)

    class Meta:
        model = Candidat
        fields = [
            "statut",
            "statut__in",
            "statut_i",
            "parcours_phase",
            "parcours_phase__in",
            "parcours_phase_i",
            "type_contrat",
            "type_contrat__in",
            "type_contrat_i",
            "type_contrat_isnull",
            "disponibilite",
            "contrat_signe",
            "contrat_signe__in",
            "contrat_signe_i",
            "contrat_signe_isnull",
            "resultat_placement",
            "cv_statut",
            "cv_statut__in",
            "formation",
            "centre",
            "responsable_placement",
            "vu_par",
            "admissible",
            "entretien_done",
            "test_is_ok",
            "entreprise_placement",
            "entreprise_validee",
            "ville",
            "code_postal",
            "id__in",
            "rqth",
            "permis_b",
            "date_inscription_min",
            "date_inscription_max",
            "date_min",
            "date_max",
            "date_naissance_min",
            "date_naissance_max",
            "has_osia",
        ]


# ─────────────────────────────────────────────────────────────────────────────
# Historique formation
# ─────────────────────────────────────────────────────────────────────────────
class HistoriqueFormationFilter(django_filters.FilterSet):
    """
    Filtre adapté au modèle HistoriqueFormation.

    Fonctionnalité :
        Permet de filtrer sur le centre, le type d'offre, le statut et la formation
        ainsi qu'un filtre personnalisé sur l'état de la formation liée.

    Contrat technique :
        - Hérite de django_filters.FilterSet
        - Retourne un queryset HistoriqueFormation filtré

    Exemple :
        HistoriqueFormationFilter({"centre_id": 3, "formation_etat": "validée"}).qs

    Limites/dépendances :
        - Dépend du modèle HistoriqueFormation et de la relation à formation.
        - "formation_etat" attend que le champ "etat" existe sur la relation "formation".
    """

    centre_id = django_filters.NumberFilter(field_name="formation__centre_id")
    type_offre_id = django_filters.NumberFilter(field_name="formation__type_offre_id")
    statut_id = django_filters.NumberFilter(field_name="formation__statut_id")
    formation_id = django_filters.NumberFilter(field_name="formation_id")
    formation_etat = django_filters.CharFilter(method="filter_etat")

    class Meta:
        model = HistoriqueFormation
        fields = []

    def filter_etat(self, queryset, name, value):
        """
        Filtre l'historique selon l'état de la formation liée.

        Contrat :
            - queryset : QuerySet[HistoriqueFormation]
            - name : str
            - value : valeur du champ formation.etat (str ou selon le modèle)
            - Retour : QuerySet filtré

        Ex :
            filter_etat(qs, 'formation_etat', 'clôturée') -> tous les historiques
            dont la formation liée est "clôturée"

        Limite : dépendance au champ formation.etat
        """
        return queryset.filter(formation__etat=value)


# ─────────────────────────────────────────────────────────────────────────────
# Users
# ─────────────────────────────────────────────────────────────────────────────
class UserFilterSet(django_filters.FilterSet):
    """
    Filtre pour le modèle CustomUser.

    Fonctionnalité :
        Permet de filtrer selon le rôle, l'activité, la date d'inscription et les
        formations (via les FK à candidat_associe).

    Contrat technique :
        - Retour : QuerySet sur CustomUser
        - Hérite de django_filters.FilterSet

    Exemple :
        UserFilterSet({"role": "admin", "is_active": True}).qs

    Limites/dépendances :
        - Utilisation de la relation "candidat_associe" : suppose existence et cohérence métier
        - Hypothèse sur la structure du modèle CustomUser et des FK associées
    """

    role = django_filters.CharFilter(field_name="role", lookup_expr="exact")
    is_active = django_filters.BooleanFilter(field_name="is_active")
    date_joined_min = django_filters.DateFilter(field_name="date_joined", lookup_expr="gte")
    date_joined_max = django_filters.DateFilter(field_name="date_joined", lookup_expr="lte")

    formation = django_filters.NumberFilter(field_name="candidat_associe__formation__id", lookup_expr="exact")
    centre = django_filters.NumberFilter(field_name="candidat_associe__formation__centre__id", lookup_expr="exact")
    type_offre = django_filters.NumberFilter(
        field_name="candidat_associe__formation__type_offre__id", lookup_expr="exact"
    )

    class Meta:
        model = CustomUser
        fields = ["role", "is_active", "formation", "centre", "type_offre", "date_joined_min", "date_joined_max"]


# ─────────────────────────────────────────────────────────────────────────────
# Prospection & Appairage
# ─────────────────────────────────────────────────────────────────────────────
class ProspectionFilterSet(django_filters.FilterSet):
    """
    Filtre pour le modèle Prospection.

    Fonctionnalité :
        Permet divers filtres sur les prospections : dates, FK (centre, formation...),
        statuts, objectifs, moyens, etc. Supporte aussi les filtres sur les historiques via method.

    Contrat technique :
        - Retour : QuerySet filtré sur Prospection
        - Hérite FilterSet

    Exemple :
        ProspectionFilterSet({"date_min": "2024-01-01", "statut__in": ["ouverte", "relancée"]}).qs

    Limites/dépendances :
        - Dépend du modèle Prospection, des related_name, des filters custom.
        - "historique_moyen_contact" requiert une relation "historiques" sur Prospection (FK ou related_name).
    """

    # 🆕 pratiques
    id__in = SafeNumberInFilter(field_name="id", lookup_expr="in")
    date_min = django_filters.DateFilter(field_name="date_prospection", lookup_expr="date__gte")
    date_max = django_filters.DateFilter(field_name="date_prospection", lookup_expr="date__lte")
    relance_min = django_filters.DateFilter(field_name="relance_prevue", lookup_expr="gte")
    relance_max = django_filters.DateFilter(field_name="relance_prevue", lookup_expr="lte")

    # 🔗 FK directs
    centre = django_filters.NumberFilter(field_name="centre_id", lookup_expr="exact")
    formation = django_filters.NumberFilter(field_name="formation_id", lookup_expr="exact")
    formation__in = SafeNumberInFilter(field_name="formation_id", lookup_expr="in")
    partenaire = django_filters.NumberFilter(field_name="partenaire_id", lookup_expr="exact")
    partenaire__in = SafeNumberInFilter(field_name="partenaire_id", lookup_expr="in")
    owner = django_filters.NumberFilter(field_name="owner_id", lookup_expr="exact")
    owner__in = SafeNumberInFilter(field_name="owner_id", lookup_expr="in")

    # 🔤 choices (avec variantes __in)
    statut = django_filters.CharFilter(field_name="statut", lookup_expr="exact")
    statut__in = SafeCharInFilter(field_name="statut", lookup_expr="in")
    objectif = django_filters.CharFilter(field_name="objectif", lookup_expr="exact")
    objectif__in = SafeCharInFilter(field_name="objectif", lookup_expr="in")
    motif = django_filters.CharFilter(field_name="motif", lookup_expr="exact")
    motif__in = SafeCharInFilter(field_name="motif", lookup_expr="in")
    type_prospection = django_filters.CharFilter(field_name="type_prospection", lookup_expr="exact")
    type_prospection__in = SafeCharInFilter(field_name="type_prospection", lookup_expr="in")

    # 🆕 filtre direct sur le champ du modèle (et option historique si besoin)
    moyen_contact = django_filters.CharFilter(field_name="moyen_contact", lookup_expr="exact")
    historique_moyen_contact = django_filters.CharFilter(method="filter_historique_moyen_contact")

    # 🆕 filtres liés à la formation
    formation_type_offre = django_filters.NumberFilter(field_name="formation__type_offre_id", lookup_expr="exact")
    formation_type_offre__in = SafeNumberInFilter(field_name="formation__type_offre_id", lookup_expr="in")
    formation_statut = django_filters.NumberFilter(field_name="formation__statut_id", lookup_expr="exact")
    formation_statut__in = SafeNumberInFilter(field_name="formation__statut_id", lookup_expr="in")

    class Meta:
        model = Prospection
        fields = [
            # FK
            "centre",
            "formation",
            "partenaire",
            "owner",
            # choices
            "statut",
            "objectif",
            "motif",
            "type_prospection",
            # moyens/relance/dates
            "moyen_contact",
            "relance_min",
            "relance_max",
            "date_min",
            "date_max",
            # formation liés
            "formation_type_offre",
            "formation_statut",
            # utilitaires
            "id__in",
        ]

    def filter_historique_moyen_contact(self, qs, name, value):
        """
        Filtre les prospections ayant au moins un historique avec le moyen de contact donné.

        Fonctionnalité :
            Permet de récupérer toutes les prospections où un historique
            (relation "historiques") a moyen_contact = value.

        Contrat technique :
            - qs : QuerySet[Prospection]
            - name : str (nom du champ du filter)
            - value : str (moyen_contact attendu)
            - Retourne : QuerySet[Prospection] distinct

        Exemple :
            filter_historique_moyen_contact(Prospection.objects.all(), "historique_moyen_contact", "email")
                => Prospection où au moins un historique a "email" en moyen_contact

        Limites/dépendances :
            - Suppose existence d'une relation "historiques" sur Prospection.
            - Suppose que "moyen_contact" existe sur l'objet lié.
        """
        if not value:
            return qs
        return qs.filter(historiques__moyen_contact=value).distinct()


class AppairageFilterSet(django_filters.FilterSet):
    """
    Filtre pour le modèle Appairage.

    Fonctionnalité :
        Permet de filtrer les appairages selon leur statut, formation liée ou
        selon le centre (avec une logique personnalisée sur centre via filter_centre).

    Contrat technique :
        - Retourne un QuerySet[Appairage] filtré.
        - Filtre "centre" utilise une méthode custom qui élargit la recherche
          (voir filter_centre).

    Exemple :
        AppairageFilterSet({'statut': 'actif', 'centre': 2}).qs

    Limites/dépendances :
        - Dépend fortement du modèle Appairage et de ses relations.
        - La logique de filter_centre dépend de relations précises.
    """

    statut = django_filters.CharFilter(lookup_expr="exact")
    formation = django_filters.NumberFilter(field_name="formation_id")
    centre = django_filters.NumberFilter(method="filter_centre")

    class Meta:
        model = Appairage
        fields = ["statut", "formation", "candidat", "partenaire", "created_by", "centre"]

    def filter_centre(self, qs, name, value):
        """
        Permet de filtrer les Appairage en cherchant les entrées dont
        - le centre de la formation liée = value OU
        - le centre de la formation liée au candidat = value

        Contrat technique :
            - qs : QuerySet[Appairage]
            - name : str
            - value : int/str (id du centre)
            - Retour : QuerySet

        Exemple :
            filter_centre(qs, "centre", 3) => Appairage liés à centre_id = 3 (direct ou via candidat)

        Limite :
            - Dépend du schéma relationnel (formation__centre_id, candidat__formation__centre_id).
        """
        return qs.filter(Q(formation__centre_id=value) | Q(candidat__formation__centre_id=value))


# ─────────────────────────────────────────────────────────────────────────────
# Prospection comments
# ─────────────────────────────────────────────────────────────────────────────
class ProspectionCommentFilter(django_filters.FilterSet):
    """
    Filtre pour le modèle ProspectionComment.

    Fonctionnalité :
        Permet de filtrer les commentaires de prospection
        - selon des champs du modèle Prospection associé (nom formation, nom partenaire)
        - selon des champs utilisateurs
        - selon l'association à une prospection, l'auteur, le flag interne

    Contrat technique :
        - Retour : QuerySet[ProspectionComment]
        - Hérite de FilterSet

    Exemple :
        ProspectionCommentFilter({
            "formation_nom": "pôle emploi",
            "created_by_username": "alice",
            "is_internal": True
        }).qs

    Limites/dépendances :
        - Dépend structuramment du modèle ProspectionComment et de ses relations (FK).
        - Les champs "prospection_owner" et "prospection_partenaire" nécessitent que
          ProspectionComment soit lié à Prospection, et Prospection à owner/partenaire.
    """

    formation_nom = django_filters.CharFilter(field_name="prospection__formation__nom", lookup_expr="icontains")
    partenaire_nom = django_filters.CharFilter(field_name="prospection__partenaire__nom", lookup_expr="icontains")
    created_by_username = django_filters.CharFilter(field_name="created_by__username", lookup_expr="icontains")

    prospection = django_filters.NumberFilter(field_name="prospection_id")
    created_by = django_filters.NumberFilter(field_name="created_by_id")
    is_internal = django_filters.BooleanFilter()

    # 🆕 utilitaires pour le front (cohérents avec tes usages ailleurs)
    prospection_owner = django_filters.NumberFilter(field_name="prospection__owner_id")
    prospection_partenaire = django_filters.NumberFilter(field_name="prospection__partenaire_id")

    class Meta:
        model = ProspectionComment
        fields = [
            "prospection",
            "is_internal",
            "created_by",
            "formation_nom",
            "partenaire_nom",
            "created_by_username",
            "prospection_owner",
            "prospection_partenaire",
        ]
