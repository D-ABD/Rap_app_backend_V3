import React, { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Box,
  Stack,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Typography,
  CircularProgress,
  Grid,
  FormHelperText,
  useTheme,
} from "@mui/material";
import {
  School as SchoolIcon,
  Business as BusinessIcon,
  Numbers as NumbersIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import type { Formation, FormationFormDataRaw } from "../../types/formation";
import type { NomId } from "../../types/formation";
import { toApiError } from "../../api/httpClient";
import { NSF_SPECIALITE_OPTIONS } from "../../constants/nsfOptions";
import { suggestNsfSpecialite } from "../../constants/nsfSuggestions";
import type { AppTheme } from "../../theme";

type SectionProps = {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
};

function Section({ icon, title, description, children }: SectionProps) {
  const theme = useTheme<AppTheme>();
  const sectionCardTokens = theme.custom.form.sectionCard;
  const inlineBlockTokens = theme.custom.form.inlineBlock;

  const sectionBackground =
    theme.palette.mode === "light"
      ? sectionCardTokens.background.light
      : sectionCardTokens.background.dark;

  const sectionBorder =
    theme.palette.mode === "light"
      ? sectionCardTokens.border.light
      : sectionCardTokens.border.dark;

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
        borderRadius: sectionCardTokens.borderRadius,
        p: sectionCardTokens.padding,
        background: sectionBackground,
        border: sectionBorder,
      }}
    >
      <Stack spacing={sectionCardTokens.titleGap}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: inlineBlockTokens.gap,
            px: { xs: 1, sm: 1.25 },
            py: { xs: 0.875, sm: 1 },
            borderRadius: theme.shape.borderRadius,
            background: accentHeaderBackground,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: inlineBlockTokens.minHeight,
              color: "primary.main",
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
            borderBottomStyle: "dashed",
            borderBottomWidth: theme.custom.form.divider.dashedWidth,
            borderColor: dividerColor,
            borderBottom: `${theme.custom.form.divider.dashedWidth} dashed ${dividerColor}`,
          }}
        />

        <Grid container spacing={sectionCardTokens.contentGap}>
          {children}
        </Grid>
      </Stack>
    </Box>
  );
}

type InputProps = {
  label: string;
  name: keyof FormationFormDataRaw | string;
  type?: string;
  value: unknown;
  error?: string;
  helperText?: React.ReactNode;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => void;
  multiline?: boolean;
  minRows?: number;
  required?: boolean;
  [k: string]: any;
};

function Input({
  label,
  name,
  type = "text",
  value,
  error,
  helperText,
  onChange,
  ...props
}: InputProps) {
  return (
    <Grid item xs={12} sm={6}>
      <TextField
        fullWidth
        label={label}
        name={name as string}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        error={!!error}
        helperText={error || helperText || " "}
        {...props}
      />
    </Grid>
  );
}

type SelectFieldProps = {
  label: string;
  labelId: string;
  name: string;
  value: string;
  error?: string;
  helperText?: React.ReactNode;
  required?: boolean;
  onChange: (e: any) => void;
  children: React.ReactNode;
};

function SelectField({
  label,
  labelId,
  name,
  value,
  error,
  helperText,
  required,
  onChange,
  children,
}: SelectFieldProps) {
  return (
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth error={!!error}>
        <InputLabel id={labelId}>{label}</InputLabel>
        <Select
          labelId={labelId}
          name={name}
          value={value}
          onChange={onChange}
          label={label}
          required={required}
        >
          {children}
        </Select>
        <FormHelperText>{error || helperText || " "}</FormHelperText>
      </FormControl>
    </Grid>
  );
}

interface FormationFormProps {
  initialValues?: Partial<Formation>;
  centres: NomId[];
  statuts: NomId[];
  typeOffres: NomId[];
  loading?: boolean;
  loadingChoices?: boolean;
  onSubmit: (values: FormationFormDataRaw) => Promise<void | Formation> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

function FormationForm({
  initialValues,
  centres,
  statuts,
  typeOffres,
  loading = false,
  loadingChoices = false,
  onSubmit,
  onCancel,
  submitLabel = "💾 Enregistrer",
}: FormationFormProps) {
  const theme = useTheme<AppTheme>();

  const diplomeCodeOptions = [
    { value: "13", label: "13 - Aucun diplome ni titre professionnel" },
    { value: "25", label: "25 - Diplome national du Brevet" },
    { value: "26", label: "26 - Certificat de formation generale" },
    { value: "33", label: "33 - CAP" },
    { value: "34", label: "34 - BEP" },
    { value: "35", label: "35 - Certificat de specialisation" },
    { value: "38", label: "38 - Autre CAP/BEP" },
    { value: "41", label: "41 - Baccalaureat professionnel" },
    { value: "42", label: "42 - Baccalaureat general" },
    { value: "43", label: "43 - Baccalaureat technologique" },
    { value: "44", label: "44 - Diplome de specialisation professionnelle" },
    { value: "49", label: "49 - Autre niveau bac" },
    { value: "54", label: "54 - BTS" },
    { value: "55", label: "55 - DUT" },
    { value: "58", label: "58 - Autre niveau bac+2" },
    { value: "62", label: "62 - Licence professionnelle" },
    { value: "63", label: "63 - Licence generale" },
    { value: "64", label: "64 - BUT" },
    { value: "69", label: "69 - Autre niveau bac+3 ou 4" },
    { value: "73", label: "73 - Master" },
    { value: "75", label: "75 - Diplome d'ingenieur" },
    { value: "76", label: "76 - Diplome d'ecole de commerce" },
    { value: "79", label: "79 - Autre niveau bac+5 ou plus" },
    { value: "80", label: "80 - Doctorat" },
  ];

  const qualificationViseeOptions = [
    { value: "1", label: "1 - Certification enregistree au RNCP autre qu'un CQP" },
    { value: "2", label: "2 - Certificat de qualification professionnelle (CQP)" },
    {
      value: "3",
      label: "3 - Qualification reconnue dans les classifications d'une convention collective nationale",
    },
    {
      value: "4",
      label: "4 - Action delivree dans le cadre du contrat de professionnalisation experimental",
    },
    { value: "5", label: "5 - Action de pre-qualification ou de pre-formation abroge" },
    { value: "6", label: "6 - Certification inscrite au repertoire specifique abroge" },
    { value: "7", label: "7 - Autre abroge" },
    {
      value: "8",
      label: "8 - Certification ou qualification professionnelle visee dans le cadre de l'experimentation VAE 2022",
    },
  ];

  const [values, setValues] = useState<FormationFormDataRaw>(() => ({
    nom: "",
    centre_id: null,
    type_offre_id: null,
    statut_id: null,
    start_date: "",
    end_date: "",
    num_kairos: "",
    num_offre: "",
    num_produit: "",
    assistante: "",
    prevus_crif: 0,
    prevus_mp: 0,
    inscrits_crif: 0,
    inscrits_mp: 0,
    cap: 0,
    convocation_envoie: false,
    entree_formation: 0,
    presents_en_formation: 0,
    nombre_candidats: 0,
    nombre_entretiens: 0,
    intitule_diplome: "",
    diplome_vise_code: "",
    code_diplome: "",
    code_rncp: "",
    type_qualification_visee: "",
    specialite_formation: "",
    total_heures: 0,
    heures_enseignements_generaux: 0,
    heures_distanciel: 0,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>("");
  const suggestedNsf = suggestNsfSpecialite(values.nom, values.intitule_diplome);

  useEffect(() => {
    if (!initialValues) return;

    setValues({
      nom: initialValues.nom ?? "",
      centre_id: initialValues.centre?.id ?? null,
      type_offre_id: initialValues.type_offre?.id ?? null,
      statut_id: initialValues.statut?.id ?? null,
      start_date: initialValues.start_date ?? "",
      end_date: initialValues.end_date ?? "",
      num_kairos: initialValues.num_kairos ?? "",
      num_offre: initialValues.num_offre ?? "",
      num_produit: initialValues.num_produit ?? "",
      assistante: initialValues.assistante ?? "",
      prevus_crif: initialValues.prevus_crif ?? 0,
      prevus_mp: initialValues.prevus_mp ?? 0,
      inscrits_crif: initialValues.inscrits_crif ?? 0,
      inscrits_mp: initialValues.inscrits_mp ?? 0,
      cap: initialValues.cap ?? 0,
      convocation_envoie: initialValues.convocation_envoie ?? false,
      entree_formation: initialValues.entree_formation ?? 0,
      presents_en_formation: initialValues.presents_en_formation ?? 0,
      nombre_candidats: initialValues.nombre_candidats ?? 0,
      nombre_entretiens: initialValues.nombre_entretiens ?? 0,
      intitule_diplome: initialValues.intitule_diplome ?? "",
      diplome_vise_code: initialValues.diplome_vise_code ?? "",
      code_diplome: initialValues.code_diplome ?? "",
      code_rncp: initialValues.code_rncp ?? "",
      type_qualification_visee: initialValues.type_qualification_visee ?? "",
      specialite_formation: initialValues.specialite_formation ?? "",
      total_heures: initialValues.total_heures ?? 0,
      heures_enseignements_generaux: initialValues.heures_enseignements_generaux ?? 0,
      heures_distanciel: initialValues.heures_distanciel ?? 0,
    });
  }, [initialValues]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
      const { name, value } = e.target;
      setValues((prev) => ({
        ...prev,
        [name]: ["centre_id", "type_offre_id", "statut_id"].includes(name as string)
          ? value === ""
            ? null
            : Number(value)
          : value,
      }));
      setErrors((prev) => ({ ...prev, [name]: "" }));
      setGeneralError("");
    },
    []
  );

  const handleCheckbox = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setValues((prev) => ({ ...prev, [name]: checked }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setGeneralError("");
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrors({});
      setGeneralError("");

      const nextErrors: Record<string, string> = {};

      if (!values.nom?.trim()) {
        nextErrors.nom = "Le nom de la formation est obligatoire.";
      }
      if (!values.centre_id) {
        nextErrors.centre_id = "Veuillez sélectionner un centre.";
      }
      if (!values.type_offre_id) {
        nextErrors.type_offre_id = "Veuillez sélectionner un type d’offre.";
      }
      if (!values.statut_id) {
        nextErrors.statut_id = "Veuillez sélectionner un statut.";
      }
      if (
        values.start_date &&
        values.end_date &&
        new Date(values.start_date).getTime() > new Date(values.end_date).getTime()
      ) {
        nextErrors.start_date = "La date de début doit être antérieure à la date de fin.";
        nextErrors.end_date = "La date de fin doit être postérieure à la date de début.";
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

        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        }

        setGeneralError(apiError.message || "Impossible d’enregistrer la formation.");
      }
    },
    [values, onSubmit]
  );

  const numericLabels: Record<string, string> = {
    prevus_crif: "Places prévues CRIF",
    prevus_mp: "Places prévues MP",
    inscrits_crif: "Inscrits CRIF",
    inscrits_mp: "Inscrits MP",
    cap: "Capacité maximale",
    entree_formation: "Entrées en formation",
    presents_en_formation: "Présents en formation",
    nombre_candidats: "Nombre de candidats",
    nombre_entretiens: "Nombre d’entretiens",
  };

  const numericFieldsWithHelpers: Record<string, string> = {
    prevus_crif: "Volume prévisionnel côté CRIF.",
    prevus_mp: "Volume prévisionnel côté MP.",
    inscrits_crif: "Nombre actuellement inscrits via CRIF.",
    inscrits_mp: "Nombre actuellement inscrits via MP.",
    cap: "Capacité maximale de la session.",
    entree_formation: "Entrées réellement constatées.",
    presents_en_formation: "Effectif présent à date.",
    nombre_candidats: "Candidatures reçues ou suivies.",
    nombre_entretiens: "Entretiens réalisés.",
    total_heures: "Durée totale de la formation.",
    heures_enseignements_generaux: "Volume des enseignements généraux.",
    heures_distanciel: "Volume réalisé en distanciel.",
  };

  const actionGap = theme.custom.page.template.header.actions.gap.default;

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {generalError ? (
          <Alert severity="error">{generalError}</Alert>
        ) : null}

        <Section
          icon={<AssignmentIcon color="primary" />}
          title="Informations principales"
          description="Bloc de référence pour l’identité de la formation, ses rattachements et sa période."
        >
          <Grid item xs={12}>
            <Alert severity="info">
              Les dates de formation et les informations diplôme ci-dessous sont utilisées pour le
              pré-remplissage du CERFA.
            </Alert>
          </Grid>

          <Input
            label="Nom"
            name="nom"
            required
            value={values.nom}
            error={errors.nom}
            helperText="Nom affiché de la formation."
            onChange={handleChange}
          />

          <SelectField
            label="Centre"
            labelId="centre-label"
            name="centre_id"
            value={values.centre_id ? String(values.centre_id) : ""}
            onChange={handleChange}
            error={errors.centre_id}
            helperText="Centre de rattachement de la formation."
            required
          >
            {centres.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.nom}
              </MenuItem>
            ))}
          </SelectField>

          <SelectField
            label="Type d’offre"
            labelId="type-offre-label"
            name="type_offre_id"
            value={values.type_offre_id ? String(values.type_offre_id) : ""}
            onChange={handleChange}
            error={errors.type_offre_id}
            helperText="Type de dispositif ou d’offre associé."
            required
          >
            {typeOffres.map((t) => (
              <MenuItem key={t.id} value={String(t.id)}>
                {t.nom}
              </MenuItem>
            ))}
          </SelectField>

          <SelectField
            label="Statut"
            labelId="statut-label"
            name="statut_id"
            value={values.statut_id ? String(values.statut_id) : ""}
            onChange={handleChange}
            error={errors.statut_id}
            helperText="Statut administratif actuel de la formation."
            required
          >
            {statuts.map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.nom}
              </MenuItem>
            ))}
          </SelectField>

          <Input
            label="Date de début"
            name="start_date"
            type="date"
            value={values.start_date}
            error={errors.start_date}
            helperText="Date prévue de démarrage."
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />

          <Input
            label="Date de fin"
            name="end_date"
            type="date"
            value={values.end_date}
            error={errors.end_date}
            helperText="Date prévue de fin."
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />
        </Section>

        <Section
          icon={<NumbersIcon color="primary" />}
          title="Numéros & assistante"
          description="Identifiants métier et informations de suivi administratif."
        >
          <Input
            label="N° Kairos"
            name="num_kairos"
            value={values.num_kairos}
            helperText="Référence Kairos."
            onChange={handleChange}
          />

          <Input
            label="N° Offre"
            name="num_offre"
            value={values.num_offre}
            helperText="Référence de l’offre."
            onChange={handleChange}
          />

          <Input
            label="N° Produit"
            name="num_produit"
            value={values.num_produit}
            helperText="Référence produit associée."
            onChange={handleChange}
          />

          <Input
            label="Assistante"
            name="assistante"
            value={values.assistante}
            helperText="Personne référente ou assistante associée."
            onChange={handleChange}
          />
        </Section>

        <Section
          icon={<SchoolIcon color="primary" />}
          title="Diplôme ou titre visé"
          description="Champs utilisés pour le bloc formation du CERFA et les informations de certification."
        >
          <Grid item xs={12}>
            <Alert severity="info">
              Ces champs alimentent le bloc formation du CERFA : diplôme visé, code diplôme, RNCP
              et durée de formation.
            </Alert>
          </Grid>

          <Input
            label="Intitulé précis"
            name="intitule_diplome"
            value={values.intitule_diplome}
            helperText="Libellé libre du diplôme ou titre visé."
            onChange={handleChange}
          />

          <SelectField
            label="Code diplome CERFA"
            labelId="diplome-vise-code-label"
            name="diplome_vise_code"
            value={values.diplome_vise_code ?? ""}
            onChange={handleChange}
            helperText="Codification CERFA du diplôme visé, sans remplacer l’intitulé libre."
          >
            <MenuItem value="">Non defini</MenuItem>
            {diplomeCodeOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </SelectField>

          <Input
            label="Code diplôme"
            name="code_diplome"
            value={values.code_diplome}
            helperText="Code diplôme interne ou réglementaire."
            onChange={handleChange}
          />

          <Input
            label="Code RNCP"
            name="code_rncp"
            value={values.code_rncp}
            helperText="Code RNCP si disponible."
            onChange={handleChange}
          />

          <SelectField
            label="Type de qualification visée"
            labelId="type-qualification-visee-label"
            name="type_qualification_visee"
            value={values.type_qualification_visee ?? ""}
            onChange={handleChange}
            helperText="Source métier pour pré-remplir le CERFA professionnalisation."
          >
            <MenuItem value="">Non defini</MenuItem>
            {qualificationViseeOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </SelectField>

          <SelectField
            label="Code NSF spécialité de formation"
            labelId="specialite-formation-label"
            name="specialite_formation"
            value={values.specialite_formation ?? ""}
            onChange={handleChange}
            helperText="Code NSF à 3 chiffres pour le CERFA professionnalisation."
          >
            <MenuItem value="">Non defini</MenuItem>
            {NSF_SPECIALITE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </SelectField>

          {suggestedNsf && suggestedNsf.code !== (values.specialite_formation ?? "") ? (
            <Grid item xs={12}>
              <Alert severity="info">Suggestion NSF : {suggestedNsf.label}</Alert>
            </Grid>
          ) : null}

          <Input
            label="Total heures"
            name="total_heures"
            type="number"
            value={values.total_heures}
            helperText={numericFieldsWithHelpers.total_heures}
            onChange={handleChange}
          />

          <Input
            label="Heures d'enseignements généraux"
            name="heures_enseignements_generaux"
            type="number"
            value={values.heures_enseignements_generaux}
            helperText={numericFieldsWithHelpers.heures_enseignements_generaux}
            onChange={handleChange}
          />

          <Input
            label="Heures distanciel"
            name="heures_distanciel"
            type="number"
            value={values.heures_distanciel}
            helperText={numericFieldsWithHelpers.heures_distanciel}
            onChange={handleChange}
          />
        </Section>

        <Section
          icon={<BusinessIcon color="primary" />}
          title="Places & inscrits"
          description="Pilotage des volumes prévus, capacités et effectifs inscrits."
        >
          {["prevus_crif", "prevus_mp", "inscrits_crif", "inscrits_mp", "cap"].map((field) => (
            <Input
              key={field}
              label={numericLabels[field] || field}
              name={field}
              type="number"
              value={(values as any)[field]}
              helperText={numericFieldsWithHelpers[field]}
              onChange={handleChange}
            />
          ))}
        </Section>

        <Section
          icon={<TrendingUpIcon color="primary" />}
          title="Recrutement & statistiques"
          description="Suivi opérationnel de la session et état d’avancement du recrutement."
        >
          {[
            "entree_formation",
            "presents_en_formation",
            "nombre_candidats",
            "nombre_entretiens",
          ].map((field) => (
            <Input
              key={field}
              label={numericLabels[field] || field}
              name={field}
              type="number"
              value={(values as any)[field]}
              helperText={numericFieldsWithHelpers[field]}
              onChange={handleChange}
            />
          ))}

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
                    checked={!!values.convocation_envoie}
                    onChange={handleCheckbox}
                    name="convocation_envoie"
                  />
                }
                label="Convocation envoyée"
              />
            </Box>
          </Grid>
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
              <Button
                variant="outlined"
                color="inherit"
                onClick={onCancel}
                disabled={loading || loadingChoices}
              >
                Annuler
              </Button>
            ) : null}

            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={loading || loadingChoices}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {loading ? "Enregistrement..." : submitLabel}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

export default React.memo(FormationForm);