import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PageTemplate from "../../components/PageTemplate";
import RapportForm from "./RapportForm";
import { useCreateRapport, useRapportChoices } from "../../hooks/useRapports";
import type { RapportFormData } from "../../types/rapport";

const defaultValue: RapportFormData = {
  nom: "",
  type_rapport: "",
  periode: "",
  date_debut: "",
  date_fin: "",
  format: "pdf",
  centre: "",
  type_offre: "",
  statut: "",
  formation: "",
};

function validateRapportForm(form: RapportFormData): string | null {
  if (!form.nom.trim()) return "Le nom du rapport est requis.";
  if (!form.type_rapport) return "Le type de rapport est requis.";
  if (!form.periode) return "La période est requise.";
  if (!form.date_debut) return "La date de début est requise.";
  if (!form.date_fin) return "La date de fin est requise.";
  if (!form.format) return "Le format est requis.";

  const start = new Date(form.date_debut);
  const end = new Date(form.date_fin);
  if (start > end) return "La date de début ne peut pas être postérieure à la date de fin.";

  const dayMs = 1000 * 60 * 60 * 24;
  const delta = Math.floor((end.getTime() - start.getTime()) / dayMs);
  const maxDays: Record<string, number> = {
    quotidien: 1,
    hebdomadaire: 7,
    mensuel: 31,
    trimestriel: 93,
    annuel: 366,
  };
  const maxAllowed = maxDays[form.periode];
  if (maxAllowed !== undefined && delta > maxAllowed) {
    return `La période sélectionnée ne doit pas dépasser ${maxAllowed} jour(s).`;
  }

  return null;
}

export default function RapportsCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RapportFormData>(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const { data: choices, loading: loadingChoices } = useRapportChoices();
  const { createRapport, loading } = useCreateRapport();

  const handleSubmit = async () => {
    setError(null);
    const validationError = validateRapportForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      const created = await createRapport(form);
      toast.success("Rapport créé avec succès.");
      navigate(`/rapports/${created.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création du rapport.");
    }
  };

  return (
    <PageTemplate title="Créer un rapport" backButton onBack={() => navigate(-1)}>
      <RapportForm
        value={form}
        choices={choices}
        loadingChoices={loadingChoices}
        saving={loading}
        error={error}
        onChange={setForm}
        onSubmit={() => void handleSubmit()}
        onCancel={() => navigate(-1)}
      />
    </PageTemplate>
  );
}
