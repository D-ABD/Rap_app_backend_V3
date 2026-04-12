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
  useTheme,
} from "@mui/material";
import { useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";
import { Link } from "@mui/material";
import type { Prepa } from "src/types/prepa";
import type { AppTheme } from "src/theme";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";

/* ---------- Helpers ---------- */
const dtfDateFR =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("fr-FR", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
      })
    : undefined;

function formatDateFR(iso?: string | null): string {
  if (!iso) return "—";
  const s = iso.includes("T") ? iso : iso.replace(" ", "T");
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return dtfDateFR ? dtfDateFR.format(d) : d.toLocaleDateString("fr-FR");
}

type Props = {
  items: Prepa[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onToggleArchive?: (id: number, archived: boolean) => void;
  onHardDelete?: (id: number) => void;
  onRowClick?: (id: number) => void;
  maxHeight?: string;
};

export default function PrepaTableAteliers({
  items,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
  onToggleArchive,
  onHardDelete,
  onRowClick,
  maxHeight,
}: Props) {
  const navigate = useNavigate();
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";
  const tableHeaderBackground = isLight
    ? theme.custom.table.header.background.light
    : theme.custom.table.header.background.dark;
  const tableHeaderBorder = isLight
    ? theme.custom.table.header.borderBottom.light
    : theme.custom.table.header.borderBottom.dark;
  const tableRowStripedBackground = isLight
    ? theme.custom.table.row.stripedEven.light
    : theme.custom.table.row.stripedEven.dark;
  const tableCellBorder = isLight
    ? theme.custom.table.cell.borderBottom.light
    : theme.custom.table.cell.borderBottom.dark;

  const goEdit = useCallback(
    (id: number) => (onEdit ? onEdit(id) : navigate(`/prepa/${id}/edit`)),
    [navigate, onEdit]
  );

  /* ---------- Selection logic ---------- */
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
      if (checked && !selectedSet.has(id)) onSelectionChange([...selectedIds, id]);
      if (!checked && selectedSet.has(id)) onSelectionChange(selectedIds.filter((x) => x !== id));
    },
    [onSelectionChange, selectedIds, selectedSet]
  );

  /* ---------- Totaux globaux (ATELIERS) ---------- */
  const totalInscrits = items.reduce((s, d) => s + (d.nb_inscrits_prepa ?? 0), 0);
  const totalPresents = items.reduce((s, d) => s + (d.nb_presents_prepa ?? 0), 0);
  const totalAbsents = items.reduce((s, d) => s + (d.nb_absents_prepa ?? 0), 0);

  const tauxPresenceGlobal =
    totalPresents + totalAbsents > 0
      ? ((totalPresents / (totalPresents + totalAbsents)) * 100).toFixed(1)
      : "—";

  if (!items.length) {
    return (
      <Typography sx={{ p: 2, color: "text.secondary", textAlign: "center" }}>
        Aucun atelier Prépa.
      </Typography>
    );
  }

  const fmt = (v?: number | null) => (v != null ? `${v.toFixed(1)} %` : "—");

  /* ---------- Sticky Column Offsets ---------- */
  const W_CHECK = 50;
  const W_TYPE = 150;
  const W_DATE = 100;
  const W_CENTRE = 200;

  return (
    <TableContainer component={Paper} sx={{ maxHeight: maxHeight ?? "70vh", position: "relative" }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell
              padding="checkbox"
              sx={{
                position: "sticky",
                left: 0,
                zIndex: 10,
                backgroundColor: tableHeaderBackground,
                minWidth: W_CHECK,
                borderBottom: tableHeaderBorder,
              }}
            >
              <Checkbox
                inputRef={headerCbRef}
                indeterminate={someChecked}
                checked={allChecked}
                onChange={toggleAllThisPage}
              />
            </TableCell>

            <TableCell
              sx={{
                position: "sticky",
                left: W_CHECK,
                zIndex: 10,
                backgroundColor: tableHeaderBackground,
                minWidth: W_TYPE,
                borderBottom: tableHeaderBorder,
              }}
            >
              📌 Session
            </TableCell>

            <TableCell
              sx={{
                position: "sticky",
                left: W_CHECK + W_TYPE,
                zIndex: 10,
                backgroundColor: tableHeaderBackground,
                minWidth: W_DATE,
                borderBottom: tableHeaderBorder,
              }}
            >
              📅 Date
            </TableCell>

            <TableCell
              sx={{
                position: "sticky",
                left: W_CHECK + W_TYPE + W_DATE,
                zIndex: 10,
                backgroundColor: tableHeaderBackground,
                minWidth: W_CENTRE,
                borderBottom: tableHeaderBorder,
              }}
            >
              🏫 Centre
            </TableCell>

            {/* Colonnes ATELIER uniquement */}
            <TableCell>👤 Inscrits</TableCell>
            <TableCell>👥 Présents</TableCell>
            <TableCell>🚫 Absents</TableCell>
            <TableCell>📈 Taux présence</TableCell>

            <TableCell>⚙️ Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {items.map((d) => {
            const dateTxt = formatDateFR(d.date_prepa);

            const tauxPresence =
              d.nb_presents_prepa + d.nb_absents_prepa > 0
                ? (d.nb_presents_prepa / (d.nb_presents_prepa + d.nb_absents_prepa)) * 100
                : null;

            return (
              <TableRow
                key={d.id}
                hover
                onClick={() => onRowClick?.(d.id)}
                sx={{
                  cursor: "pointer",
                  "&:nth-of-type(even)": { bgcolor: tableRowStripedBackground },
                }}
              >
                <TableCell
                  padding="checkbox"
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    position: "sticky",
                    left: 0,
                    zIndex: 9,
                    backgroundColor: theme.palette.background.paper,
                    borderBottom: tableCellBorder,
                  }}
                >
                  <Checkbox
                    checked={selectedSet.has(d.id)}
                    onChange={(e) => toggleOne(d.id, e.target.checked)}
                  />
                </TableCell>

                <TableCell
                  sx={{
                    position: "sticky",
                    left: W_CHECK,
                    zIndex: 9,
                    backgroundColor: theme.palette.background.paper,
                    borderBottom: tableCellBorder,
                  }}
                >
                  <Typography fontWeight={600}>{d.type_prepa_display}</Typography>
                </TableCell>

                <TableCell
                  sx={{
                    position: "sticky",
                    left: W_CHECK + W_TYPE,
                    zIndex: 9,
                    backgroundColor: theme.palette.background.paper,
                    borderBottom: tableCellBorder,
                  }}
                >
                  <Chip size="small" color="info" label={dateTxt} />
                </TableCell>

                <TableCell
                  sx={{
                    position: "sticky",
                    left: W_CHECK + W_TYPE + W_DATE,
                    zIndex: 9,
                    backgroundColor: theme.palette.background.paper,
                    borderBottom: tableCellBorder,
                  }}
                >
                  {d.centre?.id ? (
                    <Link
                      component={RouterLink}
                      to={`/prepa/objectifs?centre=${d.centre.id}`}
                      underline="hover"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {d.centre.nom}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>

                {/* Inscrits */}
                <TableCell>
                  <Chip
                    size="small"
                    color={d.nb_inscrits_prepa > 0 ? "info" : "default"}
                    label={d.nb_inscrits_prepa ?? 0}
                  />
                </TableCell>

                {/* Présents */}
                <TableCell>
                  <Chip
                    size="small"
                    color={d.nb_presents_prepa > 0 ? "primary" : "default"}
                    label={d.nb_presents_prepa ?? 0}
                  />
                </TableCell>

                {/* Absents */}
                <TableCell>
                  <Chip
                    size="small"
                    color={d.nb_absents_prepa > 0 ? "warning" : "default"}
                    label={d.nb_absents_prepa ?? 0}
                  />
                </TableCell>

                {/* Taux présence atelier */}
                <TableCell>
                  <Chip
                    size="small"
                    color={tauxPresence != null && tauxPresence >= 70 ? "success" : "warning"}
                    label={fmt(tauxPresence)}
                  />
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small" onClick={() => onRowClick?.(d.id)}>
                      <VisibilityIcon fontSize="inherit" />
                    </IconButton>

                    <IconButton size="small" color="primary" onClick={() => goEdit(d.id)}>
                      <EditIcon fontSize="inherit" />
                    </IconButton>

                    {onDelete && (d.is_active ?? true) && (
                      <IconButton size="small" color="error" onClick={() => onDelete(d.id)}>
                        <DeleteIcon fontSize="inherit" />
                      </IconButton>
                    )}

                    {onToggleArchive && !(d.is_active ?? true) && (
                      <IconButton
                        size="small"
                        color="success"
                        aria-label="Restaurer"
                        onClick={() => onToggleArchive(d.id, true)}
                      >
                        ↩
                      </IconButton>
                    )}

                    {onHardDelete && !(d.is_active ?? true) && (
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Supprimer définitivement"
                        onClick={() => onHardDelete(d.id)}
                      >
                        ✖
                      </IconButton>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}

          {/* ---------- Row TOTAL ---------- */}
          <TableRow
            sx={{
              position: "sticky",
              bottom: 0,
              bgcolor: tableRowStripedBackground,
              borderTop: tableHeaderBorder,
              zIndex: 6,
            }}
          >
            <TableCell />
            <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
              TOTAL
            </TableCell>

            <TableCell>
              <Typography fontWeight={700} color="info.main">
                {totalInscrits.toLocaleString("fr-FR")}
              </Typography>
            </TableCell>

            <TableCell>
              <Typography fontWeight={700} color="primary.main">
                {totalPresents.toLocaleString("fr-FR")}
              </Typography>
            </TableCell>

            <TableCell>
              <Typography fontWeight={700} color="warning.main">
                {totalAbsents.toLocaleString("fr-FR")}
              </Typography>
            </TableCell>

            <TableCell>
              <Typography fontWeight={700} color="success.dark">
                {tauxPresenceGlobal} %
              </Typography>
            </TableCell>

            <TableCell align="center">—</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
