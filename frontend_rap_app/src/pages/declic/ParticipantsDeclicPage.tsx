import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Menu,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PageTemplate from "src/components/PageTemplate";
import usePagination from "src/hooks/usePagination";
import {
  useDeleteParticipantDeclic,
  useDesarchiverParticipantDeclic,
  useExportParticipantsDeclic,
  useHardDeleteParticipantDeclic,
  useParticipantDeclicDetail,
  useParticipantsDeclicList,
  useParticipantsDeclicMeta,
} from "src/hooks/useParticipantsDeclic";
import type { ParticipantDeclicFiltersValues } from "src/types/declic";
import ParticipantsDeclicTable from "./ParticipantsDeclicTable";
import ParticipantsDeclicDetailModal from "./ParticipantsDeclicDetailModal";
import { useAuth } from "src/hooks/useAuth";
import { canWriteDeclicRole } from "src/utils/roleGroups";
import SearchInput from "src/components/SearchInput";

export default function ParticipantsDeclicPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canWriteDeclic = canWriteDeclicRole(user?.role);
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState<ParticipantDeclicFiltersValues>({
    ordering: "nom",
    page: 1,
    declic_origine: searchParams.get("declic_origine")
      ? Number(searchParams.get("declic_origine"))
      : undefined,
  });

  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } =
    usePagination();

  const { data: meta, loading: loadingMeta } = useParticipantsDeclicMeta();
  const effectiveFilters = useMemo(
    () => ({ ...filters, page, page_size: pageSize }),
    [filters, page, pageSize]
  );
  const { data, loading, error } = useParticipantsDeclicList(effectiveFilters);
  const { remove } = useDeleteParticipantDeclic();
  const { restore } = useDesarchiverParticipantDeclic();
  const { hardDelete } = useHardDeleteParticipantDeclic();
  const { exportList, exportPresence, exportEmargement } =
    useExportParticipantsDeclic();

  useEffect(() => {
    setCount(data?.count ?? 0);
  }, [data, setCount]);

  const items = data?.results ?? [];
  const centres = (meta?.centres as Array<{ id: number; nom: string }>) ?? [];
  const types =
    (meta?.type_declic as Array<{ value: string; label: string }>) ?? [];

  const [detailId, setDetailId] = useState<number | null>(null);
  const { data: detailData } = useParticipantDeclicDetail(detailId);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("participantsDeclic.showFilters");
    return saved === "1";
  });
  const [anchorOptions, setAnchorOptions] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "participantsDeclic.showFilters",
        showFilters ? "1" : "0"
      );
    }
  }, [showFilters]);

  const refresh = () => setFilters((prev) => ({ ...prev }));

  const onDelete = async () => {
    if (!deleteId) return;
    try {
      await remove(deleteId);
      toast.success("Participant Déclic archivé");
      setDeleteId(null);
      refresh();
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const onRestore = async (id: number) => {
    try {
      await restore(id);
      toast.success("Participant Déclic restauré");
      refresh();
    } catch {
      toast.error("Erreur lors de la restauration");
    }
  };

  const onHardDelete = async () => {
    if (!hardDeleteId) return;
    try {
      await hardDelete(hardDeleteId);
      toast.success("Participant Déclic supprimé définitivement");
      setHardDeleteId(null);
      refresh();
    } catch {
      toast.error("Erreur lors de la suppression définitive");
    }
  };

  const activeFiltersCount = useMemo(() => {
    const ignored = new Set(["ordering", "page", "search"]);
    return Object.entries(filters).filter(([key, value]) => {
      if (ignored.has(key)) return false;
      if (value == null) return false;
      if (typeof value === "string") return value.trim() !== "";
      return true;
    }).length;
  }, [filters]);

  const footer =
    count > 0 ? (
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1}
      >
        <Typography color="text.secondary">
          Page {page} / {totalPages} ({count} résultats)
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: { xs: "center", sm: "flex-end" },
          }}
        >
          <Pagination
            page={page}
            count={totalPages}
            onChange={(_, value) => setPage(value)}
          />
        </Box>
      </Stack>
    ) : undefined;

  return (
    <PageTemplate
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={refresh}
      headerExtra={
        <SearchInput
          placeholder="🔍 Rechercher un participant Déclic..."
          value={filters.search ?? ""}
          onChange={(e) => {
            setFilters((prev) => ({
              ...prev,
              search: e.target.value || undefined,
            }));
            setPage(1);
          }}
        />
      }
      filters={
        showFilters ? (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            flexWrap="wrap"
            useFlexGap
          >
            <TextField
              select
              size="small"
              label="Centre"
              value={filters.centre ?? ""}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  centre:
                    e.target.value === "" ? undefined : Number(e.target.value),
                }));
                setPage(1);
              }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Tous</MenuItem>
              {centres.map((centre) => (
                <MenuItem key={centre.id} value={centre.id}>
                  {centre.nom}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Type d'atelier"
              value={filters.type_declic ?? ""}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  type_declic:
                    e.target.value === ""
                      ? undefined
                      : (e.target.value as any),
                }));
                setPage(1);
              }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Tous</MenuItem>
              {types.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Présence"
              value={filters.present ?? ""}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  present:
                    e.target.value === ""
                      ? undefined
                      : (e.target.value as "true" | "false"),
                }));
                setPage(1);
              }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="true">Présents</MenuItem>
              <MenuItem value="false">Absents</MenuItem>
            </TextField>

            <TextField
              size="small"
              label="Année"
              type="number"
              value={filters.annee ?? ""}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  annee:
                    e.target.value === "" ? undefined : Number(e.target.value),
                }));
                setPage(1);
              }}
              sx={{ maxWidth: 130 }}
            />

            <Button
              variant="outlined"
              onClick={() => {
                setFilters({ ordering: "nom", page: 1 });
                setPage(1);
              }}
            >
              Réinitialiser
            </Button>
          </Stack>
        ) : undefined
      }
      actions={
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          flexWrap="wrap"
          useFlexGap
        >
          <Button variant="outlined" onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
            {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>

          <Button
            variant="outlined"
            onClick={(event) => setAnchorOptions(event.currentTarget)}
          >
            Options
          </Button>

          {canWriteDeclic && (
            <Button
              variant="contained"
              onClick={() => navigate("/participants-declic/create")}
            >
              ➕ Nouveau participant
            </Button>
          )}

          <Button
            variant={filters.avec_archivees ? "contained" : "outlined"}
            onClick={() => {
              setFilters((prev) => ({
                ...prev,
                avec_archivees: !prev.avec_archivees,
                archives_seules: prev.archives_seules
                  ? false
                  : prev.archives_seules,
              }));
              setPage(1);
            }}
          >
            {filters.avec_archivees ? "Masquer archivés" : "Inclure archivés"}
          </Button>

          <Button
            variant={filters.archives_seules ? "contained" : "outlined"}
            onClick={() => {
              setFilters((prev) => ({
                ...prev,
                archives_seules: !prev.archives_seules,
                avec_archivees: !prev.archives_seules
                  ? true
                  : prev.avec_archivees,
              }));
              setPage(1);
            }}
          >
            {filters.archives_seules ? "Voir tout" : "Archives seules"}
          </Button>

          <TextField
            select
            size="small"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            sx={{ minWidth: 110 }}
          >
            {[10, 20, 50].map((size) => (
              <MenuItem key={size} value={size}>
                {size} / page
              </MenuItem>
            ))}
          </TextField>

          <Menu
            anchorEl={anchorOptions}
            open={Boolean(anchorOptions)}
            onClose={() => setAnchorOptions(null)}
            PaperProps={{
              sx: {
                mt: 1,
                width: 340,
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
                Exports et documents liés aux participants
              </Typography>
            </Box>

            <Stack spacing={1} sx={{ px: 1, pb: 1 }}>
              <Button variant="outlined" onClick={() => exportList()}>
                ⬇️ Export liste
              </Button>
              <Button variant="outlined" onClick={() => exportPresence()}>
                📋 Feuille de présence
              </Button>
              <Button variant="outlined" onClick={() => exportEmargement()}>
                📝 Feuille d&apos;émargement
              </Button>
            </Stack>
          </Menu>
        </Stack>
      }
      footer={footer}
    >
      {loading || loadingMeta ? (
        <Box
          sx={{
            minHeight: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box
          sx={{
            minHeight: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <Typography color="error">
            Erreur de chargement des participants Déclic.
          </Typography>
        </Box>
      ) : items.length === 0 ? (
        <Box
          sx={{
            minHeight: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <Typography color="text.secondary">
            Aucun participant Déclic ne correspond aux filtres actuels.
          </Typography>
        </Box>
      ) : (
        <ParticipantsDeclicTable
          items={items}
          onEdit={(id) => navigate(`/participants-declic/${id}/edit`)}
          onDelete={(id) => setDeleteId(id)}
          onRestore={(id) => onRestore(id)}
          onHardDelete={(id) => setHardDeleteId(id)}
          onRowClick={(id) => setDetailId(id)}
        />
      )}

      <ParticipantsDeclicDetailModal
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        participant={detailData}
        onEdit={(id) => navigate(`/participants-declic/${id}/edit`)}
      />

      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Archiver ce participant Déclic ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={onDelete}>
            Archiver
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(hardDeleteId)}
        onClose={() => setHardDeleteId(null)}
      >
        <DialogTitle>Suppression définitive</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action est irréversible. Supprimer définitivement ce
            participant Déclic archivé ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHardDeleteId(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={onHardDelete}>
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}