import os
from datetime import date, datetime
from io import BytesIO

from django.conf import settings
from pdfrw import PageMerge
from pdfrw import PdfDict, PdfName, PdfObject, PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

from .constants_cerfa import CERFA_FIELD_MAP


def _join_non_empty(parts):
    return " - ".join([format_value(part) for part in parts if format_value(part)])


def _split_date_parts(value):
    formatted = format_value(value)
    if not formatted or "/" not in formatted:
        return ("", "", "")
    parts = formatted.split("/")
    if len(parts) != 3:
        return ("", "", "")
    return tuple(parts)


def _checkbox_mark(value, expected=True):
    if value is None:
        return ""
    return "X" if bool(value) is expected else ""


def _sex_checkbox_mark(value, expected):
    normalized = format_value(value).strip().upper()
    if not normalized:
        return ""
    return "X" if normalized == expected else ""


def _candidate_overlay_values(cerfa_contrat):
    naissance_jour, naissance_mois, naissance_annee = _split_date_parts(
        getattr(cerfa_contrat, "apprenti_date_naissance", None)
    )
    maitre1_naissance_jour, maitre1_naissance_mois, maitre1_naissance_annee = _split_date_parts(
        getattr(cerfa_contrat, "maitre1_date_naissance", None)
    )
    maitre2_naissance_jour, maitre2_naissance_mois, maitre2_naissance_annee = _split_date_parts(
        getattr(cerfa_contrat, "maitre2_date_naissance", None)
    )

    return {
        # Bloc employeur (cases a cocher page 1)
        "Case #C3#A0 cocher 1": _checkbox_mark(
            getattr(cerfa_contrat, "employeur_prive", None), True
        ),
        "Case #C3#A0 cocher 2": _checkbox_mark(
            getattr(cerfa_contrat, "employeur_public", None), True
        ),
        "Case #C3#A0 cocher 2_2": _checkbox_mark(
            getattr(cerfa_contrat, "employeur_regime_assurance_chomage", None), True
        ),
        # Bloc employeur (texte page 1)
        "Zone de texte 8": format_value(getattr(cerfa_contrat, "employeur_nom", None)),
        "Zone de texte 8_2": format_value(getattr(cerfa_contrat, "employeur_siret", None)),
        "Zone de texte 8_3": format_value(getattr(cerfa_contrat, "employeur_type", None)),
        "Zone de texte 8_4": format_value(getattr(cerfa_contrat, "employeur_specifique", None)),
        "Zone de texte 8_5": format_value(getattr(cerfa_contrat, "employeur_effectif", None)),
        "Zone de texte 8_6": format_value(getattr(cerfa_contrat, "employeur_code_idcc", None)),
        "Zone de texte 8_7": format_value(getattr(cerfa_contrat, "employeur_code_ape", None)),
        "Zone de texte 8_14": format_value(getattr(cerfa_contrat, "employeur_adresse_numero", None)),
        "Zone de texte 8_13": format_value(getattr(cerfa_contrat, "employeur_adresse_voie", None)),
        "Zone de texte 8_8": format_value(getattr(cerfa_contrat, "employeur_adresse_complement", None)),
        "Zone de texte 8_9": format_value(getattr(cerfa_contrat, "employeur_code_postal", None)),
        "Zone de texte 8_10": format_value(getattr(cerfa_contrat, "employeur_commune", None)),
        "Zone de texte 8_11": format_value(getattr(cerfa_contrat, "employeur_telephone", None)),
        "Zone de texte 8_12": format_value(getattr(cerfa_contrat, "employeur_email", None)),
        # Bloc identite de l'apprenti
        "Zone de texte 8_15": format_value(getattr(cerfa_contrat, "apprenti_nom_naissance", None)),
        "Zone de texte 8_16": format_value(getattr(cerfa_contrat, "apprenti_nom_usage", None)),
        "Zone de texte 8_17": format_value(getattr(cerfa_contrat, "apprenti_prenom", None)),
        "Zone de texte 8_18": format_value(getattr(cerfa_contrat, "apprenti_nir", None)),
        # Bloc adresse de l'apprenti
        "Zone de texte 8_19": format_value(getattr(cerfa_contrat, "apprenti_numero", None)),
        "Zone de texte 8_20": format_value(getattr(cerfa_contrat, "apprenti_voie", None)),
        "Zone de texte 8_21": format_value(getattr(cerfa_contrat, "apprenti_complement", None)),
        "Zone de texte 8_22": format_value(getattr(cerfa_contrat, "apprenti_code_postal", None)),
        "Zone de texte 8_23": format_value(getattr(cerfa_contrat, "apprenti_commune", None)),
        "Zone de texte 8_24": format_value(getattr(cerfa_contrat, "apprenti_telephone", None)),
        "Zone de texte 8_25": format_value(getattr(cerfa_contrat, "apprenti_email", None)),
        # Bloc representant legal
        "Zone de texte 8_35": _join_non_empty(
            [
                getattr(cerfa_contrat, "representant_nom", None),
                getattr(cerfa_contrat, "representant_prenom", None),
            ]
        ),
        "Zone de texte 8_37": format_value(getattr(cerfa_contrat, "representant_adresse_numero", None)),
        "Zone de texte 8_36": format_value(getattr(cerfa_contrat, "representant_adresse_voie", None)),
        "Zone de texte 8_38": format_value(getattr(cerfa_contrat, "representant_adresse_complement", None)),
        "Zone de texte 8_39": format_value(getattr(cerfa_contrat, "representant_code_postal", None)),
        "Zone de texte 8_40": format_value(getattr(cerfa_contrat, "representant_commune", None)),
        "Zone de texte 8_41": format_value(getattr(cerfa_contrat, "representant_email", None)),
        # Bloc naissance / statut / parcours
        "Zone de texte 21_7": naissance_jour,
        "Zone de texte 21_8": naissance_mois,
        "Zone de texte 21_9": naissance_annee,
        "Case #C3#A0 cocher 3": _sex_checkbox_mark(
            getattr(cerfa_contrat, "apprenti_sexe", None), "M"
        ),
        "Case #C3#A0 cocher 4": _sex_checkbox_mark(
            getattr(cerfa_contrat, "apprenti_sexe", None), "F"
        ),
        "Zone de texte 8_26": format_value(
            getattr(cerfa_contrat, "apprenti_departement_naissance", None)
        ),
        "Zone de texte 8_27": format_value(
            getattr(cerfa_contrat, "apprenti_commune_naissance", None)
        ),
        "Zone de texte 8_33": format_value(getattr(cerfa_contrat, "apprenti_nationalite", None)),
        "Zone de texte 8_34": format_value(getattr(cerfa_contrat, "apprenti_regime_social", None)),
        "Case #C3#A0 cocher 5": _checkbox_mark(
            getattr(cerfa_contrat, "apprenti_sportif_haut_niveau", None), True
        ),
        "Case #C3#A0 cocher 5_2": _checkbox_mark(
            getattr(cerfa_contrat, "apprenti_sportif_haut_niveau", None), False
        ),
        "Case #C3#A0 cocher 5_3": _checkbox_mark(
            getattr(cerfa_contrat, "apprenti_rqth", None), True
        ),
        "Case #C3#A0 cocher 5_4": _checkbox_mark(
            getattr(cerfa_contrat, "apprenti_rqth", None), False
        ),
        "Case #C3#A0 cocher 5_5": _checkbox_mark(
            getattr(cerfa_contrat, "apprenti_equivalence_jeunes", None), True
        ),
        "Case #C3#A0 cocher 5_6": _checkbox_mark(
            getattr(cerfa_contrat, "apprenti_equivalence_jeunes", None), False
        ),
        "Case #C3#A0 cocher 5_7": _checkbox_mark(
            getattr(cerfa_contrat, "apprenti_extension_boe", None), True
        ),
        "Case #C3#A0 cocher 5_8": _checkbox_mark(
            getattr(cerfa_contrat, "apprenti_extension_boe", None), False
        ),
        "Zone de texte 8_28": format_value(
            getattr(cerfa_contrat, "apprenti_situation_avant", None)
        ),
        "Zone de texte 8_29": format_value(
            getattr(cerfa_contrat, "apprenti_dernier_diplome_prepare", None)
        ),
        "Zone de texte 8_30": format_value(
            getattr(cerfa_contrat, "apprenti_derniere_annee_suivie", None)
        ),
        "Zone de texte 8_31": format_value(
            getattr(cerfa_contrat, "apprenti_intitule_dernier_diplome", None)
        ),
        "Zone de texte 8_32": format_value(
            getattr(cerfa_contrat, "apprenti_plus_haut_diplome", None)
        ),
        "Case #C3#A0 cocher 5_9": _checkbox_mark(
            getattr(cerfa_contrat, "apprenti_projet_entreprise", None), True
        ),
        "Case #C3#A0 cocher 5_10": _checkbox_mark(
            getattr(cerfa_contrat, "apprenti_projet_entreprise", None), False
        ),
        # Bloc maitres d'apprentissage
        "Zone de texte 8_42": format_value(getattr(cerfa_contrat, "maitre1_nom", None)),
        "Zone de texte 8_43": format_value(getattr(cerfa_contrat, "maitre1_prenom", None)),
        "Zone de texte 21_4": maitre1_naissance_jour,
        "Zone de texte 21_5": maitre1_naissance_mois,
        "Zone de texte 21_6": maitre1_naissance_annee,
        "Zone de texte 8_44": format_value(getattr(cerfa_contrat, "maitre1_email", None)),
        "Zone de texte 8_45": format_value(getattr(cerfa_contrat, "maitre1_emploi", None)),
        "Zone de texte 8_50": format_value(getattr(cerfa_contrat, "maitre1_diplome", None)),
        "Zone de texte 8_52": format_value(getattr(cerfa_contrat, "maitre1_niveau_diplome", None)),
        "Zone de texte 8_46": format_value(getattr(cerfa_contrat, "maitre2_nom", None)),
        "Zone de texte 8_47": format_value(getattr(cerfa_contrat, "maitre2_prenom", None)),
        "Zone de texte 21": maitre2_naissance_jour,
        "Zone de texte 21_2": maitre2_naissance_mois,
        "Zone de texte 21_3": maitre2_naissance_annee,
        "Zone de texte 8_48": format_value(getattr(cerfa_contrat, "maitre2_email", None)),
        "Zone de texte 8_49": format_value(getattr(cerfa_contrat, "maitre2_emploi", None)),
        "Zone de texte 8_51": format_value(getattr(cerfa_contrat, "maitre2_diplome", None)),
        "Zone de texte 8_53": format_value(getattr(cerfa_contrat, "maitre2_niveau_diplome", None)),
        "Case #C3#A0 cocher 6": _checkbox_mark(
            getattr(cerfa_contrat, "maitre_eligible", None), True
        ),
    }


def _formation_overlay_values(cerfa_contrat):
    debut_jour, debut_mois, debut_annee = _split_date_parts(
        getattr(cerfa_contrat, "formation_debut", None)
    )
    fin_jour, fin_mois, fin_annee = _split_date_parts(
        getattr(cerfa_contrat, "formation_fin", None)
    )

    return {
        # Cases a cocher
        "Case #C3#A0 cocher 5_11": _checkbox_mark(
            getattr(cerfa_contrat, "cfa_entreprise", None), True
        ),
        "Case #C3#A0 cocher 5_12": _checkbox_mark(
            getattr(cerfa_contrat, "cfa_entreprise", None), False
        ),
        "Case #C3#A0 cocher 7": _checkbox_mark(
            getattr(cerfa_contrat, "cfa_est_lieu_formation_principal", None), True
        ),
        "Case #C3#A0 cocher 8": _checkbox_mark(
            getattr(cerfa_contrat, "pieces_justificatives_ok", None), True
        ),
        # Dates decoupees
        "Zone de texte 21_25": debut_jour,
        "Zone de texte 21_26": debut_mois,
        "Zone de texte 21_27": debut_annee,
        "Zone de texte 21_28": fin_jour,
        "Zone de texte 21_29": fin_mois,
        "Zone de texte 21_30": fin_annee,
    }


def _draw_text_in_box(pdf, text, x1, y1, x2, y2, font_name="Helvetica", font_size=8):
    text = format_value(text)
    if not text:
        return

    max_width = max((x2 - x1) - 4, 10)
    words = text.split()
    lines = []
    current = ""

    for word in words:
        test = f"{current} {word}".strip()
        if stringWidth(test, font_name, font_size) <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)

    line_height = font_size + 1
    max_lines = max(int((y2 - y1) // line_height), 1)
    lines = lines[:max_lines]

    draw_y = y2 - font_size - 1
    pdf.setFont(font_name, font_size)
    for line in lines:
        pdf.drawString(x1 + 2, draw_y, line)
        draw_y -= line_height


def _draw_single_line_in_box(pdf, text, x1, y1, x2, y2, font_name="Helvetica", font_size=7):
    text = format_value(text)
    if not text:
        return

    max_width = max((x2 - x1) - 3, 8)
    fitted_font_size = float(font_size)
    while fitted_font_size > 5 and stringWidth(text, font_name, fitted_font_size) > max_width:
        fitted_font_size -= 0.25

    draw_x = x1 + 1.5
    draw_y = y1 + max(((y2 - y1) - fitted_font_size) / 2, 0.5) - 0.5

    pdf.setFont(font_name, fitted_font_size)
    pdf.drawString(draw_x, draw_y, text)


def _draw_checkbox_mark(pdf, text, x1, y1, x2, y2, font_name="Helvetica-Bold", font_size=9):
    text = format_value(text)
    if not text:
        return

    mark = text[0]
    text_width = stringWidth(mark, font_name, font_size)
    box_width = x2 - x1
    box_height = y2 - y1

    draw_x = x1 + max((box_width - text_width) / 2, 0)
    draw_y = y1 + max((box_height - font_size) / 2, 0) - 0.5

    pdf.setFont(font_name, font_size)
    pdf.drawString(draw_x, draw_y, mark)


def _draw_manual_single_line(pdf, text, rect, font_name="Helvetica", font_size=7.5):
    text = format_value(text)
    if not text:
        return
    x1, y1, x2, y2 = rect
    _draw_single_line_in_box(pdf, text, x1, y1, x2, y2, font_name=font_name, font_size=font_size)


def _build_cfa_manual_overlay(page, cerfa_contrat):
    media_box = page.MediaBox
    width = float(media_box[2]) - float(media_box[0])
    height = float(media_box[3]) - float(media_box[1])
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(width, height))
    formation = getattr(cerfa_contrat, "formation", None)
    centre = getattr(formation, "centre", None) if formation is not None else None

    manual_rects = {
        "diplome_vise": (461.849, 547.34, 524.601, 558.738),
        "cfa_denomination": (19.649, 519.54, 279.451, 530.938),
        "cfa_uai": (99.099, 505.64, 279.451, 517.038),
        "cfa_siret": (97.949, 491.74, 279.451, 503.138),
        "diplome_intitule": (294.299, 519.54, 565.001, 530.938),
        "code_diplome": (382.449, 505.64, 565.001, 517.038),
        "code_rncp": (363.749, 491.74, 565.001, 503.138),
        "formation_duree_heures": (404.049, 400.84, 449.451, 412.238),
        "formation_distance_heures": (322.299, 386.94, 370.801, 398.338),
        "formation_lieu_denomination": (294.299, 331.34, 565.001, 342.738),
        "formation_lieu_uai": (335.249, 317.44, 565.001, 328.838),
        "formation_lieu_siret": (347.849, 303.54, 565.001, 314.938),
        "formation_lieu_numero": (314.849, 275.74, 351.501, 287.138),
        "formation_lieu_voie": (384.149, 275.74, 565.001, 287.138),
        "formation_lieu_complement": (362.599, 261.84, 565.001, 273.238),
        "formation_lieu_code_postal": (359.099, 247.94, 409.351, 259.338),
        "formation_lieu_commune": (350.799, 234.04, 565.001, 245.438),
        "cfa_adresse_numero": (40.199, 456.44, 76.851, 467.838),
        "cfa_adresse_voie": (109.499, 456.44, 281.901, 467.838),
        "cfa_adresse_complement": (87.949, 442.54, 282.701, 453.938),
        "cfa_code_postal": (84.449, 428.64, 134.701, 440.038),
        "cfa_commune": (76.149, 414.74, 281.451, 426.138),
    }

    for field_name, rect in manual_rects.items():
        if field_name == "formation_lieu_numero":
            value = getattr(centre, "numero_voie", None)
        elif field_name == "formation_lieu_complement":
            value = getattr(centre, "complement_adresse", None)
        else:
            value = getattr(cerfa_contrat, field_name, None)
        _draw_manual_single_line(pdf, value, rect)

    pdf.save()
    buffer.seek(0)
    return PdfReader(buffer)


def _build_candidate_overlay(page, cerfa_contrat):
    return _build_overlay(page, _candidate_overlay_values(cerfa_contrat))


def _build_overlay(
    page,
    values,
    *,
    text_font_size=8,
    checkbox_font_size=9,
    single_line_text=False,
):
    annots = getattr(page, "Annots", []) or []
    field_rects = {}
    for annot in annots:
        field_name = getattr(annot.T, "to_unicode", lambda: None)()
        if not field_name or field_name in field_rects:
            continue
        rect = getattr(annot, "Rect", None)
        if not rect or len(rect) != 4:
            continue
        field_rects[field_name] = [float(v) for v in rect]

    if not values:
        return None

    media_box = page.MediaBox
    width = float(media_box[2]) - float(media_box[0])
    height = float(media_box[3]) - float(media_box[1])
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(width, height))

    for field_name, text in values.items():
        rect = field_rects.get(field_name)
        if rect and text:
            if field_name.startswith("Case "):
                _draw_checkbox_mark(pdf, text, *rect, font_size=checkbox_font_size)
            else:
                if single_line_text:
                    _draw_single_line_in_box(pdf, text, *rect, font_size=text_font_size)
                else:
                    _draw_text_in_box(pdf, text, *rect, font_size=text_font_size)

    pdf.save()
    buffer.seek(0)
    return PdfReader(buffer)


def format_value(value):
    """Formate proprement la valeur pour le CERFA."""
    if isinstance(value, (datetime, date)):
        return value.strftime("%d/%m/%Y")
    if isinstance(value, bool):
        return "Oui" if value else "Non"
    return str(value or "").strip()


def _build_summary_rows(cerfa_contrat):
    rows = [
        ("Apprenti - nom", getattr(cerfa_contrat, "apprenti_nom_naissance", None)),
        ("Apprenti - prenom", getattr(cerfa_contrat, "apprenti_prenom", None)),
        ("Apprenti - email", getattr(cerfa_contrat, "apprenti_email", None)),
        ("Apprenti - telephone", getattr(cerfa_contrat, "apprenti_telephone", None)),
        ("Apprenti - adresse", " ".join(
            x for x in [
                format_value(getattr(cerfa_contrat, "apprenti_numero", None)),
                format_value(getattr(cerfa_contrat, "apprenti_voie", None)),
                format_value(getattr(cerfa_contrat, "apprenti_complement", None)),
            ] if x and x != ""
        ).strip()),
        ("Apprenti - code postal", getattr(cerfa_contrat, "apprenti_code_postal", None)),
        ("Apprenti - commune", getattr(cerfa_contrat, "apprenti_commune", None)),
        ("Employeur - nom", getattr(cerfa_contrat, "employeur_nom", None)),
        ("Employeur - SIRET", getattr(cerfa_contrat, "employeur_siret", None)),
        ("Employeur - email", getattr(cerfa_contrat, "employeur_email", None)),
        ("Employeur - telephone", getattr(cerfa_contrat, "employeur_telephone", None)),
        ("Employeur - adresse", " ".join(
            x for x in [
                format_value(getattr(cerfa_contrat, "employeur_adresse_numero", None)),
                format_value(getattr(cerfa_contrat, "employeur_adresse_voie", None)),
                format_value(getattr(cerfa_contrat, "employeur_adresse_complement", None)),
            ] if x and x != ""
        ).strip()),
        ("Employeur - code postal", getattr(cerfa_contrat, "employeur_code_postal", None)),
        ("Employeur - commune", getattr(cerfa_contrat, "employeur_commune", None)),
        ("Formation - diplome vise", getattr(cerfa_contrat, "diplome_vise", None)),
        ("Formation - intitule", getattr(cerfa_contrat, "diplome_intitule", None)),
        ("Formation - code diplome", getattr(cerfa_contrat, "code_diplome", None)),
        ("Formation - code RNCP", getattr(cerfa_contrat, "code_rncp", None)),
        ("Formation - debut", getattr(cerfa_contrat, "formation_debut", None)),
        ("Formation - fin", getattr(cerfa_contrat, "formation_fin", None)),
        ("Formation - duree heures", getattr(cerfa_contrat, "formation_duree_heures", None)),
        ("Pieces justificatives OK", getattr(cerfa_contrat, "pieces_justificatives_ok", None)),
        ("CFA - denomination", getattr(cerfa_contrat, "cfa_denomination", None)),
        ("CFA - UAI", getattr(cerfa_contrat, "cfa_uai", None)),
        ("CFA - SIRET", getattr(cerfa_contrat, "cfa_siret", None)),
        ("Maitre 1 - nom", getattr(cerfa_contrat, "maitre1_nom", None)),
        ("Maitre 1 - prenom", getattr(cerfa_contrat, "maitre1_prenom", None)),
        ("Maitre 1 - naissance", getattr(cerfa_contrat, "maitre1_date_naissance", None)),
        ("Maitre 1 - courriel", getattr(cerfa_contrat, "maitre1_email", None)),
        ("Maitre 1 - emploi", getattr(cerfa_contrat, "maitre1_emploi", None)),
        ("Maitre 1 - diplome", getattr(cerfa_contrat, "maitre1_diplome", None)),
        ("Maitre 1 - niveau", getattr(cerfa_contrat, "maitre1_niveau_diplome", None)),
        ("Maitre 2 - nom", getattr(cerfa_contrat, "maitre2_nom", None)),
        ("Maitre 2 - prenom", getattr(cerfa_contrat, "maitre2_prenom", None)),
        ("Maitre 2 - naissance", getattr(cerfa_contrat, "maitre2_date_naissance", None)),
        ("Maitre 2 - courriel", getattr(cerfa_contrat, "maitre2_email", None)),
        ("Maitre 2 - emploi", getattr(cerfa_contrat, "maitre2_emploi", None)),
        ("Maitre 2 - diplome", getattr(cerfa_contrat, "maitre2_diplome", None)),
        ("Maitre 2 - niveau", getattr(cerfa_contrat, "maitre2_niveau_diplome", None)),
        ("Maitre eligible", getattr(cerfa_contrat, "maitre_eligible", None)),
        ("Type contrat", getattr(cerfa_contrat, "type_contrat", None)),
        ("Date conclusion", getattr(cerfa_contrat, "date_conclusion", None)),
    ]
    return [(label, format_value(value)) for label, value in rows if format_value(value)]


def _build_summary_pdf(cerfa_contrat):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    rows = _build_summary_rows(cerfa_contrat)
    y = height - 40
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, "Annexe - donnees pre-remplies du CERFA")
    y -= 24

    pdf.setFont("Helvetica", 10)
    for label, value in rows:
        line = f"{label} : {value}"
        chunks = [line[i : i + 105] for i in range(0, len(line), 105)] or [line]
        for chunk in chunks:
            if y < 50:
                pdf.showPage()
                y = height - 40
                pdf.setFont("Helvetica", 10)
            pdf.drawString(40, y, chunk)
            y -= 14

    pdf.save()
    buffer.seek(0)
    return PdfReader(buffer)


def generer_pdf_cerfa(cerfa_contrat, output_path=None, flatten=False):
    """
    Remplit le CERFA 10103*14 avec les champs du modèle CerfaContrat.
    Force l’apparence des champs (sinon texte invisible dans Acrobat).
    """
    # 1️⃣ Chemin du modèle
    template_path = os.path.join(settings.BASE_DIR, "rap_app/static/cerfa/cerfa_10103-14.pdf")
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Fichier CERFA introuvable : {template_path}")

    # 2️⃣ Sortie
    if output_path is None:
        output_dir = os.path.join(settings.MEDIA_ROOT, "cerfa_remplis")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"cerfa_{cerfa_contrat.id}.pdf")

    # 3️⃣ Préparation des données
    data = {}
    for pdf_field, model_field in CERFA_FIELD_MAP.items():
        if not model_field:
            continue
        raw_value = getattr(cerfa_contrat, model_field, "")
        data[pdf_field] = format_value(raw_value)

    # 4️⃣ Lecture du template
    template_pdf = PdfReader(template_path)

    # 🔧 Ajout du flag "NeedAppearances"
    if template_pdf.Root:
        template_pdf.Root.AcroForm.update(PdfDict(NeedAppearances=PdfObject("true")))

    # 5️⃣ Injection des champs
    for page in template_pdf.pages:
        if not page.Annots:
            continue
        for annot in page.Annots:
            field_name = getattr(annot.T, "to_unicode", lambda: None)()
            if not field_name:
                continue
            if field_name in data:
                value = data[field_name]
                annot.update(PdfDict(V=PdfObject(f"({value})"), Ff=1, AP=None))

    # 5ter - superpose directement les donnees apprenti sur la page 1
    if template_pdf.pages:
        candidate_overlay = _build_overlay(
            template_pdf.pages[0],
            _candidate_overlay_values(cerfa_contrat),
            text_font_size=7.5,
            checkbox_font_size=8,
            single_line_text=True,
        )
        if candidate_overlay and candidate_overlay.pages:
            PageMerge(template_pdf.pages[0]).add(candidate_overlay.pages[0]).render()

    # 5quater - superpose directement les donnees formation / CFA sur la page 2
    if len(template_pdf.pages) > 1:
        formation_overlay = _build_overlay(
            template_pdf.pages[1],
            _formation_overlay_values(cerfa_contrat),
            text_font_size=7.5,
            checkbox_font_size=8,
            single_line_text=True,
        )
        if formation_overlay and formation_overlay.pages:
            PageMerge(template_pdf.pages[1]).add(formation_overlay.pages[0]).render()

        cfa_overlay = _build_cfa_manual_overlay(template_pdf.pages[1], cerfa_contrat)
        if cfa_overlay and cfa_overlay.pages:
            PageMerge(template_pdf.pages[1]).add(cfa_overlay.pages[0]).render()

    # 5bis - ajoute une annexe lisible avec les donnees deja pre-remplies
    summary_pdf = _build_summary_pdf(cerfa_contrat)
    template_pdf.pages.extend(summary_pdf.pages)

    # 6️⃣ Sauvegarde du PDF
    PdfWriter().write(output_path, template_pdf)

    (f"✅ PDF CERFA généré (visible) : {output_path}")
    return output_path
