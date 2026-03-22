export const STATUT_COLORS = [
  // 🔴 Rouges
  "#E53935", // rouge vif
  "#F28B82", // rouge clair

  // 🟠 Oranges
  "#FB8C00", // orange vif
  "#FFB74D", // orange clair

  // 🟡 Jaunes
  "#FDD835", // jaune
  "#FFF176", // jaune clair

  // 🟢 Verts
  "#43A047", // vert
  "#81C784", // vert clair

  // 🔵 Bleus
  "#1E88E5", // bleu
  "#64B5F6", // bleu clair
  "#0D47A1", // bleu foncé

  // 🟣 Violets
  "#8E24AA", // violet
  "#BA68C8", // violet clair

  // 🟤 Marrons
  "#6D4C41", // marron
  "#A1887F", // marron clair

  // ⚫ / ⚪ Neutres
  "#546E7A", // gris foncé
  "#90A4AE", // gris clair
  "#000000", // noir
  "#FFFFFF", // blanc
];

export function getContrastText(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
