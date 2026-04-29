import { useMemo } from "react";
import { Checkbox, Chip, IconButton, Stack, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import VisibilityIcon from "@mui/icons-material/Visibility";
import type { StagiairePrepa } from "src/types/prepa";
import ResponsiveTableTemplate, {
  type TableColumn,
} from "../../components/ResponsiveTableTemplate";

const W_CHECK = 56;
const W_NOM = 160;
const W_PRENOM = 150;
const W_CENTRE = 190;
const W_STATUT = 150;
const OFF_NOM = W_CHECK;
const OFF_PRENOM = W_CHECK + W_NOM;
const OFF_CENTRE = W_CHECK + W_NOM + W_PRENOM;
const OFF_STATUT = W_CHECK + W_NOM + W_PRENOM + W_CENTRE;

type Props = {
  items: StagiairePrepa[];
  selectedIds?: number[];
  onToggleSelect?: (id: number, checked: boolean) => void;
  onToggleSelectAll?: (checked: boolean) => void;
  canHardDelete?: boolean;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onRestore?: (id: number) => void;
  onHardDelete?: (id: number) => void;
  onRowClick?: (id: number) => void;
};

const boolChip = (value?: boolean) => (
  <Chip size="small" color={value ? "success" : "default"} label={value ? "Oui" : "Non"} />
);

export default function StagiairesPrepaTable({
  items,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  canHardDelete = false,
  onEdit,
  onDelete,
  onRestore,
  onHardDelete,
  onRowClick,
}: Props) {
  const selectableItems = useMemo(() => items.filter((item) => typeof item.id === "number"), [items]);
  const selectedCount = useMemo(
    () => selectableItems.filter((item) => item.id && selectedIds.includes(item.id)).length,
    [selectableItems, selectedIds]
  );
  const allSelected = selectableItems.length > 0 && selectedCount === selectableItems.length;
  const partiallySelected = selectedCount > 0 && !allSelected;

  const columns = useMemo<TableColumn<StagiairePrepa>[]>(
    () => [
      {
        key: "select",
        label: "",
        width: 56,
        sticky: "left",
        stickyLeftOffsetPx: 0,
        align: "center",
        render: (item) =>
          item.id && onToggleSelect ? (
            <Checkbox
              size="small"
              checked={selectedIds.includes(item.id)}
              onClick={(e) => e.stopPropagation()}
              onChange={(_, checked) => onToggleSelect(item.id!, checked)}
            />
          ) : null,
        headerRender: onToggleSelectAll
          ? () => (
              <Checkbox
                size="small"
                checked={allSelected}
                indeterminate={partiallySelected}
                onChange={(_, checked) => onToggleSelectAll(checked)}
              />
            )
          : undefined,
      },
      { key: "nom", label: "Nom", width: W_NOM, sticky: "left", stickyLeftOffsetPx: OFF_NOM, render: (item) => item.nom },
      {
        key: "prenom",
        label: "Prénom",
        width: W_PRENOM,
        sticky: "left",
        stickyLeftOffsetPx: OFF_PRENOM,
        render: (item) => item.prenom,
      },
      {
        key: "centre",
        label: "Centre",
        width: W_CENTRE,
        sticky: "left",
        stickyLeftOffsetPx: OFF_CENTRE,
        render: (item) => item.centre_nom ?? item.centre?.nom ?? "—",
      },
      {
        key: "statut",
        label: "Statut",
        width: W_STATUT,
        sticky: "left",
        stickyLeftOffsetPx: OFF_STATUT,
        render: (item) => (
          <Chip
            size="small"
            color={
              item.statut_parcours_calcule === "abandon"
                ? "error"
                : item.statut_parcours_calcule === "parcours_termine"
                  ? "success"
                  : item.statut_parcours_calcule === "en_parcours"
                    ? "info"
                    : "default"
            }
            label={item.statut_parcours_calcule_display ?? item.statut_parcours_calcule ?? "—"}
          />
        ),
      },
      {
        key: "date_ic",
        label: "Date IC",
        render: (item) =>
          item.date_ic ? new Date(item.date_ic).toLocaleDateString("fr-FR") : "—",
      },
      {
        key: "prochain",
        label: "Prochain attendu",
        render: (item) => item.prochain_atelier_attendu_display ?? item.prochain_atelier_attendu ?? "—",
      },
      {
        key: "encours",
        label: "Atelier en cours",
        render: (item) => (
          <Stack spacing={0.5}>
            <Typography variant="body2">
              {item.atelier_en_cours_display ?? item.atelier_en_cours ?? "—"}
            </Typography>
            {item.dernier_statut_participation_liberant ? (
              <Chip
                size="small"
                color={item.dernier_statut_participation === "a_repositionner" ? "warning" : "primary"}
                label={item.dernier_statut_participation === "a_repositionner" ? "Libéré pour repositionnement" : "Libéré pour atelier suivant"}
              />
            ) : null}
          </Stack>
        ),
      },

      { key: "a1", label: "AT1 réalisé", render: (item) => boolChip(item.atelier_1_realise) },
      { key: "a3", label: "AT3 réalisé", render: (item) => boolChip(item.atelier_3_realise) },
      { key: "a4", label: "AT4 réalisé", render: (item) => boolChip(item.atelier_4_realise) },
      { key: "a5", label: "AT5 réalisé", render: (item) => boolChip(item.atelier_5_realise) },
      { key: "a6", label: "AT6 réalisé", render: (item) => boolChip(item.atelier_6_realise) },
      { key: "aautre", label: "Autre AT réalisé", render: (item) => boolChip(item.atelier_autre_realise) },
      {
        key: "count",
        label: "Nombre Ateliers faits",
        render: (item) => item.ateliers_realises_count ?? 0,
      },

      {
        key: "orientation",
        label: "Orientation",
        render: (item) => item.orientation_finale_display ?? item.orientation_finale ?? "—",
      },
      {
        key: "pilotage",
        label: "Pilotage",
        noWrap: false,
        render: (item) => {
          const labels = [];

          if (item.est_a_integrer_atelier_1) labels.push("À intégrer AT1");
          if (item.est_en_attente_prochain_atelier) labels.push("En attente atelier suivant");
          if (item.dernier_statut_participation === "a_repositionner") labels.push("À reprogrammer");
          if (labels.length) return labels.join(" • ");
          if (item.statut_parcours_calcule === "en_parcours") return "En parcours actif";
          if (item.statut_parcours_calcule === "parcours_termine") return "Parcours terminé";
          if (item.statut_parcours_calcule === "abandon") return "Abandon";
          return "Suivi standard";
        },
      },

    ],
    [allSelected, onToggleSelect, onToggleSelectAll, partiallySelected, selectedIds]
  );

  if (!items.length) {
    return (
      <Typography sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
        Aucun stagiaire Prépa trouvé.
      </Typography>
    );
  }

  return (
    <ResponsiveTableTemplate<StagiairePrepa>
      columns={columns}
      data={items}
      getRowId={(item) => item.id ?? `tmp-${item.nom}-${item.prenom}`}
      onRowClick={
        onRowClick
          ? (item) => {
              if (item.id) onRowClick(item.id);
            }
          : undefined
      }
      cardTitle={(item) => `${item.nom} ${item.prenom}`.trim() || "Stagiaire"}
      actions={(item) => (
        <Stack direction="row" spacing={1}>
          {item.id ? (
            <IconButton size="small" onClick={() => onRowClick?.(item.id!)}>
              <VisibilityIcon fontSize="inherit" />
            </IconButton>
          ) : null}
          {item.id && onEdit ? (
            <IconButton size="small" color="primary" onClick={() => onEdit(item.id!)}>
              <EditIcon fontSize="inherit" />
            </IconButton>
          ) : null}
          {item.id && onDelete && (item.is_active ?? true) ? (
            <IconButton size="small" color="error" onClick={() => onDelete(item.id!)}>
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          ) : null}
          {item.id && onRestore && !(item.is_active ?? true) ? (
            <IconButton size="small" color="success" onClick={() => onRestore(item.id!)}>
              <RestoreFromTrashIcon fontSize="inherit" />
            </IconButton>
          ) : null}
          {item.id && canHardDelete && onHardDelete && !(item.is_active ?? true) ? (
            <IconButton size="small" color="error" onClick={() => onHardDelete(item.id!)}>
              <BlockIcon fontSize="inherit" />
            </IconButton>
          ) : null}
        </Stack>
      )}
      showActionsColumn
    />
  );
}
