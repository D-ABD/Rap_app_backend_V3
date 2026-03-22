import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CircularProgress, Paper, Typography } from "@mui/material";
import PageTemplate from "../../components/PageTemplate";
import EvenementForm from "./EvenementForm";
import { useEvenement, useEvenementChoices, useUpdateEvenement } from "../../hooks/useEvenements";
import { toApiError } from "../../api/httpClient";

export default function EvenementsEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const { data, loading, error } = useEvenement(eventId);
  const { types, formations, loading: loadingChoices } = useEvenementChoices();
  const { updateEvenement, loading: saving } = useUpdateEvenement(eventId);

  const initialFormValues = useMemo(
    () =>
      data
        ? {
            formation_id: data.formation_id ?? null,
            type_evenement: data.type_evenement ?? "",
            description_autre: data.description_autre ?? "",
            details: data.details ?? "",
            event_date: data.event_date ?? "",
            lieu: data.lieu ?? "",
            participants_prevus: data.participants_prevus ?? null,
            participants_reels: data.participants_reels ?? null,
          }
        : undefined,
    [data]
  );

  if (!eventId || Number.isNaN(eventId)) {
    return (
      <PageTemplate title="Modifier un événement" backButton onBack={() => navigate(-1)}>
        <Typography color="error">Identifiant d'événement invalide.</Typography>
      </PageTemplate>
    );
  }

  if (loading || loadingChoices) {
    return (
      <PageTemplate title="Modifier un événement" backButton onBack={() => navigate(-1)}>
        <CircularProgress />
      </PageTemplate>
    );
  }

  if (error || !data) {
    return (
      <PageTemplate title="Modifier un événement" backButton onBack={() => navigate(-1)}>
        <Typography color="error">{error || "Impossible de charger l'événement."}</Typography>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="Modifier un événement" backButton onBack={() => navigate(-1)}>
      <Paper sx={{ p: 3 }}>
        <EvenementForm
          key={`evenement-edit-${data.id}-${data.updated_at}`}
          initialValues={initialFormValues}
          types={types}
          formations={formations}
          loading={saving}
          submitLabel="Mettre à jour"
          onCancel={() =>
            navigate(data.formation_id ? `/evenements?formation=${data.formation_id}` : "/evenements")
          }
          onSubmit={async (values) => {
            try {
              const updated = await updateEvenement(values);
              toast.success("Événement mis à jour avec succès.");
              navigate(
                updated.formation_id ? `/evenements?formation=${updated.formation_id}` : "/evenements"
              );
            } catch (err) {
              toast.error(toApiError(err).message || "Impossible de mettre à jour l'événement.");
              throw err;
            }
          }}
        />
      </Paper>
    </PageTemplate>
  );
}
