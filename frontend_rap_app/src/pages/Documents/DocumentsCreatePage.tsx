// src/pages/documents/DocumentsCreatePage.tsx
import { useNavigate } from "react-router-dom";
import PageTemplate from "../../components/PageTemplate";
import { Typography } from "@mui/material";
import DocumentForm from "./DocumentForm";

export default function DocumentsCreatePage() {
  const navigate = useNavigate();

  return (
    <PageTemplate
      title="Creer un document"
      subtitle="Ajoutez un document sans modifier le flux existant ni les informations attendues."
      eyebrow="Documents"
      hero
      maxWidth="md"
      backButton
      onBack={() => navigate(-1)}
      headerExtra={
        <Typography variant="body2" color="text.secondary">
          Le formulaire reste identique. Seul le shell de page est harmonise.
        </Typography>
      }
    >
      <DocumentForm />
    </PageTemplate>
  );
}
