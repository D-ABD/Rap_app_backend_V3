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
import { useExportParticipantsDeclic } from "src/hooks/useParticipantsDeclic";
import CommentaireContent from "../commentaires/CommentaireContent";

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
  const { exportPresence, exportEmargement } = useExportParticipantsDeclic();
  const exportSearch = declic?.id ? `?declic_origine=${declic.id}` : "";

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
          Détail de la séance Déclic
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
                    label="Type de séance"
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
                  <Grid item xs={12}>
                    <Typography variant="body2" component="div">
                      <strong>Commentaire :</strong>
                    </Typography>
                    <CommentaireContent html={declic.commentaire || "<em>—</em>"} />
                  </Grid>
                </Section>
              </Grid>

              {/* ───────────── Données Ateliers Déclic ───────────── */}
              <Grid item xs={12}>
                <Section title="Données de la séance">
                  <Field label="Inscrits" value={declic.nb_inscrits_declic} />
                  <Field label="Présents" value={declic.nb_presents_declic} />
                  <Field label="Absents" value={declic.nb_absents_declic} />
                </Section>
              </Grid>

              <Grid item xs={12}>
                <Section title="Participants liés à la séance">
                  {declic.participants_declic?.length ? (
                    <Grid item xs={12}>
                      <Box component="ul" sx={{ mt: 0, mb: 0, pl: 2.5 }}>
                        {declic.participants_declic.map((participant, index) => (
                          <li key={participant.id ?? `${participant.nom}-${participant.prenom}-${index}`}>
                            <Typography variant="body2">
                              <strong>
                                {nn(participant.prenom)} {nn(participant.nom)}
                              </strong>
                              {participant.telephone ? ` - ${participant.telephone}` : ""}
                              {participant.email ? ` - ${participant.email}` : ""}
                              {participant.present !== undefined ? ` - ${participant.present ? "Présent" : "Absent"}` : ""}
                            </Typography>
                          </li>
                        ))}
                      </Box>
                    </Grid>
                  ) : (
                    <Field label="Participants" value="Aucun participant n'est encore renseigné pour cette séance." />
                  )}
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
                component={RouterLink}
                to={`/participants-declic?declic_origine=${declic.id}`}
                variant="outlined"
              >
              Voir les participants
              </Button>
            <Button
              component={RouterLink}
              to={`/participants-declic/create?declic_origine=${declic.id}`}
              variant="outlined"
            >
              Ajouter un participant
            </Button>
            <Button variant="outlined" onClick={() => exportPresence(undefined, exportSearch)}>
              Feuille de présence
            </Button>
            <Button variant="outlined" onClick={() => exportEmargement(undefined, exportSearch)}>
              Feuille d'émargement
            </Button>
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

