import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, CircularProgress, Typography } from "@mui/material";
import { AxiosError } from "axios";
import PageTemplate from "src/components/PageTemplate";
import { useCreateStagiairePrepa, useStagiairesPrepaMeta } from "src/hooks/useStagiairesPrepa";
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

export default function StagiairesPrepaCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: meta, loading } = useStagiairesPrepaMeta();
  const { create } = useCreateStagiairePrepa();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: Partial<StagiairePrepa>) => {
    try {
      setSubmitting(true);
      const payload = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value === "" ? undefined : value])
      ) as Partial<StagiairePrepa>;

      await create({
        ...payload,
        prepa_origine_id:
          payload.prepa_origine_id ??
          (searchParams.get("prepa_origine") ? Number(searchParams.get("prepa_origine")) : undefined),
      });
      toast.success("Stagiaire Prépa créé avec succès");
      navigate("/prepa/stagiaires");
    } catch (e) {
      const err = e as AxiosError<unknown>;
      const parsed = err.response?.data ? extractApiMessage(err.response.data) : null;
      toast.error(parsed ?? err.message ?? "Erreur lors de la création du stagiaire Prépa");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageTemplate title="Nouveau stagiaire Prépa" centered>
        <CircularProgress />
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="Nouveau stagiaire Prépa" backButton onBack={() => navigate(-1)}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Crée une fiche de suivi nominatif sans créer de candidat ni de compte utilisateur.
      </Typography>
      <Box mt={2}>
        <StagiairesPrepaForm
          meta={meta}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/prepa/stagiaires")}
          initialValues={{
            prepa_origine_id: searchParams.get("prepa_origine") ? Number(searchParams.get("prepa_origine")) : undefined,
          }}
        />
      </Box>
    </PageTemplate>
  );
}
