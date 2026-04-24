import { Alert, Button, CircularProgress, Grid, Stack } from "@mui/material";
import FormActionsBar from "../../components/forms/FormActionsBar";
import FormSectionCard from "../../components/forms/FormSectionCard";
import AppDateField from "../../components/forms/fields/AppDateField";
import AppReadonlyField from "../../components/forms/fields/AppReadonlyField";
import AppSelectField from "../../components/forms/fields/AppSelectField";
import AppTextField from "../../components/forms/fields/AppTextField";
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

      <FormSectionCard
        title="Paramètres du rapport"
        subtitle="Définissez le périmètre, la période et les filtres utilisés pour générer le rapport."
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <AppTextField
              label="Nom du rapport"
              value={value.nom}
              onChange={(e) => update("nom", e.target.value)}
              helperText="Nom interne du rapport."
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <AppSelectField
              label="Type de rapport"
              labelId="rapport-type"
              displayEmpty
              value={value.type_rapport}
              onChange={(e) => update("type_rapport", String(e.target.value))}
              helperText="Catégorie de rapport à produire."
            >
              {choices.type_rapport.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </AppSelectField>
          </Grid>

          <Grid item xs={12} md={3}>
            <AppSelectField
              label="Période"
              labelId="rapport-periode"
              displayEmpty
              value={value.periode}
              onChange={(e) => update("periode", String(e.target.value))}
              helperText="Cadre temporel principal."
            >
              {choices.periode.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </AppSelectField>
          </Grid>

          <Grid item xs={12} md={3}>
            <AppDateField
              label="Date début"
              value={value.date_debut}
              onChange={(e) => update("date_debut", e.target.value)}
              helperText="Borne basse de la période."
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <AppDateField
              label="Date fin"
              value={value.date_fin}
              onChange={(e) => update("date_fin", e.target.value)}
              helperText="Borne haute de la période."
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <AppSelectField
              label="Format"
              labelId="rapport-format"
              displayEmpty
              value={value.format}
              onChange={(e) => update("format", e.target.value as RapportFormData["format"])}
              helperText="Format de sortie du rapport."
            >
              {choices.format.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </AppSelectField>
          </Grid>

          <Grid item xs={12} md={3}>
            <AppSelectField
              label="Centre"
              labelId="rapport-centre"
              displayEmpty
              value={value.centre === "" ? "" : String(value.centre)}
              onChange={(e) => update("centre", e.target.value ? Number(e.target.value) : "")}
              helperText="Laisser vide pour inclure tous les centres."
            >
              <option value="">Tous les centres</option>
              {choices.centres.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </AppSelectField>
          </Grid>

          <Grid item xs={12} md={4}>
            <AppSelectField
              label="Type d’offre"
              labelId="rapport-type-offre"
              displayEmpty
              value={value.type_offre === "" ? "" : String(value.type_offre)}
              onChange={(e) => update("type_offre", e.target.value ? Number(e.target.value) : "")}
              helperText="Laisser vide pour inclure tous les types d’offre."
            >
              <option value="">Tous les types d’offre</option>
              {choices.type_offres.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </AppSelectField>
          </Grid>

          <Grid item xs={12} md={4}>
            <AppSelectField
              label="Statut"
              labelId="rapport-statut"
              displayEmpty
              value={value.statut === "" ? "" : String(value.statut)}
              onChange={(e) => update("statut", e.target.value ? Number(e.target.value) : "")}
              helperText="Laisser vide pour inclure tous les statuts."
            >
              <option value="">Tous les statuts</option>
              {choices.statuts.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </AppSelectField>
          </Grid>

          <Grid item xs={12} md={4}>
            <AppSelectField
              label="Formation"
              labelId="rapport-formation"
              displayEmpty
              value={value.formation === "" ? "" : String(value.formation)}
              onChange={(e) => update("formation", e.target.value ? Number(e.target.value) : "")}
              helperText="Laisser vide pour inclure toutes les formations."
            >
              <option value="">Toutes les formations</option>
              {choices.formations.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </AppSelectField>
          </Grid>
        </Grid>
      </FormSectionCard>

      <FormSectionCard
        title="Information"
        subtitle="Rappel sur le comportement du module de génération."
      >
        <AppReadonlyField
          label="Information"
          value="La génération des données du rapport se fait automatiquement à la création et à la modification."
          multiline
          minRows={2}
          onChange={() => {}}
          sx={{ bgcolor: "grey.50", borderRadius: 2 }}
        />
      </FormSectionCard>

      <FormActionsBar>
        <Button variant="outlined" onClick={onCancel}>
          Annuler
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer le rapport"}
        </Button>
      </FormActionsBar>
    </Stack>
  );
}