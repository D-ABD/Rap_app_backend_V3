// src/pages/formations/componentsFormations/FormationsDocumentsPage.tsx
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Box,
  Divider,
  Stack,
  Typography,
  Button as MuiButton,
  CircularProgress,
} from "@mui/material";
import PageTemplate from "../../../components/PageTemplate";
import FormationSection from "./FormationSection";
import api from "../../../api/axios";
import type { Formation } from "../../../types/formation";
import type { Document } from "../../../types/document";

export default function FormationsDocumentsPage() {
  const { formationId } = useParams();
  const id = formationId ? parseInt(formationId, 10) : undefined;
  const navigate = useNavigate();

  const [formation, setFormation] = useState<Formation | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(false);

    Promise.all([
      api.get(`/formations/${id}/`).then((res) => setFormation(res.data.data)),
      api.get(`/documents/?formation=${id}`).then((res) => {
        const results = res.data?.data?.results || [];
        setDocuments(results);
      }),
    ])
      .catch(() => {
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (!id) {
    return (
      <PageTemplate title="Documents de la formation" backButton onBack={() => navigate(-1)}>
        <Typography color="error">❌ Formation non spécifiée.</Typography>
      </PageTemplate>
    );
  }

  if (loading) {
    return (
      <PageTemplate title="Documents de la formation" backButton onBack={() => navigate(-1)}>
        <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Chargement en cours...
          </Typography>
        </Stack>
      </PageTemplate>
    );
  }

  if (error || !formation) {
    return (
      <PageTemplate title="Documents de la formation" backButton onBack={() => navigate(-1)}>
        <Typography color="error">❌ Erreur lors du chargement des données.</Typography>
      </PageTemplate>
    );
  }

  const infos = `📄 ${formation.nom}
🔢 ${formation.num_offre || "N° inconnu"}
🎯 ${formation.type_offre?.libelle || "Type inconnu"}
🏢 ${formation.centre?.nom || "Centre inconnu"}`;

  return (
    <PageTemplate title="Documents de la formation" backButton onBack={() => navigate(-1)}>
      <Typography sx={{ whiteSpace: "pre-line", mb: 4 }}>{infos}</Typography>

      <FormationSection title={`📁 Documents (${documents.length})`} defaultExpanded>
        {documents.length === 0 && (
          <Typography color="text.secondary">⚠️ Aucun document pour cette formation.</Typography>
        )}

        {documents.map((doc, index) => (
          <Box key={doc.id}>
            <Box sx={{ py: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {doc.nom_fichier}
              </Typography>
              <Stack
                direction="row"
                justifyContent="space-between"
                flexWrap="wrap"
                alignItems="center"
                spacing={2}
                sx={{ mt: 1 }}
              ></Stack>
            </Box>
            {index < documents.length - 1 && <Divider />}
          </Box>
        ))}

        <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 3, flexWrap: "wrap" }}>
          <MuiButton
            variant="contained"
            color="success"
            onClick={() => navigate(`/documents/create?formation_id=${id}`)}
          >
            ➕ Ajouter un document
          </MuiButton>
        </Stack>
      </FormationSection>
    </PageTemplate>
  );
}
