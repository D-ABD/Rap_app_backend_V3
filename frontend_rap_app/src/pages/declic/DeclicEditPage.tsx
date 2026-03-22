import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import { Box, Button, CircularProgress, Typography } from "@mui/material";

import type { Declic } from "src/types/declic";
import {
  useDeclicDetail,
  useUpdateDeclic,
  useDeleteDeclic,
  useDeclicMeta,
} from "src/hooks/useDeclic";
import PageTemplate from "src/components/PageTemplate";
import DeclicForm from "./DeclicForm";

/* ─────────────────────────────── */
/* 🔧 Helpers pour les erreurs API */
/* ─────────────────────────────── */
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

function extractApiMessage(data: unknown): string | null {
  if (!isRecord(data)) return null;

  const maybeMessage = (data as { message?: unknown }).message;
  if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;

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

/* ─────────────────────────────── */
/* 🧩 Page : édition d’une séance Déclic */
/* ─────────────────────────────── */
export default function DeclicEditPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = useMemo(() => (idParam ? Number(idParam) : NaN), [idParam]);
  const navigate = useNavigate();

  const { data, loading, error } = useDeclicDetail(Number.isNaN(id) ? null : id);
  const { update } = useUpdateDeclic();
  const { remove } = useDeleteDeclic();
  const { meta, loading: loadingMeta } = useDeclicMeta();

  const [submitting, setSubmitting] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<string | null>(null);

  /* ─────────────────────────────── */
  /* 💾 Mise à jour du Déclic */
  /* ─────────────────────────────── */
  const handleSubmit = async (values: Partial<Declic>) => {
    if (Number.isNaN(id)) return;
    try {
      setSubmitting(true);
      const payload = Object.fromEntries(
        Object.entries(values).filter(([_, v]) => v !== undefined && v !== "")
      ) as Partial<Declic>;

      await update(id, payload);
      toast.success("✅ Séance Déclic mise à jour avec succès");
      navigate("/declic");
    } catch (e) {
      const axiosErr = e as AxiosError<unknown>;
      const parsed = axiosErr.response?.data ? extractApiMessage(axiosErr.response.data) : null;
      toast.error(parsed ?? axiosErr.message ?? "Erreur lors de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─────────────────────────────── */
  /* 🗑️ Suppression */
  /* ─────────────────────────────── */
  const handleDelete = async () => {
    if (Number.isNaN(id)) return;
    if (!window.confirm("Supprimer cette séance Déclic ?")) return;
    try {
      await remove(id);
      toast.success("🗑️ Séance supprimée avec succès");
      navigate("/declic");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  /* ─────────────────────────────── */
  /* 📦 États de chargement / erreur */
  /* ─────────────────────────────── */
  if (Number.isNaN(id)) {
    return (
      <PageTemplate title="Modifier une séance Déclic">
        <Typography color="error">❌ ID invalide</Typography>
      </PageTemplate>
    );
  }

  if (loading || loadingMeta) {
    return (
      <PageTemplate title={`Modifier Déclic #${id}`} centered>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>⏳ Chargement…</Typography>
      </PageTemplate>
    );
  }

  if (error) {
    return (
      <PageTemplate title={`Modifier Déclic #${id}`}>
        <Typography color="error">❌ Erreur de chargement des données.</Typography>
      </PageTemplate>
    );
  }

  if (!data) {
    return (
      <PageTemplate title={`Modifier Déclic #${id}`}>
        <Typography color="error">❌ Séance Déclic introuvable.</Typography>
      </PageTemplate>
    );
  }

  /* ─────────────────────────────── */
  /* 🧮 Valeurs initiales */
  /* ─────────────────────────────── */
  const initialValues: Partial<Declic> = {
    type_declic: data.type_declic ?? "info_collective",
    date_declic: data.date_declic?.trim() ? data.date_declic : "",
    centre_id: typeof data.centre_id === "number" ? data.centre_id : (data.centre?.id ?? undefined),
    commentaire: data.commentaire ?? "",
    nb_inscrits_declic: data.nb_inscrits_declic ?? 0,
    nb_presents_declic: data.nb_presents_declic ?? 0,
    nb_absents_declic: data.nb_absents_declic ?? 0,
  };

  /* ─────────────────────────────── */
  /* 🎨 Rendu principal */
  /* ─────────────────────────────── */
  return (
    <PageTemplate
      title={`✏️ Modifier la séance Déclic #${id}`}
      backButton
      onBack={() => navigate(-1)}
      actions={
        <Button color="error" variant="outlined" onClick={handleDelete}>
          Supprimer
        </Button>
      }
    >
      {/* ✅ Affichage du centre sélectionné */}
      {selectedCentre && (
        <Typography variant="subtitle1" sx={{ mb: 2, color: "text.secondary", fontWeight: 500 }}>
          🏫 Centre sélectionné : <strong>{selectedCentre}</strong>
        </Typography>
      )}

      <Box mt={2}>
        <DeclicForm
          initialValues={initialValues}
          meta={meta ?? null}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/declic")}
          onCentreChange={(nom) => setSelectedCentre(nom)} // ✅ même comportement que dans Create
        />
      </Box>
    </PageTemplate>
  );
}
