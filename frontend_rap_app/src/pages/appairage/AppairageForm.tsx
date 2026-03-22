// src/pages/appairages/AppairageForm.tsx
import {
  AppairageCreatePayload,
  AppairageFormData,
  AppairageMeta,
  AppairageStatut,
} from "../../types/appairage";
import { useEffect, useMemo, useState, useRef, useCallback, MutableRefObject } from "react";
import { Box, Button, Stack, TextField, MenuItem, FormHelperText } from "@mui/material";

import CandidatsSelectModal from "../../components/modals/CandidatsSelectModal";
import PartenaireSelectModal from "../../components/modals/PartenairesSelectModal";

type Mode = "create" | "edit";

interface Props {
  initialValues: Partial<AppairageFormData> | null | undefined;
  onSubmit: (data: AppairageCreatePayload) => Promise<void>;
  loading: boolean;
  meta: AppairageMeta | null;
  fixedFormationId?: number;

  useOwnForm?: boolean;
  submitRef?: MutableRefObject<(() => void) | null>;
  formId?: string;

  mode?: Mode;
  dateInputType?: "date" | "datetime-local";
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
function fromDatetimeLocal(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type CandidatePick = {
  id: number;
  nom_complet: string;
  email?: string | null;
  formation?: any;
  formation_id?: number | null;
  formation_nom?: string | null;
  formation_obj?: any;
};

type PartnerPick = {
  id: number;
  nom?: string | null;
  raison_sociale?: string | null;
  name?: string | null;
};

function extractFormationFromCandidate(c: CandidatePick): {
  id: number | null;
  nom: string | null;
} {
  let id: number | null = typeof c.formation_id === "number" ? c.formation_id : null;
  if (typeof c.formation === "number") id = c.formation;
  if (c.formation && typeof c.formation === "object") {
    if (typeof c.formation.id === "number") id = c.formation.id ?? id;
  }
  if (c.formation_obj && typeof c.formation_obj === "object") {
    if (typeof c.formation_obj.id === "number") id = c.formation_obj.id ?? id;
  }

  let nom: string | null = c.formation_nom ?? null;
  if (!nom && c.formation && typeof c.formation === "object") {
    if (typeof c.formation.nom === "string") nom = c.formation.nom ?? nom;
  }
  if (!nom && c.formation_obj && typeof c.formation_obj === "object") {
    if (typeof c.formation_obj.nom === "string") nom = c.formation_obj.nom ?? nom;
  }
  return { id: id ?? null, nom: nom ?? null };
}

export default function AppairageForm({
  initialValues,
  onSubmit,
  loading,
  meta,
  fixedFormationId,
  useOwnForm = true,
  submitRef,
  formId = "appairage-form",
  mode = "create",
  dateInputType,
}: Props) {
  const safeInitial: AppairageCreatePayload = useMemo(
    () => ({
      candidat: initialValues?.candidat ?? 0,
      partenaire: initialValues?.partenaire ?? 0,
      formation:
        typeof fixedFormationId === "number"
          ? fixedFormationId
          : (initialValues?.formation ?? null),
      statut: initialValues?.statut ?? "transmis",
      commentaire: initialValues?.commentaire ?? null,
      retour_partenaire: null,
      date_retour: null,
    }),
    [initialValues, fixedFormationId]
  );

  const [form, setForm] = useState<AppairageCreatePayload>(safeInitial);
  useEffect(() => setForm(safeInitial), [safeInitial]);

  const [candidatNom, setCandidatNom] = useState<string | null>(null);
  const [partenaireNom, setPartenaireNom] = useState<string | null>(null);
  const [formationLabel, setFormationLabel] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<"candidat" | "partenaire", string>>>({});
  const [showCandidatModal, setShowCandidatModal] = useState(false);
  const [showPartenaireModal, setShowPartenaireModal] = useState(false);

  useEffect(() => {
    if (!meta) return;
    const c = meta.candidat_choices.find((x) => x.value === form.candidat);
    if (c?.label) setCandidatNom(c.label);
    const p = meta.partenaire_choices.find((x) => x.value === form.partenaire);
    if (p?.label) setPartenaireNom(p.label);
    const wantedId =
      (typeof fixedFormationId === "number" ? fixedFormationId : form.formation) ?? null;
    if (wantedId != null) {
      const f = meta.formation_choices.find((x) => x.value === wantedId);
      if (f?.label) setFormationLabel(f.label);
    }
  }, [meta, form.candidat, form.partenaire, form.formation, fixedFormationId]);

  const displayFormation = useMemo(() => {
    if (formationLabel && formationLabel.trim() !== "") return formationLabel;
    const wantedId =
      (typeof fixedFormationId === "number" ? fixedFormationId : form.formation) ?? null;
    if (wantedId && meta?.formation_choices) {
      const found = meta.formation_choices.find((x) => x.value === wantedId);
      if (found?.label) return found.label;
      return `#${wantedId}`;
    }
    return "Formation inconnue";
  }, [formationLabel, fixedFormationId, form.formation, meta]);

  const resolvedDateType: "date" | "datetime-local" =
    dateInputType ?? (mode === "create" ? "date" : "datetime-local");

  const dateRetourLocal = useMemo(
    () =>
      resolvedDateType === "datetime-local"
        ? toDatetimeLocal(form.date_retour ?? null)
        : form.date_retour
          ? new Date(form.date_retour).toISOString().slice(0, 10)
          : "",
    [form.date_retour, resolvedDateType]
  );

  const submittingRef = useRef(false);
  const formRef = useRef(form);
  const loadingRef = useRef(loading);
  const fixedFormationIdRef = useRef(fixedFormationId);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    formRef.current = form;
  }, [form]);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  useEffect(() => {
    fixedFormationIdRef.current = fixedFormationId;
  }, [fixedFormationId]);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const doSubmit = useCallback(async () => {
    if (loadingRef.current || submittingRef.current) return;
    const current = formRef.current;
    const nextErrors: Partial<Record<"candidat" | "partenaire", string>> = {};
    if (!current.candidat || current.candidat <= 0)
      nextErrors.candidat = "Sélectionnez un candidat.";
    if (!current.partenaire || current.partenaire <= 0)
      nextErrors.partenaire = "Sélectionnez un partenaire.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    submittingRef.current = true;
    try {
      const payload: AppairageCreatePayload = {
        ...current,
        ...(typeof fixedFormationIdRef.current === "number"
          ? { formation: fixedFormationIdRef.current }
          : {}),
      };
      if (!payload.date_retour) payload.date_retour = null;
      await onSubmitRef.current(payload);
    } finally {
      submittingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (submitRef) submitRef.current = doSubmit;
  }, [submitRef, doSubmit]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "enter") {
        ev.preventDefault();
        doSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doSubmit]);

  const handleChange = <K extends keyof AppairageCreatePayload>(
    key: K,
    value: AppairageCreatePayload[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const FormContent = (
    <Stack spacing={2}>
      {/* Candidat */}
      <Box>
        <TextField
          label="Candidat"
          value={candidatNom ?? "Candidat inconnu"}
          fullWidth
          InputProps={{ readOnly: true }}
          error={!!errors.candidat}
          helperText={errors.candidat}
        />
        {mode === "create" && (
          <Button
            variant="outlined"
            onClick={() => setShowCandidatModal(true)}
            disabled={loading}
            sx={{ mt: 1 }}
          >
            🔍 {candidatNom ? "Changer de candidat" : "Sélectionner un candidat"}
          </Button>
        )}
        <FormHelperText>Astuce : Ctrl/Cmd + Entrée pour valider</FormHelperText>
      </Box>

      {/* Partenaire */}
      <Box>
        <TextField
          label="Partenaire"
          value={partenaireNom ?? "Partenaire inconnu"}
          fullWidth
          InputProps={{ readOnly: true }}
          error={!!errors.partenaire}
          helperText={errors.partenaire}
        />
        <Button
          variant="outlined"
          onClick={() => setShowPartenaireModal(true)}
          disabled={loading}
          sx={{ mt: 1 }}
        >
          🔍 {partenaireNom ? "Changer de partenaire" : "Sélectionner un partenaire"}
        </Button>
      </Box>

      {/* Formation */}
      <Box>
        <TextField
          label="Formation"
          value={displayFormation}
          fullWidth
          InputProps={{ readOnly: true }}
        />
        <FormHelperText>
          {typeof fixedFormationId === "number"
            ? `Formation fixée (#${fixedFormationId}).`
            : "Si le candidat a une formation, elle sera reprise automatiquement."}
        </FormHelperText>
      </Box>

      {/* Statut */}
      <Box>
        <TextField
          select
          label="Statut"
          value={form.statut}
          onChange={(e) => handleChange("statut", e.target.value as AppairageStatut)}
          fullWidth
          disabled={loading || !meta}
        >
          {!meta && <MenuItem value="">Chargement…</MenuItem>}
          {(meta?.statut_choices ?? []).map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Retour partenaire */}
      <TextField
        label="Retour partenaire"
        value={form.retour_partenaire ?? ""}
        onChange={(e) => handleChange("retour_partenaire", e.target.value)}
        fullWidth
        multiline
        minRows={3}
        disabled={loading}
      />

      {/* Date de retour */}
      <TextField
        label="Date de retour"
        type={resolvedDateType}
        value={dateRetourLocal}
        onChange={(e) =>
          handleChange(
            "date_retour",
            resolvedDateType === "datetime-local"
              ? e.target.value
                ? fromDatetimeLocal(e.target.value)
                : null
              : e.target.value
                ? new Date(`${e.target.value}T00:00:00`).toISOString()
                : null
          )
        }
        fullWidth
        disabled={loading}
        InputLabelProps={{ shrink: true }} // ✅ corrige le chevauchement label/valeur
      />

      {/* Submit */}
      {useOwnForm ? (
        <Button type="submit" variant="contained" disabled={loading}>
          {loading
            ? mode === "create"
              ? "⏳ Création…"
              : "⏳ Sauvegarde…"
            : mode === "create"
              ? "✅ Créer l’appairage"
              : "✅ Enregistrer les modifications"}
        </Button>
      ) : (
        <Button type="button" variant="contained" onClick={doSubmit} disabled={loading}>
          {loading
            ? mode === "create"
              ? "⏳ Création…"
              : "⏳ Sauvegarde…"
            : mode === "create"
              ? "✅ Créer l’appairage"
              : "✅ Enregistrer"}
        </Button>
      )}
    </Stack>
  );

  return (
    <>
      {useOwnForm ? (
        <Box
          component="form"
          id={formId}
          onSubmit={(ev) => {
            ev.preventDefault();
            doSubmit();
          }}
        >
          {FormContent}
        </Box>
      ) : (
        <Box>{FormContent}</Box>
      )}

      {/* Modals */}
      <CandidatsSelectModal
        show={showCandidatModal}
        onClose={() => setShowCandidatModal(false)}
        onSelect={(c: CandidatePick) => {
          setCandidatNom(c.nom_complet);
          setForm((f) => ({ ...f, candidat: c.id }));
          setErrors((e) => ({ ...e, candidat: undefined }));
          if (typeof fixedFormationId !== "number") {
            const { id: candFormationId, nom: candFormationNom } = extractFormationFromCandidate(c);
            if (candFormationId != null) {
              setForm((f) => ({ ...f, formation: candFormationId }));
              const metaLabel =
                meta?.formation_choices.find((x) => x.value === candFormationId)?.label ?? null;
              setFormationLabel(metaLabel ?? candFormationNom ?? `#${candFormationId}`);
            } else if (candFormationNom) {
              setFormationLabel(candFormationNom);
            }
          }
          setShowCandidatModal(false);
        }}
      />

      <PartenaireSelectModal
        show={showPartenaireModal}
        onClose={() => setShowPartenaireModal(false)}
        onSelect={(p: PartnerPick) => {
          const name = p.nom ?? p.raison_sociale ?? p.name ?? `#${p.id}`;
          setPartenaireNom(name);
          setForm((f) => ({ ...f, partenaire: p.id }));
          setErrors((e) => ({ ...e, partenaire: undefined }));
          setShowPartenaireModal(false);
        }}
      />
    </>
  );
}
