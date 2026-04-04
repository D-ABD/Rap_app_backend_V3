"""Helpers de sanitation pour les champs rich text."""

import bleach
from bleach.css_sanitizer import CSSSanitizer


css_sanitizer = CSSSanitizer(
    allowed_css_properties=[
        "color",
        "background-color",
        "font-weight",
        "font-style",
        "text-decoration",
    ]
)


def sanitize_rich_text(value: str | None) -> str:
    """Nettoie un HTML riche en conservant seulement les tags/attributs autorisés."""
    raw = (value or "").strip()
    if not raw:
        return ""

    cleaned = bleach.clean(
        raw,
        tags=[
            "a",
            "b",
            "blockquote",
            "br",
            "em",
            "i",
            "li",
            "ol",
            "p",
            "span",
            "strike",
            "strong",
            "u",
            "ul",
        ],
        attributes={
            "a": ["href", "title", "target", "rel"],
            "span": ["style"],
        },
        protocols=["http", "https", "mailto"],
        strip=True,
        css_sanitizer=css_sanitizer,
    )
    return bleach.linkify(cleaned)
