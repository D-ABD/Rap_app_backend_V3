import { Button, Grid, Paper, Stack, Switch, TextField, Typography, FormControlLabel } from "@mui/material";
import type { ParticipantDeclic } from "src/types/declic";

interface Props {
  participants: ParticipantDeclic[];
  onChange: (next: ParticipantDeclic[]) => void;
}

const emptyParticipant = (): ParticipantDeclic => ({
  nom: "",
  prenom: "",
  telephone: "",
  email: "",
  present: true,
  commentaire_presence: "",
});

export default function DeclicParticipantsSection({ participants, onChange }: Props) {
  const updateAt = (index: number, patch: Partial<ParticipantDeclic>) => {
    onChange(participants.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeAt = (index: number) => {
    onChange(participants.filter((_, i) => i !== index));
  };

  const addOne = () => onChange([...participants, emptyParticipant()]);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} mb={2}>
        <div>
          <Typography variant="h6">Participants Déclic</Typography>
          <Typography variant="body2" color="text.secondary">
            Renseigne les personnes attendues ou présentes sur cette séance.
          </Typography>
        </div>
        <Button variant="outlined" onClick={addOne}>
          Ajouter un participant
        </Button>
      </Stack>

      <Stack spacing={2}>
        {participants.length ? (
          participants.map((participant, index) => (
            <Paper key={participant.id ?? `participant-${index}`} variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Nom"
                    value={participant.nom ?? ""}
                    onChange={(e) => updateAt(index, { nom: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Prénom"
                    value={participant.prenom ?? ""}
                    onChange={(e) => updateAt(index, { prenom: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Téléphone"
                    value={participant.telephone ?? ""}
                    onChange={(e) => updateAt(index, { telephone: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={participant.email ?? ""}
                    onChange={(e) => updateAt(index, { email: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(participant.present)}
                        onChange={(e) => updateAt(index, { present: e.target.checked })}
                      />
                    }
                    label="Présent"
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Commentaire de présence"
                    value={participant.commentaire_presence ?? ""}
                    onChange={(e) => updateAt(index, { commentaire_presence: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button color="error" variant="outlined" onClick={() => removeAt(index)}>
                    Retirer ce participant
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            Aucun participant renseigné pour l'instant.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
