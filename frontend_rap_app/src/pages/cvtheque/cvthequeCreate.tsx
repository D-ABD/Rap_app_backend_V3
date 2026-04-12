import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, CircularProgress } from "@mui/material";

import PageTemplate from "../../components/PageTemplate";
import PageSection from "../../components/PageSection";
import CVThequeForm from "./cvthequeForm";

import { CVThequeDetail, CVThequePayload } from "src/types/cvtheque";
import { useCreateCV, useCVChoices } from "src/hooks/useCvtheque";

export default function CVThequeCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetCandidateId = useMemo(() => {
    const raw = searchParams.get("candidat");
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [searchParams]);
  const presetCandidateName = searchParams.get("candidat_nom")?.trim() || undefined;
  const returnToListUrl = useMemo(() => {
    return presetCandidateId ? `/cvtheque?candidat=${presetCandidateId}` : "/cvtheque";
  }, [presetCandidateId]);

  const { loading: loadingChoices } = useCVChoices();
  const defaultValues = useMemo<Partial<CVThequeDetail> | undefined>(() => {
    if (!presetCandidateId) return undefined;
    return {
      candidat: {
        id: presetCandidateId,
        nom: "",
        prenom: presetCandidateName ?? "",
        email: "",
        telephone: "",
        ville: null,
        code_postal: null,
        statut: null,
      },
    };
  }, [presetCandidateId, presetCandidateName]);

  const { create, loading: creating } = useCreateCV();

  const handleCreate = async (payload: CVThequePayload) => {
    const res = await create(payload);

    if (res.success && res.data) {
      toast.success("📄 Document ajouté à la CVThèque !");
      navigate(returnToListUrl);
    } else {
      toast.error("Erreur lors de la création du document.");
    }
  };

  return (
    <PageTemplate
      title="Ajouter un document"
      subtitle="Déposez un fichier dans la CVThèque avec une page plus compacte."
      maxWidth="lg"
      backButton
      onBack={() => navigate(returnToListUrl)}
    >
      {loadingChoices ? (
        <CircularProgress />
      ) : (
        <PageSection sx={{ maxWidth: 700, mx: "auto" }}>
          <Box>
            <CVThequeForm
              onSubmit={handleCreate}
              loading={creating}
              isEdit={false}
              defaultValues={defaultValues}
            />
          </Box>
        </PageSection>
      )}
    </PageTemplate>
  );
}
