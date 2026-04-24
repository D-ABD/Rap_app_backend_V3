import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  CircularProgress,
  Link,
  useTheme,
  Stack,
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

  const actionsBorder = isLight
    ? theme.custom.dialog.actions.borderTop.light
    : theme.custom.dialog.actions.borderTop.dark;

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
      <DialogTitle>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
        >
          <Typography component="div" variant="h6" fontWeight={700}>
            Détail de l’appairage
          </Typography>

          <Box>
            <Button onClick={onClose} variant="outlined">
              Fermer
            </Button>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {loading || !appairage ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {/* ───────────── Colonne gauche ───────────── */}
            <Grid item xs={12} md={6}>
              <Section title="Partenaire">
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Item label="Nom" value={appairage.partenaire_nom} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
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
                  <Grid item xs={12} sm={6}>
                    <Item label="Contact" value={appairage.partenaire_contact_nom} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Item label="Email" value={appairage.partenaire_email} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Item label="Téléphone" value={appairage.partenaire_telephone} />
                  </Grid>
                </Grid>
              </Section>

              <Section title="Candidat">
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Item label="Nom" value={appairage.candidat_nom} />
                  </Grid>
                  <Grid item xs={12}>
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
                  </Grid>
                </Grid>
              </Section>
            </Grid>

            {/* ───────────── Colonne droite ───────────── */}
            <Grid item xs={12} md={6}>
              <Section title="Formation">
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Item label="Nom" value={appairage.formation_nom} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
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
                  <Grid item xs={12} sm={6}>
                    <Item label="Type" value={appairage.formation_type_offre} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Item label="Centre" value={appairage.formation_centre} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Item label="Statut" value={appairage.formation_statut} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
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
                  <Grid item xs={12} sm={6}>
                    <Item
                      label="Dates"
                      value={
                        appairage.formation_date_debut || appairage.formation_date_fin
                          ? `${appairage.formation_date_debut ?? "?"} → ${appairage.formation_date_fin ?? "?"}`
                          : "—"
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Item label="Numéro offre" value={appairage.formation_numero_offre} />
                  </Grid>
                </Grid>
              </Section>

              <Section title="Audit">
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
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

                  <Grid item xs={12} sm={6}>
                    <Item label="Statut" value={appairage.statut_display} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Item label="Créé par" value={appairage.created_by_nom} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Item
                      label="Créé le"
                      value={
                        appairage.created_at
                          ? new Date(appairage.created_at).toLocaleString("fr-FR")
                          : "—"
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Item label="MAJ par" value={appairage.updated_by_nom} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Item
                      label="MAJ le"
                      value={
                        appairage.updated_at
                          ? new Date(appairage.updated_at).toLocaleString("fr-FR")
                          : "—"
                      }
                    />
                  </Grid>
                </Grid>
              </Section>

              {appairage.last_commentaire && (
                <Section title="Dernier commentaire">
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{
                      whiteSpace: "pre-wrap",
                      color: "text.primary",
                    }}
                  >
                    {appairage.last_commentaire}
                  </Typography>

                  <Typography
                    variant="caption"
                    component="div"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {appairage.created_by_nom ?? "—"} —{" "}
                    {appairage.created_at
                      ? new Date(appairage.created_at).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                  </Typography>
                </Section>
              )}
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: "space-between",
          borderTop: actionsBorder,
        }}
      >
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
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

  const sectionTokens = theme.custom.dialog.section;
  const modalTitleBackground = isLight
    ? theme.custom.overlay.modalSectionTitle.background.light
    : theme.custom.overlay.modalSectionTitle.background.dark;
  const modalTitleBorder = isLight
    ? theme.custom.overlay.modalSectionTitle.borderBottom.light
    : theme.custom.overlay.modalSectionTitle.borderBottom.dark;

  const sectionBackground = isLight
    ? sectionTokens.background.light
    : sectionTokens.background.dark;
  const sectionBorder = isLight
    ? sectionTokens.border.light
    : sectionTokens.border.dark;

  return (
    <Box
      sx={{
        mb: 2,
        border: sectionBorder,
        borderRadius: sectionTokens.borderRadius,
        background: sectionBackground,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: sectionTokens.padding,
          py: 1,
          backgroundColor: modalTitleBackground,
          borderBottom: modalTitleBorder,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Box>

      <Box sx={{ p: sectionTokens.padding }}>{children}</Box>
    </Box>
  );
}

function Item({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Typography
      variant="body2"
      component="div"
      sx={{
        mb: 0.5,
        minWidth: 0,
        overflowWrap: "anywhere",
      }}
    >
      <Box component="span" sx={{ fontWeight: 700 }}>
        {label} :
      </Box>{" "}
      {value ?? (
        <Box
          component="span"
          sx={{
            color: "text.secondary",
            fontStyle: "italic",
            opacity: 0.8,
          }}
        >
          — NC
        </Box>
      )}
    </Typography>
  );
}