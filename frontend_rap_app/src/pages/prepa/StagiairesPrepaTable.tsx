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
const W_STAGIAIRE = 220;
const W_CENTRE = 190;

const OFF_STAGIAIRE = W_CHECK;
const OFF_CENTRE = W_CHECK + W_STAGIAIRE;

function resolveParcoursStatus(item: StagiairePrepa): {
  label: string;
  color: "default" | "success" | "error" | "warning" | "info" | "secondary";
} {
  if (item.statut_parcours_courant === "termine") {
    return { label: "Parcours terminé", color: "success" };
  }
  if (item.statut_parcours === "abandon") {
    return { label: "Abandon", color: "error" };
  }
  if (item.statut_parcours_courant === "en_attente_repositionnement") {
    return { label: "À repositionner", color: "secondary" };
  }
  if (item.statut_parcours_courant === "en_attente_bilan") {
    return { label: "En attente bilan", color: "warning" };
  }
  if (item.statut_parcours_courant === "en_attente_suite") {
    return { label: "En attente d'atelier", color: "info" };
  }
  return { label: "En attente de parcours", color: "default" };
}

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
  const selectableItems = useMemo(
    () => items.filter((item) => typeof item.id === "number"),
    [items]
  );

  const selectedCount = useMemo(
    () =>
      selectableItems.filter(
        (item) => item.id && selectedIds.includes(item.id)
      ).length,
    [selectableItems, selectedIds]
  );

  const allSelected =
    selectableItems.length > 0 &&
    selectedCount === selectableItems.length;

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

      {
        key: "stagiaire",
        label: "Stagiaire",
        width: W_STAGIAIRE,
        sticky: "left",
        stickyLeftOffsetPx: OFF_STAGIAIRE,
        render: (item) => {
          const status = resolveParcoursStatus(item);
          return (
          <Stack spacing={0.75}>
            <Typography variant="body2" fontWeight={700}>
              {`${item.nom ?? ""} ${item.prenom ?? ""}`.trim() || "—"}
            </Typography>
            <Chip
              size="small"
              sx={{ alignSelf: "flex-start" }}
              color={status.color}
              label={status.label}
            />
          </Stack>
        );
        },
      },

      {
        key: "centre",
        label: "Centre",
        width: W_CENTRE,
        sticky: "left",
        stickyLeftOffsetPx: OFF_CENTRE,
        render: (item) =>
          item.centre_nom ?? item.centre?.nom ?? "—",
      },

      {
        key: "date_ic",
        label: "IC d'origine",
        render: (item) =>
          item.date_ic
            ? new Date(item.date_ic).toLocaleDateString("fr-FR")
            : item.prepa_origine_label?.match(/IC du (\d{2}\/\d{2}\/\d{4})/)?.[1] ?? "—",
      },

      {
        key: "prochain",
        label: "Prochaine étape",
        render: (item) =>
          item.prochain_atelier_prevu_display ??
          item.prochain_atelier_prevu ??
          item.action_suivante_recommandee?.label ??
          item.prochain_etape_display ??
          item.prochain_atelier_attendu_display ??
          item.prochain_etape ??
          item.prochain_atelier_attendu ??
          "—",
      },

      {
        key: "derniere_etape",
        label: "Dernière étape",
        render: (item) => (
          <Stack spacing={0.5}>
            <Typography variant="body2">
              {item.derniere_etape?.label ??
                item.dernier_atelier_label ??
                "—"}
            </Typography>
            {item.derniere_etape?.date ||
            item.dernier_atelier_date ? (
              <Typography
                variant="caption"
                color="text.secondary"
              >
                {new Date(
                  item.derniere_etape?.date ??
                    item.dernier_atelier_date ??
                    ""
                ).toLocaleDateString("fr-FR")}
              </Typography>
            ) : null}
          </Stack>
        ),
      },

      {
        key: "derniere_presence",
        label: "Dernière présence",
        render: (item) => (
          <Stack spacing={0.5}>
            <Typography variant="body2">
              {item.derniere_presence_reelle
                ?.type_prepa_display ?? "—"}
            </Typography>
            {item.derniere_presence_reelle?.date ? (
              <Typography
                variant="caption"
                color="text.secondary"
              >
                {new Date(
                  item.derniere_presence_reelle.date
                ).toLocaleDateString("fr-FR")}
              </Typography>
            ) : null}
          </Stack>
        ),
      },

      {
        key: "count",
        label: "Ateliers réalisés",
        render: (item) => item.ateliers_realises_count ?? 0,
      },

      {
        key: "orientation",
        label: "Orientation",
        render: (item) =>
          item.orientation_finale_display ??
          item.orientation_finale ??
          "—",
      },

      {
        key: "pilotage",
        label: "Action / pilotage",
        render: (item) => {
          if (item.action_suivante_recommandee?.label) {
            return item.action_suivante_recommandee.label;
          }
          if (item.statut_parcours_courant === "en_attente_bilan")
            return "Ouvrir le bilan";
          if (
            item.statut_parcours_courant ===
            "en_attente_repositionnement"
          )
            return "Repositionner";
          if (item.statut_parcours_courant === "en_attente_suite")
            return "Décider de la suite du parcours";
          if (item.statut_parcours_courant === "termine")
            return "Parcours terminé";
          if (item.statut_parcours === "abandon")
            return "Abandon";
          return "En attente de démarrage";
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
      getRowId={(item) =>
        item.id ?? `tmp-${item.nom}-${item.prenom}`
      }
      onRowClick={
        onRowClick
          ? (item) => {
              if (item.id) onRowClick(item.id);
            }
          : undefined
      }
      cardTitle={(item) =>
        `${item.nom} ${item.prenom}`.trim() || "Stagiaire"
      }
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
