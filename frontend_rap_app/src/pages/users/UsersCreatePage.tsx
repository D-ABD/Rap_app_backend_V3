// src/pages/users/UsersCreatePage.tsx
import { FormEvent, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  TextField,
  Button,
  Stack,
  MenuItem,
  Typography,
  Grid,
} from "@mui/material";

import PageTemplate from "../../components/PageTemplate";
import FormSectionCard from "../../components/forms/FormSectionCard";
import FormActionsBar from "../../components/forms/FormActionsBar";
import useForm from "../../hooks/useForm";
import { useUserRoles } from "../../hooks/useUsers";
import api from "../../api/axios";
import { UserCreatePayload } from "../../types/User";

export default function UsersCreatePage() {
  const navigate = useNavigate();
  const { roles, loading: loadingRoles } = useUserRoles();

  const {
    values,
    errors,
    handleChange,
    setErrors,
    resetForm,
    setFieldValue,
  } = useForm<UserCreatePayload>({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    password: "",
    phone: "",
    bio: "",
    avatar: null,
    role: "stagiaire",
  });

  /* ===================== VALIDATION DU ROLE ===================== */
  const roleIsValid = useMemo(
    () => roles.some((r) => r.value === values.role),
    [roles, values.role]
  );

  useEffect(() => {
    if (!roles.length) return;

    if (!roleIsValid) {
      setFieldValue("role", roles[0].value);
    }
  }, [roles, roleIsValid, setFieldValue]);

  /* ===================== LOGIQUE NAV ===================== */
  const isCandidatOuStagiaire =
    values.role === "stagiaire" ||
    values.role === "candidat" ||
    values.role === "candidatuser";

  /* ===================== SUBMIT ===================== */
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

  /* ===================== RENDER ===================== */
  return (
    <PageTemplate
      title="Créer un utilisateur"
      subtitle="Renseignez les informations du compte, le rôle et les données de profil."
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
          {/* ===================== COMPTE ===================== */}
          <FormSectionCard
            title="Informations du compte"
            subtitle="Identifiants nécessaires à la création de l’utilisateur."
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  name="email"
                  label="Email"
                  value={values.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email || "Adresse email de connexion."}
                  required
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="username"
                  label="Nom d’utilisateur"
                  value={values.username}
                  onChange={handleChange}
                  error={!!errors.username}
                  helperText={errors.username || "Identifiant affiché."}
                  required
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="first_name"
                  label="Prénom"
                  value={values.first_name}
                  onChange={handleChange}
                  error={!!errors.first_name}
                  helperText={errors.first_name}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="last_name"
                  label="Nom"
                  value={values.last_name}
                  onChange={handleChange}
                  error={!!errors.last_name}
                  helperText={errors.last_name}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="password"
                  type="password"
                  label="Mot de passe"
                  value={values.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  helperText={errors.password || "Mot de passe initial."}
                  required
                  fullWidth
                />
              </Grid>

              {/* ===================== ROLE FIX ===================== */}
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  name="role"
                  label="Rôle"
                  value={roleIsValid ? values.role : ""}
                  onChange={handleChange}
                  error={!!errors.role}
                  helperText={errors.role || "Rôle utilisateur."}
                  fullWidth
                >
                  <MenuItem value="">
                    <em>Sélectionner un rôle</em>
                  </MenuItem>

                  {roles.map((r) => (
                    <MenuItem key={r.value} value={r.value}>
                      {r.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </FormSectionCard>

          {/* ===================== PROFIL ===================== */}
          <FormSectionCard
            title="Profil"
            subtitle="Informations complémentaires visibles dans le profil utilisateur."
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  name="phone"
                  label="Téléphone"
                  value={values.phone || ""}
                  onChange={handleChange}
                  error={!!errors.phone}
                  helperText={errors.phone}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Avatar
                  </Typography>

                  <Box
                    sx={{
                      px: 1.5,
                      py: 1.25,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      bgcolor: "background.paper",
                    }}
                  >
                    <input name="avatar" type="file" onChange={handleChange} />
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  name="bio"
                  label="Bio"
                  value={values.bio || ""}
                  onChange={handleChange}
                  error={!!errors.bio}
                  helperText={errors.bio || "Présentation courte."}
                  fullWidth
                  multiline
                  minRows={3}
                />
              </Grid>
            </Grid>
          </FormSectionCard>

          {/* ===================== ACTIONS ===================== */}
          <FormActionsBar sx={{ mt: 1 }}>
            <Button variant="outlined" onClick={() => navigate("/users")}>
              Annuler
            </Button>

            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={loadingRoles}
            >
              💾 Créer
            </Button>
          </FormActionsBar>
        </Stack>
      </Box>
    </PageTemplate>
  );
}