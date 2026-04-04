import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";

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
  if (parts.length) return parts.join(" | ");
  if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;
  return null;
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
  /* 💾 Mise à jour de la séance */
  /* ─────────────────────────────── */
  const handleSubmit = async (values: Partial<Declic>) => {
    if (Number.isNaN(id)) return;
    try {
      setSubmitting(true);
      const payload = Object.fromEntries(
        Object.entries(values).filter(([_, v]) => v !== undefined && v !== "")
      ) as Partial<Declic>;

      await update(id, payload);
      toast.success("La séance Déclic a bien été mise à jour.");
      navigate("/declic");
    } catch (e) {
      const axiosErr = e as AxiosError<unknown>;
      const parsed = axiosErr.response?.data ? extractApiMessage(axiosErr.response.data) : null;
      toast.error(
        parsed ?? axiosErr.message ?? "La séance Déclic n'a pas pu être mise à jour. Vérifie les champs saisis."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ─────────────────────────────── */
  /* 📦 Archivage */
  /* ─────────────────────────────── */
  const handleDelete = async () => {
    if (Number.isNaN(id)) return;
    if (!window.confirm("Archiver cette séance Déclic ?")) return;
    try {
      await remove(id);
      toast.success("La séance Déclic a bien été archivée.");
      navigate("/declic");
    } catch {
      toast.error("La séance Déclic n'a pas pu être archivée.");
    }
  };

  /* ─────────────────────────────── */
  /* 📦 États de chargement / erreur */
  /* ─────────────────────────────── */
  if (Number.isNaN(id)) {
    return (
      <PageTemplate title="Modifier une séance Déclic">
        <Alert severity="error">L'identifiant de la séance Déclic est invalide.</Alert>
      </PageTemplate>
    );
  }

  if (loading || loadingMeta) {
    return (
      <PageTemplate title={`Modifier la séance Déclic #${id}`} centered>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement de la séance Déclic…</Typography>
      </PageTemplate>
    );
  }

  if (error) {
    return (
      <PageTemplate title={`Modifier la séance Déclic #${id}`}>
        <Alert severity="error">
          Les données de la séance Déclic n'ont pas pu être chargées.
        </Alert>
      </PageTemplate>
    );
  }

  if (!data) {
    return (
      <PageTemplate title={`Modifier la séance Déclic #${id}`}>
        <Alert severity="error">La séance Déclic demandée est introuvable.</Alert>
      </PageTemplate>
    );
  }

  /* ─────────────────────────────── */
  /* 🧮 Valeurs initiales */
  /* ─────────────────────────────── */
  const initialValues: Partial<Declic> = {
    type_declic: data.type_declic ?? "atelier_1",
    date_declic: data.date_declic?.trim() ? data.date_declic : "",
    centre_id: typeof data.centre_id === "number" ? data.centre_id : (data.centre?.id ?? undefined),
    participants_declic: data.participants_declic ?? [],
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
      title={`Modifier la séance Déclic #${id}`}
      backButton
      onBack={() => navigate(-1)}
      actions={
        <Button color="error" variant="outlined" onClick={handleDelete}>
          Archiver
        </Button>
      }
    >
      {/* ✅ Affichage du centre sélectionné */}
      {selectedCentre && (
        <Typography variant="subtitle1" sx={{ mb: 2, color: "text.secondary", fontWeight: 500 }}>
          Centre sélectionné : <strong>{selectedCentre}</strong>
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
