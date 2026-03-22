// src/pages/prospection/ProspectionEditPage.tsx
import { useRef, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Typography,
  Link,
} from "@mui/material";

import PageTemplate from "../../components/PageTemplate";
import ProspectionForm from "./ProspectionForm";
import ProspectionLastCommentRow from "./prospectioncomments/ProspectionLastCommentRow";
import ProspectionCommentsModal from "../../components/modals/ProspectionCommentsModal";
import CreatePartenaireButton from "./CreatePartenaireButton";

import type { ProspectionDetailDTO, ProspectionFormData } from "../../types/prospection";
import api from "../../api/axios";
import {
  useProspection,
  useUpdateProspection,
  useDeleteProspection,
} from "../../hooks/useProspection";

/* ──────────────────────────────────────────────────────────────── */

type ProspectionFormDataWithId = ProspectionFormData & { id?: number };

export default function ProspectionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef<HTMLDivElement | null>(null);

  const [openComments, setOpenComments] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [localLastComment, setLocalLastComment] = useState<string | null>(null);
  const [localCount, setLocalCount] = useState<number>(0);
  const [localDetail, setLocalDetail] = useState<ProspectionDetailDTO | null>(null);
  const [formationFallback, setFormationFallback] = useState<{
    id: number;
    nom: string;
    num_offre?: string | null;
  } | null>(null);

  const prospectionId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }, [id]);

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get("openComments") === "1") setOpenComments(true);
  }, [location.search]);

  const { data: hookDetail, loading, error } = useProspection(prospectionId);
  const { update, loading: saving } = useUpdateProspection(prospectionId ?? 0);
  const { remove, loading: removing } = useDeleteProspection(prospectionId ?? 0);

  /* ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (hookDetail) setLocalDetail(hookDetail as ProspectionDetailDTO);
  }, [hookDetail]);

  // Fallback formation (si nom manquant)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!localDetail?.formation) return;
      if (localDetail.formation_nom && localDetail.formation_nom.trim() !== "") return;
      try {
        const res = await api.get(`/formations/${localDetail.formation}/`);
        const raw = res.data as any;
        const data = raw?.data ?? raw;
        if (data?.nom && alive) {
          setFormationFallback({
            id: data.id,
            nom: data.nom,
            num_offre: data.num_offre ?? null,
          });
        }
      } catch {
        /* silencieux */
      }
    })();
    return () => {
      alive = false;
    };
  }, [localDetail?.formation, localDetail?.formation_nom]);

  /* ──────────────────────────────────────────────────────────────── */

  const handleUpdate = async (data: ProspectionFormData) => {
    if (!prospectionId) return;
    try {
      const updated = await update(data);
      setLocalDetail(updated as ProspectionDetailDTO);
      toast.success("✅ Prospection mise à jour");

      // 🔁 Redirection après un court délai (optionnel)
      setTimeout(() => {
        navigate("/prospections");
      }, 400);
    } catch {
      toast.error("❌ Échec de la mise à jour");
    }
  };

  const handleDelete = async () => {
    if (!prospectionId) return;
    try {
      await remove();
      toast.success("🗑️ Prospection supprimée");
      navigate("/prospections");
    } catch {
      toast.error("❌ Échec de la suppression");
    }
  };

  const handleArchiveToggle = async () => {
    if (!prospectionId || !localDetail) return;

    try {
      if (localDetail.activite === "archivee") {
        await api.post(`/prospections/${prospectionId}/desarchiver/`);
        toast.success("♻️ Prospection désarchivée");
        setLocalDetail({
          ...localDetail,
          activite: "active",
          activite_display: "Active",
        });
      } else {
        await api.post(`/prospections/${prospectionId}/archiver/`);
        toast.info("📦 Prospection archivée");
        setLocalDetail({
          ...localDetail,
          activite: "archivee",
          activite_display: "Archivée",
        });
      }
    } catch {
      toast.error("❌ Échec de l’opération d’archivage");
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (!prospectionId) return null;
  if (loading) return <CircularProgress />;
  if (error || !localDetail) return <Box>Erreur de chargement</Box>;

  /* ──────────────────────────────────────────────────────────────── */
  const initialValues: ProspectionFormDataWithId = {
    id: prospectionId,
    partenaire: localDetail.partenaire ?? null,
    partenaire_nom: localDetail.partenaire_nom ?? null,
    formation: localDetail.formation ?? null,
    date_prospection: localDetail.date_prospection,
    type_prospection: localDetail.type_prospection,
    motif: localDetail.motif,
    statut: localDetail.statut,
    objectif: localDetail.objectif,
    relance_prevue: localDetail.relance_prevue ?? null,
    owner: localDetail.owner ?? null,
    owner_username: localDetail.owner_username ?? null,
    formation_nom: localDetail.formation_nom ?? formationFallback?.nom ?? null,
    centre_nom: localDetail.centre_nom ?? null,
    num_offre: localDetail.num_offre ?? formationFallback?.num_offre ?? null,
    moyen_contact: localDetail.moyen_contact ?? null,
    activite: localDetail.activite ?? "active",
    activite_display: localDetail.activite_display ?? "Active",
  };

  const isStaff = ["admin", "staff", "superuser"].includes(
    String(localDetail?.user_role ?? "").toLowerCase()
  );

  const handleCommentAdded = (newComment: { body: string }) => {
    setLocalLastComment(newComment.body);
    setLocalCount((prev) => prev + 1);
  };

  const isArchived = localDetail?.activite === "archivee";

  /* ──────────────────────────────────────────────────────────────── */

  return (
    <PageTemplate
      title={`Prospection #${prospectionId} — ${
        localDetail.activite_display ?? (isArchived ? "Archivée" : "Active")
      }`}
      backButton
      onBack={() => navigate(-1)}
      actions={
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            color={isArchived ? "success" : "warning"}
            onClick={handleArchiveToggle}
            disabled={saving || removing}
          >
            {isArchived ? "♻️ Désarchiver" : "📦 Archiver"}
          </Button>
          <Button variant="contained" color="primary" onClick={scrollToForm}>
            ✏️ Modifier
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => setOpenDeleteDialog(true)}
            disabled={removing}
          >
            {removing ? "Suppression…" : "Supprimer"}
          </Button>
        </Box>
      }
    >
      <CreatePartenaireButton />

      <ProspectionCommentsModal
        open={openComments}
        onClose={() => setOpenComments(false)}
        prospectionId={prospectionId}
        isStaff={isStaff}
        onCommentAdded={handleCommentAdded}
      />

      {/* Résumé */}
      <Box mb={2} p={2} border={1} borderRadius={2}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">🏢 Partenaire</Typography>
            <Typography>{localDetail.partenaire_nom || "—"}</Typography>
            <Typography color="text.secondary">{localDetail.partenaire_ville || "—"}</Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">📞 Contacts</Typography>
            <Typography>
              {localDetail.partenaire_tel ? (
                <Link href={`tel:${localDetail.partenaire_tel}`}>{localDetail.partenaire_tel}</Link>
              ) : (
                "Téléphone —"
              )}
            </Typography>
            <Typography>
              {localDetail.partenaire_email ? (
                <Link href={`mailto:${localDetail.partenaire_email}`}>
                  {localDetail.partenaire_email}
                </Link>
              ) : (
                "Email —"
              )}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">🎓 Formation</Typography>
            <Typography>{localDetail.formation_nom ?? formationFallback?.nom ?? "—"}</Typography>
            <Typography>
              🧾 Numéro d’offre :{" "}
              <strong>
                {localDetail.num_offre ?? formationFallback?.num_offre ?? "— Non défini"}
              </strong>
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Dernier commentaire */}
      <Box my={2}>
        <ProspectionLastCommentRow
          prospectionId={prospectionId}
          lastComment={localLastComment ?? localDetail.last_comment ?? null}
          commentsCount={localCount || localDetail.comments_count || 0}
          onOpenModal={() => setOpenComments(true)}
        />
      </Box>

      {/* Formulaire */}
      <Box ref={formRef} mt={4}>
        <ProspectionForm
          mode="edit"
          initialValues={initialValues}
          onSubmit={handleUpdate}
          loading={saving}
        />
      </Box>

      {/* Dialog suppression */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">Supprimer la prospection</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Voulez-vous vraiment supprimer la prospection #{prospectionId} ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={removing}>
            {removing ? "Suppression…" : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
