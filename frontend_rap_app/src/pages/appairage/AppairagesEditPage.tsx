// src/pages/appairages/AppairagesEditPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import api from "../../api/axios";

import {
  useAppairage,
  useUpdateAppairage,
  useDeleteAppairage,
  useAppairageMeta,
} from "../../hooks/useAppairage";

import type { Appairage, AppairageFormData, AppairageUpdatePayload } from "../../types/appairage";
import type { AppairageCommentDTO } from "../../types/appairageComment";
import { isAppairageArchived } from "../../types/appairage";

import AppairageForm from "./AppairageForm";
import AppairageLastCommentRow from "./appairage_comments/AppairageLastCommentRow";
import AppairageCommentsModal from "../../components/modals/AppairageCommentsModal";
import PageTemplate from "../../components/PageTemplate";

export default function AppairagesEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [openComments, setOpenComments] = useState(false);
  const [localLastComment, setLocalLastComment] = useState<AppairageCommentDTO | null>(null);
  const [localCount, setLocalCount] = useState<number>(0);
  const [localDetail, setLocalDetail] = useState<Appairage | null>(null);

  // 🔹 ID de l'appairage
  const appairageId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [id]);

  // 🔹 Récupération des données uniquement si l'ID est valide
  const { data: detail, loading, error } = useAppairage(appairageId);
  const { update, loading: saving } = useUpdateAppairage(appairageId ?? 0);
  const { remove, loading: removing } = useDeleteAppairage(appairageId ?? 0);
  const { data: meta, loading: metaLoading, error: metaError } = useAppairageMeta();

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get("openComments") === "1") setOpenComments(true);
  }, [location.search]);

  // ------------------------------------------------------------------
  // 🔹 Handlers CRUD
  // ------------------------------------------------------------------
  const handleUpdate = async (data: AppairageUpdatePayload) => {
    if (!appairageId) return;
    try {
      const updated = await update(data);
      setLocalDetail(updated);
      toast.success("✅ Appairage mis à jour");
    } catch {
      toast.error("❌ Échec de la mise à jour");
    }
  };

  const handleDelete = async () => {
    if (!appairageId) return;
    if (!window.confirm(`Supprimer définitivement l’appairage #${appairageId} ?`)) return;
    try {
      await remove();
      toast.success("🗑️ Appairage supprimé");
      navigate("/appairages");
    } catch {
      toast.error("❌ Échec de la suppression");
    }
  };

  // ------------------------------------------------------------------
  // 🔹 Archiver / Désarchiver
  // ------------------------------------------------------------------
  const handleArchiveToggle = async () => {
    if (!appairageId || !detail) return;
    try {
      if (isAppairageArchived(localDetail ?? detail)) {
        await api.post(`/appairages/${appairageId}/desarchiver/`);
        toast.success("♻️ Appairage désarchivé");
        const updated = {
          ...(localDetail ?? detail),
          activite: "actif",
          activite_display: "Actif",
        } as Appairage;
        setLocalDetail(updated);
      } else {
        await api.post(`/appairages/${appairageId}/archiver/`);
        toast.info("📦 Appairage archivé");
        const updated = {
          ...(localDetail ?? detail),
          activite: "archive",
          activite_display: "Archivé",
        } as Appairage;
        setLocalDetail(updated);
      }
    } catch {
      toast.error("❌ Échec de l’opération d’archivage");
    }
  };

  // ------------------------------------------------------------------
  // 🔹 Rendu conditionnel
  // ------------------------------------------------------------------

  if (!appairageId) {
    return (
      <PageTemplate title="Appairage — détail">
        <Typography color="error">❌ Identifiant invalide.</Typography>
      </PageTemplate>
    );
  }

  if (loading || metaLoading) {
    return (
      <PageTemplate title={`Appairage #${appairageId}`}>
        <CircularProgress />
      </PageTemplate>
    );
  }

  if (error || metaError || !detail || !meta) {
    return (
      <PageTemplate title={`Appairage #${appairageId}`}>
        <Typography color="error">❌ Impossible de charger l’appairage.</Typography>
      </PageTemplate>
    );
  }

  // ------------------------------------------------------------------
  // 🔹 Données prêtes
  // ------------------------------------------------------------------
  const appairageDetail = (localDetail ?? detail) as Appairage;

  const formInitialValues: Partial<AppairageFormData> = {
    partenaire: appairageDetail.partenaire,
    partenaire_nom: appairageDetail.partenaire_nom ?? null,
    formation: appairageDetail.formation,
    formation_nom: appairageDetail.formation_nom ?? null,
    candidat: appairageDetail.candidat,
    candidat_nom: appairageDetail.candidat_nom ?? null,
    candidat_prenom: null,
    statut: appairageDetail.statut,
    activite: appairageDetail.activite ?? null,
    commentaire: appairageDetail.commentaire ?? "",
    last_commentaire: null,
    commentaires:
      appairageDetail.commentaires?.map((c) => ({
        id: c.id,
        body: c.body,
        created_at: c.created_at ?? "",
        auteur_nom: c.auteur_nom ?? null,
      })) ?? [],
  };

  const handleCommentAdded = (c: AppairageCommentDTO) => {
    setLocalLastComment(c);
    setLocalCount((prev) => prev + 1);
  };

  const comments = appairageDetail.commentaires ?? [];
  const lastRealComment: AppairageCommentDTO | null =
    comments.length > 0 ? (comments[comments.length - 1] as AppairageCommentDTO) : null;

  const effectiveLastComment: AppairageCommentDTO | null = localLastComment ?? lastRealComment;

  const effectiveCount = localCount || comments.length;
  const archived = isAppairageArchived(appairageDetail);

  // ------------------------------------------------------------------
  // 🔹 Rendu principal
  // ------------------------------------------------------------------
  return (
    <PageTemplate
      title={`Appairage #${appairageId} — ${
        appairageDetail.activite_display ?? (archived ? "Archivé" : "Actif")
      }`}
      backButton
      onBack={() => navigate(-1)}
      actions={
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            color={archived ? "success" : "warning"}
            onClick={handleArchiveToggle}
            disabled={saving || removing}
          >
            {archived ? "♻️ Désarchiver" : "📦 Archiver"}
          </Button>

          <Button variant="outlined" color="error" onClick={handleDelete} disabled={removing}>
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
        {/* Commentaires */}
        <AppairageLastCommentRow
          appairageId={appairageId}
          lastComment={effectiveLastComment}
          commentsCount={effectiveCount}
          onOpenModal={() => setOpenComments(true)}
        />
        <AppairageCommentsModal
          show={openComments}
          onClose={() => setOpenComments(false)}
          appairageId={appairageId}
          onCommentAdded={handleCommentAdded}
        />

        {/* Formulaire */}
        <Box mt={3}>
          <AppairageForm
            mode="edit"
            initialValues={formInitialValues}
            onSubmit={handleUpdate}
            loading={saving}
            meta={meta}
          />
        </Box>

        {/* Footer : dates */}
        <Box
          mt={4}
          sx={{
            color: "text.secondary",
            fontSize: "0.85rem",
            lineHeight: 1.6,
          }}
        >
          <div>
            <strong>📌 Créé le :</strong>{" "}
            {appairageDetail.created_at
              ? new Date(appairageDetail.created_at).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </div>
          {appairageDetail.updated_at && (
            <div>
              <strong>✏️ Dernière mise à jour :</strong>{" "}
              {new Date(appairageDetail.updated_at).toLocaleDateString("fr-FR", {
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
