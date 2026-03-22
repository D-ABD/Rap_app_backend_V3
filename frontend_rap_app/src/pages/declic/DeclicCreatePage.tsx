import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import { CircularProgress, Typography, Box } from "@mui/material";

import type { Declic } from "src/types/declic";
import PageTemplate from "src/components/PageTemplate";
import { useCreateDeclic, useDeclicMeta } from "src/hooks/useDeclic";
import DeclicForm from "./DeclicForm";

/**
 * Page : Création directe d’une activité Déclic
 * → redirige vers /declic après enregistrement
 */
export default function DeclicCreatePage() {
  const navigate = useNavigate();
  const { meta, loading: loadingMeta } = useDeclicMeta();
  const { create } = useCreateDeclic();

  const [submitting, setSubmitting] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<string | null>(null); // ✅ nom du centre sélectionné

  // Helpers pour extraire proprement les messages d’erreur API
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;
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
      if (typeof val === "string") {
        parts.push(`${field}: ${val}`);
      } else if (isStringArray(val)) {
        parts.push(`${field}: ${val.join(" · ")}`);
      }
    }
    return parts.length ? parts.join(" | ") : null;
  }

  // Soumission du formulaire
  const handleSubmit = async (values: Partial<Declic>) => {
    try {
      setSubmitting(true);
      const payload = Object.fromEntries(
        Object.entries(values).map(([k, v]) => (v === "" ? [k, undefined] : [k, v]))
      ) as Partial<Declic>;

      await create(payload);
      toast.success("✅ Activité Déclic créée avec succès");
      navigate("/declic"); // 👉 redirection directe
    } catch (error) {
      const axiosErr = error as AxiosError<unknown>;
      const data = axiosErr.response?.data;
      const parsed = data ? extractApiMessage(data) : null;
      const msg = parsed ?? axiosErr.message ?? "Erreur lors de la création de l’activité Déclic";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <PageTemplate title="➕ Nouvelle activité Déclic" centered>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>⏳ Chargement…</Typography>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="➕ Nouvelle activité Déclic" backButton onBack={() => navigate(-1)}>
      {/* ✅ Affichage du centre sélectionné */}
      {selectedCentre && (
        <Typography variant="subtitle1" sx={{ mb: 2, color: "text.secondary", fontWeight: 500 }}>
          🏫 Centre sélectionné : <strong>{selectedCentre}</strong>
        </Typography>
      )}

      <Box mt={2}>
        <DeclicForm
          meta={meta ?? null}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/declic")}
          submitting={submitting}
          onCentreChange={(nom) => setSelectedCentre(nom)} // ✅ remonte le nom du centre depuis le formulaire
        />
      </Box>
    </PageTemplate>
  );
}
