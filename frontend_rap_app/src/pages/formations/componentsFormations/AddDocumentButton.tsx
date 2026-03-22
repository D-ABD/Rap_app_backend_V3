// src/pages/formations/componentsFormations/AddDocumentButton.tsx
import { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Box,
  Typography,
  LinearProgress,
} from "@mui/material";
import { toast } from "react-toastify";
import { DocumentFormData, TypeDocumentChoice } from "src/types/document";
import api from "src/api/axios";

interface Props {
  formationId: number;
  label?: string;
  onCreated?: (doc: Document) => void;
}

export default function AddDocumentButton({
  formationId,
  label = "📎 Ajouter un document",
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [types, setTypes] = useState<TypeDocumentChoice[]>([]);
  const [form, setForm] = useState<DocumentFormData>({
    nom_fichier: "",
    fichier: null,
    type_document: "",
    formation: formationId,
  });

  const handleOpen = async () => {
    setOpen(true);
    if (types.length === 0) {
      try {
        const res = await api.get<{ data: TypeDocumentChoice[] }>("/documents/types/");
        setTypes(res.data.data);
      } catch {
        toast.error("Impossible de charger les types de document");
      }
    }
  };

  const handleClose = () => {
    if (!busy) setOpen(false);
  };

  const handleChange = (field: keyof DocumentFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.nom_fichier.trim() || !form.fichier || !form.type_document) {
      toast.warning("Veuillez remplir tous les champs et sélectionner un fichier.");
      return;
    }

    try {
      setBusy(true);

      const formData = new FormData();
      formData.append("nom_fichier", form.nom_fichier);
      formData.append("type_document", form.type_document);
      formData.append("formation", String(formationId));
      if (form.fichier) formData.append("fichier", form.fichier);

      const res = await api.post<{ data: Document }>("/documents/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("📄 Document ajouté avec succès !");
      setOpen(false);
      setForm({
        nom_fichier: "",
        fichier: null,
        type_document: "",
        formation: formationId,
      });
      if (onCreated) onCreated(res.data.data);
    } catch (_err) {
      toast.error("Erreur lors de l’ajout du document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={handleOpen}
        disabled={busy}
        aria-label={label}
        title={label}
      >
        {busy ? "⏳" : "📎"} {label}
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un document</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
            <TextField
              label="Nom du fichier"
              value={form.nom_fichier}
              onChange={(e) => handleChange("nom_fichier", e.target.value)}
              fullWidth
              disabled={busy}
              required
            />

            <TextField
              label="Type de document"
              select
              value={form.type_document}
              onChange={(e) => handleChange("type_document", e.target.value)}
              fullWidth
              disabled={busy}
              required
            >
              {types.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <Button
              variant="outlined"
              component="label"
              disabled={busy}
              color={form.fichier ? "success" : "primary"}
            >
              {form.fichier ? "✅ Fichier sélectionné" : "📁 Choisir un fichier"}
              <input
                type="file"
                hidden
                onChange={(e) => handleChange("fichier", e.target.files?.[0] || null)}
              />
            </Button>

            {form.fichier && (
              <Typography variant="body2" color="text.secondary">
                {form.fichier.name}
              </Typography>
            )}

            {busy && <LinearProgress />}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={busy}>
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
