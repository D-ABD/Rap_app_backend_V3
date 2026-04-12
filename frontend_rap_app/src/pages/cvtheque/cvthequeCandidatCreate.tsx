import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Box } from "@mui/material";

import PageTemplate from "../../components/PageTemplate";
import PageSection from "../../components/PageSection";

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
      title="Ajouter un document"
      subtitle="Déposez un fichier dans la CVThèque candidat avec une page plus compacte."
      maxWidth="lg"
      backButton
      onBack={() => navigate("/cvtheque/candidat")}
    >
      <PageSection sx={{ maxWidth: 700, mx: "auto" }}>
        <Box>
          <CVThequeFormCandidat
            onSubmit={handleCreate}
            loading={creating}
          />
        </Box>
      </PageSection>
    </PageTemplate>
  );
}
