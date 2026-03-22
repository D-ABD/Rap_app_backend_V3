import { Checkbox, IconButton, Tooltip } from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { CerfaContrat } from "../../types/cerfa";
import ResponsiveTableTemplate, { TableColumn } from "../../components/ResponsiveTableTemplate";

/* ---------------------------
   🗓️ Formatage de date natif
---------------------------- */
function formatDate(date?: string | null) {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

interface Props {
  contrats: CerfaContrat[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onRowClick: (id: number) => void;
  onDeleteClick: (id: number) => void;
  onDownloadPdf?: (id: number) => void;
  onEditClick?: (id: number) => void;
}

export default function CerfaTable({
  contrats,
  selectedIds,
  onToggleSelect,
  onRowClick,
  onDeleteClick,
  onDownloadPdf,
  onEditClick,
}: Props) {
  const columns: TableColumn<CerfaContrat>[] = [
    {
      key: "select",
      label: "#",
      sticky: "left",
      width: 50,
      align: "center",
      render: (c) => (
        <Checkbox
          checked={selectedIds.includes(c.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect(c.id)}
        />
      ),
    },
    {
      key: "apprenti_nom_naissance",
      label: "Apprenti",
      sticky: "left",
      width: 200,
      render: (c) => (
        <strong>
          {c.apprenti_prenom} {c.apprenti_nom_naissance}
        </strong>
      ),
    },
    { key: "employeur_nom", label: "Employeur", width: 220 },
    { key: "diplome_vise", label: "Diplôme visé", width: 200 },
    {
      key: "date_conclusion",
      label: "Date conclusion",
      render: (c) => formatDate(c.date_conclusion),
    },

    /* 🟡 Nouvel indicateur pour champs manquants */
    {
      key: "missing_fields",
      label: "⚠️ Incomplet",
      width: 100,
      align: "center",
      render: (c) => {
        const missing = (c as any).missing_fields as string[] | undefined;
        if (Array.isArray(missing) && missing.length > 0) {
          return (
            <Tooltip
              title={
                <>
                  <strong>Champs manquants :</strong>
                  <br />
                  {missing.join(", ")}
                </>
              }
            >
              <WarningAmberIcon color="warning" fontSize="small" />
            </Tooltip>
          );
        }
        return "—";
      },
    },

    {
      key: "pdf_url",
      label: "PDF",
      width: 80,
      align: "center",
      render: (c) =>
        c.pdf_url ? (
          <Tooltip title="Télécharger le PDF">
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                onDownloadPdf?.(c.id);
              }}
            >
              <PictureAsPdfIcon />
            </IconButton>
          </Tooltip>
        ) : (
          "—"
        ),
    },
    {
      key: "created_at",
      label: "Créé le",
      render: (c) => formatDate(c.created_at),
    },
  ];

  return (
    <ResponsiveTableTemplate
      columns={columns}
      data={contrats}
      getRowId={(c) => c.id}
      cardTitle={(c) => `${c.apprenti_prenom} ${c.apprenti_nom_naissance}`}
      actions={(c) => (
        <>
          {/* ✏️ Modifier */}
          {onEditClick && (
            <Tooltip title="Modifier le contrat">
              <IconButton
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick(c.id);
                }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* 🗑️ Supprimer */}
          <Tooltip title="Supprimer le contrat">
            <IconButton
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(c.id);
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </>
      )}
      onRowClick={(c) => onRowClick(c.id)}
    />
  );
}
