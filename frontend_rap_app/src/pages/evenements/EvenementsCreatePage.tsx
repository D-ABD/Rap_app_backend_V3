import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CircularProgress, Paper } from "@mui/material";
import PageTemplate from "../../components/PageTemplate";
import EvenementForm from "./EvenementForm";
import { useCreateEvenement, useEvenementChoices } from "../../hooks/useEvenements";
import { toApiError } from "../../api/httpClient";

export default function EvenementsCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { types, formations, loading } = useEvenementChoices();
  const { createEvenement, loading: saving } = useCreateEvenement();

  const presetFormation = useMemo(() => {
    const raw = searchParams.get("formation");
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [searchParams]);

  if (loading) {
    return (
      <PageTemplate title="Créer un événement" backButton onBack={() => navigate(-1)}>
        <CircularProgress />
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="Créer un événement" backButton onBack={() => navigate(-1)}>
      <Paper sx={{ p: 3 }}>
        <EvenementForm
          types={types}
          formations={formations}
          loading={saving}
          fixedFormationId={presetFormation}
          submitLabel="Créer"
          onCancel={() =>
            navigate(presetFormation ? `/evenements?formation=${presetFormation}` : "/evenements")
          }
          onSubmit={async (values) => {
            try {
              const created = await createEvenement(values);
              toast.success("Événement créé avec succès.");
              navigate(
                created.formation_id ? `/evenements?formation=${created.formation_id}` : "/evenements"
              );
            } catch (err) {
              toast.error(toApiError(err).message || "Impossible de créer l'événement.");
              throw err;
            }
          }}
        />
      </Paper>
    </PageTemplate>
  );
}
