// src/pages/users/UsersCreatePage.tsx
import { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Paper, TextField, Button, Stack, MenuItem, Typography } from "@mui/material";

import PageTemplate from "../../components/PageTemplate";
import useForm from "../../hooks/useForm";
import { useUserRoles } from "../../hooks/useUsers";
import api from "../../api/axios";
import { UserCreatePayload } from "../../types/User";

export default function UsersCreatePage() {
  const navigate = useNavigate();
  const { roles, loading: loadingRoles } = useUserRoles();

  const { values, errors, handleChange, setErrors, resetForm } = useForm<UserCreatePayload>({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    password: "",
    phone: "",
    bio: "",
    avatar: null,
    role: "stagiaire", // ✅ valeur par défaut
  });

  const isCandidatOuStagiaire = values.role === "stagiaire" || values.role === "candidat";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData();

      for (const [key, value] of Object.entries(values)) {
        if (value !== null && value !== undefined && value !== "") {
          if (value instanceof File || typeof value === "string") {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      }

      const res = await api.post("/users/", formData);
      const createdUser = res.data?.data;
      toast.success("✅ Utilisateur créé");

      if (isCandidatOuStagiaire) {
        toast.info("Veuillez attribuer une formation à cet utilisateur.");
        navigate(`/users/${createdUser.id}/edit`);
      } else {
        navigate("/users");
      }
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
      toast.error("Erreur lors de la création");
    }
  };

  return (
    <PageTemplate
      title="Créer un utilisateur"
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
          <Stack spacing={2}>
            <TextField
              id="email"
              name="email"
              label="Email"
              value={values.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              required
              fullWidth
            />
            <TextField
              id="username"
              name="username"
              label="Nom d’utilisateur"
              value={values.username}
              onChange={handleChange}
              error={!!errors.username}
              helperText={errors.username}
              required
              fullWidth
            />
            <TextField
              id="first_name"
              name="first_name"
              label="Prénom"
              value={values.first_name}
              onChange={handleChange}
              error={!!errors.first_name}
              helperText={errors.first_name}
              fullWidth
            />
            <TextField
              id="last_name"
              name="last_name"
              label="Nom"
              value={values.last_name}
              onChange={handleChange}
              error={!!errors.last_name}
              helperText={errors.last_name}
              fullWidth
            />
            <TextField
              id="password"
              name="password"
              type="password"
              label="Mot de passe"
              value={values.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              required
              fullWidth
            />

            <TextField
              id="role"
              name="role"
              label="Rôle"
              select
              value={values.role}
              onChange={handleChange}
              error={!!errors.role}
              helperText={errors.role}
              fullWidth
            >
              {roles.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              id="phone"
              name="phone"
              label="Téléphone"
              value={values.phone || ""}
              onChange={handleChange}
              error={!!errors.phone}
              helperText={errors.phone}
              fullWidth
            />
            <TextField
              id="bio"
              name="bio"
              label="Bio"
              value={values.bio || ""}
              onChange={handleChange}
              error={!!errors.bio}
              helperText={errors.bio}
              fullWidth
            />

            {/* Avatar upload */}
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                Avatar
              </Typography>
              <input id="avatar" name="avatar" type="file" onChange={handleChange} />
            </Stack>

            <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
              <Button type="submit" variant="contained" color="success" disabled={loadingRoles}>
                💾 Créer
              </Button>
              <Button type="button" variant="outlined" onClick={() => navigate("/users")}>
                Annuler
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </PageTemplate>
  );
}
