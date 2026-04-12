// src/pages/candidats/CandidatCreatePage.tsx
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CircularProgress, Typography, Box } from "@mui/material";

import { useCandidatMeta, useCreateCandidat } from "../../hooks/useCandidats";
import { useMe } from "../../hooks/useUsers";
import type { CandidatFormData } from "../../types/candidat";

import CandidatForm from "./CandidatForm";
import PageTemplate from "../../components/PageTemplate";
import PageSection from "../../components/PageSection";
import PostCreateChoiceModal from "../../components/modals/PostCreateChoiceModal";
import { isCoreWriteRole } from "../../utils/roleGroups";

type CreatedCandidatLite = {
  id: number;
  nom?: string | null;
  prenom?: string | null;
  nom_complet?: string | null;
  compte_utilisateur_id?: number | null;
};

export default function CandidatCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: meta, loading: loadingMeta } = useCandidatMeta();
  const { user: me } = useMe();
  const { create, loading } = useCreateCandidat();

  const canEditFormation = !!me && isCoreWriteRole(me.role);
  const presetFormation = useMemo(() => {
    const raw = searchParams.get("formation");
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [searchParams]);

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
      <PageTemplate
        title="Créer un candidat"
        subtitle="Chargement des métadonnées nécessaires."
        maxWidth="xl"
        backButton
        onBack={() => navigate(-1)}
        centered
      >
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
    <PageTemplate
      title="Créer un candidat"
      subtitle="Ajoutez un candidat avec une structure de page plus lisible et plus compacte."
      maxWidth="xl"
      backButton
      onBack={() => navigate(-1)}
    >
      <PageSection>
        <Box>
          <CandidatForm
            initialValues={presetFormation ? ({ formation: presetFormation } as CandidatFormData) : undefined}
            meta={meta}
            currentUser={me}
            canEditFormation={canEditFormation}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/candidats")}
            submitting={loading}
          />
        </Box>
      </PageSection>

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
