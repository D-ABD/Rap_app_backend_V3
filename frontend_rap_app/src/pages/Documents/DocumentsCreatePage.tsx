// src/pages/documents/DocumentsCreatePage.tsx
import { useNavigate } from "react-router-dom";
import PageTemplate from "../../components/PageTemplate";
import DocumentForm from "./DocumentForm";

export default function DocumentsCreatePage() {
  const navigate = useNavigate();

  return (
    <PageTemplate title="➕ Créer un document" backButton onBack={() => navigate(-1)}>
      <DocumentForm />
    </PageTemplate>
  );
}
