import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
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
import type { StagiairePrepa, StagiairePrepaStatutForm } from "src/types/prepa";
import RichHtmlEditorField from "src/components/forms/RichHtmlEditorField";
import { useAuth } from "src/hooks/useAuth";
import { isAdminLikeRole } from "src/utils/roleGroups";
import {
  PREPA_ORIENTATION_FINALE_OPTIONS,
  PREPA_PROCHAIN_ETAPE_OPTIONS,
  PREPA_STATUT_FORM_OPTIONS,
  mergeChoiceOption,
} from "src/constants/prepaChoices";

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

function deriveStatutForm(initialValues?: Partial<StagiairePrepa>): StagiairePrepaStatutForm {
  const courant = initialValues?.statut_parcours_courant;
  if (courant === "en_attente_repositionnement") return "a_repositionner";
  if (courant === "en_attente_suite") return "en_attente_prochain_atelier";
  if (initialValues?.statut_parcours === "abandon") return "abandon";
  if (courant === "termine" || initialValues?.statut_parcours === "parcours_termine") return "parcours_termine";
  if (initialValues?.statut_parcours === "en_parcours") return "en_parcours";
  return "en_attente";
}

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
    prochain_atelier_prevu: initialValues?.prochain_atelier_prevu ?? null,
    orientation_finale: initialValues?.orientation_finale ?? null,
    centre_afpa_cible_texte:
      initialValues?.centre_afpa_cible_texte ??
      initialValues?.centre_afpa_cible_nom ??
      initialValues?.centre_afpa_cible?.nom ??
      "",
    formation_afpa_cible: initialValues?.formation_afpa_cible ?? "",
    commentaire_suivi: initialValues?.commentaire_suivi ?? "",
    date_bilan: initialValues?.date_bilan ?? "",
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
  const [statutForm, setStatutForm] = useState<StagiairePrepaStatutForm>(() => deriveStatutForm(initialValues));

  const centres = useMemo(() => {
    const fromMeta = (meta?.centres as Array<{ id: number; nom: string }>) ?? [];
    const cid = form.centre_id ?? initialValues?.centre_id ?? initialValues?.centre?.id;
    if (typeof cid !== "number") return fromMeta;
    if (fromMeta.some((c) => c.id === cid)) return fromMeta;
    const nom = initialValues?.centre_nom ?? initialValues?.centre?.nom ?? `Centre #${cid}`;
    return [...fromMeta, { id: cid, nom }];
  }, [
    meta,
    form.centre_id,
    initialValues?.centre_id,
    initialValues?.centre?.id,
    initialValues?.centre_nom,
    initialValues?.centre?.nom,
  ]);
  const hasSingleScopedCentre = !isAdminLike && centres.length === 1;
  const statuts = useMemo(
    () =>
      mergeChoiceOption(
        ((meta?.statut_formulaire as Array<{ value: string; label: string }>) ?? []).length
          ? (meta?.statut_formulaire as Array<{ value: string; label: string }>)
          : PREPA_STATUT_FORM_OPTIONS,
        statutForm
      ),
    [meta, statutForm]
  );
  const prepasOrigine = useMemo(() => {
    const raw = (meta?.prepas_origine as Array<{ id: number; label: string }>) ?? [];
    const pid = form.prepa_origine_id ?? initialValues?.prepa_origine_id;
    if (typeof pid !== "number") return raw;
    if (raw.some((p) => p.id === pid)) return raw;
    const fallback = initialValues?.prepa_origine_label ?? `IC #${pid}`;
    return [...raw, { id: pid, label: fallback }];
  }, [meta, form.prepa_origine_id, initialValues?.prepa_origine_id, initialValues?.prepa_origine_label]);
  const orientationsFinales = useMemo(
    () =>
      mergeChoiceOption(
        ((meta?.orientation_finale as Array<{ value: string; label: string }>) ?? []).length
          ? (meta?.orientation_finale as Array<{ value: string; label: string }>)
          : PREPA_ORIENTATION_FINALE_OPTIONS,
        form.orientation_finale ?? initialValues?.orientation_finale
      ),
    [meta, form.orientation_finale, initialValues?.orientation_finale]
  );
  const prochainesEtapes = useMemo(
    () =>
      mergeChoiceOption(
        ((meta?.prochain_etape as Array<{ value: string; label: string }>) ?? []).length
          ? (meta?.prochain_etape as Array<{ value: string; label: string }>)
          : PREPA_PROCHAIN_ETAPE_OPTIONS,
        form.prochain_atelier_prevu ?? initialValues?.prochain_atelier_prevu
      ),
    [meta, form.prochain_atelier_prevu, initialValues?.prochain_atelier_prevu]
  );
  const showBilanSection =
    initialValues?.statut_parcours_courant === "en_attente_bilan" ||
    initialValues?.statut_parcours_courant === "termine" ||
    Boolean(initialValues?.orientation_finale) ||
    Boolean(form.date_bilan) ||
    statutForm === "abandon" ||
    form.prochain_atelier_prevu === "bilan";

  const [showAteliersDetail, setShowAteliersDetail] = useState(false);

  const update = <K extends keyof StagiairePrepa>(key: K, value: StagiairePrepa[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateStatutForm = (value: StagiairePrepaStatutForm) => {
    setStatutForm(value);
    const nextStatut =
      value === "parcours_termine"
        ? "parcours_termine"
        : value === "abandon"
          ? "abandon"
          : value === "en_parcours" || value === "en_attente_prochain_atelier" || value === "a_repositionner"
            ? "en_parcours"
            : "en_attente";

    setForm((prev) => ({
      ...prev,
      statut_parcours: nextStatut,
    }));
  };

  useEffect(() => {
    if (!form.centre_id && hasSingleScopedCentre) {
      setForm((prev) => (prev.centre_id === centres[0].id ? prev : { ...prev, centre_id: centres[0].id }));
    }
  }, [centres, form.centre_id, hasSingleScopedCentre]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

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
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        "& .MuiFormHelperText-root": { mt: 0.25, lineHeight: 1.2 },
        "& .MuiFormControlLabel-root": { my: 0 },
      }}
    >
      {initialValues?.id ? (
        <Paper
          sx={{
            p: 1.5,
            mb: 1.5,
            borderLeft: 4,
            borderColor: "primary.main",
          }}
        >
          <Typography variant="overline" color="text.secondary">
            Synthèse parcours
          </Typography>
          <Stack spacing={0.75} mt={0.5}>
            <Typography variant="h6">{initialValues.statut_parcours_courant_display ?? "—"}</Typography>
            {initialValues.derniere_etape?.label ? (
              <Typography variant="body2" color="text.secondary">
                Dernière étape : {initialValues.derniere_etape.label}
                {initialValues.derniere_etape.date
                  ? ` (${new Date(initialValues.derniere_etape.date).toLocaleDateString("fr-FR")})`
                  : ""}
              </Typography>
            ) : null}
            {initialValues.derniere_presence_reelle?.type_prepa_display ? (
              <Typography variant="body2" color="text.secondary">
                Dernière présence : {initialValues.derniere_presence_reelle.type_prepa_display}
                {initialValues.derniere_presence_reelle.date
                  ? ` (${new Date(initialValues.derniere_presence_reelle.date).toLocaleDateString("fr-FR")})`
                  : ""}
              </Typography>
            ) : null}
            {initialValues.action_suivante_recommandee?.label ? (
              <Typography variant="body2" fontWeight={600}>
                Action suggérée : {initialValues.action_suivante_recommandee.label}
              </Typography>
            ) : null}
          </Stack>
        </Paper>
      ) : null}

      <Paper sx={{ p: 1.5, mb: 1.5 }}>
        <Typography variant="h6" mb={1.25}>
          Identité
        </Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={3}>
            <TextField size="small" fullWidth required label="Nom" value={form.nom ?? ""} onChange={(e) => update("nom", e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField size="small" fullWidth required label="Prénom" value={form.prenom ?? ""} onChange={(e) => update("prenom", e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField size="small" fullWidth label="Téléphone" value={form.telephone ?? ""} onChange={(e) => update("telephone", e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField size="small" fullWidth label="Email" type="email" value={form.email ?? ""} onChange={(e) => update("email", e.target.value)} />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 1.5, mb: 1.5 }}>
        <Typography variant="h6" mb={1.25}>
          Parcours
        </Typography>
        {hasSingleScopedCentre ? (
          <Alert severity="success" sx={{ mb: 1.5 }}>
            Le centre est prérempli automatiquement depuis votre périmètre.
          </Alert>
        ) : null}
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={3}>
            <TextField
              size="small"
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
              size="small"
              select
              fullWidth
              label="Information collective d'origine"
              value={form.prepa_origine_id ?? ""}
              onChange={(e) =>
                update("prepa_origine_id", e.target.value === "" ? undefined : Number(e.target.value))
              }
              helperText="Sélectionner l'information collective d'origine si elle existe."
            >
              <MenuItem value="">—</MenuItem>
              {prepasOrigine.map((prepa) => (
                <MenuItem key={prepa.id} value={prepa.id}>
                  {prepa.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              size="small"
              select
              fullWidth
              label="Statut"
              value={statutForm}
              onChange={(e) => updateStatutForm(e.target.value as StagiairePrepaStatutForm)}
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
              size="small"
              fullWidth
              label="Dernière étape"
              value={initialValues?.derniere_etape?.label ?? "En attente de AT1"}
              InputProps={{ readOnly: true }}
              helperText="Calculée automatiquement depuis l'historique du parcours."
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              size="small"
              select
              fullWidth
              label="Prochaine étape prévue"
              value={form.prochain_atelier_prevu ?? ""}
              onChange={(e) =>
                update("prochain_atelier_prevu", (e.target.value || null) as StagiairePrepa["prochain_atelier_prevu"])
              }
              helperText={
                initialValues?.prochain_atelier_prevu_display ||
                initialValues?.prochain_etape_display ||
                initialValues?.prochain_atelier_attendu_display
                  ? `Étape actuellement attendue : ${
                      initialValues?.prochain_atelier_prevu_display ??
                      initialValues?.prochain_etape_display ??
                      initialValues?.prochain_atelier_attendu_display
                    }`
                  : undefined
              }
            >
              <MenuItem value="">—</MenuItem>
              {prochainesEtapes.map((atelier) => (
                <MenuItem key={atelier.value} value={atelier.value}>
                  {atelier.label}
                </MenuItem>
              ))}
            </TextField>
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

      {showBilanSection ? (
        <Paper sx={{ p: 1.5, mb: 1.5 }}>
          <Typography variant="h6" mb={1.25}>
            Bilan & orientation
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}>
              <TextField
                size="small"
                fullWidth
                type="date"
                label="Date du bilan"
                InputLabelProps={{ shrink: true }}
                value={form.date_bilan ?? ""}
                onChange={(e) => update("date_bilan", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                size="small"
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
                size="small"
                fullWidth
                label="Centre AFPA cible"
                value={form.centre_afpa_cible_texte ?? ""}
                onChange={(e) => update("centre_afpa_cible_texte", e.target.value)}
                required={isOrientationAfpa}
                helperText="Saisie libre du centre cible."
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                size="small"
                fullWidth
                label="Formation AFPA cible"
                value={form.formation_afpa_cible ?? ""}
                required={isOrientationAfpa}
                onChange={(e) => update("formation_afpa_cible", e.target.value)}
              />
            </Grid>
          </Grid>
        </Paper>
      ) : (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          La clôture du parcours sera disponible lorsque le parcours sera en phase bilan,
          ou lorsque des données de clôture existent déjà sur la fiche.
        </Alert>
      )}

      <Paper sx={{ p: 1.5, mb: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.25}>
          <Typography variant="h6">Ateliers réalisés</Typography>
          <Button size="small" variant="text" onClick={() => setShowAteliersDetail((v) => !v)}>
            {showAteliersDetail ? "Masquer le détail technique" : "Voir le détail technique"}
          </Button>
        </Stack>
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Cette section est en lecture seule. Les ateliers réalisés se remplissent automatiquement depuis
          les inscriptions et participations aux séances Prépa, afin d'éviter les erreurs de saisie.
        </Alert>
        <Paper variant="outlined" sx={{ p: 1.25, mb: 1.5, bgcolor: sectionPaperBg }}>
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
        <Collapse in={showAteliersDetail} timeout="auto">
          <Grid container spacing={1.5}>
            {atelierFields.map((field) => {
              const checked = Boolean(form[field.flag]);
              return (
                <Grid item xs={12} md={6} key={field.flag}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "center" }}>
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
                        size="small"
                        type="date"
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
        </Collapse>
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
