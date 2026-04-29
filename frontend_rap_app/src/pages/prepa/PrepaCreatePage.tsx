import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import { CircularProgress, Typography, Box } from "@mui/material";

import type { Prepa } from "src/types/prepa";
import PageTemplate from "src/components/PageTemplate";
import { useCreatePrepa, usePrepaMeta } from "src/hooks/usePrepa";
import PrepaForm from "./PrepaForm";
import { extractPrepaApiMessage } from "./prepaApiError";

/**
 * Page : Création directe d’une activité Prépa
 * → redirige vers /prepa après enregistrement
 */
export default function PrepaCreatePage() {
  const navigate = useNavigate();
  const { meta, loading: loadingMeta } = usePrepaMeta();
  const { create } = useCreatePrepa();

  const [submitting, setSubmitting] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<string | null>(null); // ✅ nom du centre sélectionné

  // Soumission du formulaire
  const handleSubmit = async (values: Partial<Prepa>) => {
    try {
      setSubmitting(true);
      const payload = Object.fromEntries(
        Object.entries(values).map(([k, v]) => (v === "" ? [k, undefined] : [k, v]))
      ) as Partial<Prepa>;

      await create(payload);
      toast.success("✅ Activité Prépa créée avec succès");
      navigate("/prepa"); // 👉 redirection directe
    } catch (error) {
      const axiosErr = error as AxiosError<unknown>;
      const data = axiosErr.response?.data;
      const parsed = data ? extractPrepaApiMessage(data) : null;
      const msg = parsed ?? axiosErr.message ?? "Erreur lors de la création de l’activité Prépa";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <PageTemplate title="➕ Nouvelle activité Prépa" centered>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>⏳ Chargement…</Typography>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="➕ Nouvelle activité Prépa" backButton onBack={() => navigate(-1)}>
      {/* ✅ Affichage du centre sélectionné */}
      {selectedCentre && (
        <Typography variant="subtitle1" sx={{ mb: 2, color: "text.secondary", fontWeight: 500 }}>
          🏫 Centre sélectionné : <strong>{selectedCentre}</strong>
        </Typography>
      )}

      <Box mt={2}>
        <PrepaForm
          meta={meta ?? null}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/prepa")}
          submitting={submitting}
          onCentreChange={(nom) => setSelectedCentre(nom)} // ✅ remonte le nom du centre depuis le formulaire
        />
      </Box>
    </PageTemplate>
  );
}
