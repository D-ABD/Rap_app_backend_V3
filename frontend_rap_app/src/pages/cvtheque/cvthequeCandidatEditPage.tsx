import { useParams, useNavigate } from "react-router-dom";
import { CircularProgress, Typography } from "@mui/material";
import { useEffect } from "react";
import { CVThequePayload } from "src/types/cvtheque";
import CVThequeFormCandidat from "./cvthequeFormCandidat";
import { useCVDetail, useUpdateCV } from "src/hooks/useCvtheque";
import PageTemplate from "../../components/PageTemplate";
import PageSection from "../../components/PageSection";

export default function CVThequeCandidatEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const cvId = Number(id || 0);

  // Si l’ID est invalide → redirect
  useEffect(() => {
    if (!cvId) {
      navigate("/cvtheque/candidat");
    }
  }, [cvId, navigate]);

  const { data: cv, loading } = useCVDetail(cvId);
  const { update, loading: updating } = useUpdateCV();

  const handleSubmit = async (payload: CVThequePayload) => {
    const res = await update(cvId, payload);

    if (res.success && res.data) {
      navigate("/cvtheque/candidat");
    }
  };

  if (loading) {
    return (
      <PageTemplate
        title="Modifier un document"
        subtitle="Chargement du document."
        maxWidth="lg"
        backButton
        onBack={() => navigate("/cvtheque/candidat")}
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
        onBack={() => navigate("/cvtheque/candidat")}
      >
        <Typography>Document introuvable</Typography>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="Modifier un document"
      subtitle="Mettez à jour le document CVThèque candidat dans un shell plus compact."
      maxWidth="lg"
      backButton
      onBack={() => navigate("/cvtheque/candidat")}
    >
      <PageSection sx={{ maxWidth: 700, mx: "auto" }}>
        <CVThequeFormCandidat
          defaultValues={cv}
          onSubmit={handleSubmit}
          loading={updating}
        />
      </PageSection>
    </PageTemplate>
  );
}
