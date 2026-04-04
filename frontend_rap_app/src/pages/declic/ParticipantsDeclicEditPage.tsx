import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import PageTemplate from "src/components/PageTemplate";
import { useDeleteParticipantDeclic, useParticipantDeclicDetail, useParticipantsDeclicMeta, useUpdateParticipantDeclic } from "src/hooks/useParticipantsDeclic";
import type { ParticipantDeclic } from "src/types/declic";
import ParticipantsDeclicForm from "./ParticipantsDeclicForm";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

function extractApiMessage(data: unknown): string | null {
  if (!isRecord(data)) return null;
  const maybeMessage = (data as { message?: unknown }).message;
  if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;
  const maybeErrors = (data as { errors?: unknown }).errors;
  const errorsObj = isRecord(maybeErrors) ? maybeErrors : data;
  const parts: string[] = [];
  for (const [field, val] of Object.entries(errorsObj)) {
    if (typeof val === "string") parts.push(`${field}: ${val}`);
    else if (isStringArray(val)) parts.push(`${field}: ${val.join(" · ")}`);
  }
  return parts.length ? parts.join(" | ") : null;
}

export default function ParticipantsDeclicEditPage() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const id = useMemo(() => (idParam ? Number(idParam) : NaN), [idParam]);
  const { data, loading, error } = useParticipantDeclicDetail(Number.isNaN(id) ? null : id);
  const { data: meta, loading: loadingMeta } = useParticipantsDeclicMeta();
  const { update } = useUpdateParticipantDeclic();
  const { remove } = useDeleteParticipantDeclic();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: Partial<ParticipantDeclic>) => {
    if (Number.isNaN(id)) return;
    try {
      setSubmitting(true);
      const payload = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value === "" ? undefined : value])
      ) as Partial<ParticipantDeclic>;
      await update(id, payload);
      toast.success("Participant Déclic mis à jour");
      navigate("/participants-declic");
    } catch (e) {
      const err = e as AxiosError<unknown>;
      const parsed = err.response?.data ? extractApiMessage(err.response.data) : null;
      toast.error(parsed ?? err.message ?? "Erreur lors de la mise à jour du participant Déclic");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (Number.isNaN(id) || !window.confirm("Archiver ce participant Déclic ?")) return;
    try {
      await remove(id);
      toast.success("Participant Déclic archivé");
      navigate("/participants-declic");
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  if (Number.isNaN(id)) {
    return (
      <PageTemplate title="Modifier un participant Déclic">
        <Typography color="error">ID invalide.</Typography>
      </PageTemplate>
    );
  }

  if (loading || loadingMeta) {
    return (
      <PageTemplate title={`Modifier participant Déclic #${id}`} centered>
        <CircularProgress />
      </PageTemplate>
    );
  }

  if (error || !data) {
    return (
      <PageTemplate title={`Modifier participant Déclic #${id}`}>
        <Typography color="error">Impossible de charger ce participant Déclic.</Typography>
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
        <ParticipantsDeclicForm
          initialValues={data}
          meta={meta}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/participants-declic")}
        />
      </Box>
    </PageTemplate>
  );
}
