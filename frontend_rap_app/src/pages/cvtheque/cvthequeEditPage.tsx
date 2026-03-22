import { useParams, useNavigate } from "react-router-dom";
import CvThequeForm from "./cvthequeForm";
import { CircularProgress, Typography } from "@mui/material";
import { useEffect } from "react";
import { CVThequePayload } from "src/types/cvtheque";
import { useCVDetail, useUpdateCV } from "src/hooks/useCvtheque";
import { toast } from "react-toastify";

export default function CVThequeEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const cvId = Number(id || 0);

  // Si ID invalide → redirection
  useEffect(() => {
    if (!cvId) navigate("/cvtheque");
  }, [cvId, navigate]);

  const { data: cv, loading } = useCVDetail(cvId);
  const { update, loading: updating } = useUpdateCV();

  const handleSubmit = async (payload: CVThequePayload) => {
    const res = await update(cvId, payload);

    if (res.success) {
      toast.success("✔️ CV mis à jour avec succès !");
      navigate("/cvtheque"); // ✅ Redirection vers la liste
    } else {
      toast.error("❌ Erreur lors de la mise à jour.");
    }
  };

  if (loading) return <CircularProgress />;
  if (!cv) return <Typography>Document introuvable</Typography>;

  return (
    <CvThequeForm
      defaultValues={cv}
      onSubmit={handleSubmit}
      loading={updating}
      isEdit
    />
  );
}
