import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  Divider,
  Paper,
  Link,
  CircularProgress,
  Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useProspection } from "../../hooks/useProspection";
import { useNavigate } from "react-router-dom";

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

const yn = (b?: boolean | null) => (typeof b === "boolean" ? (b ? "Oui" : "Non") : "—");

/* ---------- Props ---------- */
type Props = {
  open: boolean;
  onClose: () => void;
  prospectionId: number | null;
  onEdit?: (id: number) => void;
};

/* ---------- Component ---------- */
export default function ProspectionDetailModalCandidat({
  open,
  onClose,
  prospectionId,
  onEdit,
}: Props) {
  const { data: prospection, loading } = useProspection(prospectionId);
  const navigate = useNavigate();

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
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography component="div" variant="h6" fontWeight={700}>
          📞 Détail de la prospection
        </Typography>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogTitle>

      <DialogContent dividers>
        {loading || !prospection ? (
          <Box textAlign="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Grid container spacing={3}>
              {/* ───── Centre ───── */}
              <Grid item xs={12}>
                <Section title="Centre">
                  <Field label="Nom du centre" value={nn(prospection.centre_nom)} />
                  <Field label="Identifiant" value={nn(prospection.centre)} />
                </Section>
              </Grid>

              {/* ───── Partenaire ───── */}
              <Grid item xs={12}>
                <Section title="Partenaire">
                  <Field label="Nom" value={nn(prospection.partenaire_nom)} />
                  <Field label="Ville" value={nn(prospection.partenaire_ville)} />
                  <Field label="ID partenaire" value={nn(prospection.partenaire)} />
                  <Field
                    label="Téléphone"
                    value={
                      prospection.partenaire_tel ? (
                        <Link
                          href={`tel:${prospection.partenaire_tel.replace(/[^\d+]/g, "")}`}
                          underline="hover"
                        >
                          {prospection.partenaire_tel}
                        </Link>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Field
                    label="Email"
                    value={
                      prospection.partenaire_email ? (
                        <Link href={`mailto:${prospection.partenaire_email}`} underline="hover">
                          {prospection.partenaire_email}
                        </Link>
                      ) : (
                        "—"
                      )
                    }
                  />
                </Section>
              </Grid>

              {/* ───── Formation ───── */}
              <Grid item xs={12}>
                <Section title="Formation">
                  <Field label="Nom formation" value={nn(prospection.formation_nom)} />
                  <Field label="N° offre" value={nn(prospection.num_offre)} />
                  <Field
                    label="Dates"
                    value={`${fmt(prospection.formation_date_debut)} → ${fmt(
                      prospection.formation_date_fin
                    )}`}
                  />
                  <Field label="Type d’offre" value={nn(prospection.type_offre_display)} />
                  <Field
                    label="Statut formation"
                    value={nn(prospection.formation_statut_display)}
                  />
                  <Field label="ID formation" value={nn(prospection.formation)} />
                  <Field
                    label="Places disponibles"
                    value={
                      prospection.places_disponibles != null
                        ? String(prospection.places_disponibles)
                        : "—"
                    }
                  />
                </Section>
              </Grid>

              {/* ───── Prospection ───── */}
              <Grid item xs={12}>
                <Section title="Prospection">
                  <Field
                    label="Type de prospection"
                    value={`${nn(prospection.type_prospection_display)} (${nn(
                      prospection.type_prospection
                    )})`}
                  />
                  <Field
                    label="Motif"
                    value={`${nn(prospection.motif_display)} (${nn(prospection.motif)})`}
                  />
                  <Field
                    label="Objectif"
                    value={`${nn(prospection.objectif_display)} (${nn(prospection.objectif)})`}
                  />
                  <Field
                    label="Statut"
                    value={`${nn(prospection.statut_display)} (${nn(prospection.statut)})`}
                  />
                  <Field
                    label="Activité"
                    value={
                      <Chip
                        size="small"
                        label={prospection.activite_display || "—"}
                        color={prospection.activite === "archivee" ? "default" : "success"}
                        sx={{
                          fontWeight: 600,
                          bgcolor:
                            prospection.activite === "archivee" ? "grey.200" : "success.light",
                          textTransform: "capitalize",
                        }}
                      />
                    }
                  />
                  <Field
                    label="Moyen de contact"
                    value={`${nn(prospection.moyen_contact_display)} (${nn(
                      prospection.moyen_contact
                    )})`}
                  />
                  <Field label="Relance prévue" value={fmt(prospection.relance_prevue)} />
                  <Field label="Date prospection" value={fmt(prospection.date_prospection)} />
                  <Field label="Active" value={yn(prospection.is_active)} />
                  <Field label="Relance nécessaire" value={yn(prospection.relance_necessaire)} />
                  <Field label="Commentaire" value={nn(prospection.commentaire)} />
                </Section>
              </Grid>

              {/* ───── Commentaires ───── */}
              <Grid item xs={12}>
                <Section title="Commentaires">
                  <Field
                    label="Dernier commentaire"
                    value={
                      prospection.last_comment ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontStyle: "italic" }}
                        >
                          “
                          {prospection.last_comment.length > 120
                            ? prospection.last_comment.slice(0, 120) + "…"
                            : prospection.last_comment}
                          ”
                        </Typography>
                      ) : (
                        "— Aucun commentaire"
                      )
                    }
                  />
                  <Field
                    label="Date dernier commentaire"
                    value={fmt(prospection.last_comment_at)}
                  />
                  <Field
                    label="Total commentaires"
                    value={String(prospection.comments_count ?? "—")}
                  />
                </Section>
              </Grid>
            </Grid>
          </Paper>
        )}
      </DialogContent>

      {/* ---------- Actions ---------- */}
      <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
        {prospection && prospection.id != null && (
          <Button
            startIcon={<EditIcon />}
            variant="contained"
            color="primary"
            onClick={() => navigate(`/prospections/${prospection.id}/edit/candidat`)}
          >
            Modifier
          </Button>
        )}

        {prospection && onEdit && prospection.id != null && (
          <Button variant="contained" color="warning" onClick={() => onEdit(prospection.id!)}>
            Voir les commentaires
          </Button>
        )}
        <Button variant="outlined" onClick={onClose}>
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
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "primary.main" }} gutterBottom>
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
  const isReactElement = typeof value !== "string" && typeof value !== "number";
  const str = typeof value === "number" ? String(value) : value;
  const isMissing =
    str === null ||
    str === undefined ||
    str === "" ||
    str === "—" ||
    (typeof str === "string" && !str.trim());

  return (
    <Grid item xs={12} sm={6} md={4}>
      {isReactElement ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
            {label} :
          </Typography>
          {value}
        </Box>
      ) : (
        <Typography variant="body2">
          <strong>{label} :</strong>{" "}
          {isMissing ? (
            <span style={{ color: "red", fontStyle: "italic", opacity: 0.85 }}>— NC</span>
          ) : (
            str
          )}
        </Typography>
      )}
    </Grid>
  );
}
