import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box } from "@mui/material";

import PageTemplate from "../../components/PageTemplate";

import { CVThequePayload } from "src/types/cvtheque";
import CVThequeFormCandidat from "./cvthequeFormCandidat";
import { useCreateCV } from "src/hooks/useCvtheque";

export default function CVThequeCandidatCreatePage() {
  const navigate = useNavigate();

  // ✔️ Aucun fetch inutile
  const { create, loading: creating } = useCreateCV();

  const handleCreate = async (payload: Omit<CVThequePayload, "candidat">) => {
    const res = await create(payload);

    if (res.success && res.data) {
      toast.success("📄 Document ajouté à la CVThèque !");
      navigate("/cvtheque/candidat");
    } else {
      toast.error("Erreur lors de la création du document.");
    }
  };

  return (
    <PageTemplate
      title="➕ Ajouter un document"
      subtitle="Déposer un fichier PDF / DOC / DOCX dans la CVThèque"
      backButton
      onBack={() => navigate("/cvtheque/candidat")}
    >
      <Box maxWidth={700} mx="auto">
        <CVThequeFormCandidat
          onSubmit={handleCreate}
          loading={creating}
        />
      </Box>
    </PageTemplate>
  );
}
