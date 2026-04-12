// -----------------------------------------------------------------------------
// 📄 DeclicTable.tsx — VERSION 100% CORRIGÉE
// -----------------------------------------------------------------------------

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
import type { Declic } from "src/types/declic";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import type { AppTheme } from "../../theme";

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

/* ---------- Component ---------- */
type Props = {
  items: Declic[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onToggleArchive?: (id: number, archived: boolean) => void;
  onHardDelete?: (id: number) => void;
  onRowClick?: (id: number) => void;
  maxHeight?: string;
};

export default function DeclicTable({
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
  const theme = useTheme<AppTheme>();
  const navigate = useNavigate();
  const tableHeaderBackground =
    theme.palette.mode === "light"
      ? theme.custom.table.header.background.light
      : theme.custom.table.header.background.dark;
  const tableHeaderBorder =
    theme.palette.mode === "light"
      ? theme.custom.table.header.borderBottom.light
      : theme.custom.table.header.borderBottom.dark;
  const tableRowStripedBackground =
    theme.palette.mode === "light"
      ? theme.custom.table.row.stripedEven.light
      : theme.custom.table.row.stripedEven.dark;

  const goEdit = useCallback(
    (id: number) => (onEdit ? onEdit(id) : navigate(`/declic/${id}/edit`)),
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
      if (checked) {
        if (!selectedSet.has(id)) onSelectionChange([...selectedIds, id]);
      } else {
        if (selectedSet.has(id)) onSelectionChange(selectedIds.filter((x) => x !== id));
      }
    },
    [onSelectionChange, selectedIds, selectedSet]
  );

  /* ---------- Totaux globaux ---------- */

  const totalInscrits = items.reduce((s, d) => s + (d.nb_inscrits_declic ?? 0), 0);

  const totalPresents = items.reduce((s, d) => s + (d.nb_presents_declic ?? 0), 0);

  const totalAbsents = items.reduce((s, d) => s + (d.nb_absents_declic ?? 0), 0);

  /* --- Taux Atelier --- */
  const totalPresentsAt = items.reduce((s, d) => s + (d.nb_presents_declic ?? 0), 0);
  const totalAbsentsAt = items.reduce((s, d) => s + (d.nb_absents_declic ?? 0), 0);

  const tauxAtGlobal =
    totalPresentsAt + totalAbsentsAt > 0
      ? ((totalPresentsAt / (totalPresentsAt + totalAbsentsAt)) * 100).toFixed(1)
      : "—";

  if (!items.length) {
    return (
      <Typography sx={{ p: 2, color: "text.secondary", textAlign: "center" }}>
        Aucune séance Déclic à afficher.
      </Typography>
    );
  }

  const fmt = (v?: number | null) => (v != null ? `${v.toFixed(1)} %` : "—");

  /* ---------- Sticky Column Offsets ---------- */
  const W_CHECK = 50;
  const W_TYPE = 150;
  const W_DATE = 100;
  const W_CENTRE = 200;

  /* ---------- Render ---------- */
  return (
    <TableContainer
      component={Paper}
      sx={{
        maxHeight: maxHeight ?? "70vh",
        position: "relative",
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {/* Sticky 1 : Checkbox */}
            <TableCell
              padding="checkbox"
              sx={{
                position: "sticky",
                left: 0,
                zIndex: 10,
                backgroundColor: "background.paper",
                minWidth: W_CHECK,
                width: W_CHECK,
              }}
            >
              <Checkbox
                inputRef={headerCbRef}
                indeterminate={someChecked}
                checked={allChecked}
                onChange={toggleAllThisPage}
              />
            </TableCell>

            {/* Sticky 2 : Type */}
            <TableCell
              sx={{
                position: "sticky",
                left: W_CHECK,
                zIndex: 10,
                backgroundColor: "background.paper",
                minWidth: W_TYPE,
                width: W_TYPE,
              }}
            >
              📌 Type
            </TableCell>

            {/* Sticky 3 : Date */}
            <TableCell
              sx={{
                position: "sticky",
                left: W_CHECK + W_TYPE,
                zIndex: 10,
                backgroundColor: "background.paper",
                minWidth: W_DATE,
                width: W_DATE,
              }}
            >
              📅 Date
            </TableCell>

            {/* Sticky 4 : Centre */}
            <TableCell
              sx={{
                position: "sticky",
                left: W_CHECK + W_TYPE + W_DATE,
                zIndex: 10,
                backgroundColor: "background.paper",
                minWidth: W_CENTRE,
                width: W_CENTRE,
              }}
            >
              🏫 Centre
            </TableCell>

            {/* Non-sticky columns */}
            <TableCell>👤 Inscrits</TableCell>
            <TableCell>👥 Présents</TableCell>
            <TableCell>🚫 Absents</TableCell>

            <TableCell>📈 Présence globale</TableCell>

            <TableCell>⚙️ Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {items.map((d) => {
            const dateTxt = formatDateFR(d.date_declic);
            const isChecked = selectedSet.has(d.id);

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
                {/* Sticky 1 : Checkbox */}
                <TableCell
                  padding="checkbox"
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    position: "sticky",
                    left: 0,
                    zIndex: 9,
                    backgroundColor: "background.paper",
                    minWidth: W_CHECK,
                    width: W_CHECK,
                  }}
                >
                  <Checkbox
                    checked={isChecked}
                    onChange={(e) => toggleOne(d.id, e.target.checked)}
                  />
                </TableCell>

                {/* Sticky 2 : Type */}
                <TableCell
                  sx={{
                    position: "sticky",
                    left: W_CHECK,
                    zIndex: 9,
                    backgroundColor: "background.paper",
                    minWidth: W_TYPE,
                    width: W_TYPE,
                  }}
                >
                  <Typography fontWeight={600}>{d.type_declic_display}</Typography>
                </TableCell>

                {/* Sticky 3 : Date */}
                <TableCell
                  sx={{
                    position: "sticky",
                    left: W_CHECK + W_TYPE,
                    zIndex: 9,
                    backgroundColor: "background.paper",
                    minWidth: W_DATE,
                    width: W_DATE,
                  }}
                >
                  <Chip size="small" color="info" label={dateTxt} />
                </TableCell>

                {/* Sticky 4 : Centre */}
                <TableCell
                  sx={{
                    position: "sticky",
                    left: W_CHECK + W_TYPE + W_DATE,
                    zIndex: 9,
                    backgroundColor: "background.paper",
                    minWidth: W_CENTRE,
                    width: W_CENTRE,
                  }}
                >
                  {d.centre?.id ? (
                    <Link
                      component={RouterLink}
                      to={`/declic/objectifs?centre=${d.centre.id}`}
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
                    color={d.nb_inscrits_declic ? "info" : "default"}
                    label={d.nb_inscrits_declic ?? 0}
                  />
                </TableCell>

                {/* Présents */}
                <TableCell>
                  <Chip
                    size="small"
                    color={d.nb_presents_declic ? "primary" : "default"}
                    label={d.nb_presents_declic ?? 0}
                  />
                </TableCell>

                {/* Absents */}
                <TableCell>
                  <Chip
                    size="small"
                    color={d.nb_absents_declic ? "warning" : "default"}
                    label={d.nb_absents_declic ?? 0}
                  />
                </TableCell>

                {/* Présence globale */}
                <TableCell>
                  <Chip
                    size="small"
                    color={
                      (d.nb_presents_declic ?? 0) + (d.nb_absents_declic ?? 0) > 0 &&
                      ((d.nb_presents_declic ?? 0) /
                        ((d.nb_presents_declic ?? 0) + (d.nb_absents_declic ?? 0))) *
                        100 >=
                        70
                        ? "success"
                        : "warning"
                    }
                    label={fmt(
                      (d.nb_presents_declic ?? 0) + (d.nb_absents_declic ?? 0) > 0
                        ? ((d.nb_presents_declic ?? 0) /
                            ((d.nb_presents_declic ?? 0) + (d.nb_absents_declic ?? 0))) *
                            100
                        : null
                    )}
                  />
                </TableCell>

                {/* Actions */}
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

          {/* ---------- Total Row ---------- */}
          <TableRow
            sx={{
              position: "sticky",
              bottom: 0,
              bgcolor: tableHeaderBackground,
              borderTop: tableHeaderBorder,
              zIndex: 4,
            }}
          >
            <TableCell />
            <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
              TOTAL
            </TableCell>

            <TableCell>
              <Typography fontWeight={700} color="info.main">
                {totalInscrits}
              </Typography>
            </TableCell>

            <TableCell>
              <Typography fontWeight={700} color="primary.main">
                {totalPresents}
              </Typography>
            </TableCell>

            <TableCell>
              <Typography fontWeight={700} color="warning.main">
                {totalAbsents}
              </Typography>
            </TableCell>

            <TableCell>
              <Typography fontWeight={700} color="warning.dark">
                {tauxAtGlobal} %
              </Typography>
            </TableCell>

            <TableCell align="center">—</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
