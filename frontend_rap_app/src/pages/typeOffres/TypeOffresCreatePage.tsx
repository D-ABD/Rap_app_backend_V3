import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Stack, Button, TextField, MenuItem, Paper, CircularProgress } from "@mui/material";

import useForm from "../../hooks/useForm";
import api from "../../api/axios";
import PageTemplate from "../../components/PageTemplate";

type Choice = {
  value: string;
  label: string;
  default_color: string;
};

export default function TypeOffresCreatePage() {
  const navigate = useNavigate();
  const [choices, setChoices] = useState<Choice[]>([]);
  const [previewColor, setPreviewColor] = useState("#6c757d");
  const [loading, setLoading] = useState(true);

  const { values, errors, handleChange, resetForm, setErrors, setFieldValue } = useForm({
    nom: "",
    couleur: "",
    autre: "",
  });

  // 📥 Charge les choix
  useEffect(() => {
    api
      .get("/typeoffres/choices/")
      .then((res) => {
        const payload = res.data.results?.results || res.data.results || res.data.data || [];
        setChoices(Array.isArray(payload) ? payload : []);
      })
      .catch(() => {
        toast.error("Erreur lors du chargement des types disponibles");
      })
      .finally(() => setLoading(false));
  }, []);

  // 🎨 Couleur par défaut / preview
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
      setPreviewColor("#6c757d");
    }
  }, [values.nom, values.couleur, choices, setFieldValue]);

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
      title="Créer un type d'offre"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => {
        resetForm();
        toast.info("Formulaire réinitialisé");
      }}
    >
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="30vh">
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            {/* Select nom */}
            <TextField
              select
              fullWidth
              margin="normal"
              id="nom"
              name="nom"
              label="Type d'offre"
              value={values.nom}
              onChange={handleChange}
              required
              error={Boolean(errors.nom)}
              helperText={errors.nom}
            >
              {choices.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>

            {/* Couleur */}
            <TextField
              fullWidth
              margin="normal"
              id="couleur"
              name="couleur"
              label="Couleur (#RRGGBB)"
              value={values.couleur}
              onChange={handleChange}
              error={Boolean(errors.couleur)}
              helperText={errors.couleur}
            />

            {/* Autre si nécessaire */}
            {values.nom === "autre" && (
              <TextField
                fullWidth
                margin="normal"
                id="autre"
                name="autre"
                label="Description personnalisée"
                value={values.autre}
                onChange={handleChange}
                required
                error={Boolean(errors.autre)}
                helperText={errors.autre}
              />
            )}

            {/* Preview */}
            <Box
              role="img"
              aria-label={`Aperçu couleur ${previewColor}`}
              sx={{
                mt: 2,
                width: 24,
                height: 24,
                borderRadius: 1,
                bgcolor: previewColor,
                border: "1px solid",
                borderColor: "divider",
              }}
            />

            {/* Actions */}
            <Stack direction="row" spacing={2} mt={3}>
              <Button type="submit" variant="contained" color="primary">
                💾 Créer
              </Button>
              <Button type="button" variant="outlined" onClick={() => navigate("/typeoffres")}>
                Annuler
              </Button>
            </Stack>
          </form>
        </Paper>
      )}
    </PageTemplate>
  );
}
