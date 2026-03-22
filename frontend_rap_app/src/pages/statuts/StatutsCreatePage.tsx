import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Stack, Button, TextField, MenuItem, Paper } from "@mui/material";

import api from "../../api/axios";
import useForm from "../../hooks/useForm";
import PageTemplate from "../../components/PageTemplate";

type Choice = {
  value: string;
  label: string;
  default_color: string;
};

export default function StatutsCreatePage() {
  const navigate = useNavigate();
  const [choices, setChoices] = useState<Choice[]>([]);

  const { values, handleChange, resetForm } = useForm({
    nom: "",
    couleur: "",
    description_autre: "",
  });

  useEffect(() => {
    api.get("/statuts/choices/").then((res) => {
      setChoices(res.data.results);
    });
  }, []);

  const selectedChoice = choices.find((c) => c.value === values.nom);
  const previewColor = values.couleur || selectedChoice?.default_color || "#d3d3d3";

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
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => {
        resetForm();
        toast.info("Formulaire réinitialisé");
      }}
    >
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          {/* Select statut */}
          <TextField
            select
            fullWidth
            margin="normal"
            id="nom"
            name="nom"
            label="Nom du statut"
            value={values.nom}
            onChange={handleChange}
            required
          >
            {choices.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Champ description si "autre" */}
          {values.nom === "autre" && (
            <TextField
              fullWidth
              margin="normal"
              id="description_autre"
              name="description_autre"
              label="Description personnalisée"
              value={values.description_autre}
              onChange={handleChange}
              required
            />
          )}

          {/* Champ couleur */}
          <TextField
            fullWidth
            margin="normal"
            id="couleur"
            name="couleur"
            label="Couleur (hexadécimal)"
            value={values.couleur}
            onChange={handleChange}
          />

          {/* Aperçu couleur */}
          <Box
            sx={{
              mt: 2,
              width: 40,
              height: 20,
              borderRadius: 1,
              bgcolor: previewColor,
              border: "1px solid",
              borderColor: "divider",
            }}
            title={`Aperçu couleur : ${previewColor}`}
          />

          {/* Boutons */}
          <Stack direction="row" spacing={2} mt={3}>
            <Button type="submit" variant="contained" color="success">
              💾 Créer
            </Button>
            <Button type="button" variant="outlined" onClick={() => navigate("/statuts")}>
              Annuler
            </Button>
          </Stack>
        </form>
      </Paper>
    </PageTemplate>
  );
}
