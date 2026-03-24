import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Typography } from "@mui/material";
import type { ParticipantDeclic } from "src/types/declic";
import CommentaireContent from "../commentaires/CommentaireContent";

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
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Détail participant Déclic</DialogTitle>
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
      <DialogActions>
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
