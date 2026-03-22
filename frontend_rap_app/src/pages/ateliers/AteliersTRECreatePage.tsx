// src/pages/ateliers/AtelierTRECreatePage.tsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import { CircularProgress, Typography, Box } from "@mui/material";

import type { AtelierTREFormData, Choice } from "../../types/ateliersTre";

import PostCreateChoiceModal from "../../components/modals/PostCreateChoiceModal";
import { useAtelierTREMeta, useCreateAtelierTRE } from "../../hooks/useAtelierTre";
import AtelierTREForm from "./AteliersTREForm";
import PageTemplate from "../../components/PageTemplate";

type CreatedAtelierLite = {
  id: number;
  type_atelier?: string | null;
  date_atelier?: string | null;
  centre?: number | null;
};

export default function AtelierTRECreatePage() {
  const navigate = useNavigate();
  const { meta, loading: loadingMeta } = useAtelierTREMeta();
  const { create } = useCreateAtelierTRE();

  // 🔹 Modale post-création
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [lastCreated, setLastCreated] = useState<CreatedAtelierLite | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Helpers typés pour parser proprement la réponse d'erreur
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;
  const isStringArray = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === "string");

  function extractApiMessage(data: unknown): string | null {
    if (!isRecord(data)) return null;
    const maybeMessage = (data as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
    const maybeErrors = (data as { errors?: unknown }).errors;
    const errorsObj = isRecord(maybeErrors) ? (maybeErrors as Record<string, unknown>) : data;
    const parts: string[] = [];
    for (const [field, val] of Object.entries(errorsObj)) {
      if (typeof val === "string") {
        parts.push(`${field}: ${val}`);
      } else if (isStringArray(val)) {
        parts.push(`${field}: ${val.join(" · ")}`);
      }
    }
    return parts.length ? parts.join(" | ") : null;
  }

  const typeLabel = useMemo(() => {
    const code = lastCreated?.type_atelier ?? null;
    if (!code) return null;
    const arr = (meta?.type_atelier_choices ?? []) as Choice[];
    const found = arr.find((c) => String(c.value) === code);
    return found?.label ?? code;
  }, [lastCreated?.type_atelier, meta?.type_atelier_choices]);

  const handleSubmit = async (values: AtelierTREFormData) => {
    try {
      setSubmitting(true);
      const payload = Object.fromEntries(
        Object.entries(values).map(([k, v]) => (v === "" ? [k, undefined] : [k, v]))
      ) as AtelierTREFormData;

      const created = (await create(payload)) as CreatedAtelierLite;

      toast.success("✅ Atelier créé");

      setLastCreated({
        id: created.id,
        type_atelier: created.type_atelier ?? values.type_atelier ?? null,
        date_atelier: created.date_atelier ?? values.date_atelier ?? null,
        centre: typeof created.centre === "number" ? created.centre : (values.centre ?? null),
      });
      setChoiceOpen(true);
    } catch (error) {
      const axiosErr = error as AxiosError<unknown>;
      const data = axiosErr.response?.data;
      const parsed = data ? extractApiMessage(data) : null;
      const msg = parsed ?? axiosErr.message ?? "Erreur lors de la création de l’atelier";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <PageTemplate title="➕ Nouvel atelier TRE" centered>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>⏳ Chargement…</Typography>
      </PageTemplate>
    );
  }

  // Intitulé affiché dans la modale (type d’atelier, date)
  const displayTitle = typeLabel ? typeLabel : (lastCreated?.type_atelier ?? null);

  // Liens de la modale post-création
  const primaryHref = lastCreated?.id ? `/ateliers-tre/${lastCreated.id}/edit` : `/ateliers-tre`;

  const secondaryHref = lastCreated?.id ? `/ateliers-tre/${lastCreated.id}` : `/ateliers-tre`;

  return (
    <PageTemplate title="➕ Nouvel atelier TRE" backButton onBack={() => navigate(-1)}>
      <Box mt={2}>
        <AtelierTREForm
          meta={meta ?? null}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/ateliers-tre")}
          submitting={submitting}
        />
      </Box>

      {/* 🔻 Modale post-création */}
      <PostCreateChoiceModal
        open={choiceOpen}
        onClose={() => setChoiceOpen(false)}
        resourceLabel="atelier"
        persistId={lastCreated?.id}
        extraContent={
          displayTitle ? (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>{displayTitle}</strong>
              {lastCreated?.date_atelier ? (
                <span> — {new Date(lastCreated.date_atelier).toLocaleString("fr-FR")}</span>
              ) : null}
            </Typography>
          ) : null
        }
        primaryHref={primaryHref}
        primaryLabel="Configurer / Éditer l’atelier"
        primaryVariant="primary"
        secondaryHref={secondaryHref}
        secondaryLabel="Voir l’atelier"
        secondaryVariant="secondary"
        tertiaryHref="/ateliers-tre"
        tertiaryLabel="Retour à la liste"
        tertiaryVariant="secondary"
      />
    </PageTemplate>
  );
}
