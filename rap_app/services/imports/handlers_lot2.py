"""
Gestionnaires Excel Lot 2 — ``Partenaire``.

Même contrat que le Lot 1 : template / export / import, ``atomic=file`` §2.6,
réponse §2.8.1. Permissions alignées sur ``PartenaireAccessPermission``.
"""

from __future__ import annotations

import datetime
from typing import Any

from django.db import transaction
from rest_framework.serializers import ValidationError as DRFValidationError

from rap_app.api.roles import is_admin_like, staff_centre_ids
from rap_app.api.serializers.partenaires_serializers import PartenaireSerializer
from rap_app.api.viewsets.partenaires_viewsets import PartenaireAccessPermission, PartenaireViewSet
from rap_app.models.partenaires import Partenaire

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
    ERR_OUT_OF_SCOPE,
    ERR_REQUIRED,
    PARTENAIRE_COLUMNS,
    RESOURCE_PARTENAIRE,
    SCHEMA_VERSION_LOT1,
)
from .validation import validate_xlsx_uploaded_file


def _norm_effectif(val: Any) -> int | None:
    if val is None or val == "":
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


def _partenaire_permission_error(user, request, *, is_create: bool, instance: Partenaire | None) -> str | None:
    view = PartenaireViewSet()
    view.request = request
    view.action = "create" if is_create else "update"
    view.format_kwarg = None
    view.kwargs = {}
    perm = PartenaireAccessPermission()
    if not perm.has_permission(request, view):
        return "Permission refusée pour l’import."
    if not is_create and instance is not None:
        if not perm.has_object_permission(request, view, instance):
            return "Ce partenaire est hors de votre périmètre."
    return None


def _default_centre_scope_error(user, default_centre_id: int | None) -> str | None:
    if is_admin_like(user):
        return None
    allowed = staff_centre_ids(user)
    if allowed is None:
        return None
    if default_centre_id is None:
        return None
    if default_centre_id not in set(allowed):
        return "Le centre par défaut est hors de votre périmètre."
    return None


class PartenaireExcelHandler:
    """Export / import Excel pour ``Partenaire`` (Lot 2)."""

    resource: str = RESOURCE_PARTENAIRE

    def build_template_bytes(self) -> bytes:
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=list(PARTENAIRE_COLUMNS),
            rows=[],
        )

    def export_queryset_to_bytes(self, queryset) -> bytes:
        rows: list[list[Any]] = []
        for p in queryset.order_by("id"):
            row: list[Any] = []
            for col in PARTENAIRE_COLUMNS:
                if col == "id":
                    row.append(p.id)
                elif col == "default_centre_id":
                    row.append(p.default_centre_id)
                elif col == "assurance_chomage_speciale":
                    row.append(bool(p.assurance_chomage_speciale))
                elif col in ("maitre1_date_naissance", "maitre2_date_naissance"):
                    d = getattr(p, col, None)
                    row.append(d.isoformat() if d else None)
                else:
                    row.append(getattr(p, col, None))
            rows.append(row)
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=list(PARTENAIRE_COLUMNS),
            rows=rows,
        )

    def import_upload(self, user, uploaded_file, *, dry_run: bool, request) -> dict[str, Any]:
        validate_xlsx_uploaded_file(uploaded_file)
        meta, _headers, data_rows = read_lot1_workbook(
            uploaded_file, expected_columns=set(PARTENAIRE_COLUMNS)
        )
        assert_meta_matches(meta, expected_resource=self.resource)

        summary = {"created": 0, "updated": 0, "skipped": 0, "failed": 0}
        rows_out: list[dict[str, Any]] = []
        pending: list[tuple[str, int, Any, Partenaire | None]] = []

        for raw in data_rows:
            rn = int(raw.pop("_excel_row_number", 0))
            pk = _norm_id(raw.get("id"))
            payload = self._raw_to_payload(raw)
            nom = payload.get("nom")
            if isinstance(nom, str):
                nom = nom.strip()
                payload["nom"] = nom

            instance = None
            is_create = False
            if pk:
                instance = Partenaire.objects.filter(pk=pk).first()
                if instance is None:
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": pk,
                            "action": "error",
                            "errors": [_row_err("id", ERR_NOT_FOUND, f"Aucun partenaire avec l'id {pk}.")],
                        }
                    )
                    continue
            elif nom:
                instance = Partenaire.objects.filter(nom__iexact=nom).first()
                if instance:
                    pk = instance.pk
                else:
                    is_create = True
            else:
                summary["failed"] += 1
                rows_out.append(
                    {
                        "row_number": rn,
                        "id": None,
                        "action": "error",
                        "errors": [_row_err("nom", ERR_REQUIRED, "Le nom ou l'id est requis.")],
                    }
                )
                continue

            perm_err = _partenaire_permission_error(
                user, request, is_create=is_create, instance=instance
            )
            if perm_err:
                summary["failed"] += 1
                rows_out.append(
                    {
                        "row_number": rn,
                        "id": pk,
                        "action": "error",
                        "errors": [_row_err("id", ERR_OUT_OF_SCOPE, perm_err)],
                    }
                )
                continue

            dcid = _norm_id(payload.get("default_centre_id"))
            scope_centre_err = _default_centre_scope_error(user, dcid)
            if scope_centre_err:
                summary["failed"] += 1
                rows_out.append(
                    {
                        "row_number": rn,
                        "id": pk,
                        "action": "error",
                        "errors": [_row_err("default_centre_id", ERR_OUT_OF_SCOPE, scope_centre_err)],
                    }
                )
                continue

            try:
                if is_create:
                    ser = PartenaireSerializer(data=payload)
                    ser.is_valid(raise_exception=True)
                    if dry_run:
                        summary["created"] += 1
                        rows_out.append({"row_number": rn, "id": None, "action": "create", "errors": []})
                    else:
                        pending.append(("create", len(rows_out), ser, None))
                        rows_out.append({"row_number": rn, "id": None, "action": "create", "errors": []})
                else:
                    assert instance is not None
                    ser = PartenaireSerializer(instance, data=payload)
                    ser.is_valid(raise_exception=True)
                    if dry_run:
                        summary["updated"] += 1
                        rows_out.append(
                            {"row_number": rn, "id": instance.pk, "action": "update", "errors": []}
                        )
                    else:
                        pending.append(("update", len(rows_out), ser, instance))
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
            for kind, idx, ser, inst in pending:
                if kind == "create":
                    assert inst is None
                    obj = Partenaire(**ser.validated_data)
                    obj.save(user=user)
                    rows_out[idx]["id"] = obj.pk
                else:
                    assert inst is not None
                    for attr, val in ser.validated_data.items():
                        setattr(inst, attr, val)
                    inst.save(user=user)
                    rows_out[idx]["id"] = inst.pk

        summary["created"] = sum(1 for k, *_ in pending if k == "create")
        summary["updated"] = sum(1 for k, *_ in pending if k == "update")
        return _build_import_payload(dry_run=dry_run, resource=self.resource, summary=summary, rows_out=rows_out)

    def _raw_to_payload(self, raw: dict[str, Any]) -> dict[str, Any]:
        d: dict[str, Any] = {}
        for key in PARTENAIRE_COLUMNS:
            if key == "id":
                continue
            v = raw.get(key)
            if key == "default_centre_id":
                d[key] = _norm_id(v)
                continue
            if key == "effectif_total":
                d[key] = _norm_effectif(v)
                continue
            if key == "assurance_chomage_speciale":
                d[key] = cell_to_python(v, as_bool=True)
                continue
            if key in ("maitre1_date_naissance", "maitre2_date_naissance"):
                d[key] = _norm_date(v)
                continue
            if key == "nom" and v is not None:
                d[key] = str(v).strip()
                continue
            if isinstance(v, str):
                s = v.strip()
                d[key] = s if s else None
            elif v is None or v == "":
                d[key] = None
            else:
                d[key] = v
        return d
