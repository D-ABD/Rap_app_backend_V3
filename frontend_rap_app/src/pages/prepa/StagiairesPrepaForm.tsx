import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import type { AppTheme } from "src/theme";
import { useEffect, useMemo, useState } from "react";
import type { StagiairePrepa } from "src/types/prepa";
import RichHtmlEditorField from "src/components/forms/RichHtmlEditorField";
import { useAuth } from "src/hooks/useAuth";
import { isAdminLikeRole } from "src/utils/roleGroups";

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
  const theme = useTheme<AppTheme>();
  const { user } = useAuth();
  const isAdminLike = isAdminLikeRole(user?.role);
  const isLight = theme.palette.mode === "light";
  const sectionPaperBg = isLight
    ? theme.custom.form.section.paperBackground.light
    : theme.custom.form.section.paperBackground.dark;
  const [form, setForm] = useState<Partial<StagiairePrepa>>({
    nom: initialValues?.nom ?? "",
    prenom: initialValues?.prenom ?? "",
    telephone: initialValues?.telephone ?? "",
    email: initialValues?.email ?? "",
    centre_id: initialValues?.centre_id ?? initialValues?.centre?.id ?? undefined,
    prepa_origine_id: initialValues?.prepa_origine_id ?? undefined,
    statut_parcours: initialValues?.statut_parcours ?? "en_attente",
    statut_positionnement: initialValues?.statut_positionnement ?? null,
    prochain_atelier_prevu: initialValues?.prochain_atelier_prevu ?? null,
    orientation_finale: initialValues?.orientation_finale ?? null,
    centre_afpa_cible_id:
      initialValues?.centre_afpa_cible_id ?? initialValues?.centre_afpa_cible?.id ?? undefined,
    formation_afpa_cible: initialValues?.formation_afpa_cible ?? "",
    date_orientation: initialValues?.date_orientation ?? "",
    entree_formation_confirmee: initialValues?.entree_formation_confirmee ?? false,
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
  const hasSingleScopedCentre = !isAdminLike && centres.length === 1;
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
  const statutsPositionnement = useMemo(
    () => ((meta?.statut_positionnement as Array<{ value: string; label: string }>) ?? []),
    [meta]
  );
  const orientationsFinales = useMemo(
    () => ((meta?.orientation_finale as Array<{ value: string; label: string }>) ?? []),
    [meta]
  );
  const typeAteliers = useMemo(
    () => ((meta?.type_atelier as Array<{ value: string; label: string }>) ?? []),
    [meta]
  );
  const centresAfpa = useMemo(
    () => ((meta?.centres_afpa_cible as Array<{ id: number; nom: string }>) ?? centres),
    [meta, centres]
  );

  const update = <K extends keyof StagiairePrepa>(key: K, value: StagiairePrepa[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!form.centre_id && hasSingleScopedCentre) {
      setForm((prev) => (prev.centre_id === centres[0].id ? prev : { ...prev, centre_id: centres[0].id }));
    }
  }, [centres, form.centre_id, hasSingleScopedCentre]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const isAbandon = form.statut_parcours === "abandon";
  const isOrientationAfpa =
    form.orientation_finale === "afpa" || form.orientation_finale === "autre_centre_afpa";
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
        {isAbandon ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Le motif d'abandon est obligatoire quand le statut est <strong>Abandon</strong>.
          </Alert>
        ) : null}
        {hasSingleScopedCentre ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Le centre est prérempli automatiquement depuis votre périmètre.
          </Alert>
        ) : null}
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Centre"
              value={form.centre_id ?? ""}
              disabled={hasSingleScopedCentre}
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
              fullWidth
              label="Date IC"
              value={initialValues?.date_ic ?? ""}
              InputProps={{ readOnly: true }}
              InputLabelProps={{ shrink: true }}
              helperText="Renseignée automatiquement si une information collective d'origine existe."
            />
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
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Positionnement"
              value={form.statut_positionnement ?? ""}
              onChange={(e) =>
                update("statut_positionnement", (e.target.value || null) as StagiairePrepa["statut_positionnement"])
              }
            >
              <MenuItem value="">—</MenuItem>
              {statutsPositionnement.map((statut) => (
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
              select
              fullWidth
              label="Prochain atelier prévu"
              value={form.prochain_atelier_prevu ?? ""}
              onChange={(e) =>
                update("prochain_atelier_prevu", (e.target.value || null) as StagiairePrepa["prochain_atelier_prevu"])
              }
              helperText={
                initialValues?.prochain_atelier_attendu_display
                  ? `Attendu actuellement : ${initialValues.prochain_atelier_attendu_display}`
                  : undefined
              }
            >
              <MenuItem value="">—</MenuItem>
              {typeAteliers.map((atelier) => (
                <MenuItem key={atelier.value} value={atelier.value}>
                  {atelier.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              required={isAbandon}
              label="Motif d'abandon"
              value={form.motif_abandon ?? ""}
              onChange={(e) => update("motif_abandon", e.target.value)}
              error={isAbandon && !(form.motif_abandon ?? "").trim()}
              helperText={
                isAbandon
                  ? (form.motif_abandon ?? "").trim()
                    ? "Motif saisi."
                    : "Explique pourquoi le stagiaire a abandonné."
                  : "À renseigner uniquement en cas d'abandon."
              }
            />
          </Grid>
          <Grid item xs={12}>
            <RichHtmlEditorField
              label="Commentaire de suivi"
              value={form.commentaire_suivi ?? ""}
              onChange={(value) => update("commentaire_suivi", value)}
              placeholder="Ajouter un commentaire de suivi enrichi…"
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" mb={2}>
          Orientation
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Orientation finale"
              value={form.orientation_finale ?? ""}
              onChange={(e) =>
                update("orientation_finale", (e.target.value || null) as StagiairePrepa["orientation_finale"])
              }
            >
              <MenuItem value="">—</MenuItem>
              {orientationsFinales.map((orientation) => (
                <MenuItem key={orientation.value} value={orientation.value}>
                  {orientation.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Centre AFPA cible"
              value={form.centre_afpa_cible_id ?? ""}
              onChange={(e) =>
                update("centre_afpa_cible_id", e.target.value === "" ? undefined : Number(e.target.value))
              }
              required={isOrientationAfpa}
            >
              <MenuItem value="">—</MenuItem>
              {centresAfpa.map((centre) => (
                <MenuItem key={centre.id} value={centre.id}>
                  {centre.nom}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Formation AFPA cible"
              value={form.formation_afpa_cible ?? ""}
              required={isOrientationAfpa}
              onChange={(e) => update("formation_afpa_cible", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Date d'orientation"
              InputLabelProps={{ shrink: true }}
              value={form.date_orientation ?? ""}
              onChange={(e) => update("date_orientation", e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(form.entree_formation_confirmee)}
                  onChange={(e) => update("entree_formation_confirmee", e.target.checked)}
                />
              }
              label="Entrée en formation AFPA confirmée"
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" mb={2}>
          Ateliers réalisés
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Cette section est en lecture seule. Les ateliers réalisés se remplissent automatiquement depuis
          les inscriptions et participations aux séances Prépa, afin d'éviter les erreurs de saisie.
        </Alert>
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: sectionPaperBg }}>
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
                          disabled
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
                      InputProps={{ readOnly: true }}
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
