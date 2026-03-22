import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

import PageTemplate from "../../components/PageTemplate";
import DocumentForm from "./DocumentForm";
import api from "../../api/axios";
import type { DocumentFormInitialValues } from "../../types/document";

export default function DocumentsEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const formationIdFromUrl = searchParams.get("formation_id");

  const [initialValues, setInitialValues] = useState<DocumentFormInitialValues | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    api
      .get(`/documents/${id}/`)
      .then((res) => {
        const doc = res.data?.data ?? res.data;
        setInitialValues({
          nom_fichier: doc.nom_fichier ?? "",
          type_document: doc.type_document ?? "",
          type_document_display: doc.type_document_display ?? "",
          fichier: null,
          formation: doc.formation ?? null,
          formation_nom: doc.formation_nom ?? undefined,
          download_url: doc.download_url ?? "",
          taille_readable: doc.taille_readable ?? undefined,
          mime_type: doc.mime_type ?? undefined,
          extension: doc.extension ?? undefined,
          icon_class: doc.icon_class ?? undefined,
          is_viewable_in_browser: doc.is_viewable_in_browser ?? undefined,

          // Champs enrichis de la formation
          formation_centre_nom: doc.formation_centre_nom ?? undefined,
          formation_type_offre_libelle: doc.formation_type_offre_libelle ?? undefined,
          formation_num_offre: doc.formation_num_offre ?? undefined,
          formation_start_date: doc.formation_start_date ?? undefined,
          formation_end_date: doc.formation_end_date ?? undefined,
          formation_statut: doc.formation_statut ?? undefined,
        });
      })
      .catch(() => {
        toast.error("Erreur lors du chargement du document");
        navigate("/documents");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <PageTemplate title="✏️ Modifier un document" backButton onBack={() => navigate(-1)}>
        <Box display="flex" justifyContent="center" alignItems="center" py={6}>
          <CircularProgress />
        </Box>
      </PageTemplate>
    );
  }

  if (!initialValues) {
    return (
      <PageTemplate title="✏️ Modifier un document" backButton onBack={() => navigate(-1)}>
        <Typography color="error" align="center" mt={4}>
          ⚠️ Impossible de charger le document.
        </Typography>
      </PageTemplate>
    );
  }

  const f = initialValues;

  return (
    <PageTemplate title="✏️ Modifier un document" backButton onBack={() => navigate(-1)}>
      {/* 💡 Encart d’informations sur la formation */}
      {f.formation && (
        <Card
          variant="outlined"
          sx={{
            mb: 3,
            borderRadius: 3,
            borderColor: "divider",
            backgroundColor: "background.paper",
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Informations sur la formation liée
            </Typography>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={3}
              divider={<Divider flexItem orientation="vertical" />}
            >
              {/* Bloc 1 — Détails formation */}
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary"></Typography>
                <Typography fontWeight={600}>{f.formation_nom ?? "—"}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Type d’offre :{" "}
                  {(() => {
                    const offre = f.formation_type_offre_libelle as
                      | string
                      | { id: number; nom: string; libelle?: string; couleur?: string }
                      | undefined;
                    if (!offre) return "—";
                    if (typeof offre === "string") return offre;
                    return offre.libelle || offre.nom || "—";
                  })()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Numéro d'offre : {f.formation_num_offre ? f.formation_num_offre || "—" : "—"}
                </Typography>
              </Stack>

              {/* Bloc 2 — Centre et statut */}
              <Stack spacing={0.5}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Centre :
                    <Typography component="span" fontWeight={600} ml={1} color="text.primary">
                      {f.formation_centre_nom ?? "—"}
                    </Typography>
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Statut :{" "}
                    {f.formation_statut
                      ? f.formation_statut.libelle || f.formation_statut.nom || "—"
                      : "—"}
                  </Typography>
                </Box>
              </Stack>

              {/* Bloc 3 — Dates */}
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" color="text.secondary"></Typography>
                <Typography variant="body2">
                  Date de début :{" "}
                  <strong>
                    {f.formation_start_date
                      ? new Date(f.formation_start_date).toLocaleDateString("fr-FR")
                      : "—"}
                  </strong>
                </Typography>
                <Typography variant="body2">
                  Date de fin :{" "}
                  <strong>
                    {f.formation_end_date
                      ? new Date(f.formation_end_date).toLocaleDateString("fr-FR")
                      : "—"}
                  </strong>
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* 📄 Formulaire du document */}
      <DocumentForm
        initialValues={initialValues}
        documentId={id}
        formationId={formationIdFromUrl || undefined}
      />
    </PageTemplate>
  );
}
