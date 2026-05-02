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
  Typography,
  useTheme,
} from "@mui/material";
import { Prepa, CentreLight } from "src/types/prepa";
import CentresSelectModal from "src/components/modals/CentresSelectModal";
import RichHtmlEditorField from "src/components/forms/RichHtmlEditorField";
import AppTextField from "src/components/forms/fields/AppTextField";
import FormSectionCard from "src/components/forms/FormSectionCard";
import type { AppTheme } from "../../theme";
import { useAuth } from "src/hooks/useAuth";
import { isAdminLikeRole } from "src/utils/roleGroups";
import { buildCentreLabel, extractScopedCentres } from "./prepaCentreScope";
import {
  Event as EventIcon,
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
  const { user } = useAuth();
  const isAdminLike = isAdminLikeRole(user?.role);

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
  });

  const [centreLabel, setCentreLabel] = useState<string>("");
  const [showCentreModal, setShowCentreModal] = useState(false);
  const scopedCentres = useMemo(() => extractScopedCentres((meta as Record<string, unknown> | null) ?? null), [meta]);
  const hasSingleScopedCentre = !isAdminLike && scopedCentres.length === 1;

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
      const nextAbsents = Math.max(
        0,
        (form.nombre_prescriptions ?? 0) - (form.nb_presents_info ?? 0)
      );
      if (form.nb_absents_info === nextAbsents) return;
      setForm((prev) => ({
        ...prev,
        nb_absents_info: nextAbsents,
      }));
    }
  }, [form.nombre_prescriptions, form.nb_presents_info, form.nb_absents_info]);

  useEffect(() => {
    if (!form.centre_id && hasSingleScopedCentre) {
      setForm((prev) => ({ ...prev, centre_id: scopedCentres[0].id }));
      return;
    }
    if (form.centre_id && scopedCentres.length) {
      const opt = scopedCentres.find((c) => c.id === form.centre_id);
      const label = buildCentreLabel(opt) || `#${form.centre_id}`;
      setCentreLabel((prev) => (prev === label ? prev : label));
      onCentreChange?.(label);
    } else {
      setCentreLabel((prev) => (prev === "" ? prev : ""));
      onCentreChange?.("");
    }
  }, [form.centre_id, hasSingleScopedCentre, onCentreChange, scopedCentres]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const actionGap = theme.custom.page.template.header.actions.gap.default;

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ "& .MuiFormHelperText-root": { mt: 0.25, lineHeight: 1.2 } }}
      >
        <Stack spacing={0.75}>
          <Section
            icon={<EventIcon color="primary" />}
            title="Informations principales"
            subtitle="Type, date, centre et animateur de la séance Prépa."
          >
            <Grid container spacing={1.5}>
              <Grid item xs={5}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  Une information collective reste purement chiffrée: aucun stagiaire nominatif n'est saisi ici.
                </Alert>
              </Grid>
              {hasSingleScopedCentre ? (
                <Grid item xs={5}>
                  <Alert severity="success" sx={{ py: 0.5 }}>
                    Le centre est prérempli automatiquement depuis votre périmètre.
                  </Alert>
                </Grid>
              ) : null}

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required size="small">
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

              <Grid item xs={12} md={4}>
                <AppTextField
                  size="small"
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

              <Grid item xs={12} md={5}>
                <AppTextField
                  size="small"
                  fullWidth
                  label="Centre"
                  placeholder="— Aucun centre sélectionné —"
                  value={centreLabel || (form.centre_id ? `#${form.centre_id}` : "")}
                  InputProps={{ readOnly: true }}
                  helperText="Centre actuellement rattaché."
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Stack direction={{ xs: "column", sm: "row", md: "column" }} spacing={0.75}>
                  {!hasSingleScopedCentre ? (
                    <Button variant="outlined" onClick={() => setShowCentreModal(true)}>
                      Sélectionner un centre
                    </Button>
                  ) : null}
                  {form.centre_id && !hasSingleScopedCentre ? (
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

              <Grid item xs={12} sx={{ mt: { xs: -0.5, md: -0.75 } }}>
                <AppTextField
                  size="small"
                  fullWidth
                  label="Formateur / animateur"
                  placeholder="Nom du formateur qui anime la séance"
                  value={form.formateur_animateur ?? ""}
                  onChange={(e) => handleChange("formateur_animateur", e.target.value)}
                  helperText="Personne en charge de l’animation."
                />
              </Grid>

              <Grid item xs={12} sx={{ mt: { xs: -0.75, md: -1 } }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                  Information collective
                </Typography>
              </Grid>

              <Grid item xs={12} md={4} sx={{ mt: { xs: -0.25, md: -0.5 } }}>
                <AppTextField
                  size="small"
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

              <Grid item xs={12} md={4} sx={{ mt: { xs: -0.25, md: -0.5 } }}>
                <AppTextField
                  size="small"
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

              <Grid item xs={12} md={4} sx={{ mt: { xs: -0.25, md: -0.5 } }}>
                <AppTextField
                  size="small"
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
                  size="small"
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
                  size="small"
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
              spacing={Math.max(1, actionGap - 0.5)}
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
