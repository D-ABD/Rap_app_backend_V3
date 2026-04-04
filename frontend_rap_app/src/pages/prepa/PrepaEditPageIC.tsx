import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import { Box, Button, CircularProgress, Typography } from "@mui/material";

import type { Prepa } from "src/types/prepa";
import { usePrepaDetail, useUpdatePrepa, useDeletePrepa, usePrepaMeta } from "src/hooks/usePrepa";
import PageTemplate from "src/components/PageTemplate";
import PrepaFormIC from "./PrepaFormIC";

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
/* 🧩 Page : édition d’une séance Prépa */
/* ─────────────────────────────── */
export default function PrepaEditPageIC() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = useMemo(() => (idParam ? Number(idParam) : NaN), [idParam]);
  const navigate = useNavigate();

  const { data, loading, error } = usePrepaDetail(Number.isNaN(id) ? null : id);
  const { update } = useUpdatePrepa();
  const { remove } = useDeletePrepa();
  const { meta, loading: loadingMeta } = usePrepaMeta();

  const [submitting, setSubmitting] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<string | null>(null);

  /* ─────────────────────────────── */
  /* 💾 Mise à jour du Prépa */
  /* ─────────────────────────────── */
  const handleSubmit = async (values: Partial<Prepa>) => {
    if (Number.isNaN(id)) return;
    try {
      setSubmitting(true);
      const payload = Object.fromEntries(
        Object.entries(values).filter(([_, v]) => v !== undefined && v !== "")
      ) as Partial<Prepa>;

      await update(id, payload);
      toast.success("✅ Séance Prépa mise à jour avec succès");
      navigate("/prepa");
    } catch (e) {
      const axiosErr = e as AxiosError<unknown>;
      const parsed = axiosErr.response?.data ? extractApiMessage(axiosErr.response.data) : null;
      toast.error(parsed ?? axiosErr.message ?? "Erreur lors de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─────────────────────────────── */
  /* 📦 Archivage */
  /* ─────────────────────────────── */
  const handleDelete = async () => {
    if (Number.isNaN(id)) return;
    if (!window.confirm("Archiver cette séance Prépa ?")) return;
    try {
      await remove(id);
      toast.success("📦 Séance archivée avec succès");
      navigate("/prepa");
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  /* ─────────────────────────────── */
  /* 📦 États de chargement / erreur */
  /* ─────────────────────────────── */
  if (Number.isNaN(id)) {
    return (
      <PageTemplate title="Modifier une séance Prépa">
        <Typography color="error">❌ ID invalide</Typography>
      </PageTemplate>
    );
  }

  if (loading || loadingMeta) {
    return (
      <PageTemplate title={`Modifier Prépa #${id}`} centered>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>⏳ Chargement…</Typography>
      </PageTemplate>
    );
  }

  if (error) {
    return (
      <PageTemplate title={`Modifier Prépa #${id}`}>
        <Typography color="error">❌ Erreur de chargement des données.</Typography>
      </PageTemplate>
    );
  }

  if (!data) {
    return (
      <PageTemplate title={`Modifier Prépa #${id}`}>
        <Typography color="error">❌ Séance Prépa introuvable.</Typography>
      </PageTemplate>
    );
  }

  /* ─────────────────────────────── */
  /* 🧮 Valeurs initiales */
  /* ─────────────────────────────── */
  const initialValues: Partial<Prepa> = {
    type_prepa: data.type_prepa ?? "info_collective",
    date_prepa: data.date_prepa?.trim() ? data.date_prepa : "",
    centre_id: typeof data.centre_id === "number" ? data.centre_id : (data.centre?.id ?? undefined),
    formateur_animateur: data.formateur_animateur ?? "",
    commentaire: data.commentaire ?? "",
    nombre_places_ouvertes: data.nombre_places_ouvertes ?? 0,
    nombre_prescriptions: data.nombre_prescriptions ?? 0,
    nb_presents_info: data.nb_presents_info ?? 0,
    nb_absents_info: data.nb_absents_info ?? 0,
    nb_adhesions: data.nb_adhesions ?? 0,
    nb_inscrits_prepa: data.nb_inscrits_prepa ?? 0,
    nb_presents_prepa: data.nb_presents_prepa ?? 0,
    nb_absents_prepa: data.nb_absents_prepa ?? 0,
    stagiaires_prepa: data.stagiaires_prepa ?? [],
  };

  /* ─────────────────────────────── */
  /* 🎨 Rendu principal */
  /* ─────────────────────────────── */
  return (
    <PageTemplate
      title={`✏️ Modifier la séance Prépa #${id}`}
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
          🏫 Centre sélectionné : <strong>{selectedCentre}</strong>
        </Typography>
      )}

      <Box mt={2}>
        <PrepaFormIC
          initialValues={initialValues}
          meta={meta ?? null}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/prepa")}
          onCentreChange={(nom) => setSelectedCentre(nom)}
        />
      </Box>
    </PageTemplate>
  );
}
