import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Grid,
  Typography,
  Select,
  MenuItem,
  Button,
  Stack,
  Collapse,
  Alert,
} from "@mui/material";
import { Prepa, CentreLight, PrepaParticipation } from "src/types/prepa";
import CentresSelectModal from "src/components/modals/CentresSelectModal";
import RichHtmlEditorField from "src/components/forms/RichHtmlEditorField";
import PrepaInvitesSection from "./PrepaInvitesSection";
import AppTextField from "src/components/forms/fields/AppTextField";
import { useAuth } from "src/hooks/useAuth";
import { isAdminLikeRole } from "src/utils/roleGroups";
import { buildCentreLabel, extractScopedCentres } from "./prepaCentreScope";

interface Props {
  initialValues?: Partial<Prepa>;
  meta?: {
    type_prepa_choices?: Array<{ value: string; label: string }>;
    centre_choices?: Array<{ value: number; label: string }>;
  } | null;
  submitting?: boolean;
  onSubmit: (values: Partial<Prepa>) => void | Promise<void>;
  onCancel?: () => void;
  onCentreChange?: (nom: string) => void;
}

/* ===================== CHOIX PAR DÉFAUT ===================== */
const TYPE_PREPA_CHOICES_FALLBACK = [
  { value: "atelier_1", label: "Atelier 1" },
  { value: "atelier_2", label: "Atelier 2" },
  { value: "atelier_3", label: "Atelier 3" },
  { value: "atelier_4", label: "Atelier 4" },
  { value: "atelier_5", label: "Atelier 5" },
  { value: "atelier_6", label: "Atelier 6" },
  { value: "autre", label: "Autre activité Prépa" },
];

function normalizeParticipationForForm(participation: PrepaParticipation): PrepaParticipation {
  return {
    ...participation,
    stagiaire_prepa_id:
      participation.stagiaire_prepa_id ??
      participation.stagiaire_prepa?.id ??
      null,
    nom: participation.nom ?? participation.stagiaire_prepa?.nom ?? "",
    prenom: participation.prenom ?? participation.stagiaire_prepa?.prenom ?? "",
    telephone: participation.telephone ?? participation.stagiaire_prepa?.telephone ?? "",
    email: participation.email ?? participation.stagiaire_prepa?.email ?? "",
    statut_parcours:
      participation.statut_parcours ??
      participation.stagiaire_prepa?.statut_parcours ??
      "en_attente",
    statut: participation.statut ?? "inscrit",
    commentaire: participation.commentaire ?? "",
  };
}

function computeAtelierTotals(form: Partial<Prepa>) {
  const participations = (form.participations_prepa ?? []).filter(
    (participation) =>
      Boolean(
        participation.stagiaire_prepa_id ||
          participation.stagiaire_prepa?.id ||
          participation.nom ||
          participation.prenom ||
          participation.email
      )
  );
  const nominatifInscrits = participations.length;
  const nominatifPresents = participations.filter(
    (participation) => participation.statut === "present" || participation.statut === "termine"
  ).length;
  const nominatifAbsents = participations.filter(
    (participation) =>
      participation.statut === "absent" ||
      participation.statut === "inscrit" ||
      participation.statut === "a_repositionner"
  ).length;

  const horsListeInscrits = Number(form.nb_inscrits_prepa_hors_liste ?? 0);
  const horsListePresents = Number(form.nb_presents_prepa_hors_liste ?? 0);
  const horsListeAbsents = Number(form.nb_absents_prepa_hors_liste ?? 0);

  const presents = Math.max(0, nominatifPresents + horsListePresents);
  const absents = Math.max(0, nominatifAbsents + horsListeAbsents);
  const inscritsBase = Math.max(0, nominatifInscrits + horsListeInscrits);
  const inscrits = Math.max(inscritsBase, presents + absents);

  return {
    inscrits,
    presents,
    absents,
    nominatifInscrits,
    nominatifPresents,
    nominatifAbsents,
    horsListeInscrits,
    horsListePresents,
    horsListeAbsents,
    tauxPresence: inscrits > 0 ? (presents / inscrits) * 100 : 0,
  };
}

/* ===================== FORMULAIRE PRÉPA ===================== */
export default function PrepaFormAteliers({
  initialValues,
  meta,
  submitting = false,
  onSubmit,
  onCancel,
  onCentreChange,
}: Props) {
  const { user } = useAuth();
  const isAdminLike = isAdminLikeRole(user?.role);
  const [form, setForm] = useState<Partial<Prepa>>({
    type_prepa: initialValues?.type_prepa ?? "atelier_1",
    date_prepa: initialValues?.date_prepa ?? "",
    date_debut_atelier: initialValues?.date_debut_atelier ?? initialValues?.date_prepa ?? "",
    date_fin_atelier: initialValues?.date_fin_atelier ?? initialValues?.date_prepa ?? "",
    centre_id: initialValues?.centre_id ?? undefined,
    formateur_animateur: initialValues?.formateur_animateur ?? "",
    commentaire: initialValues?.commentaire ?? "",
    nombre_places_ouvertes: initialValues?.nombre_places_ouvertes ?? 0,
    nombre_prescriptions: initialValues?.nombre_prescriptions ?? 0,
    nb_presents_info: initialValues?.nb_presents_info ?? 0,
    nb_absents_info: initialValues?.nb_absents_info ?? 0,
    nb_adhesions: initialValues?.nb_adhesions ?? 0,
    nb_inscrits_prepa: initialValues?.nb_inscrits_prepa ?? 0,
    nb_presents_prepa: initialValues?.nb_presents_prepa ?? 0,
    nb_absents_prepa: initialValues?.nb_absents_prepa ?? 0,
    nb_inscrits_prepa_hors_liste: initialValues?.nb_inscrits_prepa_hors_liste ?? 0,
    nb_presents_prepa_hors_liste: initialValues?.nb_presents_prepa_hors_liste ?? 0,
    nb_absents_prepa_hors_liste: initialValues?.nb_absents_prepa_hors_liste ?? 0,
    stagiaires_prepa: initialValues?.stagiaires_prepa ?? [],
    participations_prepa:
      initialValues?.participations_prepa?.map(normalizeParticipationForForm) ??
      (initialValues?.stagiaires_prepa ?? []).map(
        (stagiaire): PrepaParticipation => ({
          stagiaire_prepa_id: stagiaire.id ?? null,
          nom: stagiaire.nom,
          prenom: stagiaire.prenom,
          telephone: stagiaire.telephone ?? "",
          email: stagiaire.email ?? "",
          statut_parcours: stagiaire.statut_parcours ?? "en_attente",
          statut: "inscrit",
          commentaire: "",
        })
      ),
  });

  const [centreLabel, setCentreLabel] = useState<string>("");
  const [showCentreModal, setShowCentreModal] = useState(false);
  const scopedCentres = useMemo(() => extractScopedCentres((meta as Record<string, unknown> | null) ?? null), [meta]);
  const hasSingleScopedCentre = !isAdminLike && scopedCentres.length === 1;

  /* ===================== CHOIX DYNAMIQUES ===================== */
  const typeChoices = useMemo(
    () => {
      const source = meta?.type_prepa_choices?.length
        ? meta.type_prepa_choices
        : TYPE_PREPA_CHOICES_FALLBACK;
      return source.filter((choice) => choice.value !== "info_collective");
    },
    [meta?.type_prepa_choices]
  );

  const handleChange = <K extends keyof Prepa>(key: K, value: Prepa[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* ===================== AUTO-CALCUL ABSENTS ===================== */
  useEffect(() => {
    // IC : absents = prescriptions - présents
    if (form.nombre_prescriptions !== undefined && form.nb_presents_info !== undefined) {
      const nextAbsents = Math.max(
        0,
        (form.nombre_prescriptions ?? 0) - (form.nb_presents_info ?? 0)
      );
      if (form.nb_absents_info === nextAbsents) return;
      setForm((prev) => ({
        ...prev,
        nb_absents_info: nextAbsents,
      }));
    }
  }, [form.nombre_prescriptions, form.nb_presents_info, form.nb_absents_info]);

  useEffect(() => {
    const totals = computeAtelierTotals({
      participations_prepa: form.participations_prepa,
      nb_inscrits_prepa_hors_liste: form.nb_inscrits_prepa_hors_liste,
      nb_presents_prepa_hors_liste: form.nb_presents_prepa_hors_liste,
      nb_absents_prepa_hors_liste: form.nb_absents_prepa_hors_liste,
    } as typeof form);
    setForm((prev) => {
      if (
        prev.nb_inscrits_prepa === totals.inscrits &&
        prev.nb_presents_prepa === totals.presents &&
        prev.nb_absents_prepa === totals.absents
      ) {
        return prev;
      }
      return {
        ...prev,
        nb_inscrits_prepa: totals.inscrits,
        nb_presents_prepa: totals.presents,
        nb_absents_prepa: totals.absents,
      };
    });
  }, [
    form.participations_prepa,
    form.nb_inscrits_prepa_hors_liste,
    form.nb_presents_prepa_hors_liste,
    form.nb_absents_prepa_hors_liste,
  ]);

  /* ===================== MISE À JOUR CENTRE LABEL ===================== */
  useEffect(() => {
    if (!form.centre_id && hasSingleScopedCentre) {
      setForm((prev) => ({ ...prev, centre_id: scopedCentres[0].id }));
      return;
    }
    if (form.centre_id && scopedCentres.length) {
      const opt = scopedCentres.find((c) => c.id === form.centre_id);
      const label = buildCentreLabel(opt) || `#${form.centre_id}`;
      setCentreLabel((prev) => (prev === label ? prev : label));
      onCentreChange?.(label);
    } else {
      setCentreLabel((prev) => (prev === "" ? prev : ""));
      onCentreChange?.("");
    }
  }, [form.centre_id, hasSingleScopedCentre, onCentreChange, scopedCentres]);

  /* ===================== SUBMIT ===================== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...form,
      participations_prepa: (form.participations_prepa ?? []).map(normalizeParticipationForForm),
    });
  };

  /* ===================== DÉTERMINER LE TYPE ===================== */
  const isInfoCollective = form.type_prepa === "info_collective";
  const isAtelier = form.type_prepa?.startsWith("atelier") || form.type_prepa === "autre";
  const atelierTotals = useMemo(() => computeAtelierTotals(form), [form]);

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        {/* --- Informations principales --- */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Informations principales</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Type, date et centre de la séance Prépa.
          </Typography>
          {hasSingleScopedCentre ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Le centre est prérempli automatiquement depuis votre périmètre.
            </Alert>
          ) : null}

          <Grid container spacing={2}>
            {/* Type d’activité */}
            <Grid item xs={12} md={4}>
              <Typography fontWeight={600}>Type d’activité *</Typography>
              <Select
                fullWidth
                required
                value={form.type_prepa ?? ""}
                onChange={(e) => handleChange("type_prepa", e.target.value as string)}
              >
                {typeChoices.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </Grid>

            {/* Date */}
            <Grid item xs={12} md={4}>
              <Typography fontWeight={600}>Date *</Typography>
              <AppTextField
                type="date"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={form.date_prepa ?? ""}
                onChange={(e) => handleChange("date_prepa", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography fontWeight={600}>Début atelier</Typography>
              <AppTextField
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.date_debut_atelier ?? ""}
                onChange={(e) => handleChange("date_debut_atelier", e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography fontWeight={600}>Fin atelier</Typography>
              <AppTextField
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.date_fin_atelier ?? ""}
                onChange={(e) => handleChange("date_fin_atelier", e.target.value)}
              />
            </Grid>

            {/* Centre */}
            <Grid item xs={12} md={6}>
              <Typography fontWeight={600}>Centre *</Typography>
              <AppTextField
                fullWidth
                placeholder="— Aucun centre sélectionné —"
                value={centreLabel || (form.centre_id ? `#${form.centre_id}` : "")}
                InputProps={{ readOnly: true }}
              />
              <Stack direction="row" spacing={1} mt={1}>
                {!hasSingleScopedCentre ? (
                  <Button variant="outlined" onClick={() => setShowCentreModal(true)}>
                    🏫 Sélectionner un centre
                  </Button>
                ) : null}
                {form.centre_id && !hasSingleScopedCentre && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      handleChange("centre_id", undefined);
                      setCentreLabel("");
                      onCentreChange?.("");
                    }}
                  >
                    ✖ Effacer
                  </Button>
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography fontWeight={600}>Formateur / animateur</Typography>
              <AppTextField
                fullWidth
                placeholder="Nom du formateur qui anime la séance"
                value={form.formateur_animateur ?? ""}
                onChange={(e) => handleChange("formateur_animateur", e.target.value)}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* --- Informations collectives --- */}
        <Collapse in={isInfoCollective} unmountOnExit>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">Information collective</Typography>
            <Grid container spacing={2}>
              {[
                ["nombre_places_ouvertes", "Places ouvertes"],
                ["nombre_prescriptions", "Prescriptions"],
                ["nb_presents_info", "Présents"],
              ].map(([key, label]) => (
                <Grid item xs={12} md={4} key={key}>
                  <AppTextField
                    type="number"
                    fullWidth
                    label={label}
                    value={(form as any)[key] ?? ""}
                    onChange={(e) =>
                      handleChange(key as keyof Prepa, Number(e.target.value) as any)
                    }
                  />
                </Grid>
              ))}

              {/* Adhésions */}
              <Grid item xs={12} md={4}>
                <AppTextField
                  type="number"
                  fullWidth
                  label="Adhésions"
                  value={form.nb_adhesions ?? ""}
                  onChange={(e) => handleChange("nb_adhesions", Number(e.target.value) as any)}
                />
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* --- Ateliers Prépa --- */}
        <Collapse in={isAtelier} unmountOnExit>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">Ateliers Prépa</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Les totaux atelier se remplissent automatiquement depuis la participation nominative ci-dessous.
              Utilise les champs “hors liste” si tu veux compléter les chiffres sans renseigner tous les stagiaires.
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Source
                      </Typography>
                    </Grid>
                    <Grid item xs={4} md={3}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Inscrits
                      </Typography>
                    </Grid>
                    <Grid item xs={4} md={3}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Présents
                      </Typography>
                    </Grid>
                    <Grid item xs={4} md={3}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Absents
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <Typography color="text.secondary">Calcul automatique</Typography>
                    </Grid>
                    <Grid item xs={4} md={3}>
                      <Typography>{atelierTotals.nominatifInscrits}</Typography>
                    </Grid>
                    <Grid item xs={4} md={3}>
                      <Typography>{atelierTotals.nominatifPresents}</Typography>
                    </Grid>
                    <Grid item xs={4} md={3}>
                      <Typography>{atelierTotals.nominatifAbsents}</Typography>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <Typography color="text.secondary">Complément hors liste</Typography>
                    </Grid>
                    <Grid item xs={4} md={3}>
                      <Typography>{atelierTotals.horsListeInscrits}</Typography>
                    </Grid>
                    <Grid item xs={4} md={3}>
                      <Typography>{atelierTotals.horsListePresents}</Typography>
                    </Grid>
                    <Grid item xs={4} md={3}>
                      <Typography>{atelierTotals.horsListeAbsents}</Typography>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <Typography fontWeight={700}>Total final</Typography>
                    </Grid>
                    <Grid item xs={4} md={3}>
                      <Typography fontWeight={700}>{atelierTotals.inscrits}</Typography>
                    </Grid>
                    <Grid item xs={4} md={3}>
                      <Typography fontWeight={700}>{atelierTotals.presents}</Typography>
                    </Grid>
                    <Grid item xs={4} md={3}>
                      <Typography fontWeight={700}>{atelierTotals.absents}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {[
                ["nb_inscrits_prepa_hors_liste", "Complément inscrits hors liste"],
                ["nb_presents_prepa_hors_liste", "Complément présents hors liste"],
                ["nb_absents_prepa_hors_liste", "Complément absents hors liste"],
              ].map(([key, label]) => (
                <Grid item xs={12} md={4} key={key}>
                  <AppTextField
                    type="number"
                    fullWidth
                    label={label}
                    value={(form as any)[key] ?? ""}
                    onChange={(e) =>
                      handleChange(key as keyof Prepa, Number(e.target.value) as any)
                    }
                  />
                </Grid>
              ))}

              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Taux de présence atelier: {atelierTotals.tauxPresence.toFixed(1)} %.
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        <PrepaInvitesSection
          participations={form.participations_prepa ?? []}
          centreId={form.centre_id}
          onChange={(participations) =>
            handleChange("participations_prepa", participations as Prepa["participations_prepa"])
          }
        />

        {/* --- Commentaire --- */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Commentaire</Typography>
          <RichHtmlEditorField
            label="Commentaire"
            value={form.commentaire ?? ""}
            onChange={(value) => handleChange("commentaire", value)}
            placeholder="Ajouter un commentaire enrichi…"
          />
        </Paper>

        {/* --- Actions --- */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          {onCancel && (
            <Button variant="outlined" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button variant="contained" type="submit" disabled={submitting}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </Stack>
      </Box>

      {/* --- Sélection centre --- */}
      <CentresSelectModal
        show={showCentreModal}
        onClose={() => setShowCentreModal(false)}
        onSelect={(centre) => {
          const c = centre as unknown as CentreLight;
          handleChange("centre_id", c.id);
          const label = `${c.nom ?? "Centre"}${c.departement ? ` (${c.departement})` : ""}`;
          setCentreLabel(label);
          onCentreChange?.(label);
          setShowCentreModal(false);
        }}
      />
    </>
  );
}
