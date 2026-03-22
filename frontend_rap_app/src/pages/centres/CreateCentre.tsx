import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import PageTemplate from "../../components/PageTemplate";
import CentreForm from "./CentreForm";

export default function CreateCentre() {
  const navigate = useNavigate();

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      await api.post("/centres/", values);
      toast.success("Centre créé avec succès");
      navigate("/centres");
    } catch {
      toast.error("Erreur lors de la création du centre");
    }
  };

  return (
    <PageTemplate title="Créer un centre" backButton onBack={() => navigate(-1)}>
      <CentreForm onSubmit={handleSubmit} mode="create" />
    </PageTemplate>
  );
}
