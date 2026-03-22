// src/pages/users/UsersPage.tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Box,
  Stack,
  Button,
  TextField,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import PageTemplate from "../../components/PageTemplate";
import usePagination from "../../hooks/usePagination";
import useFetch from "../../hooks/useFetch";
import useUserFiltres, { useUserRoles } from "../../hooks/useUsers";
import type { PaginatedResponse } from "../../types/api";
import type { User, UserFiltresValues, CustomUserRole } from "../../types/User";
import FiltresUsersPanel from "../../components/filters/FiltresUsersPanel";
import UserTable from "./UserTable";

export default function UsersPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<UserFiltresValues>({
    is_active: undefined,
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CustomUserRole>("stagiaire");

  const { filtresOptions, loading: loadingFiltres } = useUserFiltres();
  const { roles: availableRoles } = useUserRoles();

  const { page, setPage, count, setCount, totalPages, pageSize, setPageSize } = usePagination();

  const { data, loading, error, fetchData } = useFetch<PaginatedResponse<User>>(
    "/users/",
    { search, page, page_size: pageSize, ...filters },
    true
  );

  const users = data?.results ?? [];

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    if (data?.count !== undefined) setCount(data.count);
  }, [data?.count, setCount]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);
  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(users.map((u) => u.id));

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;

    try {
      const api = await import("../../api/axios");
      await Promise.all(idsToDelete.map((id) => api.default.delete(`/users/${id}/`)));
      toast.success(`🗑️ ${idsToDelete.length} utilisateur(s) supprimé(s)`);
      setShowConfirm(false);
      setSelectedId(null);
      setSelectedIds([]);
      fetchData();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleActivate = async () => {
    if (!selectedIds.length) return;
    try {
      const api = await import("../../api/axios");
      await Promise.all(
        selectedIds.map((id) => api.default.patch(`/users/${id}/`, { is_active: true }))
      );
      toast.success(`✅ ${selectedIds.length} utilisateur(s) activé(s)`);
      setSelectedIds([]);
      fetchData();
    } catch {
      toast.error("Erreur lors de l'activation");
    }
  };

  const handleChangeRole = async () => {
    if (!selectedIds.length) return;
    try {
      const api = await import("../../api/axios");
      await Promise.all(
        selectedIds.map((id) => api.default.patch(`/users/${id}/`, { role: selectedRole }))
      );
      toast.success(`👤 Rôle "${selectedRole}" appliqué à ${selectedIds.length} utilisateur(s)`);
      setSelectedIds([]);
      fetchData();
    } catch {
      toast.error("Erreur lors du changement de rôle");
    }
  };

  return (
    <PageTemplate
      title="👥 Utilisateurs"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={fetchData}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          <TextField
            size="small"
            value={search}
            placeholder="🔍 Rechercher..."
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            fullWidth={isMobile}
          />
          <Select
            size="small"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[5, 10, 20].map((n) => (
              <MenuItem key={n} value={n}>
                {n} / page
              </MenuItem>
            ))}
          </Select>
          <Button
            variant="contained"
            onClick={() => navigate("/users/create")}
            fullWidth={isMobile}
          >
            ➕ Ajouter
          </Button>

          {selectedIds.length > 0 && (
            <>
              <Button color="error" variant="contained" onClick={() => setShowConfirm(true)}>
                🗑️ Supprimer ({selectedIds.length})
              </Button>
              <Button color="success" variant="contained" onClick={handleActivate}>
                ✅ Activer
              </Button>
              <Select
                size="small"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as CustomUserRole)}
              >
                {availableRoles.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </Select>
              <Button color="warning" variant="contained" onClick={handleChangeRole}>
                🔄 Changer rôle
              </Button>
              <Button variant="outlined" onClick={selectAll}>
                ✅ Tout
              </Button>
              <Button variant="outlined" onClick={clearSelection}>
                ❌ Annuler
              </Button>
            </>
          )}
        </Stack>
      }
      filters={
        <FiltresUsersPanel<UserFiltresValues>
          values={filters}
          options={filtresOptions}
          loading={loadingFiltres}
          onChange={(newFiltres) => {
            setFilters(newFiltres);
            setPage(1);
          }}
        />
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
              size={isMobile ? "small" : "medium"}
            />
          </Stack>
        )
      }
    >
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">Erreur lors du chargement des utilisateurs.</Typography>
      ) : users.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Box fontSize={48} mb={1}>
            📭
          </Box>
          <Typography>Aucun utilisateur trouvé.</Typography>
        </Box>
      ) : (
        <UserTable
          users={users}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onEdit={(id) => navigate(`/users/${id}/edit`)}
        />
      )}

      {/* Confirmation dialog */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Supprimer cet utilisateur ?"
              : `Supprimer les ${selectedIds.length} utilisateurs sélectionnés ?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirm(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </PageTemplate>
  );
}
