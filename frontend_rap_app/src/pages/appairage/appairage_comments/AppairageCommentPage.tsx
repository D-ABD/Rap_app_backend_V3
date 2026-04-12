// src/pages/appairages/appairage_comments/AppairageCommentPage.tsx
import { useMemo, useState, useCallback, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  Menu,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import type {
  AppairageCommentDTO,
  AppairageCommentListParams,
} from "../../../types/appairageComment";
import { useListAppairageComments, useDeleteAppairageComment } from "../../../hooks/useAppairageComments";
import api from "../../../api/axios";
import { useMe } from "../../../hooks/useUsers";
import { CustomUserRole, User } from "../../../types/User";
import AppairageCommentTable from "./AppairageCommentTable";
import FiltresAppairageCommentsPanel from "../../../components/filters/FiltresAppairageCommentsPanel";
import ExportButtonAppairageComment from "../../../components/export_buttons/ExportButtonAppairageComment";
import PageTemplate from "../../../components/PageTemplate";
import SearchInput from "../../../components/SearchInput";

type ChoiceStr = { value: string; label: string };
type NormalizedRole = "superadmin" | "admin" | "staff" | "stagiaire" | "candidat" | "autre";

function normalizeRole(u: User | null): NormalizedRole {
  if (!u) return "autre";
  const r = (u.role || "").toLowerCase() as CustomUserRole | string;
  if (r === "superadmin") return "superadmin";
  if (r === "admin") return "admin";
  if (["staff", "staff_read", "commercial", "charge_recrutement", "prepa_staff", "declic_staff"].includes(r)) {
    return "staff";
  }
  if (r === "stagiaire") return "stagiaire";
  if (r === "candidat" || r === "candidatuser") return "candidat";
  return "autre";
}

export default function AppairageCommentPage() {
  const navigate = useNavigate();
  const { appairageId } = useParams<{ appairageId?: string }>();
  const [searchParams] = useSearchParams();

  const { user: me } = useMe();
  const role: NormalizedRole = useMemo(() => normalizeRole(me), [me]);
  const canHardDelete = ["superadmin", "admin"].includes(role);

  const showFilters = ["superadmin", "admin", "staff"].includes(role);
  const panelMode: "default" | "candidate" = showFilters ? "default" : "candidate";

  const scopedAppairageId = useMemo(() => {
    if (appairageId && Number.isFinite(Number(appairageId))) return Number(appairageId);
    const raw = searchParams.get("appairage");
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [appairageId, searchParams]);

  const [params, setParams] = useState<AppairageCommentListParams & { search?: string }>(() => {
    const initial: AppairageCommentListParams & { search?: string } = {
      ordering: "-created_at",
      search: "",
    };
    if (scopedAppairageId) {
      initial.appairage = scopedAppairageId;
    }
    return initial;
  });

  useEffect(() => {
    setParams((prev) => ({
      ...prev,
      appairage: scopedAppairageId,
    }));
  }, [scopedAppairageId]);

  const [reloadKey, setReloadKey] = useState<number>(0);
  const [anchorOptions, setAnchorOptions] = useState<null | HTMLElement>(null);

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

  // archivage logique
  const [selectedRow, setSelectedRow] = useState<AppairageCommentDTO | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hardDeleteRow, setHardDeleteRow] = useState<AppairageCommentDTO | null>(null);

  // ✅ Correction ici : on passe un id même s'il est null
  const { remove, loading: deleting } = useDeleteAppairageComment(selectedRow?.id ?? 0);

  const handleDelete = useCallback(async () => {
    if (!selectedRow) return;
    try {
      await remove();
      toast.success(`📦 Commentaire #${selectedRow.id} archivé`);
      setShowConfirm(false);
      setSelectedRow(null);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  }, [remove, selectedRow]);

  const handleRestore = useCallback(async (row: AppairageCommentDTO) => {
    try {
      await api.post(`/appairage-commentaires/${row.id}/desarchiver/`);
      toast.success(`♻️ Commentaire #${row.id} restauré`);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la restauration");
    }
  }, []);

  const handleHardDelete = useCallback(async () => {
    if (!hardDeleteRow) return;
    try {
      await api.post(`/appairage-commentaires/${hardDeleteRow.id}/hard-delete/`);
      toast.success(`🗑️ Commentaire #${hardDeleteRow.id} supprimé définitivement`);
      setHardDeleteRow(null);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la suppression définitive");
    }
  }, [hardDeleteRow]);

  return (
    <PageTemplate
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => setReloadKey((k) => k + 1)}
      headerExtra={
        <SearchInput
          placeholder="🔍 Rechercher un commentaire d'appairage..."
          value={params.search ?? ""}
          onChange={(e) =>
            setParams((prev) => ({
              ...prev,
              search: e.target.value,
            }))
          }
        />
      }
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          <Button variant="outlined" onClick={(event) => setAnchorOptions(event.currentTarget)}>
            Options
          </Button>
          <Button
            variant="outlined"
            onClick={() =>
              setParams((prev) => ({
                ...prev,
                est_archive: prev.est_archive === "both" ? undefined : "both",
              }))
            }
          >
            {params.est_archive === "both" ? "🗂️ Masquer archivés" : "🗃️ Inclure archivés"}
          </Button>
          <Button
            variant="outlined"
            onClick={() =>
              setParams((prev) => ({
                ...prev,
                est_archive: prev.est_archive === true ? undefined : true,
              }))
            }
          >
            {params.est_archive === true ? "📂 Voir tout" : "🗄️ Archives seules"}
          </Button>
          <Button
            variant="contained"
            onClick={() =>
              navigate(
                scopedAppairageId
                  ? `/appairage-commentaires/create/${scopedAppairageId}`
                  : "/appairage-commentaires/create"
              )
            }
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            ➕ Nouveau commentaire
          </Button>

          <Menu
            anchorEl={anchorOptions}
            open={Boolean(anchorOptions)}
            onClose={() => setAnchorOptions(null)}
            PaperProps={{
              sx: {
                mt: 1,
                width: 320,
                maxWidth: "calc(100vw - 32px)",
                p: 1.25,
                borderRadius: 3,
              },
            }}
          >
            <Box sx={{ px: 1, pt: 0.5, pb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Options
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Export et informations de contexte
              </Typography>
            </Box>

            <Stack spacing={1} sx={{ px: 1, pb: 1 }}>
              <Chip label={`Rôle : ${role}`} color="primary" variant="outlined" />
              <ExportButtonAppairageComment data={rows} selectedIds={[]} />
            </Stack>
          </Menu>
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
              appairage: scopedAppairageId,
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
          onRestore={handleRestore}
          onHardDelete={(r) => setHardDeleteRow(r)}
          canHardDelete={canHardDelete}
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
          <DialogContentText>Voulez-vous archiver ce commentaire&nbsp;?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            Archiver
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={hardDeleteRow !== null} onClose={() => setHardDeleteRow(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="error" />
          Suppression définitive
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action est irréversible. Le commentaire archivé sera supprimé définitivement.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHardDeleteRow(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleHardDelete}>
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
