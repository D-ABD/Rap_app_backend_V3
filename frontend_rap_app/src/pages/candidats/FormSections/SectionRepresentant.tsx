import React, { useCallback } from "react";
import { Card, CardHeader, CardContent, Grid, TextField } from "@mui/material";
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
            <TextField
              fullWidth
              label="Lien avec le candidat"
              value={form.representant_lien ?? ""}
              onChange={updateField("representant_lien")}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Nom de naissance"
              value={form.representant_nom_naissance ?? ""}
              onChange={updateField("representant_nom_naissance")}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Prénom"
              value={form.representant_prenom ?? ""}
              onChange={updateField("representant_prenom")}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="email"
              label="Email"
              value={form.representant_email ?? ""}
              onChange={updateField("representant_email")}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Rue"
              value={form.representant_street_name ?? ""}
              onChange={updateField("representant_street_name")}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Code postal"
              value={form.representant_zip_code ?? ""}
              onChange={updateField("representant_zip_code")}
            />
          </Grid>

          <Grid item xs={12} md={8}>
            <TextField
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
