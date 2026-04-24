import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Grid, MenuItem, Stack } from "@mui/material";
import { toApiError } from "../../api/httpClient";
import FormActionsBar from "../../components/forms/FormActionsBar";
import FormSectionCard from "../../components/forms/FormSectionCard";
import AppDateField from "../../components/forms/fields/AppDateField";
import AppNumberField from "../../components/forms/fields/AppNumberField";
import AppSelectField from "../../components/forms/fields/AppSelectField";
import AppTextField from "../../components/forms/fields/AppTextField";
import type {
  Evenement,
  EvenementChoice,
  EvenementFormData,
  FormationSimpleOption,
} from "../../types/evenement";

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
      type_evenement:
        ("type_evenement" in initialValues ? initialValues.type_evenement : "") ?? "",
      description_autre:
        ("description_autre" in initialValues ? initialValues.description_autre : "") ?? "",
      details: ("details" in initialValues ? initialValues.details : "") ?? "",
      event_date: ("event_date" in initialValues ? initialValues.event_date : "") ?? "",
      lieu: ("lieu" in initialValues ? initialValues.lieu : "") ?? "",
      participants_prevus:
        ("participants_prevus" in initialValues ? initialValues.participants_prevus : null) ??
        null,
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

    if (!values.formation_id) {
      nextErrors.formation_id = "Veuillez sélectionner une formation.";
    }
    if (!values.type_evenement) {
      nextErrors.type_evenement = "Veuillez sélectionner un type d'événement.";
    }
    if (!values.event_date) {
      nextErrors.event_date = "Veuillez renseigner une date.";
    }
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
        Object.entries(apiError.errors ?? {}).map(([field, messages]) => [
          field,
          messages[0] ?? "",
        ])
      );
      setErrors(fieldErrors);
      setGeneralError(apiError.message || "Impossible d'enregistrer l'événement.");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {generalError ? (
          <Alert severity="error">
            {generalError}
          </Alert>
        ) : null}

        {fixedFormationId && selectedFormationName ? (
          <Alert severity="info">
            L'événement sera créé pour la formation <strong>{selectedFormationName}</strong>.
          </Alert>
        ) : null}

        <FormSectionCard
          title="Détails de l'événement"
          subtitle="Renseignez la formation, le type, la date et les informations de participation."
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <AppSelectField
                label="Formation"
                labelId="event-formation-label"
                error={!!errors.formation_id}
                disabled={!!fixedFormationId}
                value={values.formation_id ? String(values.formation_id) : ""}
                onChange={(e) =>
                  handleChange("formation_id", e.target.value ? Number(e.target.value) : null)
                }
                helperText={errors.formation_id || "Formation concernée par l'événement."}
              >
                {formations.map((formation) => (
                  <MenuItem key={formation.id} value={String(formation.id)}>
                    {formation.nom}
                  </MenuItem>
                ))}
              </AppSelectField>
            </Grid>

            <Grid item xs={12} md={6}>
              <AppSelectField
                label="Type d'événement"
                labelId="event-type-label"
                error={!!errors.type_evenement}
                value={values.type_evenement}
                onChange={(e) => handleChange("type_evenement", String(e.target.value))}
                helperText={errors.type_evenement || "Nature de l'événement."}
              >
                {types.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </AppSelectField>
            </Grid>

            <Grid item xs={12} md={6}>
              <AppDateField
                label="Date de l'événement"
                value={values.event_date ?? ""}
                onChange={(e) => handleChange("event_date", e.target.value)}
                error={!!errors.event_date}
                helperText={errors.event_date}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <AppTextField
                label="Lieu"
                value={values.lieu ?? ""}
                onChange={(e) => handleChange("lieu", e.target.value)}
                error={!!errors.lieu}
                helperText={errors.lieu || "Lieu ou canal principal de l'événement."}
              />
            </Grid>

            {values.type_evenement === "autre" ? (
              <Grid item xs={12}>
                <AppTextField
                  label="Description de l'événement"
                  value={values.description_autre ?? ""}
                  onChange={(e) => handleChange("description_autre", e.target.value)}
                  error={!!errors.description_autre}
                  helperText={errors.description_autre || "Précisez le type d'événement."}
                />
              </Grid>
            ) : null}

            <Grid item xs={12}>
              <AppTextField
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
              <AppNumberField
                label="Participants prévus"
                value={values.participants_prevus ?? ""}
                onChange={(e) =>
                  handleChange(
                    "participants_prevus",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <AppNumberField
                label="Participants réels"
                value={values.participants_reels ?? ""}
                onChange={(e) =>
                  handleChange(
                    "participants_reels",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              />
            </Grid>
          </Grid>
        </FormSectionCard>

        <FormActionsBar sx={{ mt: 1 }}>
          {onCancel ? (
            <Button variant="outlined" onClick={onCancel}>
              Annuler
            </Button>
          ) : null}

          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? "Enregistrement..." : submitLabel}
          </Button>
        </FormActionsBar>
      </Stack>
    </Box>
  );
}