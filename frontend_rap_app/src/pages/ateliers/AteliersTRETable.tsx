// src/pages/ateliers/AteliersTRETable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  IconButton,
  Stack,
  Paper,
  Chip,
} from "@mui/material";
import { useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { AtelierTRE } from "../../types/ateliersTre";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";

/* ---------- Types ---------- */
type Props = {
  items: AtelierTRE[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onEdit?: (id: number) => void;
  onShow?: (id: number) => void;
  onDelete?: (id: number) => void;
  onRowClick?: (id: number) => void; // ✅ ajouté
  maxHeight?: string;
};

/* ---------- Helpers ---------- */
const dtfDateTimeFR =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("fr-FR", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

function formatDateTimeFR(iso?: string | null): string {
  if (!iso) return "—";
  const s = iso.includes("T") ? iso : iso.replace(" ", "T");
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return dtfDateTimeFR ? dtfDateTimeFR.format(d) : d.toLocaleString("fr-FR");
}

function candidatsPreview(a: AtelierTRE): string {
  const list = a.candidats_detail ?? [];
  if (!list.length) return "—";
  const names = list
    .slice(0, 3)
    .map((c) => c.nom)
    .join(", ");
  const more = list.length > 3 ? ` +${list.length - 3}` : "";
  return `${names}${more}`;
}

/* ---------- Component ---------- */
export default function AteliersTreTable({
  items,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
  onRowClick,
  maxHeight,
}: Props) {
  const navigate = useNavigate();

  const goEdit = useCallback(
    (id: number) => (onEdit ? onEdit(id) : navigate(`/ateliers-tre/${id}/edit`)),
    [navigate, onEdit]
  );

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
      const set = new Set<number>(selectedIds);
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

  if (!items.length) {
    return (
      <Typography sx={{ p: 2, color: "text.secondary", textAlign: "center" }}>
        Aucun atelier.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ maxHeight: maxHeight ?? "65vh" }}>
      <Table stickyHeader size="small" aria-label="Table des ateliers TRE">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                inputRef={headerCbRef}
                indeterminate={someChecked}
                checked={allChecked}
                onChange={toggleAllThisPage}
              />
            </TableCell>
            <TableCell>📌 Atelier</TableCell>
            <TableCell>📅 Date</TableCell>
            <TableCell>🏫 Centre</TableCell>
            <TableCell>👥 Inscrits</TableCell>
            <TableCell>✅ Présents</TableCell>
            <TableCell>👤 Candidats</TableCell>
            <TableCell>⚙️ Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {items.map((a) => {
            const isChecked = selectedSet.has(a.id);
            const typeDisplay = a.type_atelier_display || a.type_atelier;
            const dateTxt = formatDateTimeFR(a.date_atelier);
            const centre = a.centre_detail?.label ?? "—";
            const nbInscrits =
              typeof a.nb_inscrits === "number" ? a.nb_inscrits : (a.candidats?.length ?? 0);
            const nbPresents = a.presence_counts?.present ?? 0;
            const candPrev = candidatsPreview(a);

            return (
              <TableRow
                key={a.id}
                hover
                role="button"
                tabIndex={0}
                title="Cliquer pour voir le détail"
                onClick={() => onRowClick?.(a.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRowClick?.(a.id);
                  }
                }}
                sx={{
                  cursor: "pointer",
                  "&:nth-of-type(even)": { bgcolor: "grey.50" },
                }}
              >
                {/* Checkbox sélection */}
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isChecked}
                    onChange={(e) => toggleOne(a.id, e.target.checked)}
                  />
                </TableCell>

                {/* Atelier */}
                <TableCell>
                  <Typography fontWeight={600}>{typeDisplay}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {a.type_atelier}
                  </Typography>
                </TableCell>

                {/* Date */}
                <TableCell>
                  <Chip size="small" color="info" label={dateTxt} sx={{ fontSize: "0.75rem" }} />
                </TableCell>

                {/* Centre */}
                <TableCell>{centre}</TableCell>

                {/* Inscrits */}
                <TableCell>
                  <Chip
                    size="small"
                    color={nbInscrits > 0 ? "success" : "default"}
                    label={`${nbInscrits} inscrits`}
                  />
                </TableCell>

                {/* Présents */}
                <TableCell>
                  <Chip
                    size="small"
                    color={nbPresents > 0 ? "primary" : "default"}
                    label={`${nbPresents} présents`}
                  />
                </TableCell>

                {/* Candidats */}
                <TableCell>
                  <Typography variant="body2" noWrap title={candPrev}>
                    {candPrev}
                  </Typography>
                </TableCell>

                {/* Actions */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Stack direction="row" spacing={1}>
                    <IconButton aria-label="Voir" size="small" onClick={() => onRowClick?.(a.id)}>
                      <VisibilityIcon fontSize="inherit" />
                    </IconButton>
                    <IconButton
                      aria-label="Éditer"
                      size="small"
                      color="primary"
                      onClick={() => goEdit(a.id)}
                    >
                      <EditIcon fontSize="inherit" />
                    </IconButton>
                    {onDelete && (
                      <IconButton
                        aria-label="Supprimer"
                        size="small"
                        color="error"
                        onClick={() => onDelete(a.id)}
                      >
                        <DeleteIcon fontSize="inherit" />
                      </IconButton>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
