// -----------------------------------------------------------------------------
// 🎯 Formulaire Objectif Déclic — CRUD complet (hook-based, MUI ready)
// -----------------------------------------------------------------------------
import {
  Box,
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
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import type { ObjectifDeclic } from "src/types/declic";

import CentresSelectModal from "src/components/modals/CentresSelectModal";
import {
  useCreateObjectifDeclic,
  useObjectifsDeclic,
  useUpdateObjectifDeclic,
} from "src/hooks/useDeclicObjectifs";
import RichHtmlEditorField from "src/components/forms/RichHtmlEditorField";

// ─────────────────────────────────────────────
// 📌 Props
// ─────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  id?: number | null;
}

type DialogSectionProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

function DialogSection({ title, subtitle, children }: DialogSectionProps) {
  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      <Box>{children}</Box>
    </Stack>
  );
}

// ─────────────────────────────────────────────
// 📘 Composant principal
// ─────────────────────────────────────────────
export default function ObjectifDeclicForm({ open, onClose, id }: Props) {
  const { data: paginated, isLoading } = useObjectifsDeclic();
  const createMutation = useCreateObjectifDeclic();
  const updateMutation = useUpdateObjectifDeclic();

  const objectifs = useMemo(() => paginated?.results ?? [], [paginated]);

  const [form, setForm] = useState<Partial<ObjectifDeclic>>({
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

    const found = objectifs.find((d: ObjectifDeclic) => d.id === id);
    if (found) {
      setForm({
        ...found,
        centre_id: found.centre_id ?? found.centre?.id,
      });
      setCentreLabel(found.centre?.nom ?? "");
    }
  }, [id, objectifs]);

  const handleChange = (key: keyof ObjectifDeclic, value: any) =>
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
        toast.success("Objectif mis à jour ✅");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Nouvel objectif créé ✅");
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
          {form.id ? "Modifier l’objectif Déclic" : "Nouvel objectif Déclic"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>
            <DialogSection
              title="Informations principales"
              subtitle="Renseignez l’année, le centre et la valeur cible de l’objectif."
            >
              <Grid container spacing={2}>
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
                        form.centre?.nom ||
                        (form.centre_id ? `#${form.centre_id}` : "")
                      }
                      InputProps={{ readOnly: true }}
                    />

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Button
                        variant="outlined"
                        onClick={() => setShowCentreModal(true)}
                      >
                        🏫 Sélectionner un centre
                      </Button>

                      {form.centre_id && (
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
                        >
                          ✖ Effacer
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Département"
                    fullWidth
                    value={form.departement ?? ""}
                    onChange={(e) => handleChange("departement", e.target.value)}
                  />
                </Grid>
              </Grid>
            </DialogSection>

            <DialogSection
              title="Commentaire"
              subtitle="Ajoutez un commentaire enrichi si nécessaire."
            >
              <RichHtmlEditorField
                label="Commentaire"
                value={form.commentaire ?? ""}
                onChange={(value) => handleChange("commentaire", value)}
                placeholder="Ajouter un commentaire enrichi…"
                minHeight={120}
              />
            </DialogSection>
          </Stack>
        </DialogContent>

        <DialogActions>
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
          setCentreLabel(
            `${c.nom ?? c.label ?? `Centre #${c.id}`}${c.departement ? ` (${c.departement})` : ""}`
          );
          setShowCentreModal(false);
        }}
      />
    </>
  );
}