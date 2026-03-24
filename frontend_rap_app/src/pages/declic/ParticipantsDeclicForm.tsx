import { Box, Button, FormControlLabel, Grid, MenuItem, Paper, Stack, Switch, TextField, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import type { ParticipantDeclic } from "src/types/declic";
import RichHtmlEditorField from "src/components/forms/RichHtmlEditorField";

interface Props {
  initialValues?: Partial<ParticipantDeclic>;
  meta?: Record<string, unknown> | null;
  submitting?: boolean;
  onSubmit: (values: Partial<ParticipantDeclic>) => void | Promise<void>;
  onCancel?: () => void;
}

export default function ParticipantsDeclicForm({
  initialValues,
  meta,
  submitting = false,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<Partial<ParticipantDeclic>>({
    nom: initialValues?.nom ?? "",
    prenom: initialValues?.prenom ?? "",
    telephone: initialValues?.telephone ?? "",
    email: initialValues?.email ?? "",
    centre_id: initialValues?.centre_id ?? initialValues?.centre?.id ?? undefined,
    declic_origine_id: initialValues?.declic_origine_id ?? undefined,
    present: initialValues?.present ?? true,
    commentaire_presence: initialValues?.commentaire_presence ?? "",
  });

  const centres = useMemo(() => ((meta?.centres as Array<{ id: number; nom: string }>) ?? []), [meta]);
  const declics = useMemo(
    () => ((meta?.declics_origine as Array<{ id: number; label: string }>) ?? []),
    [meta]
  );

  const update = <K extends keyof ParticipantDeclic>(key: K, value: ParticipantDeclic[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" mb={2}>
          Identité
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField fullWidth required label="Nom" value={form.nom ?? ""} onChange={(e) => update("nom", e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth required label="Prénom" value={form.prenom ?? ""} onChange={(e) => update("prenom", e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Téléphone" value={form.telephone ?? ""} onChange={(e) => update("telephone", e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Email" type="email" value={form.email ?? ""} onChange={(e) => update("email", e.target.value)} />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" mb={2}>
          Participation
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Centre"
              value={form.centre_id ?? ""}
              onChange={(e) => update("centre_id", e.target.value === "" ? undefined : Number(e.target.value))}
            >
              <MenuItem value="">—</MenuItem>
              {centres.map((centre) => (
                <MenuItem key={centre.id} value={centre.id}>
                  {centre.nom}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField
              select
              fullWidth
              label="Séance Déclic"
              value={form.declic_origine_id ?? ""}
              onChange={(e) =>
                update("declic_origine_id", e.target.value === "" ? undefined : Number(e.target.value))
              }
            >
              <MenuItem value="">—</MenuItem>
              {declics.map((declic) => (
                <MenuItem key={declic.id} value={declic.id}>
                  {declic.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(form.present)}
                  onChange={(e) => update("present", e.target.checked)}
                />
              }
              label="Participant présent"
            />
          </Grid>
          <Grid item xs={12}>
            <RichHtmlEditorField
              label="Commentaire de présence"
              value={form.commentaire_presence ?? ""}
              onChange={(value) => update("commentaire_presence", value)}
              placeholder="Ajouter un commentaire enrichi…"
            />
          </Grid>
        </Grid>
      </Paper>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
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
  );
}
