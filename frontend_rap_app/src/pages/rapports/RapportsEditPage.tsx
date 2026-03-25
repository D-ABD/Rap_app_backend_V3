import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";
import PageTemplate from "../../components/PageTemplate";
import RapportForm from "./RapportForm";
import { useRapport, useRapportChoices, useUpdateRapport } from "../../hooks/useRapports";
import type { RapportFormData } from "../../types/rapport";

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

export default function RapportsEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const reportId = Number(id);
  const { data, loading, error } = useRapport(reportId);
  const { data: choices, loading: loadingChoices } = useRapportChoices();
  const { updateRapport, loading: saving } = useUpdateRapport(reportId);
  const [form, setForm] = useState<RapportFormData | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setForm({
      nom: data.nom || "",
      type_rapport: data.type_rapport || "",
      periode: data.periode || "",
      date_debut: data.date_debut || "",
      date_fin: data.date_fin || "",
      format: data.format || "pdf",
      centre: data.centre ?? "",
      type_offre: data.type_offre ?? "",
      statut: data.statut ?? "",
      formation: data.formation ?? "",
    });
  }, [data]);

  const handleSubmit = async () => {
    if (!form) return;
    setSubmitError(null);
    const validationError = validateRapportForm(form);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    try {
      await updateRapport(form);
      toast.success("Rapport mis à jour avec succès.");
      navigate("/rapports");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erreur lors de la mise à jour du rapport.");
    }
  };

  return (
    <PageTemplate title="Modifier un rapport" backButton onBack={() => navigate(-1)}>
      {loading ? <CircularProgress /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!loading && !error && form ? (
        <RapportForm
          value={form}
          choices={choices}
          loadingChoices={loadingChoices}
          saving={saving}
          error={submitError}
          onChange={setForm}
          onSubmit={() => void handleSubmit()}
          onCancel={() => navigate(-1)}
        />
      ) : null}
    </PageTemplate>
  );
}
