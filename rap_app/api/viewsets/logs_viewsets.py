"""ViewSet de consultation des logs utilisateurs."""

import csv
import io

from django.http import HttpResponse
from openpyxl import Workbook
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...api.paginations import RapAppPagination
from ...api.permissions import IsAdminLikeOnly
from ...api.serializers.logs_serializers import (
    LogChoicesSerializer,
    LogUtilisateurSerializer,
)
from ...models.logs import LogUtilisateur


@extend_schema_view(
    list=extend_schema(
        summary="Liste des logs utilisateur",
        description="Affiche les logs enregistrés (lecture seule, paginée). Accès réservé aux administrateurs et superadministrateurs.",
        tags=["Logs"],
        responses={200: OpenApiResponse(response=LogUtilisateurSerializer)},
    ),
    retrieve=extend_schema(
        summary="Détail d’un log",
        description="Affiche les détails d’un log utilisateur.",
        tags=["Logs"],
        responses={200: OpenApiResponse(response=LogUtilisateurSerializer)},
    ),
)
class LogUtilisateurViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet lecture seule pour LogUtilisateur. IsAuthenticated, IsAdminLikeOnly. get_queryset : tous les logs. filter_backends : SearchFilter, OrderingFilter ; search_fields, ordering_fields, ordering=-created_at ; RapAppPagination. list et retrieve retournent success/message/data."""

    serializer_class = LogUtilisateurSerializer
    permission_classes = [IsAuthenticated, IsAdminLikeOnly]
    pagination_class = RapAppPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["action", "details", "created_by__username"]
    ordering_fields = ["created_at", "action"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Retourne LogUtilisateur.objects.all() ; accès contrôlé par IsAdminLikeOnly."""
        queryset = LogUtilisateur.objects.select_related("content_type", "created_by").all()
        params = self.request.query_params
        action_value = params.get("action")
        if action_value:
            queryset = queryset.filter(action=action_value)
        model_value = params.get("model")
        if model_value:
            queryset = queryset.filter(content_type__model=model_value)
        user_value = params.get("user")
        if user_value:
            queryset = queryset.filter(created_by__username__icontains=user_value)
        date_from = params.get("date_from")
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        date_to = params.get("date_to")
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        return queryset

    def list(self, request, *args, **kwargs):
        """Liste paginée ou complète ; filter_queryset ; success/message/data."""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {"success": True, "message": "Liste des logs utilisateur.", "data": serializer.data},
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, *args, **kwargs):
        """Détail d'un log par pk ; success/message/data."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(
            {"success": True, "message": "Log utilisateur récupéré avec succès.", "data": serializer.data},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="export-xlsx")
    def export_xlsx(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        wb = Workbook()
        ws = wb.active
        ws.title = "Logs"
        ws.append(["ID", "Action", "Modèle", "Object ID", "Utilisateur", "Date", "Détails"])
        for log in queryset:
            ws.append(
                [
                    log.pk,
                    log.action,
                    log.content_type.model if log.content_type else "",
                    log.object_id or "",
                    log.created_by.username if log.created_by else "Système",
                    log.created_at.strftime("%Y-%m-%d %H:%M") if log.created_at else "",
                    log.details or "",
                ]
            )
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="logs_utilisateurs.xlsx"'
        return response

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="logs_utilisateurs.csv"'
        writer = csv.writer(response)
        writer.writerow(["ID", "Action", "Modèle", "Object ID", "Utilisateur", "Date", "Détails"])
        for log in queryset:
            writer.writerow(
                [
                    log.pk,
                    log.action,
                    log.content_type.model if log.content_type else "",
                    log.object_id or "",
                    log.created_by.username if log.created_by else "Système",
                    log.created_at.strftime("%Y-%m-%d %H:%M") if log.created_at else "",
                    log.details or "",
                ]
            )
        return response

    @action(detail=False, methods=["get"], url_path="export-pdf")
    def export_pdf(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 40
        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(40, y, "Logs utilisateurs")
        y -= 24
        pdf.setFont("Helvetica", 9)
        for log in queryset:
            line = (
                f"[{log.created_at.strftime('%Y-%m-%d %H:%M') if log.created_at else ''}] "
                f"{log.action} | {log.content_type.model if log.content_type else ''} "
                f"#{log.object_id or ''} | "
                f"{log.created_by.username if log.created_by else 'Système'} | "
                f"{log.details or ''}"
            )
            for start in range(0, len(line), 110):
                if y < 40:
                    pdf.showPage()
                    y = height - 40
                    pdf.setFont("Helvetica", 9)
                pdf.drawString(40, y, line[start : start + 110])
                y -= 14
        pdf.save()
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="logs_utilisateurs.pdf"'
        return response


@extend_schema(
    methods=["GET"],
    responses={200: LogChoicesSerializer},
    description="Retourne la liste des actions possibles enregistrées dans les logs utilisateur.",
)
class LogChoicesView(APIView):
    """GET : liste des actions possibles pour les logs dans l'enveloppe API standard."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        label_map = {
            LogUtilisateur.ACTION_CREATE: "Création",
            LogUtilisateur.ACTION_UPDATE: "Modification",
            LogUtilisateur.ACTION_DELETE: "Suppression",
            LogUtilisateur.ACTION_VIEW: "Consultation",
            LogUtilisateur.ACTION_LOGIN: "Connexion",
            LogUtilisateur.ACTION_LOGOUT: "Déconnexion",
            LogUtilisateur.ACTION_EXPORT: "Export",
            LogUtilisateur.ACTION_IMPORT: "Import",
        }

        data = {
            "actions": [{"value": k, "label": v} for k, v in label_map.items()],
            "models": sorted(
                [
                    {"value": value, "label": value.replace("_", " ").title()}
                    for value in LogUtilisateur.objects.exclude(content_type__model__isnull=True)
                    .values_list("content_type__model", flat=True)
                    .distinct()
                    if value
                ],
                key=lambda item: item["label"],
            ),
        }
        return Response(
            {
                "success": True,
                "message": "Choix des logs récupérés avec succès.",
                "data": data,
            },
            status=status.HTTP_200_OK,
        )
