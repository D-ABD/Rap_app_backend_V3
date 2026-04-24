import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  useTheme,
} from "@mui/material";
import { Prepa, CentreLight } from "src/types/prepa";
import CentresSelectModal from "src/components/modals/CentresSelectModal";
import RichHtmlEditorField from "src/components/forms/RichHtmlEditorField";
import PrepaInvitesSection from "./PrepaInvitesSection";
import AppTextField from "src/components/forms/fields/AppTextField";
import FormSectionCard from "src/components/forms/FormSectionCard";
import type { AppTheme } from "../../theme";
import {
  Event as EventIcon,
  Groups as GroupsIcon,
  Comment as CommentIcon,
} from "@mui/icons-material";

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

const TYPE_PREPA_CHOICES_FALLBACK = [
  { value: "info_collective", label: "Information collective" },
];

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <FormSectionCard
      title={
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ display: "inline-flex", color: "primary.main" }}>{icon}</Box>
          <Box component="span">{title}</Box>
        </Stack>
      }
      subtitle={subtitle}
    >
      {children}
    </FormSectionCard>
  );
}

export default function PrepaFormIC({
  initialValues,
  meta,
  submitting = false,
  onSubmit,
  onCancel,
  onCentreChange,
}: Props) {
  const theme = useTheme<AppTheme>();

  const [form, setForm] = useState<Partial<Prepa>>({
    type_prepa: initialValues?.type_prepa ?? "info_collective",
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

  const typeChoices = useMemo(() => {
    const source = meta?.type_prepa_choices?.length
      ? meta.type_prepa_choices
      : TYPE_PREPA_CHOICES_FALLBACK;
    return source.filter((choice) => choice.value === "info_collective");
  }, [meta?.type_prepa_choices]);

  const handleChange = <K extends keyof Prepa>(key: K, value: Prepa[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
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
    if (form.centre_id && meta?.centre_choices?.length) {
      const opt = meta.centre_choices.find((c) => Number(c.value) === form.centre_id);
      setCentreLabel(opt?.label ?? `#${form.centre_id}`);
      if (opt?.label) onCentreChange?.(opt.label);
    } else {
      setCentreLabel("");
      onCentreChange?.("");
    }
  }, [form.centre_id, meta?.centre_choices, onCentreChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const actionGap = theme.custom.page.template.header.actions.gap.default;

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <Section
            icon={<EventIcon color="primary" />}
            title="Informations principales"
            subtitle="Type, date, centre et animateur de la séance Prépa."
          >
            <Grid container spacing={theme.custom.form.sectionCard.contentGap}>
              <Grid item xs={12}>
                <Alert severity="info">
                  Le centre sélectionné est utilisé pour rattacher la séance et ses invités.
                </Alert>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel id="type-prepa-ic-label">Type d’activité</InputLabel>
                  <Select
                    labelId="type-prepa-ic-label"
                    label="Type d’activité"
                    value={form.type_prepa ?? ""}
                    onChange={(e) => handleChange("type_prepa", e.target.value as string)}
                  >
                    {typeChoices.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Type d’activité Prépa.</FormHelperText>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <AppTextField
                  type="date"
                  fullWidth
                  required
                  label="Date"
                  InputLabelProps={{ shrink: true }}
                  value={form.date_prepa ?? ""}
                  onChange={(e) => handleChange("date_prepa", e.target.value)}
                  helperText="Date prévue de la séance."
                />
              </Grid>

              <Grid item xs={12} md={8}>
                <AppTextField
                  fullWidth
                  label="Centre"
                  placeholder="— Aucun centre sélectionné —"
                  value={centreLabel || (form.centre_id ? `#${form.centre_id}` : "")}
                  InputProps={{ readOnly: true }}
                  helperText="Centre actuellement rattaché."
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack direction={{ xs: "column", sm: "row", md: "column" }} spacing={1}>
                  <Button variant="outlined" onClick={() => setShowCentreModal(true)}>
                    Sélectionner un centre
                  </Button>
                  {form.centre_id ? (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        handleChange("centre_id", undefined as any);
                        setCentreLabel("");
                        onCentreChange?.("");
                      }}
                    >
                      Effacer
                    </Button>
                  ) : null}
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <AppTextField
                  fullWidth
                  label="Formateur / animateur"
                  placeholder="Nom du formateur qui anime la séance"
                  value={form.formateur_animateur ?? ""}
                  onChange={(e) => handleChange("formateur_animateur", e.target.value)}
                  helperText="Personne en charge de l’animation."
                />
              </Grid>
            </Grid>
          </Section>

          <Section
            icon={<GroupsIcon color="primary" />}
            title="Information collective"
            subtitle="Suivi des volumes et de la participation."
          >
            <Grid container spacing={theme.custom.form.sectionCard.contentGap}>
              <Grid item xs={12} md={4}>
                <AppTextField
                  type="number"
                  fullWidth
                  label="Places ouvertes"
                  value={form.nombre_places_ouvertes ?? ""}
                  onChange={(e) =>
                    handleChange("nombre_places_ouvertes", Number(e.target.value) as any)
                  }
                  helperText="Capacité ouverte pour la séance."
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <AppTextField
                  type="number"
                  fullWidth
                  label="Prescriptions"
                  value={form.nombre_prescriptions ?? ""}
                  onChange={(e) =>
                    handleChange("nombre_prescriptions", Number(e.target.value) as any)
                  }
                  helperText="Nombre de prescriptions reçues."
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <AppTextField
                  type="number"
                  fullWidth
                  label="Présents"
                  value={form.nb_presents_info ?? ""}
                  onChange={(e) =>
                    handleChange("nb_presents_info", Number(e.target.value) as any)
                  }
                  helperText="Nombre de participants présents."
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <AppTextField
                  type="number"
                  fullWidth
                  label="Absents (auto)"
                  value={form.nb_absents_info ?? 0}
                  InputProps={{ readOnly: true }}
                  helperText="Calculé automatiquement : prescriptions - présents."
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <AppTextField
                  type="number"
                  fullWidth
                  label="Adhésions"
                  value={form.nb_adhesions ?? ""}
                  onChange={(e) => handleChange("nb_adhesions", Number(e.target.value) as any)}
                  helperText="Nombre d’adhésions constatées."
                />
              </Grid>
            </Grid>
          </Section>

          <PrepaInvitesSection
            stagiaires={form.stagiaires_prepa ?? []}
            onChange={(stagiaires) =>
              handleChange("stagiaires_prepa", stagiaires as Prepa["stagiaires_prepa"])
            }
          />

          <Section
            icon={<CommentIcon color="primary" />}
            title="Commentaire"
            subtitle="Zone libre pour préciser le déroulé, le contexte ou les points de vigilance."
          >
            <RichHtmlEditorField
              label="Commentaire"
              value={form.commentaire ?? ""}
              onChange={(value) => handleChange("commentaire", value)}
              placeholder="Ajouter un commentaire enrichi…"
            />
          </Section>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              width: "100%",
            }}
          >
            <Stack
              direction={{ xs: "column-reverse", sm: "row" }}
              spacing={actionGap}
              useFlexGap
              sx={{
                width: { xs: "100%", sm: "auto" },
                "& > *": {
                  minWidth: { xs: "100%", sm: theme.spacing(18) },
                },
              }}
            >
              {onCancel ? (
                <Button variant="outlined" onClick={onCancel}>
                  Annuler
                </Button>
              ) : null}

              <Button variant="contained" type="submit" disabled={submitting}>
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Box>

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