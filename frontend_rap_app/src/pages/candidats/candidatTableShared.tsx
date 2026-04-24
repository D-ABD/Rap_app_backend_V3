// Helpers + constantes partagés — CandidatsTable (inchangé fonctionnellement)
import { Chip, Typography } from "@mui/material";
import type { Candidat } from "../../types/candidat";
import {
  getCandidatBusinessStatusColor,
  getCandidatBusinessStatusLabel,
} from "../../shared/utils/candidatStatus";

export const STICKY_COL_1_PX = 36;
export const STICKY_COL_2_LEFT_PX = 36;

const dtfFR =
  typeof Intl !== "undefined" ? new Intl.DateTimeFormat("fr-FR") : undefined;

export function fullName(c: Candidat): string {
  if (c.nom_complet && c.nom_complet.trim()) return c.nom_complet;
  return [c.nom, c.prenom].filter(Boolean).join(" ").trim() || "—";
}

export function contratChip(value?: string | null) {
  if (!value) return <Typography color="text.disabled">—</Typography>;
  const map: Record<string, { label: string; color: "default" | "warning" | "success" | "info" }> = {
    non: { label: "Non", color: "default" },
    en_cours: { label: "En cours", color: "warning" },
    signe: { label: "Signé", color: "info" },
    valide: { label: "Validé", color: "success" },
  };
  const { label, color } = map[value] ?? { label: value, color: "default" };
  return <Chip size="small" color={color} label={label} variant="outlined" />;
}

export function formatDateFR(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dtfFR ? dtfFR.format(d) : d.toLocaleDateString("fr-FR");
}

export function yesNoChip(v?: boolean) {
  if (typeof v !== "boolean")
    return <Typography color="text.disabled">—</Typography>;
  return (
    <Chip
      size="small"
      color={v ? "success" : "error"}
      label={v ? "Oui" : "Non"}
      variant="outlined"
    />
  );
}

export function stars(v?: number | null): string {
  return typeof v === "number" ? `${v} ★` : "—";
}

export function labelOrId(name?: string | null, id?: number | null): string {
  return name && name.trim()
    ? name
    : typeof id === "number"
      ? `#${id}`
      : "—";
}

export function formatFormation(c: Candidat): string {
  const f = c.formation_info;
  if (!f) return typeof c.formation === "number" ? `#${c.formation}` : "—";
  return (f.nom ?? "").trim() || "—";
}

export function typeOffreLabel(c: Candidat): string {
  const to = c.formation_info?.type_offre;
  return to?.nom ?? to?.libelle ?? "—";
}

export function getLinkedAccountId(c: Candidat): number | null {
  const account = c.compte_utilisateur;
  if (typeof account === "number") return account;
  if (account && typeof account === "object" && typeof account.id === "number")
    return account.id;
  return null;
}

type AppairageLite = {
  partenaire_nom?: string | null;
  statut?: string | null;
  statut_display?: string | null;
  date_appairage?: string | null;
  created_by_nom?: string | null;
  last_commentaire?: string | null;
};

export function getLastAppairage(c: Candidat): AppairageLite | null {
  const obj = c as unknown as { last_appairage?: AppairageLite | null };
  return obj.last_appairage ?? null;
}

const CV_MAP: Record<string, string> = {
  oui: "Oui",
  en_cours: "En cours",
  a_modifier: "À modifier",
};

export function cvChip(c: Candidat) {
  const label = c.cv_statut_display ?? (c.cv_statut ? CV_MAP[c.cv_statut] ?? c.cv_statut : null);
  if (!label) return <Typography color="text.disabled">—</Typography>;
  let color: "default" | "success" | "warning" | "error" = "default";
  if (label === "Oui") color = "success";
  if (label === "En cours") color = "warning";
  if (label === "À modifier") color = "error";
  return <Chip size="small" color={color} label={label} variant="outlined" />;
}

export function phaseChip(c: Candidat) {
  const label = getCandidatBusinessStatusLabel(c);
  if (label === "—") return <Typography color="text.disabled">—</Typography>;
  return (
    <Chip
      size="small"
      color={getCandidatBusinessStatusColor(label)}
      label={label}
      variant="outlined"
    />
  );
}

type AtelierKey =
  | "atelier_1"
  | "atelier_2"
  | "atelier_3"
  | "atelier_4"
  | "atelier_5"
  | "atelier_6"
  | "atelier_7"
  | "autre";

const AT_KEYS: AtelierKey[] = [
  "atelier_1",
  "atelier_2",
  "atelier_3",
  "atelier_4",
  "atelier_5",
  "atelier_6",
  "atelier_7",
  "autre",
];

const AT_LABELS: Record<AtelierKey, string> = {
  atelier_1: "Atelier 1",
  atelier_2: "Atelier 2",
  atelier_3: "Atelier 3",
  atelier_4: "Atelier 4",
  atelier_5: "Atelier 5",
  atelier_6: "Atelier 6",
  atelier_7: "Atelier 7",
  autre: "Autre",
};

const AT_TOKENS: Record<AtelierKey, string> = {
  atelier_1: "A1",
  atelier_2: "A2",
  atelier_3: "A3",
  atelier_4: "A4",
  atelier_5: "A5",
  atelier_6: "A6",
  atelier_7: "A7",
  autre: "Autre",
};

function readCount(obj: Record<string, unknown>, key: string): number {
  const v = obj[key];
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function countsFromResume(text: string): Partial<Record<AtelierKey, number>> {
  const s = text.toLowerCase();
  const out: Partial<Record<AtelierKey, number>> = {};
  for (let i = 1; i <= 7; i++) {
    const re = new RegExp(`atelier\\s*${i}\\b`, "g");
    const m = s.match(re);
    if (m && m.length > 0) out[`atelier_${i}` as AtelierKey] = m.length;
  }
  const mAutre = s.match(/\bautre\b/g);
  if (mAutre && mAutre.length > 0) out.autre = mAutre.length;
  return out;
}

function extractAteliersCounts(c: Candidat): Partial<Record<AtelierKey, number>> {
  const obj = c as unknown as Record<string, unknown>;
  const out: Partial<Record<AtelierKey, number>> = {};
  for (const k of AT_KEYS) {
    const n = readCount(obj, `count_${k}`);
    if (n > 0) out[k] = n;
  }
  if (Object.keys(out).length) return out;
  const resume = typeof c.ateliers_resume === "string" ? c.ateliers_resume : "";
  if (resume.trim()) return countsFromResume(resume);
  return {};
}

export function atelierCountsCompact(
  c: Candidat,
  limit = 3
): { display: string; title: string } {
  const counts = extractAteliersCounts(c);
  const pairs = AT_KEYS.map((k) => [k, counts[k] ?? 0] as const).filter(
    ([, n]) => n > 0
  );
  if (pairs.length === 0) return { display: "—", title: "" };
  const full = pairs.map(([k, n]) => `${AT_LABELS[k]}: ${n}`).join(", ");
  const short = pairs
    .slice(0, limit)
    .map(([k, n]) => `${AT_TOKENS[k]}×${n}`)
    .join(" · ");
  const extra = pairs.length > limit ? ` +${pairs.length - limit}` : "";
  return { display: short + extra, title: full };
}
