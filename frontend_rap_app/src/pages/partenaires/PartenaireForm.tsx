// src/pages/partenaires/PartenaireForm.tsx
import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Stack,
  Button,
  Chip,
  Link,
  Divider,
  AccordionDetails,
  Accordion,
  AccordionSummary,
} from "@mui/material";
import {
  Business as BusinessIcon,
  Work as WorkIcon,
  Group as GroupIcon,
  Description as DescriptionIcon,
  Info as InfoIcon,
  Link as LinkIcon,
  Save as SaveIcon,
  RestartAlt as RestartAltIcon,
  LocationOn as LocationOnIcon,
} from "@mui/icons-material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

import type { Partenaire, PartenaireChoicesResponse, CentreLite } from "../../types/partenaire";
import CentresSelectModal from "../../components/modals/CentresSelectModal";

type CentreOption = { value: number; label: string };

type FormProps = {
  initialValues?: Partial<Partenaire>;
  onSubmit: (values: Partial<Partenaire>) => void;
  loading: boolean;
  choices: PartenaireChoicesResponse | null;
  centreOptions?: CentreOption[];
};

const onlyDigits = (s: string, limit = 5) => s.replace(/\D/g, "").slice(0, limit);

function getDefaultCentreId(p: Partial<Partenaire>): number | "" {
  if (typeof p.default_centre_id === "number") return p.default_centre_id;
  const dc: CentreLite | null | undefined = p.default_centre ?? null;
  if (dc && typeof dc.id === "number") return dc.id;
  return "";
}

// 🔹 Déclaré tout en haut, avant le composant principal
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

export default function PartenaireForm({
  initialValues = {},
  onSubmit,
  loading,
  choices,
  centreOptions,
}: FormProps) {
  const [form, setForm] = useState<Partial<Partenaire>>(() => initialValues);
  const [openCentreModal, setOpenCentreModal] = useState(false);

  // ⚙️ Initialiser le form UNE SEULE FOIS au montage
  useEffect(() => {
    ("🔹 Initialisation du form uniquement au montage");
    setForm((prev) => (Object.keys(prev).length === 0 ? { ...initialValues } : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = <K extends keyof Partenaire>(field: K, value: Partenaire[K] | undefined) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleDefaultCentreChange = (val: string) => {
    const id = val ? Number(val) : null;
    const label = id != null ? (centreOptions?.find((c) => c.value === id)?.label ?? null) : null;
    setForm((prev) => ({
      ...prev,
      default_centre_id: id,
      default_centre: id != null ? { id, nom: label ?? `Centre #${id}` } : null,
      default_centre_nom: label,
    }));
  };

  const handleDefaultCentrePick = (c: { id: number; label: string }) => {
    setForm((prev) => ({
      ...prev,
      default_centre_id: c.id,
      default_centre: { id: c.id, nom: c.label },
      default_centre_nom: c.label,
    }));
    setOpenCentreModal(false);
  };

  const count = (s?: string | null) => (s ? s.length : 0);

  // ✅ Correction : renommé pour éviter le warning ESLint
  const _defaultCentreId = getDefaultCentreId(form);

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();

        if (!form.default_centre_id) {
          alert("❌ Vous devez sélectionner un centre avant de créer le partenaire.");
          return;
        }

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

      {/* ─────────── Général ─────────── */}
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

          {/* Nom du contact */}
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Nom du contact"
              value={form.contact_nom || ""} // ✅ champ corrigé
              onChange={(e) => handleChange("contact_nom", e.target.value)}
              disabled={loading}
            />
          </Grid>

          {/* Téléphone */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Téléphone"
              value={form.telephone || ""}
              onChange={(e) => handleChange("telephone", e.target.value)}
              fullWidth
            />
          </Grid>

          {/* Email */}
          <Grid item xs={12} md={4}>
            <TextField
              type="email"
              label="Email"
              value={form.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              fullWidth
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

          {/* Centre par défaut */}
          <Grid item xs={12} md={6}>
            <Stack direction="column" spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  select
                  required
                  fullWidth
                  label="Centre par défaut"
                  value={
                    centreOptions && centreOptions.length > 0
                      ? String(form.default_centre_id ?? "")
                      : "" // 👈 évite le warning MUI tant que la liste n'est pas prête
                  }
                  onChange={(e) => handleDefaultCentreChange(e.target.value)}
                  disabled={loading || !centreOptions || centreOptions.length === 0}
                  error={!form.default_centre_id}
                  helperText={
                    !form.default_centre_id
                      ? "Sélection obligatoire avant enregistrement"
                      : undefined
                  }
                >
                  <MenuItem value="">Aucun</MenuItem>
                  {centreOptions?.map((c) => (
                    <MenuItem key={c.value} value={String(c.value)}>
                      {c.label}
                    </MenuItem>
                  ))}
                </TextField>

                <Button
                  variant="outlined"
                  onClick={() => setOpenCentreModal(true)}
                  disabled={loading}
                >
                  Parcourir…
                </Button>
              </Stack>

              {/* ✅ Nom du centre affiché après sélection */}
              {form.default_centre_nom && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  🏫 Centre sélectionné :{" "}
                  <Typography component="span" fontWeight="bold" color="text.primary">
                    {form.default_centre_nom}
                  </Typography>
                </Typography>
              )}
            </Stack>
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

      {/* ─────────── Employeur ─────────── */}
      <Accordion
        defaultExpanded={false}
        disableGutters
        sx={{
          mb: 3,
          borderRadius: 2,
          boxShadow: 1,
          "&::before": { display: "none" },
          "&.Mui-expanded": { mt: 1, mb: 2 },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            backgroundColor: "rgba(25, 118, 210, 0.08)",
            borderBottom: "1px solid #ddd",
            borderRadius: "8px 8px 0 0",
            "& .MuiAccordionSummary-content": { alignItems: "center", gap: 1 },
          }}
        >
          <WorkIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
            Informations employeur (Cerfa)
          </Typography>
        </AccordionSummary>

        <AccordionDetails sx={{ p: 3, backgroundColor: "#fafafa" }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="SIRET"
                value={form.siret || ""}
                onChange={(e) => handleChange("siret", onlyDigits(e.target.value, 14))}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Type d’employeur"
                value={form.type_employeur ?? ""}
                onChange={(e) =>
                  handleChange("type_employeur", e.target.value as "prive" | "public")
                }
                fullWidth
              >
                <MenuItem value="">Non défini</MenuItem>
                <MenuItem value="prive">Privé</MenuItem>
                <MenuItem value="public">Public</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Employeur spécifique"
                value={form.employeur_specifique || ""}
                onChange={(e) => handleChange("employeur_specifique", e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Code APE"
                value={form.code_ape || ""}
                onChange={(e) => handleChange("code_ape", e.target.value.toUpperCase())}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                type="number"
                label="Effectif total"
                value={form.effectif_total ?? ""}
                onChange={(e) => handleChange("effectif_total", Number(e.target.value))}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="IDCC"
                value={form.idcc || ""}
                onChange={(e) => handleChange("idcc", e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.assurance_chomage_speciale ?? false}
                    onChange={(e) => handleChange("assurance_chomage_speciale", e.target.checked)}
                  />
                }
                label="Assurance chômage spéciale"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* ─────────── Maîtres d’apprentissage ─────────── */}
      <Section icon={<GroupIcon color="primary" />} title="Maîtres d’apprentissage">
        {[1, 2].map((n) => (
          <Accordion
            key={n}
            defaultExpanded={false}
            disableGutters
            sx={{
              mb: 2,
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
                "& .MuiAccordionSummary-content": {
                  alignItems: "center",
                  gap: 1,
                },
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} color="primary">
                👷‍♂️ Maître d’apprentissage n°{n}
              </Typography>
            </AccordionSummary>

            <AccordionDetails sx={{ backgroundColor: "#fafafa", p: 3 }}>
              <Grid container spacing={2}>
                {[
                  ["Nom de naissance", `maitre${n}_nom_naissance`],
                  ["Prénom", `maitre${n}_prenom`],
                ].map(([label, key]) => (
                  <Grid item xs={12} md={6} key={key}>
                    <TextField
                      label={label}
                      value={(form as any)[key] || ""}
                      onChange={(e) => handleChange(key as any, e.target.value)}
                      fullWidth
                    />
                  </Grid>
                ))}

                <Grid item xs={12} md={4}>
                  <TextField
                    type="date"
                    label="Date de naissance"
                    InputLabelProps={{ shrink: true }}
                    value={(form as any)[`maitre${n}_date_naissance`] || ""}
                    onChange={(e) =>
                      handleChange(`maitre${n}_date_naissance` as any, e.target.value)
                    }
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12} md={8}>
                  <TextField
                    type="email"
                    label="Courriel"
                    value={(form as any)[`maitre${n}_courriel`] || ""}
                    onChange={(e) => handleChange(`maitre${n}_courriel` as any, e.target.value)}
                    fullWidth
                  />
                </Grid>

                {[
                  ["Emploi occupé", `maitre${n}_emploi_occupe`],
                  ["Diplôme ou titre le plus élevé", `maitre${n}_diplome_titre`],
                  ["Niveau du diplôme ou titre", `maitre${n}_niveau_diplome`],
                ].map(([label, key]) => (
                  <Grid item xs={12} md={4} key={key}>
                    <TextField
                      label={label}
                      value={(form as any)[key] || ""}
                      onChange={(e) => handleChange(key as any, e.target.value)}
                      fullWidth
                    />
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Section>

      {/* ─────────── Action commerciale ─────────── */}
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
          <BusinessIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
            Action commerciale
          </Typography>
        </AccordionSummary>

        <AccordionDetails sx={{ backgroundColor: "#fafafa", p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Type d’action"
                value={form.actions ?? ""}
                onChange={(e) => handleChange("actions", e.target.value as Partenaire["actions"])}
              >
                <MenuItem value="">Sélectionner…</MenuItem>
                {choices?.actions?.map((a) => (
                  <MenuItem key={a.value} value={a.value}>
                    {a.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label={`Description (${count(form.action_description)}/1000)`}
                value={form.action_description || ""}
                onChange={(e) => handleChange("action_description", e.target.value)}
                inputProps={{ maxLength: 1000 }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

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
          <TextField
            fullWidth
            multiline
            minRows={4}
            label={`Informations complémentaires (${count(form.description)}/2000)`}
            value={form.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            inputProps={{ maxLength: 2000 }}
          />
        </AccordionDetails>
      </Accordion>

      {/* ─────────── Statut et site ─────────── */}
      <Section icon={<LinkIcon color="primary" />} title="Statut et site">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={form.is_active ?? true}
                onChange={(e) => handleChange("is_active", e.target.checked)}
              />
            }
            label="Partenaire actif"
          />
          {form.website ? (
            <Link href={String(form.website)} target="_blank" rel="noreferrer">
              Ouvrir le site ↗
            </Link>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Aucun site renseigné
            </Typography>
          )}
        </Stack>
      </Section>

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

      <CentresSelectModal
        show={openCentreModal}
        onClose={() => setOpenCentreModal(false)}
        onSelect={handleDefaultCentrePick}
      />
    </Box>
  );
}
