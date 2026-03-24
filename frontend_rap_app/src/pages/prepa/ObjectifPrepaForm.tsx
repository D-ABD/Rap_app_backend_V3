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
  Paper,
  CircularProgress,
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

// ─────────────────────────────────────────────
// 📌 Props
// ─────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  id?: number | null;
}

// ─────────────────────────────────────────────
// 📘 Composant principal
// ─────────────────────────────────────────────
export default function ObjectifPrepaForm({ open, onClose, id }: Props) {
  const { data: paginated, isLoading } = useObjectifsPrepa();
  const createMutation = useCreateObjectifPrepa();
  const updateMutation = useUpdateObjectifPrepa();

  // ✅ On mémorise la liste (évite les warnings ESLint)
  const objectifs = useMemo(() => paginated?.results ?? [], [paginated]);

  const [form, setForm] = useState<Partial<ObjectifPrepa>>({
    annee: new Date().getFullYear(),
  });
  const [saving, setSaving] = useState(false);
  const [showCentreModal, setShowCentreModal] = useState(false);
  const [centreLabel, setCentreLabel] = useState("");

  // ───────────────────────────────
  // 🔁 Préremplir le formulaire si édition
  // ───────────────────────────────
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

  // ───────────────────────────────
  // 💾 Soumission du formulaire
  // ───────────────────────────────
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

  // ───────────────────────────────
  // ⏳ Loader initial
  // ───────────────────────────────
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

  // ───────────────────────────────
  // 🧱 Formulaire principal
  // ─────────────────────────────────────────────
  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? "Modifier l’objectif Prépa" : "Nouvel objectif Prépa"}</DialogTitle>

        <DialogContent dividers>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Informations principales
            </Typography>

            <Grid container spacing={2}>
              {/* Année */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Année"
                  type="number"
                  fullWidth
                  required
                  value={form.annee ?? new Date().getFullYear()}
                  onChange={(e) =>
                    handleChange("annee", Number(e.target.value) || new Date().getFullYear())
                  }
                />
              </Grid>

              {/* Objectif */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Objectif (personnes)"
                  type="number"
                  fullWidth
                  required
                  value={form.valeur_objectif ?? ""}
                  onChange={(e) => handleChange("valeur_objectif", Number(e.target.value) || 0)}
                />
              </Grid>

              {/* Centre */}
              <Grid item xs={12} md={8}>
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
              </Grid>

              {/* Département */}
              <Grid item xs={12} md={4}>
                <TextField
                  label="Département"
                  fullWidth
                  value={form.departement ?? ""}
                  onChange={(e) => handleChange("departement", e.target.value)}
                />
              </Grid>

              {/* Commentaire */}
              <Grid item xs={12}>
                <RichHtmlEditorField
                  label="Commentaire"
                  value={form.commentaire ?? ""}
                  onChange={(value) => handleChange("commentaire", value)}
                  placeholder="Ajouter un commentaire enrichi…"
                  minHeight={120}
                />
              </Grid>
            </Grid>
          </Paper>
        </DialogContent>

        {/* 🎯 Actions */}
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

      {/* 🏫 Sélecteur de centre */}
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
