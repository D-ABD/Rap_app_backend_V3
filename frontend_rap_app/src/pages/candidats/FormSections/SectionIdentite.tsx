import React, { useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Grid,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Box,
  Button,
  FormHelperText,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";

import type { CandidatFormData, CandidatMeta } from "../../../types/candidat";
import { formatFormation } from "./utils";
import { FormationPick } from "../../../components/modals/FormationSelectModal";
import AppTextField from "../../../components/forms/fields/AppTextField";

const TYPE_CONTRAT_CERFA_OPTIONS = [
  { value: "11", label: "11 - Premier contrat d'apprentissage" },
  { value: "21", label: "21 - Nouveau contrat meme employeur" },
  { value: "22", label: "22 - Nouveau contrat autre employeur" },
  { value: "23", label: "23 - Nouveau contrat apres rupture" },
  { value: "31", label: "31 - Modification situation juridique employeur" },
  { value: "32", label: "32 - Changement d'employeur contrat saisonnier" },
  { value: "33", label: "33 - Prolongation suite echec examen" },
  { value: "34", label: "34 - Prolongation suite RQTH" },
  { value: "35", label: "35 - Diplome supplementaire prepare" },
  { value: "36", label: "36 - Autres changements" },
  { value: "37", label: "37 - Modification lieu d'execution" },
  { value: "38", label: "38 - Modification lieu principal de formation" },
];

const TYPE_CONTRAT_CERFA_PRO_OPTIONS = [
  { value: "11", label: "11 - Contrat initial (cas general)" },
  {
    value: "12",
    label: "12 - Contrat initial conclu conjointement avec deux employeurs pour l'exercice d'une activite saisonniere",
  },
  { value: "21", label: "21 - Nouveau contrat en raison de l'echec aux epreuves d'evaluation" },
  { value: "22", label: "22 - Nouveau contrat en raison de la defaillance de l'organisme de formation" },
  { value: "23", label: "23 - Nouveau contrat en raison de la maternite, de la maladie ou d'un accident de travail" },
  {
    value: "24",
    label: "24 - Nouveau contrat pour l'obtention d'une qualification superieure ou complementaire",
  },
  { value: "30", label: "30 - Avenant" },
];

const APPRENTISSAGE_TYPE_CONTRAT_CERFA_CODES = new Set(
  TYPE_CONTRAT_CERFA_OPTIONS.map((opt) => opt.value)
);
const PROFESSIONNALISATION_TYPE_CONTRAT_CERFA_CODES = new Set(
  TYPE_CONTRAT_CERFA_PRO_OPTIONS.map((opt) => opt.value)
);

interface Props {
  form: CandidatFormData;
  setForm: React.Dispatch<React.SetStateAction<CandidatFormData>>;
  meta?: CandidatMeta | null;
  errors?: Record<string, string[]>;

  // Formation
  canEditFormation: boolean;
  showFormationModal: boolean;
  setShowFormationModal: (b: boolean) => void;
  formationInfo: FormationPick | null;
}

function SectionIdentite({
  form,
  setForm,
  meta,
  errors,
  canEditFormation,
  setShowFormationModal,
  formationInfo,
}: Props) {
  /* ------------------ Helpers ------------------ */

  const updateField = useCallback(
    (key: keyof CandidatFormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    [setForm]
  );

  const updateSelect = useCallback(
    (key: keyof CandidatFormData) =>
      (e: any) =>
        setForm((f) => ({
          ...f,
          [key]: e.target.value === "" ? undefined : e.target.value,
        })),
    [setForm]
  );

  const updateTypeContrat = useCallback(
    (e: any) => {
      const nextTypeContrat = e.target.value === "" ? undefined : e.target.value;
      setForm((f) => {
        const currentCode = f.type_contrat_code ?? undefined;
        const allowedCodes =
          nextTypeContrat === "professionnalisation"
            ? PROFESSIONNALISATION_TYPE_CONTRAT_CERFA_CODES
            : APPRENTISSAGE_TYPE_CONTRAT_CERFA_CODES;
        return {
          ...f,
          type_contrat: nextTypeContrat,
          type_contrat_code: currentCode && allowedCodes.has(currentCode) ? currentCode : undefined,
        };
      });
    },
    [setForm]
  );

  const handleCheckbox = useCallback(
    (key: keyof CandidatFormData) =>
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.checked })),
    [setForm]
  );

  const dateNaissanceValue = useMemo(() => {
    if (!form.date_naissance) return null;
    const value = dayjs(form.date_naissance);
    return value.isValid() ? value : null;
  }, [form.date_naissance]);

  const handleDateNaissanceChange = useCallback(
    (value: Dayjs | null) => {
      setForm((f) => ({
        ...f,
        date_naissance: value && value.isValid() ? value.format("YYYY-MM-DD") : undefined,
      }));
    },
    [setForm]
  );

  const clearFormation = useCallback(
    () => setForm((f) => ({ ...f, formation: undefined })),
    [setForm]
  );

  const formationLabel = useMemo(() => {
    if (formationInfo) return formatFormation(formationInfo);
    if (form.formation) return `#${form.formation}`;
    return "";
  }, [formationInfo, form.formation]);

  /* ------------------ UI ------------------ */

  return (
    <Card variant="outlined">
      <CardHeader
        title="Identité — Adresse — Formation"
        subheader="Données personnelles du candidat"
      />

      <CardContent>
        <Grid container spacing={2}>

          {/* -------------------- IDENTITÉ -------------------- */}

          <Grid item xs={12} md={6}>
            <AppTextField
              fullWidth
              required
              label="Nom"
              value={form.nom ?? ""}
              onChange={updateField("nom")}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <AppTextField
              fullWidth
              required
              label="Prénom"
              value={form.prenom ?? ""}
              onChange={updateField("prenom")}
            />
          </Grid>

          {/* Sexe */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel>Sexe</FormLabel>
              <Select
                value={form.sexe ?? ""}
                onChange={updateSelect("sexe")}
                displayEmpty
              >
                <MenuItem value="">
                  <em>— Non précisé —</em>
                </MenuItem>
                <MenuItem value="M">Masculin</MenuItem>
                <MenuItem value="F">Féminin</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Email / Téléphone */}
          <Grid item xs={12} md={6}>
            <AppTextField
              fullWidth
              required
              type="email"
              label="Email"
              value={form.email ?? ""}
              onChange={updateField("email")}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <AppTextField
              fullWidth
              label="Téléphone"
              value={form.telephone ?? ""}
              onChange={updateField("telephone")}
            />
          </Grid>

          {/* Date naissance */}
          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date de naissance"
                value={dateNaissanceValue}
                onChange={handleDateNaissanceChange}
                views={["year", "month", "day"]}
                openTo="year"
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: "Le calendrier permet de choisir facilement l'annee.",
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>

          {/* RQTH / Permis B */}
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Checkbox checked={!!form.rqth} onChange={handleCheckbox("rqth")} />
              }
              label="Reconnaissance RQTH"
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Checkbox checked={!!form.permis_b} onChange={handleCheckbox("permis_b")} />
              }
              label="Permis B"
            />
          </Grid>

          {/* Numéro OSIA */}
          <Grid item xs={12} md={6}>
            <AppTextField
              fullWidth
              label="Numéro OSIA"
              value={form.numero_osia ?? ""}
              onChange={updateField("numero_osia")}
              error={!!errors?.numero_osia?.length}
              helperText={errors?.numero_osia?.[0]}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!errors?.type_contrat?.length}>
              <FormLabel>Type de contrat du stagiaire</FormLabel>
              <Select
                value={form.type_contrat ?? ""}
                onChange={updateTypeContrat}
                displayEmpty
              >
                <MenuItem value="">—</MenuItem>
                {(meta?.type_contrat_choices ?? []).map((opt) => (
                  <MenuItem key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
              {errors?.type_contrat?.length ? (
                <FormHelperText>{errors.type_contrat[0]}</FormHelperText>
              ) : null}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!errors?.contrat_signe?.length}>
              <FormLabel>Contrat signé</FormLabel>
              <Select
                value={form.contrat_signe ?? ""}
                onChange={updateSelect("contrat_signe")}
                displayEmpty
              >
                <MenuItem value="">—</MenuItem>
                {(meta?.contrat_signe_choices ?? []).map((opt) => (
                  <MenuItem key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </MenuItem>
                  ))}
                </Select>
              <FormHelperText>
                {errors?.contrat_signe?.[0] ?? 'Si la valeur est "Oui", le numéro OSIA devient obligatoire.'}
              </FormHelperText>
            </FormControl>
          </Grid>

          {/* -------------------- ADRESSE -------------------- */}

          <Grid item xs={12}>
            <hr />
          </Grid>

          <Grid item xs={12} md={2}>
            <AppTextField
              fullWidth
              label="N°"
              value={form.street_number ?? ""}
              onChange={updateField("street_number")}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <AppTextField
              fullWidth
              label="Rue"
              value={form.street_name ?? ""}
              onChange={updateField("street_name")}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <AppTextField
              fullWidth
              label="Complément"
              value={form.street_complement ?? ""}
              onChange={updateField("street_complement")}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <AppTextField
              fullWidth
              label="Code postal"
              value={form.code_postal ?? ""}
              onChange={updateField("code_postal")}
            />
          </Grid>

          <Grid item xs={12} md={8}>
            <AppTextField
              fullWidth
              label="Ville"
              value={form.ville ?? ""}
              onChange={updateField("ville")}
            />
          </Grid>

          {/* -------------------- FORMATION -------------------- */}

          <Grid item xs={12}>
            <hr />
          </Grid>

          <Grid item xs={12} md={6}>
            <AppTextField
              fullWidth
              required
              label="Formation sélectionnée"
              value={formationLabel}
              placeholder={canEditFormation ? "— Aucune sélection —" : "Non modifiable"}
              InputProps={{ readOnly: true }}
            />

            {canEditFormation && (
              <Box display="flex" gap={1} mt={1}>
                <Button variant="outlined" onClick={() => setShowFormationModal(true)}>
                  🔍 Sélectionner
                </Button>

                {form.formation && (
                  <Button color="error" variant="outlined" onClick={clearFormation}>
                    ✖ Effacer
                  </Button>
                )}
              </Box>
            )}
          </Grid>

          {/* Champs auto après sélection */}
          {formationInfo && (
            <>
              <Grid item xs={12} md={6}>
                <AppTextField
                  fullWidth
                  label="Nom de la formation"
                  value={formationInfo.nom ?? ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <AppTextField
                  fullWidth
                  label="Centre"
                  value={formationInfo.centre?.nom ?? ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <AppTextField
                  fullWidth
                  label="Type d’offre"
                  value={formationInfo.type_offre?.nom ?? ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <AppTextField
                  fullWidth
                  label="N° d’offre"
                  value={formationInfo.num_offre ?? ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </>
          )}

        </Grid>
      </CardContent>
    </Card>
  );
}

export default React.memo(SectionIdentite);
