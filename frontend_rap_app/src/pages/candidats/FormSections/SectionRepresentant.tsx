import React, { useCallback } from "react";
import { Card, CardHeader, CardContent, Grid } from "@mui/material";
import AppTextField from "../../../components/forms/fields/AppTextField";
import type { CandidatFormData } from "../../../types/candidat";

interface Props {
  form: CandidatFormData;
  setForm: React.Dispatch<React.SetStateAction<CandidatFormData>>;
}

function SectionRepresentant({ form, setForm }: Props) {
  const updateField = useCallback(
    (key: keyof CandidatFormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    [setForm]
  );

  return (
    <Card variant="outlined">
      <CardHeader title="Représentant légal (si mineur)" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <AppTextField
              fullWidth
              label="Lien avec le candidat"
              value={form.representant_lien ?? ""}
              onChange={updateField("representant_lien")}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <AppTextField
              fullWidth
              label="Nom de naissance"
              value={form.representant_nom_naissance ?? ""}
              onChange={updateField("representant_nom_naissance")}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <AppTextField
              fullWidth
              label="Prénom"
              value={form.representant_prenom ?? ""}
              onChange={updateField("representant_prenom")}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <AppTextField
              fullWidth
              type="email"
              label="Email"
              value={form.representant_email ?? ""}
              onChange={updateField("representant_email")}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <AppTextField
              fullWidth
              label="Rue"
              value={form.representant_street_name ?? ""}
              onChange={updateField("representant_street_name")}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <AppTextField
              fullWidth
              label="Code postal"
              value={form.representant_zip_code ?? ""}
              onChange={updateField("representant_zip_code")}
            />
          </Grid>

          <Grid item xs={12} md={8}>
            <AppTextField
              fullWidth
              label="Ville"
              value={form.representant_city ?? ""}
              onChange={updateField("representant_city")}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default React.memo(SectionRepresentant);
