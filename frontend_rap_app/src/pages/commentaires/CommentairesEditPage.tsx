// ======================================================
// src/pages/commentaires/CommentairesEditPage.tsx
// Édition d’un commentaire avec Quill (styles/couleurs conservés)
// + archivage / désarchivage — version fluide (sans reset de curseur)
// ======================================================

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { useQuill } from "react-quilljs";
import { defaultModules, defaultFormats } from "../../utils/registerQuillFormats";
import "quill/dist/quill.snow.css";

import api from "../../api/axios";
import useForm from "../../hooks/useForm";
import PageTemplate from "../../components/PageTemplate";
import PageSection from "../../components/PageSection";
import CommentaireContent from "./CommentaireContent";
import { Commentaire } from "../../types/commentaire";

export default function CommentairesEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<Commentaire | null>(null);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [busyArchive, setBusyArchive] = useState(false);
  const [formationIdFromComment, setFormationIdFromComment] = useState<number | null>(null);

  const scopedFormationId = useMemo(() => {
    const raw = searchParams.get("formation") || searchParams.get("formation_id");
    if (!raw) return formationIdFromComment;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : formationIdFromComment;
  }, [formationIdFromComment, searchParams]);

  const returnToListUrl = useMemo(() => {
    return scopedFormationId ? `/commentaires?formation=${scopedFormationId}` : "/commentaires";
  }, [scopedFormationId]);

  const { values, errors, setValues, setErrors } = useForm<{
    contenu: string;
    formation: number | null;
  }>({
    contenu: "",
    formation: null,
  });

  /* ---------- Initialisation Quill ---------- */
  const { quill, quillRef } = useQuill({
    theme: "snow",
    modules: defaultModules,
    formats: defaultFormats,
  });

  /* ---------- Initialisation du contenu dans Quill ---------- */
  useEffect(() => {
    if (!quill) return;

    const isEmpty = quill.root.innerHTML === "<p><br></p>" || quill.getText().trim() === "";
    if (values.contenu && isEmpty) {
      quill.clipboard.dangerouslyPasteHTML(values.contenu);
    }
  }, [quill, values.contenu]); // ✅ ajout de values.contenu

  /* ---------- Chargement du commentaire ---------- */
  useEffect(() => {
    if (!id) {
      toast.error("L'identifiant du commentaire est manquant.");
      navigate(returnToListUrl);
      return;
    }

    api
      .get(`/commentaires/${id}/`)
      .then((res) => {
        const data = res.data?.data && typeof res.data.data === "object" ? res.data.data : res.data;
        if (!data || typeof data !== "object" || !data.id)
          throw new Error("Réponse invalide du serveur");

        setValues({
          contenu: data.contenu ?? "",
          formation: data.formation_id ?? data.formation ?? null,
        });

        setMeta(data);
        setIsArchived(data.statut_commentaire === "archive");
        setFormationIdFromComment(data.formation_id ?? data.formation ?? null);
      })
      .catch(() => {
        toast.error("Le commentaire n'a pas pu être chargé.");
        navigate(returnToListUrl);
      })
      .finally(() => setLoading(false));
  }, [id, navigate, returnToListUrl, setValues]);

  /* ---------- Soumission ---------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const contenu = (quill?.root.innerHTML || "").trim();

    if (!contenu || contenu === "<p><br></p>") {
      setErrors({ contenu: "Le contenu ne peut pas être vide." });
      return;
    }
    if (values.formation == null) {
      toast.error("La formation liée au commentaire est manquante.");
      return;
    }

    try {
      await api.put(`/commentaires/${id}/`, {
        contenu,
        formation: values.formation,
      });
      toast.success("Commentaire mis à jour avec succès.");
      setShowNavigationModal(true);
    } catch {
      toast.error("Le commentaire n'a pas pu être modifié.");
    }
  };

  /* ---------- Archivage / Désarchivage ---------- */
  const handleArchiveToggle = async () => {
    if (!id) return;
    setBusyArchive(true);

    try {
      const endpoint = isArchived
        ? `/commentaires/${id}/desarchiver/`
        : `/commentaires/${id}/archiver/`;

      const res = await api.post(endpoint);
      const updated = res.data?.data ?? res.data;

      setMeta(updated);
      setIsArchived(updated?.statut_commentaire === "archive");

      toast.success(
        isArchived ? "Commentaire désarchivé avec succès." : "Commentaire archivé avec succès."
      );
    } catch {
      toast.error("Le changement de statut du commentaire a échoué.");
    } finally {
      setBusyArchive(false);
    }
  };

  /* ---------- Rendu ---------- */
  return (
    <PageTemplate
      title="Modifier un commentaire"
      subtitle="Mettez à jour le commentaire en conservant son contexte de formation."
      maxWidth="lg"
      backButton
      onBack={() => navigate(returnToListUrl)}
      actions={
        !loading && (
          <Button
            variant="contained"
            color="warning"
            disabled={busyArchive}
            onClick={handleArchiveToggle}
          >
            {busyArchive ? "⏳" : isArchived ? "♻️ Désarchiver" : "📦 Archiver"}
          </Button>
        )
      }
    >
      {loading ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
          <CircularProgress />
          <Typography>Chargement du commentaire...</Typography>
        </Box>
      ) : (
        <PageSection>
          <Stack spacing={2} component="form" onSubmit={handleSubmit}>
            {/* --- Meta infos --- */}
            <Box sx={{ bgcolor: "grey.100", p: 2, borderRadius: 1 }}>
              <Typography variant="body2">
                📚 Formation : <strong>{meta?.formation_nom || "—"}</strong>
              </Typography>
              <Typography variant="body2">
                📍 Centre : <strong>{meta?.centre_nom || "—"}</strong>
              </Typography>
              <Typography variant="body2">
                📌 Statut : <strong>{isArchived ? "Archivé" : meta?.statut_nom || "—"}</strong>
              </Typography>
              <Typography variant="body2">
                🧩 Type d’offre : <strong>{meta?.type_offre_nom || "—"}</strong>
              </Typography>
              <Typography variant="body2">
                🔢 Numéro d’offre : <strong>{meta?.num_offre || "—"}</strong>
              </Typography>
              <Typography variant="body2" mt={1}>
                🧪 Saturation au moment du commentaire :{" "}
                <strong>{meta?.saturation_formation ?? "—"}%</strong>
              </Typography>
              <Typography variant="body2">
                📈 Saturation actuelle (GESPERS) : <strong>{meta?.taux_saturation ?? "—"}%</strong>
              </Typography>
              <Typography variant="body2">
                🔁 Transformation actuelle (GESPERS) : <strong>{meta?.taux_transformation ?? "—"}%</strong>
              </Typography>
            </Box>

            {/* --- Contenu actuel --- */}
            <Typography variant="subtitle1">Contenu actuel</Typography>
            <CommentaireContent html={values.contenu || "<em>—</em>"} />

            {/* --- Éditeur Quill --- */}
            <Typography variant="subtitle1" mt={2}>
              Modifier le contenu *
            </Typography>
            <Box
              sx={{
                "& .ql-editor ul": {
                  listStyle: "disc",
                  paddingLeft: "1.5rem",
                  margin: "0.5rem 0",
                },
                "& .ql-editor ol": {
                  listStyle: "decimal",
                  paddingLeft: "1.5rem",
                  margin: "0.5rem 0",
                },
                "& .ql-editor li > p": {
                  margin: 0,
                },
              }}
            >
              <div
                ref={quillRef}
                style={{
                  height: 200,
                  backgroundColor: "#fff",
                  borderRadius: 8,
                  marginBottom: "1rem",
                }}
              />
            </Box>
            {errors.contenu && (
              <Typography variant="caption" color="error">
                {errors.contenu}
              </Typography>
            )}

            {/* --- Boutons --- */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button type="submit" variant="contained" color="success">
                💾 Enregistrer
              </Button>
              <Button
                variant="outlined"
                onClick={() =>
                  values.formation
                    ? navigate(`/formations/${values.formation}`)
                    : navigate(returnToListUrl)
                }
              >
                Annuler
              </Button>
            </Stack>
          </Stack>
        </PageSection>
      )}

      {/* --- Confirmation après sauvegarde --- */}
      <Dialog
        open={showNavigationModal}
        onClose={() => setShowNavigationModal(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>✅ Votre commentaire a bien été mis à jour</DialogTitle>
        <DialogContent>
          <DialogContentText>Que souhaitez-vous faire ensuite ?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate(`/formations/${values.formation}`)} variant="outlined">
            ← Retour à la formation
          </Button>
          <Button onClick={() => navigate(returnToListUrl)} variant="contained">
            💬 Voir commentaires
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
