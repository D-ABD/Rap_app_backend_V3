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

import api from "../../api/axios";
import useForm from "../../hooks/useForm";
import PageTemplate from "../../components/PageTemplate";
import FormSectionCard from "../../components/forms/FormSectionCard";
import FormActionsBar from "../../components/forms/FormActionsBar";

type Choice = {
  value: string;
  label: string;
  default_color: string;
};

export default function StatutsCreatePage() {
  const navigate = useNavigate();
  const theme = useTheme<AppTheme>();
  const neutralFallback = theme.palette.grey[400];
  const [choices, setChoices] = useState<Choice[]>([]);

  const { values, handleChange, resetForm } = useForm({
    nom: "",
    couleur: "",
    description_autre: "",
  });

  useEffect(() => {
    api.get("/statuts/choices/").then((res) => {
      const rawChoices = res.data?.data?.results;
      setChoices(Array.isArray(rawChoices) ? rawChoices : []);
    });
  }, []);

  const selectedChoice = choices.find((c) => c.value === values.nom);
  const previewColor = values.couleur || selectedChoice?.default_color || neutralFallback;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!values.nom.trim() || (values.nom === "autre" && !values.description_autre.trim())) {
      toast.error("Tous les champs obligatoires doivent être remplis.");
      return;
    }

    try {
      await api.post("/statuts/", values);
      toast.success("Statut créé avec succès");
      navigate("/statuts");
    } catch {
      toast.error("Erreur lors de la création");
    }
  };

  return (
    <PageTemplate
      title="Créer un statut"
      subtitle="Ajoutez un nouveau statut avec son libellé et sa couleur d’affichage."
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => {
        resetForm();
        toast.info("Formulaire réinitialisé");
      }}
    >
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <FormSectionCard
            title="Informations principales"
            subtitle="Sélectionnez le statut, ajoutez une description si nécessaire et définissez sa couleur."
          >
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  id="nom"
                  name="nom"
                  label="Nom du statut"
                  value={values.nom}
                  onChange={handleChange}
                  required
                  helperText="Choisissez un statut dans la liste disponible."
                >
                  {choices.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {values.nom === "autre" ? (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="description_autre"
                    name="description_autre"
                    label="Description personnalisée"
                    value={values.description_autre}
                    onChange={handleChange}
                    required
                    helperText="Précisez le libellé du statut personnalisé."
                  />
                </Grid>
              ) : null}

              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  id="couleur"
                  name="couleur"
                  label="Couleur (hexadécimal)"
                  value={values.couleur}
                  onChange={handleChange}
                  helperText="Laissez vide pour utiliser la couleur par défaut du statut sélectionné."
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Aperçu couleur
                  </Typography>
                  <Box
                    sx={{
                      width: "100%",
                      minHeight: 56,
                      borderRadius: 2,
                      bgcolor: previewColor,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                    title={`Aperçu couleur : ${previewColor}`}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {previewColor}
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </FormSectionCard>

          <FormActionsBar sx={{ mt: 1 }}>
            <Button type="button" variant="outlined" onClick={() => navigate("/statuts")}>
              Annuler
            </Button>
            <Button type="submit" variant="contained" color="success">
              💾 Créer
            </Button>
          </FormActionsBar>
        </Stack>
      </Box>
    </PageTemplate>
  );
}