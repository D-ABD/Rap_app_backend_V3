// ======================================================
// src/pages/commentaires/CommentaireForm.tsx
// Formulaire de création / édition de commentaire
// (refactor LOT 7 : structure visuelle harmonisée,
// logique métier inchangée)
// ======================================================

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useQuill } from "react-quilljs";
import "quill/dist/quill.snow.css";

import { colorOptions } from "../../utils/registerQuillFormats";
import FormationSelectModal from "../../components/modals/FormationSelectModal";
import EntityPickerField from "../../components/forms/fields/EntityPickerField";
import FormSectionCard from "../../components/forms/FormSectionCard";
import FormActionsBar from "../../components/forms/FormActionsBar";
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
  const [searchParams] = useSearchParams();

  const scopedFormationId = useMemo(() => {
    return (
      formationId ||
      searchParams.get("formation_id") ||
      searchParams.get("formation") ||
      ""
    );
  }, [formationId, searchParams]);

  const returnToListUrl = useMemo(() => {
    return scopedFormationId
      ? `/commentaires?formation=${scopedFormationId}`
      : "/commentaires";
  }, [scopedFormationId]);

  const [formationNom, setFormationNom] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!scopedFormationId);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { values, errors, setErrors, setValues } = useForm<CommentaireFormData>({
    formation: scopedFormationId,
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

    const isEmpty =
      quill.root.innerHTML === "<p><br></p>" || quill.getText().trim() === "";

    if (contenuInitial && isEmpty) {
      quill.clipboard.dangerouslyPasteHTML(contenuInitial);
    }

    if (readonlyFormation) {
      quill.disable();
    }
  }, [quill, contenuInitial, readonlyFormation]);

  /* ---------- Mise à jour du formationId ---------- */
  useEffect(() => {
    if (scopedFormationId) {
      setValues((prev) => ({ ...prev, formation: scopedFormationId }));
    }
  }, [scopedFormationId, setValues]);

  /* ---------- Chargement du nom de la formation ---------- */
  useEffect(() => {
    if (!scopedFormationId) {
      setLoading(false);
      return;
    }

    api
      .get(`/formations/${scopedFormationId}/`)
      .then((res) => setFormationNom(res.data?.data?.nom ?? res.data?.nom))
      .catch(() => toast.error("La formation sélectionnée est introuvable."))
      .finally(() => setLoading(false));
  }, [scopedFormationId]);

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
      formation: scopedFormationId || values.formation || null,
    };

    if (!payload.formation) {
      toast.error("Veuillez sélectionner une formation.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/commentaires/", payload);
      toast.success("Commentaire créé avec succès.");
      if (onSubmit) {
        await onSubmit(payload);
      }
      navigate(returnToListUrl);
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
        toast.error("Le commentaire n'a pas pu être créé.");
      } else {
        toast.error("Une erreur est survenue pendant l'enregistrement du commentaire.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Chargement ---------- */
  if (loading) {
    return (
      <FormSectionCard title="Chargement">
        <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={2}>
          <CircularProgress />
          <Typography>Chargement de la formation...</Typography>
        </Box>
      </FormSectionCard>
    );
  }

  /* ---------- Rendu ---------- */
  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {!readonlyFormation && (
          <FormSectionCard
            title="Formation"
            subtitle="Choisissez la formation concernée par le commentaire."
          >
            <Stack spacing={2}>
              <EntityPickerField
                label="Formation"
                displayValue={formationNom ?? ""}
                placeholder="Cliquez pour rechercher une formation…"
                onOpen={() => setShowModal(true)}
                helperText={
                  formationNom ? (
                    <Typography component="span" variant="body2" color="text.secondary">
                      📚 Formation sélectionnée :{" "}
                      <Typography
                        component="strong"
                        variant="body2"
                        sx={{ color: "success.main" }}
                      >
                        {formationNom}
                      </Typography>
                    </Typography>
                  ) : (
                    "Choisissez la formation concernée par le commentaire."
                  )
                }
              />

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
            </Stack>
          </FormSectionCard>
        )}

        <FormSectionCard
          title="Contenu"
          subtitle="Rédigez le commentaire associé à la formation."
        >
          <Stack spacing={1.5}>
            <Typography id="commentaire-label" variant="subtitle2">
              Contenu
            </Typography>

            <Box
              sx={{
                "& .ql-toolbar": {
                  borderTopLeftRadius: 1,
                  borderTopRightRadius: 1,
                },
                "& .ql-container": {
                  borderBottomLeftRadius: 1,
                  borderBottomRightRadius: 1,
                },
                "& .ql-editor": {
                  minHeight: 220,
                  overflowY: "auto",
                  backgroundColor: "background.paper",
                  padding: "0.75rem",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
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
          </Stack>
        </FormSectionCard>

        {!readonlyFormation && (
          <FormActionsBar>
            <Button
              type="button"
              variant="outlined"
              onClick={() => {
                if (!submitting && window.confirm("Annuler les modifications ?")) {
                  navigate(returnToListUrl);
                }
              }}
            >
              Annuler
            </Button>

            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={20} color="inherit" /> : "💾 Enregistrer"}
            </Button>
          </FormActionsBar>
        )}
      </Stack>
    </Box>
  );
}