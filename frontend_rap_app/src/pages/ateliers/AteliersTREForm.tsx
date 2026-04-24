// =============================================
// components/ateliers/AtelierTREForm.tsx
// Refactor LOT 7 — structure formulaire allégée
// =============================================
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  Chip,
  Stack,
  FormHelperText,
  Divider,
} from "@mui/material";
import type {
  AtelierTREFormData,
  AtelierTREMeta,
  Choice,
  TypeAtelier,
  PresenceStatut,
} from "../../types/ateliersTre";
import CentresSelectModal from "../../components/modals/CentresSelectModal";
import CandidatsSelectModal, {
  CandidatPick,
} from "../../components/modals/CandidatsSelectModal";
import FormActionsBar from "../../components/forms/FormActionsBar";

/* ====================== Fallbacks ====================== */
const TYPE_CHOICES_FALLBACK: Choice[] = [
  { value: "atelier_1", label: "Atelier 1 - Exploration et positionnement" },
  { value: "atelier_2", label: "Atelier 2 - CV et lettre de motivation" },
  { value: "atelier_3", label: "Atelier 3 - Simulation entretien" },
  { value: "atelier_4", label: "Atelier 4 - Prospection entreprise" },
  { value: "atelier_5", label: "Atelier 5 - Réseaux sociaux pro" },
  { value: "atelier_6", label: "Atelier 6 - Posture professionnelle" },
  { value: "atelier_7", label: "Atelier 7 - Bilan et plan d’action" },
  { value: "autre", label: "Autre" },
];

const PRESENCE_CHOICES_FALLBACK: Choice[] = [
  { value: "present", label: "Présent" },
  { value: "absent", label: "Absent" },
  { value: "excuse", label: "Excusé" },
  { value: "inconnu", label: "Non renseigné" },
];

/* ====================== Helpers ====================== */
function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const s = iso.includes("T") ? iso : iso.replace(" ", "T");
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalInput(v: string): string | undefined {
  return v || undefined;
}

/* ====================== Types props ====================== */
type Props = {
  initialValues?: Partial<AtelierTREFormData & { notes?: string }>;
  meta?: AtelierTREMeta | null;
  submitting?: boolean;
  onSubmit: (values: AtelierTREFormData) => void | Promise<void>;
  onCancel?: () => void;
};

/* ========================= Composant ========================= */
export default function AtelierTREForm({
  initialValues,
  meta,
  submitting = false,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<AtelierTREFormData & { notes?: string }>({
    type_atelier: (initialValues?.type_atelier as TypeAtelier) ?? "atelier_1",
    date_atelier: initialValues?.date_atelier ?? null,
    centre: initialValues?.centre ?? null,
    candidats: initialValues?.candidats ?? [],
    notes: initialValues?.notes ?? "",
  });

  const [centreLabel, setCentreLabel] = useState<string>("");
  const [candPills, setCandPills] = useState<Array<{ id: number; label: string }>>([]);
  const [presences, setPresences] = useState<Record<number, PresenceStatut>>(
    Object.fromEntries(
      (initialValues?.presences ?? []).map((presence) => [
        presence.candidat_id,
        presence.statut,
      ])
    ) as Record<number, PresenceStatut>
  );

  const [showCentreModal, setShowCentreModal] = useState(false);
  const [showCandidatsModal, setShowCandidatsModal] = useState(false);

  const typeChoices = useMemo(
    () =>
      meta?.type_atelier_choices?.length
        ? meta.type_atelier_choices
        : TYPE_CHOICES_FALLBACK,
    [meta?.type_atelier_choices]
  );
  const centreChoices = useMemo(() => meta?.centre_choices ?? [], [meta?.centre_choices]);
  const candidatChoices = useMemo(
    () => meta?.candidat_choices ?? [],
    [meta?.candidat_choices]
  );
  const presenceChoices = useMemo(
    () => meta?.presence_statut_choices ?? PRESENCE_CHOICES_FALLBACK,
    [meta?.presence_statut_choices]
  );

  useEffect(() => {
    if (form.centre != null) {
      const opt = centreChoices.find((c) => Number(c.value) === form.centre);
      setCentreLabel(opt?.label ?? `#${form.centre}`);
    } else {
      setCentreLabel("");
    }
  }, [form.centre, centreChoices]);

  useEffect(() => {
    const ids = form.candidats ?? [];
    const list = ids.map((id) => {
      const opt = candidatChoices.find((c) => Number(c.value) === id);
      return { id, label: opt?.label ?? `#${id}` };
    });
    setCandPills(list);
  }, [form.candidats, candidatChoices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: AtelierTREFormData = {
      type_atelier: form.type_atelier,
      date_atelier: form.date_atelier ?? null,
      centre: form.centre ?? null,
      candidats: Array.isArray(form.candidats) ? form.candidats : [],
      presences: Object.entries(presences).map(([cid, statut]) => ({
        candidat_id: Number(cid),
        statut,
      })),
    };

    await onSubmit(payload);
  };

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* Informations principales */}
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">Informations de l’atelier</Typography>
              <Typography variant="body2" color="text.secondary">
                Renseignez le type, la date/heure et le centre.
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Stack spacing={1}>
                  <Typography fontWeight={600}>Type d’atelier *</Typography>
                  <Select
                    fullWidth
                    required
                    value={form.type_atelier}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        type_atelier: e.target.value as TypeAtelier,
                      }))
                    }
                  >
                    {typeChoices.map((c) => (
                      <MenuItem key={String(c.value)} value={String(c.value)}>
                        {c.label}
                      </MenuItem>
                    ))}
                  </Select>
                </Stack>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="Date & heure"
                  type="datetime-local"
                  fullWidth
                  value={toDatetimeLocalValue(form.date_atelier ?? undefined)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      date_atelier: fromDatetimeLocalInput(e.target.value) ?? null,
                    }))
                  }
                  helperText="Laissez vide si la date n’est pas encore fixée."
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack spacing={1}>
                  <TextField
                    label="Centre"
                    fullWidth
                    placeholder="— Aucune sélection —"
                    value={centreLabel || (form.centre ? `#${form.centre}` : "")}
                    InputProps={{ readOnly: true }}
                  />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button
                      variant="outlined"
                      onClick={() => setShowCentreModal(true)}
                    >
                      🏫 Sélectionner un centre
                    </Button>

                    {form.centre != null && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => {
                          setForm((f) => ({ ...f, centre: null }));
                          setCentreLabel("");
                        }}
                      >
                        ✖ Effacer
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
          </Stack>

          <Divider />

          {/* Candidats et présences */}
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">Candidats & présences</Typography>
              <Typography variant="body2" color="text.secondary">
                Ajoutez des candidats et définissez leur présence.
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="outlined" onClick={() => setShowCandidatsModal(true)}>
                👥 Sélectionner des candidats
              </Button>

              {!!(form.candidats?.length ?? 0) && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    setForm((f) => ({ ...f, candidats: [] }));
                    setCandPills([]);
                    setPresences({});
                  }}
                >
                  ✖ Tout effacer
                </Button>
              )}
            </Stack>

            {!!candPills.length && (
              <Stack spacing={1.5}>
                <FormHelperText>
                  {candPills.length} candidat(s) sélectionné(s)
                </FormHelperText>

                <Divider />

                <Grid container spacing={1.5}>
                  {candPills.map((c) => (
                    <Grid item xs={12} md={6} key={c.id}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", sm: "center" }}
                      >
                        <Chip label={c.label} />

                        <Select
                          size="small"
                          value={presences[c.id] ?? "inconnu"}
                          onChange={(e) =>
                            setPresences((prev) => ({
                              ...prev,
                              [c.id]: e.target.value as PresenceStatut,
                            }))
                          }
                        >
                          {presenceChoices.map((p: Choice) => (
                            <MenuItem key={p.value} value={p.value}>
                              {p.label}
                            </MenuItem>
                          ))}
                        </Select>

                        <Button
                          size="small"
                          color="error"
                          onClick={() => {
                            setForm((f) => ({
                              ...f,
                              candidats: (f.candidats ?? []).filter((id) => id !== c.id),
                            }));
                            setPresences((prev) => {
                              const next = { ...prev };
                              delete next[c.id];
                              return next;
                            });
                          }}
                        >
                          Retirer
                        </Button>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            )}
          </Stack>

          <Divider />

          {/* Notes */}
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">Notes internes</Typography>
              <Typography variant="body2" color="text.secondary">
                Ajoutez une note libre si nécessaire.
              </Typography>
            </Box>

            <TextField
              label="Notes"
              multiline
              minRows={4}
              fullWidth
              placeholder="Saisir une note (optionnel)…"
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Stack>

          <Divider />

          {/* Actions */}
          <FormActionsBar>
            {onCancel && (
              <Button variant="outlined" onClick={onCancel}>
                Annuler
              </Button>
            )}

            <Button variant="contained" type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </FormActionsBar>
        </Stack>
      </Box>

      {/* Modals */}
      <CentresSelectModal
        show={showCentreModal}
        onClose={() => setShowCentreModal(false)}
        onSelect={(centre) => {
          setForm((f) => ({ ...f, centre: centre.id }));
          setCentreLabel(centre.label ?? `#${centre.id}`);
          setShowCentreModal(false);
        }}
      />

      <CandidatsSelectModal
        show={showCandidatsModal}
        onClose={() => setShowCandidatsModal(false)}
        multiple
        allowClear={false}
        selectedIds={form.candidats ?? []}
        onlyCandidateLike
        onlyActive={false}
        onSelect={(pick: CandidatPick) => {
          setShowCandidatsModal(false);
          setForm((f) => ({ ...f, candidats: [...(f.candidats ?? []), pick.id] }));
        }}
        onSelectMany={(picks: CandidatPick[]) => {
          const nextIds = picks.map((pick) => pick.id);
          setForm((f) => ({ ...f, candidats: nextIds }));
          setPresences((prev) =>
            Object.fromEntries(
              Object.entries(prev).filter(([candidateId]) =>
                nextIds.includes(Number(candidateId))
              )
            ) as Record<number, PresenceStatut>
          );
        }}
      />
    </>
  );
}