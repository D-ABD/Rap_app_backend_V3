import { Button, Chip, Grid } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import type { Evenement } from "../../types/evenement";
import DetailViewLayout from "../../components/layout/DetailViewLayout";
import DetailField, { formatDetailScalar } from "../../components/ui/DetailField";

type Props = {
  open: boolean;
  onClose: () => void;
  evenement: Evenement | null;
};

export default function EvenementDetailModal({ open, onClose, evenement }: Props) {
  const navigate = useNavigate();

  if (!open || !evenement) return null;

  return (
    <DetailViewLayout
      open={open}
      onClose={onClose}
      title={`Événement ${evenement.type_evenement_display}`}
      actions={
        <>
          <Button onClick={onClose}>Fermer</Button>
          <Button variant="contained" onClick={() => navigate(`/evenements/${evenement.id}/edit`)}>
            Modifier
          </Button>
        </>
      }
    >
      <Grid container spacing={2}>
        <DetailField label="Formation" value={formatDetailScalar(evenement.formation_nom)} />
        <DetailField label="Type" value={formatDetailScalar(evenement.type_evenement_display)} />
        <DetailField
          label="Date"
          value={formatDetailScalar(evenement.event_date_formatted || evenement.event_date)}
        />
        <DetailField label="Lieu" value={formatDetailScalar(evenement.lieu)} />
        <DetailField
          label="Statut temporel"
          value={<Chip size="small" label={evenement.status_label} color="primary" variant="outlined" />}
        />
        <DetailField label="Participants prévus" value={formatDetailScalar(evenement.participants_prevus)} />
        <DetailField label="Participants réels" value={formatDetailScalar(evenement.participants_reels)} />
        <DetailField
          label="Taux de participation"
          value={
            evenement.taux_participation != null ? `${evenement.taux_participation}%` : formatDetailScalar(null)
          }
        />
        {evenement.description_autre ? (
          <DetailField label="Description" value={formatDetailScalar(evenement.description_autre)} />
        ) : null}
        <DetailField label="Détails" value={formatDetailScalar(evenement.details)} fullWidth />
        <DetailField
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
    </DetailViewLayout>
  );
}
