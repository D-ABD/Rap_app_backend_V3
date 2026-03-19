import csv
import logging

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ...api.paginations import RapAppPagination
from ...api.permissions import IsOwnerOrStaffOrAbove
from ...api.serializers.evenements_serializers import (
    EvenementChoiceSerializer,
    EvenementSerializer,
)
from ...models.evenements import Evenement
from ...services.evenements_export import csv_export_evenements
from ..mixins import ApiResponseMixin
from ..roles import get_staff_centre_ids_cached, is_admin_like, is_staff_or_staffread

logger = logging.getLogger("application.api")


@extend_schema(tags=["Événements"])
class EvenementViewSet(ApiResponseMixin, viewsets.ModelViewSet):
    """
    CRUD des événements rattachés aux formations.

    Le queryset est filtré selon le rôle courant :
    - admin-like : accès global ;
    - staff/staffread : événements des formations de leurs centres ;
    - autres utilisateurs : événements dont ils sont créateurs.

    Les endpoints standards restent en contrat DRF classique via
    `EvenementSerializer`, avec pagination sur `list`. Les actions custom
    documentent explicitement leurs formats de sortie :
    - `export_csv` renvoie un fichier CSV ;
    - `stats_par_type` renvoie un payload `{success, data}` ;
    - `choices` renvoie un payload `{success, message, data}`.

    Ce module reste important pour la suite du chantier `FormationMetricsService`
    car la création et la suppression d'événements déclenchent encore des effets
    de bord métier hors de ce viewset.
    """

    queryset = Evenement.objects.all().select_related("formation")
    serializer_class = EvenementSerializer
    permission_classes = [IsOwnerOrStaffOrAbove]
    pagination_class = RapAppPagination

    def get_queryset(self):
        """
        Retourne le queryset visible pour l'utilisateur courant.

        La visibilité est calculée ici à partir du rôle et, pour le staff,
        des centres accessibles via `get_staff_centre_ids_cached`.
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
        Liste les événements visibles avec filtrage manuel optionnel.

        Les query params `formation`, `type_evenement`, `date_min` et `date_max`
        affinent le queryset avant pagination.
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
        return (
            self.get_paginated_response(serializer.data)
            if page
            else self.success_response(data=serializer.data, message="Liste des événements récupérée avec succès.")
        )

    def _assert_staff_can_use_formation(self, formation):
        if not formation:
            return
        user = self.request.user
        if is_admin_like(user):
            return
        if is_staff_or_staffread(user):
            allowed = set(user.centres.values_list("id", flat=True))
            if getattr(formation, "centre_id", None) not in allowed:
                raise PermissionDenied("Formation hors de votre périmètre (centre).")

    def _requested_formation(self, serializer):
        formation = serializer.validated_data.get("formation")
        if formation is not None:
            return formation

        formation_id = self.request.data.get("formation_id")
        if formation_id in (None, ""):
            return None
        return get_object_or_404(Evenement._meta.get_field("formation").remote_field.model, pk=formation_id)

    def perform_create(self, serializer):
        """
        Associe systématiquement l'événement créé à l'utilisateur courant.
        """
        self._assert_staff_can_use_formation(self._requested_formation(serializer))
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        self._assert_staff_can_use_formation(serializer.validated_data.get("formation", serializer.instance.formation))
        serializer.save(updated_by=self.request.user)

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
        Exporte le queryset visible courant au format CSV.

        La structure du fichier est déléguée à `csv_export_evenements`.
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
        Retourne les statistiques d'occurrence par type d'événement.

        Le calcul est délégué à `Evenement.get_stats_by_type` avec filtres
        temporels optionnels `start` et `end`.
        """
        start_date = request.query_params.get("start")
        end_date = request.query_params.get("end")
        stats = Evenement.get_stats_by_type(start_date=start_date, end_date=end_date)
        return self.success_response(data=stats, message="Statistiques événements par type récupérées avec succès.")

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
        return self.success_response(data=data, message="Liste des types d’événements récupérée avec succès.")
