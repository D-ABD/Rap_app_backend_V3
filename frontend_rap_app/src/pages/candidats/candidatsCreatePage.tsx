// src/pages/candidats/CandidatCreatePage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { CircularProgress, Typography, Box } from "@mui/material";

import { useCandidatMeta, useCreateCandidat } from "../../hooks/useCandidats";
import { useMe } from "../../hooks/useUsers";
import type { CandidatFormData } from "../../types/candidat";

import CandidatForm from "./CandidatForm";
import PageTemplate from "../../components/PageTemplate";
import PostCreateChoiceModal from "../../components/modals/PostCreateChoiceModal";

type CreatedCandidatLite = {
  id: number;
  nom?: string | null;
  prenom?: string | null;
  nom_complet?: string | null;
  compte_utilisateur_id?: number | null;
};

export default function CandidatCreatePage() {
  const navigate = useNavigate();
  const { data: meta, loading: loadingMeta } = useCandidatMeta();
  const { user: me } = useMe();
  const { create, loading } = useCreateCandidat();

  const canEditFormation = !!me && ["admin", "superadmin", "staff"].includes(me.role);

  // 🔹 Modale post-création
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [lastCreated, setLastCreated] = useState<CreatedCandidatLite | null>(null);

  // 🧩 handleSubmit : on laisse CandidatForm gérer les erreurs 400
  const handleSubmit = async (values: CandidatFormData) => {
    try {
      // 🔧 Nettoyer les valeurs vides
      const payload = Object.fromEntries(
        Object.entries(values).map(([k, v]) => (v === "" ? [k, undefined] : [k, v]))
      ) as CandidatFormData;

      const created = (await create(payload)) as CreatedCandidatLite;
      toast.success("✅ Candidat créé");

      setLastCreated({
        id: created.id,
        nom: created.nom ?? null,
        prenom: created.prenom ?? null,
        nom_complet: created.nom_complet ?? null,
        compte_utilisateur_id: created.compte_utilisateur_id ?? null,
      });
      setChoiceOpen(true);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status && status !== 400) {
        toast.error("Erreur serveur ou réseau lors de la création.");
      }
      // Laisse remonter l’erreur 400 pour gestion dans <CandidatForm />
      throw error;
    }
  };

  // ── Loading meta ────────────────────────────────
  if (loadingMeta) {
    return (
      <PageTemplate title="Créer un candidat" backButton onBack={() => navigate(-1)} centered>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>⏳ Chargement…</Typography>
      </PageTemplate>
    );
  }

  // Nom d'affichage pour la modale
  const displayName =
    lastCreated?.nom_complet ||
    [lastCreated?.prenom, lastCreated?.nom].filter(Boolean).join(" ") ||
    null;

  // Liens de la modale
  const primaryHref = lastCreated?.compte_utilisateur_id
    ? `/prospections/create?owner=${lastCreated.compte_utilisateur_id}`
    : `/prospections/create`;

  const secondaryHref = lastCreated?.id
    ? `/appairages/create?candidat=${lastCreated.id}`
    : `/appairages/create`;

  return (
    <PageTemplate title="➕ Nouveau candidat" backButton onBack={() => navigate(-1)}>
      <Box mt={2}>
        <CandidatForm
          meta={meta}
          currentUser={me}
          canEditFormation={canEditFormation}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/candidats")}
          submitting={loading}
        />
      </Box>

      {/* 🔻 Modale post-création */}
      <PostCreateChoiceModal
        open={choiceOpen}
        onClose={() => setChoiceOpen(false)}
        resourceLabel="candidat"
        persistId={lastCreated?.id}
        extraContent={
          displayName ? (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>{displayName}</strong>
            </Typography>
          ) : null
        }
        primaryHref={primaryHref}
        primaryLabel="Créer une prospection"
        primaryVariant="primary"
        secondaryHref={secondaryHref}
        secondaryLabel="Créer un appairage"
        secondaryVariant="secondary"
        tertiaryHref="/candidats"
        tertiaryLabel="Aller à la liste des candidats"
        tertiaryVariant="secondary"
      />
    </PageTemplate>
  );
}
