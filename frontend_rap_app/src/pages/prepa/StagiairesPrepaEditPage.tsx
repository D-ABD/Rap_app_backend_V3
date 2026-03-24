import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import PageTemplate from "src/components/PageTemplate";
import { useDeleteStagiairePrepa, useStagiairePrepaDetail, useStagiairesPrepaMeta, useUpdateStagiairePrepa } from "src/hooks/useStagiairesPrepa";
import type { StagiairePrepa } from "src/types/prepa";
import StagiairesPrepaForm from "./StagiairesPrepaForm";

export default function StagiairesPrepaEditPage() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const id = useMemo(() => (idParam ? Number(idParam) : NaN), [idParam]);
  const { data, loading, error } = useStagiairePrepaDetail(Number.isNaN(id) ? null : id);
  const { data: meta, loading: loadingMeta } = useStagiairesPrepaMeta();
  const { update } = useUpdateStagiairePrepa();
  const { remove } = useDeleteStagiairePrepa();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: Partial<StagiairePrepa>) => {
    if (Number.isNaN(id)) return;
    try {
      setSubmitting(true);
      await update(id, values);
      toast.success("Stagiaire Prépa mis à jour");
      navigate("/prepa/stagiaires");
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>;
      toast.error(err.response?.data?.message ?? err.message ?? "Erreur lors de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (Number.isNaN(id) || !window.confirm("Supprimer ce stagiaire Prépa ?")) return;
    try {
      await remove(id);
      toast.success("Stagiaire Prépa supprimé");
      navigate("/prepa/stagiaires");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (Number.isNaN(id)) {
    return (
      <PageTemplate title="Modifier un stagiaire Prépa">
        <Typography color="error">ID invalide.</Typography>
      </PageTemplate>
    );
  }

  if (loading || loadingMeta) {
    return (
      <PageTemplate title={`Modifier stagiaire Prépa #${id}`} centered>
        <CircularProgress />
      </PageTemplate>
    );
  }

  if (error || !data) {
    return (
      <PageTemplate title={`Modifier stagiaire Prépa #${id}`}>
        <Typography color="error">Impossible de charger ce stagiaire Prépa.</Typography>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title={`Modifier ${data.prenom} ${data.nom}`}
      backButton
      onBack={() => navigate(-1)}
      actions={
        <Button color="error" variant="outlined" onClick={handleDelete}>
          Supprimer
        </Button>
      }
    >
      <Box mt={2}>
        <StagiairesPrepaForm
          initialValues={data}
          meta={meta}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/prepa/stagiaires")}
        />
      </Box>
    </PageTemplate>
  );
}
