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
import type { Declic } from "../../types/declic";

/* ------------------------------------------------------------------ */
/* 🔧 Helpers utilitaires (identiques à ExportButtonAteliersTRE) */
/* ------------------------------------------------------------------ */
function getFilenameFromDisposition(disposition?: string | null, fallback = "export_declic.xlsx") {
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
/* 🧩 Composant principal : Export Déclic */
/* ------------------------------------------------------------------ */
type Props = {
  data: Declic[];
  selectedIds: number[];
};

export default function ExportButtonDeclic({ data, selectedIds }: Props) {
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
      toast.warning("Aucune donnée Déclic à exporter.");
      return;
    }

    try {
      setBusy(true);

      // 🔹 Récupère les filtres de l’URL (si présents)
      const qs = typeof window !== "undefined" ? window.location.search || "" : "";

      // 🔹 Base d’URL d’export pour Déclic
      const base = "/declic/export-xlsx/";
      const url = `${base}${qs.startsWith("?") ? qs : ""}`;

      let res;
      if (selectedIds.length > 0) {
        // POST avec IDs sélectionnés
        res = await api.post(url, { ids: selectedIds }, { responseType: "blob" });
      } else {
        // GET simple (avec filtres éventuels)
        res = await api.get(url, { responseType: "blob" });
      }

      // 🔹 Préparation du blob pour téléchargement
      const contentType =
        res.headers["content-type"] ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      const blob = new Blob([res.data], { type: contentType });
      const disposition = res.headers["content-disposition"] || null;
      const filename = getFilenameFromDisposition(disposition, "declic_export.xlsx");

      const link = document.createElement("a");
      const blobUrl = URL.createObjectURL(blob);
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      toast.success(
        selectedCount > 0
          ? `Export XLSX des ${selectedCount} sélection(s) Déclic prêt.`
          : `Export XLSX du jeu filtré Déclic prêt.`
      );

      setShowModal(false);
    } catch (e: unknown) {
      const msg = getErrorMessage(e) || "Erreur lors de l’export Déclic.";
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
        aria-label={`Exporter ${selectedCount || total} activité(s) Déclic`}
        title={
          total === 0
            ? "Aucune activité Déclic à exporter"
            : `Exporter ${selectedCount || total} activité(s) Déclic`
        }
      >
        {busy ? "⏳ " : "⬇️ "}
        Exporter ({selectedCount > 0 ? selectedCount : total})
      </Button>

      <Dialog open={showModal} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>Exporter les activités Déclic</DialogTitle>
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
