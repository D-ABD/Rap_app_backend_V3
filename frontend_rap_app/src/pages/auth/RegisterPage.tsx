// src/pages/auth/RegisterPage.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import api from "../../api/axios";
import { toast } from "react-toastify";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Checkbox,
  FormControlLabel,
  Divider,
} from "@mui/material";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password1: "",
    password2: "",
    first_name: "",
    last_name: "",
    acceptRGPD: false, // ✅ consentement explicite RGPD
  });

  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password1 !== form.password2) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!form.acceptRGPD) {
      setError("Vous devez accepter la politique de confidentialité (RGPD).");
      return;
    }

    try {
      await api.post("/register/", {
        email: form.email,
        password: form.password1,
        first_name: form.first_name,
        last_name: form.last_name,
        consent_rgpd: true, // 🔒 trace du consentement côté backend si tu veux le journaliser
      });

      toast.success("✅ Compte créé avec succès. En attente de validation.");
      navigate("/login");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as Record<string, string[]>;
        const msg =
          data?.email?.[0] ||
          data?.password?.[0] ||
          data?.first_name?.[0] ||
          data?.last_name?.[0] ||
          data?.non_field_errors?.[0] ||
          "Erreur lors de la création du compte.";
        setError(msg);
      } else {
        setError("Une erreur inconnue est survenue.");
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          maxWidth: 420,
          width: "100%",
          p: 4,
          borderRadius: 3,
        }}
      >
        <Typography variant="h5" component="h1" fontWeight="bold" align="center" gutterBottom>
          Création de compte
        </Typography>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Créez votre compte pour accéder à votre espace personnel sécurisé.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Prénom"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            margin="normal"
            fullWidth
            required
          />

          <TextField
            label="Nom"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            margin="normal"
            fullWidth
            required
          />

          <TextField
            label="Adresse e-mail"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            margin="normal"
            fullWidth
            required
          />

          <TextField
            label="Mot de passe"
            name="password1"
            type="password"
            value={form.password1}
            onChange={handleChange}
            margin="normal"
            fullWidth
            required
          />

          <TextField
            label="Confirmer le mot de passe"
            name="password2"
            type="password"
            value={form.password2}
            onChange={handleChange}
            margin="normal"
            fullWidth
            required
          />

          {/* ✅ Consentement RGPD obligatoire */}
          <FormControlLabel
            control={
              <Checkbox
                name="acceptRGPD"
                checked={form.acceptRGPD}
                onChange={handleChange}
                required
              />
            }
            label={
              <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                J’ai lu et j’accepte la{" "}
                <Link to="/politique-confidentialite" target="_blank">
                  politique de confidentialité
                </Link>{" "}
                ainsi que le traitement de mes données personnelles conformément au RGPD.
              </Typography>
            }
            sx={{ mt: 2 }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Vos données sont utilisées uniquement pour la gestion de votre compte et ne seront
            jamais transmises à des tiers sans votre accord.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 3 }}>
            Créer mon compte
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" align="center">
          Déjà inscrit ?{" "}
          <Link to="/login" style={{ textDecoration: "none" }}>
            Se connecter
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
