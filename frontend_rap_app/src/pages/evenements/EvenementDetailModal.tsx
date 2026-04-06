import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Typography,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import type { Evenement } from "../../types/evenement";

type Props = {
  open: boolean;
  onClose: () => void;
  evenement: Evenement | null;
};

const nn = (value?: string | number | null) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

export default function EvenementDetailModal({ open, onClose, evenement }: Props) {
  const navigate = useNavigate();

  if (!open || !evenement) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Événement {evenement.type_evenement_display}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Field label="Formation" value={evenement.formation_nom} />
          <Field label="Type" value={evenement.type_evenement_display} />
          <Field label="Date" value={evenement.event_date_formatted || evenement.event_date} />
          <Field label="Lieu" value={evenement.lieu} />
          <Field
            label="Statut temporel"
            value={<Chip size="small" label={evenement.status_label} color="primary" variant="outlined" />}
          />
          <Field label="Participants prévus" value={evenement.participants_prevus} />
          <Field label="Participants réels" value={evenement.participants_reels} />
          <Field label="Taux de participation" value={evenement.taux_participation != null ? `${evenement.taux_participation}%` : "—"} />
          {evenement.description_autre ? <Field label="Description" value={evenement.description_autre} /> : null}
          <Field label="Détails" value={evenement.details} fullWidth />
          <Field
            label="Formation liée"
            value={
              evenement.formation_id ? (
                <Button component={Link} to={`/formations/${evenement.formation_id}`} size="small">
                  Ouvrir la formation
                </Button>
              ) : (
                "—"
              )
            }
          />
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button variant="contained" onClick={() => navigate(`/evenements/${evenement.id}/edit`)}>
          Modifier
        </Button>
      </DialogActions>
    </Dialog>
  );
}
function Field({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string | number | null | undefined | React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <Grid item xs={12} md={fullWidth ? 12 : 6}>
      <Typography variant="body2">
        <strong>{label} :</strong> {typeof value === "string" || typeof value === "number" ? nn(value) : value}
      </Typography>
    </Grid>
  );
}


