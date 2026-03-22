// ======================================================
// src/components/export/ExportButtonCommentaires.tsx
// Bouton d’export PDF / XLSX avec option “Inclure les archivés”
// ======================================================

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
} from "@mui/material";
import { toast } from "react-toastify";
import api from "../../api/axios";
import ExportSelect from "./ExportSelect";
import { ExportFormat } from "../../types/export";

export type CommentaireRow = {
  id: number;
  formation_nom?: string | null;
  centre_nom?: string | null;
  num_offre?: string | null;
  type_offre?: string | null;
  statut?: string | null;
  saturation_formation?: number | null;
  contenu: string;
  auteur?: string | null;
  created_at: string;
};

type Props = {
  data: CommentaireRow[];
  selectedIds?: number[];
  label?: string;
};

export default function ExportButtonCommentaires({
  data,
  selectedIds = [],
  label = "⬇️ Exporter",
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = data?.length ?? 0;
  const selectedCount = selectedIds.length;

  const openModal = () => {
    setScope(selectedCount > 0 ? "selected" : "all");
    setShowModal(true);
  };
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

      const baseUrl = `/commentaires/export/`;
      const params = includeArchived ? { include_archived: true } : undefined;
      let res;

      if (scope === "selected" && selectedCount > 0) {
        res = await api.post(
          baseUrl,
          { ids: selectedIds, format: exportFormat },
          { params, responseType: "blob" }
        );
      } else {
        res = await api.post(
          baseUrl,
          { all: true, format: exportFormat },
          { params, responseType: "blob" }
        );
      }

      const blob = new Blob([res.data], {
        type:
          exportFormat === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const filename =
        res.headers["content-disposition"]?.split("filename=")[1]?.replace(/"/g, "") ||
        `commentaires.${exportFormat}`;

      const link = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      link.href = urlBlob;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(urlBlob);

      toast.success(
        `${exportFormat.toUpperCase()} prêt · ${
          scope === "selected" && selectedCount > 0 ? selectedCount : total
        } commentaire(s) exporté(s)${includeArchived ? " (avec archivés)" : ""}.`
      );
      setShowModal(false);
    } catch (_e) {
      toast.error("Erreur lors de l’export des commentaires.");
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
            <Box>
              <Typography fontWeight={600}>Format d’export</Typography>
              <ExportSelect
                value={exportFormat}
                onChange={(v) => setExportFormat(v)}
                options={["pdf", "xlsx"]}
              />
            </Box>

            {selectedCount > 0 && (
              <Box>
                <Typography fontWeight={600}>Portée</Typography>
                <RadioGroup
                  row
                  value={scope}
                  onChange={(e) => setScope(e.target.value as "all" | "selected")}
                >
                  <FormControlLabel value="all" control={<Radio />} label={`Tout (${total})`} />
                  <FormControlLabel
                    value="selected"
                    control={<Radio />}
                    label={`Seulement la sélection (${selectedCount})`}
                  />
                </RadioGroup>
              </Box>
            )}

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
