// src/components/export_buttons/ExportButtonFormations.tsx
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
  Checkbox,
} from "@mui/material";
import { toast } from "react-toastify";
import axiosLib from "axios";
import api from "../../api/axios";
import ExportSelect from "./ExportSelect";

type Props = {
  selectedIds: number[];
  label?: string;
  filenameBase?: string;
  endpointBase?: string;
};

// 🔹 Extrait le nom de fichier depuis Content-Disposition
function getFilenameFromDisposition(disposition?: string | null, fallback = "formations.xlsx") {
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

// 🔹 Erreur lisible pour Axios
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

export default function ExportButtonFormations({
  selectedIds,
  label = "⬇️ Exporter",
  filenameBase = "formations",
  endpointBase = "/formations",
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"xlsx">("xlsx");
  const [avecArchivees, setAvecArchivees] = useState(false);
  const [busy, setBusy] = useState(false);

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    if (busy) return;
    setShowModal(false);
  };

  // 🔹 Export principal
  const handleExport = async () => {
    try {
      setBusy(true);

      // Reprise des filtres de l’URL actuelle
      const qsBase = typeof window !== "undefined" ? window.location.search || "" : "";
      const params = new URLSearchParams(qsBase);

      if (avecArchivees) params.set("avec_archivees", "true");

      const qs = params.toString() ? `?${params.toString()}` : "";
      const base = (endpointBase || "/formations").replace(/\/$/, "");
      const url = `${base}/export-xlsx/${qs}`; // ✅ conforme à ton ViewSet

      let res;
      if (selectedIds.length > 0) {
        res = await api.post(
          url,
          {
            ids: selectedIds,
            ...(avecArchivees ? { avec_archivees: true } : {}),
          },
          { responseType: "blob" }
        );
      } else {
        ("👉 GET (aucune sélection)");
        res = await api.get(url, { responseType: "blob" });
      }

      const contentType = res.headers["content-type"] || "";
      const blob = new Blob([res.data], {
        type: contentType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const disposition = res.headers["content-disposition"] || null;
      const defaultName = `${filenameBase}.${exportFormat}`;
      const filename = getFilenameFromDisposition(disposition, defaultName);

      // 🔽 Téléchargement local
      const link = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      link.href = urlBlob;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      try {
        URL.revokeObjectURL(urlBlob);
      } catch {
        /* no-op */
      }

      toast.success(
        selectedIds.length
          ? `Export ${exportFormat.toUpperCase()} des ${selectedIds.length} formation(s) prêt.`
          : `Export ${exportFormat.toUpperCase()} du jeu filtré prêt.`
      );
      setShowModal(false);
    } catch (e: unknown) {
      const msg = getErrorMessage(e) || "Erreur lors de l’export.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // 🔹 Bouton principal
  const countBadge = selectedIds.length > 0 ? ` (${selectedIds.length})` : "";
  const buttonTitle =
    selectedIds.length > 0
      ? `Exporter ${selectedIds.length} formation(s)`
      : `Exporter tous les résultats filtrés`;

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        onClick={openModal}
        disabled={busy}
        aria-label={`${label}${countBadge}`}
        title={buttonTitle}
      >
        {busy ? "⏳ " : "⬇️ "}
        {label}
        {countBadge}
      </Button>

      <Dialog open={showModal} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>Exporter les formations</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 1.5 }}>
            <Typography fontWeight={600}>Format d’export</Typography>
            {/* ✅ ExportSelect corrigé avec vrai callback */}
            <ExportSelect
              value={exportFormat}
              onChange={(val) => setExportFormat(val as "xlsx")}
              options={["xlsx"]}
            />

            {/* 🗃️ Inclure les formations archivées */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={avecArchivees}
                  onChange={(e) => setAvecArchivees(e.target.checked)}
                  disabled={busy}
                />
              }
              label="Inclure les formations archivées"
              sx={{ mt: 1 }}
            />
          </Box>

          {/* ℹ️ Informations sur les filtres actuels */}
          {typeof window !== "undefined" && window.location.search ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Les filtres/tri actuels (<code>{window.location.search}</code>) seront appliqués si
              aucune sélection n’est fournie.
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Aucun filtre explicite dans l’URL : l’export portera sur l’ensemble du jeu courant.
            </Typography>
          )}

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
