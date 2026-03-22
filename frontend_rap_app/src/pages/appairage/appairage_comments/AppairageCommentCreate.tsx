// src/pages/appairages/appairage_comments/AppairageCommentCreatePage.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, Typography } from "@mui/material";

import AppairageCommentForm from "./AppairageCommentForm";
import type {
  AppairageCommentCreateInput,
  AppairageCommentDTO,
} from "../../../types/appairageComment";
import { useCreateAppairageComment } from "../../../hooks/useAppairageComments";
import PostCreateChoiceModal from "../../../components/modals/PostCreateChoiceModal";
import PageTemplate from "../../../components/PageTemplate";

export default function AppairageCommentCreatePage() {
  const navigate = useNavigate();
  const { appairageId } = useParams<{ appairageId?: string }>();
  const { create } = useCreateAppairageComment();

  const prefilledAppairageId =
    appairageId && Number.isFinite(Number(appairageId)) ? Number(appairageId) : undefined;

  const [choiceOpen, setChoiceOpen] = useState(false);
  const [lastCreated, setLastCreated] = useState<AppairageCommentDTO | null>(null);

  const handleCreate = async (input: AppairageCommentCreateInput) => {
    try {
      const created = await create(input);
      toast.success("💬 Commentaire créé avec succès");
      setLastCreated(created);
      setChoiceOpen(true);
    } catch (_error) {
      toast.error("Erreur lors de la création du commentaire");
    }
  };

  const appairageTarget =
    lastCreated?.appairage != null ? `/appairages/${lastCreated.appairage}/edit` : "/appairages";

  const commentsListTarget = "/appairage-commentaires";
  const dashboardTarget = "/dashboard";

  return (
    <PageTemplate
      title="➕ Nouveau commentaire d’appairage"
      backButton
      onBack={() => navigate(-1)}
      actions={
        <Button variant="outlined" onClick={() => navigate(commentsListTarget)}>
          Liste
        </Button>
      }
    >
      {/* Formulaire */}
      <Box mt={2}>
        <AppairageCommentForm
          appairageId={prefilledAppairageId}
          onSubmit={(data) => handleCreate(data as AppairageCommentCreateInput)}
        />
      </Box>

      {/* Modal post-création */}
      <PostCreateChoiceModal
        open={choiceOpen}
        onClose={() => setChoiceOpen(false)}
        resourceLabel="commentaire"
        persistId={lastCreated?.id}
        extraContent={
          lastCreated ? (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Associé à l’appairage&nbsp;
              <strong>#{lastCreated.appairage}</strong>
            </Typography>
          ) : null
        }
        primaryHref={appairageTarget}
        primaryLabel="Aller à l’appairage"
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
