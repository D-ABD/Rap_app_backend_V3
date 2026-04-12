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
  Paper,
  Divider,
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

/* =========================================
 * Sous-composants au niveau module
 * ========================================= */

type SectionProps = { icon: React.ReactNode; title: string; children: React.ReactNode };
function Section({ icon, title, children }: SectionProps) {
  const theme = useTheme<AppTheme>();
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        mb: 3,
        borderRadius: 2,
        backgroundColor:
          theme.palette.mode === "light"
            ? theme.custom.form.section.paperBackground.light
            : theme.custom.form.section.paperBackground.dark,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        {icon}
        <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
          {title}
        </Typography>
      </Stack>
      <Divider
        sx={{
          mb: 2,
          borderBottomStyle: "dashed",
          borderBottomWidth: theme.custom.form.divider.dashedWidth,
          borderColor:
            theme.palette.mode === "light"
              ? theme.custom.form.divider.dashedColor.light
              : theme.custom.form.divider.dashedColor.dark,
        }}
      />
      <Grid container spacing={2}>
        {children}
      </Grid>
    </Paper>
  );
}

type InputProps = {
  label: string;
  name: keyof FormationFormDataRaw | string;
  type?: string;
  value: any;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => void;
  [k: string]: any;
};
function Input({ label, name, type = "text", value, error, onChange, ...props }: InputProps) {
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
        helperText={error}
        {...props}
      />
    </Grid>
  );
}

/* =========================================
 * Composant principal
 * ========================================= */

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
    { value: "3", label: "3 - Qualification reconnue dans les classifications d'une convention collective nationale" },
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

  // ✅ Initialisation — exécution une seule fois au montage
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

  // ✅ Handlers
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
          Object.entries(apiError.errors ?? {}).map(([field, messages]) => [field, messages[0] ?? ""])
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
    nombre_candidats: "Nombre de candidats",
    nombre_entretiens: "Nombre d’entretiens",
  };

  // ✅ Rendu
  return (
    <Box component="form" onSubmit={handleSubmit}>
      {generalError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {generalError}
        </Alert>
      ) : null}

      <Section icon={<AssignmentIcon color="primary" />} title="Informations principales">
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
          onChange={handleChange}
        />

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.centre_id}>
            <InputLabel id="centre-label">Centre</InputLabel>
            <Select
              labelId="centre-label"
              name="centre_id"
              value={values.centre_id ? String(values.centre_id) : ""}
              onChange={handleChange}
              label="Centre"
              required
            >
              {centres.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.nom}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.centre_id || "Centre de rattachement de la formation."}</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.type_offre_id}>
            <InputLabel id="type-offre-label">Type d’offre</InputLabel>
            <Select
              labelId="type-offre-label"
              name="type_offre_id"
              value={values.type_offre_id ? String(values.type_offre_id) : ""}
              onChange={handleChange}
              label="Type d’offre"
              required
            >
              {typeOffres.map((t) => (
                <MenuItem key={t.id} value={String(t.id)}>
                  {t.nom}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.type_offre_id || "Type de dispositif ou d’offre associé."}</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!errors.statut_id}>
            <InputLabel id="statut-label">Statut</InputLabel>
            <Select
              labelId="statut-label"
              name="statut_id"
              value={values.statut_id ? String(values.statut_id) : ""}
              onChange={handleChange}
              label="Statut"
              required
            >
              {statuts.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.nom}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>{errors.statut_id || "Statut administratif actuel de la formation."}</FormHelperText>
          </FormControl>
        </Grid>

        <Input
          label="Date de début"
          name="start_date"
          type="date"
          value={values.start_date}
          error={errors.start_date}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
        />
        <Input
          label="Date de fin"
          name="end_date"
          type="date"
          value={values.end_date}
          error={errors.end_date}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
        />
      </Section>

      {/* Section 2 */}
      <Section icon={<NumbersIcon color="primary" />} title="Numéros & assistante">
        <Input
          label="N° Kairos"
          name="num_kairos"
          value={values.num_kairos}
          onChange={handleChange}
        />
        <Input label="N° Offre" name="num_offre" value={values.num_offre} onChange={handleChange} />
        <Input
          label="N° Produit"
          name="num_produit"
          value={values.num_produit}
          onChange={handleChange}
        />
        <Input
          label="Assistante"
          name="assistante"
          value={values.assistante}
          onChange={handleChange}
        />
      </Section>

      {/* Section 3 */}
      <Section icon={<SchoolIcon color="primary" />} title="Diplôme ou titre visé (CERFA)">
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
          onChange={handleChange}
        />
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="diplome-vise-code-label">Code diplome CERFA</InputLabel>
            <Select
              labelId="diplome-vise-code-label"
              label="Code diplome CERFA"
              name="diplome_vise_code"
              value={values.diplome_vise_code ?? ""}
              onChange={handleChange}
            >
              <MenuItem value="">Non defini</MenuItem>
              {diplomeCodeOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Codification CERFA du diplome vise, sans remplacer l'intitule libre.</FormHelperText>
          </FormControl>
        </Grid>
        <Input
          label="Code diplôme"
          name="code_diplome"
          value={values.code_diplome}
          onChange={handleChange}
        />
        <Input
          label="Code RNCP"
          name="code_rncp"
          value={values.code_rncp}
          onChange={handleChange}
        />
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="type-qualification-visee-label">Type de qualification visée</InputLabel>
            <Select
              labelId="type-qualification-visee-label"
              label="Type de qualification visée"
              name="type_qualification_visee"
              value={values.type_qualification_visee ?? ""}
              onChange={handleChange}
            >
              <MenuItem value="">Non defini</MenuItem>
              {qualificationViseeOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Source metier pour pre-remplir le CERFA professionnalisation.
            </FormHelperText>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="specialite-formation-label">Code NSF spécialité de formation</InputLabel>
            <Select
              labelId="specialite-formation-label"
              label="Code NSF spécialité de formation"
              name="specialite_formation"
              value={values.specialite_formation ?? ""}
              onChange={handleChange}
            >
              <MenuItem value="">Non defini</MenuItem>
              {NSF_SPECIALITE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Code NSF a 3 chiffres pour le CERFA professionnalisation.</FormHelperText>
          </FormControl>
        </Grid>
        {suggestedNsf && suggestedNsf.code !== (values.specialite_formation ?? "") && (
          <Grid item xs={12}>
            <Alert severity="info">Suggestion NSF : {suggestedNsf.label}</Alert>
          </Grid>
        )}
        <Input
          label="Total heures"
          name="total_heures"
          type="number"
          value={values.total_heures}
          onChange={handleChange}
        />
        <Input
          label="Heures d'enseignements généraux"
          name="heures_enseignements_generaux"
          type="number"
          value={values.heures_enseignements_generaux}
          onChange={handleChange}
        />
        <Input
          label="Heures distanciel"
          name="heures_distanciel"
          type="number"
          value={values.heures_distanciel}
          onChange={handleChange}
        />
      </Section>

      {/* Section 4 */}
      <Section icon={<BusinessIcon color="primary" />} title="Places & inscrits">
        {["prevus_crif", "prevus_mp", "inscrits_crif", "inscrits_mp", "cap"].map((field) => (
          <Input
            key={field}
            label={numericLabels[field] || field}
            name={field}
            type="number"
            value={(values as any)[field]}
            onChange={handleChange}
          />
        ))}
      </Section>

      {/* Section 5 */}
      <Section icon={<TrendingUpIcon color="primary" />} title="Recrutement & statistiques">
        {["entree_formation", "nombre_candidats", "nombre_entretiens"].map((field) => (
          <Input
            key={field}
            label={numericLabels[field] || field}
            name={field}
            type="number"
            value={(values as any)[field]}
            onChange={handleChange}
          />
        ))}

        <Grid item xs={12}>
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
        </Grid>
      </Section>

      {/* Boutons */}
      <Stack
        direction={{ xs: "column-reverse", sm: "row" }}
        spacing={2}
        justifyContent="flex-end"
        sx={{ mt: 3 }}
      >
        <Button
          type="submit"
          variant="contained"
          color="success"
          disabled={loading || loadingChoices}
          startIcon={loading ? <CircularProgress size={18} /> : undefined}
          fullWidth={loading || loadingChoices ? true : false}
        >
          {loading ? "Enregistrement..." : submitLabel}
        </Button>

        {onCancel && (
          <Button variant="outlined" color="inherit" onClick={onCancel} fullWidth>
            Annuler
          </Button>
        )}
      </Stack>
    </Box>
  );
}

export default React.memo(FormationForm);
