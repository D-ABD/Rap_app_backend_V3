import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Grid,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  Stack,
  Collapse,
} from "@mui/material";
import { Declic, CentreLight } from "src/types/declic";
import CentresSelectModal from "src/components/modals/CentresSelectModal";
import RichHtmlEditorField from "src/components/forms/RichHtmlEditorField";
import DeclicParticipantsSection from "./DeclicParticipantsSection";

interface Props {
  initialValues?: Partial<Declic>;
  meta?: {
    type_declic_choices?: Array<{ value: string; label: string }>;
    centre_choices?: Array<{ value: number; label: string }>;
  } | null;
  submitting?: boolean;
  onSubmit: (values: Partial<Declic>) => void | Promise<void>;
  onCancel?: () => void;
  onCentreChange?: (nom: string) => void;
}

/* ===================== CHOIX PAR DÉFAUT ===================== */
const TYPE_DEClic_CHOICES_FALLBACK = [
  { value: "atelier_1", label: "Atelier 1" },
  { value: "atelier_2", label: "Atelier 2" },
  { value: "atelier_3", label: "Atelier 3" },
  { value: "atelier_4", label: "Atelier 4" },
  { value: "atelier_5", label: "Atelier 5" },
  { value: "atelier_6", label: "Atelier 6" },
  { value: "autre", label: "Autre" },
];

/* ===================== FORMULAIRE DÉCLIC ===================== */
export default function DeclicForm({
  initialValues,
  meta,
  submitting = false,
  onSubmit,
  onCancel,
  onCentreChange,
}: Props) {
  const [form, setForm] = useState<Partial<Declic>>({
    type_declic: initialValues?.type_declic ?? "atelier_1",
    date_declic: initialValues?.date_declic ?? "",
    centre_id: initialValues?.centre_id ?? undefined,
    commentaire: initialValues?.commentaire ?? "",
    nb_inscrits_declic: initialValues?.nb_inscrits_declic ?? 0,
    nb_presents_declic: initialValues?.nb_presents_declic ?? 0,
    nb_absents_declic: initialValues?.nb_absents_declic ?? 0,
    participants_declic: initialValues?.participants_declic ?? [],
  });

  const [centreLabel, setCentreLabel] = useState<string>("");
  const [showCentreModal, setShowCentreModal] = useState(false);

  /* ===================== CHOIX DYNAMIQUES ===================== */
  const typeChoices = useMemo(
    () =>
      meta?.type_declic_choices?.length ? meta.type_declic_choices : TYPE_DEClic_CHOICES_FALLBACK,
    [meta?.type_declic_choices]
  );

  const handleChange = <K extends keyof Declic>(key: K, value: Declic[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* ===================== AUTO-CALCUL ABSENTS ===================== */

  useEffect(() => {
    // Atelier : absents = inscrits - présents
    if (form.nb_inscrits_declic !== undefined && form.nb_presents_declic !== undefined) {
      setForm((prev) => ({
        ...prev,
        nb_absents_declic: Math.max(
          0,
          (prev.nb_inscrits_declic ?? 0) - (prev.nb_presents_declic ?? 0)
        ),
      }));
    }
  }, [form.nb_inscrits_declic, form.nb_presents_declic]);

  /* ===================== MISE À JOUR CENTRE LABEL ===================== */
  useEffect(() => {
    if (form.centre_id && meta?.centre_choices?.length) {
      const opt = meta.centre_choices.find((c) => Number(c.value) === form.centre_id);
      setCentreLabel(opt?.label ?? `#${form.centre_id}`);
      if (opt?.label) onCentreChange?.(opt.label);
    } else {
      setCentreLabel("");
      onCentreChange?.("");
    }
  }, [form.centre_id, meta?.centre_choices, onCentreChange]);

  /* ===================== SUBMIT ===================== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  /* ===================== DÉTERMINER LE TYPE ===================== */
  const isAtelier = form.type_declic?.startsWith("atelier") || form.type_declic === "autre";

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        {/* --- Informations principales --- */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Informations principales</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Type, date et centre de la séance Déclic.
          </Typography>

          <Grid container spacing={2}>
            {/* Type d’activité */}
            <Grid item xs={12} md={4}>
              <Typography fontWeight={600}>Type d’activité *</Typography>
              <Select
                fullWidth
                required
                value={form.type_declic ?? ""}
                onChange={(e) => handleChange("type_declic", e.target.value as string)}
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
              <TextField
                type="date"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={form.date_declic ?? ""}
                onChange={(e) => handleChange("date_declic", e.target.value)}
              />
            </Grid>

            {/* Centre */}
            <Grid item xs={12} md={4}>
              <Typography fontWeight={600}>Centre *</Typography>
              <TextField
                fullWidth
                placeholder="— Aucun centre sélectionné —"
                value={centreLabel || (form.centre_id ? `#${form.centre_id}` : "")}
                InputProps={{ readOnly: true }}
              />
              <Stack direction="row" spacing={1} mt={1}>
                <Button variant="outlined" onClick={() => setShowCentreModal(true)}>
                  🏫 Sélectionner un centre
                </Button>
                {form.centre_id && (
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
          </Grid>
        </Paper>

        {/* --- Ateliers Déclic --- */}
        <Collapse in={isAtelier} unmountOnExit>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">Ateliers Déclic</Typography>
            <Grid container spacing={2}>
              {[
                ["nb_inscrits_declic", "Inscrits"],
                ["nb_presents_declic", "Présents"],
              ].map(([key, label]) => (
                <Grid item xs={12} md={4} key={key}>
                  <TextField
                    type="number"
                    fullWidth
                    label={label}
                    value={(form as any)[key] ?? ""}
                    onChange={(e) =>
                      handleChange(key as keyof Declic, Number(e.target.value) as any)
                    }
                  />
                </Grid>
              ))}

              {/* Absents auto */}
              <Grid item xs={12} md={4}>
                <TextField
                  type="number"
                  fullWidth
                  label="Absents (auto)"
                  value={form.nb_absents_declic ?? 0}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        <DeclicParticipantsSection
          participants={form.participants_declic ?? []}
          onChange={(participants) => handleChange("participants_declic", participants)}
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
