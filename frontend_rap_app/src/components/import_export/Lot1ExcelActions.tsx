import { useRef, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Button, Stack } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import { toast } from "react-toastify";

import {
  type Lot1ImportResourceSlug,
  downloadLot1Blob,
  importExportJobsAppPath,
  lot1ExportPath,
  lot1ImportTemplatePath,
  postLot1Import,
} from "../../api/lot1ImportExport";
import { useAuth } from "../../hooks/useAuth";
import { isCoreStaffRole, normalizeRole } from "../../utils/roleGroups";

type Props = {
  resource: Lot1ImportResourceSlug;
  /** Query string export (mêmes filtres que la liste, sans page / page_size). */
  exportParams: Record<string, unknown>;
  isMobile?: boolean;
};

export default function Lot1ExcelActions({ resource, exportParams, isMobile }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const showImportHistory = isCoreStaffRole(normalizeRole(user?.role));
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const templateName = `${resource}_import_template.xlsx`;
  const exportName = `${resource}_export.xlsx`;
  const historyHref = `${importExportJobsAppPath}?resource=${encodeURIComponent(resource)}`;

  const showHistoryToast = (kind: "success" | "error") => {
    if (!showImportHistory) return;
    toast.info("Voir l'historique de cet import", {
      autoClose: 5000,
      onClick: () => navigate(historyHref),
      closeOnClick: true,
      type: kind,
    });
  };

  const onTemplate = async () => {
    setBusy(true);
    try {
      await downloadLot1Blob(lot1ImportTemplatePath(resource), templateName);
      toast.success("Modèle téléchargé");
    } catch {
      toast.error("Échec du téléchargement du modèle");
    } finally {
      setBusy(false);
    }
  };

  const onExport = async () => {
    setBusy(true);
    try {
      await downloadLot1Blob(lot1ExportPath(resource), exportName, exportParams);
      toast.success("Export téléchargé");
    } catch {
      toast.error("Échec de l’export");
    } finally {
      setBusy(false);
    }
  };

  const runImport = async (file: File, dryRun: boolean) => {
    setBusy(true);
    try {
      const data = await postLot1Import(resource, file, dryRun);
      const s = data.summary;
      const label = data.dry_run ? "Simulation" : "Import";
      if (s) {
        toast.success(
          `${label} : ${s.created ?? 0} créé(s), ${s.updated ?? 0} maj, ${s.failed ?? 0} erreur(s)`
        );
      } else {
        toast.success(`${label} terminé`);
      }
      showHistoryToast("success");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import impossible");
      showHistoryToast("error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mode = e.target.dataset.dry === "1";
    void runImport(file, mode);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={onFileChange}
      />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
        <Button
          size="small"
          variant="outlined"
          disabled={busy}
          fullWidth={isMobile}
          onClick={() => void onTemplate()}
        >
          📄 Modèle Excel
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={busy}
          fullWidth={isMobile}
          onClick={() => void onExport()}
        >
          📤 Exporter
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={busy}
          fullWidth={isMobile}
          onClick={() => {
            const el = inputRef.current;
            if (el) {
              delete el.dataset.dry;
              el.click();
            }
          }}
        >
          📥 Importer
        </Button>
        <Button
          size="small"
          variant="text"
          disabled={busy}
          fullWidth={isMobile}
          onClick={() => {
            const el = inputRef.current;
            if (el) {
              el.dataset.dry = "1";
              el.click();
            }
          }}
        >
          🧪 Tester (sans enregistrer)
        </Button>
        {showImportHistory ? (
          <Button
            size="small"
            variant="text"
            color="primary"
            disabled={busy}
            fullWidth={isMobile}
            component={RouterLink}
            to={historyHref}
            startIcon={<HistoryIcon fontSize="small" />}
          >
            Historique des imports
          </Button>
        ) : null}
      </Stack>
    </>
  );
}
