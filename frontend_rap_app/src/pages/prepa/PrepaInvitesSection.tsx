import { Box, Button, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import type { StagiairePrepa } from "src/types/prepa";

interface Props {
  stagiaires: StagiairePrepa[];
  onChange: (stagiaires: StagiairePrepa[]) => void;
}

const emptyStagiaire = (): StagiairePrepa => ({
  nom: "",
  prenom: "",
  telephone: "",
  email: "",
  statut_parcours: "en_attente",
});

export default function PrepaInvitesSection({ stagiaires, onChange }: Props) {
  const updateStagiaire = (index: number, key: keyof StagiairePrepa, value: string) => {
    const next = stagiaires.map((stagiaire, idx) =>
      idx === index ? { ...stagiaire, [key]: value } : stagiaire
    );
    onChange(next);
  };

  const addStagiaire = () => onChange([...(stagiaires ?? []), emptyStagiaire()]);
  const removeStagiaire = (index: number) =>
    onChange(stagiaires.filter((_, idx) => idx !== index));

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box>
          <Typography variant="h6">Stagiaires Prépa à suivre</Typography>
          <Typography variant="body2" color="text.secondary">
            Saisis ici les personnes à suivre en Prépa, sans créer de candidat ni de compte.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={addStagiaire}>
          Ajouter un stagiaire
        </Button>
      </Stack>

      {stagiaires.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucun stagiaire Prépa renseigné pour le moment.
        </Typography>
      ) : null}

      <Stack spacing={2}>
        {stagiaires.map((stagiaire, index) => (
          <Paper key={stagiaire.id ?? `stagiaire-${index}`} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2" fontWeight={700}>
                Stagiaire {index + 1}
              </Typography>
              <Button color="error" variant="text" onClick={() => removeStagiaire(index)}>
                Retirer
              </Button>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  required
                  label="Nom"
                  value={stagiaire.nom ?? ""}
                  onChange={(e) => updateStagiaire(index, "nom", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  required
                  label="Prénom"
                  value={stagiaire.prenom ?? ""}
                  onChange={(e) => updateStagiaire(index, "prenom", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Téléphone"
                  value={stagiaire.telephone ?? ""}
                  onChange={(e) => updateStagiaire(index, "telephone", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={stagiaire.email ?? ""}
                  onChange={(e) => updateStagiaire(index, "email", e.target.value)}
                />
              </Grid>
            </Grid>
          </Paper>
        ))}
      </Stack>
    </Paper>
  );
}
