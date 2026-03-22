// src/pages/prospections/ProspectionEditPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Grid,
  Typography,
  Button,
  Link,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { toast } from "react-toastify";

import PageTemplate from "../../components/PageTemplate";

import type { ProspectionFormData } from "../../types/prospection";

import api from "../../api/axios";
import {
  useProspection,
  useUpdateProspection,
  useDeleteProspection,
} from "../../hooks/useProspection";

import ProspectionLastCommentRow from "./prospectioncomments/ProspectionLastCommentRow";
import ProspectionCommentsModal from "../../components/modals/ProspectionCommentsModal";
import ProspectionFormCandidat from "./ProspectionFormCandidat";

type ProspectionDetailDTO = ProspectionFormData & {
  partenaire_nom?: string | null;
  partenaire_ville?: string | null;
  partenaire_tel?: string | null;
  partenaire_email?: string | null;

  formation_nom?: string | null;
  centre_nom?: string | null;
  num_offre?: string | null;
  formation_date_debut?: string | null;
  formation_date_fin?: string | null;

  last_comment?: string | null;
  last_comment_at?: string | null;
  comments_count?: number | null;

  user_role?: string | null;
};

type FormationLight = {
  id: number;
  nom: string;
  start_date?: string | null;
  end_date?: string | null;
  num_offre?: string | null;
};

const dtfFR = new Intl.DateTimeFormat("fr-FR");
const fmt = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dtfFR.format(d);
};

export default function ProspectionEditCandidatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [openComments, setOpenComments] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

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

  const [detail, setDetail] = useState<ProspectionDetailDTO | null>(null);
  const [formationFallback, setFormationFallback] = useState<FormationLight | null>(null);

  useEffect(() => {
    if (hookDetail) setDetail(hookDetail as ProspectionDetailDTO);
  }, [hookDetail]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!detail?.formation) return;
      if (detail.formation_nom) return;
      try {
        const res = await api.get(`/formations/${detail.formation}/`);
        const f = (res.data.data ?? res.data) as FormationLight;
        if (alive && f?.nom) {
          setFormationFallback({
            id: f.id,
            nom: f.nom,
            start_date: f.start_date ?? null,
            end_date: f.end_date ?? null,
            num_offre: f.num_offre ?? null,
          });
        }
      } catch {
        // silencieux
      }
    })();
    return () => {
      alive = false;
    };
  }, [detail?.formation, detail?.formation_nom]);

  const handleUpdate = async (data: ProspectionFormData) => {
    if (!prospectionId) return;
    try {
      await update(data);
      toast.success("✅ Prospection mise à jour");
      // Petite pause visuelle avant la redirection (facultatif)
      setTimeout(() => navigate("/prospections/candidat"), 300);
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

  if (!prospectionId) {
    return (
      <PageTemplate title="Prospection — détail" backButton onBack={() => navigate(-1)} centered>
        <Typography color="error">❌ Identifiant invalide.</Typography>
      </PageTemplate>
    );
  }

  if (loading || (!detail && !error)) {
    return (
      <PageTemplate
        title={`Prospection #${prospectionId}`}
        backButton
        onBack={() => navigate(-1)}
        centered
      >
        <CircularProgress />
      </PageTemplate>
    );
  }

  if (error) {
    return (
      <PageTemplate
        title={`Prospection #${prospectionId}`}
        backButton
        onBack={() => navigate(-1)}
        centered
      >
        <Typography color="error">❌ Impossible de charger la prospection.</Typography>
      </PageTemplate>
    );
  }

  if (!detail) {
    return (
      <PageTemplate
        title={`Prospection #${prospectionId}`}
        backButton
        onBack={() => navigate(-1)}
        centered
      >
        <Typography color="error">❌ Données indisponibles.</Typography>
      </PageTemplate>
    );
  }

  const formationNom = detail.formation_nom ?? formationFallback?.nom ?? null;
  const formationDateDebut = detail.formation_date_debut ?? formationFallback?.start_date ?? null;
  const formationDateFin = detail.formation_date_fin ?? formationFallback?.end_date ?? null;
  const numOffre = detail.num_offre ?? formationFallback?.num_offre ?? null;

  const initialValues: ProspectionFormData = {
    partenaire: detail.partenaire ?? null,
    partenaire_nom: detail.partenaire_nom ?? null,
    formation: detail.formation ?? null,
    date_prospection: detail.date_prospection,
    type_prospection: detail.type_prospection,
    motif: detail.motif,
    statut: detail.statut,
    objectif: detail.objectif,
    relance_prevue: detail.relance_prevue ?? null,
    owner: detail.owner ?? null,
    owner_username: detail.owner_username ?? null,

    formation_nom: formationNom,
    centre_nom: detail.centre_nom ?? null,
    num_offre: numOffre,

    moyen_contact: detail.moyen_contact ?? null,

    last_comment: detail.last_comment ?? null,
    last_comment_at: detail.last_comment_at ?? null,
    comments_count: typeof detail.comments_count === "number" ? detail.comments_count : undefined,
  };

  const isStaff = ["admin", "staff", "superuser"].includes(
    String(detail.user_role ?? "").toLowerCase()
  );

  return (
    <PageTemplate
      title={`Prospection #${prospectionId} — détail (éditable)`}
      backButton
      onBack={() => navigate(-1)}
      actions={
        <Button
          variant="outlined"
          color="error"
          onClick={() => setOpenDelete(true)}
          disabled={removing}
        >
          {removing ? "Suppression…" : "Supprimer"}
        </Button>
      }
    >
      {/* Modal commentaires */}
      <ProspectionCommentsModal
        open={openComments}
        onClose={() => setOpenComments(false)}
        prospectionId={prospectionId}
        isStaff={isStaff}
      />

      {/* Résumé */}
      <Box mb={2} p={2} border={1} borderRadius={2}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">Partenaire</Typography>
            <Typography>{detail.partenaire_nom || "—"}</Typography>
            <Typography color="text.secondary">{detail.partenaire_ville || "—"}</Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">Contacts</Typography>
            <Typography>
              {detail.partenaire_tel ? (
                <Link href={`tel:${detail.partenaire_tel}`}>{detail.partenaire_tel}</Link>
              ) : (
                "Téléphone —"
              )}
            </Typography>
            <Typography>
              {detail.partenaire_email ? (
                <Link href={`mailto:${detail.partenaire_email}`}>{detail.partenaire_email}</Link>
              ) : (
                "Email —"
              )}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2">Formation</Typography>
            <Typography>
              {formationNom || "—"} {numOffre ? `— ${numOffre}` : ""}
            </Typography>
            <Typography color="text.secondary">
              {formationDateDebut || formationDateFin
                ? `${fmt(formationDateDebut)} → ${fmt(formationDateFin)}`
                : "Dates —"}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Dernier commentaire */}
      <ProspectionLastCommentRow
        prospectionId={prospectionId}
        onOpenModal={() => setOpenComments(true)}
      />

      {/* Formulaire */}
      <ProspectionFormCandidat
        mode="edit"
        initialValues={initialValues}
        onSubmit={handleUpdate}
        loading={saving}
      />

      {/* Modal suppression */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Supprimer la prospection</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Confirmer la suppression de la prospection #{prospectionId} ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained" autoFocus>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
