import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, CircularProgress } from "@mui/material";

import PageTemplate from "../../components/PageTemplate";
import CVThequeForm from "./cvthequeForm";

import { CVThequePayload } from "src/types/cvtheque";
import { useCreateCV, useCVChoices } from "src/hooks/useCvtheque";

export default function CVThequeCreatePage() {
  const navigate = useNavigate();

const { loading: loadingChoices } = useCVChoices();


  const { create, loading: creating } = useCreateCV();

  const handleCreate = async (payload: CVThequePayload) => {
    const res = await create(payload);

    if (res.success && res.data) {
      toast.success("📄 Document ajouté à la CVThèque !");
      navigate(`/cvtheque/${res.data.id}/preview`);
    } else {
      toast.error("Erreur lors de la création du document.");
    }
  };

return (
  <PageTemplate
    title="➕ Ajouter un document"
    subtitle="Déposer un fichier PDF / DOC / DOCX dans la CVThèque"
    backButton
  >
    {loadingChoices ? (
      <CircularProgress />
    ) : (
      <Box maxWidth={700} mx="auto">
        <CVThequeForm
          onSubmit={handleCreate}
          loading={creating}
          isEdit={false}
        />
      </Box>
    )}
  </PageTemplate>
);

}
