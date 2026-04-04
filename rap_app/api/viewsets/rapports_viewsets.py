import csv
import io
import json

from django.http import HttpResponse
from openpyxl import Workbook
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ...api.paginations import RapAppPagination
from ...api.permissions import IsStaffOrAbove
from ...api.serializers.rapports_serializers import (
    RapportChoiceGroupSerializer,
    RapportSerializer,
)
from ...models.centres import Centre
from ...models.formations import Formation
from ...models.logs import LogUtilisateur
from ...models.rapports import Rapport
from ...models.candidat import Candidat
from ...models.statut import Statut
from ...models.types_offre import TypeOffre
from ...services.report_builders import RapportDataBuilderService
from ..mixins import HardDeleteArchivedMixin
from ..roles import get_staff_centre_ids_cached, is_admin_like


@extend_schema_view(
    list=extend_schema(
        summary="📊 Liste des rapports",
        description="Affiche la liste paginée des rapports générés.",
        tags=["Rapports"],
        responses={200: OpenApiResponse(response=RapportSerializer)},
    ),
    retrieve=extend_schema(
        summary="📄 Détail d’un rapport",
        description="Récupère les détails complets d’un rapport.",
        tags=["Rapports"],
        responses={200: OpenApiResponse(response=RapportSerializer)},
    ),
    create=extend_schema(
        summary="➕ Créer un rapport",
        description="Crée un nouveau rapport système ou manuel.",
        tags=["Rapports"],
        responses={201: OpenApiResponse(description="Rapport créé avec succès.")},
    ),
    update=extend_schema(
        summary="✏️ Modifier un rapport",
        description="Met à jour les champs d’un rapport existant.",
        tags=["Rapports"],
        responses={200: OpenApiResponse(description="Rapport mis à jour avec succès.")},
    ),
    destroy=extend_schema(
        summary="📦 Archiver un rapport",
        description="Archive logiquement un rapport en le désactivant.",
        tags=["Rapports"],
        responses={200: OpenApiResponse(description="Rapport archivé avec succès.")},
    ),
)
class RapportViewSet(HardDeleteArchivedMixin, viewsets.ModelViewSet):
    """
    ViewSet CRUD des rapports actifs.

    Source de vérité actuelle :
    - visibilité restreinte par rôle et centres dans `get_queryset()`
    - suppression logique via `is_active = False`
    - réponses JSON construites dans le viewset
    - dépendance résiduelle à `RapportSerializer`, qui encapsule encore
      aussi les données dans `to_representation()`

    Tant que ce serializer n'est pas nettoyé, le contrat de sortie doit être
    lu à partir du code de ce viewset et non de la cible architecturale.
    """

    queryset = Rapport.objects.filter(is_active=True)
    serializer_class = RapportSerializer
    permission_classes = [IsStaffOrAbove]
    pagination_class = RapAppPagination
    hard_delete_enabled = True
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nom", "type_rapport", "periode"]
    ordering_fields = ["created_at", "date_debut", "date_fin"]
    ordering = ["-created_at"]

    def _flatten_report_data(self, value, prefix=""):
        rows = []
        if isinstance(value, dict):
            for key, child in value.items():
                child_prefix = f"{prefix}.{key}" if prefix else str(key)
                rows.extend(self._flatten_report_data(child, child_prefix))
            return rows
        if isinstance(value, list):
            for index, child in enumerate(value):
                child_prefix = f"{prefix}[{index}]"
                rows.extend(self._flatten_report_data(child, child_prefix))
            return rows
        rows.append((prefix or "valeur", value))
        return rows

    def _report_export_format(self, request, instance: Rapport):
        requested = (request.query_params.get("format") or instance.format or Rapport.FORMAT_HTML).lower()
        return {
            "xlsx": Rapport.FORMAT_EXCEL,
            "excel": Rapport.FORMAT_EXCEL,
        }.get(requested, requested)

    def _export_report_csv(self, instance: Rapport):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="rapport_{instance.pk}.csv"'
        writer = csv.writer(response)
        writer.writerow(["Champ", "Valeur"])
        writer.writerow(["Nom", instance.nom])
        writer.writerow(["Type", instance.get_type_rapport_display()])
        writer.writerow(["Période", instance.get_periode_display()])
        writer.writerow(["Date début", instance.date_debut])
        writer.writerow(["Date fin", instance.date_fin])
        writer.writerow(["Format", instance.get_format_display()])
        writer.writerow(["Centre", instance.centre.nom if instance.centre else ""])
        writer.writerow(["Type offre", instance.type_offre.nom if instance.type_offre else ""])
        writer.writerow(["Statut", instance.statut.nom if instance.statut else ""])
        writer.writerow(["Formation", instance.formation.nom if instance.formation else ""])
        for key, value in self._flatten_report_data(instance.donnees or {}):
            writer.writerow([key, json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else value])
        return response

    def _export_report_excel(self, instance: Rapport):
        wb = Workbook()
        ws = wb.active
        ws.title = "Rapport"
        ws.append(["Champ", "Valeur"])
        rows = [
            ("Nom", instance.nom),
            ("Type", instance.get_type_rapport_display()),
            ("Période", instance.get_periode_display()),
            ("Date début", str(instance.date_debut)),
            ("Date fin", str(instance.date_fin)),
            ("Format", instance.get_format_display()),
            ("Centre", instance.centre.nom if instance.centre else ""),
            ("Type offre", instance.type_offre.nom if instance.type_offre else ""),
            ("Statut", instance.statut.nom if instance.statut else ""),
            ("Formation", instance.formation.nom if instance.formation else ""),
        ]
        rows.extend(
            (
                key,
                json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else value,
            )
            for key, value in self._flatten_report_data(instance.donnees or {})
        )
        for row in rows:
            ws.append(list(row))
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="rapport_{instance.pk}.xlsx"'
        return response

    def _export_report_pdf(self, instance: Rapport):
        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 40

        def draw_line(label, value):
            nonlocal y
            text = f"{label}: {value}"
            for start in range(0, len(text), 100):
                if y < 40:
                    pdf.showPage()
                    y = height - 40
                pdf.drawString(40, y, text[start : start + 100])
                y -= 16

        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(40, y, f"Rapport - {instance.nom}")
        y -= 24
        pdf.setFont("Helvetica", 10)
        draw_line("Type", instance.get_type_rapport_display())
        draw_line("Période", instance.get_periode_display())
        draw_line("Date début", instance.date_debut)
        draw_line("Date fin", instance.date_fin)
        draw_line("Format", instance.get_format_display())
        draw_line("Centre", instance.centre.nom if instance.centre else "")
        draw_line("Type offre", instance.type_offre.nom if instance.type_offre else "")
        draw_line("Statut", instance.statut.nom if instance.statut else "")
        draw_line("Formation", instance.formation.nom if instance.formation else "")
        for key, value in self._flatten_report_data(instance.donnees or {}):
            draw_line(key, json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else value)
        pdf.save()
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="rapport_{instance.pk}.pdf"'
        return response

    def _export_report_html(self, instance: Rapport):
        return Response(
            {
                "success": True,
                "message": "Rapport exporté en HTML.",
                "data": {
                    "rapport": instance.to_serializable_dict(),
                    "donnees_lignes": [
                        {"cle": key, "valeur": value}
                        for key, value in self._flatten_report_data(instance.donnees or {})
                    ],
                },
            }
        )

    def get_queryset(self):
        """
        Retourne les rapports actifs visibles pour l'utilisateur selon
        son rôle et ses centres (accès complet pour les profils
        admin-like, filtré par centre pour les autres staff).
        """
        base = Rapport.objects.filter(is_active=True)
        user = getattr(self.request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return base.none()
        if is_admin_like(user):
            return base
        centre_ids = get_staff_centre_ids_cached(self.request)
        if centre_ids is None:
            return base
        if centre_ids:
            return base.filter(centre_id__in=centre_ids)
        return base.none()

    def perform_create(self, serializer):
        """
        Crée un rapport en positionnant created_by sur l'utilisateur
        courant et journalise l'action.
        """
        instance = serializer.save(created_by=self.request.user)
        generated = RapportDataBuilderService.build_for_rapport(instance)
        if generated:
            instance.donnees = {**(instance.donnees or {}), **generated}
            instance.save(update_fields=["donnees"])
        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_CREATE,
            user=self.request.user,
            details="Création d’un rapport",
        )

    def perform_update(self, serializer):
        """
        Met à jour un rapport en positionnant updated_by sur
        l'utilisateur courant et journalise l'action.
        """
        instance = serializer.save(updated_by=self.request.user)
        generated = RapportDataBuilderService.build_for_rapport(instance)
        if generated:
            instance.donnees = {**(instance.donnees or {}), **generated}
            instance.save(update_fields=["donnees"])
        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_UPDATE,
            user=self.request.user,
            details="Modification d’un rapport",
        )

    def destroy(self, request, *args, **kwargs):
        """
        Effectue une suppression logique du rapport (`is_active = False`),
        journalise l'action puis renvoie une réponse JSON de succès
        cohérente avec un statut HTTP `200`.
        """
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        LogUtilisateur.log_action(
            instance=instance,
            action=LogUtilisateur.ACTION_DELETE,
            user=request.user,
            details="Archivage logique du rapport",
        )
        return Response(
            {"success": True, "message": "Rapport archivé avec succès.", "data": None},
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        """
        Crée un rapport après validation et renvoie un payload JSON basé sur
        `instance.to_serializable_dict()`.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {
                "success": True,
                "message": "Rapport créé avec succès.",
                "data": serializer.instance.to_serializable_dict(),
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        """
        Met à jour un rapport via `PUT` ou `PATCH` et renvoie une réponse JSON
        basée sur l'état sérialisable du modèle.
        """
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(
            {
                "success": True,
                "message": "Rapport mis à jour avec succès.",
                "data": serializer.instance.to_serializable_dict(),
            }
        )

    def retrieve(self, request, *args, **kwargs):
        """
        Retourne le détail d'un rapport dans l'enveloppe JSON standard du
        viewset.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(
            {
                "success": True,
                "message": "Rapport récupéré avec succès.",
                "data": serializer.instance.to_serializable_dict(),
            }
        )

    def list(self, request, *args, **kwargs):
        """
        Retourne la liste paginée des rapports actifs visibles pour
        l'utilisateur courant.

        Si une page est présente, le format de sortie est celui de
        `RapAppPagination`. Sinon, la réponse est enveloppée manuellement.
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # DRF gère ici la structure de la pagination (voir RapAppPagination).
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {"success": True, "message": "Liste des rapports récupérée avec succès.", "data": serializer.data}
        )

    @action(detail=True, methods=["get"], url_path="export")
    def export(self, request, pk=None):
        """
        Exporte un rapport individuel selon son format courant ou le query param
        `format` (`pdf`, `excel`/`xlsx`, `csv`, `html`).
        """
        instance = self.get_object()
        fmt = self._report_export_format(request, instance)
        if fmt == Rapport.FORMAT_PDF:
            return self._export_report_pdf(instance)
        if fmt == Rapport.FORMAT_EXCEL:
            return self._export_report_excel(instance)
        if fmt == Rapport.FORMAT_CSV:
            return self._export_report_csv(instance)
        return self._export_report_html(instance)

    @action(detail=False, methods=["get"], url_path="export-xlsx")
    def export_xlsx(self, request):
        """
        Exporte la liste filtrée des rapports en XLSX.
        """
        queryset = self.filter_queryset(self.get_queryset())
        wb = Workbook()
        ws = wb.active
        ws.title = "Rapports"
        ws.append(
            [
                "ID",
                "Nom",
                "Type",
                "Période",
                "Date début",
                "Date fin",
                "Format",
                "Centre",
                "Type offre",
                "Statut",
                "Formation",
                "Créé le",
            ]
        )
        for rapport in queryset:
            ws.append(
                [
                    rapport.pk,
                    rapport.nom,
                    rapport.get_type_rapport_display(),
                    rapport.get_periode_display(),
                    str(rapport.date_debut),
                    str(rapport.date_fin),
                    rapport.get_format_display(),
                    rapport.centre.nom if rapport.centre else "",
                    rapport.type_offre.nom if rapport.type_offre else "",
                    rapport.statut.nom if rapport.statut else "",
                    rapport.formation.nom if rapport.formation else "",
                    rapport.created_at.strftime("%Y-%m-%d %H:%M") if rapport.created_at else "",
                ]
            )
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = 'attachment; filename="rapports.xlsx"'
        return response


from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class RapportChoicesView(APIView):
    """
    Expose les choix front pour `type_rapport`, `periode` et `format`.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Liste des choix possibles pour les rapports",
        description="Retourne les choix disponibles pour les types de rapports, périodicité et formats.",
        responses={200: OpenApiResponse(response=RapportChoiceGroupSerializer)},
        tags=["Rapports"],
    )
    def get(self, request):
        """
        Retourne les choix disponibles pour la création ou le filtrage des
        rapports, dans l'enveloppe API standard.
        """

        def serialize_choices(choices):
            return [{"value": k, "label": v} for k, v in choices]

        centre_ids = None if is_admin_like(request.user) else get_staff_centre_ids_cached(request)
        centres_qs = Centre.objects.all().order_by("nom")
        type_offres_qs = TypeOffre.objects.all().order_by("nom")
        statuts_qs = Statut.objects.all().order_by("nom")
        formations_qs = Formation.objects.select_related("centre").order_by("nom")
        if centre_ids is not None:
            centres_qs = centres_qs.filter(id__in=centre_ids)
            formations_qs = formations_qs.filter(centre_id__in=centre_ids)

        return Response(
            {
                "success": True,
                "message": "Choix des rapports récupérés avec succès.",
                "data": {
                    "type_rapport": serialize_choices(Rapport.TYPE_CHOICES),
                    "periode": serialize_choices(Rapport.PERIODE_CHOICES),
                    "format": serialize_choices(Rapport.FORMAT_CHOICES),
                    "parcours_phase": serialize_choices(Candidat.ParcoursPhase.choices),
                    "centres": [{"value": c.id, "label": c.nom} for c in centres_qs],
                    "type_offres": [{"value": t.id, "label": t.nom} for t in type_offres_qs],
                    "statuts": [{"value": s.id, "label": s.nom} for s in statuts_qs],
                    "formations": [{"value": f.id, "label": f.nom} for f in formations_qs],
                    "reporting_contract": {
                        "legacy_candidate_status_field": "statut",
                        "recommended_candidate_phase_field": "parcours_phase",
                        "derived_candidate_phase_field": "parcours_phase_calculee",
                        "legacy_status_supported": True,
                        "legacy_status_deprecated": True,
                        "legacy_status_removal_stage": "post_front_migration",
                        "phase_compatible_report_types": sorted(Rapport.PHASE_COMPATIBLE_REPORT_TYPES),
                    },
                },
            },
            status=status.HTTP_200_OK,
        )
