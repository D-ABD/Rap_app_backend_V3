// src/components/export/ExportButtonProspectionComment.tsx
import { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  FormControlLabel,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { toast } from "react-toastify";
import api from "../../api/axios";

export type ProspectionCommentRow = {
  id: number;
  prospection: number;
  partenaire_nom?: string | null;
  formation_nom?: string | null;
  body: string;
  is_internal: boolean;
  created_by_username: string | null;
  created_at: string;
};

type Props = {
  data: ProspectionCommentRow[];
  selectedIds: number[];
  label?: string;
};

export default function ExportButtonProspectionComment({
  data,
  selectedIds,
  label = "⬇️ Exporter",
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [busy, setBusy] = useState(false);

  const total = data?.length ?? 0;
  const selectedCount = selectedIds.length;

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    if (!busy) setShowModal(false);
  };

  const handleExport = async () => {
    if (total === 0) {
      toast.warning("Aucun commentaire à exporter.");
      return;
    }

    try {
      setBusy(true);

      const endpoint =
        format === "xlsx"
          ? "/prospection-commentaires/export-xlsx/"
          : "/prospection-commentaires/export-pdf/";

      const params = includeArchived ? { est_archive: "both" } : undefined;
      const res = await api.get(endpoint, { params, responseType: "blob" });

      const filenameHeader = res.headers["content-disposition"];
      const fallbackName =
        format === "xlsx" ? "prospection_commentaires.xlsx" : "prospection_commentaires.pdf";
      const filename = filenameHeader?.split("filename=")[1]?.replace(/"/g, "") || fallbackName;

      const blob = new Blob([res.data], {
        type:
          format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
      });

      const urlBlob = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = urlBlob;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(urlBlob);

      toast.success(
        `${format.toUpperCase()} prêt · ${
          selectedIds.length > 0 ? selectedIds.length : total
        } commentaire(s) exporté(s)${includeArchived ? " (avec archivés)" : ""}.`
      );
      setShowModal(false);
    } catch (_e) {
      toast.error("Erreur lors de l’export.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        onClick={openModal}
        disabled={busy || total === 0}
        title={
          total === 0
            ? "Aucun commentaire à exporter"
            : `Exporter ${selectedCount || total} commentaire(s)`
        }
      >
        {busy ? "⏳ " : "⬇️ "}
        {label} {selectedCount > 0 ? `(${selectedCount})` : `(${total})`}
      </Button>

      <Dialog open={showModal} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>Exporter les commentaires</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2 }}>
            <Typography fontWeight={600}>Format d’export</Typography>

            <ToggleButtonGroup
              value={format}
              exclusive
              onChange={(_, val) => val && setFormat(val)}
              aria-label="format d’export"
              sx={{ mb: 1 }}
            >
              <ToggleButton value="pdf" aria-label="PDF">
                PDF
              </ToggleButton>
              <ToggleButton value="xlsx" aria-label="Excel">
                Excel
              </ToggleButton>
            </ToggleButtonGroup>

            <FormControlLabel
              control={
                <Switch
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                  color="primary"
                />
              }
              label="Inclure les commentaires archivés"
            />
          </Box>

          {busy && (
            <Typography variant="body2" sx={{ mt: 2 }} aria-live="polite" aria-busy="true">
              ⏳ Export en cours…
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeModal} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={busy} variant="contained" color="primary">
            Exporter en {format.toUpperCase()}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
