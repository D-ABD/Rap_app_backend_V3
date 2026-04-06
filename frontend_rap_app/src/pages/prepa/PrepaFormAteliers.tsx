import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Grid,
  Typography,
  Select,
  MenuItem,
  Button,
  Stack,
  Collapse,
} from "@mui/material";
import { Prepa, CentreLight } from "src/types/prepa";
import CentresSelectModal from "src/components/modals/CentresSelectModal";
import RichHtmlEditorField from "src/components/forms/RichHtmlEditorField";
import PrepaInvitesSection from "./PrepaInvitesSection";
import AppTextField from "src/components/forms/fields/AppTextField";

interface Props {
  initialValues?: Partial<Prepa>;
  meta?: {
    type_prepa_choices?: Array<{ value: string; label: string }>;
    centre_choices?: Array<{ value: number; label: string }>;
  } | null;
  submitting?: boolean;
  onSubmit: (values: Partial<Prepa>) => void | Promise<void>;
  onCancel?: () => void;
  onCentreChange?: (nom: string) => void;
}

/* ===================== CHOIX PAR DÉFAUT ===================== */
const TYPE_PREPA_CHOICES_FALLBACK = [
  { value: "atelier_1", label: "Atelier 1" },
  { value: "atelier_2", label: "Atelier 2" },
  { value: "atelier_3", label: "Atelier 3" },
  { value: "atelier_4", label: "Atelier 4" },
  { value: "atelier_5", label: "Atelier 5" },
  { value: "atelier_6", label: "Atelier 6" },
  { value: "autre", label: "Autre activité Prépa" },
];

/* ===================== FORMULAIRE PRÉPA ===================== */
export default function PrepaFormAteliers({
  initialValues,
  meta,
  submitting = false,
  onSubmit,
  onCancel,
  onCentreChange,
}: Props) {
  const [form, setForm] = useState<Partial<Prepa>>({
    type_prepa: initialValues?.type_prepa ?? "atelier_1",
    date_prepa: initialValues?.date_prepa ?? "",
    centre_id: initialValues?.centre_id ?? undefined,
    formateur_animateur: initialValues?.formateur_animateur ?? "",
    commentaire: initialValues?.commentaire ?? "",
    nombre_places_ouvertes: initialValues?.nombre_places_ouvertes ?? 0,
    nombre_prescriptions: initialValues?.nombre_prescriptions ?? 0,
    nb_presents_info: initialValues?.nb_presents_info ?? 0,
    nb_absents_info: initialValues?.nb_absents_info ?? 0,
    nb_adhesions: initialValues?.nb_adhesions ?? 0,
    nb_inscrits_prepa: initialValues?.nb_inscrits_prepa ?? 0,
    nb_presents_prepa: initialValues?.nb_presents_prepa ?? 0,
    nb_absents_prepa: initialValues?.nb_absents_prepa ?? 0,
    stagiaires_prepa: initialValues?.stagiaires_prepa ?? [],
  });

  const [centreLabel, setCentreLabel] = useState<string>("");
  const [showCentreModal, setShowCentreModal] = useState(false);

  /* ===================== CHOIX DYNAMIQUES ===================== */
  const typeChoices = useMemo(
    () => {
      const source = meta?.type_prepa_choices?.length
        ? meta.type_prepa_choices
        : TYPE_PREPA_CHOICES_FALLBACK;
      return source.filter((choice) => choice.value !== "info_collective");
    },
    [meta?.type_prepa_choices]
  );

  const handleChange = <K extends keyof Prepa>(key: K, value: Prepa[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* ===================== AUTO-CALCUL ABSENTS ===================== */
  useEffect(() => {
    // IC : absents = prescriptions - présents
    if (form.nombre_prescriptions !== undefined && form.nb_presents_info !== undefined) {
      setForm((prev) => ({
        ...prev,
        nb_absents_info: Math.max(
          0,
          (prev.nombre_prescriptions ?? 0) - (prev.nb_presents_info ?? 0)
        ),
      }));
    }
  }, [form.nombre_prescriptions, form.nb_presents_info]);

  useEffect(() => {
    // Atelier Prépa : absents = inscrits - présents
    if (form.nb_inscrits_prepa !== undefined && form.nb_presents_prepa !== undefined) {
      setForm((prev) => ({
        ...prev,
        nb_absents_prepa: Math.max(
          0,
          (prev.nb_inscrits_prepa ?? 0) - (prev.nb_presents_prepa ?? 0)
        ),
      }));
    }
  }, [form.nb_inscrits_prepa, form.nb_presents_prepa]);

  /* ===================== MISE À JOUR CENTRE LABEL ===================== */
  useEffect(() => {
    if (form.centre_id && meta?.centre_choices?.length) {
      const opt = meta.centre_choices.find((c) => Number(c.value) === form.centre_id);
      setCentreLabel(opt?.label ?? `#${form.centre_id}`);
      if (opt?.label) onCentreChange?.(opt.label);
    } else {
      setCentreLabel("");
      onCentreChange?.("");
    }
  }, [form.centre_id, meta?.centre_choices, onCentreChange]);

  /* ===================== SUBMIT ===================== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  /* ===================== DÉTERMINER LE TYPE ===================== */
  const isInfoCollective = form.type_prepa === "info_collective";
  const isAtelier = form.type_prepa?.startsWith("atelier") || form.type_prepa === "autre";

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        {/* --- Informations principales --- */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Informations principales</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Type, date et centre de la séance Prépa.
          </Typography>

          <Grid container spacing={2}>
            {/* Type d’activité */}
            <Grid item xs={12} md={4}>
              <Typography fontWeight={600}>Type d’activité *</Typography>
              <Select
                fullWidth
                required
                value={form.type_prepa ?? ""}
                onChange={(e) => handleChange("type_prepa", e.target.value as string)}
              >
                {typeChoices.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </Grid>

            {/* Date */}
            <Grid item xs={12} md={4}>
              <Typography fontWeight={600}>Date *</Typography>
              <AppTextField
                type="date"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={form.date_prepa ?? ""}
                onChange={(e) => handleChange("date_prepa", e.target.value)}
              />
            </Grid>

            {/* Centre */}
            <Grid item xs={12} md={4}>
              <Typography fontWeight={600}>Centre *</Typography>
              <AppTextField
                fullWidth
                placeholder="— Aucun centre sélectionné —"
                value={centreLabel || (form.centre_id ? `#${form.centre_id}` : "")}
                InputProps={{ readOnly: true }}
              />
              <Stack direction="row" spacing={1} mt={1}>
                <Button variant="outlined" onClick={() => setShowCentreModal(true)}>
                  🏫 Sélectionner un centre
                </Button>
                {form.centre_id && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      handleChange("centre_id", undefined);
                      setCentreLabel("");
                      onCentreChange?.("");
                    }}
                  >
                    ✖ Effacer
                  </Button>
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography fontWeight={600}>Formateur / animateur</Typography>
              <AppTextField
                fullWidth
                placeholder="Nom du formateur qui anime la séance"
                value={form.formateur_animateur ?? ""}
                onChange={(e) => handleChange("formateur_animateur", e.target.value)}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* --- Informations collectives --- */}
        <Collapse in={isInfoCollective} unmountOnExit>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">Information collective</Typography>
            <Grid container spacing={2}>
              {[
                ["nombre_places_ouvertes", "Places ouvertes"],
                ["nombre_prescriptions", "Prescriptions"],
                ["nb_presents_info", "Présents"],
              ].map(([key, label]) => (
                <Grid item xs={12} md={4} key={key}>
                  <AppTextField
                    type="number"
                    fullWidth
                    label={label}
                    value={(form as any)[key] ?? ""}
                    onChange={(e) =>
                      handleChange(key as keyof Prepa, Number(e.target.value) as any)
                    }
                  />
                </Grid>
              ))}

              {/* Adhésions */}
              <Grid item xs={12} md={4}>
                <AppTextField
                  type="number"
                  fullWidth
                  label="Adhésions"
                  value={form.nb_adhesions ?? ""}
                  onChange={(e) => handleChange("nb_adhesions", Number(e.target.value) as any)}
                />
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* --- Ateliers Prépa --- */}
        <Collapse in={isAtelier} unmountOnExit>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">Ateliers Prépa</Typography>
            <Grid container spacing={2}>
              {[
                ["nb_inscrits_prepa", "Inscrits"],
                ["nb_presents_prepa", "Présents"],
              ].map(([key, label]) => (
                <Grid item xs={12} md={4} key={key}>
                  <AppTextField
                    type="number"
                    fullWidth
                    label={label}
                    value={(form as any)[key] ?? ""}
                    onChange={(e) =>
                      handleChange(key as keyof Prepa, Number(e.target.value) as any)
                    }
                  />
                </Grid>
              ))}

              {/* Absents auto */}
              <Grid item xs={12} md={4}>
                <AppTextField
                  type="number"
                  fullWidth
                  label="Absents (auto)"
                  value={form.nb_absents_prepa ?? 0}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        <PrepaInvitesSection
          stagiaires={form.stagiaires_prepa ?? []}
          onChange={(stagiaires) =>
            handleChange("stagiaires_prepa", stagiaires as Prepa["stagiaires_prepa"])
          }
        />

        {/* --- Commentaire --- */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Commentaire</Typography>
          <RichHtmlEditorField
            label="Commentaire"
            value={form.commentaire ?? ""}
            onChange={(value) => handleChange("commentaire", value)}
            placeholder="Ajouter un commentaire enrichi…"
          />
        </Paper>

        {/* --- Actions --- */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          {onCancel && (
            <Button variant="outlined" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button variant="contained" type="submit" disabled={submitting}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </Stack>
      </Box>

      {/* --- Sélection centre --- */}
      <CentresSelectModal
        show={showCentreModal}
        onClose={() => setShowCentreModal(false)}
        onSelect={(centre) => {
          const c = centre as unknown as CentreLight;
          handleChange("centre_id", c.id);
          const label = `${c.nom ?? "Centre"}${c.departement ? ` (${c.departement})` : ""}`;
          setCentreLabel(label);
          onCentreChange?.(label);
          setShowCentreModal(false);
        }}
      />
    </>
  );
}
