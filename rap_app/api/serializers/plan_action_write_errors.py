"""
Messages d'erreur d'écriture plan d'action : applatissement des erreurs DRF pour l'enveloppe API.
"""

from __future__ import annotations

import re
from typing import Any

_CHAMP_FR: dict[str, str] = {
    "titre": "Titre",
    "date_debut": "Date de début",
    "date_fin": "Date de fin",
    "periode_type": "Type de période",
    "centre": "Centre",
    "formation": "Formation",
    "synthese": "Synthèse",
    "resume_points_cles": "Points clés",
    "plan_action": "Plan d'action (texte)",
    "plan_action_structured": "Plan d'action structuré",
    "statut": "Statut",
    "metadata": "Périmètre centres",
    "commentaire_ids": "Commentaires sources",
    "non_field_errors": "",
    "detail": "Détail",
}

_EN_EQ_FR: list[tuple[str, str]] = [
    ("this field is required.", "champ obligatoire."),
    ("this field may not be null.", "une valeur est requise (ne peut pas être vide)."),
    ("this field may not be blank.", "ce champ ne peut pas être vide."),
    ("not a valid string.", "format de texte invalide."),
]


def _adoucir_message_drf(msg: str) -> str:
    t = (msg or "").strip()
    if not t:
        return "erreur inconnue."
    low = t.lower()
    for en, fr in _EN_EQ_FR:
        if low == en:
            return fr
    m = re.search(r'[Ii]nvalid pk "([^"]+)"', t)
    if m:
        return f"la référence d'identifiant {m.group(1)} est introuvable (supprimée ou interdite)."
    if re.search(r"invalid pk", t, re.I) or "does not exist" in low:
        return "référence invalide ou introuvable (centre, formation ou autre ressource)."
    return t


def _iter_error_values(raw: Any) -> list:
    if raw is None:
        return []
    if isinstance(raw, (list, tuple)):
        return list(raw)
    if isinstance(raw, dict):
        return [raw]
    return [raw]


def humanize_plan_action_formation_write_errors(errors: Any) -> str:
    """
    Construit un texte unique pour le champ `message` de l'enveloppe d'erreur.
    Le détail par champ reste dans `errors`.
    """
    if not errors:
        return (
            "Les informations du plan d'action sont invalides. Vérifiez les champs (dates, centres, "
            "formation, commentaires) puis enregistrez à nouveau."
        )
    if not isinstance(errors, dict):
        return str(errors)

    parts: list[str] = []
    for field, value in errors.items():
        if field == "non_field_errors":
            for item in _iter_error_values(value):
                s = str(item)
                s = s.strip()
                if s:
                    parts.append(s)
            continue
        label = _CHAMP_FR.get(field) or field.replace("_", " ")
        for item in _iter_error_values(value):
            text = _adoucir_message_drf(str(item))
            parts.append(f"{label} : {text}" if text else f"{label} : erreur.")

    if not parts:
        return (
            "Les informations du plan d'action sont invalides. Vérifiez le formulaire (périmètre, "
            "formation, commentaires) puis réessayez."
        )
    if len(parts) == 1:
        return parts[0]
    return " — ".join(parts)
