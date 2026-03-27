// src/pages/cerfa/CerfaEditPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Box, CircularProgress, Typography, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { toast } from "react-toastify";
import PageTemplate from "../../components/PageTemplate";
import { useCerfaDetail, useCerfaUpdate } from "../../hooks/useCerfa";
import type { CerfaContratCreate } from "../../types/cerfa";
import { CerfaForm } from "./CerfaForm";

export default function CerfaEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contratId = Number(id);

  const { data: contrat, isLoading, isError } = useCerfaDetail(contratId);
  const { mutateAsync: updateCerfa, isPending } = useCerfaUpdate(contratId);

  useEffect(() => {
    if (isError) {
      toast.error("Erreur lors du chargement du contrat.");
      navigate("/cerfa");
    }
  }, [isError, navigate]);

  const formatBackendMessages = (messages: unknown): string => {
    if (Array.isArray(messages)) {
      return messages.map((msg) => String(msg)).join(", ");
    }
    if (messages && typeof messages === "object") {
      return Object.entries(messages as Record<string, unknown>)
        .map(([key, value]) => `${key}: ${formatBackendMessages(value)}`)
        .join(", ");
    }
    return String(messages ?? "");
  };

  // ✅ Gestion homogène des erreurs backend (même logique que dans CerfaPage)
  const handleSubmit = async (data: CerfaContratCreate) => {
    try {
      await updateCerfa(data);
      toast.success("✅ Contrat CERFA mis à jour avec succès !");
      navigate("/cerfa");
    } catch (err: any) {
      const errorData = err?.response?.data;
      let message = "❌ Erreur lors de la mise à jour du contrat.";

      if (typeof errorData === "string") {
        message = errorData;
      } else if (Array.isArray(errorData?.missing_fields)) {
        message = `⚠️ Champs manquants : ${errorData.missing_fields.join(", ")}`;
      } else if (errorData?.missing_fields) {
        message = `⚠️ Champs manquants : ${errorData.missing_fields}`;
      } else if (errorData?.error) {
        message = errorData.error;
      } else if (errorData?.detail) {
        message = errorData.detail;
      } else if (errorData && typeof errorData === "object") {
        const errors = Object.entries(errorData)
          .map(([field, messages]) => `${field}: ${formatBackendMessages(messages)}`)
          .join(" | ");
        message = `⚠️ Erreur de validation : ${errors}`;
      }

      toast.error(message);

      // 🔍 Log complet pour debug (uniquement en dev)
      if (import.meta.env.MODE !== "production" && errorData) {
        /* eslint-disable no-console */
        console.group("📨 Détails complets de l’erreur backend (update)");
        console.log(errorData);
        console.groupEnd();
        /* eslint-enable no-console */
      }
    }
  };

  return (
    <PageTemplate
      title="✏️ Modifier un CERFA"
      actions={
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/cerfa")} variant="outlined">
          Retour
        </Button>
      }
    >
      {isLoading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : contrat ? (
        <CerfaForm
          open={true}
          onClose={() => navigate("/cerfa")}
          initialData={contrat}
          onSubmit={handleSubmit}
          readOnly={isPending}
        />
      ) : (
        <Typography color="error" align="center" mt={4}>
          Contrat introuvable.
        </Typography>
      )}
    </PageTemplate>
  );
}
