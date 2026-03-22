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
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import type { Appairage, AppairageListItem } from "../../types/appairage";

interface Props {
  open: boolean;
  onClose: () => void;
  appairage?: Appairage | AppairageListItem | null;
  loading?: boolean;
  onEdit?: (id: number) => void;
}

export default function AppairageDetailModal({
  open,
  onClose,
  appairage,
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
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography component="div" variant="h6" fontWeight={700}>
          🔗 Détail de l’appairage
        </Typography>

        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogTitle>

      <DialogContent dividers>
        {loading || !appairage ? (
          <Box textAlign="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Grid container spacing={2}>
              {/* ───────────── Colonne gauche ───────────── */}
              <Grid item xs={12} md={6}>
                <Section title="Partenaire">
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Item label="Nom" value={appairage.partenaire_nom} />
                    </Grid>
                    <Grid item xs={6}>
                      <Item label="Contact" value={appairage.partenaire_contact_nom} />
                    </Grid>
                    <Grid item xs={6}>
                      <Item label="Email" value={appairage.partenaire_email} />
                    </Grid>
                    <Grid item xs={6}>
                      <Item label="Téléphone" value={appairage.partenaire_telephone} />
                    </Grid>
                  </Grid>
                </Section>

                <Section title="Candidat">
                  <Item label="Nom" value={appairage.candidat_nom} />
                </Section>
              </Grid>

              {/* ───────────── Colonne droite ───────────── */}
              <Grid item xs={12} md={6}>
                <Section title="Formation">
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Item label="Nom" value={appairage.formation_nom} />
                    </Grid>
                    <Grid item xs={6}>
                      <Item label="Type" value={appairage.formation_type_offre} />
                    </Grid>
                    <Grid item xs={6}>
                      <Item label="Centre" value={appairage.formation_centre} />
                    </Grid>
                    <Grid item xs={6}>
                      <Item label="Statut" value={appairage.formation_statut} />
                    </Grid>
                    <Grid item xs={6}>
                      <Item
                        label="Places"
                        value={
                          appairage.formation_places_disponibles != null &&
                          appairage.formation_places_total != null
                            ? `${appairage.formation_places_disponibles} / ${appairage.formation_places_total}`
                            : "—"
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Item
                        label="Dates"
                        value={
                          appairage.formation_date_debut || appairage.formation_date_fin
                            ? `${appairage.formation_date_debut ?? "?"} → ${appairage.formation_date_fin ?? "?"}`
                            : "—"
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Item label="Numéro offre" value={appairage.formation_numero_offre} />
                    </Grid>
                  </Grid>
                </Section>

                <Section title="Audit">
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Item
                        label="Activité"
                        value={
                          appairage.activite_display ? (
                            <span
                              style={{
                                color: appairage.activite_display.toLowerCase().includes("archiv")
                                  ? "#777"
                                  : "green",
                                fontWeight: 600,
                              }}
                            >
                              {appairage.activite_display}
                            </span>
                          ) : (
                            "—"
                          )
                        }
                      />
                    </Grid>

                    <Grid item xs={6}>
                      <Item label="Statut" value={appairage.statut_display} />
                    </Grid>
                    <Grid item xs={6}>
                      <Item label="Créé par" value={appairage.created_by_nom} />
                    </Grid>
                    <Grid item xs={6}>
                      <Item
                        label="Créé le"
                        value={
                          appairage.created_at
                            ? new Date(appairage.created_at).toLocaleString()
                            : "—"
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Item label="MAJ par" value={appairage.updated_by_nom} />
                    </Grid>
                    <Grid item xs={6}>
                      <Item
                        label="MAJ le"
                        value={
                          appairage.updated_at
                            ? new Date(appairage.updated_at).toLocaleString()
                            : "—"
                        }
                      />
                    </Grid>
                  </Grid>
                </Section>

                {/* ───────────── Dernier commentaire ───────────── */}
                {appairage.last_commentaire && (
                  <Section title="Dernier commentaire">
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: "#fafafa",
                        borderColor: "#ddd",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: "pre-wrap",
                          color: "text.primary",
                        }}
                      >
                        {appairage.last_commentaire}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 1 }}
                      >
                        ✍️ {appairage.created_by_nom ?? "—"} —{" "}
                        {appairage.created_at
                          ? new Date(appairage.created_at).toLocaleString("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </Typography>
                    </Paper>
                  </Section>
                )}
              </Grid>
            </Grid>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
        {appairage && onEdit && (
          <Button
            startIcon={<EditIcon />}
            color="primary"
            variant="contained"
            onClick={() => onEdit(appairage.id)}
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

/* ---------- Sous-composants ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "primary.main" }} gutterBottom>
        {title}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {children}
    </Box>
  );
}

function Item({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Typography variant="body2" sx={{ mb: 0.5, whiteSpace: "nowrap" }}>
      <strong>{label} :</strong>{" "}
      {value ?? <span style={{ color: "red", fontStyle: "italic", opacity: 0.8 }}>— NC</span>}
    </Typography>
  );
}
