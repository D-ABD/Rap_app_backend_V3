import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  Grid,
  Box,
  Paper,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { Prepa } from "src/types/prepa";

/* ─────────── Helpers ─────────── */
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
  return Number.isNaN(d.getTime()) ? "—" : dtfFR ? dtfFR.format(d) : d.toLocaleString("fr-FR");
};

const nn = (s?: string | null | number) =>
  s !== undefined && s !== null && String(s).trim() !== "" ? String(s) : "—";

/* ─────────── Props ─────────── */
interface Props {
  open: boolean;
  onClose: () => void;
  prepa?: Prepa | null;
  loading?: boolean;
  onEdit?: (id: number) => void;
}

/* ─────────── Component ─────────── */
export default function PrepaDetailModal({ open, onClose, prepa, loading = false, onEdit }: Props) {
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      disableEnforceFocus
    >
      {/* ────── En-tête ────── */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <Typography component="span" variant="h6" fontWeight={700}>
          💡 Détail activité Prépa
        </Typography>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogTitle>

      {/* ────── Contenu ────── */}
      <DialogContent dividers>
        {loading || !prepa ? (
          <Box textAlign="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 2,
              backgroundColor: "#fafafa",
            }}
          >
            <Grid container spacing={3}>
              {/* ───────────── Informations générales ───────────── */}
              <Grid item xs={12}>
                <Section title="Informations générales">
                  <Field
                    label="Type d’activité"
                    value={nn(prepa.type_prepa_display ?? prepa.type_prepa)}
                  />
                  <Field label="Date de la séance" value={fmt(prepa.date_prepa)} />
                  <Field
                    label="Centre"
                    value={nn(prepa.centre_nom ?? prepa.centre?.nom ?? prepa.centre_id)}
                  />
                  <Field label="Commentaire" value={nn(prepa.commentaire)} />
                </Section>
              </Grid>

              {/* ───────────── Données Information collective ───────────── */}
              <Grid item xs={12}>
                <Section title="Information collective">
                  <Field label="Places ouvertes" value={prepa.nombre_places_ouvertes} />
                  <Field label="Prescriptions" value={prepa.nombre_prescriptions} />
                  <Field label="Présents" value={prepa.nb_presents_info} />
                  <Field label="Absents" value={prepa.nb_absents_info} />
                  <Field label="Adhésions" value={prepa.nb_adhesions} />
                </Section>
              </Grid>

              {/* ───────────── Données Ateliers Prépa ───────────── */}
              <Grid item xs={12}>
                <Section title="Ateliers Prépa">
                  <Field label="Inscrits" value={prepa.nb_inscrits_prepa} />
                  <Field label="Présents" value={prepa.nb_presents_prepa} />
                  <Field label="Absents" value={prepa.nb_absents_prepa} />
                </Section>
              </Grid>

              {/* ───────────── Indicateurs & taux ───────────── */}
              <Grid item xs={12}>
                <Section title="Taux et indicateurs">
                  <Field
                    label="Taux de prescription"
                    value={
                      prepa.taux_prescription != null
                        ? `${prepa.taux_prescription.toFixed(1)} %`
                        : "—"
                    }
                  />
                  <Field
                    label="Taux de présence (IC)"
                    value={
                      prepa.taux_presence_info != null
                        ? `${prepa.taux_presence_info.toFixed(1)} %`
                        : "—"
                    }
                  />
                  <Field
                    label="Taux d’adhésion"
                    value={
                      prepa.taux_adhesion != null ? `${prepa.taux_adhesion.toFixed(1)} %` : "—"
                    }
                  />
                  <Field
                    label="Taux de présence (atelier)"
                    value={
                      prepa.taux_presence_prepa != null
                        ? `${prepa.taux_presence_prepa.toFixed(1)} %`
                        : "—"
                    }
                  />
                </Section>
              </Grid>

              {/* ───────────── Objectifs annuels ───────────── */}
              <Grid item xs={12}>
                <Section title="Objectif annuel">
                  <Field label="Objectif annuel" value={prepa.objectif_annuel} />
                  <Field
                    label="Taux d’atteinte annuel"
                    value={
                      prepa.taux_atteinte_annuel != null
                        ? `${prepa.taux_atteinte_annuel.toFixed(1)} %`
                        : "—"
                    }
                  />
                  <Field label="Reste à faire" value={prepa.reste_a_faire} />
                </Section>
              </Grid>

              {/* ───────────── Métadonnées ───────────── */}
              <Grid item xs={12}>
                <Section title="Métadonnées">
                  <Field label="Créé le" value={fmt(prepa.created_at)} />
                  <Field label="Mis à jour le" value={fmt(prepa.updated_at)} />
                </Section>
              </Grid>
            </Grid>
          </Paper>
        )}
      </DialogContent>

      {/* ────── Actions ────── */}
      <DialogActions
        sx={{
          justifyContent: "space-between",
          px: 3,
          py: 2,
          borderTop: "1px solid #e0e0e0",
        }}
      >
        {prepa && onEdit && prepa.id != null && (
          <Button
            startIcon={<EditIcon />}
            color="primary"
            variant="contained"
            onClick={() => onEdit(prepa.id)}
          >
            Modifier
          </Button>
        )}
        <Button variant="outlined" onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─────────── Sous-composants ─────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          color: "primary.main",
          mb: 0.5,
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        {title}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Grid container spacing={1}>
        {children}
      </Grid>
    </Box>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  const display =
    value === null ||
    value === undefined ||
    value === "—" ||
    (typeof value === "string" && !value.trim()) ? (
      <span style={{ color: "red", fontStyle: "italic", opacity: 0.85 }}>— NC</span>
    ) : (
      value
    );

  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="body2" component="span">
        <strong>{label} :</strong> {display}
      </Typography>
    </Grid>
  );
}
