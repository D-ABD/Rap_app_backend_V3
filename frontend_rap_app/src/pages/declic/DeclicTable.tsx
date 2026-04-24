// -----------------------------------------------------------------------------
// 📄 DeclicTable.tsx — ResponsiveTableTemplate + sticky + ligne TOTAL
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  Link,
  Stack,
  TableCell,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";
import type { Declic } from "src/types/declic";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import ResponsiveTableTemplate, {
  type TableColumn,
} from "../../components/ResponsiveTableTemplate";
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

const W_CHECK = 50;
const W_TYPE = 150;
const OFF_TYPE = W_CHECK;
const OFF_DATE = W_CHECK + W_TYPE;
const W_DATE = 100;
const OFF_CENTRE = OFF_DATE + W_DATE;
const W_CENTRE = 200;

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

  const tableHeaderBackground = useMemo(
    () =>
      theme.palette.mode === "light"
        ? theme.custom.table.header.background.light
        : theme.custom.table.header.background.dark,
    [theme]
  );
  const tableHeaderBorder = useMemo(
    () =>
      theme.palette.mode === "light"
        ? theme.custom.table.header.borderBottom.light
        : theme.custom.table.header.borderBottom.dark,
    [theme]
  );

  const goEdit = useCallback(
    (id: number) => (onEdit ? onEdit(id) : navigate(`/declic/${id}/edit`)),
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

  const totalInscrits = items.reduce((s, d) => s + (d.nb_inscrits_declic ?? 0), 0);
  const totalPresents = items.reduce((s, d) => s + (d.nb_presents_declic ?? 0), 0);
  const totalAbsents = items.reduce((s, d) => s + (d.nb_absents_declic ?? 0), 0);
  const totalPresentsAt = totalPresents;
  const totalAbsentsAt = totalAbsents;
  const tauxAtGlobal =
    totalPresentsAt + totalAbsentsAt > 0
      ? ((totalPresentsAt / (totalPresentsAt + totalAbsentsAt)) * 100).toFixed(1)
      : "—";

  const fmt = (v?: number | null) => (v != null ? `${v.toFixed(1)} %` : "—");

  const columns = useMemo<TableColumn<Declic>[]>(
    () => [
      {
        key: "select",
        label: "",
        width: W_CHECK,
        sticky: "left",
        stickyLeftOffsetPx: 0,
        headerRender: () => (
          <Checkbox
            inputRef={headerCbRef}
            indeterminate={someChecked}
            checked={allChecked}
            onChange={toggleAllThisPage}
          />
        ),
        render: (d) => (
          <Box onClick={(e) => e.stopPropagation()} sx={{ display: "inline-flex" }}>
            <Checkbox
              checked={selectedSet.has(d.id)}
              onChange={(e) => toggleOne(d.id, e.target.checked)}
            />
          </Box>
        ),
      },
      {
        key: "type_declic",
        label: "📌 Type",
        width: W_TYPE,
        sticky: "left",
        stickyLeftOffsetPx: OFF_TYPE,
        render: (d) => <Typography fontWeight={600}>{d.type_declic_display}</Typography>,
      },
      {
        key: "date_declic",
        label: "📅 Date",
        width: W_DATE,
        sticky: "left",
        stickyLeftOffsetPx: OFF_DATE,
        render: (d) => (
          <Chip size="small" color="info" label={formatDateFR(d.date_declic)} />
        ),
      },
      {
        key: "centre",
        label: "🏫 Centre",
        width: W_CENTRE,
        sticky: "left",
        stickyLeftOffsetPx: OFF_CENTRE,
        render: (d) =>
          d.centre?.id ? (
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
          ),
      },
      {
        key: "nb_inscrits",
        label: "👤 Inscrits",
        render: (d) => (
          <Chip
            size="small"
            color={d.nb_inscrits_declic ? "info" : "default"}
            label={d.nb_inscrits_declic ?? 0}
          />
        ),
      },
      {
        key: "nb_presents",
        label: "👥 Présents",
        render: (d) => (
          <Chip
            size="small"
            color={d.nb_presents_declic ? "primary" : "default"}
            label={d.nb_presents_declic ?? 0}
          />
        ),
      },
      {
        key: "nb_absents",
        label: "🚫 Absents",
        render: (d) => (
          <Chip
            size="small"
            color={d.nb_absents_declic ? "warning" : "default"}
            label={d.nb_absents_declic ?? 0}
          />
        ),
      },
      {
        key: "presence",
        label: "📈 Présence globale",
        render: (d) => (
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
        ),
      },
    ],
    [
      allChecked,
      someChecked,
      toggleAllThisPage,
      toggleOne,
      selectedSet,
    ]
  );

  const tableBodyFooter = useMemo(
    () => (
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
    ),
    [
      tableHeaderBackground,
      tableHeaderBorder,
      totalAbsents,
      totalInscrits,
      totalPresents,
      tauxAtGlobal,
    ]
  );

  const mobileStackFooter = useMemo(
    () => (
      <Box
        sx={{
          p: 1.5,
          borderRadius: 1,
          border: 1,
          borderColor: "divider",
          bgcolor: tableHeaderBackground,
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          TOTAL (page)
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Typography variant="caption">
            Inscrits : <strong>{totalInscrits}</strong>
          </Typography>
          <Typography variant="caption">
            Présents : <strong>{totalPresents}</strong>
          </Typography>
          <Typography variant="caption">
            Absents : <strong>{totalAbsents}</strong>
          </Typography>
          <Typography variant="caption">
            Taux : <strong>{tauxAtGlobal} %</strong>
          </Typography>
        </Stack>
      </Box>
    ),
    [tableHeaderBackground, totalAbsents, totalInscrits, totalPresents, tauxAtGlobal]
  );

  if (!items.length) {
    return (
      <Typography sx={{ p: 2, color: "text.secondary", textAlign: "center" }}>
        Aucune séance Déclic à afficher.
      </Typography>
    );
  }

  return (
    <ResponsiveTableTemplate<Declic>
      columns={columns}
      data={items}
      getRowId={(d) => d.id}
      onRowClick={onRowClick ? (d) => onRowClick(d.id) : undefined}
      cardTitle={(d) => d.type_declic_display ?? d.type_declic}
      actions={(d) => (
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
      )}
      showActionsColumn
      tableBodyFooter={tableBodyFooter}
      mobileStackFooter={mobileStackFooter}
      containerSx={{
        maxHeight: maxHeight ?? "70vh",
        position: "relative",
      }}
    />
  );
}
