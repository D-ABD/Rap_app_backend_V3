// src/components/export/ExportButtonAppairageComment.tsx
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
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { toast } from "react-toastify";
import api from "../../api/axios";
import ExportSelect from "./ExportSelect";
import { ExportFormat } from "../../types/export";

/** Aligné sur AppairageCommentSerializer (lecture) */
export type AppairageCommentRow = {
  id: number;
  appairage: number;
  partenaire_nom?: string | null;
  candidat_nom?: string | null;
  body: string;
  created_by_username: string | null;
  created_at: string;
};

type Props = {
  data: AppairageCommentRow[];
  selectedIds: number[];
  label?: string;
};

export default function ExportButtonAppairageComment({
  data,
  selectedIds,
  label = "⬇️ Exporter",
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = data?.length ?? 0;
  const selectedCount = selectedIds.length;

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    if (busy) return;
    setShowModal(false);
  };

  const handleExport = async () => {
    if (total === 0) {
      toast.warning("Aucun commentaire à exporter.");
      return;
    }

    try {
      setBusy(true);

      const url = `/appairage-commentaires/export-${exportFormat}/`;
      const params = includeArchived ? { include_archived: true } : undefined;

      let res;
      if (selectedIds.length > 0) {
        res = await api.post(url, { ids: selectedIds }, { params, responseType: "blob" });
      } else {
        res = await api.get(url, { params, responseType: "blob" });
      }

      const contentType =
        res.headers["content-type"] ||
        (exportFormat === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      const filename =
        res.headers["content-disposition"]?.split("filename=")[1]?.replace(/"/g, "") ||
        `commentaires_appairage.${exportFormat}`;

      const blob = new Blob([res.data], { type: contentType });
      const urlBlob = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = urlBlob;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(urlBlob);

      toast.success(
        `${exportFormat.toUpperCase()} prêt · ${
          selectedCount > 0 ? selectedCount : total
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
        startIcon={<DownloadIcon />}
        title={
          total === 0
            ? "Aucun commentaire à exporter"
            : selectedCount > 0
              ? `Exporter les ${selectedCount} sélection(s)`
              : `Exporter les ${total} commentaire(s) visibles`
        }
      >
        {busy ? "⏳ " : "⬇️ "}
        {label} {selectedCount > 0 ? `(${selectedCount})` : `(${total})`}
      </Button>

      <Dialog open={showModal} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>Exporter les commentaires</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2 }}>
            <Box>
              <Typography fontWeight={600}>Format d’export</Typography>
              <ExportSelect
                value={exportFormat}
                onChange={(v) => setExportFormat(v)}
                options={["pdf", "xlsx"]}
              />
            </Box>

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
            Exporter
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
