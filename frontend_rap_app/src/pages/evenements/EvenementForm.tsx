import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { toApiError } from "../../api/httpClient";
import type { Evenement, EvenementChoice, EvenementFormData, FormationSimpleOption } from "../../types/evenement";

type Props = {
  initialValues?: Partial<EvenementFormData> | Partial<Evenement>;
  types: EvenementChoice[];
  formations: FormationSimpleOption[];
  loading?: boolean;
  onSubmit: (values: EvenementFormData) => Promise<void | Evenement>;
  onCancel?: () => void;
  submitLabel?: string;
  fixedFormationId?: number;
};

export default function EvenementForm({
  initialValues,
  types,
  formations,
  loading = false,
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
  fixedFormationId,
}: Props) {
  const [values, setValues] = useState<EvenementFormData>({
    formation_id: fixedFormationId ?? null,
    type_evenement: "",
    description_autre: "",
    details: "",
    event_date: "",
    lieu: "",
    participants_prevus: null,
    participants_reels: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  useEffect(() => {
    if (!initialValues) return;
    setValues({
      formation_id:
        fixedFormationId ??
        ("formation_id" in initialValues
          ? (initialValues.formation_id as number | null | undefined) ?? null
          : null),
      type_evenement: ("type_evenement" in initialValues ? initialValues.type_evenement : "") ?? "",
      description_autre:
        ("description_autre" in initialValues ? initialValues.description_autre : "") ?? "",
      details: ("details" in initialValues ? initialValues.details : "") ?? "",
      event_date: ("event_date" in initialValues ? initialValues.event_date : "") ?? "",
      lieu: ("lieu" in initialValues ? initialValues.lieu : "") ?? "",
      participants_prevus:
        ("participants_prevus" in initialValues ? initialValues.participants_prevus : null) ?? null,
      participants_reels:
        ("participants_reels" in initialValues ? initialValues.participants_reels : null) ?? null,
    });
  }, [fixedFormationId, initialValues]);

  const selectedFormationName = useMemo(
    () => formations.find((f) => f.id === values.formation_id)?.nom ?? null,
    [formations, values.formation_id]
  );

  const handleChange = (name: keyof EvenementFormData, value: string | number | null) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setGeneralError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!values.formation_id) nextErrors.formation_id = "Veuillez sélectionner une formation.";
    if (!values.type_evenement) nextErrors.type_evenement = "Veuillez sélectionner un type d'événement.";
    if (!values.event_date) nextErrors.event_date = "Veuillez renseigner une date.";
    if (values.type_evenement === "autre" && !values.description_autre?.trim()) {
      nextErrors.description_autre = "Veuillez décrire l'événement de type « autre ».";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      await onSubmit(values);
    } catch (err) {
      const apiError = toApiError(err);
      const fieldErrors = Object.fromEntries(
        Object.entries(apiError.errors ?? {}).map(([field, messages]) => [field, messages[0] ?? ""])
      );
      setErrors(fieldErrors);
      setGeneralError(apiError.message || "Impossible d'enregistrer l'événement.");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {generalError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {generalError}
        </Alert>
      ) : null}

      {fixedFormationId && selectedFormationName ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          L'événement sera créé pour la formation <strong>{selectedFormationName}</strong>.
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth error={!!errors.formation_id} disabled={!!fixedFormationId}>
            <InputLabel id="event-formation-label">Formation</InputLabel>
            <Select
              labelId="event-formation-label"
              value={values.formation_id ? String(values.formation_id) : ""}
              label="Formation"
              onChange={(e) => handleChange("formation_id", e.target.value ? Number(e.target.value) : null)}
            >
              {formations.map((formation) => (
                <MenuItem key={formation.id} value={String(formation.id)}>
                  {formation.nom}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.formation_id || "Formation concernée par l'événement."}</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth error={!!errors.type_evenement}>
            <InputLabel id="event-type-label">Type d'événement</InputLabel>
            <Select
              labelId="event-type-label"
              value={values.type_evenement}
              label="Type d'événement"
              onChange={(e) => handleChange("type_evenement", e.target.value)}
            >
              {types.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.type_evenement || "Nature de l'événement."}</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="date"
            label="Date de l'événement"
            value={values.event_date ?? ""}
            onChange={(e) => handleChange("event_date", e.target.value)}
            error={!!errors.event_date}
            helperText={errors.event_date}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Lieu"
            value={values.lieu ?? ""}
            onChange={(e) => handleChange("lieu", e.target.value)}
            error={!!errors.lieu}
            helperText={errors.lieu || "Lieu ou canal principal de l'événement."}
          />
        </Grid>

        {values.type_evenement === "autre" ? (
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description de l'événement"
              value={values.description_autre ?? ""}
              onChange={(e) => handleChange("description_autre", e.target.value)}
              error={!!errors.description_autre}
              helperText={errors.description_autre || "Précisez le type d'événement."}
            />
          </Grid>
        ) : null}

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Détails"
            value={values.details ?? ""}
            onChange={(e) => handleChange("details", e.target.value)}
            error={!!errors.details}
            helperText={errors.details || "Informations utiles à l'équipe."}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Participants prévus"
            value={values.participants_prevus ?? ""}
            onChange={(e) =>
              handleChange("participants_prevus", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Participants réels"
            value={values.participants_reels ?? ""}
            onChange={(e) =>
              handleChange("participants_reels", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </Grid>
      </Grid>

      <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button type="submit" variant="contained" disabled={loading} fullWidth>
          {loading ? "Enregistrement..." : submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="outlined" onClick={onCancel} fullWidth>
            Annuler
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}

