import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../hooks/useAuth";
import { Box, Paper, Typography, TextField, Button, Alert, Link } from "@mui/material";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Typage minimal pour éviter les erreurs TS
  type LoggedUser = {
    role?: string;
    is_superuser?: boolean;
    is_staff?: boolean;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ Authentification
      const result = (await login(email, password)) as unknown as LoggedUser;

      // ✅ Détermination du rôle
      const role = (result?.role ?? "").toLowerCase();

      // ✅ Redirection en fonction du rôle
      if (["declic_staff"].includes(role)) {
        navigate("/dashboard/declic", { replace: true });
      } else if (["prepa_staff"].includes(role)) {
        navigate("/dashboard/prepa", { replace: true });
      } else if (["staff", "staff_read", "admin", "superadmin"].includes(role)) {
        navigate("/dashboard", { replace: true });
      } else if (["candidat", "candidate"].includes(role)) {
        navigate("/dashboard/candidat", { replace: true });
      } else {
        navigate("/dashboard", { replace: true }); // fallback
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { detail?: string } | undefined;
        const msg = data?.detail || "Identifiants incorrects.";
        setError(msg);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erreur inconnue");
      }
    } finally {
      setLoading(false);
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
          maxWidth: 400,
          width: "100%",
          p: 4,
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom align="center">
          Se connecter
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Adresse email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            fullWidth
            required
            autoFocus
          />

          <TextField
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            fullWidth
            required
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </Box>

        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          Pas encore de compte ?{" "}
          <Link component={RouterLink} to="/register">
            Créer un compte
          </Link>
        </Typography>

        <Typography variant="caption" align="center" display="block" sx={{ mt: 2 }}>
          En vous connectant, vous acceptez nos{" "}
          <Link component={RouterLink} to="/politique-confidentialite" target="_blank">
            conditions de confidentialité
          </Link>
          .
        </Typography>
      </Paper>
    </Box>
  );
}
