// src/pages/prospection/prospectioncomments/ProspectionCommentCreate.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Button, Stack } from "@mui/material";

import PageTemplate from "../../../components/PageTemplate";
import ProspectionCommentForm from "./ProspectionCommentForm";
import type { ProspectionCommentCreateInput } from "../../../types/prospectionComment";
import { useCreateProspectionComment } from "../../../hooks/useProspectionComments";
import { useAuth } from "../../../hooks/useAuth";
import PostCreateChoiceModal from "../../../components/modals/PostCreateChoiceModal";

type CreatedCommentLite = {
  id: number;
  prospection: number;
  body?: string | null;
};

export default function ProspectionCommentCreatePage() {
  const navigate = useNavigate();
  const { prospectionId } = useParams<{ prospectionId?: string }>();
  const { create } = useCreateProspectionComment();
  const { user } = useAuth();

  const isStaff = ["staff", "admin", "superadmin"].includes(user?.role ?? "");

  const prefilledProspectionId =
    prospectionId && Number.isFinite(Number(prospectionId)) ? Number(prospectionId) : undefined;

  const [choiceOpen, setChoiceOpen] = useState(false);
  const [lastCreated, setLastCreated] = useState<CreatedCommentLite | null>(null);

  const handleCreate = async (input: ProspectionCommentCreateInput) => {
    try {
      const created = (await create(input)) as CreatedCommentLite;
      toast.success("💬 Commentaire créé avec succès");
      setLastCreated(created);
      setChoiceOpen(true);
    } catch (_error) {
      // ✅ renommé en _error pour éviter le warning ESLint
      toast.error("Erreur lors de la création du commentaire");
    }
  };

  const prospectionTarget =
    lastCreated?.prospection != null
      ? isStaff
        ? `/prospections/${lastCreated.prospection}/edit`
        : `/prospections/${lastCreated.prospection}/edit-candidat`
      : "/prospection";

  const commentsListTarget = "/prospection-commentaires";
  const dashboardTarget = "/dashboard";

  return (
    <PageTemplate
      title="Nouveau commentaire"
      backButton
      onBack={() => navigate(-1)}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            ← Retour
          </Button>
          <Button variant="outlined" onClick={() => navigate("/prospection-commentaires")}>
            Liste
          </Button>
        </Stack>
      }
    >
      <ProspectionCommentForm
        prospectionId={prefilledProspectionId}
        canSetInternal={isStaff}
        onSubmit={handleCreate}
      />

      <PostCreateChoiceModal
        open={choiceOpen}
        onClose={() => setChoiceOpen(false)}
        resourceLabel="commentaire"
        persistId={lastCreated?.id}
        extraContent={
          lastCreated ? (
            <p style={{ marginTop: 4 }}>
              <span>Associé à la prospection&nbsp;#</span>
              <strong>{lastCreated.prospection}</strong>
            </p>
          ) : null
        }
        primaryHref={prospectionTarget}
        primaryLabel="Aller à la prospection"
        primaryVariant="primary"
        secondaryHref={commentsListTarget}
        secondaryLabel="Voir les commentaires"
        secondaryVariant="secondary"
        tertiaryHref={dashboardTarget}
        tertiaryLabel="Aller au tableau de bord"
        tertiaryVariant="secondary"
      />
    </PageTemplate>
  );
}
