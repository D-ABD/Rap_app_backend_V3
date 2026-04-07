"""
Consultation des traces **ImportJob** — §2.14 / §2.15.

``GET /api/import-export/jobs/`` et ``GET /api/import-export/jobs/<id>/`` : lecture seule,
même préfixe que les routes par ressource.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime, time

from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils import timezone as dj_timezone
from django.utils.dateparse import parse_date, parse_datetime
from weasyprint import HTML
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view
from openpyxl import Workbook
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from rap_app.api.paginations import RapAppPagination
from rap_app.api.permissions import IsStaffOrAbove
from rap_app.api.roles import is_admin_like
from rap_app.models.import_job import ImportJob

from .serializers import ImportJobSerializer

_OPENAPI_TAG = "Import-export Excel"


@extend_schema_view(
    list=extend_schema(
        summary="Liste des traces d’import Excel",
        description=(
            "Historique des appels **POST …/import-xlsx/** (succès ou erreur). "
            "**Admin-like** : toutes les traces ; **autres rôles staff** : uniquement les siennes."
        ),
        tags=[_OPENAPI_TAG],
        parameters=[
            OpenApiParameter("resource", str, description="Filtre sur l’identifiant canonique (ex. centre)."),
            OpenApiParameter("resource__in", str, description="Liste CSV des ressources (ex. centre,formation)."),
            OpenApiParameter("status", str, description="success ou error."),
            OpenApiParameter("status__in", str, description="Liste CSV des statuts (ex. success,error)."),
            OpenApiParameter("user", str, description="Filtre username (icontains)."),
            OpenApiParameter("date_min", str, description="Date/heure min (ISO-8601)."),
            OpenApiParameter("date_max", str, description="Date/heure max (ISO-8601)."),
            OpenApiParameter(
                "dry_run",
                bool,
                description="Si true, seulement les simulations.",
            ),
        ],
        responses={200: OpenApiResponse(response=ImportJobSerializer(many=True))},
    ),
    retrieve=extend_schema(
        summary="Détail d’une trace d’import Excel",
        tags=[_OPENAPI_TAG],
        responses={200: OpenApiResponse(response=ImportJobSerializer)},
    ),
    export_csv=extend_schema(
        summary="Export CSV des traces d’import Excel",
        tags=[_OPENAPI_TAG],
        parameters=[
            OpenApiParameter("resource", str, description="Filtre sur l’identifiant canonique (ex. centre)."),
            OpenApiParameter("resource__in", str, description="Liste CSV des ressources (ex. centre,formation)."),
            OpenApiParameter("status", str, description="success ou error."),
            OpenApiParameter("status__in", str, description="Liste CSV des statuts (ex. success,error)."),
            OpenApiParameter("user", str, description="Filtre username (icontains)."),
            OpenApiParameter("date_min", str, description="Date/heure min (ISO-8601)."),
            OpenApiParameter("date_max", str, description="Date/heure max (ISO-8601)."),
            OpenApiParameter("dry_run", bool, description="Si true, seulement les simulations."),
        ],
        responses={200: OpenApiResponse(description="Fichier CSV des traces filtrées.")},
    ),
    export_xlsx=extend_schema(
        summary="Export XLSX des traces d’import Excel",
        tags=[_OPENAPI_TAG],
        parameters=[
            OpenApiParameter("resource", str, description="Filtre sur l’identifiant canonique (ex. centre)."),
            OpenApiParameter("resource__in", str, description="Liste CSV des ressources (ex. centre,formation)."),
            OpenApiParameter("status", str, description="success ou error."),
            OpenApiParameter("status__in", str, description="Liste CSV des statuts (ex. success,error)."),
            OpenApiParameter("user", str, description="Filtre username (icontains)."),
            OpenApiParameter("date_min", str, description="Date/heure min (ISO-8601)."),
            OpenApiParameter("date_max", str, description="Date/heure max (ISO-8601)."),
            OpenApiParameter("dry_run", bool, description="Si true, seulement les simulations."),
        ],
        responses={200: OpenApiResponse(description="Fichier XLSX des traces filtrées.")},
    ),
    export_pdf=extend_schema(
        summary="Export PDF des traces d’import Excel",
        tags=[_OPENAPI_TAG],
        parameters=[
            OpenApiParameter("resource", str, description="Filtre sur l’identifiant canonique (ex. centre)."),
            OpenApiParameter("resource__in", str, description="Liste CSV des ressources (ex. centre,formation)."),
            OpenApiParameter("status", str, description="success ou error."),
            OpenApiParameter("status__in", str, description="Liste CSV des statuts (ex. success,error)."),
            OpenApiParameter("user", str, description="Filtre username (icontains)."),
            OpenApiParameter("date_min", str, description="Date/heure min (ISO-8601)."),
            OpenApiParameter("date_max", str, description="Date/heure max (ISO-8601)."),
            OpenApiParameter("dry_run", bool, description="Si true, seulement les simulations."),
            OpenApiParameter(
                "ordering",
                str,
                description="Tri (ex. -created_at, created_at).",
            ),
        ],
        responses={200: OpenApiResponse(description="Fichier PDF des traces filtrées (tableau synthétique).")},
    ),
)
class ImportJobViewSet(viewsets.ReadOnlyModelViewSet):
    """Liste / détail **ImportJob** ; ``IsStaffOrAbove`` ; pagination ``RapAppPagination``."""

    serializer_class = ImportJobSerializer
    permission_classes = [IsAuthenticated, IsStaffOrAbove]
    pagination_class = RapAppPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "id", "resource", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = ImportJob.objects.select_related("user").all()
        user = self.request.user
        if not (is_admin_like(user) or getattr(user, "is_superuser", False)):
            qs = qs.filter(user=user)

        p = self.request.query_params
        if res := p.get("resource"):
            qs = qs.filter(resource=res)
        if res_list := p.get("resource__in"):
            vals = [v.strip() for v in str(res_list).split(",") if v.strip()]
            if vals:
                qs = qs.filter(resource__in=vals)
        if st := p.get("status"):
            qs = qs.filter(status=st)
        if st_list := p.get("status__in"):
            vals = [v.strip() for v in str(st_list).split(",") if v.strip()]
            if vals:
                qs = qs.filter(status__in=vals)
        if username := p.get("user"):
            qs = qs.filter(user__username__icontains=username.strip())
        dr = p.get("dry_run")
        if dr is not None and str(dr).lower() in ("1", "true", "yes", "on"):
            qs = qs.filter(dry_run=True)
        elif dr is not None and str(dr).lower() in ("0", "false", "no", "off"):
            qs = qs.filter(dry_run=False)
        # parse_datetime("YYYY-MM-DD") renvoie minuit **naïf** : traiter d'abord parse_date
        # pour les dates seules, puis parse_datetime pour les chaînes avec heure.
        if date_min := p.get("date_min"):
            d = parse_date(date_min)
            if d is not None:
                start = dj_timezone.make_aware(datetime.combine(d, time.min))
                qs = qs.filter(created_at__gte=start)
            else:
                dt = parse_datetime(date_min)
                if dt is not None:
                    if dj_timezone.is_naive(dt):
                        dt = dj_timezone.make_aware(dt, dj_timezone.get_current_timezone())
                    qs = qs.filter(created_at__gte=dt)
        if date_max := p.get("date_max"):
            d = parse_date(date_max)
            if d is not None:
                end = dj_timezone.make_aware(datetime.combine(d, time.max))
                qs = qs.filter(created_at__lte=end)
            else:
                dt = parse_datetime(date_max)
                if dt is not None:
                    if dj_timezone.is_naive(dt):
                        dt = dj_timezone.make_aware(dt, dj_timezone.get_current_timezone())
                    qs = qs.filter(created_at__lte=dt)

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "success": True,
                "message": "Liste des traces d’import Excel.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(
            {
                "success": True,
                "message": "Trace d’import Excel récupérée.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        response["Content-Disposition"] = f'attachment; filename="import_jobs_{stamp}.csv"'
        writer = csv.writer(response)
        writer.writerow(
            [
                "id",
                "created_at",
                "resource",
                "url_resource",
                "dry_run",
                "status",
                "http_status",
                "username",
                "original_filename",
                "summary",
                "error_payload",
            ]
        )
        for job in queryset:
            writer.writerow(
                [
                    job.pk,
                    job.created_at.isoformat() if job.created_at else "",
                    job.resource,
                    job.url_resource,
                    bool(job.dry_run),
                    job.status,
                    job.http_status if job.http_status is not None else "",
                    job.user.username if job.user else "",
                    job.original_filename or "",
                    job.summary or {},
                    job.error_payload or {},
                ]
            )
        return response

    @action(detail=False, methods=["get"], url_path="export-xlsx")
    def export_xlsx(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        wb = Workbook()
        ws = wb.active
        ws.title = "ImportJobs"
        ws.append(
            [
                "ID",
                "Date",
                "Resource",
                "URL Resource",
                "Dry run",
                "Status",
                "HTTP status",
                "Username",
                "Original filename",
                "Summary",
                "Error payload",
            ]
        )
        for job in queryset:
            ws.append(
                [
                    job.pk,
                    job.created_at.strftime("%Y-%m-%d %H:%M:%S") if job.created_at else "",
                    job.resource,
                    job.url_resource,
                    bool(job.dry_run),
                    job.status,
                    job.http_status if job.http_status is not None else "",
                    job.user.username if job.user else "",
                    job.original_filename or "",
                    str(job.summary or {}),
                    str(job.error_payload or {}),
                ]
            )
        out = io.BytesIO()
        wb.save(out)
        out.seek(0)
        response = HttpResponse(
            out.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        response["Content-Disposition"] = f'attachment; filename="import_jobs_{stamp}.xlsx"'
        return response

    @action(detail=False, methods=["get"], url_path="export-pdf")
    def export_pdf(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        jobs = list(queryset)
        context = {
            "jobs": jobs,
            "now": dj_timezone.now(),
            "request_user": request.user,
        }
        html_string = render_to_string("exports/import_jobs_pdf.html", context)
        pdf = HTML(string=html_string, base_url=request.build_absolute_uri("/")).write_pdf()
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="import_jobs_{stamp}.pdf"'
        response["Content-Length"] = len(pdf)
        return response
