// src/pages/appairages/appairage_comments/AppairageCommentPage.tsx
import { useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
  Stack,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import type {
  AppairageCommentDTO,
  AppairageCommentListParams,
} from "../../../types/appairageComment";
import {
  useListAppairageComments,
  useDeleteAppairageComment,
} from "../../../hooks/useAppairageComments";
import { useMe } from "../../../hooks/useUsers";
import { CustomUserRole, User } from "../../../types/User";
import AppairageCommentTable from "./AppairageCommentTable";
import FiltresAppairageCommentsPanel from "../../../components/filters/FiltresAppairageCommentsPanel";
import ExportButtonAppairageComment from "../../../components/export_buttons/ExportButtonAppairageComment";
import PageTemplate from "../../../components/PageTemplate";

type ChoiceStr = { value: string; label: string };
type NormalizedRole = "superadmin" | "admin" | "staff" | "stagiaire" | "candidat" | "autre";

function normalizeRole(u: User | null): NormalizedRole {
  if (!u) return "autre";
  if (u.is_superuser) return "superadmin";
  const r = (u.role || "").toLowerCase() as CustomUserRole | string;
  if (r === "superadmin") return "superadmin";
  if (r === "admin") return "admin";
  if (u.is_staff || r === "staff") return "staff";
  if (r === "stagiaire") return "stagiaire";
  if (r === "candidat" || r === "candidatuser") return "candidat";
  return "autre";
}

export default function AppairageCommentPage() {
  const navigate = useNavigate();
  const { appairageId } = useParams<{ appairageId?: string }>();

  const { user: me } = useMe();
  const role: NormalizedRole = useMemo(() => normalizeRole(me), [me]);

  const showFilters = ["superadmin", "admin", "staff"].includes(role);
  const panelMode: "default" | "candidate" = showFilters ? "default" : "candidate";

  const [params, setParams] = useState<AppairageCommentListParams & { search?: string }>(() => {
    const initial: AppairageCommentListParams & { search?: string } = {
      ordering: "-created_at",
      search: "",
    };
    if (appairageId && Number.isFinite(Number(appairageId))) {
      initial.appairage = Number(appairageId);
    }
    return initial;
  });

  const [reloadKey, setReloadKey] = useState<number>(0);

  const { data, loading, error } = useListAppairageComments(params, reloadKey);
  const rows: AppairageCommentDTO[] = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Filtres dynamiques
  const filtresFromRows = useMemo(() => {
    const add = (set: Set<string>, v?: string | null) => {
      if (v) set.add(v);
    };
    const partenaires = new Set<string>();
    const candidats = new Set<string>();
    const authors = new Set<string>();
    for (const r of rows) {
      add(partenaires, r.partenaire_nom);
      add(candidats, r.candidat_nom);
      add(authors, r.created_by_username);
    }
    const toChoices = (arr: string[]): ChoiceStr[] =>
      arr.sort((a, b) => a.localeCompare(b)).map((x) => ({ value: x, label: x }));
    return {
      partenaires: toChoices(Array.from(partenaires)),
      candidats: toChoices(Array.from(candidats)),
      authors: toChoices(Array.from(authors)),
      user_role: role,
    };
  }, [rows, role]);

  // suppression
  const [selectedRow, setSelectedRow] = useState<AppairageCommentDTO | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // ✅ Correction ici : on passe un id même s'il est null
  const { remove, loading: deleting } = useDeleteAppairageComment(selectedRow?.id ?? 0);

  const handleDelete = useCallback(async () => {
    if (!selectedRow) return;
    try {
      await remove();
      toast.success(`🗑️ Commentaire #${selectedRow.id} supprimé`);
      setShowConfirm(false);
      setSelectedRow(null);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }, [remove, selectedRow]);

  return (
    <PageTemplate
      title="💬 Commentaires d'appairage"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => setReloadKey((k) => k + 1)}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          <Chip label={`Rôle : ${role}`} color="primary" variant="outlined" />
          <ExportButtonAppairageComment data={rows} selectedIds={[]} />
          <Button
            variant="contained"
            onClick={() => navigate("/appairage-commentaires/create")}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            ➕ Nouveau commentaire
          </Button>
        </Stack>
      }
      filters={
        <FiltresAppairageCommentsPanel
          mode={panelMode}
          filtres={
            showFilters
              ? filtresFromRows
              : { authors: [], partenaires: [], candidats: [], user_role: role }
          }
          values={params}
          onChange={(next) => setParams(next)}
          onRefresh={() => setReloadKey((k) => k + 1)}
          onReset={() =>
            setParams({
              appairage:
                appairageId && Number.isFinite(Number(appairageId))
                  ? Number(appairageId)
                  : undefined,
              created_by: undefined,
              ordering: "-created_at",
              search: "",
              partenaire_nom: undefined,
              candidat_nom: undefined,
              created_by_username: undefined,
            })
          }
        />
      }
    >
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">Erreur lors du chargement des commentaires.</Typography>
      ) : rows.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Typography>Aucun commentaire trouvé.</Typography>
        </Box>
      ) : (
        <AppairageCommentTable
          rows={rows}
          onDelete={(r) => {
            setSelectedRow(r);
            setShowConfirm(true);
          }}
          onEdit={(r) => navigate(`/appairage-commentaires/${r.id}/edit`)}
          linkToAppairage={(id: number) => `/appairages/${id}`}
        />
      )}

      {/* Confirmation dialog */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>Voulez-vous supprimer ce commentaire&nbsp;?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
