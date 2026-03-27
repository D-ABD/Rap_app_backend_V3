import React, { useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Grid,
  TextField,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Box,
  Button,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";

import type { CandidatFormData, CandidatMeta } from "../../../types/candidat";
import { formatFormation } from "./utils";
import { FormationPick } from "../../../components/modals/FormationSelectModal";

interface Props {
  form: CandidatFormData;
  setForm: React.Dispatch<React.SetStateAction<CandidatFormData>>;
  meta?: CandidatMeta | null;

  // Formation
  canEditFormation: boolean;
  showFormationModal: boolean;
  setShowFormationModal: (b: boolean) => void;
  formationInfo: FormationPick | null;
}

function SectionIdentite({
  form,
  setForm,
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
            <TextField
              fullWidth
              required
              label="Nom"
              value={form.nom ?? ""}
              onChange={updateField("nom")}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
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
            <TextField
              fullWidth
              required
              type="email"
              label="Email"
              value={form.email ?? ""}
              onChange={updateField("email")}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
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
            <TextField
              fullWidth
              label="Numéro OSIA"
              value={form.numero_osia ?? ""}
              onChange={updateField("numero_osia")}
            />
          </Grid>

          {/* -------------------- ADRESSE -------------------- */}

          <Grid item xs={12}>
            <hr />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="N°"
              value={form.street_number ?? ""}
              onChange={updateField("street_number")}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Rue"
              value={form.street_name ?? ""}
              onChange={updateField("street_name")}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Complément"
              value={form.street_complement ?? ""}
              onChange={updateField("street_complement")}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Code postal"
              value={form.code_postal ?? ""}
              onChange={updateField("code_postal")}
            />
          </Grid>

          <Grid item xs={12} md={8}>
            <TextField
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
            <TextField
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
                <TextField
                  fullWidth
                  label="Nom de la formation"
                  value={formationInfo.nom ?? ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Centre"
                  value={formationInfo.centre?.nom ?? ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Type d’offre"
                  value={formationInfo.type_offre?.nom ?? ""}
                  InputProps={{ readOnly: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
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
