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
  Chip,
  Link,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import { AtelierTRE, AtelierTREPresence } from "../../types/ateliersTre";

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

function renderPresenceChip(status: string) {
  const colors: Record<string, "success" | "error" | "warning" | "default"> = {
    present: "success",
    absent: "error",
    excuse: "warning",
    inconnu: "default",
  };
  const labels: Record<string, string> = {
    present: "Présent",
    absent: "Absent",
    excuse: "Excusé",
    inconnu: "Non renseigné",
  };
  const color = colors[status] ?? "default";
  const label = labels[status] ?? status;
  return <Chip size="small" color={color} label={label} variant="outlined" />;
}

/* ─────────── Props ─────────── */
interface Props {
  open: boolean;
  onClose: () => void;
  atelier?: AtelierTRE | null;
  loading?: boolean;
  onEdit?: (id: number) => void;
}

/* ─────────── Component ─────────── */
export default function AtelierTREDetailModal({
  open,
  onClose,
  atelier,
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
        }}
      >
        <Typography component="span" variant="h6" fontWeight={700}>
          🧑‍🏫 Détail Atelier TRE
        </Typography>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogTitle>

      {/* ────── Contenu ────── */}
      <DialogContent dividers>
        {loading || !atelier ? (
          <Box textAlign="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Grid container spacing={3}>
              {/* ───────────── Informations principales ───────────── */}
              <Grid item xs={12}>
                <Section title="Informations générales">
                  <Field label="Type d’atelier" value={nn(atelier.type_atelier_display)} />
                  <Field label="Date de l’atelier" value={fmt(atelier.date_atelier)} />
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" component="span">
                      <strong>Centre :</strong>{" "}
                      {atelier.centre_detail?.label ? (
                        <Link component={RouterLink} to="/centres" underline="hover">
                          {atelier.centre_detail.label}
                        </Link>
                      ) : (
                        nn(atelier.centre)
                      )}
                    </Typography>
                  </Grid>
                  <Field label="Nombre d’inscrits" value={atelier.nb_inscrits} />
                </Section>
              </Grid>

              {/* ───────────── Présences ───────────── */}
              <Grid item xs={12}>
                <Section title="Présences">
                  {atelier.presences && atelier.presences.length > 0 ? (
                    <>
                      {/* 🧮 compteur résumé */}
                      {atelier.presence_counts && (
                        <Typography
                          variant="body2"
                          sx={{
                            mb: 1,
                            fontWeight: 500,
                            color: "text.secondary",
                          }}
                        >
                          👥 {atelier.presences.length} présences enregistrées :{" "}
                          <strong>{atelier.presence_counts.present}</strong> présents,{" "}
                          <strong>{atelier.presence_counts.absent}</strong> absents,{" "}
                          <strong>{atelier.presence_counts.excuse}</strong> excusés,{" "}
                          <strong>{atelier.presence_counts.inconnu}</strong> non renseignés
                        </Typography>
                      )}

                      <Grid container spacing={1}>
                        {atelier.presences.map((p: AtelierTREPresence) => (
                          <Grid item xs={12} sm={6} md={4} key={p.id}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              <Link
                                component={RouterLink}
                                to={`/candidats/${p.candidat.id}`}
                                underline="hover"
                                sx={{ fontWeight: 500, fontSize: "0.875rem" }}
                              >
                                {p.candidat.nom}
                              </Link>
                              {renderPresenceChip(p.statut)}
                              {p.commentaire && (
                                <Typography variant="body2" component="em" sx={{ opacity: 0.7 }}>
                                  ({p.commentaire})
                                </Typography>
                              )}
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </>
                  ) : (
                    <Typography variant="body2" color="error">
                      Aucune présence enregistrée (NC)
                    </Typography>
                  )}
                </Section>
              </Grid>

              {/* ───────────── Candidats associés ───────────── */}
              <Grid item xs={12}>
                <Section title="Candidats associés">
                  {atelier.candidats_detail?.length ? (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {atelier.candidats_detail.map((c) => (
                        <Link
                          key={c.id}
                          component={RouterLink}
                          to={`/candidats/${c.id}`}
                          underline="hover"
                          sx={{ fontSize: "0.95rem" }}
                        >
                          {c.nom}
                        </Link>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="error">
                      Aucun candidat (NC)
                    </Typography>
                  )}
                </Section>
              </Grid>

              {/* ───────────── Statistiques de présence ───────────── */}
              <Grid item xs={12}>
                <Section title="Statistiques de présence">
                  {atelier.presence_counts ? (
                    <>
                      <Field label="Présents" value={atelier.presence_counts.present} />
                      <Field label="Absents" value={atelier.presence_counts.absent} />
                      <Field label="Excusés" value={atelier.presence_counts.excuse} />
                      <Field label="Non renseignés" value={atelier.presence_counts.inconnu} />

                      {/* 🆕 Champ ajouté */}
                      <Field
                        label="Nombre de présents"
                        value={`${atelier.presence_counts.present} / ${atelier.nb_inscrits} (${(
                          (atelier.presence_counts.present / (atelier.nb_inscrits || 1)) *
                          100
                        ).toFixed(1)}%)`}
                      />
                    </>
                  ) : (
                    <Typography variant="body2" color="error">
                      Aucune donnée (NC)
                    </Typography>
                  )}
                </Section>
              </Grid>

              {/* ───────────── Métadonnées ───────────── */}
              <Grid item xs={12}>
                <Section title="Métadonnées">
                  <Field label="Créé le" value={fmt(atelier.created_at)} />
                  <Field label="Mis à jour le" value={fmt(atelier.updated_at)} />
                  <Field label="Actif ?" value={atelier.is_active ? "Oui" : "Non"} />
                </Section>
              </Grid>
            </Grid>
          </Paper>
        )}
      </DialogContent>

      {/* ────── Actions ────── */}
      <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
        {atelier && onEdit && atelier.id != null && (
          <Button
            startIcon={<EditIcon />}
            color="primary"
            variant="contained"
            onClick={() => onEdit(atelier.id)}
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
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "primary.main", mb: 0.5 }}>
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
