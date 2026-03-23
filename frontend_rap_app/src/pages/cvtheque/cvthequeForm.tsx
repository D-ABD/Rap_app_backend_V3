import React, { useEffect, useState } from "react";
import {
  Box,
  Stack,
  TextField,
  Button,
  Typography,
  InputLabel,
  MenuItem,
  Link,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";

import UploadFileIcon from "@mui/icons-material/UploadFile";

import { CVThequeDetail, CVThequePayload } from "src/types/cvtheque";
import CandidatsSelectModal, {
  CandidatPick,
} from "src/components/modals/CandidatsSelectModal";

export type CVThequeFormProps = {
  defaultValues?: Partial<CVThequeDetail>;
  onSubmit: (payload: CVThequePayload) => Promise<void>;
  loading?: boolean;
  isEdit?: boolean;
};

export default function CVThequeForm({
  defaultValues = {},
  onSubmit,
  loading = false,
  isEdit = false,
}: CVThequeFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Form state
  const [form, setForm] = useState<CVThequePayload>({
    titre: defaultValues.titre || "",
    document_type: defaultValues.document_type || "CV",
    mots_cles: defaultValues.mots_cles || "",
    candidat: defaultValues.candidat?.id ?? null,
    est_public: defaultValues.est_public ?? true,

    // ⚠️ fichier = uniquement si nouvel upload
    fichier: null,
  });

  const [fileName, setFileName] = useState<string | null>(null);

  // ---------------------------
  // MODAL CANDIDAT
  // ---------------------------
  const [showCandidatModal, setShowCandidatModal] = useState(false);

  const [selectedCandidat, setSelectedCandidat] = useState<{
    id: number | string;
    nom_complet: string;
  } | null>(
    defaultValues.candidat
      ? {
          id: defaultValues.candidat.id,
          nom_complet:
            `${defaultValues.candidat.prenom ?? ""} ${defaultValues.candidat.nom ?? ""}`.trim() ||
            `Candidat #${defaultValues.candidat.id}`,
        }
      : null
  );

  useEffect(() => {
    if (!defaultValues.candidat) return;
    setSelectedCandidat({
      id: defaultValues.candidat.id,
      nom_complet:
        `${defaultValues.candidat.prenom ?? ""} ${defaultValues.candidat.nom ?? ""}`.trim() ||
        `Candidat #${defaultValues.candidat.id}`,
    });
  }, [defaultValues.candidat]);

  const handleChange = (field: keyof CVThequePayload, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    const candidatId = defaultValues.candidat?.id ?? searchParams.get("candidat");
    if (candidatId) {
      navigate(`/cvtheque?search=&candidat=${candidatId}`);
      return;
    }
    navigate("/cvtheque");
  };

  // ---------------------------
  // FICHIER
  // ---------------------------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    handleChange("fichier", f);
  };

  // ---------------------------
  // SUBMIT
  // ---------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.candidat) {
      alert("Veuillez sélectionner un candidat.");
      return;
    }

    await onSubmit(form);
  };

  const DOCUMENT_TYPES = [
    { value: "CV", label: "Curriculum Vitae" },
    { value: "LM", label: "Lettre de motivation" },
    { value: "DIPLOME", label: "Diplôme / Certificat" },
    { value: "AUTRE", label: "Autre document" },
  ];

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ maxWidth: 600, mx: "auto" }}>
      
      {/* CANDIDAT */}
      <Box mb={3}>
        <TextField
          label="Candidat"
          fullWidth
          value={selectedCandidat?.nom_complet || "Aucun candidat sélectionné"}
          InputProps={{ readOnly: true }}
        />

        <Button variant="outlined" sx={{ mt: 1 }} onClick={() => setShowCandidatModal(true)}>
          🔍 {selectedCandidat ? "Changer de candidat" : "Sélectionner un candidat"}
        </Button>
      </Box>

      <CandidatsSelectModal
        show={showCandidatModal}
        onClose={() => setShowCandidatModal(false)}
        onSelect={(c: CandidatPick) => {
          setSelectedCandidat({
            id: c.id,
            nom_complet: c.nom_complet,
          });
          handleChange("candidat", c.id);
          setShowCandidatModal(false);
        }}
        onlyCandidateLike
        onlyActive={false}
        requireLinkedUser={false}
      />

      {/* FICHIER EN ÉDITION */}
      {isEdit && (
        <Box mb={3}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            Fichier actuel :
          </Typography>

          {defaultValues.download_url ? (
            <Link
              href={defaultValues.download_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Télécharger le fichier existant
            </Link>
          ) : (
            <Typography color="text.secondary">Aucun fichier</Typography>
          )}

          {/* Remplacer fichier */}
          <Button
            component="label"
            variant="outlined"
            fullWidth
            startIcon={<UploadFileIcon />}
            sx={{ textTransform: "none", mt: 2 }}
          >
            {fileName || "Remplacer le fichier..."}
            <input type="file" hidden accept=".pdf,.doc,.docx" onChange={handleFileSelect} />
          </Button>
        </Box>
      )}

      {/* FICHIER EN CRÉATION */}
      {!isEdit && (
        <Box mb={3}>
          <InputLabel>Fichier (PDF / DOC / DOCX)</InputLabel>
          <Button
            component="label"
            variant="outlined"
            fullWidth
            startIcon={<UploadFileIcon />}
            sx={{ textTransform: "none" }}
          >
            {fileName || "Choisir un fichier..."}
            <input type="file" hidden accept=".pdf,.doc,.docx" onChange={handleFileSelect} />
          </Button>

          {!form.fichier && (
            <Typography color="error" variant="body2" mt={0.5}>
              Un fichier est requis.
            </Typography>
          )}
        </Box>
      )}

      {/* TYPE */}
      <TextField
        select
        fullWidth
        label="Type de document"
        sx={{ mb: 3 }}
        value={form.document_type}
        onChange={(e) => handleChange("document_type", e.target.value)}
      >
        {DOCUMENT_TYPES.map((t) => (
          <MenuItem key={t.value} value={t.value}>
            {t.label}
          </MenuItem>
        ))}
      </TextField>

      {/* TITRE */}
      <TextField
        fullWidth
        label="Titre"
        sx={{ mb: 3 }}
        value={form.titre}
        onChange={(e) => handleChange("titre", e.target.value)}
      />

      {/* MOTS-CLÉS */}
      <TextField
        fullWidth
        label="Mots-clés (séparés par des virgules)"
        multiline
        minRows={2}
        value={form.mots_cles}
        onChange={(e) => handleChange("mots_cles", e.target.value)}
      />

      {/* SUBMIT */}
      <Stack direction="row" spacing={2} justifyContent="flex-end" mt={4}>
        <Button variant="outlined" type="button" onClick={handleCancel}>
          Annuler
        </Button>

        <Button variant="contained" type="submit" disabled={loading}>
          {loading ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Créer"}
        </Button>
      </Stack>
    </Box>
  );
}
