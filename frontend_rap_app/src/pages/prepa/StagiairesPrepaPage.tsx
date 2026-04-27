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
  Select,
  Stack,
  Typography,
} from "@mui/material";

import PageTemplate from "src/components/PageTemplate";
import SearchInput from "src/components/SearchInput";
import usePagination from "src/hooks/usePagination";
import { useAuth } from "src/hooks/useAuth";
import { canWritePrepaRole } from "src/utils/roleGroups";
import {
  useStagiairesPrepaList,
  useDeleteStagiairePrepa,
  useDesarchiverStagiairePrepa,
  useHardDeleteStagiairePrepa,
  useExportStagiairesPrepa,
} from "src/hooks/useStagiairesPrepa";
import type { StagiairePrepa } from "src/types/prepa";
import StagiairesPrepaTable from "./StagiairesPrepaTable";
import StagiairesPrepaDetailModal from "./StagiairesPrepaDetailModal";

export default function StagiairesPrepaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canWritePrepa = canWritePrepaRole(user?.role);
  const { exportList, exportPresence, exportEmargement } = useExportStagiairesPrepa();

  const [search, setSearch] = useState("");
  const [listBump, setListBump] = useState(0);
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();

  const [avecArchivees, setAvecArchivees] = useState(false);
  const [archivesSeules, setArchivesSeules] = useState(false);

  const [anchorOptions, setAnchorOptions] = useState<null | HTMLElement>(null);

  const [selectedStag, setSelectedStag] = useState<StagiairePrepa | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [hardDeleteId, setHardDeleteId] = useState<number | null>(null);

  const prepaOrigine = useMemo(() => {
    const v = searchParams.get("prepa_origine");
    if (v == null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }, [searchParams]);

  const effectiveFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      page,
      page_size: pageSize,
      ordering: "nom" as const,
      prepa_origine: prepaOrigine,
      avec_archivees: avecArchivees || undefined,
      archives_seules: archivesSeules || undefined,
    }),
    [search, page, pageSize, prepaOrigine, avecArchivees, archivesSeules, listBump]
  );

  const { data, loading, error } = useStagiairesPrepaList(effectiveFilters);
  const { remove } = useDeleteStagiairePrepa();
  const { restore } = useDesarchiverStagiairePrepa();
  const { hardDelete } = useHardDeleteStagiairePrepa();

  const items: StagiairePrepa[] = useMemo(() => data?.results ?? [], [data?.results]);

  useEffect(() => {
    setCount(data?.count ?? 0);
  }, [data?.count, setCount]);

  const hasArchiveFilter = Boolean(avecArchivees || archivesSeules);
  const hasResults = items.length > 0;

  const buildCreateUrl = () => {
    if (prepaOrigine) return `/prepa/stagiaires/create?prepa_origine=${prepaOrigine}`;
    return "/prepa/stagiaires/create";
  };

  const handleRowClick = (id: number) => {
    const it = items.find((i) => i.id === id);
    if (it) {
      setSelectedStag(it);
      setShowDetail(true);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await remove(deleteId);
      toast.success("Fiche archivée");
      setShowConfirmDelete(false);
      setDeleteId(null);
      setPage((p) => (items.length <= 1 && p > 1 ? p - 1 : p));
      setListBump((b) => b + 1);
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await restore(id);
      toast.success("Fiche restaurée");
      setListBump((b) => b + 1);
    } catch {
      toast.error("Erreur de restauration");
    }
  };

  const handleHardDelete = async () => {
    if (hardDeleteId == null) return;
    try {
      await hardDelete(hardDeleteId);
      toast.success("Suppression définitive effectuée");
      setHardDeleteId(null);
      setListBump((b) => b + 1);
    } catch {
      toast.error("Erreur de suppression");
    }
  };

  return (
    <PageTemplate
      title="Stagiaires Prépa"
      subtitle="Suivi nominatif des personnes en parcours Prépa (sans compte candidat imposé)."
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => setListBump((b) => b + 1)}
      headerExtra={
        <SearchInput
          placeholder="Rechercher un stagiaire (nom, prénom)…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      }
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
          <Button variant="outlined" onClick={(e) => setAnchorOptions(e.currentTarget)}>
            Exports
          </Button>
          <Menu
            anchorEl={anchorOptions}
            open={Boolean(anchorOptions)}
            onClose={() => setAnchorOptions(null)}
          >
            <MenuItem
              onClick={async () => {
                setAnchorOptions(null);
                try {
                  await exportList();
                } catch {
                  toast.error("Export indisponible");
                }
              }}
            >
              Export liste (XLSX)
            </MenuItem>
            <MenuItem
              onClick={async () => {
                setAnchorOptions(null);
                try {
                  await exportPresence();
                } catch {
                  toast.error("Export indisponible");
                }
              }}
            >
              Export présence
            </MenuItem>
            <MenuItem
              onClick={async () => {
                setAnchorOptions(null);
                try {
                  await exportEmargement();
                } catch {
                  toast.error("Export indisponible");
                }
              }}
            >
              Export émargement
            </MenuItem>
          </Menu>

          <Select
            size="small"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[5, 10, 20, 50].map((s) => (
              <MenuItem key={s} value={s}>
                {s} / page
              </MenuItem>
            ))}
          </Select>

          {canWritePrepa && (
            <Button variant="contained" onClick={() => navigate(buildCreateUrl())}>
              Nouveau stagiaire Prépa
            </Button>
          )}

          <Button
            variant={hasArchiveFilter ? "contained" : "outlined"}
            onClick={() => {
              if (avecArchivees || archivesSeules) {
                setAvecArchivees(false);
                setArchivesSeules(false);
              } else {
                setAvecArchivees(true);
                setArchivesSeules(false);
              }
            }}
          >
            {hasArchiveFilter ? "Masquer archivées" : "Inclure archivées"}
          </Button>

          {hasArchiveFilter && (
            <Button
              variant={archivesSeules ? "contained" : "outlined"}
              onClick={() =>
                setArchivesSeules((prev) => {
                  if (prev) return false;
                  setAvecArchivees(true);
                  return true;
                })
              }
            >
              {archivesSeules ? "Voir tout" : "Archives seules"}
            </Button>
          )}
        </Stack>
      }
      footer={
        count > 0 ? (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Typography variant="body2">
              Page {page} / {totalPages} ({count} résultats)
            </Typography>
            <Pagination
              page={page}
              count={totalPages}
              onChange={(_, v) => setPage(v)}
              color="primary"
            />
          </Stack>
        ) : null
      }
    >
      {prepaOrigine ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Filtre actif : Prépa d&apos;origine n°&nbsp;{prepaOrigine}
        </Typography>
      ) : null}

      {loading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : error ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography color="error">Erreur de chargement des stagiaires Prépa</Typography>
        </Box>
      ) : !hasResults ? (
        <Box sx={{ textAlign: "center", color: "text.secondary", py: 4 }}>
          <Typography>Aucun stagiaire Prépa trouvé.</Typography>
        </Box>
      ) : (
        <StagiairesPrepaTable
          items={items}
          onRowClick={handleRowClick}
          onEdit={(id) => navigate(`/prepa/stagiaires/${id}/edit`)}
          onDelete={(id) => {
            setDeleteId(id);
            setShowConfirmDelete(true);
          }}
          onRestore={handleRestore}
          onHardDelete={setHardDeleteId}
        />
      )}

      <StagiairesPrepaDetailModal
        open={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedStag(null);
        }}
        stagiaire={selectedStag}
        onEdit={
          canWritePrepa
            ? (id) => {
                setShowDetail(false);
                navigate(`/prepa/stagiaires/${id}/edit`);
              }
            : undefined
        }
      />

      <Dialog open={showConfirmDelete} onClose={() => setShowConfirmDelete(false)}>
        <DialogTitle>Archiver cette fiche ?</DialogTitle>
        <DialogContent>
          <DialogContentText>Le stagiaire Prépa sera retiré des listes actives.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDelete(false)}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Archiver
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={hardDeleteId != null} onClose={() => setHardDeleteId(null)}>
        <DialogTitle>Suppression définitive</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette fiche archivée sera supprimée de manière irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHardDeleteId(null)}>Annuler</Button>
          <Button onClick={handleHardDelete} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
