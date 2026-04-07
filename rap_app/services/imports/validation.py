"""
Validation des fichiers uploadés pour l'import Excel (.xlsx).

Enchaîne les contrôles §2.12 du plan (extension, taille) avant tout parsing coûteux.
"""

import io
import os
import zipfile

from django.conf import settings
from django.core.exceptions import ValidationError

from .schemas import ERR_FILE_TOO_LARGE, ERR_INVALID_FILE


def get_max_upload_bytes() -> int:
    """
    Retourne la taille maximale autorisée pour un fichier d'import Excel.

    Returns:
        int: Nombre d'octets, lu depuis ``settings.RAP_IMPORT_MAX_UPLOAD_BYTES``.
    """
    return int(getattr(settings, "RAP_IMPORT_MAX_UPLOAD_BYTES", 10 * 1024 * 1024))


def validate_xlsx_extension(filename: str | None) -> None:
    """
    Vérifie que le nom de fichier se termine par l'extension ``.xlsx``.

    Args:
        filename: Nom du fichier fourni par le client (peut être None).

    Raises:
        django.core.exceptions.ValidationError: Si le nom est absent ou l'extension
            n'est pas ``.xlsx`` (message orienté utilisateur).
    """
    if not filename:
        raise ValidationError(
            {
                "file": "Nom de fichier manquant. Seuls les fichiers Excel au format .xlsx (Excel 2007+) sont acceptés.",
                "code": ERR_INVALID_FILE,
            }
        )
    lower = filename.lower()
    if not lower.endswith(".xlsx"):
        raise ValidationError(
            {
                "file": "Seuls les fichiers Excel au format .xlsx (Excel 2007+) sont acceptés.",
                "code": ERR_INVALID_FILE,
            }
        )
    base = os.path.basename(lower)
    if base.endswith(".xlsm") or base.endswith(".xls"):
        raise ValidationError(
            {
                "file": "Seuls les fichiers Excel au format .xlsx (Excel 2007+) sont acceptés.",
                "code": ERR_INVALID_FILE,
            }
        )


def validate_uploaded_file_size(uploaded_file, max_bytes: int | None = None) -> None:
    """
    Compare la taille du fichier uploadé au plafond configuré.

    Args:
        uploaded_file: Objet fichier Django (attribut ``size`` ou lecture partielle).
        max_bytes: Plafond explicite ; si None, utilise :func:`get_max_upload_bytes`.

    Raises:
        django.core.exceptions.ValidationError: Si la taille dépasse le plafond.
    """
    limit = max_bytes if max_bytes is not None else get_max_upload_bytes()
    size = getattr(uploaded_file, "size", None)
    if size is None:
        try:
            uploaded_file.seek(0, os.SEEK_END)
            size = uploaded_file.tell()
            uploaded_file.seek(0)
        except (OSError, AttributeError):
            size = None
    if size is not None and size > limit:
        mo = max(1, round(limit / (1024 * 1024)))
        raise ValidationError(
            {
                "file": f"Fichier trop volumineux (max. {mo} Mo).",
                "code": ERR_FILE_TOO_LARGE,
            }
        )


def get_max_zip_entries() -> int:
    """Nombre maximal d’entrées dans l’archive ZIP (.xlsx) — garde-fou §2.7."""
    return int(getattr(settings, "RAP_IMPORT_MAX_ZIP_ENTRIES", 2000))


def get_max_zip_expand_ratio() -> int:
    """
    Ratio maximal (taille décompressée / taille archive) pour un .xlsx (ZIP).

    Au-delà, le fichier est rejeté comme suspect (zip bomb / zip très compressé).
    """
    return int(getattr(settings, "RAP_IMPORT_MAX_ZIP_EXPAND_RATIO", 200))


def validate_xlsx_zip_expand_ratio(uploaded_file) -> None:
    """
    Garde-fou §2.7 : un .xlsx est un ZIP ; borne le ratio décompressé / taille fichier.

    Raises:
        django.core.exceptions.ValidationError: Si le ZIP est illisible ou le ratio dépasse le plafond.
    """
    if hasattr(uploaded_file, "seek"):
        try:
            uploaded_file.seek(0)
        except (OSError, AttributeError):
            pass
    try:
        data = uploaded_file.read()
    except (OSError, AttributeError):
        return
    if hasattr(uploaded_file, "seek"):
        try:
            uploaded_file.seek(0)
        except (OSError, AttributeError):
            pass
    if not data:
        return
    if len(data) < 4 or data[:2] != b"PK":
        raise ValidationError(
            {
                "file": "Le fichier n’est pas un classeur Excel .xlsx valide (en-tête ZIP attendu).",
                "code": ERR_INVALID_FILE,
            }
        )
    max_ratio = max(1, get_max_zip_expand_ratio())
    max_entries = max(1, get_max_zip_entries())
    try:
        with zipfile.ZipFile(io.BytesIO(data), "r") as zf:
            infos = zf.infolist()
            if len(infos) > max_entries:
                raise ValidationError(
                    {
                        "file": f"Archive ZIP suspecte (trop d’entrées internes, max. {max_entries}).",
                        "code": ERR_INVALID_FILE,
                    }
                )
            total_uncompressed = sum(info.file_size for info in infos)
    except zipfile.BadZipFile as exc:
        raise ValidationError(
            {
                "file": "Fichier corrompu ou non compatible (archive ZIP invalide).",
                "code": ERR_INVALID_FILE,
            }
        ) from exc
    compressed_size = len(data)
    ratio = total_uncompressed / max(compressed_size, 1)
    if ratio > max_ratio:
        raise ValidationError(
            {
                "file": "Fichier rejeté (compression suspecte ou trop forte). Réessayez avec un fichier exporté depuis l’application.",
                "code": ERR_INVALID_FILE,
            }
        )


def validate_xlsx_uploaded_file(uploaded_file) -> None:
    """
    Valide extension, taille et ratio ZIP (§2.7 / §2.12) avant ``load_workbook``.

    Args:
        uploaded_file: ``UploadedFile`` ou équivalent (``name``, ``size``).

    Raises:
        django.core.exceptions.ValidationError: Si l'extension ou la taille est invalide.
    """
    validate_xlsx_extension(getattr(uploaded_file, "name", None))
    validate_uploaded_file_size(uploaded_file)
    validate_xlsx_zip_expand_ratio(uploaded_file)
