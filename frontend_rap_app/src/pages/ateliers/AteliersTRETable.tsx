// src/pages/ateliers/AteliersTRETable.tsx
import { useEffect, useMemo, useRef, useCallback } from "react";
import { Box, Checkbox, Chip, IconButton, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import ResponsiveTableTemplate, {
  type TableColumn,
} from "../../components/ResponsiveTableTemplate";
import type { AtelierTRE } from "../../types/ateliersTre";

/* ---------- Types ---------- */
type Props = {
  items: AtelierTRE[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onEdit?: (id: number) => void;
  onShow?: (id: number) => void;
  onDelete?: (id: number) => void;
  onRowClick?: (id: number) => void;
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

/* ---------- Composant ---------- */
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

  const columns = useMemo<TableColumn<AtelierTRE>[]>(
    () => [
      {
        key: "select",
        label: "",
        width: 48,
        headerRender: () => (
          <Checkbox
            inputRef={headerCbRef}
            indeterminate={someChecked}
            checked={allChecked}
            onChange={toggleAllThisPage}
          />
        ),
        render: (a) => (
          <Box onClick={(e) => e.stopPropagation()} sx={{ display: "inline-flex" }}>
            <Checkbox
              checked={selectedIds.includes(a.id)}
              onChange={(e) => toggleOne(a.id, e.target.checked)}
            />
          </Box>
        ),
      },
      {
        key: "type_atelier",
        label: "📌 Atelier",
        noWrap: false,
        render: (a) => (
          <Box>
            <Typography fontWeight={600}>
              {a.type_atelier_display || a.type_atelier}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {a.type_atelier}
            </Typography>
          </Box>
        ),
      },
      {
        key: "date_atelier",
        label: "📅 Date",
        render: (a) => (
          <Chip
            size="small"
            color="info"
            label={formatDateTimeFR(a.date_atelier)}
            sx={{ fontSize: "0.75rem" }}
          />
        ),
      },
      {
        key: "centre",
        label: "🏫 Centre",
        render: (a) => a.centre_detail?.label ?? "—",
      },
      {
        key: "nb_inscrits",
        label: "👥 Inscrits",
        render: (a) => {
          const nbInscrits =
            typeof a.nb_inscrits === "number" ? a.nb_inscrits : (a.candidats?.length ?? 0);
          return (
            <Chip
              size="small"
              color={nbInscrits > 0 ? "success" : "default"}
              label={`${nbInscrits} inscrits`}
            />
          );
        },
      },
      {
        key: "nb_presents",
        label: "✅ Présents",
        render: (a) => {
          const nbPresents = a.presence_counts?.present ?? 0;
          return (
            <Chip
              size="small"
              color={nbPresents > 0 ? "primary" : "default"}
              label={`${nbPresents} présents`}
            />
          );
        },
      },
      {
        key: "candidats",
        label: "👤 Candidats",
        render: (a) => {
          const candPrev = candidatsPreview(a);
          return (
            <Typography variant="body2" noWrap title={candPrev}>
              {candPrev}
            </Typography>
          );
        },
      },
    ],
    [
      allChecked,
      selectedIds,
      someChecked,
      toggleAllThisPage,
      toggleOne,
    ]
  );

  if (!items.length) {
    return (
      <Typography sx={{ p: 2, color: "text.secondary", textAlign: "center" }}>
        Aucun atelier.
      </Typography>
    );
  }

  return (
    <ResponsiveTableTemplate<AtelierTRE>
      columns={columns}
      data={items}
      getRowId={(a) => a.id}
      onRowClick={onRowClick ? (a) => onRowClick(a.id) : undefined}
      onRowKeyDown={
        onRowClick
          ? (e, a) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onRowClick(a.id);
              }
            }
          : undefined
      }
      rowHintTitle="Cliquer pour voir le détail"
      cardTitle={(a) => a.type_atelier_display || a.type_atelier || "Atelier"}
      actions={(a) => (
        <Stack direction="row" spacing={1}>
          <IconButton aria-label="Voir" size="small" onClick={() => onRowClick?.(a.id)}>
            <VisibilityIcon fontSize="inherit" />
          </IconButton>
          <IconButton aria-label="Éditer" size="small" color="primary" onClick={() => goEdit(a.id)}>
            <EditIcon fontSize="inherit" />
          </IconButton>
          {onDelete && (
            <IconButton aria-label="Archiver" size="small" color="error" onClick={() => onDelete(a.id)}>
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          )}
        </Stack>
      )}
      showActionsColumn
      containerSx={{ maxHeight: maxHeight ?? "65vh" }}
    />
  );
}
