// src/pages/cerfa/CerfaDetailModal.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Divider,
  Grid,
  Box,
  Button,
  CircularProgress,
  Paper,
  Tooltip,
  Alert,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import EditIcon from "@mui/icons-material/Edit";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { toast } from "react-toastify";
import { useCerfaGeneratePdf, useCerfaDownloadPdf, downloadBlob } from "../../hooks/useCerfa";
import type { CerfaContrat } from "../../types/cerfa";

/* ---------- Helpers ---------- */
const dtfFR =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : undefined;

const fmt = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dtfFR ? dtfFR.format(d) : d.toLocaleDateString("fr-FR");
};

const nn = (s?: string | number | null) =>
  s === null || s === undefined || s === "" ? "—" : String(s);

/* ---------- Props ---------- */
type Props = {
  open: boolean;
  onClose: () => void;
  contrat?: CerfaContrat | null;
  loading?: boolean;
  onEdit?: (id: number) => void;
};

/* ---------- Component ---------- */
export default function CerfaDetailModal({
  open,
  onClose,
  contrat,
  loading = false,
  onEdit,
}: Props) {
  const { mutateAsync: generatePdf, isPending: isGenerating } = useCerfaGeneratePdf(
    contrat?.id ?? 0
  );
  const { mutateAsync: downloadPdf, isPending: isDownloading } = useCerfaDownloadPdf();

  if (!open) return null;

  if (loading || !contrat)
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogContent sx={{ textAlign: "center", py: 6 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );

  // ✅ Champs essentiels
  const requiredFields: Record<string, any> = {
    "Nom de naissance": contrat.apprenti_nom_naissance,
    Prénom: contrat.apprenti_prenom,
    "Nom employeur": contrat.employeur_nom,
    "SIRET employeur": contrat.employeur_siret,
    Formation: contrat.formation,
    "Diplôme visé": contrat.diplome_vise,
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([, v]) => v === null || v === undefined || v === "")
    .map(([label]) => label);

  const hasMissingFields = missingFields.length > 0;

  /* ---------- Action : Génération + Téléchargement automatique ---------- */
  const handleGeneratePdf = async () => {
    if (!contrat) return;
    try {
      toast.info("📄 Génération du PDF en cours...");
      const res = await generatePdf();

      if (res?.pdf_url) {
        toast.success("✅ PDF généré avec succès, téléchargement automatique...");

        // ⬇️ Téléchargement automatique du fichier
        const blob = await downloadPdf(contrat.id);
        downloadBlob(blob, `cerfa_${contrat.id}.pdf`);
      } else {
        toast.warning("PDF généré mais aucune URL détectée.");
      }
    } catch (_err: any) {
      toast.error("❌ Erreur lors de la génération du PDF.");
    }
  };

  /* ---------- Téléchargement manuel ---------- */
  const handleDownloadPdf = async () => {
    if (!contrat) return;
    try {
      toast.info("📥 Téléchargement du PDF...");
      const blob = await downloadPdf(contrat.id);
      downloadBlob(blob, `cerfa_${contrat.id}.pdf`);
    } catch {
      toast.error("❌ Erreur lors du téléchargement du PDF.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      disableEnforceFocus
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pr: 2,
        }}
      >
        <Typography variant="h6" component="span">
          🧾 Contrat CERFA —{" "}
          <Typography component="span" color="primary" fontWeight={600}>
            {contrat.apprenti_prenom} {contrat.apprenti_nom_naissance}
          </Typography>
        </Typography>

        <Box display="flex" gap={1}>
          {/* 🪄 Bouton Générer + téléchargement */}
          <Tooltip title="Générer le PDF CERFA">
            <span>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                startIcon={isGenerating ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
                disabled={isGenerating || hasMissingFields}
                onClick={handleGeneratePdf}
              >
                {isGenerating ? "Génération..." : "Générer PDF"}
              </Button>
            </span>
          </Tooltip>

          {/* 📥 Bouton Télécharger PDF (manuel) */}
          <Tooltip title="Télécharger le PDF existant">
            <span>
              <Button
                variant="outlined"
                startIcon={isDownloading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
                onClick={handleDownloadPdf}
                disabled={isDownloading}
              >
                Télécharger
              </Button>
            </span>
          </Tooltip>

          {/* ✏️ Modifier */}
          <Tooltip title="Modifier le contrat">
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => onEdit?.(contrat.id)}
            >
              Modifier
            </Button>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {hasMissingFields && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ Champs manquants : <strong>{missingFields.join(", ")}</strong>.
            <br />
            Complétez-les avant de générer le PDF.
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Section title="Apprenti">
                <Field label="Nom" value={nn(contrat.apprenti_nom_naissance)} />
                <Field label="Prénom" value={nn(contrat.apprenti_prenom)} />
                <Field label="Email" value={nn(contrat.apprenti_email)} />
              </Section>
            </Grid>

            <Grid item xs={12}>
              <Section title="Employeur">
                <Field label="Nom" value={nn(contrat.employeur_nom)} />
                <Field label="SIRET" value={nn(contrat.employeur_siret)} />
              </Section>
            </Grid>

            <Grid item xs={12}>
              <Section title="Formation / Diplôme">
                <Field label="Diplôme visé" value={nn(contrat.diplome_vise)} />
                <Field label="Date début" value={fmt(contrat.formation_debut)} />
              </Section>
            </Grid>
          </Grid>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------- Sous-composants ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "primary.main" }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Grid container spacing={1}>
        {children}
      </Grid>
    </Box>
  );
}

function Field({ label, value }: { label: string; value: string | number | React.ReactNode }) {
  const str = typeof value === "number" ? String(value) : value;
  const isMissing = str === null || str === undefined || str === "" || str === "—";

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="body2">
        <strong>{label} :</strong>{" "}
        {isMissing ? (
          <span style={{ color: "#d32f2f", fontStyle: "italic", fontWeight: 500 }}>
            — Non communiqué
          </span>
        ) : (
          str
        )}
      </Typography>
    </Grid>
  );
}
