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
import api from "../../api/axios";
import type { AtelierTRE } from "../../types/ateliersTre";

/* ------------------------------------------------------------------ */
/* 🔧 Helpers utilitaires (cohérents avec ExportButtonProspection) */
/* ------------------------------------------------------------------ */

function getFilenameFromDisposition(disposition?: string | null, fallback = "export.xlsx") {
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

function getErrorMessage(err: unknown): string | null {
  if (axiosLib.isAxiosError(err)) {
    const data = err.response?.data as unknown;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const maybe =
        (data as { message?: unknown }).message ??
        (data as { detail?: unknown }).detail ??
        (data as { error?: unknown }).error;
      if (typeof maybe === "string") return maybe;
    }
    return err.message ?? null;
  }
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 🧩 Composant principal */
/* ------------------------------------------------------------------ */

type Props = {
  data: AtelierTRE[];
  selectedIds: number[];
};

export default function ExportButtonAteliersTRE({ data, selectedIds }: Props) {
  const [showModal, setShowModal] = useState(false);
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
      toast.warning("Aucun atelier à exporter.");
      return;
    }

    try {
      setBusy(true);

      // ✅ récupère les filtres de l’URL (si présents)
      let qs = typeof window !== "undefined" ? window.location.search || "" : "";

      // ✅ base d’URL de l’export
      const base = "/ateliers-tre/export-xlsx/";
      const url = `${base}${qs.startsWith("?") ? qs : ""}`;

      let res;
      if (selectedIds.length > 0) {
        res = await api.post(url, { ids: selectedIds }, { responseType: "blob" });
      } else {
        res = await api.get(url, { responseType: "blob" });
      }

      const contentType =
        res.headers["content-type"] ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      const blob = new Blob([res.data], { type: contentType });
      const disposition = res.headers["content-disposition"] || null;
      const filename = getFilenameFromDisposition(disposition, "ateliers_tre.xlsx");

      // Téléchargement
      const link = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      link.href = urlBlob;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(urlBlob);

      toast.success(
        selectedCount > 0
          ? `Export XLSX des ${selectedCount} sélection(s) prêt.`
          : `Export XLSX du jeu filtré prêt.`
      );

      setShowModal(false);
    } catch (e: unknown) {
      const msg = getErrorMessage(e) || "Erreur lors de l’export.";
      toast.error(msg);
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
        aria-label={`Exporter ${selectedCount || total} atelier(s)`}
        title={
          total === 0 ? "Aucun atelier à exporter" : `Exporter ${selectedCount || total} atelier(s)`
        }
      >
        {busy ? "⏳ " : "⬇️ "}
        Exporter ({selectedCount > 0 ? selectedCount : total})
      </Button>

      <Dialog open={showModal} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>Exporter les ateliers TRE</DialogTitle>
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
