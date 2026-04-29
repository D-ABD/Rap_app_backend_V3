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
  useTheme,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import { Prepa } from "src/types/prepa";
import { useExportStagiairesPrepa } from "src/hooks/useStagiairesPrepa";
import { useAuth } from "src/hooks/useAuth";
import { canWritePrepaRole, isAdminLikeRole } from "src/utils/roleGroups";
import CommentaireContent from "../commentaires/CommentaireContent";
import type { AppTheme } from "src/theme";

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
  const { exportPresence, exportEmargement } = useExportStagiairesPrepa();
  const { user } = useAuth();
  const canWritePrepa = canWritePrepaRole(user?.role);
  const canSeePrepaObjectifs = isAdminLikeRole(user?.role);
  const isAtelierPrepa =
    prepa?.type_prepa?.startsWith("atelier") || prepa?.type_prepa === "autre";
  const isInformationCollective = prepa?.type_prepa === "info_collective";
  const exportSearch = prepa?.id
    ? isAtelierPrepa
      ? `?prepa_participation=${prepa.id}`
      : `?prepa_origine=${prepa.id}`
    : "";

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
      {/* ────── En-tête ────── */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: modalTitleBorder,
          backgroundColor: modalTitleBackground,
        }}
      >
        <Typography component="span" variant="h6" fontWeight={700}>
          Détail séance Prépa
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
              backgroundColor: sectionPaperBg,
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
                  <Field label="Début atelier" value={fmt(prepa.date_debut_atelier)} />
                  <Field label="Fin atelier" value={fmt(prepa.date_fin_atelier)} />
                  <Field label="Formateur / animateur" value={nn(prepa.formateur_animateur)} />
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" component="span">
                      <strong>Centre :</strong>{" "}
                      {prepa.centre?.id && canSeePrepaObjectifs ? (
                        <Link
                          component={RouterLink}
                          to={`/prepa/objectifs?centre=${prepa.centre.id}`}
                          underline="hover"
                        >
                          {prepa.centre_nom ?? prepa.centre.nom}
                        </Link>
                      ) : (
                        nn(prepa.centre_nom ?? prepa.centre?.nom ?? prepa.centre_id)
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" component="div">
                      <strong>Commentaire :</strong>
                    </Typography>
                    <CommentaireContent html={prepa.commentaire || "<em>—</em>"} />
                  </Grid>
                </Section>
              </Grid>

              {isInformationCollective ? (
                <Grid item xs={12}>
                  <Section title="Compteurs information collective">
                    <Field label="Places ouvertes" value={prepa.nombre_places_ouvertes} />
                    <Field label="Prescriptions" value={prepa.nombre_prescriptions} />
                    <Field label="Présents IC" value={prepa.nb_presents_info} />
                    <Field label="Absents IC" value={prepa.nb_absents_info} />
                    <Field label="Adhésions IC" value={prepa.nb_adhesions} />
                  </Section>
                </Grid>
              ) : null}

              {isAtelierPrepa ? (
                <Grid item xs={12}>
                  <Section title="Compteurs atelier">
                    <Field label="Inscrits calculés nominatif" value={prepa.nb_inscrits_prepa_nominatifs ?? "—"} />
                    <Field label="Présents calculés nominatif" value={prepa.nb_presents_prepa_nominatifs ?? "—"} />
                    <Field label="Absents calculés nominatif" value={prepa.nb_absents_prepa_nominatifs ?? "—"} />
                    <Field label="Inscrits hors liste" value={prepa.nb_inscrits_prepa_hors_liste ?? 0} />
                    <Field label="Présents hors liste" value={prepa.nb_presents_prepa_hors_liste ?? 0} />
                    <Field label="Absents hors liste" value={prepa.nb_absents_prepa_hors_liste ?? 0} />
                    <Field label="Inscrits total atelier" value={prepa.nb_inscrits_prepa} />
                    <Field label="Présents total atelier" value={prepa.nb_presents_prepa} />
                    <Field label="Absents total atelier" value={prepa.nb_absents_prepa} />
                  </Section>
                </Grid>
              ) : null}

              {/* ───────────── Indicateurs & taux ───────────── */}
              <Grid item xs={12}>
                <Section title="Taux et indicateurs">
                  {isInformationCollective ? (
                    <>
                      <Field
                        label="Taux de prescription"
                        value={
                          prepa.taux_prescription != null
                            ? `${prepa.taux_prescription.toFixed(1)} %`
                            : "—"
                        }
                      />
                      <Field
                        label="Taux de présence IC"
                        value={
                          prepa.taux_presence_info != null
                            ? `${prepa.taux_presence_info.toFixed(1)} %`
                            : "—"
                        }
                      />
                      <Field
                        label="Taux d’adhésion IC"
                        value={
                          prepa.taux_adhesion != null ? `${prepa.taux_adhesion.toFixed(1)} %` : "—"
                        }
                      />
                    </>
                  ) : null}
                  {isAtelierPrepa ? (
                    <Field
                      label="Taux de présence atelier"
                      value={
                        prepa.taux_presence_prepa != null
                          ? `${prepa.taux_presence_prepa.toFixed(1)} %`
                          : "—"
                      }
                    />
                  ) : null}
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
                <Section title="Participation nominative">
                  {prepa.participations_prepa?.length ? (
                    <Grid item xs={12}>
                      <Box component="ul" sx={{ mt: 0, mb: 0, pl: 2.5 }}>
                        {prepa.participations_prepa.map((participation, index) => (
                          <li
                            key={
                              participation.id ??
                              participation.stagiaire_prepa_id ??
                              `${participation.nom}-${participation.prenom}-${index}`
                            }
                          >
                            <Typography variant="body2">
                              <strong>
                                {nn(participation.stagiaire_prepa?.prenom ?? participation.prenom)}{" "}
                                {nn(participation.stagiaire_prepa?.nom ?? participation.nom)}
                              </strong>
                              {participation.statut_display ? ` - ${participation.statut_display}` : ""}
                              {participation.commentaire ? ` - ${participation.commentaire}` : ""}
                            </Typography>
                          </li>
                        ))}
                      </Box>
                    </Grid>
                  ) : (
                    <Field label="Participants" value="Aucune participation nominative renseignée" />
                  )}
                </Section>
              </Grid>

              <Grid item xs={12}>
                <Section title={isAtelierPrepa ? "Fiches parcours reliées à la séance" : "Fiches parcours issues de cette IC"}>
                  {isAtelierPrepa && !prepa.stagiaires_prepa?.length ? (
                    <Field
                      label="Information"
                      value="Pour les ateliers, le lien principal est la participation nominative. La Prépa d'origine ne sert qu'au point d'entrée dans le parcours."
                    />
                  ) : null}
                  {prepa.stagiaires_prepa?.length ? (
                    <Grid item xs={12}>
                      <Box component="ul" sx={{ mt: 0, mb: 0, pl: 2.5 }}>
                        {prepa.stagiaires_prepa.map((stagiaire, index) => (
                          <li key={stagiaire.id ?? `${stagiaire.nom}-${stagiaire.prenom}-${index}`}>
                            <Typography variant="body2">
                              <strong>
                                {nn(stagiaire.prenom)} {nn(stagiaire.nom)}
                              </strong>
                              {stagiaire.telephone ? ` - ${stagiaire.telephone}` : ""}
                              {stagiaire.email ? ` - ${stagiaire.email}` : ""}
                              {stagiaire.statut_parcours_display
                                ? ` - ${stagiaire.statut_parcours_display}`
                                : ""}
                            </Typography>
                          </li>
                        ))}
                      </Box>
                    </Grid>
                  ) : (
                    <Field label="Stagiaires" value="Aucun stagiaire Prépa renseigné" />
                  )}
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
          borderTop: modalTitleBorder,
        }}
      >
        {prepa && onEdit && prepa.id != null && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {prepa.centre?.id && canSeePrepaObjectifs ? (
              <Button
                component={RouterLink}
                to={`/prepa/objectifs?centre=${prepa.centre.id}`}
                variant="outlined"
              >
                Voir les objectifs du centre
              </Button>
            ) : null}
            <Button
              component={RouterLink}
              to={
                isAtelierPrepa
                  ? `/prepa/stagiaires?prepa_participation=${prepa.id}`
                  : `/prepa/stagiaires?prepa_origine=${prepa.id}`
              }
              variant="outlined"
            >
              {isAtelierPrepa ? "Voir les participants de cette séance" : "Voir les fiches parcours issues de cette IC"}
            </Button>
            {canWritePrepa && (
              isAtelierPrepa ? (
                <Button
                  component={RouterLink}
                  to={`/prepa/${prepa.id}/edit/Ateliers`}
                  variant="outlined"
                >
                  Gérer les participants
                </Button>
              ) : (
                <Button
                  component={RouterLink}
                  to={`/prepa/stagiaires/create?prepa_origine=${prepa.id}`}
                  variant="outlined"
                >
                  Ajouter un stagiaire
                </Button>
              )
            )}
            {isAtelierPrepa && prepa.id != null ? (
              <Button variant="outlined" onClick={() => exportPresence(undefined, exportSearch)}>
                Feuille de présence
              </Button>
            ) : null}
            {isAtelierPrepa && prepa.id != null ? (
              <Button variant="outlined" onClick={() => exportEmargement(undefined, exportSearch)}>
                Feuille d'émargement
              </Button>
            ) : null}
            <Button
              startIcon={<EditIcon />}
              color="primary"
              variant="contained"
              onClick={() => onEdit(prepa.id)}
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
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";
  const modalTitleBackground = isLight
    ? theme.custom.overlay.modalSectionTitle.background.light
    : theme.custom.overlay.modalSectionTitle.background.dark;
  const modalTitleBorder = isLight
    ? theme.custom.overlay.modalSectionTitle.borderBottom.light
    : theme.custom.overlay.modalSectionTitle.borderBottom.dark;
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 1, px: 1.25, py: 0.75, borderRadius: 1.5, backgroundColor: modalTitleBackground, borderBottom: modalTitleBorder }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: "primary.main",
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {title}
        </Typography>
      </Box>
      <Divider sx={{ mb: 1, display: "none" }} />
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
