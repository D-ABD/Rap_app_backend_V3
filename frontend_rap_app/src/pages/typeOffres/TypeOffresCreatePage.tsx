import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Stack,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  useTheme,
} from "@mui/material";
import type { AppTheme } from "../../theme";

import useForm from "../../hooks/useForm";
import api from "../../api/axios";
import PageTemplate from "../../components/PageTemplate";
import LoadingState from "../../components/ui/LoadingState";
import FormSectionCard from "../../components/forms/FormSectionCard";
import FormActionsBar from "../../components/forms/FormActionsBar";

type Choice = {
  value: string;
  label: string;
  default_color: string;
};

export default function TypeOffresCreatePage() {
  const navigate = useNavigate();
  const theme = useTheme<AppTheme>();
  const neutralFallback = theme.palette.grey[600];
  const [choices, setChoices] = useState<Choice[]>([]);
  const [previewColor, setPreviewColor] = useState(neutralFallback);
  const [loading, setLoading] = useState(true);

  const { values, errors, handleChange, resetForm, setErrors, setFieldValue } = useForm({
    nom: "",
    couleur: "",
    autre: "",
  });

  useEffect(() => {
    api
      .get("/typeoffres/choices/")
      .then((res) => {
        const payload = res.data?.data?.results ?? res.data?.data ?? [];
        setChoices(Array.isArray(payload) ? payload : []);
      })
      .catch(() => {
        toast.error("Erreur lors du chargement des types disponibles");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const selected = choices.find((c) => c.value === values.nom);

    if (values.nom && selected && !values.couleur) {
      setFieldValue("couleur", selected.default_color);
    }

    if (values.couleur) {
      setPreviewColor(values.couleur);
    } else if (selected) {
      setPreviewColor(selected.default_color);
    } else {
      setPreviewColor(neutralFallback);
    }
  }, [values.nom, values.couleur, choices, setFieldValue, neutralFallback]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!values.nom.trim()) {
      toast.error('Le champ "Type" est obligatoire.');
      return;
    }

    if (values.nom === "autre" && !values.autre.trim()) {
      toast.error("Une description est requise pour le type 'Autre'.");
      return;
    }

    try {
      await api.post("/typeoffres/", values);
      toast.success("Type d’offre créé avec succès");
      navigate("/typeoffres");
    } catch (error: unknown) {
      let message = "Erreur lors de la création du type";
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object"
      ) {
        setErrors(error.response.data);
        // @ts-expect-error: champ message non typé
        message = error.response.data.message || message;
      }
      toast.error(message);
    }
  };

  return (
    <PageTemplate
      title="Creer un type d'offre"
      subtitle="Ajoutez un type d'offre et verifiez immediatement sa couleur d'affichage."
      eyebrow="Types d'offre"
      hero
      maxWidth="md"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => {
        resetForm();
        toast.info("Formulaire réinitialisé");
      }}
    >
      {loading ? (
        <LoadingState label="Chargement des types disponibles..." />
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <FormSectionCard
              title="Informations principales"
              subtitle="Sélectionnez un type d'offre, ajustez sa couleur et ajoutez une description si nécessaire."
            >
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    id="nom"
                    name="nom"
                    label="Type d'offre"
                    value={values.nom}
                    onChange={handleChange}
                    required
                    error={Boolean(errors.nom)}
                    helperText={errors.nom || "Choisissez un type d'offre parmi les options disponibles."}
                  >
                    {choices.map((c) => (
                      <MenuItem key={c.value} value={c.value}>
                        {c.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    id="couleur"
                    name="couleur"
                    label="Couleur (#RRGGBB)"
                    value={values.couleur}
                    onChange={handleChange}
                    error={Boolean(errors.couleur)}
                    helperText={
                      errors.couleur || "Laissez la couleur proposée ou renseignez un code hexadécimal."
                    }
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      Aperçu couleur
                    </Typography>
                    <Box
                      role="img"
                      aria-label={`Aperçu couleur ${previewColor}`}
                      sx={{
                        width: "100%",
                        minHeight: 56,
                        borderRadius: 2,
                        bgcolor: previewColor,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {previewColor}
                    </Typography>
                  </Stack>
                </Grid>

                {values.nom === "autre" ? (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="autre"
                      name="autre"
                      label="Description personnalisée"
                      value={values.autre}
                      onChange={handleChange}
                      required
                      error={Boolean(errors.autre)}
                      helperText={errors.autre || "Décrivez le type personnalisé à créer."}
                    />
                  </Grid>
                ) : null}
              </Grid>
            </FormSectionCard>

            <FormActionsBar sx={{ mt: 1 }}>
              <Button type="button" variant="outlined" onClick={() => navigate("/typeoffres")}>
                Annuler
              </Button>
              <Button type="submit" variant="contained" color="primary">
                💾 Créer
              </Button>
            </FormActionsBar>
          </Stack>
        </Box>
      )}
    </PageTemplate>
  );
}