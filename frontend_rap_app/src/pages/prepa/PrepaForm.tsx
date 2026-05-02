import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Select,
  MenuItem,
  Button,
  Stack,
  Collapse,
  useTheme,
  Alert,
} from "@mui/material";
import { Prepa, CentreLight } from "src/types/prepa";
import CentresSelectModal from "src/components/modals/CentresSelectModal";
import RichHtmlEditorField from "src/components/forms/RichHtmlEditorField";
import PrepaInvitesSection from "./PrepaInvitesSection";
import AppTextField from "src/components/forms/fields/AppTextField";
import type { AppTheme } from "../../theme";
import { useAuth } from "src/hooks/useAuth";
import { isAdminLikeRole } from "src/utils/roleGroups";
import { buildCentreLabel, extractScopedCentres } from "./prepaCentreScope";
import {
  Event as EventIcon,
  Groups as GroupsIcon,
  School as SchoolIcon,
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
  { value: "atelier_1", label: "Atelier 1" },
];

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useTheme<AppTheme>();

  const sectionCard = theme.custom.form.sectionCard;
  const background =
    theme.palette.mode === "light"
      ? sectionCard.background.light
      : sectionCard.background.dark;

  const border =
    theme.palette.mode === "light"
      ? sectionCard.border.light
      : sectionCard.border.dark;

  const accentHeaderBackground =
    theme.palette.mode === "light"
      ? theme.custom.form.section.accentHeaderBackground.light
      : theme.custom.form.section.accentHeaderBackground.dark;

  const dividerColor =
    theme.palette.mode === "light"
      ? theme.custom.form.divider.dashedColor.light
      : theme.custom.form.divider.dashedColor.dark;

  return (
    <Box
      sx={{
        borderRadius: sectionCard.borderRadius,
        p: sectionCard.padding,
        background,
        border,
      }}
    >
      <Stack spacing={sectionCard.titleGap}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: theme.custom.form.inlineBlock.gap,
            px: { xs: 1, sm: 1.25 },
            py: { xs: 0.875, sm: 1 },
            borderRadius: theme.shape.borderRadius,
            border: "1px solid",
            borderColor: "divider",
            background: accentHeaderBackground,
          }}
        >
          <Box
            sx={{
              color: "primary.main",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: theme.custom.form.inlineBlock.minHeight,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {description}
              </Typography>
            ) : null}
          </Box>
        </Box>

        <Box
          sx={{
            borderBottom: `${theme.custom.form.divider.dashedWidth} dashed ${dividerColor}`,
          }}
        />

        {children}
      </Stack>
    </Box>
  );
}

export default function PrepaForm({
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
    nb_inscrits_prepa: initialValues?.nb_inscrits_prepa ?? 0,
    nb_presents_prepa: initialValues?.nb_presents_prepa ?? 0,
    nb_absents_prepa: initialValues?.nb_absents_prepa ?? 0,
    participations_prepa: initialValues?.participations_prepa ?? [],
  });

  const [centreLabel, setCentreLabel] = useState<string>("");
  const [showCentreModal, setShowCentreModal] = useState(false);
  const scopedCentres = useMemo(() => extractScopedCentres((meta as Record<string, unknown> | null) ?? null), [meta]);
  const hasSingleScopedCentre = !isAdminLike && scopedCentres.length === 1;

  const typeChoices = useMemo(
    () =>
      meta?.type_prepa_choices?.length ? meta.type_prepa_choices : TYPE_PREPA_CHOICES_FALLBACK,
    [meta?.type_prepa_choices]
  );

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
    if (form.nb_inscrits_prepa !== undefined && form.nb_presents_prepa !== undefined) {
      const nextAbsents = Math.max(
        0,
        (form.nb_inscrits_prepa ?? 0) - (form.nb_presents_prepa ?? 0)
      );
      if (form.nb_absents_prepa === nextAbsents) return;
      setForm((prev) => ({
        ...prev,
        nb_absents_prepa: nextAbsents,
      }));
    }
  }, [form.nb_inscrits_prepa, form.nb_presents_prepa, form.nb_absents_prepa]);

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

  const isInfoCollective = form.type_prepa === "info_collective";
  const isAtelier = form.type_prepa?.startsWith("atelier");
  const actionGap = theme.custom.page.template.header.actions.gap.default;

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <Section
            icon={<EventIcon color="primary" />}
            title="Informations principales"
            description="Type, date, centre et animateur de la séance Prépa."
          >
            <Grid container spacing={theme.custom.form.sectionCard.contentGap}>
              <Grid item xs={12}>
                <Alert severity="info">
                  Le centre sélectionné est utilisé pour rattacher la séance et ses invités.
                </Alert>
              </Grid>
              {hasSingleScopedCentre ? (
                <Grid item xs={12}>
                  <Alert severity="success">
                    Le centre est prérempli automatiquement depuis votre périmètre.
                  </Alert>
                </Grid>
              ) : null}

              <Grid item xs={12} md={4}>
                <Select
                  fullWidth
                  required
                  value={form.type_prepa ?? ""}
                  onChange={(e) => handleChange("type_prepa", e.target.value as string)}
                  displayEmpty
                >
                  {typeChoices.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>
                  Type d’activité Prépa.
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
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

              <Grid item xs={12} md={4}>
                <AppTextField
                  fullWidth
                  label="Centre"
                  placeholder="— Aucun centre sélectionné —"
                  value={centreLabel || (form.centre_id ? `#${form.centre_id}` : "")}
                  InputProps={{ readOnly: true }}
                  helperText="Centre actuellement rattaché."
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mt={1}>
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

          <Collapse in={isInfoCollective} unmountOnExit>
            <Section
              icon={<GroupsIcon color="primary" />}
              title="Information collective"
              description="Suivi des places, prescriptions, présents et adhésions."
            >
              <Grid container spacing={theme.custom.form.sectionCard.contentGap}>
                {[
                  ["nombre_places_ouvertes", "Places ouvertes", "Capacité ouverte pour la séance."],
                  ["nombre_prescriptions", "Prescriptions", "Nombre de prescriptions reçues."],
                  ["nb_presents_info", "Présents", "Nombre de participants présents."],
                ].map(([key, label, helper]) => (
                  <Grid item xs={12} md={4} key={key}>
                    <AppTextField
                      type="number"
                      fullWidth
                      label={label}
                      value={(form as any)[key] ?? ""}
                      onChange={(e) =>
                        handleChange(key as keyof Prepa, Number(e.target.value) as any)
                      }
                      helperText={helper}
                    />
                  </Grid>
                ))}

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
          </Collapse>

          <Collapse in={isAtelier} unmountOnExit>
            <Section
              icon={<SchoolIcon color="primary" />}
              title="Ateliers Prépa"
              description="Suivi des inscrits, présents et absents pour l’atelier."
            >
              <Grid container spacing={theme.custom.form.sectionCard.contentGap}>
                {[
                  ["nb_inscrits_prepa", "Inscrits", "Nombre de stagiaires inscrits."],
                  ["nb_presents_prepa", "Présents", "Nombre de stagiaires présents."],
                ].map(([key, label, helper]) => (
                  <Grid item xs={12} md={4} key={key}>
                    <AppTextField
                      type="number"
                      fullWidth
                      label={label}
                      value={(form as any)[key] ?? ""}
                      onChange={(e) =>
                        handleChange(key as keyof Prepa, Number(e.target.value) as any)
                      }
                      helperText={helper}
                    />
                  </Grid>
                ))}

                <Grid item xs={12} md={4}>
                  <AppTextField
                    type="number"
                    fullWidth
                    label="Absents (auto)"
                    value={form.nb_absents_prepa ?? 0}
                    InputProps={{ readOnly: true }}
                    helperText="Calculé automatiquement : inscrits - présents."
                  />
                </Grid>
              </Grid>
            </Section>
          </Collapse>

          <PrepaInvitesSection
            participations={form.participations_prepa ?? []}
            centreId={form.centre_id}
            typePrepa={form.type_prepa}
            onChange={(participations) =>
              handleChange("participations_prepa", participations as Prepa["participations_prepa"])
            }
          />

          <Section
            icon={<CommentIcon color="primary" />}
            title="Commentaire"
            description="Zone libre pour préciser le déroulé, le contexte ou les points de vigilance."
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
          handleChange("centre_id", c.id as any);
          const label = `${c.nom ?? "Centre"}${c.departement ? ` (${c.departement})` : ""}`;
          setCentreLabel(label);
          onCentreChange?.(label);
          setShowCentreModal(false);
        }}
      />
    </>
  );
}
