// src/components/modals/ProspectionCommentsModal.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  useListProspectionComments,
  useCreateProspectionComment,
} from "../../hooks/useProspectionComments";
import type { ProspectionCommentDTO } from "../../types/prospectionComment";
import api from "../../api/axios";
import ProspectionCommentForm from "../../pages/prospection/prospectioncomments/ProspectionCommentForm";
import { toast } from "react-toastify";

/* ---------- Types ---------- */
type Props = {
  open: boolean;
  onClose: () => void;
  prospectionId: number;
  isStaff?: boolean;
  onCommentAdded?: (newComment: ProspectionCommentDTO) => void;
};

type ProspectionMeta = {
  partenaire_nom: string | null;
  formation_nom: string | null;
  label: string;
};

const dtf = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dtf.format(d);
};

/* ---------- Component ---------- */
export default function ProspectionCommentsModal({
  open,
  onClose,
  prospectionId,
  isStaff = false,
  onCommentAdded,
}: Props) {
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<"all" | "public" | "internal">("all");
  const [meta, setMeta] = useState<ProspectionMeta | null>(null);

  const listParams = useMemo(
    () => ({ prospection: prospectionId, ordering: "-created_at" as const }),
    [prospectionId]
  );

  const { data, loading, error } = useListProspectionComments(listParams, reloadKey);
  const { create, loading: creating } = useCreateProspectionComment();

  useEffect(() => {
    if (!open) return;
    setReloadKey((k) => k + 1);

    let cancelled = false;
    (async () => {
      try {
        const { data: p } = await api.get(`/prospections/${prospectionId}/`);
        const partenaire_nom: string | null = p?.partenaire_nom ?? null;
        const formation_nom: string | null = p?.formation_nom ?? null;
        const label =
          [partenaire_nom, formation_nom].filter(Boolean).join(" • ") || `#${prospectionId}`;
        if (!cancelled) setMeta({ partenaire_nom, formation_nom, label });
      } catch {
        if (!cancelled) {
          setMeta({
            partenaire_nom: null,
            formation_nom: null,
            label: `#${prospectionId}`,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, prospectionId]);

  // ✅ isolé pour éviter un recalcul dans useMemo suivant
  const rows = useMemo(() => data?.results ?? [], [data]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((c) => {
      if (visibility === "public" && c.is_internal) return false;
      if (visibility === "internal" && !c.is_internal) return false;
      if (!q) return true;
      return c.body.toLowerCase().includes(q) || c.created_by_username.toLowerCase().includes(q);
    });
  }, [rows, search, visibility]);

  const handleDelete = async (id: number) => {
    if (!confirm(`Supprimer le commentaire #${id} ?`)) return;
    try {
      setDeletingId(id);
      await api.delete(`/prospection-commentaires/${id}/`);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddComment = async (payload: { body: string; is_internal?: boolean }) => {
    try {
      const input = { ...payload, prospection_id: prospectionId };
      const created = await create(input);
      setReloadKey((k) => k + 1);
      onCommentAdded?.(created as ProspectionCommentDTO);
    } catch {
      toast.error("Impossible d’ajouter le commentaire.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>💬 Commentaires de prospection</DialogTitle>
      {meta && (
        <Typography variant="subtitle2" color="text.secondary" sx={{ px: 3, mt: -1, mb: 1 }}>
          Prospection #{prospectionId} — {meta.label}
        </Typography>
      )}

      <DialogContent dividers>
        {/* Header badges & actions */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Chip label={`${rows.length} commentaire${rows.length > 1 ? "s" : ""}`} color="primary" />
          <Box display="flex" gap={1}>
            <IconButton
              onClick={() => setReloadKey((k) => k + 1)}
              disabled={loading || creating || deletingId !== null}
              title="Rafraîchir"
            >
              🔄
            </IconButton>
            <IconButton onClick={onClose} title="Fermer">
              ✖
            </IconButton>
          </Box>
        </Box>

        {/* Formulaire création */}
        <ProspectionCommentForm
          prospectionId={prospectionId}
          canSetInternal={isStaff}
          onSubmit={handleAddComment}
        />

        {/* Toolbar */}
        <Box display="flex" gap={1} mt={2} mb={1}>
          <TextField
            size="small"
            placeholder="Rechercher (texte ou auteur)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
          />
          {isStaff && (
            <Select
              size="small"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "all" | "public" | "internal")}
            >
              <MenuItem value="all">Tous</MenuItem>
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="internal">Interne</MenuItem>
            </Select>
          )}
        </Box>

        {/* Liste */}
        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography color="error">
            Erreur : {String((error as Error).message || error)}
          </Typography>
        ) : filteredRows.length === 0 ? (
          <Typography>Aucun commentaire ne correspond à vos filtres.</Typography>
        ) : (
          <List>
            {filteredRows.map((c) => (
              <ListItem
                key={c.id}
                alignItems="flex-start"
                secondaryAction={
                  <Button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id || creating || loading}
                    size="small"
                    color="error"
                  >
                    {deletingId === c.id ? "⏳" : "🗑️"}
                  </Button>
                }
              >
                <ListItemText
                  primary={
                    <>
                      <strong>{c.created_by_username}</strong> • {fmtDate(c.created_at)}{" "}
                      <Chip
                        size="small"
                        label={c.is_internal ? "Interne" : "Public"}
                        sx={{ ml: 1 }}
                      />
                    </>
                  }
                  secondary={c.body}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
