import { useMemo } from "react";
import { Chip, IconButton, Link, Stack, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Link as RouterLink } from "react-router-dom";
import type { StagiairePrepa } from "src/types/prepa";
import ResponsiveTableTemplate, {
  type TableColumn,
} from "../../components/ResponsiveTableTemplate";

type Props = {
  items: StagiairePrepa[];
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
  onEdit,
  onDelete,
  onRestore,
  onHardDelete,
  onRowClick,
}: Props) {
  const columns = useMemo<TableColumn<StagiairePrepa>[]>(
    () => [
      { key: "nom", label: "Nom", render: (item) => item.nom },
      { key: "prenom", label: "Prénom", render: (item) => item.prenom },
      {
        key: "centre",
        label: "Centre",
        render: (item) => item.centre_nom ?? item.centre?.nom ?? "—",
      },
      {
        key: "statut",
        label: "Statut",
        render: (item) => (
          <Chip
            size="small"
            color={
              item.statut_parcours === "abandon"
                ? "error"
                : item.statut_parcours === "parcours_termine"
                  ? "success"
                  : item.statut_parcours === "en_parcours"
                    ? "info"
                    : "default"
            }
            label={item.statut_parcours_display ?? item.statut_parcours ?? "—"}
          />
        ),
      },
      { key: "a1", label: "Atelier 1", render: (item) => boolChip(item.atelier_1_realise) },
      { key: "a3", label: "Atelier 3", render: (item) => boolChip(item.atelier_3_realise) },
      { key: "a4", label: "Atelier 4", render: (item) => boolChip(item.atelier_4_realise) },
      { key: "a5", label: "Atelier 5", render: (item) => boolChip(item.atelier_5_realise) },
      { key: "a6", label: "Atelier 6", render: (item) => boolChip(item.atelier_6_realise) },
      { key: "aautre", label: "Autre", render: (item) => boolChip(item.atelier_autre_realise) },
      {
        key: "count",
        label: "Ateliers faits",
        render: (item) => item.ateliers_realises_count ?? 0,
      },
      {
        key: "dernier",
        label: "Dernier atelier",
        render: (item) => item.dernier_atelier_label ?? "—",
      },
      {
        key: "prepa_origine",
        label: "Prépa d'origine",
        noWrap: false,
        render: (item) =>
          item.prepa_origine_id ? (
            <Link
              component={RouterLink}
              to={`/prepa/stagiaires?prepa_origine=${item.prepa_origine_id}`}
              underline="hover"
              onClick={(e) => e.stopPropagation()}
            >
              {item.prepa_origine_label ?? `Prépa #${item.prepa_origine_id}`}
            </Link>
          ) : (
            "—"
          ),
      },
    ],
    []
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
          {item.id && onHardDelete && !(item.is_active ?? true) ? (
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
