"""
Endpoints ``/api/import-export/<resource>/…`` — §2.15.

Surface HTTP pour l’import/export Excel **Lots 1–4** (référentiels, partenaires, formations, documents, candidats, CVThèque métadonnées) ; pas d’actions Excel sur les ViewSets CRUD concernés.
"""

from __future__ import annotations

import logging
from io import BytesIO

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import FileResponse
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from rap_app.models.import_job import ImportJob
from rap_app.services.imports.import_job_recorder import record_excel_import_job
from rap_app.api.serializers.base_serializers import EmptySerializer

from .scope import RESOURCE_TO_HANDLER_CLASS, get_delegate_viewset, get_lot1_export_queryset, resolve_resource

logger = logging.getLogger("application.api.import_export")

_OPENAPI_TAG = "Import-export Excel"


def _check_lot1_permissions(resource: str, request, *, action_name: str) -> None:
    view = get_delegate_viewset(resource, request, action_name=action_name)
    view.check_permissions(request)


class Lot1ImportExportViewSet(ViewSet):
    """``import-template`` | ``export-xlsx`` | ``import-xlsx`` pour une ressource import Excel (Lots 1–4)."""

    serializer_class = EmptySerializer
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        summary="Télécharger le modèle Excel (import-export)",
        description=(
            "Modèle Lot 1 (feuilles Données, Meta, Aide). Préfixe canonique : ``/api/import-export/``. "
            "Les colonnes sont figées par ressource (voir plan REFACTOR_IMPORT_EXPORT §2.5)."
        ),
        tags=[_OPENAPI_TAG],
    )
    def import_template(self, request, resource=None):
        res = resolve_resource(resource or "")
        if res is None:
            raise NotFound("Ressource d’import inconnue.")
        _check_lot1_permissions(res, request, action_name="import_template")
        handler_cls = RESOURCE_TO_HANDLER_CLASS[res]
        content = handler_cls().build_template_bytes()
        logger.info(
            "import_export_template",
            extra={
                "url_resource": resource,
                "resource": res,
                "user_id": getattr(request.user, "pk", None),
            },
        )
        filename = f"{resource}_import_template.xlsx"
        return FileResponse(
            BytesIO(content),
            as_attachment=True,
            filename=filename,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    @extend_schema(
        summary="Exporter en Excel (import-export)",
        description="Export sur le même queryset que la liste REST pour les mêmes paramètres de requête.",
        tags=[_OPENAPI_TAG],
    )
    def export_xlsx(self, request, resource=None):
        res = resolve_resource(resource or "")
        if res is None:
            raise NotFound("Ressource d’import inconnue.")
        _check_lot1_permissions(res, request, action_name="export_xlsx")
        handler_cls = RESOURCE_TO_HANDLER_CLASS[res]
        qs = get_lot1_export_queryset(res, request)
        row_count = qs.count()
        logger.info(
            "import_export_export_xlsx",
            extra={
                "url_resource": resource,
                "resource": res,
                "user_id": getattr(request.user, "pk", None),
                "export_row_count": row_count,
            },
        )
        content = handler_cls().export_queryset_to_bytes(qs)
        filename = f"{resource}_export.xlsx"
        return FileResponse(
            BytesIO(content),
            as_attachment=True,
            filename=filename,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    @extend_schema(
        summary="Importer depuis Excel (import-export)",
        description=(
            "Multipart : champ ``file`` (``.xlsx``). Query ``dry_run=true`` : aucune écriture en base ; "
            "la réponse garde la même forme §2.8.1 et les compteurs ``summary`` reflètent le résultat **simulé** "
            "(créations / mises à jour qui seraient effectuées sans ``dry_run``)."
        ),
        parameters=[
            OpenApiParameter(
                "dry_run",
                bool,
                description="Si vrai, aucune persistance ; ``summary`` = simulation (§2.8.3).",
                required=False,
            ),
        ],
        tags=[_OPENAPI_TAG],
    )
    def import_xlsx(self, request, resource=None):
        res = resolve_resource(resource or "")
        if res is None:
            raise NotFound("Ressource d’import inconnue.")
        _check_lot1_permissions(res, request, action_name="import_xlsx")
        dry_run = str(request.query_params.get("dry_run", "")).lower() in ("1", "true", "yes", "on")
        upload = request.FILES.get("file")
        if not upload:
            logger.warning(
                "import_export_import_xlsx_missing_file",
                extra={
                    "url_resource": resource,
                    "resource": res,
                    "user_id": getattr(request.user, "pk", None),
                    "dry_run": dry_run,
                },
            )
            record_excel_import_job(
                user=request.user,
                resource=res,
                url_resource=resource or "",
                dry_run=dry_run,
                status=ImportJob.Status.ERROR,
                http_status=status.HTTP_400_BAD_REQUEST,
                error_payload={"detail": "Fichier manquant (champ 'file')."},
            )
            return Response(
                {"detail": "Fichier manquant (champ 'file')."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        handler_cls = RESOURCE_TO_HANDLER_CLASS[res]
        handler = handler_cls()
        try:
            payload = handler.import_upload(request.user, upload, dry_run=dry_run, request=request)
        except DjangoValidationError as exc:
            err = getattr(exc, "message_dict", None) or {"detail": getattr(exc, "messages", [str(exc)])}
            logger.warning(
                "import_export_import_xlsx_validation_error",
                extra={
                    "url_resource": resource,
                    "resource": res,
                    "user_id": getattr(request.user, "pk", None),
                    "dry_run": dry_run,
                },
            )
            record_excel_import_job(
                user=request.user,
                resource=res,
                url_resource=resource or "",
                dry_run=dry_run,
                status=ImportJob.Status.ERROR,
                http_status=status.HTTP_400_BAD_REQUEST,
                original_filename=getattr(upload, "name", "") or "",
                error_payload=err if isinstance(err, dict) else {"detail": err},
            )
            return Response(err, status=status.HTTP_400_BAD_REQUEST)
        summary = payload.get("summary") if isinstance(payload, dict) else None
        logger.info(
            "import_export_import_xlsx_ok",
            extra={
                "url_resource": resource,
                "resource": res,
                "user_id": getattr(request.user, "pk", None),
                "dry_run": dry_run,
                "summary": summary,
            },
        )
        record_excel_import_job(
            user=request.user,
            resource=res,
            url_resource=resource or "",
            dry_run=dry_run,
            status=ImportJob.Status.SUCCESS,
            http_status=status.HTTP_200_OK,
            original_filename=getattr(upload, "name", "") or "",
            summary=summary,
        )
        return Response(payload, status=status.HTTP_200_OK)
