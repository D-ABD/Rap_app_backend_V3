// src/components/ui/DocumentForm.tsx

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Link,
} from "@mui/material";

import FormationSelectModal from "../../components/modals/FormationSelectModal";
import FormSectionCard from "../../components/forms/FormSectionCard";
import FormActionsBar from "../../components/forms/FormActionsBar";
import useForm from "../../hooks/useForm";
import { useDocumentsApi } from "../../hooks/useDocuments";
import type { DocumentFormInitialValues, TypeDocumentChoice } from "../../types/document";

type Props = {
  formationId?: string;
  initialValues?: DocumentFormInitialValues;
  documentId?: string;
};

export default function DocumentForm({ formationId, initialValues, documentId }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const scopedFormationId = useMemo(() => {
    return (
      initialValues?.formation ??
      formationId ??
      searchParams.get("formation_id") ??
      searchParams.get("formation") ??
      ""
    );
  }, [formationId, initialValues?.formation, searchParams]);

  const returnToListUrl = useMemo(() => {
    return scopedFormationId ? `/documents?formation=${scopedFormationId}` : "/documents";
  }, [scopedFormationId]);

  const [formationNom, setFormationNom] = useState<string | null>(
    initialValues?.formation_nom ?? null
  );
  const [loading, setLoading] = useState(!!scopedFormationId && !initialValues?.formation_nom);
  const [showModal, setShowModal] = useState(false);
  const [typeDocumentChoices, setTypeDocumentChoices] = useState<TypeDocumentChoice[]>([]);

  const { createDocument, updateDocument, fetchTypeDocuments } = useDocumentsApi();

  const { values, errors, setErrors, setValues } = useForm<{
    nom_fichier: string;
    fichier: File | null;
    type_document: string;
    formation: string | number;
  }>({
    nom_fichier: initialValues?.nom_fichier ?? "",
    fichier: null,
    type_document: initialValues?.type_document ?? "",
    formation: scopedFormationId ? Number(scopedFormationId) : "",
  });

  useEffect(() => {
    const id = scopedFormationId ? Number(scopedFormationId) : null;
    if (!id || formationNom) return;

    import("../../api/axios").then((api) => {
      api.default
        .get(`/formations/${id}/`)
        .then((res) => setFormationNom(res.data?.data?.nom ?? res.data?.nom))
        .catch(() => toast.error("Formation introuvable"))
        .finally(() => setLoading(false));
    });
  }, [scopedFormationId, formationNom]);

  useEffect(() => {
    fetchTypeDocuments()
      .then(setTypeDocumentChoices)
      .catch(() => toast.error("Erreur chargement des types de document"));
  }, [fetchTypeDocuments]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!values.nom_fichier || !values.type_document || !values.formation) {
      toast.error("Tous les champs sont requis.");
      return;
    }

    try {
      if (documentId) {
        await updateDocument(Number(documentId), {
          nom_fichier: values.nom_fichier,
          fichier: values.fichier,
          type_document: values.type_document,
          formation: Number(values.formation),
        });
        toast.success("Document modifié avec succès");
      } else {
        await createDocument({
          nom_fichier: values.nom_fichier,
          fichier: values.fichier,
          type_document: values.type_document,
          formation: Number(values.formation),
        });
        toast.success("Document créé avec succès");
      }

      navigate(returnToListUrl);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: {
          data?: Partial<Record<keyof typeof values, string[]>>;
        };
      };

      if (axiosError.response?.data) {
        const formattedErrors: Partial<Record<keyof typeof values, string>> = {};
        for (const key in axiosError.response.data) {
          const val = axiosError.response.data[key as keyof typeof values];
          if (Array.isArray(val)) {
            formattedErrors[key as keyof typeof values] = val.join(" ");
          }
        }
        setErrors(formattedErrors);
        toast.error("Erreur lors de la soumission");
      }
    }
  };

  if (loading) {
    return (
      <FormSectionCard title="Chargement">
        <Box display="flex" justifyContent="center" alignItems="center" py={2}>
          <CircularProgress />
        </Box>
      </FormSectionCard>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {documentId && initialValues && (
          <FormSectionCard
            title="Document existant"
            subtitle="Consultez les informations déjà enregistrées avant modification."
          >
            <Stack spacing={1}>
              {initialValues.type_document_display && (
                <Typography>🗂️ Type : {initialValues.type_document_display}</Typography>
              )}

              {initialValues.download_url && (
                <Typography>
                  📥{" "}
                  <Link href={initialValues.download_url} target="_blank" rel="noreferrer">
                    Télécharger
                  </Link>
                </Typography>
              )}
            </Stack>
          </FormSectionCard>
        )}

        {!formationId && !initialValues?.formation && (
          <FormSectionCard
            title="Formation associée"
            subtitle="Sélectionnez la formation liée à ce document."
          >
            <Stack spacing={2}>
              {formationNom ? (
                <Typography variant="body2">📚 {formationNom}</Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  — Aucune formation sélectionnée
                </Typography>
              )}

              <Box>
                <Button variant="outlined" onClick={() => setShowModal(true)}>
                  {formationNom ? "Changer de formation" : "🔍 Sélectionner une formation"}
                </Button>
              </Box>

              <FormationSelectModal
                show={showModal}
                onClose={() => setShowModal(false)}
                onSelect={(pick) => {
                  setValues((prev) => ({ ...prev, formation: pick.id }));
                  setFormationNom(pick.nom ?? "—");
                  setShowModal(false);
                  toast.info(`Formation sélectionnée : ${pick.nom}`);
                }}
              />
            </Stack>
          </FormSectionCard>
        )}

        <FormSectionCard
          title="Informations du document"
          subtitle="Renseignez le nom, le type et le fichier à importer."
        >
          <Stack spacing={2}>
            <TextField
              label="Nom du fichier"
              value={values.nom_fichier}
              onChange={(e) => setValues((prev) => ({ ...prev, nom_fichier: e.target.value }))}
              error={!!errors.nom_fichier}
              helperText={errors.nom_fichier}
              fullWidth
            />

            <Select
              value={values.type_document}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  type_document: e.target.value,
                }))
              }
              displayEmpty
              fullWidth
            >
              <MenuItem value="">-- Sélectionner un type --</MenuItem>
              {typeDocumentChoices.map((choice) => (
                <MenuItem key={choice.value} value={choice.value}>
                  {choice.label}
                </MenuItem>
              ))}
            </Select>

            {errors.type_document && (
              <Typography color="error" variant="body2">
                {errors.type_document}
              </Typography>
            )}

            <Button variant="outlined" component="label">
              📎 Importer un fichier
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setValues((prev) => ({ ...prev, fichier: file ?? null }));
                }}
              />
            </Button>

            {documentId && initialValues?.download_url && (
              <Typography variant="body2" color="text.secondary">
                📥{" "}
                <Link href={initialValues.download_url} target="_blank" rel="noreferrer">
                  Télécharger le fichier actuel
                </Link>{" "}
                — laisser vide pour le conserver.
              </Typography>
            )}
          </Stack>
        </FormSectionCard>

        <FormActionsBar>
          <Button
            variant="outlined"
            color="secondary"
            type="button"
            onClick={() => navigate(returnToListUrl)}
          >
            Annuler
          </Button>

          <Button type="submit" variant="contained" color="success">
            💾 Enregistrer
          </Button>
        </FormActionsBar>
      </Stack>
    </Box>
  );
}