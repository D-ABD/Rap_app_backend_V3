// ======================================================
// Formulaire partagé création / édition plan d’action formation
// ======================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { toast } from "react-toastify";
import FormActionsBar from "../../components/forms/FormActionsBar";
import FormSectionCard from "../../components/forms/FormSectionCard";
import AppDateField from "../../components/forms/fields/AppDateField";
import AppSelectField from "../../components/forms/fields/AppSelectField";
import AppTextField from "../../components/forms/fields/AppTextField";
import api from "../../api/axios";
import { readRapAppApiError } from "../../api/readRapAppApiError";
import { useFormations } from "../../hooks/useFormations";
import {
  createPlanActionFormation,
  downloadPlanActionFormationPdf,
  fetchCommentairesGroupes,
  patchPlanActionFormation,
} from "../../hooks/usePlansActionFormation";
import type {
  PlanActionFormationFormValues,
  PlanActionFormationWriteBody,
  PlanActionFormationDetail,
  PlanActionFormationSavedPayload,
} from "../../types/planActionFormation";
import type { Formation } from "../../types/formation";

const PERIODE_OPTIONS: { value: PlanActionFormationFormValues["periode_type"]; label: string }[] = [
  { value: "jour", label: "Journalier" },
  { value: "semaine", label: "Hebdomadaire" },
  { value: "mois", label: "Mensuel" },
];

const STATUT_OPTIONS: { value: PlanActionFormationFormValues["statut"]; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "valide", label: "Validé" },
  { value: "archive", label: "Archivé" },
];

function extractIdNomList(payload: unknown): { id: number; nom: string }[] {
  if (!payload || typeof payload !== "object") return [];
  const top = payload as { data?: unknown; results?: unknown };
  const raw = top.data ?? top;
  if (Array.isArray(raw)) {
    return raw
      .map((o) => {
        if (o && typeof o === "object" && "id" in o) {
          const id = Number((o as { id: number }).id);
          if (!Number.isFinite(id)) return null;
          const r = o as { nom?: string; label?: string; name?: string };
          const nom = r.nom ?? r.label ?? r.name;
          if (typeof nom === "string" && nom) {
            return { id, nom };
          }
          return { id, nom: `Centre #${id}` };
        }
        return null;
      })
      .filter((x): x is { id: number; nom: string } => x !== null);
  }
  if (raw && typeof raw === "object" && "results" in raw && Array.isArray((raw as { results: unknown[] }).results)) {
    return extractIdNomList({ data: (raw as { results: unknown[] }).results });
  }
  return [];
}

function serializeForDirty(v: PlanActionFormationFormValues): string {
  const { nbCommentairesReference: _ref, ...rest } = v;
  const ov = v.exportCommentaireOverrides;
  const ovKeys = Object.keys(ov)
    .map((k) => Number(k))
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);
  const exportCommentaireOverrides = Object.fromEntries(ovKeys.map((k) => [k, ov[k] ?? ""]));
  return JSON.stringify({
    ...rest,
    exportCommentaireOverrides,
    centreIds: [...v.centreIds].sort((a, b) => a - b),
    formationIds: [...v.formationIds].sort((a, b) => a - b),
    selectedCommentaireIds: [...v.selectedCommentaireIds].sort((a, b) => a - b),
  });
}

function defaultEmptyForm(): PlanActionFormationFormValues {
  return {
    titre: "",
    date_debut: "",
    date_fin: "",
    periode_type: "semaine",
    centreIds: [],
    formationIds: [],
    statut: "brouillon",
    synthese: "",
    resume_points_cles: "",
    plan_action: "",
    selectedCommentaireIds: [],
    inclureArchivesCommentaires: false,
    exportCommentaireOverrides: {},
    exportPdfRegroupeCommentaires: false,
  };
}

export function formValuesFromDetail(d: PlanActionFormationDetail): PlanActionFormationFormValues {
  let centreIds: number[] = [];
  let formationIds: number[] = [];
  if (d.metadata && typeof d.metadata === "object" && !Array.isArray(d.metadata)) {
    const m = d.metadata as { centre_ids?: unknown; formation_ids?: unknown };
    if (Array.isArray(m.centre_ids)) {
      centreIds = m.centre_ids.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    }
    if (Array.isArray(m.formation_ids)) {
      formationIds = m.formation_ids.map((x) => Number(x)).filter((n) => n > 0);
    }
  }
  if (centreIds.length === 0 && d.centre != null) {
    centreIds = [d.centre];
  }
  if (formationIds.length === 0 && d.formation != null) {
    formationIds = [d.formation];
  }
  const commentaireIdsRaw = d.commentaire_ids;
  const selectedCommentaireIds = Array.isArray(commentaireIdsRaw)
    ? Array.from(
        new Set(
          commentaireIdsRaw
            .map((x) => Number(x))
            .filter((n) => Number.isInteger(n) && n > 0)
        )
      )
    : [];
  const selectedSet = new Set(selectedCommentaireIds);
  let exportCommentaireOverrides: Record<number, string> = {};
  let exportPdfRegroupeCommentaires = false;
  if (d.metadata && typeof d.metadata === "object" && !Array.isArray(d.metadata)) {
    const metaRoot = d.metadata as {
      export_pdf_regroupe_commentaires?: unknown;
      export_commentaire_overrides?: unknown;
    };
    exportPdfRegroupeCommentaires = metaRoot.export_pdf_regroupe_commentaires === true;
    const rawOv = metaRoot.export_commentaire_overrides;
    if (rawOv && typeof rawOv === "object" && !Array.isArray(rawOv)) {
      for (const [k, v] of Object.entries(rawOv)) {
        const idn = Number(k);
        if (Number.isInteger(idn) && idn > 0 && selectedSet.has(idn) && typeof v === "string") {
          exportCommentaireOverrides[idn] = v;
        }
      }
    }
  }
  return {
    titre: d.titre ?? "",
    date_debut: d.date_debut ?? "",
    date_fin: d.date_fin ?? "",
    periode_type: d.periode_type,
    centreIds,
    formationIds,
    statut: d.statut,
    synthese: d.synthese ?? "",
    resume_points_cles: d.resume_points_cles ?? "",
    plan_action: d.plan_action ?? "",
    selectedCommentaireIds,
    inclureArchivesCommentaires: false,
    nbCommentairesReference: d.nb_commentaires,
    exportCommentaireOverrides,
    exportPdfRegroupeCommentaires,
  };
}

function toWriteBody(
  f: PlanActionFormationFormValues,
  statut: "brouillon" | "valide" | "archive"
): PlanActionFormationWriteBody {
  const cids = f.centreIds;
  const fids = f.formationIds;
  const metadata: Record<string, unknown> = {};
  if (cids.length > 0) {
    metadata.centre_ids = cids;
  }
  if (fids.length > 0) {
    metadata.formation_ids = fids;
  }
  const pruned: Record<string, string> = {};
  for (const id of f.selectedCommentaireIds) {
    const t = f.exportCommentaireOverrides[id];
    if (typeof t === "string" && t.trim() !== "") {
      pruned[String(id)] = t;
    }
  }
  if (Object.keys(pruned).length > 0) {
    metadata.export_commentaire_overrides = pruned;
  }
  metadata.export_pdf_regroupe_commentaires = f.exportPdfRegroupeCommentaires;
  return {
    titre: f.titre.trim(),
    date_debut: f.date_debut,
    date_fin: f.date_fin,
    periode_type: f.periode_type,
    centre: cids.length > 0 ? cids[0] : null,
    formation: fids.length > 0 ? fids[0] : null,
    synthese: f.synthese,
    resume_points_cles: f.resume_points_cles,
    plan_action: f.plan_action,
    statut,
    commentaire_ids: f.selectedCommentaireIds,
    metadata: Object.keys(metadata).length > 0 ? metadata : {},
  };
}

function validate(f: PlanActionFormationFormValues): string | null {
  if (!f.titre.trim()) return "Le titre est obligatoire.";
  if (!f.date_debut) return "La date de début est obligatoire.";
  if (!f.date_fin) return "La date de fin est obligatoire.";
  const a = new Date(f.date_debut);
  const b = new Date(f.date_fin);
  if (a > b) return "La date de fin doit être postérieure ou égale à la date de début.";
  return null;
}

function readAxiosMessage(err: unknown): string {
  return readRapAppApiError(err, "Impossible d’enregistrer. Vérifiez le formulaire ou les droits, puis réessayez.");
}

type Props = {
  mode: "create" | "edit";
  planId?: number;
  initialForm: PlanActionFormationFormValues;
  onSaved: (payload: PlanActionFormationSavedPayload) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
};

export function getDefaultPlanActionFormationFormValues(): PlanActionFormationFormValues {
  return defaultEmptyForm();
}

export default function PlanActionFormationForm({
  mode,
  planId,
  initialForm,
  onSaved,
  onCancel,
  onDirtyChange,
}: Props) {
  const [form, setForm] = useState(() => initialForm);
  const baselineRef = useRef(serializeForDirty(initialForm));
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [centreOptions, setCentreOptions] = useState<{ value: string; label: string }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [groupesLoading, setGroupesLoading] = useState(false);
  const [groupesError, setGroupesError] = useState<string | null>(null);
  const [groupesEmpty, setGroupesEmpty] = useState(false);
  const [jours, setJours] = useState<
    import("../../types/planActionFormation").PlanActionCommentaireJourGroupe[]
  >([]);
  const [limiteAtteinte, setLimiteAtteinte] = useState(false);

  const formationFilters = useMemo(() => {
    const n = form.centreIds.length;
    if (n === 0) {
      return { page_size: 2000, ordering: "nom" as const };
    }
    if (n === 1) {
      return { centre: form.centreIds[0], page_size: 500, ordering: "nom" as const };
    }
    return { page_size: 2000, ordering: "nom" as const };
  }, [form.centreIds]);

  const { data: formationsPage, loading: loadingFormations } = useFormations(formationFilters);

  const contenuById = useMemo(() => {
    const m: Record<number, string> = {};
    for (const jour of jours) {
      for (const c of jour.commentaires) {
        m[c.id] = c.contenu;
      }
    }
    return m;
  }, [jours]);

  const selectedIdsSorted = useMemo(
    () => [...form.selectedCommentaireIds].sort((a, b) => a - b),
    [form.selectedCommentaireIds]
  );

  const nbExportOverrides = useMemo(
    () =>
      selectedIdsSorted.filter((id) => (form.exportCommentaireOverrides[id] ?? "").trim() !== "").length,
    [selectedIdsSorted, form.exportCommentaireOverrides]
  );

  const formationOptions = useMemo(() => {
    const rows = (formationsPage?.results ?? []) as Formation[];
    const cids = new Set(form.centreIds);
    const filtered =
      form.centreIds.length <= 1
        ? rows
        : rows.filter((r) => {
            const cid = r.centre?.id;
            return cid != null && cids.has(cid);
          });
    return filtered.map((r) => ({
      value: String(r.id),
      label: r.nom || `Formation #${r.id}`,
      centreId: r.centre?.id,
    }));
  }, [formationsPage?.results, form.centreIds]);

  useEffect(() => {
    onDirtyChange(serializeForDirty(form) !== baselineRef.current);
  }, [form, onDirtyChange]);

  useEffect(() => {
    let cancel = false;
    setOptionsLoading(true);
    void (async () => {
      try {
        const cRes = await api.get("/centres/liste-simple/", { params: { page_size: 500 } });
        if (cancel) return;
        const centres = extractIdNomList(cRes.data);
        setCentreOptions(centres.map((c) => ({ value: String(c.id), label: c.nom })));
      } catch {
        if (!cancel) {
          setCentreOptions([]);
          toast.error("Impossible de charger la liste des centres.");
        }
      } finally {
        if (!cancel) setOptionsLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const update = useCallback(
    <K extends keyof PlanActionFormationFormValues>(key: K, value: PlanActionFormationFormValues[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const setExportOverride = useCallback((id: number, text: string) => {
    setForm((prev) => {
      const next = { ...prev.exportCommentaireOverrides };
      if (text.trim() === "") {
        delete next[id];
      } else {
        next[id] = text;
      }
      return { ...prev, exportCommentaireOverrides: next };
    });
  }, []);

  const toggleComment = useCallback((id: number) => {
    const idn = Number(id);
    if (!Number.isFinite(idn) || idn <= 0) return;
    setForm((prev) => {
      const has = prev.selectedCommentaireIds.includes(idn);
      const next = has
        ? prev.selectedCommentaireIds.filter((x) => x !== idn)
        : [...prev.selectedCommentaireIds, idn];
      return { ...prev, selectedCommentaireIds: next };
    });
  }, []);

  const selectAllInDay = useCallback((ids: number[]) => {
    const cleaned = ids.map((i) => Number(i)).filter((i) => Number.isFinite(i) && i > 0);
    setForm((prev) => {
      const set = new Set(prev.selectedCommentaireIds);
      const allIn = cleaned.length > 0 && cleaned.every((i) => set.has(i));
      if (allIn) {
        cleaned.forEach((i) => set.delete(i));
      } else {
        cleaned.forEach((i) => set.add(i));
      }
      return { ...prev, selectedCommentaireIds: [...set] };
    });
  }, []);

  useEffect(() => {
    if (formationOptions.length === 0) return;
    const allowed = new Set(formationOptions.map((o) => Number(o.value)));
    setForm((prev) => {
      const next = prev.formationIds.filter((id) => allowed.has(id));
      if (next.length === prev.formationIds.length) return prev;
      return { ...prev, formationIds: next };
    });
  }, [formationOptions]);

  const loadCommentaires = useCallback(async () => {
    setGroupesError(null);
    if (!form.date_debut && !form.date_fin) {
      setGroupesError("Indiquez au moins une date de début et/ou de fin (ou les deux) pour charger les commentaires.");
      return;
    }
    setGroupesLoading(true);
    setJours([]);
    setGroupesEmpty(false);
    setLimiteAtteinte(false);
    try {
      const data = await fetchCommentairesGroupes({
        date_debut: form.date_debut || undefined,
        date_fin: form.date_fin || undefined,
        centres: form.centreIds.length > 0 ? form.centreIds : undefined,
        formations: form.formationIds.length > 0 ? form.formationIds : undefined,
        inclure_archives: form.inclureArchivesCommentaires,
        limite: 2000,
      });
      setJours(data.jours);
      setLimiteAtteinte(data.limite_atteinte);
      setGroupesEmpty(data.jours.length === 0);
    } catch (e) {
      setGroupesError(readAxiosMessage(e));
    } finally {
      setGroupesLoading(false);
    }
  }, [form.centreIds, form.date_debut, form.date_fin, form.formationIds, form.inclureArchivesCommentaires]);

  const markSaved = useCallback(
    (f: PlanActionFormationFormValues) => {
      baselineRef.current = serializeForDirty(f);
      onDirtyChange(false);
    },
    [onDirtyChange]
  );

  const submit = useCallback(
    async (statut: "brouillon" | "valide" | "archive") => {
      setFormError(null);
      const err = validate(form);
      if (err) {
        setFormError(err);
        return;
      }
      setSaving(true);
      try {
        const body = toWriteBody(form, statut);
        if (mode === "create") {
          const created = await createPlanActionFormation(body);
          const next = formValuesFromDetail(created);
          setForm(next);
          markSaved(next);
          toast.success("Plan d'action enregistré.");
          onSaved({ id: created.id, statut: created.statut });
        } else if (planId != null) {
          const updated = await patchPlanActionFormation(planId, body);
          const next = formValuesFromDetail(updated);
          setForm(next);
          markSaved(next);
          toast.success("Plan d'action mis à jour.");
          onSaved({ id: planId, statut: updated.statut });
        }
      } catch (e) {
        setFormError(readAxiosMessage(e));
        toast.error(readAxiosMessage(e));
      } finally {
        setSaving(false);
      }
    },
    [form, mode, onSaved, markSaved, planId]
  );

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const handleDownloadPdf = useCallback(async () => {
    if (planId == null) return;
    setPdfLoading(true);
    try {
      await downloadPlanActionFormationPdf(planId);
      toast.success("Le PDF a été généré.");
    } catch (e) {
      toast.error(readAxiosMessage(e));
    } finally {
      setPdfLoading(false);
    }
  }, [planId]);

  if (optionsLoading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <Stack spacing={2} alignItems="center">
          <LinearProgress sx={{ width: 240 }} />
          <Typography variant="body2" color="text.secondary">
            Chargement des listes (centres)…
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {formError && (
        <Alert severity="error" onClose={() => setFormError(null)} role="alert">
          {formError}
        </Alert>
      )}

      <FormSectionCard
        title="Informations générales"
        subtitle="Période d’analyse, type d’échelle, périmètre centre / formation, statut."
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <AppTextField
              label="Titre"
              value={form.titre}
              onChange={(e) => update("titre", e.target.value)}
              required
              helperText="Intitulé du plan d’action."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <AppDateField
              label="Date de début"
              value={form.date_debut}
              onChange={(e) => update("date_debut", e.target.value)}
              helperText="Début de période (inclus)."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <AppDateField
              label="Date de fin"
              value={form.date_fin}
              onChange={(e) => update("date_fin", e.target.value)}
              helperText="Fin de période (inclus)."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <AppSelectField
              label="Type de période"
              labelId="paf-periode-type"
              value={form.periode_type}
              onChange={(e) =>
                update("periode_type", e.target.value as PlanActionFormationFormValues["periode_type"])
              }
              helperText="Échelle métier (affichage / filtres)."
            >
              {PERIODE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </AppSelectField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <AppSelectField
              label="Statut"
              labelId="paf-statut"
              value={form.statut}
              onChange={(e) => update("statut", e.target.value as PlanActionFormationFormValues["statut"])}
            >
              {STATUT_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </AppSelectField>
          </Grid>
          <Grid item xs={12}>
            <FormControl
              component="fieldset"
              variant="standard"
              disabled={centreOptions.length === 0}
              fullWidth
            >
              <Typography component="legend" variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Centres (périmètre)
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: "wrap" }}>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      centreIds: centreOptions.map((c) => Number(c.value)).filter((n) => n > 0),
                    }))
                  }
                >
                  Tout sélectionner
                </Link>
                <Typography variant="body2" color="text.secondary">
                  |
                </Typography>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => setForm((prev) => ({ ...prev, centreIds: [] }))}
                >
                  Tout effacer
                </Link>
                {form.centreIds.length > 0 && (
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={`${form.centreIds.length} centre(s) dans le filtre`}
                  />
                )}
              </Stack>
              <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 240, overflow: "auto" }}>
                <FormGroup>
                  {centreOptions.map((c) => {
                    const idn = Number(c.value);
                    return (
                      <FormControlLabel
                        key={c.value}
                        control={
                          <Checkbox
                            size="small"
                            checked={form.centreIds.includes(idn)}
                            onChange={() => {
                              setForm((prev) => {
                                const s = new Set(prev.centreIds);
                                if (s.has(idn)) s.delete(idn);
                                else s.add(idn);
                                return { ...prev, centreIds: [...s].sort((a, b) => a - b) };
                              });
                            }}
                          />
                        }
                        label={c.label}
                      />
                    );
                  })}
                </FormGroup>
              </Paper>
              <FormHelperText sx={{ mt: 1, mx: 0 }}>
                Cochez un ou plusieurs lieux de votre mission. Aucun : tous les commentaires de votre périmètre
                (dates obligatoires pour charger). Les listes de formations se restreignent aux centres cochés.
              </FormHelperText>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel id="paf-formation-ids-label">Formations (filtre optionnel sur le chargement)</InputLabel>
              <Select
                labelId="paf-formation-ids-label"
                label="Formations (filtre optionnel sur le chargement)"
                multiple
                value={form.formationIds}
                onChange={(e) => {
                  const v = e.target.value;
                  const arr = typeof v === "string" ? v.split(",").map(Number) : (v as number[]);
                  setForm((prev) => ({ ...prev, formationIds: arr }));
                }}
                disabled={loadingFormations || formationOptions.length === 0}
                input={<OutlinedInput label="Formations (filtre optionnel sur le chargement)" />}
                renderValue={(selected) => {
                  const sel = selected as number[];
                  if (sel.length === 0) {
                    return (
                      <Typography variant="body2">Toutes les formations (selon centres cochés)</Typography>
                    );
                  }
                  return (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {sel.map((id) => (
                        <Chip
                          key={id}
                          size="small"
                          label={formationOptions.find((c) => c.value === String(id))?.label ?? `F.#${id}`}
                        />
                      ))}
                    </Box>
                  );
                }}
              >
                {formationOptions.map((fOpt) => (
                  <MenuItem key={fOpt.value} value={Number(fOpt.value)}>
                    {fOpt.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Optionnel. Plusieurs choix : seuls les commentaires liés à ces formations (et aux centres) sont chargés
                pour la sélection. Laissez vide pour inclure toutes les formations des centres.
              </FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
      </FormSectionCard>

      <FormSectionCard
        title="Commentaires sources"
        subtitle="Chargez les commentaires de formation filtrés sur la période et le périmètre, puis sélectionnez-les."
      >
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.inclureArchivesCommentaires}
                  onChange={(_, c) => update("inclureArchivesCommentaires", c)}
                />
              }
              label="Inclure les commentaires archivés"
            />
            <Button variant="outlined" onClick={() => void loadCommentaires()} disabled={groupesLoading}>
              {groupesLoading ? "Chargement…" : "Charger les commentaires groupés"}
            </Button>
            <Chip
              size="small"
              label={`Sélection : ${form.selectedCommentaireIds.length} commentaire(s)${
                form.nbCommentairesReference != null && form.nbCommentairesReference > 0
                  ? ` · enregistré(s) sur le plan : ${form.nbCommentairesReference}`
                  : ""
              }`}
              color="primary"
              variant="outlined"
            />
          </Stack>
          {groupesError && <Alert severity="error">{groupesError}</Alert>}
          {groupesEmpty && !groupesError && <Alert severity="info">Aucun commentaire sur cette période avec ces filtres.</Alert>}
          {limiteAtteinte && (
            <Alert severity="warning">
              Le volume de commentaires a atteint la limite d’extraction. Affinez la période ou le périmètre.
            </Alert>
          )}

          {jours.length > 0 && (
            <Box>
              {jours.map((jour) => {
                const ids = jour.commentaires.map((c) => c.id);
                return (
                  <Accordion key={jour.date} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" spacing={1} alignItems="center" width="100%" justifyContent="space-between">
                        <Typography variant="subtitle2" fontWeight={600}>
                          {jour.date} — {jour.nombre} commentaire(s)
                        </Typography>
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAllInDay(ids);
                          }}
                        >
                          Tout sélectionner / désélectionner
                        </Button>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1.5}>
                        {jour.commentaires.map((c) => (
                          <Box
                            key={c.id}
                            sx={{
                              border: 1,
                              borderColor: "divider",
                              borderRadius: 1,
                              p: 1.5,
                            }}
                          >
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={form.selectedCommentaireIds.includes(c.id)}
                                  onChange={() => toggleComment(c.id)}
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {c.formation_nom ?? "—"} {c.centre_nom ? `· ${c.centre_nom}` : ""} · {c.auteur ?? "Auteur inconnu"}{" "}
                                    · {new Date(c.created_at).toLocaleString("fr-FR")}
                                  </Typography>
                                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                    {c.contenu}
                                  </Typography>
                                </Box>
                              }
                            />
                          </Box>
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )}
        </Stack>
      </FormSectionCard>

      <FormSectionCard
        title="Export PDF des commentaires"
        subtitle="Option de mise en page, puis textes de remplacement optionnels pour l’export uniquement (les commentaires en base ne changent pas). Enregistrez le plan avant de télécharger le PDF."
      >
        <Stack spacing={2}>
          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.exportPdfRegroupeCommentaires}
                  onChange={(_, c) => update("exportPdfRegroupeCommentaires", c)}
                />
              }
              label="Regrouper tous les commentaires dans un seul bloc (sans formation, auteur ni date)"
            />
            <FormHelperText sx={{ ml: 4, mt: 0 }}>
              Par défaut, le PDF liste chaque commentaire avec formation, lieu et date. Avec cette option, les textes
              sont joints dans une seule zone, séparés par des sauts de ligne.
            </FormHelperText>
          </Box>
          {selectedIdsSorted.length === 0 ? (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Sélectionnez d’abord des commentaires ci-dessus pour pouvoir définir des textes de remplacement.
            </Alert>
          ) : (
            <Accordion
              defaultExpanded={false}
              disableGutters
              elevation={0}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  width="100%"
                  justifyContent="space-between"
                  pr={1}
                >
                  <Typography fontWeight={600}>Textes de remplacement pour le PDF</Typography>
                  {nbExportOverrides > 0 ? (
                    <Chip size="small" color="primary" variant="outlined" label={`${nbExportOverrides} personnalisé(s)`} />
                  ) : (
                    <Chip size="small" variant="outlined" label="Optionnel" />
                  )}
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  {selectedIdsSorted.map((id) => {
                    const aperçu = contenuById[id];
                    return (
                      <Box key={id}>
                        <AppTextField
                          label={`Commentaire n°${id} (texte PDF)`}
                          value={form.exportCommentaireOverrides[id] ?? ""}
                          onChange={(e) => setExportOverride(id, e.target.value)}
                          multiline
                          minRows={3}
                          placeholder={
                            aperçu != null
                              ? "Laissez vide pour reprendre le texte d’origine telle qu’en base."
                              : "Chargez les commentaires groupés pour voir l’aperçu du texte d’origine, ou saisissez ici le texte à afficher dans le PDF."
                          }
                          helperText={
                            aperçu != null && (form.exportCommentaireOverrides[id] ?? "") === ""
                              ? `Texte d’origine (rappel) : ${aperçu.length > 200 ? `${aperçu.slice(0, 200)}…` : aperçu}`
                              : (form.exportCommentaireOverrides[id] ?? "") !== ""
                                ? "Utilisé dans le PDF (pastille « texte adapté » si affichage détaillé, ou mention en tête si bloc regroupé)."
                                : undefined
                          }
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </AccordionDetails>
            </Accordion>
          )}
        </Stack>
      </FormSectionCard>

      <FormSectionCard title="Contenus" subtitle="Synthèse, points clés et plan d’action.">
        <Stack spacing={2}>
          <AppTextField
            label="Synthèse"
            value={form.synthese}
            onChange={(e) => update("synthese", e.target.value)}
            multiline
            minRows={4}
          />
          <AppTextField
            label="Points clés (résumé)"
            value={form.resume_points_cles}
            onChange={(e) => update("resume_points_cles", e.target.value)}
            multiline
            minRows={3}
          />
          <AppTextField
            label="Plan d’action"
            value={form.plan_action}
            onChange={(e) => update("plan_action", e.target.value)}
            multiline
            minRows={4}
          />
        </Stack>
      </FormSectionCard>

      <FormActionsBar>
        <Button variant="outlined" onClick={handleCancel} disabled={saving}>
          Annuler
        </Button>
        {mode === "edit" && planId != null && (
          <Button
            variant="outlined"
            color="info"
            startIcon={<PictureAsPdfIcon />}
            onClick={() => void handleDownloadPdf()}
            disabled={saving || pdfLoading}
          >
            {pdfLoading ? "PDF…" : "Télécharger le PDF"}
          </Button>
        )}
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => void submit("brouillon")}
          disabled={saving}
        >
          {saving ? "Enregistrement…" : "Enregistrer en brouillon"}
        </Button>
        <Button variant="contained" onClick={() => void submit("valide")} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer (validé)"}
        </Button>
        {form.statut === "archive" && (
          <Button variant="outlined" color="warning" onClick={() => void submit("archive")} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer l’archivage"}
          </Button>
        )}
      </FormActionsBar>
    </Stack>
  );
}
