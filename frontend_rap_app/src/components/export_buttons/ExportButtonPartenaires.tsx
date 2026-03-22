// src/components/export/ExportButtonPartenaires.tsx
import { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
} from "@mui/material";
import { toast } from "react-toastify";
import { Partenaire } from "../../types/partenaire";
import api from "../../api/axios";

type Props = {
  data: Partenaire[];
  label?: string;
};

export default function ExportButtonPartenaires({ data, label = "⬇️ Exporter" }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = data?.length ?? 0;
  const countBadge = total > 0 ? ` (${total})` : "";

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    if (busy) return;
    setShowModal(false);
  };

  const handleExport = async () => {
    if (!data || total === 0) {
      toast.warning("Aucun partenaire à exporter.");
      return;
    }

    try {
      setBusy(true);

      const url = "partenaires/export-xlsx/";
      const res = await api.get(url, { responseType: "blob" });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const filename =
        res.headers["content-disposition"]?.split("filename=")[1]?.replace(/"/g, "") ||
        "partenaires.xlsx";

      const link = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      link.href = urlBlob;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(urlBlob);

      toast.success(`XLSX prêt · ${total} partenaire(s) exporté(s).`);
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
        aria-label={`${label}${countBadge}`}
        title={total === 0 ? "Aucun partenaire à exporter" : `Exporter${countBadge}`}
      >
        {busy ? "⏳ " : "⬇️ "}
        {label}
        {countBadge}
      </Button>

      <Dialog open={showModal} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>Exporter les partenaires</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 1.5 }}>
            <Typography>
              Le fichier sera exporté uniquement au format <strong>Excel (.xlsx)</strong>.
            </Typography>
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
