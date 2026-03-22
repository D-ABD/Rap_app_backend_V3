import { useParams, useNavigate } from "react-router-dom";
import { CircularProgress, Typography } from "@mui/material";
import { useEffect } from "react";
import { CVThequePayload } from "src/types/cvtheque";
import CVThequeFormCandidat from "./cvthequeFormCandidat";
import { useCVDetail, useUpdateCV } from "src/hooks/useCvtheque";

export default function CVThequeCandidatEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const cvId = Number(id || 0);

  // Si l’ID est invalide → redirect
  useEffect(() => {
    if (!cvId) {
      navigate("/cvtheque");
    }
  }, [cvId, navigate]);

  const { data: cv, loading } = useCVDetail(cvId);
  const { update, loading: updating } = useUpdateCV();

  const handleSubmit = async (payload: CVThequePayload) => {
    const res = await update(cvId, payload);

    if (res.success && res.data) {
      navigate(`/cvtheque/${res.data.id}/preview/candidat`);
    }
  };

  if (loading) return <CircularProgress />;
  if (!cv) return <Typography>Document introuvable</Typography>;

  return (
    <CVThequeFormCandidat
      onSubmit={handleSubmit}
      loading={updating}
    />
  );
}
