// ======================================================
// src/utils/registerQuillFormats.ts
// Patch global Quill : texte riche complet
// (list support + expose window.Quill)
// ======================================================

import Quill from "quill";
import { getTheme } from "../theme";

/* ---------- Base Inline ---------- */
const Inline = (Quill as any).import("blots/inline");

/* ---------- Couleur du texte ---------- */
class ColorStyle extends Inline {
  static create(value: string) {
    const node = super.create() as HTMLElement;
    node.style.color = value;
    return node;
  }
  static formats(node: HTMLElement) {
    return node.style.color;
  }
}
(ColorStyle as any).blotName = "color";
(ColorStyle as any).tagName = "span";

/* ---------- Couleur de fond (surlignage) ---------- */
class BackgroundStyle extends Inline {
  static create(value: string) {
    const node = super.create() as HTMLElement;
    node.style.backgroundColor = value;
    return node;
  }
  static formats(node: HTMLElement) {
    return node.style.backgroundColor;
  }
}
(BackgroundStyle as any).blotName = "background";
(BackgroundStyle as any).tagName = "span";

/* ---------- Texte barré ---------- */
class StrikeStyle extends Inline {
  static create() {
    const node = super.create() as HTMLElement;
    node.style.textDecoration = "line-through";
    return node;
  }
  static formats() {
    return true;
  }
}
(StrikeStyle as any).blotName = "strike";
(StrikeStyle as any).tagName = "s";

/* ---------- Texte souligné ---------- */
class UnderlineStyle extends Inline {
  static create() {
    const node = super.create() as HTMLElement;
    node.style.textDecoration = "underline";
    return node;
  }
  static formats() {
    return true;
  }
}
(UnderlineStyle as any).blotName = "underline";
(UnderlineStyle as any).tagName = "u";

/* ---------- Enregistrement global ---------- */
(Quill as any).register(ColorStyle, true);
(Quill as any).register(BackgroundStyle, true);
(Quill as any).register(StrikeStyle, true);
(Quill as any).register(UnderlineStyle, true);

/* ---------- (Optionnel) garder <p> comme bloc par défaut ---------- */
// const Block = (Quill as any).import("blots/block");
// (Block as any).tagName = "P";
// (Quill as any).register(Block, true);

/* ---------- Palette de couleurs étendue ----------
 * Exception produit (Lot 9) : la barre Quill expose une grille riche pour le contenu
 * saisi par l’utilisateur. Les entrées canoniques `getTheme(...).custom.editor.quill.*`
 * sont injectées là où elles existent ; les hex restants restent volontaires pour ne pas
 * réduire le preset éditorial sans décision produit dédiée.
 * ---------- */
const editorQuill = getTheme("light").custom.editor.quill;

export const colorOptions = [
  editorQuill.black,
  "#444444",
  "#666666",
  "#999999",
  "#cccccc",
  "#eeeeee",
  editorQuill.white,
  "#ff0000",
  editorQuill.red,
  "#cc0000",
  "#990000",
  "#660000",
  "#330000",
  editorQuill.orange,
  editorQuill.yellow,
  "#ffff00",
  "#99cc00",
  "#66cc00",
  "#339900",
  "#00cc00",
  "#00cc66",
  "#00cc99",
  "#00cccc",
  "#0099cc",
  editorQuill.blue,
  "#003399",
  "#0000cc",
  "#6600cc",
  editorQuill.purple,
  "#cc00cc",
  "#cc0099",
  "#cc0066",
  "#cc0033",
  editorQuill.green,
];

/* ---------- Modules de base ---------- */
export const defaultModules = {
  toolbar: [
    ["bold", "italic", "underline", "strike"],
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    [{ align: [] }],
    ["blockquote", "code-block"],
    [{ color: colorOptions }, { background: colorOptions }],
    ["link", "image", "video"],
    ["clean"],
  ],
  clipboard: { matchVisual: false },
  history: { delay: 1500, maxStack: 100, userOnly: true },
};

/* ---------- Formats autorisés ---------- */
export const defaultFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "code-block",
  "list",
  "indent",
  "align",
  "link",
  "image",
  "video",
  "script",
  "color",
  "background",
];

/* ---------- Expose patched Quill to react-quilljs ---------- */
if (typeof window !== "undefined") {
  (window as any).Quill = Quill;
}

export default Quill;
