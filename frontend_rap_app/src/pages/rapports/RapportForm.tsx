import { Alert, Box, Button, CircularProgress, Grid, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import type { RapportChoices, RapportFormData } from "../../types/rapport";

interface Props {
  value: RapportFormData;
  choices: RapportChoices | null;
  loadingChoices?: boolean;
  saving?: boolean;
  error?: string | null;
  onChange: (next: RapportFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function RapportForm({
  value,
  choices,
  loadingChoices = false,
  saving = false,
  error,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  const update = <K extends keyof RapportFormData>(key: K, next: RapportFormData[K]) => {
    onChange({ ...value, [key]: next });
  };

  if (loadingChoices) {
    return <CircularProgress />;
  }

  if (!choices) {
    return <Alert severity="error">Impossible de charger les choix du formulaire rapport.</Alert>;
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Nom du rapport"
            value={value.nom}
            onChange={(e) => update("nom", e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <Select
            fullWidth
            displayEmpty
            value={value.type_rapport}
            onChange={(e) => update("type_rapport", e.target.value)}
          >
            <MenuItem value="">Type de rapport</MenuItem>
            {choices.type_rapport.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <Select
            fullWidth
            displayEmpty
            value={value.periode}
            onChange={(e) => update("periode", e.target.value)}
          >
            <MenuItem value="">Période</MenuItem>
            {choices.periode.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            type="date"
            label="Date début"
            value={value.date_debut}
            onChange={(e) => update("date_debut", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            type="date"
            label="Date fin"
            value={value.date_fin}
            onChange={(e) => update("date_fin", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <Select
            fullWidth
            displayEmpty
            value={value.format}
            onChange={(e) => update("format", e.target.value as RapportFormData["format"])}
          >
            <MenuItem value="">Format</MenuItem>
            {choices.format.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12} md={3}>
          <Select
            fullWidth
            displayEmpty
            value={value.centre}
            onChange={(e) => update("centre", e.target.value ? Number(e.target.value) : "")}
          >
            <MenuItem value="">Tous les centres</MenuItem>
            {choices.centres.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12} md={4}>
          <Select
            fullWidth
            displayEmpty
            value={value.type_offre}
            onChange={(e) => update("type_offre", e.target.value ? Number(e.target.value) : "")}
          >
            <MenuItem value="">Tous les types d’offre</MenuItem>
            {choices.type_offres.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12} md={4}>
          <Select
            fullWidth
            displayEmpty
            value={value.statut}
            onChange={(e) => update("statut", e.target.value ? Number(e.target.value) : "")}
          >
            <MenuItem value="">Tous les statuts</MenuItem>
            {choices.statuts.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12} md={4}>
          <Select
            fullWidth
            displayEmpty
            value={value.formation}
            onChange={(e) => update("formation", e.target.value ? Number(e.target.value) : "")}
          >
            <MenuItem value="">Toutes les formations</MenuItem>
            {choices.formations.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </Grid>
      </Grid>

      <Box sx={{ bgcolor: "grey.50", borderRadius: 2, p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          La génération des données du rapport se fait automatiquement à la création et à la modification.
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
        <Button variant="outlined" onClick={onCancel}>
          Annuler
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer le rapport"}
        </Button>
      </Stack>
    </Stack>
  );
}
