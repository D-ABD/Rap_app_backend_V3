// src/pages/users/UsersEditPage.tsx
import { useEffect, FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Paper,
  TextField,
  Button,
  Stack,
  MenuItem,
  Typography,
  CircularProgress,
} from "@mui/material";
import { AxiosError } from "axios";

import PageTemplate from "../../components/PageTemplate";
import useForm from "../../hooks/useForm";
import { useUserRoles } from "../../hooks/useUsers";
import api from "../../api/axios";
import { UserUpdatePayload } from "../../types/User";
import { FormationLight } from "../../types/prospection";

import FormationSelectModal from "../../components/modals/FormationSelectModal";

export default function UsersEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { roles, loading: loadingRoles } = useUserRoles();

  const [formations, setFormations] = useState<FormationLight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormationModal, setShowFormationModal] = useState(false);

  const { values, errors, setValues, setErrors, handleChange } = useForm<UserUpdatePayload>({
    username: "",
    first_name: "",
    last_name: "",
    phone: "",
    bio: "",
    role: undefined,
    formation: undefined,
  });

  const isCandidatOuStagiaire = values.role === "stagiaire" || values.role === "candidat";

  useEffect(() => {
    if (!id) return;

    Promise.all([
      api.get(`/users/${id}/`),
      api.get("/formations/", { params: { page_size: 1000 } }),
    ])
      .then(([userRes, formationsRes]) => {
        const userData = userRes.data.data;
        setValues({
          username: userData.username,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          bio: userData.bio,
          role: userData.role,
          formation: userData.formation_info?.id ?? undefined,
        });
        setFormations(formationsRes.data.data.results);
      })
      .catch(() => toast.error("Erreur lors du chargement des données"))
      .finally(() => setLoading(false));
  }, [id, setValues]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) {
      toast.error("ID utilisateur invalide.");
      return;
    }

    if (isCandidatOuStagiaire && !values.formation) {
      setErrors((prev) => ({
        ...prev,
        formation: "Veuillez sélectionner une formation.",
      }));
      toast.error("Veuillez sélectionner une formation.");
      return;
    }

    try {
      await api.patch(`/users/${id}/`, values);
      toast.success("✅ Utilisateur mis à jour");
      navigate("/users");
    } catch (err) {
      const error = err as AxiosError<{ errors?: Record<string, string[]> }>;
      const rawErrors = error?.response?.data?.errors;

      if (rawErrors) {
        const parsedErrors: Partial<Record<keyof UserUpdatePayload, string>> = {};
        for (const key in rawErrors) {
          const messages = rawErrors[key];
          if (Array.isArray(messages) && typeof messages[0] === "string") {
            parsedErrors[key as keyof UserUpdatePayload] = messages[0];
          }
        }
        setErrors(parsedErrors);
      }
      toast.error("Erreur lors de la mise à jour");
    }
  };

  return (
    <PageTemplate
      title={`Modifier ${values.username || "un utilisateur"}`}
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => window.location.reload()}
    >
      {loading ? (
        <CircularProgress />
      ) : (
        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                id="username"
                name="username"
                label="Nom d’utilisateur"
                value={values.username}
                onChange={handleChange}
                error={!!errors.username}
                helperText={errors.username}
                fullWidth
              />
              <TextField
                id="first_name"
                name="first_name"
                label="Prénom"
                value={values.first_name || ""}
                onChange={handleChange}
                error={!!errors.first_name}
                helperText={errors.first_name}
                fullWidth
              />
              <TextField
                id="last_name"
                name="last_name"
                label="Nom"
                value={values.last_name || ""}
                onChange={handleChange}
                error={!!errors.last_name}
                helperText={errors.last_name}
                fullWidth
              />
              <TextField
                id="role"
                name="role"
                label="Rôle"
                select
                value={values.role ?? ""}
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

              {isCandidatOuStagiaire && (
                <>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setShowFormationModal(true)}
                  >
                    🎓 Sélectionner une formation
                  </Button>

                  {values.formation && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      ✅ Formation sélectionnée :{" "}
                      {formations.find((f) => f.id === values.formation)?.nom || "—"}
                    </Typography>
                  )}

                  {errors.formation && (
                    <Typography variant="body2" color="error">
                      {errors.formation}
                    </Typography>
                  )}
                </>
              )}

              <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
                <Button type="submit" variant="contained" color="success" disabled={loadingRoles}>
                  💾 Enregistrer
                </Button>
                <Button type="button" variant="outlined" onClick={() => navigate("/users")}>
                  Annuler
                </Button>
              </Stack>
            </Stack>
          </form>
        </Paper>
      )}

      {showFormationModal && (
        <FormationSelectModal
          show={showFormationModal}
          onClose={() => setShowFormationModal(false)}
          onSelect={(formation) => {
            setValues((prev) => ({ ...prev, formation: formation.id }));
            setShowFormationModal(false);
          }}
        />
      )}
    </PageTemplate>
  );
}
