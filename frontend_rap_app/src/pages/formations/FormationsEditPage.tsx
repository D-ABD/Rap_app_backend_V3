import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import api from "../../api/axios";
import { toApiError } from "../../api/httpClient";

import {
  useFormation,
  useFormationChoices,
  useUpdateFormation,
  useDeleteFormation,
} from "../../hooks/useFormations";

import type { Formation, FormationFormData } from "../../types/formation";
import PageTemplate from "../../components/PageTemplate";
import FormationForm from "./FormationForm";
import AddDocumentButton from "./componentsFormations/AddDocumentButton";

export default function FormationsEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 🧩 Conversion sécurisée de l'ID
  const formationId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [id]);

  // 🔄 Chargement des données
  const { data: detail, loading, error } = useFormation(formationId ?? 0);
  const { updateFormation, loading: saving } = useUpdateFormation(formationId ?? 0);
  const { deleteFormation, loading: removing } = useDeleteFormation(formationId ?? 0);
  const {
    centres = [],
    statuts = [],
    typeOffres = [],
    loading: loadingChoices,
  } = useFormationChoices();

  // 🧠 Local cache pour mise à jour instantanée
  const [localDetail, setLocalDetail] = useState<Formation | null>(null);

  // 🧩 Données fusionnées
  const formation = localDetail ?? detail;
  const archived = !!formation?.est_archivee;

  // ------------------------------------------------------------------
  // 🔹 Archiver / Désarchiver
  // ------------------------------------------------------------------
  const toggleArchive = async () => {
    if (!formationId || !formation) return;

    try {
      if (archived) {
        await api.post(`/formations/${formationId}/desarchiver/`);
        setLocalDetail({ ...formation, est_archivee: false, activite: "active" });
        toast.success("♻️ Formation désarchivée");
      } else {
        await api.post(`/formations/${formationId}/archiver/`);
        setLocalDetail({ ...formation, est_archivee: true, activite: "archivee" });
        toast.info("📦 Formation archivée");
      }
    } catch (err) {
      toast.error(`❌ ${toApiError(err).message || "Échec de l’opération d’archivage"}`);
    }
  };

  // ------------------------------------------------------------------
  // 🔹 Suppression
  // ------------------------------------------------------------------
  const deleteCurrent = async () => {
    if (!formationId) return;
    if (!window.confirm(`Supprimer définitivement la formation #${formationId} ?`)) return;

    try {
      await deleteFormation();
      toast.success("🗑️ Formation supprimée");
      navigate("/formations");
    } catch (err) {
      toast.error(`❌ ${toApiError(err).message || "Échec de la suppression"}`);
    }
  };

  // ------------------------------------------------------------------
  // 🔹 Soumission du formulaire (mise à jour)
  // ------------------------------------------------------------------
  const submitFormation = async (values: FormationFormData): Promise<void> => {
    if (!formationId) return;

    try {
      const updated = await updateFormation(values);
      setLocalDetail(updated);
      toast.success("✅ Formation mise à jour");

      // 🔁 Redirige vers la liste
      navigate("/formations");
    } catch (error: unknown) {
      toast.error(`❌ ${toApiError(error).message || "Échec de la mise à jour"}`);
      throw error;
    }
  };

  // ------------------------------------------------------------------
  // 🔹 États de chargement / erreurs
  // ------------------------------------------------------------------
  if (!formationId) {
    return (
      <PageTemplate title="Formation — détail">
        <Typography color="error">❌ Identifiant invalide.</Typography>
      </PageTemplate>
    );
  }

  if (loading || loadingChoices || !formation) {
    return (
      <PageTemplate title={`Formation #${formationId}`}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress />
        </Box>
      </PageTemplate>
    );
  }

  if (error || !detail) {
    return (
      <PageTemplate title={`Formation #${formationId}`}>
        <Typography color="error">❌ Impossible de charger la formation.</Typography>
      </PageTemplate>
    );
  }

  // ------------------------------------------------------------------
  // 🔹 Rendu principal
  // ------------------------------------------------------------------
  return (
    <PageTemplate
      title={`Formation #${formationId} — ${archived ? "Archivée" : "Active"}`}
      backButton
      onBack={() => navigate(-1)}
      actions={
        <Box display="flex" gap={1}>
          <AddDocumentButton formationId={formationId ?? 0} />

          <Button
            variant="contained"
            color={archived ? "success" : "warning"}
            onClick={toggleArchive}
            disabled={saving || removing}
          >
            {archived ? "♻️ Désarchiver" : "📦 Archiver"}
          </Button>

          <Button variant="outlined" color="error" onClick={deleteCurrent} disabled={removing}>
            {removing ? "Suppression…" : "Supprimer"}
          </Button>
        </Box>
      }
    >
      <Box
        sx={{
          backgroundColor: archived ? "rgba(245,245,245,0.9)" : "inherit",
          p: 2,
          borderRadius: 2,
        }}
      >
        {/* 🧾 Formulaire */}
        <FormationForm
          initialValues={formation}
          centres={centres}
          statuts={statuts}
          typeOffres={typeOffres}
          loading={saving}
          loadingChoices={loadingChoices}
          onSubmit={submitFormation}
          onCancel={() => navigate("/formations")}
          submitLabel="💾 Mettre à jour"
        />

        {/* 📅 Footer d'infos */}
        <Box
          mt={4}
          sx={{
            color: "text.secondary",
            fontSize: "0.85rem",
            lineHeight: 1.6,
          }}
        >
          <div>
            <strong>📌 Créée le :</strong>{" "}
            {formation?.created_at
              ? new Date(formation.created_at).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </div>

          {formation?.updated_at && (
            <div>
              <strong>✏️ Dernière mise à jour :</strong>{" "}
              {new Date(formation.updated_at).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </Box>
      </Box>
    </PageTemplate>
  );
}
