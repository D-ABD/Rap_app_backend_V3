# rap_app/api/viewsets/centre_viewsets.py

from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models.centres import Centre
from ...models.logs import LogUtilisateur
from ..paginations import RapAppPagination
from ..permissions import ReadWriteAdminReadStaff
from ..serializers.centres_serializers import CentreSerializer


@extend_schema_view(
    list=extend_schema(summary="Lister les centres", tags=["Centres"]),
    retrieve=extend_schema(summary="Récupérer un centre", tags=["Centres"]),
    create=extend_schema(summary="Créer un centre", tags=["Centres"]),
    update=extend_schema(summary="Mettre à jour un centre", tags=["Centres"]),
    partial_update=extend_schema(summary="Mettre à jour partiellement un centre", tags=["Centres"]),
    destroy=extend_schema(summary="Supprimer un centre", tags=["Centres"]),
)
class CentreViewSet(viewsets.ModelViewSet):
    """ViewSet CRUD pour Centre. Permission ReadWriteAdminReadStaff ; staff limité à user.centres. Filtres, search, ordering. Action liste-simple (GET) pour id/label."""

    serializer_class = CentreSerializer
    pagination_class = RapAppPagination
    permission_classes = [IsAuthenticated & ReadWriteAdminReadStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    filterset_fields = [
        "nom",
        "code_postal",
        "cfa_entreprise",
        "cfa_responsable_est_lieu_principal",
        "cfa_responsable_denomination",
        "cfa_responsable_commune",
    ]

    search_fields = [
        "nom",
        "code_postal",
        "cfa_responsable_denomination",
        "cfa_responsable_commune",
        "siret_centre",
        "cfa_responsable_siret",
        "cfa_responsable_uai",
    ]

    ordering_fields = [
        "nom",
        "code_postal",
        "created_at",
        "updated_at",
    ]
    ordering = ["nom"]

    def get_queryset(self):
        """Staff (non superuser) : centres dans user.centres ; sinon tous. Tri par nom."""
        user = self.request.user
        qs = Centre.objects.all().order_by("nom")

        role = getattr(user, "role", "") or ""
        if role.startswith("staff") and not user.is_superuser:
            try:
                return qs.filter(id__in=user.centres.values_list("id", flat=True))
            except Exception:
                return qs.none()

        return qs

    @action(detail=False, methods=["get"], url_path="liste-simple")
    def liste_simple(self, request):
        """GET : liste id/label des centres (get_queryset), filtre search/q sur nom ou code_postal, page_size (défaut 200)."""
        search = request.query_params.get("search") or request.query_params.get("q") or ""
        try:
            page_size = int(request.query_params.get("page_size", 200))
        except ValueError:
            page_size = 200

        qs = self.get_queryset()
        if search:
            qs = qs.filter(Q(nom__icontains=search) | Q(code_postal__icontains=search))

        qs = qs.order_by("nom")[:page_size]
        data = [{"id": c.id, "label": c.nom} for c in qs]
        return Response({"results": data})

    def create(self, request, *args, **kwargs):
        """Crée un centre (CentreSerializer), save(user), LogUtilisateur.log_action CREATE, retourne success/message/data."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        centre = Centre(**serializer.validated_data)
        centre.save(user=request.user)

        LogUtilisateur.log_action(centre, LogUtilisateur.ACTION_CREATE, request.user)

        return Response(
            {
                "success": True,
                "message": "Centre créé avec succès.",
                "data": centre.to_serializable_dict(),
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        """Met à jour un centre (CentreSerializer), LogUtilisateur.log_action UPDATE, retourne success/message/data."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        LogUtilisateur.log_action(instance, LogUtilisateur.ACTION_UPDATE, request.user)

        return Response(
            {
                "success": True,
                "message": "Centre mis à jour avec succès.",
                "data": instance.to_serializable_dict(),
            }
        )

    def partial_update(self, request, *args, **kwargs):
        """Met à jour partielle, LogUtilisateur.log_action UPDATE (détails partielle), retourne success/message/data."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        LogUtilisateur.log_action(
            instance,
            LogUtilisateur.ACTION_UPDATE,
            request.user,
            details="Mise à jour partielle",
        )

        return Response(
            {
                "success": True,
                "message": "Centre partiellement mis à jour.",
                "data": instance.to_serializable_dict(),
            }
        )

    def destroy(self, request, *args, **kwargs):
        """Supprime le centre, LogUtilisateur.log_action ACTION_DELETE, retourne success/message/data None, 204."""
        instance = self.get_object()
        instance.delete()

        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_DELETE,
            user=request.user,
            details=f"Suppression du centre : {instance.nom}",
        )

        return Response(
            {
                "success": True,
                "message": "Centre supprimé avec succès.",
                "data": None,
            },
            status=status.HTTP_204_NO_CONTENT,
        )
