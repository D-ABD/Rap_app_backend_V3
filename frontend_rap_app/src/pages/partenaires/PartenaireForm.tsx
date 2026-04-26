// src/pages/partenaires/PartenaireForm.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Stack,
  Button,
  Chip,
  Link,
  AccordionDetails,
  Accordion,
  AccordionSummary,
  Alert,
  useTheme,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import {
  Business as BusinessIcon,
  Work as WorkIcon,
  Group as GroupIcon,
  Description as DescriptionIcon,
  Info as InfoIcon,
  Link as LinkIcon,
  Save as SaveIcon,
  RestartAlt as RestartAltIcon,
  LocationOn as LocationOnIcon,
} from "@mui/icons-material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

import type { Partenaire, PartenaireChoicesResponse } from "../../types/partenaire";
import CentresSelectModal from "../../components/modals/CentresSelectModal";
import RichHtmlEditorField from "../../components/forms/RichHtmlEditorField";
import type { AppTheme } from "../../theme";

type CentreOption = { value: number; label: string };

type FormProps = {
  initialValues?: Partial<Partenaire>;
  onSubmit: (values: Partial<Partenaire>) => void;
  loading: boolean;
  choices: PartenaireChoicesResponse | null;
  centreOptions?: CentreOption[];
};

const onlyDigits = (s: string, limit = 5) => s.replace(/\D/g, "").slice(0, limit);

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
  const accentHeaderBackground =
    theme.palette.mode === "light"
      ? theme.custom.form.section.accentHeaderBackground.light
      : theme.custom.form.section.accentHeaderBackground.dark;

  const background =
    theme.palette.mode === "light"
      ? sectionCard.background.light
      : sectionCard.background.dark;

  const border =
    theme.palette.mode === "light"
      ? sectionCard.border.light
      : sectionCard.border.dark;

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
            gap: 1.25,
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
            borderBottom: `${theme.custom.form.divider.dashedWidth} dashed`,
            borderColor:
              theme.palette.mode === "light"
                ? theme.custom.form.divider.dashedColor.light
                : theme.custom.form.divider.dashedColor.dark,
          }}
        />

        {children}
      </Stack>
    </Box>
  );
}

function ThemedAccordion({
  icon,
  title,
  description,
  children,
  defaultExpanded = false,
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const theme = useTheme<AppTheme>();

  const sectionBackground =
    theme.palette.mode === "light"
      ? theme.custom.form.section.paperBackground.light
      : theme.custom.form.section.paperBackground.dark;

  const accentHeaderBackground =
    theme.palette.mode === "light"
      ? theme.custom.form.section.accentHeaderBackground.light
      : theme.custom.form.section.accentHeaderBackground.dark;

  const dividerColor =
    theme.palette.mode === "light"
      ? theme.custom.form.divider.dashedColor.light
      : theme.custom.form.divider.dashedColor.dark;

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      elevation={0}
      sx={{
        borderRadius: theme.custom.form.sectionCard.borderRadius,
        border: "1px solid",
        borderColor: "divider",
        background: sectionBackground,
        overflow: "hidden",
        "&::before": { display: "none" },
        "&.Mui-expanded": { mt: 0, mb: 0 },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 0.5,
          background: accentHeaderBackground,
          borderBottom: `${theme.custom.form.divider.dashedWidth} dashed ${dividerColor}`,
          "& .MuiAccordionSummary-content": {
            alignItems: "flex-start",
            gap: 1.25,
            my: 1,
          },
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
      </AccordionSummary>

      <AccordionDetails sx={{ p: { xs: 2, sm: 2.5 } }}>{children}</AccordionDetails>
    </Accordion>
  );
}

export default function PartenaireForm({
  initialValues = {},
  onSubmit,
  loading,
  choices,
  centreOptions,
}: FormProps) {
  const theme = useTheme<AppTheme>();

  const typeEmployeurCodeOptions = [
    { value: "11", label: "11 - Repertoire des metiers" },
    { value: "12", label: "12 - RCS" },
    { value: "13", label: "13 - MSA" },
    { value: "14", label: "14 - Profession liberale" },
    { value: "15", label: "15 - Association" },
    { value: "16", label: "16 - Autre employeur prive" },
    { value: "21", label: "21 - Service de l'Etat" },
    { value: "22", label: "22 - Commune" },
    { value: "23", label: "23 - Departement" },
    { value: "24", label: "24 - Region" },
    { value: "25", label: "25 - Etablissement public hospitalier" },
    { value: "26", label: "26 - EPLE" },
    { value: "27", label: "27 - EPA Etat" },
    { value: "28", label: "28 - EPA local" },
    { value: "29", label: "29 - Autre employeur public" },
    { value: "30", label: "30 - EPIC" },
  ];

  const employeurSpecifiqueCodeOptions = [
    { value: "0", label: "0 - Aucun de ces cas" },
    { value: "1", label: "1 - Entreprise de travail temporaire" },
    { value: "2", label: "2 - Groupement d'employeurs" },
    { value: "3", label: "3 - Employeur saisonnier" },
    { value: "4", label: "4 - Apprentissage familial" },
  ];

  const niveauDiplomeCodeOptions = [
    { value: "0", label: "0 - Aucun" },
    { value: "3", label: "3 - CAP / BEP" },
    { value: "4", label: "4 - Baccalaureat" },
    { value: "5", label: "5 - DEUG / BTS / DUT / DEUST" },
    { value: "6", label: "6 - Licence / Licence pro / BUT / Maitrise" },
    { value: "7", label: "7 - Master / DEA / DESS / Ingenieur" },
    { value: "8", label: "8 - Doctorat / HDR" },
  ];

  const [form, setForm] = useState<Partial<Partenaire>>(() => initialValues);
  const [openCentreModal, setOpenCentreModal] = useState(false);

  useEffect(() => {
    setForm((prev) => (Object.keys(prev).length === 0 ? { ...initialValues } : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = <K extends keyof Partenaire>(
    field: K,
    value: Partenaire[K] | undefined
  ) => setForm((prev) => ({ ...prev, [field]: value }));

  const typeOptionsList = choices?.types ?? [];
  const rawPartenaireType = form.type ?? "";
  const partenaireTypeSelectValue = useMemo(() => {
    if (!rawPartenaireType) return "";
    if (typeOptionsList.length === 0) return "";
    return rawPartenaireType;
  }, [typeOptionsList, rawPartenaireType]);
  const partenaireTypeOrphan = Boolean(
    rawPartenaireType &&
      typeOptionsList.length > 0 &&
      !typeOptionsList.some((o) => o.value === rawPartenaireType)
  );

  const getDateValue = useCallback((value?: string | null) => {
    if (!value) return null;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
  }, []);

  const renderDateField = (field: keyof Partenaire, label: string) => (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label={label}
        value={getDateValue(form[field] as string | null | undefined)}
        onChange={(value: Dayjs | null) =>
          handleChange(
            field,
            (value && value.isValid() ? value.format("YYYY-MM-DD") : null) as Partenaire[keyof Partenaire]
          )
        }
        views={["year", "month", "day"]}
        openTo="year"
        format="DD/MM/YYYY"
        disabled={loading}
        slotProps={{
          textField: {
            fullWidth: true,
            helperText: "Le calendrier permet de choisir facilement l'annee.",
          },
        }}
      />
    </LocalizationProvider>
  );

  const handleDefaultCentreChange = (val: string) => {
    const id = val ? Number(val) : null;
    const label = id != null ? centreOptions?.find((c) => c.value === id)?.label ?? null : null;

    setForm((prev) => ({
      ...prev,
      default_centre_id: id,
      default_centre: id != null ? { id, nom: label ?? `Centre #${id}` } : null,
      default_centre_nom: label,
    }));
  };

  const handleDefaultCentrePick = (c: { id: number; label: string }) => {
    setForm((prev) => ({
      ...prev,
      default_centre_id: c.id,
      default_centre: { id: c.id, nom: c.label },
      default_centre_nom: c.label,
    }));
    setOpenCentreModal(false);
  };

  const count = (s?: string | null) => (s ? s.length : 0);

  const actionGap = theme.custom.page.template.header.actions.gap.default;

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      aria-busy={loading || undefined}
    >
      <Stack spacing={2}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              Partenaire
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Gestion des informations générales, des données employeur et du suivi commercial.
            </Typography>
          </Box>

          <Chip
            label={(form.is_active ?? true) ? "Actif" : "Inactif"}
            color={(form.is_active ?? true) ? "success" : "error"}
            variant="outlined"
          />
        </Box>

        <Section
          icon={<InfoIcon color="primary" />}
          title="Informations générales"
          description="Identité du partenaire, contact principal, typologie et rattachement."
        >
          <Grid container spacing={theme.custom.form.sectionCard.contentGap}>
            <Grid item xs={12}>
              <Alert severity="info">
                Le centre par défaut est utilisé quand un rattachement automatique est possible.
              </Alert>
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                required
                label="Nom de l’entreprise (raison sociale)"
                value={form.nom || ""}
                onChange={(e) => handleChange("nom", e.target.value)}
                disabled={loading}
                helperText="Nom principal affiché dans l’application."
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Type"
                value={partenaireTypeSelectValue}
                onChange={(e) => handleChange("type", e.target.value as Partenaire["type"])}
                disabled={loading}
                helperText="Catégorie métier du partenaire."
              >
                <MenuItem value="">Sélectionner…</MenuItem>
                {typeOptionsList.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
                {partenaireTypeOrphan && (
                  <MenuItem value={rawPartenaireType}>{rawPartenaireType}</MenuItem>
                )}
              </TextField>
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Nom du contact"
                value={form.contact_nom || ""}
                onChange={(e) => handleChange("contact_nom", e.target.value)}
                disabled={loading}
                helperText="Nom de la personne référente."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Téléphone"
                value={form.telephone || ""}
                onChange={(e) => handleChange("telephone", e.target.value)}
                fullWidth
                disabled={loading}
                helperText="Téléphone principal."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                type="email"
                label="Email"
                value={form.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                fullWidth
                disabled={loading}
                helperText="Adresse email de contact."
              />
            </Grid>

            <Grid item xs={12} md={8}>
              <Stack spacing={1}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="stretch">
                  <TextField
                    select
                    fullWidth
                    label="Centre par défaut"
                    value={
                      centreOptions && centreOptions.length > 0
                        ? String(form.default_centre_id ?? "")
                        : ""
                    }
                    onChange={(e) => handleDefaultCentreChange(e.target.value)}
                    disabled={loading || !centreOptions || centreOptions.length === 0}
                    helperText="Si vide, le centre sera deduit automatiquement quand c'est possible."
                  >
                    <MenuItem value="">Aucun</MenuItem>
                    {centreOptions?.map((c) => (
                      <MenuItem key={c.value} value={String(c.value)}>
                        {c.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Button
                    variant="outlined"
                    onClick={() => setOpenCentreModal(true)}
                    disabled={loading}
                    sx={{ minWidth: { sm: theme.spacing(18) } }}
                  >
                    Parcourir…
                  </Button>
                </Stack>

                {form.default_centre_nom ? (
                  <Typography variant="body2" color="text.secondary">
                    Centre sélectionné :{" "}
                    <Typography component="span" fontWeight={700} color="text.primary">
                      {form.default_centre_nom}
                    </Typography>
                  </Typography>
                ) : null}
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Secteur d’activité"
                value={form.secteur_activite || ""}
                onChange={(e) => handleChange("secteur_activite", e.target.value)}
                disabled={loading}
                helperText="Ex. Numérique, BTP, Santé…"
              />
            </Grid>
          </Grid>
        </Section>

        <Section
          icon={<LocationOnIcon color="primary" />}
          title="Adresse"
          description="Coordonnées postales du partenaire."
        >
          <Grid container spacing={theme.custom.form.sectionCard.contentGap}>
            <Grid item xs={12} md={2}>
              <TextField
                label="N°"
                value={form.street_number || ""}
                onChange={(e) => handleChange("street_number", e.target.value)}
                fullWidth
                disabled={loading}
                helperText="Numéro de voie."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Rue"
                value={form.street_name || ""}
                onChange={(e) => handleChange("street_name", e.target.value)}
                fullWidth
                disabled={loading}
                helperText="Nom de voie."
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Complément"
                value={form.street_complement || ""}
                onChange={(e) => handleChange("street_complement", e.target.value)}
                fullWidth
                disabled={loading}
                helperText="Bâtiment, étage, etc."
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label="Code postal"
                value={form.zip_code || ""}
                onChange={(e) => handleChange("zip_code", onlyDigits(e.target.value))}
                fullWidth
                disabled={loading}
                helperText="5 chiffres maximum."
              />
            </Grid>

            <Grid item xs={12} md={5}>
              <TextField
                label="Ville"
                value={form.city || ""}
                onChange={(e) => handleChange("city", e.target.value)}
                fullWidth
                disabled={loading}
                helperText="Ville de rattachement."
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Pays"
                value={form.country || ""}
                onChange={(e) => handleChange("country", e.target.value)}
                fullWidth
                disabled={loading}
                helperText="Pays."
              />
            </Grid>
          </Grid>
        </Section>

        <ThemedAccordion
          icon={<WorkIcon color="primary" />}
          title="Informations employeur"
          description="Champs Cerfa liés à l’employeur et à sa situation administrative."
        >
          <Grid container spacing={theme.custom.form.sectionCard.contentGap}>
            <Grid item xs={12} md={4}>
              <TextField
                label="SIRET"
                value={form.siret || ""}
                onChange={(e) => handleChange("siret", onlyDigits(e.target.value, 14))}
                fullWidth
                disabled={loading}
                helperText="14 chiffres maximum."
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Type d’employeur CERFA"
                value={form.type_employeur_code ?? ""}
                onChange={(e) => handleChange("type_employeur_code", e.target.value)}
                fullWidth
                disabled={loading}
                helperText="Codification Cerfa de l’employeur."
              >
                <MenuItem value="">Non defini</MenuItem>
                {typeEmployeurCodeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Employeur spécifique CERFA"
                value={form.employeur_specifique_code ?? ""}
                onChange={(e) => handleChange("employeur_specifique_code", e.target.value)}
                fullWidth
                disabled={loading}
                helperText="Cas particulier éventuel."
              >
                <MenuItem value="">Non defini</MenuItem>
                {employeurSpecifiqueCodeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Code APE"
                value={form.code_ape || ""}
                onChange={(e) => handleChange("code_ape", e.target.value)}
                fullWidth
                disabled={loading}
                helperText="Code d’activité principale."
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                type="number"
                label="Effectif total"
                value={form.effectif_total ?? ""}
                onChange={(e) => handleChange("effectif_total", Number(e.target.value))}
                fullWidth
                disabled={loading}
                helperText="Nombre total de salariés."
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="IDCC"
                value={form.idcc || ""}
                onChange={(e) => handleChange("idcc", e.target.value)}
                fullWidth
                disabled={loading}
                helperText="Convention collective."
              />
            </Grid>

            <Grid item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  minHeight: theme.custom.form.inlineBlock.minHeight,
                  px: { xs: 1, sm: 1.25 },
                  py: { xs: 0.75, sm: 1 },
                  borderRadius: theme.shape.borderRadius,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.assurance_chomage_speciale ?? false}
                      onChange={(e) =>
                        handleChange("assurance_chomage_speciale", e.target.checked)
                      }
                    />
                  }
                  label="Assurance chômage spéciale"
                />
              </Box>
            </Grid>
          </Grid>
        </ThemedAccordion>

        <Section
          icon={<GroupIcon color="primary" />}
          title="Maîtres d’apprentissage"
          description="Informations Cerfa pour un ou deux maîtres d’apprentissage."
        >
          <Stack spacing={2}>
            {[1, 2].map((n) => (
              <ThemedAccordion
                key={n}
                icon={<GroupIcon color="primary" />}
                title={`Maître d’apprentissage n°${n}`}
                description="Coordonnées, emploi et niveau de diplôme."
              >
                <Grid container spacing={theme.custom.form.sectionCard.contentGap}>
                  {[
                    ["Nom de naissance", `maitre${n}_nom_naissance`],
                    ["Prénom", `maitre${n}_prenom`],
                  ].map(([label, key]) => (
                    <Grid item xs={12} md={6} key={key}>
                      <TextField
                        label={label}
                        value={(form as any)[key] || ""}
                        onChange={(e) => handleChange(key as any, e.target.value)}
                        fullWidth
                        disabled={loading}
                      />
                    </Grid>
                  ))}

                  <Grid item xs={12} md={4}>
                    {renderDateField(
                      `maitre${n}_date_naissance` as keyof Partenaire,
                      "Date de naissance"
                    )}
                  </Grid>

                  <Grid item xs={12} md={8}>
                    <TextField
                      type="email"
                      label="Courriel"
                      value={(form as any)[`maitre${n}_courriel`] || ""}
                      onChange={(e) =>
                        handleChange(`maitre${n}_courriel` as any, e.target.value)
                      }
                      fullWidth
                      disabled={loading}
                    />
                  </Grid>

                  {[
                    ["Emploi occupé", `maitre${n}_emploi_occupe`],
                    ["Diplôme ou titre le plus élevé", `maitre${n}_diplome_titre`],
                  ].map(([label, key]) => (
                    <Grid item xs={12} md={4} key={key}>
                      <TextField
                        label={label}
                        value={(form as any)[key] || ""}
                        onChange={(e) => handleChange(key as any, e.target.value)}
                        fullWidth
                        disabled={loading}
                      />
                    </Grid>
                  ))}

                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      label="Niveau du diplôme CERFA"
                      value={(form as any)[`maitre${n}_niveau_diplome_code`] || ""}
                      onChange={(e) =>
                        handleChange(`maitre${n}_niveau_diplome_code` as any, e.target.value)
                      }
                      fullWidth
                      disabled={loading}
                    >
                      <MenuItem value="">Non defini</MenuItem>
                      {niveauDiplomeCodeOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </ThemedAccordion>
            ))}
          </Stack>
        </Section>

        <ThemedAccordion
          icon={<BusinessIcon color="primary" />}
          title="Action commerciale"
          description="Suivi de l’action menée et description associée."
        >
          <Grid container spacing={theme.custom.form.sectionCard.contentGap}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Type d’action"
                value={form.actions ?? ""}
                onChange={(e) => handleChange("actions", e.target.value as Partenaire["actions"])}
                disabled={loading}
                helperText="Nature de l’action commerciale."
              >
                <MenuItem value="">Sélectionner…</MenuItem>
                {choices?.actions?.map((a) => (
                  <MenuItem key={a.value} value={a.value}>
                    {a.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={8}>
              <RichHtmlEditorField
                label={`Description (${count(form.action_description)}/1000)`}
                value={form.action_description || ""}
                onChange={(value) => handleChange("action_description", value)}
                placeholder="Décrire l'action commerciale…"
                minHeight={120}
              />
            </Grid>
          </Grid>
        </ThemedAccordion>

        <ThemedAccordion
          icon={<DescriptionIcon color="primary" />}
          title="Description générale"
          description="Contexte global, besoins, informations complémentaires."
        >
          <RichHtmlEditorField
            label={`Informations complémentaires (${count(form.description)}/2000)`}
            value={form.description || ""}
            onChange={(value) => handleChange("description", value)}
            placeholder="Décrire le partenaire, le contexte, les besoins…"
            minHeight={140}
          />
        </ThemedAccordion>

        <Section
          icon={<LinkIcon color="primary" />}
          title="Statut et site"
          description="Activation du partenaire et accès rapide au site web."
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1.5}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                minHeight: theme.custom.form.inlineBlock.minHeight,
                px: { xs: 1, sm: 1.25 },
                py: { xs: 0.75, sm: 1 },
                borderRadius: theme.shape.borderRadius,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.is_active ?? true}
                    onChange={(e) => handleChange("is_active", e.target.checked)}
                  />
                }
                label="Partenaire actif"
              />
            </Box>

            {form.website ? (
              <Link href={String(form.website)} target="_blank" rel="noreferrer">
                Ouvrir le site ↗
              </Link>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Aucun site renseigné
              </Typography>
            )}
          </Stack>
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
            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={() => setForm(initialValues)}
              disabled={loading}
            >
              Réinitialiser
            </Button>

            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={loading}
            >
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </Stack>
        </Box>
      </Stack>

      <CentresSelectModal
        show={openCentreModal}
        onClose={() => setOpenCentreModal(false)}
        onSelect={handleDefaultCentrePick}
      />
    </Box>
  );
}