// ======================================================
// src/pages/commentaires/HtmlRichContent.tsx
// ✅ Affiche correctement les couleurs, surlignages et listes
// même à l’intérieur des composants MUI (ex: TableCell)
// ======================================================

import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { Box } from "@mui/material";

interface Props {
  html: string;
}

export default function HtmlRichContent({ html }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // 🧼 Nettoyage HTML — garde styles inline et balises utiles
  const sanitized = DOMPurify.sanitize(html || "<em>—</em>", {
    ALLOWED_TAGS: [
      "b",
      "i",
      "u",
      "em",
      "strong",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "span",
      "a",
      "blockquote",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "style"],
  });

  // 🎨 Réapplique les styles inline (Quill) de manière fiable
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // Couleur du texte
    root.querySelectorAll<HTMLElement>("[style*='color:']").forEach((el) => {
      const style = el.getAttribute("style") || "";
      const m = style.match(/color\s*:\s*([^;]+)/i);
      if (m) el.style.setProperty("color", m[1].trim(), "important");
    });

    // Couleur de fond (surlignage)
    root.querySelectorAll<HTMLElement>("[style*='background-color']").forEach((el) => {
      const style = el.getAttribute("style") || "";
      const m = style.match(/background-color\s*:\s*([^;]+)/i);
      if (!m) return;

      const color = m[1].trim();
      el.style.setProperty("background-color", color, "important");

      // ✅ Règles pour compatibilité avec MUI / TableCell
      el.style.setProperty("display", "inline-block", "important");
      el.style.setProperty("box-decoration-break", "clone", "important");
      el.style.setProperty("-webkit-box-decoration-break", "clone", "important");
      el.style.setProperty("padding", "0 0.15em", "important");
      el.style.setProperty("border-radius", "2px", "important");
      el.style.setProperty("mix-blend-mode", "normal", "important");
      el.style.setProperty("isolation", "isolate", "important");
      el.style.setProperty("position", "relative", "important");
      el.style.setProperty("z-index", "1", "important");
    });
  }, [sanitized]);

  return (
    <Box
      ref={ref}
      sx={{
        lineHeight: 1.5,
        wordBreak: "break-word",
        "& p": { m: 0, mb: 0.5 },
        "& ul, & ol": { pl: 3, mb: 0.5 },
        "& a": { color: "primary.main", textDecoration: "underline" },
        "& span, & strong, & em": {
          position: "relative",
          zIndex: 1,
        },
      }}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
