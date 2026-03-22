// ======================================================
// src/pages/commentaires/CommentaireForm.tsx
// Formulaire de création / édition de commentaire
// (version finale fluide : plus de reset du curseur,
//  édition naturelle + TS safe + accessibilité)
// ======================================================

import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, CircularProgress, Stack, Typography, Paper } from "@mui/material";
import { useQuill } from "react-quilljs";
import "quill/dist/quill.snow.css";

import { colorOptions } from "../../utils/registerQuillFormats";
import FormationSelectModal from "../../components/modals/FormationSelectModal";
import useForm from "../../hooks/useForm";
import api from "../../api/axios";

/* ---------- Toolbar minimale ---------- */
const TOOLBAR = [
  ["bold", "italic", "strike"],
  [{ color: colorOptions }, { background: colorOptions }],
  ["clean"],
];

/* ---------- Types ---------- */
type Props = {
  formationId?: string;
  readonlyFormation?: boolean;
  contenuInitial?: string;
  onSubmit?: (payload: { contenu: string }) => Promise<void> | void;
};

interface CommentaireFormData {
  formation: string;
  contenu: string;
  [key: string]: unknown;
}

/* ---------- Composant ---------- */
export default function CommentaireForm({
  formationId,
  readonlyFormation = false,
  contenuInitial = "",
  onSubmit,
}: Props) {
  const navigate = useNavigate();

  const [formationNom, setFormationNom] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!formationId);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { values, errors, setErrors, setValues } = useForm<CommentaireFormData>({
    formation: formationId || "",
    contenu: contenuInitial || "",
  });

  /* ---------- Initialise Quill ---------- */
  const { quill, quillRef } = useQuill({
    theme: "snow",
    modules: {
      toolbar: { container: TOOLBAR },
      history: { delay: 500, maxStack: 100, userOnly: true },
      clipboard: { matchVisual: false },
    },
    formats: ["bold", "italic", "strike", "color", "background"],
  });

  /* ---------- Initialisation du contenu ---------- */
  useEffect(() => {
    if (!quill) return;

    // ⚙️ Injecte le contenu initial une seule fois
    const isEmpty = quill.root.innerHTML === "<p><br></p>" || quill.getText().trim() === "";
    if (contenuInitial && isEmpty) {
      quill.clipboard.dangerouslyPasteHTML(contenuInitial);
    }

    // 🔒 Lecture seule si nécessaire
    if (readonlyFormation) {
      quill.disable();
    }
  }, [quill, contenuInitial, readonlyFormation]);

  /* ---------- Mise à jour du formationId ---------- */
  useEffect(() => {
    if (formationId) {
      setValues((prev) => ({ ...prev, formation: formationId }));
    }
  }, [formationId, setValues]);

  /* ---------- Chargement du nom de la formation ---------- */
  useEffect(() => {
    if (!formationId) return;
    api
      .get(`/formations/${formationId}/`)
      .then((res) => setFormationNom(res.data.nom))
      .catch(() => toast.error("Formation introuvable"))
      .finally(() => setLoading(false));
  }, [formationId]);

  /* ---------- Soumission ---------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const contenuHtml = quill?.root.innerHTML?.trim() ?? "";
    const contenuText = quill?.getText()?.trim() ?? "";

    if (!contenuText) {
      toast.error("Le contenu du commentaire est requis.");
      return;
    }

    const payload = {
      contenu: contenuHtml,
      formation: formationId || values.formation || null,
    };

    if (!payload.formation) {
      toast.error("Veuillez sélectionner une formation.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/commentaires/", payload);
      toast.success("✅ Commentaire créé avec succès");
      if (onSubmit) onSubmit(payload);
      navigate("/commentaires");
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: Record<string, string[]> };
      };
      if (axiosError.response?.data) {
        const formattedErrors: Partial<Record<keyof CommentaireFormData, string>> = {};
        for (const key in axiosError.response.data) {
          const val = axiosError.response.data[key];
          if (Array.isArray(val)) {
            formattedErrors[key as keyof CommentaireFormData] = val.join(" ");
          }
        }
        setErrors(formattedErrors);
        toast.error("Erreur lors de la création du commentaire");
      } else {
        toast.error("Une erreur est survenue lors de l’envoi.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Rendu ---------- */
  return (
    <Paper sx={{ p: 3 }}>
      {loading ? (
        <CircularProgress />
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          {/* --- Sélecteur de formation --- */}
          {!readonlyFormation && (
            <>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowModal(true)}
                  aria-label={formationNom ? "Changer de formation" : "Rechercher une formation"}
                >
                  🔍 {formationNom ? "Changer de formation" : "Rechercher une formation"}
                </Button>

                {formationNom && (
                  <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                    📚 Formation sélectionnée :{" "}
                    <strong style={{ color: "#2e7d32" }}>{formationNom}</strong>
                  </Typography>
                )}
              </Box>

              <FormationSelectModal
                show={showModal}
                onClose={() => setShowModal(false)}
                onSelect={(pick) => {
                  setValues((prev) => ({
                    ...prev,
                    formation: String(pick.id),
                  }));
                  setFormationNom(pick.nom ?? "");
                  setShowModal(false);
                }}
              />
            </>
          )}

          {/* --- Zone contenu --- */}
          <Box sx={{ mb: 2 }}>
            <Typography id="commentaire-label" variant="subtitle2" gutterBottom>
              Contenu
            </Typography>

            <Box
              sx={{
                "& .ql-editor": {
                  minHeight: 200,
                  overflowY: "auto",
                  backgroundColor: "#fff",
                  borderRadius: 1,
                  padding: "0.5rem",
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                },
              }}
            >
              <div
                ref={quillRef}
                aria-labelledby="commentaire-label"
                role="textbox"
                aria-multiline="true"
              />
            </Box>

            {errors.contenu && (
              <Typography variant="caption" color="error">
                {errors.contenu}
              </Typography>
            )}
          </Box>

          {/* --- Actions --- */}
          {!readonlyFormation && (
            <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
              <Button type="submit" variant="contained" color="success" disabled={submitting}>
                {submitting ? <CircularProgress size={20} color="inherit" /> : "💾 Enregistrer"}
              </Button>

              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  if (!submitting && window.confirm("Annuler les modifications ?")) {
                    navigate("/commentaires");
                  }
                }}
              >
                Annuler
              </Button>
            </Stack>
          )}
        </Box>
      )}
    </Paper>
  );
}
