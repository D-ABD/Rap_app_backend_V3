import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Stack,
  Button,
  TextField,
  MenuItem,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";

import api from "../../api/axios";
import useForm from "../../hooks/useForm";
import PageTemplate from "../../components/PageTemplate";
import { STATUT_COLORS, getContrastText } from "../../constants/colors";

type Choice = {
  value: string;
  label: string;
  default_color: string;
};

export default function TypeOffresEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [choices, setChoices] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(true);
  const [libelle, setLibelle] = useState("");
  const [initialColor, setInitialColor] = useState("#6c757d");

  const { values, handleChange, setValues } = useForm({
    nom: "",
    autre: "",
    couleur: "",
  });

  const fetchTypeOffre = useCallback(async () => {
    try {
      const [res, choicesRes] = await Promise.all([
        api.get(`/typeoffres/${id}/`),
        api.get("/typeoffres/choices/"),
      ]);

      const offre = res.data;
      setValues({
        nom: offre.nom || "",
        autre: offre.autre || "",
        couleur: offre.couleur || "",
      });

      setLibelle(offre.libelle || "");
      setInitialColor(offre.couleur || "#6c757d");

      const rawChoices = choicesRes.data?.data;
      if (Array.isArray(rawChoices)) {
        setChoices(rawChoices);
      }
    } catch {
      toast.error("Erreur lors du chargement");
      navigate("/typeoffres");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, setValues]);

  useEffect(() => {
    fetchTypeOffre();
  }, [fetchTypeOffre]);

  const selectedChoice = choices.find((c) => c.value === values.nom);
  const previewColor = values.couleur || selectedChoice?.default_color || initialColor;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!values.nom.trim()) {
      toast.error('Le champ "Type" est obligatoire.');
      return;
    }

    if (values.nom === "autre" && !values.autre.trim()) {
      toast.error("Veuillez renseigner un nom personnalisé.");
      return;
    }

    try {
      await api.put(`/typeoffres/${id}/`, values);
      toast.success("Type d’offre mis à jour");
      navigate("/typeoffres");
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  return (
    <PageTemplate
      title={libelle ? `Modifier le type : ${libelle}` : "Modifier un type d’offre"}
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={fetchTypeOffre}
    >
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="30vh">
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            {/* Infos actuelles */}
            {libelle && (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  backgroundColor: "action.hover",
                  p: 1.5,
                  borderLeft: 4,
                  borderLeftColor: "primary.main",
                  borderRadius: 1,
                  mb: 2,
                }}
              >
                <Typography>
                  🛈 Type en cours : <strong>{libelle}</strong>
                </Typography>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: 1,
                    bgcolor: initialColor,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                  title={`Couleur actuelle : ${initialColor}`}
                />
              </Stack>
            )}

            {/* Select nom */}
            <TextField
              select
              fullWidth
              margin="normal"
              id="nom"
              name="nom"
              label="Type"
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

            {/* Champ autre */}
            {values.nom === "autre" && (
              <TextField
                fullWidth
                margin="normal"
                id="autre"
                name="autre"
                label="Nom personnalisé"
                value={values.autre}
                onChange={handleChange}
                required
              />
            )}

            {/* Palette de couleurs */}
            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              Choisissez une couleur
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
              {STATUT_COLORS.map((color) => (
                <Box
                  key={color}
                  onClick={() => setValues((prev) => ({ ...prev, couleur: color }))}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    bgcolor: color,
                    border: values.couleur === color ? "3px solid black" : "1px solid #ccc",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    "&:hover": { transform: "scale(1.1)" },
                  }}
                  title={color}
                />
              ))}
            </Stack>

            {/* Aperçu couleur avec texte lisible */}
            <Stack direction="row" alignItems="center" spacing={1} mt={2}>
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  bgcolor: previewColor,
                  color: getContrastText(previewColor),
                  border: "1px solid",
                  borderColor: "divider",
                  fontWeight: "bold",
                }}
              >
                Exemple texte
              </Box>
              <Typography variant="body2">{previewColor}</Typography>
            </Stack>

            {/* Boutons */}
            <Stack direction="row" spacing={2} mt={3}>
              <Button type="submit" variant="contained" color="primary">
                💾 Enregistrer
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
