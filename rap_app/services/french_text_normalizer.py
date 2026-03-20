import re


def _collapse_spaces(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _smart_title_token(token: str) -> str:
    if not token:
        return token
    return token[:1].upper() + token[1:].lower()


def _smart_title(value):
    value = _collapse_spaces(value)
    if not value:
        return value

    def normalize_piece(piece: str) -> str:
        segments = piece.split("-")
        normalized_segments = []
        for segment in segments:
            apostrophe_parts = segment.split("'")
            normalized_segments.append("'".join(_smart_title_token(part) for part in apostrophe_parts))
        return "-".join(normalized_segments)

    return " ".join(normalize_piece(piece) for piece in value.split(" "))


def normalize_candidate_text_fields(candidate) -> list[str]:
    """
    Normalisation prudente des champs texte candidats.

    Ne touche qu'aux champs où une correction automatique est peu risquée :
    espaces, casse simple, téléphone FR, email, code postal.
    """
    changes = []

    def set_if_changed(field, new_value):
        current = getattr(candidate, field, None)
        if current != new_value:
            setattr(candidate, field, new_value)
            changes.append(field)

    set_if_changed("nom", _smart_title(getattr(candidate, "nom", None)))
    set_if_changed("prenom", _smart_title(getattr(candidate, "prenom", None)))
    set_if_changed("ville", _smart_title(getattr(candidate, "ville", None)))
    set_if_changed("street_name", _collapse_spaces(getattr(candidate, "street_name", None)))
    set_if_changed("street_complement", _collapse_spaces(getattr(candidate, "street_complement", None)))
    set_if_changed("origine_sourcing", _collapse_spaces(getattr(candidate, "origine_sourcing", None)))
    set_if_changed("representant_lien", _collapse_spaces(getattr(candidate, "representant_lien", None)))
    set_if_changed("representant_nom_naissance", _smart_title(getattr(candidate, "representant_nom_naissance", None)))
    set_if_changed("representant_prenom", _smart_title(getattr(candidate, "representant_prenom", None)))
    set_if_changed("representant_city", _smart_title(getattr(candidate, "representant_city", None)))
    set_if_changed("representant_street_name", _collapse_spaces(getattr(candidate, "representant_street_name", None)))

    email = getattr(candidate, "email", None)
    normalized_email = _collapse_spaces(email).lower() if email else email
    set_if_changed("email", normalized_email)

    telephone = getattr(candidate, "telephone", None)
    normalized_phone = re.sub(r"[^\d]", "", str(telephone or ""))
    set_if_changed("telephone", normalized_phone or None)

    code_postal = getattr(candidate, "code_postal", None)
    normalized_postal = re.sub(r"\s+", "", str(code_postal or ""))
    set_if_changed("code_postal", normalized_postal or None)

    representative_zip = getattr(candidate, "representant_zip_code", None)
    normalized_rep_zip = re.sub(r"\s+", "", str(representative_zip or ""))
    set_if_changed("representant_zip_code", normalized_rep_zip or None)

    representative_email = getattr(candidate, "representant_email", None)
    normalized_rep_email = _collapse_spaces(representative_email).lower() if representative_email else representative_email
    set_if_changed("representant_email", normalized_rep_email)

    return changes


def normalize_candidate_payload(data: dict) -> dict:
    """
    Normalise un payload de création/mise à jour candidat avant validation
    serializer/model.
    """
    normalized = dict(data)

    for field in ("nom", "prenom", "ville", "representant_nom_naissance", "representant_prenom", "representant_city"):
        if field in normalized:
            normalized[field] = _smart_title(normalized.get(field))

    for field in ("street_name", "street_complement", "origine_sourcing", "representant_lien", "representant_street_name"):
        if field in normalized:
            normalized[field] = _collapse_spaces(normalized.get(field))

    for field in ("email", "representant_email"):
        if field in normalized:
            value = normalized.get(field)
            normalized[field] = _collapse_spaces(value).lower() if value else value

    for field in ("telephone",):
        if field in normalized:
            digits = re.sub(r"[^\d]", "", str(normalized.get(field) or ""))
            normalized[field] = digits or None

    for field in ("code_postal", "representant_zip_code"):
        if field in normalized:
            compact = re.sub(r"\s+", "", str(normalized.get(field) or ""))
            normalized[field] = compact or None

    return normalized
