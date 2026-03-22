// src/components/candidats/CandidatsTable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  Tooltip,
  IconButton,
  Typography,
  Box,
  Chip,
  Link,
} from "@mui/material";
import { useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import type { Candidat } from "../../types/candidat";
import {
  getCandidatBusinessStatusColor,
  getCandidatBusinessStatusLabel,
} from "../../shared/utils/candidatStatus";

/* ================= Helpers ================= */
const dtfFR = typeof Intl !== "undefined" ? new Intl.DateTimeFormat("fr-FR") : undefined;
const STICKY_COL_1_PX = 36;

function fullName(c: Candidat): string {
  if (c.nom_complet && c.nom_complet.trim()) return c.nom_complet;
  return [c.nom, c.prenom].filter(Boolean).join(" ").trim() || "—";
}
function contratChip(value?: string | null) {
  if (!value) return <Typography color="text.disabled">—</Typography>;
  const map: Record<string, { label: string; color: "default" | "warning" | "success" | "info" }> =
    {
      non: { label: "Non", color: "default" },
      en_cours: { label: "En cours", color: "warning" },
      signe: { label: "Signé", color: "info" },
      valide: { label: "Validé", color: "success" },
    };
  const { label, color } = map[value] ?? { label: value, color: "default" };
  return <Chip size="small" color={color} label={label} variant="outlined" />;
}

function formatDateFR(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dtfFR ? dtfFR.format(d) : d.toLocaleDateString("fr-FR");
}
function yesNoChip(v?: boolean) {
  if (typeof v !== "boolean") return <Typography color="text.disabled">—</Typography>;
  return (
    <Chip
      size="small"
      color={v ? "success" : "error"}
      label={v ? "Oui" : "Non"}
      variant="outlined"
    />
  );
}
function stars(v?: number | null): string {
  return typeof v === "number" ? `${v} ★` : "—";
}
function labelOrId(name?: string | null, id?: number | null): string {
  return name && name.trim() ? name : typeof id === "number" ? `#${id}` : "—";
}
function formatFormation(c: Candidat): string {
  const f = c.formation_info;
  if (!f) return typeof c.formation === "number" ? `#${c.formation}` : "—";
  return (f.nom ?? "").trim() || "—";
}
function typeOffreLabel(c: Candidat): string {
  const to = c.formation_info?.type_offre;
  return to?.nom ?? to?.libelle ?? "—";
}
type AppairageLite = {
  partenaire_nom?: string | null;
  statut?: string | null;
  statut_display?: string | null;
  date_appairage?: string | null;
  created_by_nom?: string | null;
  last_commentaire?: string | null;
};
function getLastAppairage(c: Candidat): AppairageLite | null {
  const obj = c as unknown as { last_appairage?: AppairageLite | null };
  return obj.last_appairage ?? null;
}
const CV_MAP: Record<string, string> = {
  oui: "Oui",
  en_cours: "En cours",
  a_modifier: "À modifier",
};
function cvChip(c: Candidat) {
  const label = c.cv_statut_display ?? (c.cv_statut ? (CV_MAP[c.cv_statut] ?? c.cv_statut) : null);
  if (!label) return <Typography color="text.disabled">—</Typography>;
  let color: "default" | "success" | "warning" | "error" = "default";
  if (label === "Oui") color = "success";
  if (label === "En cours") color = "warning";
  if (label === "À modifier") color = "error";
  return <Chip size="small" color={color} label={label} variant="outlined" />;
}

function phaseChip(c: Candidat) {
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

/* ---------- Ateliers compact ---------- */
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
function atelierCountsCompact(c: Candidat, limit = 3): { display: string; title: string } {
  const counts = extractAteliersCounts(c);
  const pairs = AT_KEYS.map((k) => [k, counts[k] ?? 0] as const).filter(([, n]) => n > 0);
  if (pairs.length === 0) return { display: "—", title: "" };
  const full = pairs.map(([k, n]) => `${AT_LABELS[k]}: ${n}`).join(", ");
  const short = pairs
    .slice(0, limit)
    .map(([k, n]) => `${AT_TOKENS[k]}×${n}`)
    .join(" · ");
  const extra = pairs.length > limit ? ` +${pairs.length - limit}` : "";
  return { display: short + extra, title: full };
}

/* ================= Component ================= */
type Props = {
  items: Candidat[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onDelete?: (id: number) => void;
  onRowClick?: (id: number) => void | Promise<void>; // ✅ nouvelle prop optionnelle
  maxHeight?: string;
};

export default function CandidatsTable({
  items,
  selectedIds,
  onSelectionChange,
  onDelete,
  onRowClick, // ✅ ajoute ceci
  maxHeight = "65vh",
}: Props) {
  const navigate = useNavigate();

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const pageIds = useMemo(() => items.map((i) => i.id), [items]);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));
  const someChecked = pageIds.some((id) => selectedSet.has(id)) && !allChecked;

  const headerCbRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggleAllThisPage = useCallback(() => {
    if (allChecked) {
      onSelectionChange(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      const set = new Set(selectedIds);
      for (const id of pageIds) set.add(id);
      onSelectionChange(Array.from(set));
    }
  }, [allChecked, onSelectionChange, pageIds, selectedIds]);

  const toggleOne = useCallback(
    (id: number, checked: boolean) => {
      if (checked) {
        if (!selectedSet.has(id)) onSelectionChange([...selectedIds, id]);
      } else {
        if (selectedSet.has(id)) onSelectionChange(selectedIds.filter((x) => x !== id));
      }
    },
    [onSelectionChange, selectedIds, selectedSet]
  );

  const goEdit = useCallback((id: number) => navigate(`/candidats/${id}/edit`), [navigate]);
  const goShow = useCallback((id: number) => navigate(`/candidats/${id}`), [navigate]);

  if (!items.length) {
    return (
      <Typography sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
        Aucun candidat.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ maxHeight, borderRadius: 2 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell
              padding="checkbox"
              sx={{
                width: STICKY_COL_1_PX,
                textAlign: "center",
                left: 0,
                zIndex: 5,
                bgcolor: "grey.100",
                position: "sticky",
              }}
            >
              <Checkbox inputRef={headerCbRef} checked={allChecked} onChange={toggleAllThisPage} />
            </TableCell>
            <TableCell
              sx={{
                position: "sticky",
                left: STICKY_COL_1_PX,
                zIndex: 4,
                bgcolor: "grey.100",
              }}
            >
              👤 Candidat
            </TableCell>
            <TableCell>🎂 Âge</TableCell>
            <TableCell>📧 Contact</TableCell>
            <TableCell>📍 Localisation</TableCell>
            <TableCell>🎓 Formation complète</TableCell>
            <TableCell>📅 Période</TableCell>
            <TableCell>📃 Contrat</TableCell>
            <TableCell>✍️ Contrat signé</TableCell>
            <TableCell>📌 Statut métier</TableCell>
            <TableCell>📄 CV</TableCell>
            <TableCell>⏳ Disp.</TableCell>
            <TableCell>♿ RQTH</TableCell>
            <TableCell>🚗 Permis B</TableCell>
            <TableCell>🗂️ GESPERS</TableCell>
            <TableCell>💬 Com.</TableCell>
            <TableCell>🛠 Exp.</TableCell>
            <TableCell>⚖️ CSP</TableCell>
            <TableCell>👥 Entretien</TableCell>
            <TableCell>🧪 Test</TableCell>
            <TableCell>📝 Inscription</TableCell>
            <TableCell>🎂 Naissance</TableCell>
            <TableCell>🔗 Appairages</TableCell>
            <TableCell>📊 Prospections</TableCell>
            <TableCell>🏢 Partenaire</TableCell>
            <TableCell>📌 Statut app.</TableCell>
            <TableCell>📅 Date app.</TableCell>
            <TableCell>🌐 Origine</TableCell>
            <TableCell>✍️ Créé par</TableCell>
            <TableCell>💬 Dernier comm.</TableCell>
            <TableCell>📨 Courrier rentrée</TableCell>
            <TableCell>📅 Date rentrée</TableCell>
            <TableCell>👀 Vu par</TableCell>
            <TableCell>📚 Ateliers</TableCell>
            <TableCell>🆔 OSIA</TableCell>
            <TableCell>⚙️ Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {items.map((c) => {
            const name = fullName(c);
            const isChecked = selectedSet.has(c.id);
            const la = getLastAppairage(c);
            const { display: ateliersDisplay, title: ateliersTitle } = atelierCountsCompact(c);

            return (
              <TableRow
                key={c.id}
                hover
                tabIndex={0}
                onClick={() => {
                  if (onRowClick) onRowClick(c.id);
                  else goEdit(c.id); // fallback si onRowClick non fourni
                }}
                sx={{
                  cursor: "pointer",
                  "&:nth-of-type(even)": { bgcolor: "grey.50" },
                }}
              >
                {/* Sélection */}
                <TableCell
                  sx={{
                    width: STICKY_COL_1_PX,
                    textAlign: "center",
                    left: 0,
                    position: "sticky",
                    bgcolor: "background.paper",
                    zIndex: 2,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isChecked}
                    onChange={(e) => toggleOne(c.id, e.target.checked)}
                  />
                </TableCell>

                {/* Candidat */}
                <TableCell
                  sx={{
                    position: "sticky",
                    left: STICKY_COL_1_PX,
                    bgcolor: "background.paper",
                    zIndex: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.nom} {c.prenom}
                  </Typography>
                </TableCell>

                <TableCell>{typeof c.age === "number" ? c.age : "—"}</TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  {c.email ? (
                    <Link href={`mailto:${c.email}`} display="block">
                      {c.email}
                    </Link>
                  ) : (
                    <Typography color="text.disabled">—</Typography>
                  )}
                  {c.telephone && (
                    <Link
                      href={`tel:${c.telephone}`}
                      display="block"
                      variant="body2"
                      color="text.secondary"
                    >
                      {c.telephone}
                    </Link>
                  )}
                </TableCell>

                {/* Localisation (ville + CP) */}
                <TableCell>
                  {c.ville || c.code_postal
                    ? `${c.ville ?? ""}${c.ville && c.code_postal ? " (" + c.code_postal + ")" : (c.code_postal ?? "")}`
                    : "—"}
                </TableCell>

                {/* Formation complète */}
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {formatFormation(c)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[
                        c.formation_info?.num_offre,
                        c.formation_info?.centre?.nom,
                        typeOffreLabel(c),
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Période */}
                <TableCell>
                  {c.formation_info?.date_debut || c.formation_info?.date_fin ? (
                    <Typography variant="body2">
                      {[
                        formatDateFR(c.formation_info?.date_debut),
                        formatDateFR(c.formation_info?.date_fin),
                      ]
                        .filter(Boolean)
                        .join(" → ")}
                    </Typography>
                  ) : (
                    <Typography color="text.disabled">—</Typography>
                  )}
                </TableCell>
                {/* Contrat */}
                <TableCell>{c.type_contrat || "—"}</TableCell>
                <TableCell>{contratChip(c.contrat_signe)}</TableCell>
                {/* Statut */}
                <TableCell>{phaseChip(c)}</TableCell>

                <TableCell>{cvChip(c)}</TableCell>
                <TableCell>{c.disponibilite || "—"}</TableCell>
                <TableCell>{yesNoChip(c.rqth)}</TableCell>
                <TableCell>{yesNoChip(c.permis_b)}</TableCell>
                <TableCell>{yesNoChip(c.inscrit_gespers)}</TableCell>
                <TableCell>{stars(c.communication)}</TableCell>
                <TableCell>{stars(c.experience)}</TableCell>
                <TableCell>{stars(c.csp)}</TableCell>
                <TableCell>{yesNoChip(c.entretien_done)}</TableCell>
                <TableCell>{yesNoChip(c.test_is_ok)}</TableCell>
                <TableCell>{formatDateFR(c.date_inscription)}</TableCell>
                <TableCell>{formatDateFR(c.date_naissance)}</TableCell>
                <TableCell>{c.nb_appairages ?? "—"}</TableCell>
                <TableCell>{c.nb_prospections ?? "—"}</TableCell>
                <TableCell>{la?.partenaire_nom ?? "—"}</TableCell>
                <TableCell>{la?.statut_display ?? la?.statut ?? "—"}</TableCell>
                <TableCell>{formatDateFR(la?.date_appairage)}</TableCell>
                <TableCell>{c.origine_sourcing || "—"}</TableCell>
                <TableCell>{la?.created_by_nom ?? "—"}</TableCell>

                {/* Commentaire */}
                <TableCell>
                  {la?.last_commentaire ? (
                    <Box
                      sx={{
                        backgroundColor: (theme) => theme.palette.action.hover,
                        p: 0.6,
                        borderRadius: 1,
                        maxWidth: 260,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {la.last_commentaire}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>

                <TableCell>{yesNoChip(c.courrier_rentree)}</TableCell>
                <TableCell>{formatDateFR(c.date_rentree)}</TableCell>
                <TableCell>{labelOrId(c.vu_par_nom, c.vu_par)}</TableCell>
                <TableCell title={ateliersTitle}>{ateliersDisplay}</TableCell>
                <TableCell>{c.numero_osia || "—"}</TableCell>

                {/* Actions */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="Voir">
                    <IconButton size="small" onClick={() => goShow(c.id)}>
                      <VisibilityIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Éditer">
                    <IconButton size="small" onClick={() => goEdit(c.id)}>
                      <EditIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                  {onDelete && (
                    <Tooltip title="Supprimer">
                      <IconButton size="small" color="error" onClick={() => onDelete(c.id)}>
                        <DeleteIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
