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
              <Field label="Prépa d'origine" value={stagiaire.prepa_origine_label} />
              <Field label="Date d'entrée" value={stagiaire.date_entree_parcours} />
              <Field label="Date de sortie" value={stagiaire.date_sortie_parcours} />
              <Field label="Ateliers réalisés" value={stagiaire.ateliers_realises_labels?.join(", ") || "—"} />
              <Field label="Dernier atelier" value={stagiaire.dernier_atelier_label} />
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
