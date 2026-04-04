# rap_app/api/viewsets/centre_viewsets.py

from django.db.models import Q
from django.shortcuts import get_object_or_404
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
from ..mixins import ApiResponseMixin, HardDeleteArchivedMixin
from ..paginations import RapAppPagination
from ..permissions import ReadWriteAdminReadStaff
from ..roles import is_admin_like, is_staff_or_staffread
from ..serializers.centres_serializers import CentreSerializer


@extend_schema_view(
    list=extend_schema(summary="Lister les centres", tags=["Centres"]),
    retrieve=extend_schema(summary="Récupérer un centre", tags=["Centres"]),
    create=extend_schema(summary="Créer un centre", tags=["Centres"]),
    update=extend_schema(summary="Mettre à jour un centre", tags=["Centres"]),
    partial_update=extend_schema(summary="Mettre à jour partiellement un centre", tags=["Centres"]),
    destroy=extend_schema(summary="Archiver un centre", tags=["Centres"]),
)
class CentreViewSet(HardDeleteArchivedMixin, ApiResponseMixin, viewsets.ModelViewSet):
    """ViewSet CRUD pour Centre. Permission ReadWriteAdminReadStaff ; staff limité à user.centres. Filtres, search, ordering. Action liste-simple (GET) pour id/label."""

    serializer_class = CentreSerializer
    pagination_class = RapAppPagination
    permission_classes = [IsAuthenticated & ReadWriteAdminReadStaff]
    hard_delete_enabled = True
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
        """Retourne les centres actifs visibles par rôle, triés par nom."""
        user = self.request.user
        qs = Centre.objects.all().order_by("nom")
        include_archived = str(self.request.query_params.get("avec_archivees", "")).lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        archives_seules = str(self.request.query_params.get("archives_seules", "")).lower() in {
            "1",
            "true",
            "yes",
            "on",
        }

        if archives_seules:
            qs = qs.filter(is_active=False)
        elif not include_archived:
            qs = qs.filter(is_active=True)

        if is_admin_like(user):
            return qs

        if is_staff_or_staffread(user):
            try:
                return qs.filter(id__in=user.centres.values_list("id", flat=True))
            except Exception:
                return qs.none()

        return qs.none()

    def get_archived_aware_object(self):
        """Récupère un centre en incluant les archives tout en respectant le scope utilisateur."""
        lookup_value = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
        user = self.request.user
        qs = Centre.objects.all().order_by("nom")

        if is_admin_like(user):
            scoped_qs = qs
        elif is_staff_or_staffread(user):
            try:
                scoped_qs = qs.filter(id__in=user.centres.values_list("id", flat=True))
            except Exception:
                scoped_qs = qs.none()
        else:
            scoped_qs = qs.none()

        return get_object_or_404(scoped_qs, **{self.lookup_field: lookup_value})

    def list(self, request, *args, **kwargs):
        """Retourne la liste paginée des centres dans l'enveloppe API standard."""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated = self.get_paginated_response(serializer.data).data
            if isinstance(paginated, dict) and {"success", "message", "data"}.issubset(paginated.keys()):
                paginated["message"] = "Liste des centres récupérée avec succès."
                return Response(paginated)
            return self.success_response(
                data=paginated,
                message="Liste des centres récupérée avec succès.",
            )

        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(
            data=serializer.data,
            message="Liste des centres récupérée avec succès.",
        )

    def retrieve(self, request, *args, **kwargs):
        """Retourne le détail d'un centre dans l'enveloppe API standard."""
        instance = self.get_object()
        return self.success_response(
            data=self.get_serializer(instance).data,
            message="Centre récupéré avec succès.",
        )

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
        return self.success_response(data={"results": data}, message="Liste simple des centres récupérée avec succès.")

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
        """Archive logiquement le centre et le retire des listes actives."""
        instance = self.get_object()
        if not instance.is_active:
            return self.success_response(
                data=instance.to_serializable_dict(),
                message="Centre déjà archivé.",
                status_code=status.HTTP_200_OK,
            )

        instance.is_active = False
        instance.save(user=request.user, update_fields=["is_active"])

        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_UPDATE,
            user=request.user,
            details=f"Archivage logique du centre : {instance.nom}",
        )

        return self.success_response(
            data=instance.to_serializable_dict(),
            message="Centre archivé avec succès.",
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="desarchiver")
    def desarchiver(self, request, *args, **kwargs):
        """Restaure un centre archivé."""
        instance = self.get_archived_aware_object()
        if instance.is_active:
            return self.success_response(
                data=instance.to_serializable_dict(),
                message="Centre déjà actif.",
                status_code=status.HTTP_200_OK,
            )

        instance.is_active = True
        instance.save(user=request.user, update_fields=["is_active"])

        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_UPDATE,
            user=request.user,
            details=f"Désarchivage du centre : {instance.nom}",
        )

        return self.success_response(
            data=instance.to_serializable_dict(),
            message="Centre désarchivé avec succès.",
            status_code=status.HTTP_200_OK,
        )
