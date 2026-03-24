import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, CircularProgress, Typography } from "@mui/material";
import { AxiosError } from "axios";
import PageTemplate from "src/components/PageTemplate";
import { useCreateParticipantDeclic, useParticipantsDeclicMeta } from "src/hooks/useParticipantsDeclic";
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

export default function ParticipantsDeclicCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: meta, loading } = useParticipantsDeclicMeta();
  const { create } = useCreateParticipantDeclic();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: Partial<ParticipantDeclic>) => {
    try {
      setSubmitting(true);
      const payload = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value === "" ? undefined : value])
      ) as Partial<ParticipantDeclic>;
      await create({
        ...payload,
        declic_origine_id:
          payload.declic_origine_id ??
          (searchParams.get("declic_origine") ? Number(searchParams.get("declic_origine")) : undefined),
      });
      toast.success("Participant Déclic créé avec succès");
      navigate("/participants-declic");
    } catch (e) {
      const err = e as AxiosError<unknown>;
      const parsed = err.response?.data ? extractApiMessage(err.response.data) : null;
      toast.error(parsed ?? err.message ?? "Erreur lors de la création du participant Déclic");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageTemplate title="Nouveau participant Déclic" centered>
        <CircularProgress />
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="Nouveau participant Déclic" backButton onBack={() => navigate(-1)}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ajoute un participant nominatif à une séance Déclic, sans logique de parcours.
      </Typography>
      <Box mt={2}>
        <ParticipantsDeclicForm
          meta={meta}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/participants-declic")}
          initialValues={{
            declic_origine_id: searchParams.get("declic_origine") ? Number(searchParams.get("declic_origine")) : undefined,
          }}
        />
      </Box>
    </PageTemplate>
  );
}
