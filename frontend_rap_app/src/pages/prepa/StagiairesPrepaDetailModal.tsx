import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Typography, useTheme } from "@mui/material";
import type { StagiairePrepa } from "src/types/prepa";
import CommentaireContent from "../commentaires/CommentaireContent";
import type { AppTheme } from "src/theme";

interface Props {
  open: boolean;
  onClose: () => void;
  stagiaire?: StagiairePrepa | null;
  onEdit?: (id: number) => void;
  onReopen?: (id: number) => void;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <Grid item xs={12} md={6}>
      <Typography variant="body2">
        <strong>{label} :</strong> {value ?? "—"}
      </Typography>
    </Grid>
  );
}

export default function StagiairesPrepaDetailModal({ open, onClose, stagiaire, onEdit, onReopen }: Props) {
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";
  const modalScrim = isLight ? theme.custom.overlay.scrim.background.light : theme.custom.overlay.scrim.background.dark;
  const modalTitleBackground = isLight ? theme.custom.overlay.modalSectionTitle.background.light : theme.custom.overlay.modalSectionTitle.background.dark;
  const modalTitleBorder = isLight ? theme.custom.overlay.modalSectionTitle.borderBottom.light : theme.custom.overlay.modalSectionTitle.borderBottom.dark;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth BackdropProps={{ sx: { backgroundColor: modalScrim } }}>
      <DialogTitle sx={{ backgroundColor: modalTitleBackground, borderBottom: modalTitleBorder }}>Détail stagiaire Prépa</DialogTitle>
      <DialogContent dividers>
        {!stagiaire ? null : (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={1.5}>
              <Field label="Nom" value={stagiaire.nom} />
              <Field label="Prénom" value={stagiaire.prenom} />
              <Field label="Téléphone" value={stagiaire.telephone} />
              <Field label="Email" value={stagiaire.email} />
              <Field label="Centre" value={stagiaire.centre_nom ?? stagiaire.centre?.nom} />
              <Field label="Statut" value={stagiaire.statut_parcours_courant_display ?? stagiaire.statut_parcours_display ?? stagiaire.statut_parcours} />
              <Field label="Information collective d'origine" value={stagiaire.prepa_origine_label} />
              <Field label="Date IC" value={stagiaire.date_ic} />
              <Field label="Date d'entrée" value={stagiaire.date_entree_calculee} />
              <Field label="Date de fin" value={stagiaire.date_fin_calculee} />
              <Field label="Dernière étape" value={stagiaire.derniere_etape?.label} />
              <Field
                label="Prochaine étape prévue"
                value={
                  stagiaire.action_suivante_recommandee?.label ??
                  stagiaire.prochain_atelier_prevu_display ??
                  stagiaire.prochain_etape_display ??
                  stagiaire.prochain_atelier_attendu_display ??
                  stagiaire.prochain_atelier_prevu ??
                  stagiaire.prochain_etape ??
                  stagiaire.prochain_atelier_attendu
                }
              />
              <Field
                label="Dernière présence"
                value={
                  stagiaire.derniere_presence_reelle?.type_prepa_display
                    ? `${stagiaire.derniere_presence_reelle.type_prepa_display}${
                        stagiaire.derniere_presence_reelle.date
                          ? ` - ${stagiaire.derniere_presence_reelle.date}`
                          : ""
                      }`
                    : "—"
                }
              />
              <Field
                label="Orientation finale"
                value={stagiaire.orientation_finale_display ?? stagiaire.orientation_finale}
              />
              <Field
                label="Centre AFPA cible"
                value={
                  stagiaire.centre_afpa_cible_texte ??
                  stagiaire.centre_afpa_cible_nom ??
                  stagiaire.centre_afpa_cible?.nom
                }
              />
              <Field label="Formation AFPA cible" value={stagiaire.formation_afpa_cible} />
              <Field label="Ateliers réalisés" value={stagiaire.ateliers_realises_labels?.join(", ") || "—"} />
              <Field label="Atelier en cours" value={stagiaire.atelier_en_cours_display ?? stagiaire.atelier_en_cours} />
              <Grid item xs={12}>
                <Typography variant="body2" component="div">
                  <strong>Commentaire :</strong>
                </Typography>
                <CommentaireContent html={stagiaire.commentaire_suivi || "<em>—</em>"} />
              </Grid>
            </Grid>
          </Paper>
        )}
      </DialogContent>
      <DialogActions sx={{ borderTop: modalTitleBorder }}>
        {stagiaire?.id && onReopen && stagiaire.statut_parcours_courant === "termine" ? (
          <Button color="warning" variant="outlined" onClick={() => onReopen(stagiaire.id!)}>
            Rouvrir le parcours
          </Button>
        ) : null}
        {stagiaire?.id && onEdit ? (
          <Button variant="contained" onClick={() => onEdit(stagiaire.id!)}>
            Modifier
          </Button>
        ) : null}
        <Button variant="outlined" onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
