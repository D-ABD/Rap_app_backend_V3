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
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Stack,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  useListProspectionComments,
  useCreateProspectionComment,
} from "../../hooks/useProspectionComments";
import type { ProspectionCommentDTO } from "../../types/prospectionComment";
import type { AppTheme } from "../../theme";
import api from "../../api/axios";
import ProspectionCommentForm from "../../pages/prospection/prospectioncomments/ProspectionCommentForm";
import SearchInput from "../SearchInput";
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
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";

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

  const dialogSectionTokens = theme.custom.dialog.section;
  const sectionBackground = isLight
    ? dialogSectionTokens.background.light
    : dialogSectionTokens.background.dark;
  const sectionBorder = isLight
    ? dialogSectionTokens.border.light
    : dialogSectionTokens.border.dark;

  const sectionTitleBackground = isLight
    ? theme.custom.overlay.modalSectionTitle.background.light
    : theme.custom.overlay.modalSectionTitle.background.dark;
  const sectionTitleBorder = isLight
    ? theme.custom.overlay.modalSectionTitle.borderBottom.light
    : theme.custom.overlay.modalSectionTitle.borderBottom.dark;

  const sectionContainerSx = {
    border: sectionBorder,
    borderRadius: dialogSectionTokens.borderRadius,
    background: sectionBackground,
    overflow: "hidden",
  } as const;

  const sectionHeaderSx = {
    px: dialogSectionTokens.padding,
    py: 1,
    background: sectionTitleBackground,
    borderBottom: sectionTitleBorder,
  } as const;

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
    if (!confirm(`Archiver le commentaire #${id} ?`)) return;

    try {
      setDeletingId(id);
      await api.delete(`/prospection-commentaires/${id}/`);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Archivage impossible.");
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
      <DialogTitle>Commentaires de prospection</DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          {meta ? (
            <Typography variant="body2" color="text.secondary">
              Prospection #{prospectionId} — {meta.label}
            </Typography>
          ) : null}

          <Box sx={sectionContainerSx}>
            <Box sx={sectionHeaderSx}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
              >
                <Chip
                  label={`${rows.length} commentaire${rows.length > 1 ? "s" : ""}`}
                  color="primary"
                  size="small"
                />

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    onClick={() => setReloadKey((k) => k + 1)}
                    disabled={loading || creating || deletingId !== null}
                    size="small"
                    variant="outlined"
                  >
                    Rafraîchir
                  </Button>
                  <Button onClick={onClose} size="small" variant="text" color="secondary">
                    Fermer
                  </Button>
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ p: dialogSectionTokens.padding }}>
              <ProspectionCommentForm
                prospectionId={prospectionId}
                canSetInternal={isStaff}
                onSubmit={handleAddComment}
              />
            </Box>
          </Box>

          <Box sx={sectionContainerSx}>
            <Box sx={sectionHeaderSx}>
              <Typography variant="subtitle2" fontWeight={700}>
                Rechercher et filtrer
              </Typography>
            </Box>

            <Box sx={{ p: dialogSectionTokens.padding }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <SearchInput
                  placeholder="Rechercher (texte ou auteur)…"
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                  fullWidth
                />

                {isStaff ? (
                  <Select
                    size="small"
                    value={visibility}
                    onChange={(e) =>
                      setVisibility(e.target.value as "all" | "public" | "internal")
                    }
                    sx={{ minWidth: { xs: "100%", sm: 160 } }}
                  >
                    <MenuItem value="all">Tous</MenuItem>
                    <MenuItem value="public">Public</MenuItem>
                    <MenuItem value="internal">Interne</MenuItem>
                  </Select>
                ) : null}
              </Stack>
            </Box>
          </Box>

          <Box sx={sectionContainerSx}>
            <Box sx={sectionHeaderSx}>
              <Typography variant="subtitle2" fontWeight={700}>
                Historique des commentaires
              </Typography>
            </Box>

            <Box sx={{ p: dialogSectionTokens.padding }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Typography color="error">
                  Erreur : {String((error as Error).message || error)}
                </Typography>
              ) : filteredRows.length === 0 ? (
                <Typography color="text.secondary">
                  Aucun commentaire ne correspond à vos filtres.
                </Typography>
              ) : (
                <List disablePadding>
                  {filteredRows.map((c, index) => (
                    <Box key={c.id}>
                      <ListItem
                        alignItems="flex-start"
                        disableGutters
                        secondaryAction={
                          <Button
                            onClick={() => handleDelete(c.id)}
                            disabled={deletingId === c.id || creating || loading}
                            size="small"
                            color="error"
                          >
                            {deletingId === c.id ? "Archivage…" : "Archiver"}
                          </Button>
                        }
                        sx={{ py: 1.25, pr: 12 }}
                      >
                        <ListItemText
                          disableTypography
                          primary={
                            <Typography variant="body2" component="div">
                              <Box component="span" sx={{ fontWeight: 700 }}>
                                {c.created_by_username}
                              </Box>
                              {" • "}
                              {fmtDate(c.created_at)}
                              <Chip
                                size="small"
                                label={c.is_internal ? "Interne" : "Public"}
                                sx={{ ml: 1 }}
                              />
                            </Typography>
                          }
                          secondary={
                            <Typography
                              variant="body2"
                              component="div"
                              color="text.secondary"
                              sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
                            >
                              {c.body}
                            </Typography>
                          }
                        />
                      </ListItem>

                      {index < filteredRows.length - 1 ? <Divider /> : null}
                    </Box>
                  ))}
                </List>
              )}
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}