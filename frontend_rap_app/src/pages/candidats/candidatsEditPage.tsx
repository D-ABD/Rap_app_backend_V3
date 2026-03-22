// src/pages/candidats/CandidatEditPage.tsx
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CircularProgress, Typography, Box } from "@mui/material";

import { useCandidat, useCandidatMeta, useUpdateCandidat } from "../../hooks/useCandidats";
import { useMe } from "../../hooks/useUsers";

import type { Candidat, CandidatFormData } from "../../types/candidat";
import PageTemplate from "../../components/PageTemplate";
import CandidatForm from "./CandidatForm";

export default function CandidatEditPage() {
  const { id } = useParams();
  const candidatId = Number(id);
  const navigate = useNavigate();

  const { data: meta, loading: loadingMeta } = useCandidatMeta();
  const { user: me } = useMe();
  const { data, loading: loadingItem } = useCandidat(candidatId);
  const { update, loading: saving } = useUpdateCandidat(candidatId);

  const canEditFormation = !!me && ["admin", "superadmin", "staff"].includes(me.role);

  /**
   * 🧩 handleSubmit
   * Laisse la gestion fine des erreurs (400 → champ par champ) au composant <CandidatForm />
   * On ne gère ici que les erreurs inattendues (réseau, 500…)
   */
  const handleSubmit = async (values: CandidatFormData) => {
    try {
      await update(values);
      toast.success("✅ Candidat mis à jour");
      navigate("/candidats");
    } catch (error: any) {
      const status = error?.response?.status;
      // ❌ Erreurs inattendues (pas du 400 de validation)
      if (status && status !== 400) {
        toast.error("Erreur serveur ou réseau lors de la mise à jour.");
      }
      throw error;
    }
  };

  // ── Loading / Erreurs ────────────────────────────────
  if (loadingMeta || loadingItem) {
    return (
      <PageTemplate title="Modifier le candidat" backButton onBack={() => navigate(-1)} centered>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>⏳ Chargement…</Typography>
      </PageTemplate>
    );
  }

  if (!data) {
    return (
      <PageTemplate title="Modifier le candidat" backButton onBack={() => navigate(-1)}>
        <Typography color="error">❌ Candidat introuvable.</Typography>
      </PageTemplate>
    );
  }

  // ── Page principale ────────────────────────────────
  return (
    <PageTemplate
      title={`👤 Candidat #${candidatId} — édition`}
      backButton
      onBack={() => navigate(-1)}
    >
      {/* Formulaire d’édition — section cible du scroll */}
      <Box id="edit-section" sx={{ scrollMarginTop: "80px" }}>
        <Typography variant="h6" gutterBottom>
          ✏️ Modifier les informations
        </Typography>

        <CandidatForm
          initialValues={data as Candidat}
          meta={meta}
          currentUser={me}
          canEditFormation={canEditFormation}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/candidats")}
          submitting={saving}
        />
      </Box>
    </PageTemplate>
  );
}
