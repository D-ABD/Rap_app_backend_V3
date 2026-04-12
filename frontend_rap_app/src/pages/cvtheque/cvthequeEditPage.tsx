import { useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import CvThequeForm from "./cvthequeForm";
import { CircularProgress, Typography } from "@mui/material";
import { useEffect } from "react";
import { CVThequePayload } from "src/types/cvtheque";
import { useCVDetail, useUpdateCV } from "src/hooks/useCvtheque";
import { toast } from "react-toastify";
import PageTemplate from "../../components/PageTemplate";
import PageSection from "../../components/PageSection";

export default function CVThequeEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const cvId = Number(id || 0);
  const scopedCandidateId = searchParams.get("candidat");
  const returnToListUrl = useMemo(() => {
    return scopedCandidateId ? `/cvtheque?candidat=${scopedCandidateId}` : "/cvtheque";
  }, [scopedCandidateId]);

  // Si ID invalide → redirection
  useEffect(() => {
    if (!cvId) navigate(returnToListUrl);
  }, [cvId, navigate, returnToListUrl]);

  const { data: cv, loading } = useCVDetail(cvId);
  const { update, loading: updating } = useUpdateCV();

  const handleSubmit = async (payload: CVThequePayload) => {
    const res = await update(cvId, payload);

    if (res.success) {
      toast.success("✔️ CV mis à jour avec succès !");
      navigate(returnToListUrl);
    } else {
      toast.error("❌ Erreur lors de la mise à jour.");
    }
  };

  if (loading) {
    return (
      <PageTemplate
        title="Modifier un document"
        subtitle="Chargement du document."
        maxWidth="lg"
        backButton
        onBack={() => navigate(returnToListUrl)}
        centered
      >
        <CircularProgress />
      </PageTemplate>
    );
  }
  if (!cv) {
    return (
      <PageTemplate
        title="Modifier un document"
        subtitle="Le document demandé est introuvable."
        maxWidth="lg"
        backButton
        onBack={() => navigate(returnToListUrl)}
      >
        <Typography>Document introuvable</Typography>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="Modifier un document"
      subtitle="Mettez à jour le document CVThèque dans un shell plus compact."
      maxWidth="lg"
      backButton
      onBack={() => navigate(returnToListUrl)}
    >
      <PageSection sx={{ maxWidth: 700, mx: "auto" }}>
        <CvThequeForm
          defaultValues={cv}
          onSubmit={handleSubmit}
          loading={updating}
          isEdit
        />
      </PageSection>
    </PageTemplate>
  );
}
