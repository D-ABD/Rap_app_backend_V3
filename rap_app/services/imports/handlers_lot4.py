"""
Gestionnaires Excel Lot 4 — ``Candidat`` (import/export) et ``CVTheque`` (export + import refusé §2.10.1).

Colonnes candidat : champs écritables de ``CandidatCreateUpdateSerializer`` + ``id`` (ordre modèle).
"""

from __future__ import annotations

import datetime
from typing import Any

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models, transaction
from rest_framework.serializers import ValidationError as DRFValidationError

from rap_app.api.roles import is_admin_like, staff_centre_ids
from rap_app.api.serializers.candidat_serializers import CandidatCreateUpdateSerializer
from rap_app.api.viewsets.candidat_viewsets import CandidatViewSet
from rap_app.models.candidat import Candidat
from rap_app.models.cvtheque import CVTheque
from rap_app.models.formations import Formation

from .excel_io import assert_meta_matches, cell_to_python, read_lot1_workbook, write_lot1_workbook
from .handlers_lot1 import (
    _build_import_payload,
    _drf_errors_to_row,
    _norm_id,
    _norm_optional_str,
    _row_err,
)
from .schemas import (
    ERR_NOT_FOUND,
    ERR_NOT_SUPPORTED,
    ERR_OUT_OF_SCOPE,
    ERR_REQUIRED,
    CVTHEQUE_COLUMNS,
    RESOURCE_CANDIDAT,
    RESOURCE_CVTHEQUE,
    SCHEMA_VERSION_LOT1,
)
from .validation import validate_xlsx_uploaded_file

_CANDIDAT_EXCEL_COLUMNS_CACHE: list[str] | None = None


def get_candidat_excel_columns() -> list[str]:
    """En-têtes feuille Données : ``id`` puis champs modèle écritables via le serializer."""
    global _CANDIDAT_EXCEL_COLUMNS_CACHE
    if _CANDIDAT_EXCEL_COLUMNS_CACHE is not None:
        return _CANDIDAT_EXCEL_COLUMNS_CACHE
    ser = CandidatCreateUpdateSerializer()
    cols = ["id"]
    for f in Candidat._meta.concrete_fields:
        if f.name == "id":
            continue
        fld = ser.fields.get(f.name)
        if fld is None or fld.read_only:
            continue
        cols.append(f.name)
    _CANDIDAT_EXCEL_COLUMNS_CACHE = cols
    return cols


def _norm_date(val: Any) -> datetime.date | None:
    if val is None or val == "":
        return None
    if isinstance(val, datetime.datetime):
        return val.date()
    if isinstance(val, datetime.date):
        return val
    s = _norm_optional_str(val)
    if s is None:
        return None
    try:
        return datetime.date.fromisoformat(s[:10])
    except ValueError:
        return None


def _norm_datetime(val: Any) -> datetime.datetime | None:
    if val is None or val == "":
        return None
    if isinstance(val, datetime.datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=datetime.timezone.utc)
        return val
    if isinstance(val, datetime.date):
        return datetime.datetime.combine(val, datetime.time.min, tzinfo=datetime.timezone.utc)
    s = _norm_optional_str(val)
    if s is None:
        return None
    try:
        if len(s) == 10 and s[4] == "-":
            d = datetime.date.fromisoformat(s)
            return datetime.datetime.combine(d, datetime.time.min, tzinfo=datetime.timezone.utc)
        dt = datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt
    except ValueError:
        return None


def _norm_small_int(val: Any) -> int | None:
    if val is None or val == "":
        return None
    if isinstance(val, bool):
        return None
    if isinstance(val, float) and val.is_integer():
        val = int(val)
    if isinstance(val, int):
        return val if val >= 0 else None
    try:
        i = int(val)
        return i if i >= 0 else None
    except (TypeError, ValueError):
        return None


def _coerce_candidat_cell(field_name: str, raw: Any) -> Any:
    if raw is None:
        return None
    if isinstance(raw, str) and raw.strip() == "":
        return None
    try:
        f = Candidat._meta.get_field(field_name)
    except Exception:
        return raw

    if isinstance(f, (models.ForeignKey, models.OneToOneField)):
        return _norm_id(raw)
    if isinstance(f, models.BooleanField):
        return cell_to_python(raw, as_bool=True)
    if isinstance(
        f,
        (
            models.IntegerField,
            models.PositiveIntegerField,
            models.PositiveSmallIntegerField,
            models.SmallIntegerField,
            models.BigIntegerField,
        ),
    ):
        return _norm_small_int(raw)
    if isinstance(f, models.DateField):
        return _norm_date(raw)
    if isinstance(f, models.DateTimeField):
        return _norm_datetime(raw)
    if isinstance(f, (models.CharField, models.TextField, models.EmailField)):
        s = _norm_optional_str(raw)
        return s
    return raw


def _formation_centre_out_of_scope(user, formation_id: int | None) -> str | None:
    if formation_id is None or is_admin_like(user):
        return None
    allowed = staff_centre_ids(user)
    if allowed is None:
        return None
    form = Formation.objects.filter(pk=formation_id).only("centre_id").first()
    if form is None:
        return None
    cid = form.centre_id
    if cid is None:
        return "La formation n’a pas de centre : impossible de vérifier le périmètre."
    if cid not in set(allowed):
        return "La formation est hors de votre périmètre centre."
    return None


def _get_scoped_candidat_queryset(request):
    view = CandidatViewSet()
    view.request = request
    view.action = "list"
    view.format_kwarg = None
    view.kwargs = {}
    return view.filter_queryset(view.get_queryset())


class CandidatExcelHandler:
    """Template / export / import pour ``Candidat`` (Lot 4), ``atomic=file`` §2.6."""

    resource: str = RESOURCE_CANDIDAT

    @property
    def columns(self) -> list[str]:
        return get_candidat_excel_columns()

    def build_template_bytes(self) -> bytes:
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=list(self.columns),
            rows=[],
        )

    def export_queryset_to_bytes(self, queryset) -> bytes:
        cols = self.columns
        rows: list[list[Any]] = []
        for obj in queryset.order_by("id"):
            row: list[Any] = []
            for col in cols:
                if col == "id":
                    row.append(obj.pk)
                    continue
                f = Candidat._meta.get_field(col)
                if f.is_relation:
                    row.append(getattr(obj, f.attname))
                else:
                    row.append(getattr(obj, col))
            rows.append(row)
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=list(cols),
            rows=rows,
        )

    def import_upload(self, user, uploaded_file, *, dry_run: bool, request) -> dict[str, Any]:
        validate_xlsx_uploaded_file(uploaded_file)
        cols = self.columns
        meta, _headers, data_rows = read_lot1_workbook(uploaded_file, expected_columns=set(cols))
        assert_meta_matches(meta, expected_resource=self.resource)

        summary = {"created": 0, "updated": 0, "skipped": 0, "failed": 0}
        rows_out: list[dict[str, Any]] = []
        pending: list[tuple[int, CandidatCreateUpdateSerializer, str]] = []

        scoped_qs = _get_scoped_candidat_queryset(request)

        for raw in data_rows:
            rn = int(raw.pop("_excel_row_number", 0))
            pk = _norm_id(raw.get("id"))
            payload: dict[str, Any] = {}
            for col in cols:
                if col == "id":
                    continue
                payload[col] = _coerce_candidat_cell(col, raw.get(col))

            instance = None
            is_create = False
            if pk:
                instance = Candidat.objects.filter(pk=pk).first()
                if instance is None:
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": pk,
                            "action": "error",
                            "errors": [_row_err("id", ERR_NOT_FOUND, f"Aucun candidat avec l'id {pk}.")],
                        }
                    )
                    continue
                if not scoped_qs.filter(pk=instance.pk).exists():
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": pk,
                            "action": "error",
                            "errors": [
                                _row_err(
                                    "id",
                                    ERR_OUT_OF_SCOPE,
                                    "Ce candidat est hors de votre périmètre.",
                                )
                            ],
                        }
                    )
                    continue
            else:
                is_create = True

            fid = payload.get("formation")
            if fid is None and instance is not None:
                fid = instance.formation_id
            scope_err = _formation_centre_out_of_scope(user, fid)
            if scope_err:
                summary["failed"] += 1
                rows_out.append(
                    {
                        "row_number": rn,
                        "id": pk or (instance.pk if instance else None),
                        "action": "error",
                        "errors": [_row_err("formation", ERR_OUT_OF_SCOPE, scope_err)],
                    }
                )
                continue

            if is_create:
                if not _can_staff_create_candidat_without_formation(user, fid):
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": None,
                            "action": "error",
                            "errors": [
                                _row_err(
                                    "formation",
                                    ERR_REQUIRED,
                                    "Le champ formation est obligatoire pour la création (périmètre centre).",
                                )
                            ],
                        }
                    )
                    continue
                if not payload.get("rgpd_legal_basis"):
                    payload["rgpd_legal_basis"] = Candidat.RgpdLegalBasis.INTERET_LEGITIME

            try:
                if is_create:
                    ser = CandidatCreateUpdateSerializer(data=payload, context={"request": request})
                    ser.is_valid(raise_exception=True)
                    if dry_run:
                        summary["created"] += 1
                        rows_out.append({"row_number": rn, "id": None, "action": "create", "errors": []})
                    else:
                        pending.append((len(rows_out), ser, "create"))
                        rows_out.append({"row_number": rn, "id": None, "action": "create", "errors": []})
                else:
                    assert instance is not None
                    ser = CandidatCreateUpdateSerializer(
                        instance, data=payload, partial=True, context={"request": request}
                    )
                    ser.is_valid(raise_exception=True)
                    if dry_run:
                        summary["updated"] += 1
                        rows_out.append(
                            {"row_number": rn, "id": instance.pk, "action": "update", "errors": []}
                        )
                    else:
                        pending.append((len(rows_out), ser, "update"))
                        rows_out.append(
                            {"row_number": rn, "id": instance.pk, "action": "update", "errors": []}
                        )
            except DRFValidationError as exc:
                summary["failed"] += 1
                rows_out.append(
                    {
                        "row_number": rn,
                        "id": pk or (instance.pk if instance else None),
                        "action": "error",
                        "errors": _drf_errors_to_row(exc),
                    }
                )

        if dry_run:
            return _build_import_payload(dry_run=dry_run, resource=self.resource, summary=summary, rows_out=rows_out)

        if summary["failed"] > 0:
            summary["created"] = 0
            summary["updated"] = 0
            return _build_import_payload(dry_run=dry_run, resource=self.resource, summary=summary, rows_out=rows_out)

        with transaction.atomic():
            for idx, ser, kind in pending:
                obj = ser.save()
                rows_out[idx]["id"] = obj.pk

        summary["created"] = sum(1 for _, _, k in pending if k == "create")
        summary["updated"] = sum(1 for _, _, k in pending if k == "update")
        return _build_import_payload(dry_run=dry_run, resource=self.resource, summary=summary, rows_out=rows_out)


def _can_staff_create_candidat_without_formation(user, formation_id: int | None) -> bool:
    if is_admin_like(user):
        return True
    return formation_id is not None


class CVThequeExcelHandler:
    """Export métadonnées + template ; import refusé (§2.10.1)."""

    resource: str = RESOURCE_CVTHEQUE

    def build_template_bytes(self) -> bytes:
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=list(CVTHEQUE_COLUMNS),
            rows=[],
        )

    def export_queryset_to_bytes(self, queryset) -> bytes:
        rows: list[list[Any]] = []
        for cv in queryset.select_related("candidat").order_by("id"):
            path = cv.fichier.name if cv.fichier else None
            dep = cv.date_depot
            dep_val = dep.isoformat() if dep else None
            row = [
                cv.id,
                cv.candidat_id,
                cv.document_type,
                cv.titre,
                path,
                cv.est_public,
                cv.mots_cles or None,
                cv.consentement_stockage_cv,
                cv.consentement_transmission_cv,
                dep_val,
                cv.is_active,
            ]
            rows.append(row)
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=list(CVTHEQUE_COLUMNS),
            rows=rows,
        )

    def import_upload(self, user, uploaded_file, *, dry_run: bool, request=None) -> dict[str, Any]:
        validate_xlsx_uploaded_file(uploaded_file)
        raise DjangoValidationError(
            {
                "detail": "Import Excel CVThèque non disponible sans pipeline fichier ; utilisez l’API cvtheque.",
                "code": ERR_NOT_SUPPORTED,
            }
        )
