import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Stack,
  InputLabel,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import { CVThequeDetail, CVThequePayload, DocumentType } from "src/types/cvtheque";
import FormSectionCard from "../../components/forms/FormSectionCard";
import FormActionsBar from "../../components/forms/FormActionsBar";

type Props = {
  defaultValues?: Partial<CVThequeDetail>;
  onSubmit: (payload: Omit<CVThequePayload, "candidat">) => Promise<void>;
  loading?: boolean;
};

export default function CVThequeFormCandidat({
  defaultValues = {},
  onSubmit,
  loading = false,
}: Props) {
  const navigate = useNavigate();

  const [form, setForm] = useState<{
    titre: string;
    document_type: DocumentType;
    mots_cles: string;
    fichier: File | null;
  }>({
    titre: defaultValues.titre || "",
    document_type: defaultValues.document_type || "CV",
    mots_cles: defaultValues.mots_cles || "",
    fichier: null,
  });

  const isEdit = Boolean(defaultValues.id);

  const handleChange = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    handleChange("fichier", e.target.files[0]);
  };

  const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
    { value: "CV", label: "Curriculum Vitae" },
    { value: "LM", label: "Lettre de motivation" },
    { value: "DIPLOME", label: "Diplôme / Certificat" },
    { value: "AUTRE", label: "Autre document" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEdit && !form.fichier) {
      alert("Merci d'ajouter un fichier.");
      return;
    }

    await onSubmit({
      ...form,
      est_public: true,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3} sx={{ maxWidth: 640, mx: "auto" }}>
        <FormSectionCard
          title="Informations du document"
          subtitle="Renseignez le titre, le type et les mots-clés du document."
        >
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Titre"
              value={form.titre}
              onChange={(e) => handleChange("titre", e.target.value)}
            />

            <TextField
              fullWidth
              select
              label="Type de document"
              value={form.document_type}
              onChange={(e) =>
                handleChange("document_type", e.target.value as DocumentType)
              }
            >
              {DOCUMENT_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Mots-clés (optionnel)"
              multiline
              minRows={2}
              value={form.mots_cles}
              onChange={(e) => handleChange("mots_cles", e.target.value)}
            />
          </Stack>
        </FormSectionCard>

        <FormSectionCard
          title="Fichier"
          subtitle={
            isEdit
              ? "Remplacez le fichier si nécessaire, sinon le document actuel sera conservé."
              : "Ajoutez le fichier à déposer dans la CVthèque."
          }
        >
          <Stack spacing={2}>
            <InputLabel>Fichier (PDF / DOC / DOCX)</InputLabel>

            <Button
              component="label"
              variant="outlined"
              fullWidth
              startIcon={<UploadFileIcon />}
              sx={{ textTransform: "none" }}
            >
              {form.fichier ? form.fichier.name : "Choisir un fichier"}
              <input type="file" hidden accept=".pdf,.doc,.docx" onChange={handleFile} />
            </Button>

            {isEdit && !form.fichier && (
              <Typography variant="body2" color="text.secondary">
                Le fichier actuel sera conservé si vous n'en sélectionnez pas un nouveau.
              </Typography>
            )}
          </Stack>
        </FormSectionCard>

        <FormActionsBar>
          <Button type="button" variant="outlined" onClick={() => navigate("/cvtheque/candidat")}>
            Annuler
          </Button>

          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? "Envoi..." : "Déposer"}
          </Button>
        </FormActionsBar>
      </Stack>
    </Box>
  );
}