"""
Gestionnaires Excel Lot 1 pour ``Centre``, ``TypeOffre`` et ``Statut``.

Chaque gestionnaire fournit le modèle « template → export → import » avec
validation, périmètre centre (pour les centres) et contrat de réponse §2.8.1.
"""

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.serializers import ValidationError as DRFValidationError

from rap_app.api.roles import is_admin_like, staff_centre_ids
from rap_app.api.serializers.centres_serializers import CentreSerializer
from rap_app.api.serializers.statut_serializers import StatutSerializer
from rap_app.api.serializers.types_offre_serializers import TypeOffreSerializer
from rap_app.models.centres import Centre
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre

from .excel_io import assert_meta_matches, cell_to_python, read_lot1_workbook, write_lot1_workbook
from .schemas import (
    CENTRE_COLUMNS,
    ERR_CONFLICT,
    ERR_INVALID,
    ERR_NOT_FOUND,
    ERR_OUT_OF_SCOPE,
    ERR_REQUIRED,
    RESOURCE_CENTRE,
    RESOURCE_STATUT,
    RESOURCE_TYPE_OFFRE,
    SCHEMA_VERSION_LOT1,
    STATUT_COLUMNS,
    TYPE_OFFRE_COLUMNS,
)
from .validation import validate_xlsx_uploaded_file


def _norm_optional_str(val: Any) -> str | None:
    """Normalise une valeur Excel en chaîne optionnelle (None si vide)."""
    if val is None:
        return None
    if isinstance(val, float) and val.is_integer():
        val = int(val)
    s = str(val).strip()
    return s if s else None


def _norm_id(val: Any) -> int | None:
    """Interprète une cellule id (entier ou vide)."""
    if val is None or val == "":
        return None
    if isinstance(val, float) and val.is_integer():
        return int(val)
    if isinstance(val, bool):
        return None
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def _norm_postal(val: Any) -> str | None:
    """Normalise un code postal à 5 chiffres lorsque Excel le lit en nombre."""
    s = _norm_optional_str(val)
    if s is None:
        return None
    if s.isdigit() and len(s) < 5:
        return s.zfill(5)
    return s


def _build_import_payload(
    *,
    dry_run: bool,
    resource: str,
    summary: dict[str, int],
    rows_out: list[dict[str, Any]],
) -> dict[str, Any]:
    """Construit le corps JSON §2.8.1 pour un import terminé."""
    return {
        "dry_run": dry_run,
        "resource": resource,
        "schema_version": SCHEMA_VERSION_LOT1,
        "summary": summary,
        "rows": rows_out,
        "report_url": None,
    }


def _row_err(field: str, code: str, message: str) -> dict[str, str]:
    """Formate une erreur de ligne unique."""
    return {"field": field, "code": code, "message": message}


def _drf_errors_to_row(err: DRFValidationError) -> list[dict[str, str]]:
    """Convertit les erreurs DRF en liste ``{field, code, message}``."""
    out: list[dict[str, str]] = []
    detail = getattr(err, "detail", err)
    if isinstance(detail, dict):
        for field, messages in detail.items():
            msgs = messages if isinstance(messages, list) else [messages]
            for m in msgs:
                out.append({"field": str(field), "code": ERR_INVALID, "message": str(m)})
    else:
        out.append({"field": "non_field_errors", "code": ERR_INVALID, "message": str(detail)})
    return out


def _centre_scope_denied(user, centre_id: int | None, is_create: bool) -> str | None:
    """
    Retourne un message d'erreur si l'utilisateur ne peut pas appliquer la ligne.

    - Admin-like : aucune restriction.
    - Autres : création interdite ; mise à jour uniquement si l'id du centre est
      dans ``staff_centre_ids`` (liste vide = aucun centre).
    """
    if is_admin_like(user):
        return None
    allowed = staff_centre_ids(user)
    if allowed is None:
        return None
    allowed_set = set(allowed)
    if is_create:
        return "Création de centre hors de votre périmètre."
    if centre_id is None:
        return "Identifiant centre manquant pour la mise à jour."
    if centre_id not in allowed_set:
        return "Ce centre est hors de votre périmètre."
    return None


class CentreExcelHandler:
    """
    Export / import Excel pour le modèle ``Centre``.

    Colonnes alignées sur ``CentreSerializer`` (champs modifiables + ``id``).
    Le périmètre centre (non admin-like) interdit la création et les mises à jour
    sur des identifiants hors ``user.centres``.
    """

    resource: str = RESOURCE_CENTRE

    def build_template_bytes(self) -> bytes:
        """
        Génère un classeur vide (feuilles Meta + Données) prêt à être rempli.

        Returns:
            bytes: Fichier ``.xlsx`` binaire.
        """
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=CENTRE_COLUMNS,
            rows=[],
        )

    def export_queryset_to_bytes(self, queryset) -> bytes:
        """
        Sérialise un queryset de centres vers un fichier ré-importable.

        Args:
            queryset: ``QuerySet`` de ``Centre`` déjà filtré (périmètre API).

        Returns:
            bytes: Contenu ``.xlsx``.
        """
        rows: list[list[Any]] = []
        for c in queryset.order_by("id"):
            rows.append(
                [
                    c.id,
                    c.is_active,
                    c.nom,
                    c.numero_voie,
                    c.nom_voie,
                    c.complement_adresse,
                    c.code_postal,
                    c.commune,
                    c.numero_uai_centre,
                    c.siret_centre,
                    c.organisme_declaration_activite,
                    c.cfa_entreprise,
                    c.cfa_responsable_est_lieu_principal,
                    c.cfa_responsable_denomination,
                    c.cfa_responsable_uai,
                    c.cfa_responsable_siret,
                    c.cfa_responsable_numero,
                    c.cfa_responsable_voie,
                    c.cfa_responsable_complement,
                    c.cfa_responsable_code_postal,
                    c.cfa_responsable_commune,
                ]
            )
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=CENTRE_COLUMNS,
            rows=rows,
        )

    def import_upload(self, user, uploaded_file, *, dry_run: bool, request=None) -> dict[str, Any]:
        """
        Importe des centres depuis un upload multipart.

        Args:
            user: Utilisateur Django (auteur des ``save``).
            uploaded_file: Fichier ``.xlsx`` validé en amont ou ici.
            dry_run: Si True, exécute les validations sans persistance.

        Returns:
            dict: Corps JSON §2.8.1 (résumé + lignes).

        Raises:
            django.core.exceptions.ValidationError: Erreur fichier (extension, meta, colonnes).
        """
        validate_xlsx_uploaded_file(uploaded_file)
        meta, headers, data_rows = read_lot1_workbook(uploaded_file, expected_columns=set(CENTRE_COLUMNS))
        assert_meta_matches(meta, expected_resource=self.resource)

        summary = {"created": 0, "updated": 0, "skipped": 0, "failed": 0}
        rows_out: list[dict[str, Any]] = []
        pending: list[tuple[str, int, Any, Centre | None]] = []

        for raw in data_rows:
            rn = int(raw.pop("_excel_row_number", 0))
            payload = self._raw_to_payload(raw)
            pk = _norm_id(payload.pop("id", None))
            nom = payload.get("nom")

            instance = None
            is_create = False
            if pk:
                instance = Centre.objects.filter(pk=pk).first()
                if instance is None:
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": pk,
                            "action": "error",
                            "errors": [_row_err("id", ERR_NOT_FOUND, f"Aucun centre avec l'id {pk}.")],
                        }
                    )
                    continue
            elif nom:
                instance = Centre.objects.filter(nom=nom).first()
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

            scope_msg = _centre_scope_denied(user, pk if not is_create else None, is_create)
            if scope_msg:
                summary["failed"] += 1
                rows_out.append(
                    {
                        "row_number": rn,
                        "id": pk,
                        "action": "error",
                        "errors": [_row_err("id", ERR_OUT_OF_SCOPE, scope_msg)],
                    }
                )
                continue

            try:
                if instance is None:
                    ser = CentreSerializer(data=payload)
                    ser.is_valid(raise_exception=True)
                    if dry_run:
                        summary["created"] += 1
                        rows_out.append(
                            {
                                "row_number": rn,
                                "id": None,
                                "action": "create",
                                "errors": [],
                            }
                        )
                    else:
                        pending.append(("create", len(rows_out), ser, None))
                        rows_out.append(
                            {
                                "row_number": rn,
                                "id": None,
                                "action": "create",
                                "errors": [],
                            }
                        )
                else:
                    ser = CentreSerializer(instance, data=payload)
                    ser.is_valid(raise_exception=True)
                    if dry_run:
                        summary["updated"] += 1
                        rows_out.append(
                            {
                                "row_number": rn,
                                "id": instance.pk,
                                "action": "update",
                                "errors": [],
                            }
                        )
                    else:
                        pending.append(("update", len(rows_out), ser, instance))
                        rows_out.append(
                            {
                                "row_number": rn,
                                "id": instance.pk,
                                "action": "update",
                                "errors": [],
                            }
                        )
            except DRFValidationError as exc:
                summary["failed"] += 1
                rows_out.append(
                    {
                        "row_number": rn,
                        "id": pk,
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
                    centre = Centre(**ser.validated_data)
                    centre.save(user=user)
                    rows_out[idx]["id"] = centre.pk
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
        """Convertit une ligne Excel en dictionnaire prêt pour ``CentreSerializer``."""
        d: dict[str, Any] = {}
        for key in CENTRE_COLUMNS:
            if key not in raw:
                continue
            v = raw.get(key)
            if key == "id":
                d["id"] = _norm_id(v)
                continue
            if key == "code_postal":
                d[key] = _norm_postal(v)
                continue
            if key in ("is_active", "cfa_entreprise", "cfa_responsable_est_lieu_principal"):
                d[key] = cell_to_python(v, as_bool=True)
                continue
            d[key] = _norm_optional_str(v) if v is not None else None
        if "nom" in d and d["nom"] is not None:
            d["nom"] = str(d["nom"]).strip()
        return d


class TypeOffreExcelHandler:
    """
    Export / import Excel pour ``TypeOffre``.

    Clé naturelle si ``id`` absent : ``(nom, autre)`` lorsque ``nom == 'autre'``,
    sinon résolution par ``nom`` si une seule ligne correspond.
    """

    resource: str = RESOURCE_TYPE_OFFRE

    def build_template_bytes(self) -> bytes:
        """Voir :meth:`CentreExcelHandler.build_template_bytes`."""
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=TYPE_OFFRE_COLUMNS,
            rows=[],
        )

    def export_queryset_to_bytes(self, queryset) -> bytes:
        """Exporte les types d'offre visibles."""
        rows: list[list[Any]] = []
        for t in queryset.order_by("id"):
            rows.append([t.id, t.nom, t.autre or "", t.couleur or ""])
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=TYPE_OFFRE_COLUMNS,
            rows=rows,
        )

    def import_upload(self, _user, uploaded_file, *, dry_run: bool, request=None) -> dict[str, Any]:
        """Importe des types d'offre (upsert par id ou clé naturelle)."""
        validate_xlsx_uploaded_file(uploaded_file)
        meta, headers, data_rows = read_lot1_workbook(uploaded_file, expected_columns=set(TYPE_OFFRE_COLUMNS))
        assert_meta_matches(meta, expected_resource=self.resource)

        summary = {"created": 0, "updated": 0, "skipped": 0, "failed": 0}
        rows_out: list[dict[str, Any]] = []
        pending: list[tuple[str, int, Any, TypeOffre | None]] = []

        for raw in data_rows:
            rn = int(raw.pop("_excel_row_number", 0))
            raw_nom = _norm_optional_str(raw.get("nom"))
            payload = {
                "nom": raw_nom.lower() if raw_nom else "",
                "autre": _norm_optional_str(raw.get("autre")) or "",
                "couleur": _norm_optional_str(raw.get("couleur")) or "",
            }
            pk = _norm_id(raw.get("id"))
            if not payload["nom"]:
                summary["failed"] += 1
                rows_out.append(
                    {
                        "row_number": rn,
                        "id": pk,
                        "action": "error",
                        "errors": [_row_err("nom", ERR_REQUIRED, "Le champ nom est requis.")],
                    }
                )
                continue

            instance = None
            is_create = False
            if pk:
                instance = TypeOffre.objects.filter(pk=pk).first()
                if instance is None:
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": pk,
                            "action": "error",
                            "errors": [_row_err("id", ERR_NOT_FOUND, f"Aucun type d'offre avec l'id {pk}.")],
                        }
                    )
                    continue
            else:
                qs = TypeOffre.objects.filter(nom=payload["nom"])
                if payload["nom"] == TypeOffre.AUTRE:
                    qs = qs.filter(autre=payload["autre"])
                n = qs.count()
                if n == 1:
                    instance = qs.first()
                elif n == 0:
                    is_create = True
                else:
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": None,
                            "action": "error",
                            "errors": [
                                _row_err(
                                    "nom",
                                    ERR_CONFLICT,
                                    "Plusieurs types d'offre correspondent ; renseignez la colonne id.",
                                )
                            ],
                        }
                    )
                    continue

            try:
                if is_create:
                    ser = TypeOffreSerializer(data=payload)
                    ser.is_valid(raise_exception=True)
                    if dry_run:
                        summary["created"] += 1
                        rows_out.append({"row_number": rn, "id": None, "action": "create", "errors": []})
                    else:
                        pending.append(("create", len(rows_out), ser, None))
                        rows_out.append({"row_number": rn, "id": None, "action": "create", "errors": []})
                else:
                    assert instance is not None
                    ser = TypeOffreSerializer(instance, data=payload)
                    ser.is_valid(raise_exception=True)
                    if dry_run:
                        summary["updated"] += 1
                        rows_out.append({"row_number": rn, "id": instance.pk, "action": "update", "errors": []})
                    else:
                        pending.append(("update", len(rows_out), ser, instance))
                        rows_out.append({"row_number": rn, "id": instance.pk, "action": "update", "errors": []})
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
                    obj = ser.save()
                    rows_out[idx]["id"] = obj.pk
                else:
                    assert inst is not None
                    ser.save()
                    rows_out[idx]["id"] = inst.pk

        summary["created"] = sum(1 for k, *_ in pending if k == "create")
        summary["updated"] = sum(1 for k, *_ in pending if k == "update")
        return _build_import_payload(dry_run=dry_run, resource=self.resource, summary=summary, rows_out=rows_out)


class StatutExcelHandler:
    """
    Export / import Excel pour ``Statut``.

    Sans ``id``, résolution par ``nom`` uniquement si une seule ligne existe en base ;
    sinon l'import exige ``id`` pour lever l'ambiguïté.
    """

    resource: str = RESOURCE_STATUT

    def build_template_bytes(self) -> bytes:
        """Voir :meth:`CentreExcelHandler.build_template_bytes`."""
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=STATUT_COLUMNS,
            rows=[],
        )

    def export_queryset_to_bytes(self, queryset) -> bytes:
        """Exporte les statuts du queryset."""
        rows: list[list[Any]] = []
        for s in queryset.order_by("id"):
            rows.append([s.id, s.nom, s.couleur or "", s.description_autre or ""])
        return write_lot1_workbook(
            resource=self.resource,
            schema_version=SCHEMA_VERSION_LOT1,
            headers=STATUT_COLUMNS,
            rows=rows,
        )

    def import_upload(self, _user, uploaded_file, *, dry_run: bool, request=None) -> dict[str, Any]:
        """Importe des statuts (création / mise à jour)."""
        validate_xlsx_uploaded_file(uploaded_file)
        meta, headers, data_rows = read_lot1_workbook(uploaded_file, expected_columns=set(STATUT_COLUMNS))
        assert_meta_matches(meta, expected_resource=self.resource)

        summary = {"created": 0, "updated": 0, "skipped": 0, "failed": 0}
        rows_out: list[dict[str, Any]] = []
        pending: list[tuple[str, int, Any, Statut | None]] = []

        for raw in data_rows:
            rn = int(raw.pop("_excel_row_number", 0))
            payload = {
                "nom": _norm_optional_str(raw.get("nom")) or "",
                "couleur": _norm_optional_str(raw.get("couleur")) or "",
                "description_autre": _norm_optional_str(raw.get("description_autre")) or "",
            }
            pk = _norm_id(raw.get("id"))
            if not payload["nom"]:
                summary["failed"] += 1
                rows_out.append(
                    {
                        "row_number": rn,
                        "id": pk,
                        "action": "error",
                        "errors": [_row_err("nom", ERR_REQUIRED, "Le champ nom est requis.")],
                    }
                )
                continue

            instance = None
            is_create = False
            if pk:
                instance = Statut.objects.filter(pk=pk).first()
                if instance is None:
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": pk,
                            "action": "error",
                            "errors": [_row_err("id", ERR_NOT_FOUND, f"Aucun statut avec l'id {pk}.")],
                        }
                    )
                    continue
            else:
                qs = Statut.objects.filter(nom=payload["nom"])
                n = qs.count()
                if n == 1:
                    instance = qs.first()
                elif n == 0:
                    is_create = True
                else:
                    summary["failed"] += 1
                    rows_out.append(
                        {
                            "row_number": rn,
                            "id": None,
                            "action": "error",
                            "errors": [
                                _row_err(
                                    "nom",
                                    ERR_CONFLICT,
                                    "Plusieurs statuts partagent ce nom ; renseignez la colonne id.",
                                )
                            ],
                        }
                    )
                    continue

            try:
                if is_create:
                    ser = StatutSerializer(data=payload)
                    ser.is_valid(raise_exception=True)
                    if dry_run:
                        summary["created"] += 1
                        rows_out.append({"row_number": rn, "id": None, "action": "create", "errors": []})
                    else:
                        pending.append(("create", len(rows_out), ser, None))
                        rows_out.append({"row_number": rn, "id": None, "action": "create", "errors": []})
                else:
                    assert instance is not None
                    ser = StatutSerializer(instance, data=payload)
                    ser.is_valid(raise_exception=True)
                    if dry_run:
                        summary["updated"] += 1
                        rows_out.append({"row_number": rn, "id": instance.pk, "action": "update", "errors": []})
                    else:
                        pending.append(("update", len(rows_out), ser, instance))
                        rows_out.append({"row_number": rn, "id": instance.pk, "action": "update", "errors": []})
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
                    obj = ser.save()
                    rows_out[idx]["id"] = obj.pk
                else:
                    assert inst is not None
                    ser.save()
                    rows_out[idx]["id"] = inst.pk

        summary["created"] = sum(1 for k, *_ in pending if k == "create")
        summary["updated"] = sum(1 for k, *_ in pending if k == "update")
        return _build_import_payload(dry_run=dry_run, resource=self.resource, summary=summary, rows_out=rows_out)
