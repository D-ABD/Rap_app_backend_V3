import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Stack,
  InputLabel,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import { CVThequePayload, DocumentType } from "src/types/cvtheque";

type Props = {
  onSubmit: (payload: Omit<CVThequePayload, "candidat">) => Promise<void>;
  loading?: boolean;
};

export default function CVThequeFormCandidat({
  onSubmit,
  loading = false,
}: Props) {
  const [form, setForm] = useState<{
    titre: string;
    document_type: DocumentType;
    mots_cles: string;
    fichier: File | null;
  }>({
    titre: "",
    document_type: "CV",
    mots_cles: "",
    fichier: null,
  });

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

    if (!form.fichier) {
      alert("Merci d'ajouter un fichier.");
      return;
    }

    await onSubmit({
      ...form,
      est_public: true, // 🔥 le backend accepte ça
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 500, mx: "auto" }}>
      <TextField
        fullWidth
        label="Titre"
        sx={{ mb: 3 }}
        value={form.titre}
        onChange={(e) => handleChange("titre", e.target.value)}
      />

      <TextField
        fullWidth
        select
        label="Type de document"
        sx={{ mb: 3 }}
        value={form.document_type}
        onChange={(e) => handleChange("document_type", e.target.value as DocumentType)}
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
        sx={{ mb: 3 }}
        value={form.mots_cles}
        onChange={(e) => handleChange("mots_cles", e.target.value)}
      />

      <Box sx={{ mb: 3 }}>
        <InputLabel>Fichier (PDF/DOC)</InputLabel>

        <Button
          component="label"
          variant="outlined"
          fullWidth
          startIcon={<UploadFileIcon />}
          sx={{ mt: 1 }}
        >
          {form.fichier ? form.fichier.name : "Choisir un fichier"}
          <input type="file" hidden accept=".pdf,.doc,.docx" onChange={handleFile} />
        </Button>
      </Box>

      <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
        <Button type="reset">Réinitialiser</Button>
        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? "Envoi..." : "Déposer"}
        </Button>
      </Stack>
    </Box>
  );
}
