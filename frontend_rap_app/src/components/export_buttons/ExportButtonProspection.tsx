import { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { toast } from "react-toastify";
import axiosLib from "axios"; // pour isAxiosError
import api from "../../api/axios";
import type { Prospection } from "../../types/prospection";

/* ------------------------------------------------------------------ */
/* 🔧 Helpers utilitaires (cohérents avec ExportButtonAppairage) */
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
  data: Prospection[];
  selectedIds: number[];
};

export default function ExportButtonProspection({ data, selectedIds }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inclureArchives, setInclureArchives] = useState(false);

  const total = data?.length ?? 0;
  const selectedCount = selectedIds.length;

  // 🔹 Chargement état "inclure les archivées" depuis localStorage/sessionStorage
  useEffect(() => {
    const saved =
      sessionStorage.getItem("inclure_archives") || localStorage.getItem("inclure_archives");
    setInclureArchives(saved === "true");
  }, []);

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    if (busy) return;
    setShowModal(false);
  };

  const handleToggleInclude = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setInclureArchives(checked);
    // 🔸 on sauvegarde pour les prochains exports
    sessionStorage.setItem("inclure_archives", String(checked));
    localStorage.setItem("inclure_archives", String(checked));
  };

  const handleExport = async () => {
    if (total === 0) {
      toast.warning("Aucune prospection à exporter.");
      return;
    }

    try {
      setBusy(true);

      // ✅ on récupère les filtres actifs dans l’URL
      let qs = typeof window !== "undefined" ? window.location.search || "" : "";

      // ✅ assure la présence du flag inclure_archives si coché
      if (inclureArchives && !/[?&](inclure_archives|avec_archivees)=/i.test(qs)) {
        qs += (qs.includes("?") ? "&" : "?") + "inclure_archives=true";
      }

      // ✅ base d’URL (corrigée si baseURL="/api")
      const base = "/prospections/export-xlsx/";
      const url = `${base}${qs.startsWith("?") ? qs : ""}`;

      let res;
      if (selectedIds.length > 0) {
        res = await api.post(url, { ids: selectedIds }, { responseType: "blob" });
      } else {
        res = await api.get(url, { responseType: "blob" });
      }

      const contentType = res.headers["content-type"] || "";
      const fallbackMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      const blob = new Blob([res.data], { type: contentType || fallbackMime });

      const disposition = res.headers["content-disposition"] || null;
      const filename = getFilenameFromDisposition(disposition, "prospections.xlsx");

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
        aria-label={`Exporter ${selectedCount || total} prospection(s)`}
        title={
          total === 0
            ? "Aucune prospection à exporter"
            : `Exporter ${selectedCount || total} prospection(s)`
        }
      >
        {busy ? "⏳ " : "⬇️ "}
        Exporter ({selectedCount > 0 ? selectedCount : total})
      </Button>

      <Dialog open={showModal} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>Exporter les prospections</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 1.5 }}>
            <Typography>
              Le fichier sera exporté uniquement au format <strong>Excel (.xlsx)</strong>.
            </Typography>

            {/* ✅ Nouveau bouton d’inclusion des archivées */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={inclureArchives}
                  onChange={handleToggleInclude}
                  color="primary"
                  disabled={busy}
                />
              }
              label="Inclure les prospections archivées"
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
