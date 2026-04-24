// -----------------------------------------------------------------------------
// 🎯 Formulaire Objectif Prépa — CRUD complet (hook-based, MUI ready)
// -----------------------------------------------------------------------------
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  Stack,
  Typography,
  CircularProgress,
  Box,
  Alert,
  useTheme,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import type { ObjectifPrepa } from "src/types/prepa";

import CentresSelectModal from "src/components/modals/CentresSelectModal";
import {
  useCreateObjectifPrepa,
  useObjectifsPrepa,
  useUpdateObjectifPrepa,
} from "src/hooks/usePrepaObjectifs";
import RichHtmlEditorField from "src/components/forms/RichHtmlEditorField";
import type { AppTheme } from "src/theme";
import {
  Flag as FlagIcon,
  LocationOn as LocationOnIcon,
  Comment as CommentIcon,
} from "@mui/icons-material";

// ─────────────────────────────────────────────
// 📌 Props
// ─────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  id?: number | null;
}

function DialogSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useTheme<AppTheme>();

  const sectionBackground =
    theme.palette.mode === "light"
      ? theme.custom.dialog.section.background.light
      : theme.custom.dialog.section.background.dark;

  const sectionBorder =
    theme.palette.mode === "light"
      ? theme.custom.dialog.section.border.light
      : theme.custom.dialog.section.border.dark;

  const accentHeaderBackground =
    theme.palette.mode === "light"
      ? theme.custom.form.section.accentHeaderBackground.light
      : theme.custom.form.section.accentHeaderBackground.dark;

  const dividerColor =
    theme.palette.mode === "light"
      ? theme.custom.form.divider.dashedColor.light
      : theme.custom.form.divider.dashedColor.dark;

  return (
    <Box
      sx={{
        borderRadius: theme.custom.dialog.section.borderRadius,
        p: theme.custom.dialog.section.padding,
        background: sectionBackground,
        border: sectionBorder,
      }}
    >
      <Stack spacing={theme.custom.form.sectionCard.titleGap}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: theme.custom.form.inlineBlock.gap,
            px: { xs: 1, sm: 1.25 },
            py: { xs: 0.875, sm: 1 },
            borderRadius: theme.shape.borderRadius,
            border: "1px solid",
            borderColor: "divider",
            background: accentHeaderBackground,
          }}
        >
          <Box
            sx={{
              color: "primary.main",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: theme.custom.form.inlineBlock.minHeight,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>

            {description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {description}
              </Typography>
            ) : null}
          </Box>
        </Box>

        <Box
          sx={{
            borderBottom: `${theme.custom.form.divider.dashedWidth} dashed ${dividerColor}`,
          }}
        />

        {children}
      </Stack>
    </Box>
  );
}

// ─────────────────────────────────────────────
// 📘 Composant principal
// ─────────────────────────────────────────────
export default function ObjectifPrepaForm({ open, onClose, id }: Props) {
  const theme = useTheme<AppTheme>();
  const { data: paginated, isLoading } = useObjectifsPrepa();
  const createMutation = useCreateObjectifPrepa();
  const updateMutation = useUpdateObjectifPrepa();

  const objectifs = useMemo(() => paginated?.results ?? [], [paginated]);

  const [form, setForm] = useState<Partial<ObjectifPrepa>>({
    annee: new Date().getFullYear(),
  });
  const [saving, setSaving] = useState(false);
  const [showCentreModal, setShowCentreModal] = useState(false);
  const [centreLabel, setCentreLabel] = useState("");

  useEffect(() => {
    if (!id || objectifs.length === 0) {
      setForm({ annee: new Date().getFullYear() });
      setCentreLabel("");
      return;
    }

    const found = objectifs.find((d: ObjectifPrepa) => d.id === id);
    if (found) {
      setForm({
        ...found,
        centre_id: found.centre_id ?? found.centre?.id,
      });
      setCentreLabel(found.centre_nom ?? found.centre?.nom ?? "");
    }
  }, [id, objectifs]);

  const handleChange = (key: keyof ObjectifPrepa, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.centre_id && !form.centre?.id) {
      toast.warn("Veuillez sélectionner un centre.");
      return;
    }

    if (!form.valeur_objectif || form.valeur_objectif <= 0) {
      toast.warn("Veuillez indiquer une valeur d’objectif valide.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        centre_id: form.centre_id ?? form.centre?.id,
        annee: form.annee ?? new Date().getFullYear(),
        valeur_objectif: form.valeur_objectif ?? 0,
        commentaire: form.commentaire ?? "",
        departement: form.departement ?? "",
      };

      if (form.id) {
        await updateMutation.mutateAsync({ id: form.id, payload });
        toast.success("Objectif Prépa mis à jour ✅");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Nouvel objectif Prépa créé ✅");
      }

      onClose();
    } catch {
      toast.error("Erreur lors de l’enregistrement ❌");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Chargement des objectifs…</Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {form.id ? "Modifier l’objectif Prépa" : "Nouvel objectif Prépa"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Renseignez l’année, le centre concerné et la valeur cible de l’objectif Prépa.
            </Alert>

            <DialogSection
              icon={<FlagIcon color="primary" />}
              title="Informations principales"
              description="Paramètres de base utilisés pour créer ou mettre à jour l’objectif."
            >
              <Grid container spacing={theme.custom.form.sectionCard.contentGap}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Année"
                    type="number"
                    fullWidth
                    required
                    value={form.annee ?? new Date().getFullYear()}
                    onChange={(e) =>
                      handleChange(
                        "annee",
                        Number(e.target.value) || new Date().getFullYear()
                      )
                    }
                    helperText="Année de référence de l’objectif."
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Objectif (personnes)"
                    type="number"
                    fullWidth
                    required
                    value={form.valeur_objectif ?? ""}
                    onChange={(e) =>
                      handleChange("valeur_objectif", Number(e.target.value) || 0)
                    }
                    helperText="Valeur cible attendue."
                  />
                </Grid>

                <Grid item xs={12} md={8}>
                  <Stack spacing={1}>
                    <TextField
                      label="Centre"
                      fullWidth
                      placeholder="— Aucun centre sélectionné —"
                      value={
                        centreLabel ||
                        form.centre_nom ||
                        form.centre?.nom ||
                        (form.centre_id ? `#${form.centre_id}` : "")
                      }
                      InputProps={{ readOnly: true }}
                      helperText="Le centre sélectionné sera utilisé pour rattacher l’objectif."
                    />

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Button
                        variant="outlined"
                        onClick={() => setShowCentreModal(true)}
                        disabled={saving}
                      >
                        Sélectionner un centre
                      </Button>

                      {form.centre_id ? (
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => {
                            setForm((f) => ({
                              ...f,
                              centre_id: undefined,
                              centre: null,
                            }));
                            setCentreLabel("");
                          }}
                          disabled={saving}
                        >
                          Effacer
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Département"
                    fullWidth
                    value={form.departement ?? ""}
                    onChange={(e) => handleChange("departement", e.target.value)}
                    helperText="Département du centre ou de l’objectif."
                  />
                </Grid>
              </Grid>
            </DialogSection>

            <DialogSection
              icon={<CommentIcon color="primary" />}
              title="Commentaire"
              description="Zone libre pour contextualiser l’objectif."
            >
              <RichHtmlEditorField
                label="Commentaire"
                value={form.commentaire ?? ""}
                onChange={(value) => handleChange("commentaire", value)}
                placeholder="Ajouter un commentaire enrichi…"
                minHeight={120}
              />
            </DialogSection>

            <DialogSection
              icon={<LocationOnIcon color="primary" />}
              title="Rattachement centre"
              description="Le centre peut être choisi directement depuis le sélecteur dédié."
            >
              <Typography variant="body2" color="text.secondary">
                {form.centre_id || form.centre?.id
                  ? `Centre actuellement rattaché : ${
                      centreLabel ||
                      form.centre_nom ||
                      form.centre?.nom ||
                      `#${form.centre_id ?? form.centre?.id}`
                    }`
                  : "Aucun centre n’est encore rattaché à cet objectif."}
              </Typography>
            </DialogSection>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            spacing={theme.custom.page.template.header.actions.gap.default}
            useFlexGap
            sx={{
              width: { xs: "100%", sm: "auto" },
              "& > *": {
                minWidth: { xs: "100%", sm: theme.spacing(18) },
              },
            }}
          >
            <Button onClick={onClose} disabled={saving}>
              Annuler
            </Button>

            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={
                saving ||
                (!form.centre_id && !form.centre?.id) ||
                !form.valeur_objectif ||
                Number.isNaN(Number(form.annee))
              }
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <CentresSelectModal
        show={showCentreModal}
        onClose={() => setShowCentreModal(false)}
        onSelect={(centre) => {
          const c = centre as any;
          setForm((f) => ({
            ...f,
            centre_id: c.id,
            departement: c.departement ?? f.departement,
          }));
          setCentreLabel(`${c.nom ?? c.label ?? `Centre #${c.id}`} (${c.departement ?? ""})`);
          setShowCentreModal(false);
        }}
      />
    </>
  );
}