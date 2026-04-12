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
  Link,
  useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddCommentIcon from "@mui/icons-material/AddComment";
import LaunchIcon from "@mui/icons-material/Launch";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import type { Appairage, AppairageListItem } from "../../types/appairage";
import type { AppTheme } from "src/theme";

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
  const navigate = useNavigate();
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";
  const modalScrim = isLight
    ? theme.custom.overlay.scrim.background.light
    : theme.custom.overlay.scrim.background.dark;
  const modalTitleBackground = isLight
    ? theme.custom.overlay.modalSectionTitle.background.light
    : theme.custom.overlay.modalSectionTitle.background.dark;
  const modalTitleBorder = isLight
    ? theme.custom.overlay.modalSectionTitle.borderBottom.light
    : theme.custom.overlay.modalSectionTitle.borderBottom.dark;
  const sectionPaperBg = isLight
    ? theme.custom.form.section.paperBackground.light
    : theme.custom.form.section.paperBackground.dark;
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      disableEnforceFocus
      BackdropProps={{ sx: { backgroundColor: modalScrim } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: modalTitleBackground,
          borderBottom: modalTitleBorder,
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
                      <Item
                        label="Ouvrir"
                        value={
                          appairage.partenaire ? (
                            <Link
                              component={RouterLink}
                              to={`/partenaires/${appairage.partenaire}/edit`}
                              underline="hover"
                            >
                              Voir le partenaire
                            </Link>
                          ) : (
                            "—"
                          )
                        }
                      />
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
                  <Item
                    label="Ouvrir"
                    value={
                      appairage.candidat ? (
                        <Link
                          component={RouterLink}
                          to={`/candidats/${appairage.candidat}`}
                          underline="hover"
                        >
                          Voir le candidat
                        </Link>
                      ) : (
                        "—"
                      )
                    }
                  />
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
                      <Item
                        label="Ouvrir"
                        value={
                          appairage.formation ? (
                            <Link
                              component={RouterLink}
                              to={`/formations/${appairage.formation}`}
                              underline="hover"
                            >
                              Voir la formation
                            </Link>
                          ) : (
                            "—"
                          )
                        }
                      />
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
                            <Box
                              component="span"
                              sx={{
                                fontWeight: 600,
                                color: appairage.activite_display.toLowerCase().includes("archiv")
                                  ? "text.secondary"
                                  : "success.main",
                              }}
                            >
                              {appairage.activite_display}
                            </Box>
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
                        backgroundColor: sectionPaperBg,
                        borderColor: "divider",
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

      <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2, borderTop: modalTitleBorder }}>
        <Box display="flex" gap={1} flexWrap="wrap">
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
          {appairage && (
            <Button
              startIcon={<AddCommentIcon />}
              variant="outlined"
              onClick={() => navigate(`/appairage-commentaires/create/${appairage.id}`)}
            >
              Ajouter un commentaire
            </Button>
          )}
          {appairage && (
            <Button
              startIcon={<LaunchIcon />}
              variant="outlined"
              onClick={() => navigate(`/appairage-commentaires?appairage=${appairage.id}`)}
            >
              Voir les commentaires
            </Button>
          )}
        </Box>

        <Button variant="outlined" onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
/* ---------- Sous-composants ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";
  const modalTitleBackground = isLight
    ? theme.custom.overlay.modalSectionTitle.background.light
    : theme.custom.overlay.modalSectionTitle.background.dark;
  const modalTitleBorder = isLight
    ? theme.custom.overlay.modalSectionTitle.borderBottom.light
    : theme.custom.overlay.modalSectionTitle.borderBottom.dark;
  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          mb: 1,
          px: 1.25,
          py: 0.75,
          borderRadius: 1.5,
          backgroundColor: modalTitleBackground,
          borderBottom: modalTitleBorder,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "primary.main" }}>
          {title}
        </Typography>
      </Box>
      <Divider sx={{ mb: 1, display: "none" }} />
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
