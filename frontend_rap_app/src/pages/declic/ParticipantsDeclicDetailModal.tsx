import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Typography, useTheme } from "@mui/material";
import type { ParticipantDeclic } from "src/types/declic";
import CommentaireContent from "../commentaires/CommentaireContent";
import type { AppTheme } from "src/theme";

interface Props {
  open: boolean;
  onClose: () => void;
  participant?: ParticipantDeclic | null;
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

export default function ParticipantsDeclicDetailModal({ open, onClose, participant, onEdit }: Props) {
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";
  const modalScrim = isLight ? theme.custom.overlay.scrim.background.light : theme.custom.overlay.scrim.background.dark;
  const modalTitleBackground = isLight ? theme.custom.overlay.modalSectionTitle.background.light : theme.custom.overlay.modalSectionTitle.background.dark;
  const modalTitleBorder = isLight ? theme.custom.overlay.modalSectionTitle.borderBottom.light : theme.custom.overlay.modalSectionTitle.borderBottom.dark;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth BackdropProps={{ sx: { backgroundColor: modalScrim } }}>
      <DialogTitle sx={{ backgroundColor: modalTitleBackground, borderBottom: modalTitleBorder }}>Détail participant Déclic</DialogTitle>
      <DialogContent dividers>
        {!participant ? null : (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={1.5}>
              <Field label="Nom" value={participant.nom} />
              <Field label="Prénom" value={participant.prenom} />
              <Field label="Téléphone" value={participant.telephone} />
              <Field label="Email" value={participant.email} />
              <Field label="Centre" value={participant.centre_nom ?? participant.centre?.nom} />
              <Field label="Séance Déclic" value={participant.declic_origine_label} />
              <Field label="Présent" value={participant.present ? "Oui" : "Non"} />
              <Grid item xs={12}>
                <Typography variant="body2" component="div">
                  <strong>Commentaire :</strong>
                </Typography>
                <CommentaireContent html={participant.commentaire_presence || "<em>—</em>"} />
              </Grid>
            </Grid>
          </Paper>
        )}
      </DialogContent>
      <DialogActions sx={{ borderTop: modalTitleBorder }}>
        {participant?.id && onEdit ? (
          <Button variant="contained" onClick={() => onEdit(participant.id!)}>
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
