import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import PageTemplate from "src/components/PageTemplate";
import { useDeleteStagiairePrepa, useStagiairePrepaDetail, useStagiairesPrepaMeta, useUpdateStagiairePrepa } from "src/hooks/useStagiairesPrepa";
import type { StagiairePrepa } from "src/types/prepa";
import StagiairesPrepaForm from "./StagiairesPrepaForm";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

function extractApiMessage(data: unknown): string | null {
  if (!isRecord(data)) return null;

  const maybeMessage = (data as { message?: unknown }).message;
  if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;

  const maybeErrors = (data as { errors?: unknown }).errors;
  const errorsObj = isRecord(maybeErrors) ? maybeErrors : data;
  const parts: string[] = [];

  for (const [field, val] of Object.entries(errorsObj)) {
    const label =
      field === "motif_abandon"
        ? "Motif d'abandon"
        : field === "prepa_origine_id"
          ? "Prépa d'origine"
          : field === "centre_id"
            ? "Centre"
            : field === "non_field_errors"
              ? "Validation"
              : field;

    if (typeof val === "string") {
      parts.push(`${label}: ${val}`);
    } else if (isStringArray(val)) {
      parts.push(`${label}: ${val.join(" · ")}`);
    }
  }

  return parts.length ? parts.join(" | ") : null;
}

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
      const payload = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value === "" ? undefined : value])
      ) as Partial<StagiairePrepa>;
      await update(id, payload);
      toast.success("Stagiaire Prépa mis à jour");
      navigate("/prepa/stagiaires");
    } catch (e) {
      const err = e as AxiosError<unknown>;
      const parsed = err.response?.data ? extractApiMessage(err.response.data) : null;
      toast.error(parsed ?? err.message ?? "Erreur lors de la mise à jour du stagiaire Prépa");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (Number.isNaN(id) || !window.confirm("Archiver ce stagiaire Prépa ?")) return;
    try {
      await remove(id);
      toast.success("Stagiaire Prépa archivé");
      navigate("/prepa/stagiaires");
    } catch {
      toast.error("Erreur lors de l'archivage");
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
          Archiver
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
