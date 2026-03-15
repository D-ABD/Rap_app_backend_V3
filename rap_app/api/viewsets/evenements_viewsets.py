import csv
import logging

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ...api.paginations import RapAppPagination
from ...api.permissions import IsOwnerOrStaffOrAbove
from ...api.serializers.evenements_serializers import (
    EvenementChoiceSerializer,
    EvenementSerializer,
)
from ...models.evenements import Evenement
from ...services.evenements_export import csv_export_evenements
from ..roles import get_staff_centre_ids_cached, is_admin_like, is_staff_or_staffread

logger = logging.getLogger("application.api")


@extend_schema(tags=["Événements"])
class EvenementViewSet(viewsets.ModelViewSet):
    """
    📆 ViewSet principal pour la gestion des événements liés aux formations.

    ------------------------------------------------------------------------
    1. Permissions
    ------------------------------------------------------------------------
    - permission_classes = [IsOwnerOrStaffOrAbove]
        * Cette permission contrôle l'accès :
            - Accès autorisé pour : le propriétaire (créateur/utilisateur lié), les membres du staff ou les utilisateurs ayant un niveau supérieur d'autorisation.
            - ⚠️ Le détail exact du contrôle d'accès (rôle précis, portée des droits, logique propriétaire) dépend de l'implémentation d'IsOwnerOrStaffOrAbove,
              qui n'est PAS visible dans ce fichier.

    ------------------------------------------------------------------------
    2. Filtrage et QuerySet
    ------------------------------------------------------------------------
    - queryset par défaut : récupère tous les Evenement de la BDD, avec un select_related("formation") pour optimiser la jointure sur la formation liée.
    - get_queryset() est redéfini : admin/superadmin accès complet ; staff limité aux formations de ses centres (get_staff_centre_ids_cached) ; candidat/autres uniquement leurs événements (user=request.user).

    - Filtres personnalisés appliqués dans .list() :
        * formation (ID)             : filtre sur formation_id par query param `formation`
        * type_evenement (str)       : filtre par type d'événement (query param `type_evenement`)
        * date_min (str)             : filtre les événements dont la date (event_date) >= date_min (`YYYY-MM-DD`)
        * date_max (str)             : filtre les événements dont la date (event_date) <= date_max (`YYYY-MM-DD`)
    - Aucune filter_backend, search_fields, ordering_fields, filterset_class : Le filtrage est manuel, uniquement sur les 4 query params ci-dessus.

    - Pagination : RapAppPagination est utilisée pour les listings paginés (si le nombre d’objets retourne une page paginée).
      Si la pagination ne s’applique pas, l’ensemble est retourné en une seule liste.

    - Restrictions de visibilité supplémentaires : aucune restriction explicite sur le queryset en fonction de l’utilisateur n’est ici,
      tout contrôle d’accès est délégué à la permission (voir ci-dessus).

    ------------------------------------------------------------------------
    3. Actions Standard (list, retrieve, create, update, partial_update, destroy)
    ------------------------------------------------------------------------

    - list(self, request, ...):
        * Intention métier : Lister les événements, avec filtrage dynamique sur formation, type, période.
        * Serializer utilisé : EvenementSerializer (many=True).
        * Paramètres GET customisés (voir plus haut).
        * Réponse : liste d’événements sous forme JSON, au format EvenementSerializer. Si pagination, enveloppe paginée DRF standard.

    - retrieve(self, request, ...):
        * Intention métier : Récupérer un événement unique (détaillé).
        * Serializer utilisé : EvenementSerializer.
        * Réponse : données JSON de l’événement (champ précis dépendant du serializer).

    - create(self, request, ...):
        * Intention métier : Créer un événement lié à une formation.
        * Behaviour visible : at création, le champ user est automatiquement renseigné avec self.request.user via perform_create().
        * Serializer utilisé : EvenementSerializer.
        * Réponse : l’objet nouvellement créé au format EvenementSerializer (format DRF).

    - update/partial_update(self, request, ...):
        * Intention métier : Mettre à jour/modifier un événement.
        * Serializer utilisé : EvenementSerializer.
        * Réponse : données JSON de l’objet mis à jour (voir serializer).

    - destroy(self, request, ...):
        * Intention métier : Supprimer un événement.
        * Réponse : réponse standard DRF (souvent 204 No Content sans payload).

    ------------------------------------------------------------------------
    4. Actions personnalisées (@action)
    ------------------------------------------------------------------------

    - export_csv (GET /evenements/export-csv/)
        * Objectif métier : Exporter au format CSV tous les événements actuellement dans le queryset (sans pagination ni filtrage utilisateur supplémentaires dans ce code).
        * Type de requête attendu : GET
        * Réponse : Objet HttpResponse avec fichier CSV.
            - Le format du CSV dépend complètement de la fonction csv_export_evenements, non visible ici.
            - ⚠️ Aucune structure JSON dans la réponse, c’est un download binaire (content-type CSV).

    - stats_par_type (GET /evenements/stats-par-type/)
        * Objectif métier : Fournir des statistiques (occurrences) du nombre d’événements, ventilés par type, entre deux dates optionnelles (query params `start` et `end`).
        * Type de requête attendu : GET
        * Réponse JSON (clairement codée ici):
            {
                "success": true,
                "data": ...  # c’est le retour de Evenement.get_stats_by_type (la structure précise dépend de son retour, non visible)
            }
            - Si la structure précise n’est pas immédiate, elle dépend de la méthode statique get_stats_by_type du modèle Evenement, dont le détail n’est pas ici.

    - choices (GET /evenements/choices/)
        * Objectif métier : Renvoyer la liste exhaustive des types d’événements possibles (avec valeur interne et libellé humain).
        * Type de requête attendu : GET
        * Réponse : Structure JSON explicite :
            {
                "success": True,
                "message": "Liste des types d’événements récupérée avec succès.",
                "data": [
                    {"value": ..., "label": ...},
                    ...
                ]
            }
            - La liste data : chaque item provient de Evenement.TypeEvenement.choices (tuplé valeur, libellé).

    ------------------------------------------------------------------------
    """

    queryset = Evenement.objects.all().select_related("formation")
    serializer_class = EvenementSerializer
    permission_classes = [IsOwnerOrStaffOrAbove]
    pagination_class = RapAppPagination

    def get_queryset(self):
        """
        Restreint la liste aux événements dont la formation appartient aux centres
        autorisés de l'utilisateur. Admin/superadmin : accès complet. Staff : formation
        dans ses centres. Candidat/autres : uniquement les événements dont ils sont créateurs.
        """
        base = Evenement.objects.all().select_related("formation")
        user = getattr(self.request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return base.none()
        if is_admin_like(user):
            return base
        centre_ids = get_staff_centre_ids_cached(self.request)
        if centre_ids is None:
            return base
        if centre_ids:
            return base.filter(formation__centre_id__in=centre_ids)
        if is_staff_or_staffread(user):
            return base.none()
        return base.filter(user=user)

    @extend_schema(
        summary="📚 Lister les événements",
        tags=["Événements"],
        parameters=[
            OpenApiParameter("formation", int, description="ID de la formation"),
            OpenApiParameter("type_evenement", str, description="Type d'événement"),
            OpenApiParameter("date_min", str, description="Date minimale (YYYY-MM-DD)"),
            OpenApiParameter("date_max", str, description="Date maximale (YYYY-MM-DD)"),
        ],
        responses={200: OpenApiResponse(response=EvenementSerializer(many=True))},
    )
    def list(self, request, *args, **kwargs):
        """
        Liste paginée ou complète des événements.

        - Filtrage possible sur : formation, type_evenement, date_min, date_max via query params GET.
        - Résultat : liste JSON d'événements (EvenementSerializer), éventuellement paginée.
        """
        formation = request.query_params.get("formation")
        type_evenement = request.query_params.get("type_evenement")
        date_min = request.query_params.get("date_min")
        date_max = request.query_params.get("date_max")

        queryset = self.get_queryset()
        if formation:
            queryset = queryset.filter(formation_id=formation)
        if type_evenement:
            queryset = queryset.filter(type_evenement=type_evenement)
        if date_min:
            queryset = queryset.filter(event_date__gte=date_min)
        if date_max:
            queryset = queryset.filter(event_date__lte=date_max)

        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)

    def perform_create(self, serializer):
        """
        Intercepte la création d'un événement pour renseigner automatiquement le champ `user` par l'utilisateur courant.

        - Permet de tracer le créateur lors de POST/PUT.
        - Le comportement d’autorisation réelle dépend de IsOwnerOrStaffOrAbove.
        """
        serializer.save(user=self.request.user)

    @extend_schema(
        summary="🧾 Exporter les événements au format CSV",
        tags=["Événements"],
        responses={
            200: OpenApiResponse(
                description="Réponse CSV contenant les événements",
                response=None,  # ✅ On ne fournit pas de serializer ici
            )
        },
        examples=[],  # optionnel
    )
    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        """
        📤 Export de tous les événements au format CSV.

        - Méthode : GET.
        - Réponse : fichier CSV en téléchargement, produit par csv_export_evenements(self.queryset).
          Le contenu et la structure du CSV dépendent uniquement de la fonction appelée,
          SA structure exacte N’EST PAS VISIBLE dans ce code.
        - Permissions et filtrage : identiques au ViewSet (cf. permission_classes, get_queryset).
        """
        response = csv_export_evenements(self.get_queryset())
        return response

    @extend_schema(
        summary="📊 Statistiques par type d'événement",
        tags=["Événements"],
        parameters=[
            OpenApiParameter("start", str, required=False, description="Date de début (YYYY-MM-DD)"),
            OpenApiParameter("end", str, required=False, description="Date de fin (YYYY-MM-DD)"),
        ],
        responses={
            200: OpenApiResponse(
                description="Dictionnaire des types d'événements avec leurs occurrences",
                response=None,  # tu peux ajouter un serializer si besoin plus tard
            )
        },
    )
    @action(detail=False, methods=["get"], url_path="stats-par-type")
    def stats_par_type(self, request):
        """
        📈 Statistiques numériques sur les types d'événements.

        - Méthode : GET.
        - Query params optionnels : `start` (date début, YYYY-MM-DD), `end` (date fin, YYYY-MM-DD).
        - Réponse JSON explicite (payload) :
            {
              "success": true,
              "data": ...  # format exact dépendant de Evenement.get_stats_by_type (non documenté ici)
            }
        - Objectif : permettre une analyse rapide de volumes par type d’événement, sur une période donnée.
        """
        start_date = request.query_params.get("start")
        end_date = request.query_params.get("end")
        stats = Evenement.get_stats_by_type(start_date=start_date, end_date=end_date)
        return Response({"success": True, "data": stats})

    @action(detail=False, methods=["get"])
    @extend_schema(
        summary="Liste des types d’événements possibles",
        description="Retourne la liste des valeurs possibles pour `type_evenement`, avec leur libellé lisible.",
        tags=["Événements"],
        responses={200: OpenApiResponse(response=EvenementChoiceSerializer(many=True))},
    )
    def choices(self, request):
        """
        👉 Fournit la liste exhaustive des types d’événements disponibles.

        - Méthode : GET.
        - Réponse : Structure JSON :
            {
                "success": True,
                "message": "Liste des types d’événements récupérée avec succès.",
                "data": [
                    {"value": ..., "label": ...},
                    ...
                ]
            }
        - Les types disponibles sont ceux définis par Evenement.TypeEvenement.choices (Enum Django).
        - Pas de filtrage/pagination ; tous les types sont retournés.
        """
        data = [{"value": key, "label": label} for key, label in Evenement.TypeEvenement.choices]
        return Response(
            {"success": True, "message": "Liste des types d’événements récupérée avec succès.", "data": data}
        )
