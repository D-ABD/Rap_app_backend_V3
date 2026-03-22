// -----------------------------------------------------------------------------
// 📤 ExportButtonObjectifsDeclic — Export des objectifs Déclic en Excel
// -----------------------------------------------------------------------------
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
import axiosLib from "axios";
import api from "src/api/axios";
import type { ObjectifDeclic } from "src/types/declic";
/* ------------------------------------------------------------------ */
/* 🔧 Helpers utilitaires */
/* ------------------------------------------------------------------ */
function getFilenameFromDisposition(
  disposition?: string | null,
  fallback = "objectifs_declic.xlsx"
) {
  if (!disposition) return fallback;
  const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(disposition);
  const raw = match?.[1] ?? match?.[2] ?? "";
  try {
    const name = decodeURIComponent(raw).trim();
    return name || fallback;
  } catch {
    return raw || fallback;
  }
}

function getErrorMessage(err: unknown): string {
  if (axiosLib.isAxiosError(err)) {
    const data = err.response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const msg = (data as any).message ?? (data as any).detail ?? (data as any).error;
      if (typeof msg === "string") return msg;
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

/* ------------------------------------------------------------------ */
/* 🧩 Composant principal */
/* ------------------------------------------------------------------ */
type Props = {
  data: ObjectifDeclic[];
  selectedIds: (string | number)[];
};

export default function ExportButtonObjectifsDeclic({ data, selectedIds }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = data?.length ?? 0;
  const selectedCount = selectedIds.length;

  const openModal = () => setShowModal(true);
  const closeModal = () => !busy && setShowModal(false);

  const handleExport = async () => {
    if (total === 0) {
      toast.warning("Aucun objectif Déclic à exporter.");
      return;
    }

    try {
      setBusy(true);

      // 🔹 Récupération des filtres éventuels depuis l’URL
      const qs = typeof window !== "undefined" ? window.location.search || "" : "";

      // ✅ Bonne route (Axios ajoute déjà /api)
      const url = `objectifs-declic/export-xlsx/${qs.startsWith("?") ? qs : ""}`;

      // 🔹 L’endpoint backend accepte uniquement GET
      const res = await api.get(url, { responseType: "blob" });

      const blob = new Blob([res.data], {
        type:
          res.headers["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const disposition = res.headers["content-disposition"] || null;
      const filename = getFilenameFromDisposition(disposition);

      // 🔽 Téléchargement du fichier
      const link = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      link.href = urlBlob;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(urlBlob);

      toast.success("✅ Export Excel des Objectifs Déclic prêt !");
      closeModal();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erreur lors de l’export des objectifs Déclic.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        onClick={openModal}
        disabled={busy || total === 0}
        aria-label={`Exporter ${selectedCount || total} objectif(s) Déclic`}
      >
        {busy ? "⏳ Export..." : "⬇️ Exporter Excel"}
      </Button>

      <Dialog open={showModal} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>Exporter les objectifs Déclic</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 1.5 }}>
            <Typography>
              Le fichier sera exporté au format <strong>Excel (.xlsx)</strong>.
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Les filtres actifs (
              <code>{typeof window !== "undefined" ? window.location.search : ""}</code>) seront
              appliqués automatiquement.
            </Typography>

            {busy && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                ⏳ Export en cours…
              </Typography>
            )}
          </Box>
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
