import React, { useEffect, useState, useCallback } from "react";
import {
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

/* =========================================
 * Sous-composants au niveau module
 * ========================================= */

type SectionProps = { icon: React.ReactNode; title: string; children: React.ReactNode };
function Section({ icon, title, children }: SectionProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, backgroundColor: "#fafafa" }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        {icon}
        <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
          {title}
        </Typography>
      </Stack>
      <Divider sx={{ mb: 2 }} />
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
    code_diplome: "",
    code_rncp: "",
    total_heures: 0,
    heures_distanciel: 0,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

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
      code_diplome: initialValues.code_diplome ?? "",
      code_rncp: initialValues.code_rncp ?? "",
      total_heures: initialValues.total_heures ?? 0,
      heures_distanciel: initialValues.heures_distanciel ?? 0,
    });
    // ⛔️ Ne pas redéclencher quand initialValues change (évite la double validation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    },
    []
  );

  const handleCheckbox = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setValues((prev) => ({ ...prev, [name]: checked }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrors({});
      if (!values.nom.trim()) {
        setErrors({ nom: "Le nom est requis" });
        return;
      }
      try {
        await onSubmit(values);
      } catch (err: any) {
        if (err?.response?.data?.errors) {
          setErrors(err.response.data.errors);
        }
      }
    },
    [values, onSubmit]
  );

  // ✅ Rendu
  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Section icon={<AssignmentIcon color="primary" />} title="Informations principales">
        <Input
          label="Nom"
          name="nom"
          required
          value={values.nom}
          error={errors.nom}
          onChange={handleChange}
        />

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
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
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
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
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
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
      <Section icon={<SchoolIcon color="primary" />} title="Diplôme ou titre visé">
        <Input
          label="Intitulé précis"
          name="intitule_diplome"
          value={values.intitule_diplome}
          onChange={handleChange}
        />
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
        <Input
          label="Total heures"
          name="total_heures"
          type="number"
          value={values.total_heures}
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
            label={field.replace("_", " ").toUpperCase()}
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
            label={field.replace("_", " ").toUpperCase()}
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
      <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button
          type="submit"
          variant="contained"
          color="success"
          disabled={loading || loadingChoices}
          startIcon={loading ? <CircularProgress size={18} /> : undefined}
        >
          {loading ? "Enregistrement..." : submitLabel}
        </Button>

        {onCancel && (
          <Button variant="outlined" color="inherit" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </Stack>
    </Box>
  );
}

export default React.memo(FormationForm);
