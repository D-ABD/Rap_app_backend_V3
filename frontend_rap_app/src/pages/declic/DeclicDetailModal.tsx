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
  Link,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import { Declic } from "src/types/declic";

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
  declic?: Declic | null;
  loading?: boolean;
  onEdit?: (id: number) => void;
}

/* ─────────── Component ─────────── */
export default function DeclicDetailModal({
  open,
  onClose,
  declic,
  loading = false,
  onEdit,
}: Props) {
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
          💡 Détail activité Déclic
        </Typography>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogTitle>

      {/* ────── Contenu ────── */}
      <DialogContent dividers>
        {loading || !declic ? (
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
                    value={nn(declic.type_declic_display ?? declic.type_declic)}
                  />
                  <Field label="Date de la séance" value={fmt(declic.date_declic)} />
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" component="span">
                      <strong>Centre :</strong>{" "}
                      {declic.centre?.id ? (
                        <Link
                          component={RouterLink}
                          to={`/declic/objectifs?centre=${declic.centre.id}`}
                          underline="hover"
                        >
                          {declic.centre.nom}
                        </Link>
                      ) : (
                        nn(declic.centre?.nom ?? declic.centre_id)
                      )}
                    </Typography>
                  </Grid>
                  <Field label="Commentaire" value={nn(declic.commentaire)} />
                </Section>
              </Grid>

              {/* ───────────── Données Ateliers Déclic ───────────── */}
              <Grid item xs={12}>
                <Section title="Ateliers Déclic">
                  <Field label="Inscrits" value={declic.nb_inscrits_declic} />
                  <Field label="Présents" value={declic.nb_presents_declic} />
                  <Field label="Absents" value={declic.nb_absents_declic} />
                </Section>
              </Grid>

              <Field
                label="Taux de présence (atelier)"
                value={
                  declic.taux_presence_atelier != null
                    ? `${declic.taux_presence_atelier.toFixed(1)} %`
                    : "—"
                }
              />

              {/* ───────────── Objectifs annuels ───────────── */}
              <Grid item xs={12}>
                <Section title="Objectif annuel">
                  <Field label="Objectif annuel" value={declic.objectif_annuel} />
                  <Field
                    label="Taux d’atteinte annuel"
                    value={
                      declic.taux_atteinte_annuel != null
                        ? `${declic.taux_atteinte_annuel.toFixed(1)} %`
                        : "—"
                    }
                  />
                  <Field label="Reste à faire" value={declic.reste_a_faire} />
                </Section>
              </Grid>

              {/* ───────────── Métadonnées ───────────── */}
              <Grid item xs={12}>
                <Section title="Métadonnées">
                  <Field label="Créé le" value={fmt(declic.created_at)} />
                  <Field label="Mis à jour le" value={fmt(declic.updated_at)} />
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
        {declic && onEdit && declic.id != null && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {declic.centre?.id ? (
              <Button
                component={RouterLink}
                to={`/declic/objectifs?centre=${declic.centre.id}`}
                variant="outlined"
              >
                Voir les objectifs du centre
              </Button>
            ) : null}
            <Button
              startIcon={<EditIcon />}
              color="primary"
              variant="contained"
              onClick={() => onEdit(declic.id)}
            >
              Modifier
            </Button>
          </Box>
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
