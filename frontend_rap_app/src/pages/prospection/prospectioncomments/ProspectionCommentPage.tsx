// src/pages/prospection/prospectioncomments/ProspectionCommentPage.tsx

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  MenuItem,
  Select,
} from "@mui/material";

import PageTemplate from "../../../components/PageTemplate";
import ProspectionCommentTable from "./ProspectionCommentTable";
import type {
  ProspectionCommentDTO,
  ProspectionCommentListParams,
} from "../../../types/prospectionComment";
import {
  useListProspectionComments,
  useProspectionCommentFilterOptions,
} from "../../../hooks/useProspectionComments";
import api from "../../../api/axios";
import FiltresProspectionCommentsPanel from "../../../components/filters/FiltresProspectionCommentsPanel";
import { useMe } from "../../../hooks/useUsers";
import { CustomUserRole, User } from "../../../types/User";
import ExportButtonProspectionComment from "../../../components/export_buttons/ExportButtonProspectionComment";
import usePagination from "../../../hooks/usePagination";

type ProspectionDisplayLite = {
  partenaire_nom: string | null;
  formation_nom: string | null;
};

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

export default function ProspectionCommentPage() {
  const navigate = useNavigate();
  const { prospectionId } = useParams<{ prospectionId?: string }>();

  const { user: me } = useMe();
  const role: NormalizedRole = useMemo(() => normalizeRole(me), [me]);

  const canUseFilters = ["superadmin", "admin", "staff"].includes(role);
  const panelMode: "default" | "candidate" = canUseFilters ? "default" : "candidate";

  // 🔹 filtres masqués par défaut
  const [showFilters, setShowFilters] = useState(false);

  const [params, setParams] = useState<ProspectionCommentListParams & { search?: string }>(() => {
    const initial: ProspectionCommentListParams & { search?: string } = {
      ordering: "-created_at",
      search: "",
    };
    if (prospectionId && Number.isFinite(Number(prospectionId))) {
      initial.prospection = Number(prospectionId);
    }
    return initial;
  });

  // ✅ Pagination
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();

  const [reloadKey, setReloadKey] = useState(0);

  // params effectifs envoyés à l’API (avec page et page_size)
  const effectiveParams = useMemo(
    () => ({
      ...params,
      page,
      page_size: pageSize,
    }),
    [params, page, pageSize]
  );

  const { data, loading, error } = useListProspectionComments(effectiveParams, reloadKey);

  // ✅ filtre options
  const { data: filterOptions, loading: _loadingFilters } =
    useProspectionCommentFilterOptions(reloadKey); // 🩵 renommé pour ignorer l’avertissement

  const rows: ProspectionCommentDTO[] = useMemo(
    () => (Array.isArray(data?.results) ? data.results : []),
    [data]
  );

  useEffect(() => {
    if (data?.count != null) {
      setCount(data.count);
    }
  }, [data, setCount]);

  const [prospLookup, setProspLookup] = useState<Record<number, ProspectionDisplayLite>>({});

  useEffect(() => {
    const missingIds = Array.from(new Set(rows.map((r) => r.prospection))).filter(
      (id) => !(id in prospLookup)
    );
    if (missingIds.length === 0) return;

    (async () => {
      try {
        const results = await Promise.all(
          missingIds.map(async (id) => {
            const { data: p } = await api.get(`/prospections/${id}/`);
            return [
              id,
              {
                partenaire_nom: p?.partenaire_nom ?? null,
                formation_nom: p?.formation_nom ?? null,
              },
            ] as const;
          })
        );
        setProspLookup((prev) => {
          const next = { ...prev };
          for (const [id, meta] of results) next[id] = meta;
          return next;
        });
      } catch {
        // silencieux
      }
    })();
  }, [rows, prospLookup]);

  const enrichedRows: ProspectionCommentDTO[] = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        partenaire_nom: r.partenaire_nom ?? prospLookup[r.prospection]?.partenaire_nom ?? null,
        formation_nom: r.formation_nom ?? prospLookup[r.prospection]?.formation_nom ?? null,
      })),
    [rows, prospLookup]
  );

  const exportRows = useMemo(
    () =>
      enrichedRows.map((r) => ({
        id: r.id,
        prospection: r.prospection,
        partenaire_nom: r.partenaire_nom ?? null,
        formation_nom: r.formation_nom ?? null,
        prospection_text: r.prospection_text ?? null,
        body: r.body,
        is_internal: r.is_internal,
        created_by_username: r.created_by_username ?? null,
        created_at: r.created_at,
      })),
    [enrichedRows]
  );

  const [selectedRow, setSelectedRow] = useState<ProspectionCommentDTO | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!selectedRow) return;
    try {
      await api.delete(`/prospection-commentaires/${selectedRow.id}/`);
      toast.success(`🗑️ Commentaire #${selectedRow.id} supprimé`);
      setShowConfirm(false);
      setSelectedRow(null);
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }, [selectedRow]);

  return (
    <PageTemplate
      title="Commentaires de prospection"
      refreshButton
      onRefresh={() => setReloadKey((k) => k + 1)}
      actions={
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {/* 🔹 Bouton toggle filtres */}
          {canUseFilters && (
            <Button variant="outlined" onClick={() => setShowFilters((v) => !v)}>
              {showFilters ? "🫣 Masquer filtres" : "🔎 Afficher filtres"}
            </Button>
          )}

          <Chip label={`Rôle : ${role}`} size="small" color="primary" variant="outlined" />
          <ExportButtonProspectionComment data={exportRows} selectedIds={[]} />

          <Select
            size="small"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[5, 10, 20].map((s) => (
              <MenuItem key={s} value={s}>
                {s} / page
              </MenuItem>
            ))}
          </Select>

          <Button variant="contained" onClick={() => navigate("/prospection-commentaires/create")}>
            ➕ Nouveau commentaire
          </Button>
        </Stack>
      }
      filters={
        showFilters && (
          <FiltresProspectionCommentsPanel
            mode={panelMode}
            filtres={
              canUseFilters
                ? (filterOptions ?? {
                    authors: [],
                    formations: [],
                    partenaires: [],
                    centres: [],
                    owners: [],
                    user_role: role,
                  })
                : {
                    authors: [],
                    formations: [],
                    partenaires: [],
                    centres: [],
                    owners: [],
                    user_role: role,
                  }
            }
            values={params}
            onChange={(next) => {
              setParams(next);
              setPage(1); // reset pagination
            }}
            onRefresh={() => setReloadKey((k) => k + 1)}
            onReset={() => {
              setParams({
                prospection:
                  prospectionId && Number.isFinite(Number(prospectionId))
                    ? Number(prospectionId)
                    : undefined,
                is_internal: undefined,
                created_by: undefined,
                ordering: "-created_at",
                search: "",
                formation_nom: undefined,
                partenaire_nom: undefined,
                created_by_username: undefined,
                formation_centre_nom: undefined,
                prospection_owner: undefined,
              });
              setPage(1);
            }}
          />
        )
      }
      footer={
        count > 0 && (
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
              onChange={(_, val) => setPage(val)}
              color="primary"
            />
          </Stack>
        )
      }
    >
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" align="center" py={4}>
          Erreur lors du chargement des commentaires.
        </Typography>
      ) : enrichedRows.length === 0 ? (
        <Typography color="text.secondary" align="center" py={4}>
          Aucun commentaire trouvé.
        </Typography>
      ) : (
        <ProspectionCommentTable
          rows={enrichedRows}
          onDelete={(r) => {
            setSelectedRow(r);
            setShowConfirm(true);
          }}
          onEdit={(r) => navigate(`/prospection-commentaires/${r.id}/edit`)}
          linkToProspection={(id) => `/prospections/${id}`}
        />
      )}

      {/* ✅ Confirmation avec Dialog */}
      <Dialog
        open={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setSelectedRow(null);
        }}
      >
        <DialogTitle>Confirmation</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedRow
              ? `Supprimer le commentaire #${selectedRow.id} ?`
              : "Supprimer ce commentaire ?"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowConfirm(false);
              setSelectedRow(null);
            }}
          >
            Annuler
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
