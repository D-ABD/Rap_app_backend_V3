// src/pages/documents/DocumentsCreatePage.tsx
import { useNavigate } from "react-router-dom";
import PageTemplate from "../../components/PageTemplate";
import { Typography } from "@mui/material";
import DocumentForm from "./DocumentForm";
import PageSection from "../../components/PageSection";

export default function DocumentsCreatePage() {
  const navigate = useNavigate();

  return (
    <PageTemplate
      title="Créer un document"
      subtitle="Ajoutez un document."
      maxWidth="md"
      backButton
      onBack={() => navigate(-1)}
      headerExtra={
        <Typography variant="body2" color="text.secondary">
        </Typography>
      }
    >
      <PageSection>
        <DocumentForm />
      </PageSection>
    </PageTemplate>
  );
}
