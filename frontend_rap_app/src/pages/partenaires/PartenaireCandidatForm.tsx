import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Stack,
  Button,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  MenuItem,
} from "@mui/material";
import {
  Description as DescriptionIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  RestartAlt as RestartAltIcon,
  LocationOn as LocationOnIcon,
} from "@mui/icons-material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

import type { Partenaire, PartenaireChoicesResponse } from "../../types/partenaire";
import RichHtmlEditorField from "../../components/forms/RichHtmlEditorField";

type FormProps = {
  initialValues?: Partial<Partenaire>;
  onSubmit: (values: Partial<Partenaire>) => void;
  loading: boolean;
  choices: PartenaireChoicesResponse | null;
  readOnlyCentre?: boolean; // ✅ ajouté
};

// 🔹 Section visuelle réutilisable
function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, backgroundColor: "#fafafa" }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
        {icon}
        <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
          {title}
        </Typography>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Paper>
  );
}

const onlyDigits = (s: string, limit = 5) => s.replace(/\D/g, "").slice(0, limit);

export default function PartenaireCandidatForm({
  initialValues = {},
  onSubmit,
  loading,
  choices,
  readOnlyCentre = false, // ✅ valeur par défaut
}: FormProps) {
  const [form, setForm] = useState<Partial<Partenaire>>(initialValues);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const handleChange = <K extends keyof Partenaire>(field: K, value: Partenaire[K] | undefined) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const count = (s?: string | null) => (s ? s.length : 0);

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      aria-busy={loading || undefined}
    >
      {/* ─────────── En-tête ─────────── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={600} color="primary">
          🏢 Partenaire
        </Typography>
        <Chip
          label={(form.is_active ?? true) ? "Actif" : "Inactif"}
          color={(form.is_active ?? true) ? "success" : "error"}
          variant="outlined"
        />
      </Stack>

      {/* ─────────── Centre (lecture seule ou masqué) ─────────── */}
      {!readOnlyCentre && (
        <>
          {form.default_centre_nom && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Centre associé :
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {form.default_centre_nom}
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* ─────────── Informations générales ─────────── */}
      <Section icon={<InfoIcon color="primary" />} title="Informations générales">
        <Grid container spacing={2}>
          {/* Nom entreprise */}
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              required
              label="Nom de l’entreprise (raison sociale)"
              value={form.nom || ""}
              onChange={(e) => handleChange("nom", e.target.value)}
              disabled={loading}
            />
          </Grid>

          {/* Type */}
          <Grid item xs={12} md={4}>
            <TextField
              select
              fullWidth
              label="Type"
              value={form.type ?? ""}
              onChange={(e) => handleChange("type", e.target.value as Partenaire["type"])}
              disabled={loading}
            >
              <MenuItem value="">Sélectionner…</MenuItem>
              {choices?.types?.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Nom du contact */}
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Nom du contact"
              value={form.contact_nom || ""}
              onChange={(e) => handleChange("contact_nom", e.target.value)}
              disabled={loading}
            />
          </Grid>

          {/* Téléphone du contact */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Téléphone du contact"
              value={form.contact_telephone || ""}
              onChange={(e) => handleChange("contact_telephone", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* Email du contact */}
          <Grid item xs={12} md={4}>
            <TextField
              type="email"
              label="Email du contact"
              value={form.contact_email || ""}
              onChange={(e) => handleChange("contact_email", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* Secteur d’activité */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Secteur d’activité"
              value={form.secteur_activite || ""}
              onChange={(e) => handleChange("secteur_activite", e.target.value)}
              disabled={loading}
              helperText="Ex. Numérique, BTP, Santé…"
            />
          </Grid>
        </Grid>
      </Section>

      {/* ─────────── Adresse ─────────── */}
      <Section icon={<LocationOnIcon color="primary" />} title="Adresse">
        <Grid container spacing={2}>
          <Grid item xs={12} md={2}>
            <TextField
              label="N°"
              value={form.street_number || ""}
              onChange={(e) => handleChange("street_number", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Rue"
              value={form.street_name || ""}
              onChange={(e) => handleChange("street_name", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Complément"
              value={form.street_complement || ""}
              onChange={(e) => handleChange("street_complement", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Code postal"
              value={form.zip_code || ""}
              onChange={(e) => handleChange("zip_code", onlyDigits(e.target.value))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Ville"
              value={form.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Pays"
              value={form.country || ""}
              onChange={(e) => handleChange("country", e.target.value)}
              fullWidth
            />
          </Grid>
        </Grid>
      </Section>

      {/* ─────────── Description générale ─────────── */}
      <Accordion
        defaultExpanded={false}
        disableGutters
        sx={{
          mb: 3,
          borderRadius: 2,
          boxShadow: 1,
          "&::before": { display: "none" },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            backgroundColor: "rgba(25,118,210,0.08)",
            borderBottom: "1px solid #ddd",
            borderRadius: "8px 8px 0 0",
            "& .MuiAccordionSummary-content": { alignItems: "center", gap: 1 },
          }}
        >
          <DescriptionIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
            Description générale
          </Typography>
        </AccordionSummary>

        <AccordionDetails sx={{ backgroundColor: "#fafafa", p: 3 }}>
          <RichHtmlEditorField
            label={`Informations complémentaires (${count(form.description)}/2000)`}
            value={form.description || ""}
            onChange={(value) => handleChange("description", value)}
            placeholder="Décrire le partenaire et les informations utiles…"
            minHeight={140}
          />
        </AccordionDetails>
      </Accordion>

      {/* ─────────── Actions du formulaire ─────────── */}
      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={() => setForm(initialValues)}
          disabled={loading}
        >
          Réinitialiser
        </Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={loading}>
          {loading ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </Stack>
    </Box>
  );
}
