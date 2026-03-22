import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import PageTemplate from "../../components/PageTemplate";
import CentreForm from "./CentreForm";
import CentreDetailPage from "./CentreDetailPage";
import { CircularProgress, Box, Button, Stack } from "@mui/material";
import type { Centre } from "../../types/centre";

export default function EditCentre() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 🔹 On type correctement avec Centre
  const [initialValues, setInitialValues] = useState<Centre | null>(null);
  const [loading, setLoading] = useState(true);

  const formRef = useRef<HTMLDivElement | null>(null);

  const fetchCentre = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Centre>(`/centres/${id}/`);
      setInitialValues(res.data);
    } catch {
      toast.error("Erreur lors du chargement du centre");
      navigate("/centres");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchCentre();
  }, [fetchCentre]);

  const handleSubmit = async (values: Partial<Centre>) => {
    try {
      await api.put(`/centres/${id}/`, values);
      toast.success("Centre mis à jour avec succès !");
      fetchCentre(); // 🔁 recharge les détails
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.error("Erreur lors de la mise à jour du centre");
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading || !initialValues) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="30vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageTemplate
      title={`🏫 Modifier le centre : ${initialValues.nom}`}
      backButton
      onBack={() => navigate(-1)}
    >
      {/* ───────── Détails ───────── */}
      <Stack direction="row" justifyContent="center" mb={4}>
        <Button
          variant="contained"
          color="primary"
          onClick={scrollToForm}
          sx={{ textTransform: "none", fontWeight: "bold" }}
        >
          ✏️ Modifier les informations
        </Button>
      </Stack>
      <Box mb={3}>
        <CentreDetailPage centre={initialValues} />
      </Box>

      {/* ───────── Formulaire ───────── */}
      <div ref={formRef}>
        <CentreForm initialValues={initialValues} onSubmit={handleSubmit} mode="edit" />
      </div>
    </PageTemplate>
  );
}
