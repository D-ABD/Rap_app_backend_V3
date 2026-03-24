import { Box, Button, Chip, FormControlLabel, Grid, MenuItem, Paper, Stack, Switch, TextField, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import type { StagiairePrepa } from "src/types/prepa";

interface Props {
  initialValues?: Partial<StagiairePrepa>;
  meta?: Record<string, unknown> | null;
  submitting?: boolean;
  onSubmit: (values: Partial<StagiairePrepa>) => void | Promise<void>;
  onCancel?: () => void;
}

const atelierFields = [
  { flag: "atelier_1_realise", date: "date_atelier_1", label: "Atelier 1" },
  { flag: "atelier_2_realise", date: "date_atelier_2", label: "Atelier 2" },
  { flag: "atelier_3_realise", date: "date_atelier_3", label: "Atelier 3" },
  { flag: "atelier_4_realise", date: "date_atelier_4", label: "Atelier 4" },
  { flag: "atelier_5_realise", date: "date_atelier_5", label: "Atelier 5" },
  { flag: "atelier_6_realise", date: "date_atelier_6", label: "Atelier 6" },
  { flag: "atelier_autre_realise", date: "date_atelier_autre", label: "Autre atelier" },
] as const;

export default function StagiairesPrepaForm({
  initialValues,
  meta,
  submitting = false,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<Partial<StagiairePrepa>>({
    nom: initialValues?.nom ?? "",
    prenom: initialValues?.prenom ?? "",
    telephone: initialValues?.telephone ?? "",
    email: initialValues?.email ?? "",
    centre_id: initialValues?.centre_id ?? initialValues?.centre?.id ?? undefined,
    prepa_origine_id: initialValues?.prepa_origine_id ?? undefined,
    statut_parcours: initialValues?.statut_parcours ?? "en_attente",
    date_entree_parcours: initialValues?.date_entree_parcours ?? "",
    date_sortie_parcours: initialValues?.date_sortie_parcours ?? "",
    commentaire_suivi: initialValues?.commentaire_suivi ?? "",
    motif_abandon: initialValues?.motif_abandon ?? "",
    atelier_1_realise: initialValues?.atelier_1_realise ?? false,
    atelier_2_realise: initialValues?.atelier_2_realise ?? false,
    atelier_3_realise: initialValues?.atelier_3_realise ?? false,
    atelier_4_realise: initialValues?.atelier_4_realise ?? false,
    atelier_5_realise: initialValues?.atelier_5_realise ?? false,
    atelier_6_realise: initialValues?.atelier_6_realise ?? false,
    atelier_autre_realise: initialValues?.atelier_autre_realise ?? false,
    date_atelier_1: initialValues?.date_atelier_1 ?? "",
    date_atelier_2: initialValues?.date_atelier_2 ?? "",
    date_atelier_3: initialValues?.date_atelier_3 ?? "",
    date_atelier_4: initialValues?.date_atelier_4 ?? "",
    date_atelier_5: initialValues?.date_atelier_5 ?? "",
    date_atelier_6: initialValues?.date_atelier_6 ?? "",
    date_atelier_autre: initialValues?.date_atelier_autre ?? "",
  });

  const centres = useMemo(() => ((meta?.centres as Array<{ id: number; nom: string }>) ?? []), [meta]);
  const statuts = useMemo(
    () =>
      ((meta?.statut_parcours as Array<{ value: string; label: string }>) ?? [
        { value: "en_attente", label: "En attente de parcours" },
        { value: "en_parcours", label: "En parcours" },
        { value: "parcours_termine", label: "Parcours terminé" },
        { value: "abandon", label: "Abandon" },
      ]),
    [meta]
  );
  const prepas = useMemo(
    () => ((meta?.prepas_origine as Array<{ id: number; label: string }>) ?? []),
    [meta]
  );

  const update = <K extends keyof StagiairePrepa>(key: K, value: StagiairePrepa[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const ateliersRealisesLive = useMemo(
    () =>
      atelierFields
        .filter((field) => Boolean(form[field.flag]))
        .map((field) => field.label),
    [form]
  );

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
          Parcours
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Prépa d'origine"
              value={form.prepa_origine_id ?? ""}
              onChange={(e) =>
                update("prepa_origine_id", e.target.value === "" ? undefined : Number(e.target.value))
              }
            >
              <MenuItem value="">—</MenuItem>
              {prepas.map((prepa) => (
                <MenuItem key={prepa.id} value={prepa.id}>
                  {prepa.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Statut"
              value={form.statut_parcours ?? "en_attente"}
              onChange={(e) => update("statut_parcours", e.target.value as StagiairePrepa["statut_parcours"])}
            >
              {statuts.map((statut) => (
                <MenuItem key={statut.value} value={statut.value}>
                  {statut.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="Entrée"
              InputLabelProps={{ shrink: true }}
              value={form.date_entree_parcours ?? ""}
              onChange={(e) => update("date_entree_parcours", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="Sortie"
              InputLabelProps={{ shrink: true }}
              value={form.date_sortie_parcours ?? ""}
              onChange={(e) => update("date_sortie_parcours", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Motif d'abandon"
              value={form.motif_abandon ?? ""}
              onChange={(e) => update("motif_abandon", e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Commentaire de suivi"
              value={form.commentaire_suivi ?? ""}
              onChange={(e) => update("commentaire_suivi", e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" mb={2}>
          Ateliers réalisés
        </Typography>
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: "#fafafa" }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Récapitulatif du parcours atelier
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Ateliers déjà réalisés : {ateliersRealisesLive.length}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {ateliersRealisesLive.length ? (
              ateliersRealisesLive.map((label) => <Chip key={label} size="small" color="primary" variant="outlined" label={label} />)
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aucun atelier encore renseigné.
              </Typography>
            )}
          </Stack>
        </Paper>
        <Grid container spacing={2}>
          {atelierFields.map((field) => {
            const checked = Boolean(form[field.flag]);
            return (
              <Grid item xs={12} md={6} key={field.flag}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={checked}
                          onChange={(e) =>
                            update(field.flag, e.target.checked as StagiairePrepa[typeof field.flag])
                          }
                        />
                      }
                      label={field.label}
                    />
                    <TextField
                      type="date"
                      size="small"
                      label={`Date ${field.label.toLowerCase()}`}
                      InputLabelProps={{ shrink: true }}
                      value={(form[field.date] as string) ?? ""}
                      onChange={(e) => update(field.date, e.target.value as StagiairePrepa[typeof field.date])}
                      disabled={!checked}
                    />
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
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
