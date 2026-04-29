import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Typography, useTheme } from "@mui/material";
import type { StagiairePrepa } from "src/types/prepa";
import CommentaireContent from "../commentaires/CommentaireContent";
import type { AppTheme } from "src/theme";

interface Props {
  open: boolean;
  onClose: () => void;
  stagiaire?: StagiairePrepa | null;
  onEdit?: (id: number) => void;
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

export default function StagiairesPrepaDetailModal({ open, onClose, stagiaire, onEdit }: Props) {
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
              <Field label="Statut" value={stagiaire.statut_parcours_display ?? stagiaire.statut_parcours} />
              <Field
                label="Statut calculé"
                value={stagiaire.statut_parcours_calcule_display ?? stagiaire.statut_parcours_calcule}
              />
              <Field label="Date IC" value={stagiaire.date_ic} />
              <Field label="Date d'entrée" value={stagiaire.date_entree_parcours} />
              <Field label="Date de sortie" value={stagiaire.date_sortie_parcours} />
              <Field
                label="Positionnement (historique)"
                value={stagiaire.statut_positionnement_display ?? stagiaire.statut_positionnement}
              />
              <Field
                label="Prochain atelier attendu"
                value={stagiaire.prochain_atelier_attendu_display ?? stagiaire.prochain_atelier_attendu}
              />
              <Field
                label="Orientation finale"
                value={stagiaire.orientation_finale_display ?? stagiaire.orientation_finale}
              />
              <Field label="Centre AFPA cible" value={stagiaire.centre_afpa_cible_nom ?? stagiaire.centre_afpa_cible?.nom} />
              <Field label="Formation AFPA cible" value={stagiaire.formation_afpa_cible} />
              <Field label="Date d'orientation" value={stagiaire.date_orientation} />
              <Field
                label="Entrée AFPA confirmée"
                value={stagiaire.entree_formation_confirmee ? "Oui" : "Non"}
              />
              <Field label="Ateliers réalisés" value={stagiaire.ateliers_realises_labels?.join(", ") || "—"} />
              <Field label="Dernier atelier" value={stagiaire.dernier_atelier_label} />
              <Field label="Atelier en cours" value={stagiaire.atelier_en_cours_display ?? stagiaire.atelier_en_cours} />
              <Field label="Date atelier en cours" value={stagiaire.atelier_en_cours_date} />
              <Field
                label="Dernier statut participation"
                value={stagiaire.dernier_statut_participation_display ?? stagiaire.dernier_statut_participation}
              />
              <Field
                label="Libération atelier"
                value={
                  stagiaire.dernier_statut_participation_liberant
                    ? stagiaire.dernier_statut_participation === "a_repositionner"
                      ? "Libéré pour repositionnement"
                      : "Libéré pour atelier suivant"
                    : "Non"
                }
              />
              <Field label="En attente d'entrée" value={stagiaire.est_en_attente_entree ? "Oui" : "Non"} />
              <Field label="À intégrer atelier 1" value={stagiaire.est_a_integrer_atelier_1 ? "Oui" : "Non"} />
              <Field
                label="En attente atelier suivant"
                value={stagiaire.est_en_attente_prochain_atelier ? "Oui" : "Non"}
              />
              <Field label="Motif abandon" value={stagiaire.motif_abandon} />
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
