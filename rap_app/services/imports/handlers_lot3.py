"""
Gestionnaires Excel Lot 3 — ``Formation`` (import/export) et ``Document`` (export + import refusé §2.10.1).
"""

from __future__ import annotations

import datetime
from typing import Any

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.exceptions import PermissionDenied
from rest_framework.serializers import ValidationError as DRFValidationError

from rap_app.api.roles import can_write_formations, is_admin_like, staff_centre_ids
from rap_app.api.serializers.formations_serializers import FormationCreateSerializer, FormationUpdateSerializer
from rap_app.api.viewsets.formations_viewsets import FormationViewSet
from rap_app.models.centres import Centre
from rap_app.models.documents import Document
from rap_app.models.formations import Activite, Formation
from rap_app.models.partenaires import Partenaire
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre

from .excel_io import (
    assert_meta_matches,
    cell_to_python,
    read_formation_import_workbook,
    write_lot1_workbook,
)
from .handlers_lot1 import (
    _build_import_payload,
    _drf_errors_to_row,
    _norm_id,
    _norm_optional_str,
    _row_err,
)
from .schemas import (
    ERR_INVALID,
    ERR_NOT_FOUND,
    ERR_NOT_SUPPORTED,
    ERR_OUT_OF_SCOPE,
    ERR_REQUIRED,
    DOCUMENT_COLUMNS,
    FORMATION_COLUMNS,
    RESOURCE_DOCUMENT,
    RESOURCE_FORMATION,
    SCHEMA_VERSION_LOT1,
    canonical_formation_column_name,
)
from .validation import validate_xlsx_uploaded_file


def _norm_uint(val: Any) -> int | None:
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
        pass
    # JJ/MM/AAAA (export Excel FR)
    t = s.strip().replace(".", "/")
    if "/" in t:
        parts = [p.strip() for p in t.split("/") if p.strip()]
        if len(parts) == 3:
            try:
                d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
                if y < 100:
                    y += 2000
                return datetime.date(y, m, d)
            except ValueError:
                return None
    return None


def _resolve_centre_id_from_cell(val: Any) -> int | None:
    """Entier (PK) ou libellé exact / match unique partiel sur ``Centre.nom``."""
    nid = _norm_id(val)
    if nid is not None:
        return nid
    s = _norm_optional_str(val)
    if not s:
        return None
    c = Centre.objects.filter(nom__iexact=s).first()
    if c:
        return c.pk
    qs = Centre.objects.filter(nom__icontains=s)
    if qs.count() == 1:
        return qs.first().pk
    return None


def _resolve_type_offre_id_from_cell(val: Any) -> int | None:
    """PK ou slug ``TypeOffre.nom`` (ex. ``poei``, ``crif``)."""
    nid = _norm_id(val)
    if nid is not None:
        return nid
    s = _norm_optional_str(val)
    if not s:
        return None
    sl = s.strip().lower()
    to = TypeOffre.objects.filter(nom__iexact=sl).first()
    return to.pk if to else None


def _resolve_statut_id_from_cell(val: Any) -> int | None:
    """PK ou slug ``Statut.nom`` (ex. ``a_recruter``)."""
    nid = _norm_id(val)
    if nid is not None:
        return nid
    s = _norm_optional_str(val)
    if not s:
        return None
    sl = s.strip().lower()
    st = Statut.objects.filter(nom__iexact=sl).first()
    return st.pk if st else None


def _formation_import_meta_defaults(meta: dict[str, Any]) -> dict[str, Any]:
    """Permet d’importer un export sans feuille Meta (schéma Lot 1 + resource)."""
    m = dict(meta)
    if m.get("schema_version") is None:
        m["schema_version"] = SCHEMA_VERSION_LOT1
    if m.get("resource") is None:
        m["resource"] = RESOURCE_FORMATION
    return m


def _canonicalize_formation_data_rows(data_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Projette les en-têtes (snake_case ou export FR) vers les clés ``FORMATION_COLUMNS``."""
    out: list[dict[str, Any]] = []
    for raw in data_rows:
        rn = raw.get("_excel_row_number", 0)
        canon: dict[str, Any] = {"_excel_row_number": rn}
        for orig_key, val in raw.items():
            if orig_key == "_excel_row_number":
                continue
            cname = canonical_formation_column_name(str(orig_key))
            if cname is None:
                continue
            canon[cname] = val
        for col in FORMATION_COLUMNS:
            if col not in canon:
                canon[col] = None
        out.append(canon)
    return out


def _norm_activite(val: Any) -> str | None:
    s = _norm_optional_str(val)
    if s is None:
        return None
    sl = s.lower()
    if sl in ("active", Activite.ACTIVE):
        return Activite.ACTIVE
    if sl in ("archivee", "archivée", Activite.ARCHIVEE):
        return Activite.ARCHIVEE
    return None


def _parse_partenaire_ids(val: Any) -> list[int] | None:
    if val is None or val == "":
        return []
    if isinstance(val, (int, float)) and float(val).is_integer():
        return [int(val)]
    s = str(val).strip()
    if not s:
        return []
    out: list[int] = []
    for part in s.replace(";", ",").split(","):
        t = part.strip()
        if not t:
            continue
        try:
            out.append(int(t))
        except ValueError:
            return None
    return out


def _formation_write_denied_message(user) -> str | None:
    if can_write_formations(user):
        return None
    return "Écriture sur les formations non autorisée pour ce rôle."


def _centre_scope_error(user, centre_id: int | None) -> str | None:
    if is_admin_like(user):
        return None
    allowed = staff_centre_ids(user)
    if allowed is None:
        return None
    if centre_id is None:
        return None
    if centre_id not in set(allowed):
        return "Le centre est hors de votre périmètre."
    return None


def _get_scoped_formation_queryset(request):
    view = FormationViewSet()
    view.request = request
    view.action = "list"
    view.format_kwarg = None
    view.kwargs = {}
    return view.filter_queryset(view.get_queryset())


class FormationExcelHandler:
    """Template / export / import pour ``Formation`` (Lot 3), ``atomic=file`` §2.6."""

    resource: str = RESOURCE_FORMATION

    def build_template_bytes(self) -> bytes:
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=list(FORMATION_COLUMNS),
            rows=[],
        )

    def export_queryset_to_bytes(self, queryset) -> bytes:
        rows: list[list[Any]] = []
        qs = queryset.select_related("centre", "type_offre", "statut").prefetch_related("partenaires")
        for f in qs.order_by("id"):
            pids = ",".join(str(x) for x in f.partenaires.values_list("id", flat=True).order_by("id"))
            row: list[Any] = []
            for col in FORMATION_COLUMNS:
                if col == "id":
                    row.append(f.id)
                elif col == "activite":
                    row.append(f.activite)
                elif col == "centre_id":
                    row.append(f.centre_id)
                elif col == "type_offre_id":
                    row.append(f.type_offre_id)
                elif col == "statut_id":
                    row.append(f.statut_id)
                elif col in ("start_date", "end_date"):
                    d = getattr(f, col, None)
                    row.append(d.isoformat() if d else None)
                elif col == "convocation_envoie":
                    row.append(bool(f.convocation_envoie))
                elif col == "partenaire_ids":
                    row.append(pids if pids else None)
                else:
                    row.append(getattr(f, col, None))
            rows.append(row)
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=list(FORMATION_COLUMNS),
            rows=rows,
        )

    def import_upload(self, user, uploaded_file, *, dry_run: bool, request) -> dict[str, Any]:
        validate_xlsx_uploaded_file(uploaded_file)
        meta, _headers, data_rows = read_formation_import_workbook(uploaded_file)
        meta = _formation_import_meta_defaults(meta)
        assert_meta_matches(meta, expected_resource=self.resource)
        data_rows = _canonicalize_formation_data_rows(data_rows)

        msg = _formation_write_denied_message(user)
        if msg:
            raise PermissionDenied(msg)

        summary = {"created": 0, "updated": 0, "skipped": 0, "failed": 0}
        rows_out: list[dict[str, Any]] = []
        pending: list[
            tuple[int, FormationCreateSerializer | FormationUpdateSerializer, list[int], str | None]
        ] = []

        scoped_qs = _get_scoped_formation_queryset(request)

        for raw in data_rows:
            rn = int(raw.pop("_excel_row_number", 0))
            pk = _norm_id(raw.get("id"))
            pids = _parse_partenaire_ids(raw.get("partenaire_ids"))
            if pids is None:
                summary["failed"] += 1
                rows_out.append(
                    {
                        "row_number": rn,
                        "id": pk,
                        "action": "error",
                        "errors": [
                            _row_err(
                                "partenaire_ids",
                                ERR_INVALID,
                                "Liste d’identifiants partenaires invalide (entiers séparés par des virgules).",
                            )
                        ],
                    }
                )
                continue

            payload_fields = self._raw_to_serializer_payload(raw)

            instance = None
            is_create = False
            if pk:
                instance = Formation.objects.all_including_archived().filter(pk=pk).first()
                if instance is None:
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": pk,
                            "action": "error",
                            "errors": [_row_err("id", ERR_NOT_FOUND, f"Aucune formation avec l'id {pk}.")],
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
                                    "Cette formation est hors de votre périmètre.",
                                )
                            ],
                        }
                    )
                    continue
            else:
                nom = payload_fields.get("nom")
                if not (isinstance(nom, str) and nom.strip()):
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": None,
                            "action": "error",
                            "errors": [_row_err("nom", ERR_REQUIRED, "Le nom est requis sans id.")],
                        }
                    )
                    continue
                missing_fk = False
                for fk_field, label in (
                    ("centre_id", "centre_id"),
                    ("type_offre_id", "type_offre_id"),
                    ("statut_id", "statut_id"),
                ):
                    if not payload_fields.get(fk_field):
                        summary["failed"] += 1
                        rows_out.append(
                            {
                                "row_number": rn,
                                "id": None,
                                "action": "error",
                                "errors": [
                                    _row_err(
                                        fk_field,
                                        ERR_REQUIRED,
                                        f"{label} est obligatoire pour une création.",
                                    )
                                ],
                            }
                        )
                        missing_fk = True
                        break
                if missing_fk:
                    continue
                c_err = _centre_scope_error(user, _norm_id(payload_fields.get("centre_id")))
                if c_err:
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": None,
                            "action": "error",
                            "errors": [_row_err("centre_id", ERR_OUT_OF_SCOPE, c_err)],
                        }
                    )
                    continue
                is_create = True

            if instance is not None:
                c_err = _centre_scope_error(user, instance.centre_id)
                if c_err:
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": instance.pk,
                            "action": "error",
                            "errors": [_row_err("centre_id", ERR_OUT_OF_SCOPE, c_err)],
                        }
                    )
                    continue
                new_c = _norm_id(payload_fields.get("centre_id"))
                if new_c is not None:
                    c_err = _centre_scope_error(user, new_c)
                    if c_err:
                        summary["failed"] += 1
                        rows_out.append(
                            {
                                "row_number": rn,
                                "id": instance.pk,
                                "action": "error",
                                "errors": [_row_err("centre_id", ERR_OUT_OF_SCOPE, c_err)],
                            }
                        )
                        continue

            if pids:
                found = set(Partenaire.objects.filter(pk__in=pids).values_list("id", flat=True))
                if len(found) != len(set(pids)):
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": pk or (instance.pk if instance else None),
                            "action": "error",
                            "errors": [
                                _row_err(
                                    "partenaire_ids",
                                    ERR_NOT_FOUND,
                                    "Un ou plusieurs partenaires sont introuvables.",
                                )
                            ],
                        }
                    )
                    continue

            activite_val = _norm_activite(raw.get("activite"))

            try:
                if is_create:
                    ser = FormationCreateSerializer(data=payload_fields, context={"request": request})
                    ser.is_valid(raise_exception=True)
                    if dry_run:
                        summary["created"] += 1
                        rows_out.append({"row_number": rn, "id": None, "action": "create", "errors": []})
                    else:
                        pending.append((len(rows_out), ser, pids, activite_val))
                        rows_out.append({"row_number": rn, "id": None, "action": "create", "errors": []})
                else:
                    assert instance is not None
                    ser = FormationUpdateSerializer(
                        instance, data=payload_fields, partial=True, context={"request": request}
                    )
                    ser.is_valid(raise_exception=True)
                    if dry_run:
                        summary["updated"] += 1
                        rows_out.append(
                            {"row_number": rn, "id": instance.pk, "action": "update", "errors": []}
                        )
                    else:
                        pending.append((len(rows_out), ser, pids, activite_val))
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
            for idx, ser, partner_ids, act in pending:
                obj = ser.save()
                if act is not None:
                    obj.activite = act
                    obj.save(user=user)
                obj.partenaires.set(partner_ids)
                rows_out[idx]["id"] = obj.pk

        summary["created"] = sum(1 for _, ser, _, _ in pending if isinstance(ser, FormationCreateSerializer))
        summary["updated"] = sum(1 for _, ser, _, _ in pending if isinstance(ser, FormationUpdateSerializer))
        return _build_import_payload(dry_run=dry_run, resource=self.resource, summary=summary, rows_out=rows_out)

    def _raw_to_serializer_payload(self, raw: dict[str, Any]) -> dict[str, Any]:
        d: dict[str, Any] = {}
        for key in FORMATION_COLUMNS:
            if key in ("id", "activite", "partenaire_ids"):
                continue
            v = raw.get(key)
            if key == "centre_id":
                d[key] = _resolve_centre_id_from_cell(v)
                continue
            if key == "type_offre_id":
                d[key] = _resolve_type_offre_id_from_cell(v)
                continue
            if key == "statut_id":
                d[key] = _resolve_statut_id_from_cell(v)
                continue
            if key in ("start_date", "end_date"):
                d[key] = _norm_date(v)
                continue
            if key == "convocation_envoie":
                d[key] = cell_to_python(v, as_bool=True)
                continue
            if key == "nombre_candidats":
                continue
            if key == "cap":
                d[key] = _norm_uint(v)
                continue
            if key in (
                "prevus_crif",
                "prevus_mp",
                "inscrits_crif",
                "inscrits_mp",
                "entree_formation",
                "nombre_entretiens",
                "total_heures",
                "heures_enseignements_generaux",
                "heures_distanciel",
            ):
                u = _norm_uint(v)
                if u is None and (v is None or v == "" or (isinstance(v, str) and not str(v).strip())):
                    d[key] = 0
                else:
                    d[key] = u
                continue
            if isinstance(v, str):
                s = v.strip()
                d[key] = s if s else None
            elif v is None or v == "":
                d[key] = None
            else:
                d[key] = v
        return d


class DocumentExcelHandler:
    """Export métadonnées + template ; import refusé (§2.10.1)."""

    resource: str = RESOURCE_DOCUMENT

    def build_template_bytes(self) -> bytes:
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=list(DOCUMENT_COLUMNS),
            rows=[],
        )

    def export_queryset_to_bytes(self, queryset) -> bytes:
        rows: list[list[Any]] = []
        for doc in queryset.select_related("formation").order_by("id"):
            path = doc.fichier.name if doc.fichier else None
            row = [
                doc.id,
                doc.formation_id,
                doc.nom_fichier,
                doc.type_document,
                doc.source,
                doc.taille_fichier,
                doc.mime_type,
                path,
            ]
            rows.append(row)
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=list(DOCUMENT_COLUMNS),
            rows=rows,
        )

    def import_upload(self, user, uploaded_file, *, dry_run: bool, request=None) -> dict[str, Any]:
        validate_xlsx_uploaded_file(uploaded_file)
        raise DjangoValidationError(
            {
                "detail": "Import Excel des documents non disponible sans pipeline fichier ; utilisez l’API documents.",
                "code": ERR_NOT_SUPPORTED,
            }
        )

