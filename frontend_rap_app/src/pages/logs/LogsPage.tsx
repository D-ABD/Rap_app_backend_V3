import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, MenuItem, Pagination, Select, Stack, TextField, Typography } from "@mui/material";
import PageTemplate from "../../components/PageTemplate";
import usePagination from "../../hooks/usePagination";
import LogDetailModal from "./LogDetailModal";
import LogTable from "./LogTable";
import { useLogChoices, useLogExports, useLogs } from "../../hooks/useLogs";
import type { LogEntry, LogFilters } from "../../types/log";

export default function LogsPage() {
  const navigate = useNavigate();
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination();
  const [detail, setDetail] = useState<LogEntry | null>(null);
  const [filters, setFilters] = useState<LogFilters>({
    search: "",
    action: "",
    model: "",
    user: "",
    date_from: "",
    date_to: "",
    ordering: "-created_at",
  });
  const params = useMemo(
    () => ({
      ...filters,
      page,
      page_size: pageSize,
      search: filters.search || undefined,
      action: filters.action || undefined,
      model: filters.model || undefined,
      user: filters.user || undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
    }),
    [filters, page, pageSize]
  );
  const hasActiveFilters = Boolean(
    filters.search || filters.action || filters.model || filters.user || filters.date_from || filters.date_to
  );
  const invalidDateRange = Boolean(
    filters.date_from && filters.date_to && filters.date_from > filters.date_to
  );
  const { data, loading, error, refresh } = useLogs(params);
  const { data: choices, loading: loadingChoices } = useLogChoices();
  const { exportCsv, exportPdf, exportXlsx } = useLogExports();

  useEffect(() => {
    setCount(data?.count ?? 0);
  }, [data, setCount]);

  const logs = data?.results ?? [];

  return (
    <PageTemplate
      title="Logs"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => void refresh()}
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="Recherche texte"
            value={filters.search ?? ""}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }));
              setPage(1);
            }}
          />
          <Select
            size="small"
            displayEmpty
            value={filters.action ?? ""}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, action: e.target.value }));
              setPage(1);
            }}
          >
            <MenuItem value="">Toutes les actions</MenuItem>
            {(choices?.actions ?? []).map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            displayEmpty
            value={filters.model ?? ""}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, model: e.target.value }));
              setPage(1);
            }}
          >
            <MenuItem value="">Tous les modèles</MenuItem>
            {(choices?.models ?? []).map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
          <TextField
            size="small"
            placeholder="Utilisateur"
            value={filters.user ?? ""}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, user: e.target.value }));
              setPage(1);
            }}
          />
          <TextField
            size="small"
            type="date"
            label="Date min"
            value={filters.date_from ?? ""}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, date_from: e.target.value }));
              setPage(1);
            }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            type="date"
            label="Date max"
            value={filters.date_to ?? ""}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, date_to: e.target.value }));
              setPage(1);
            }}
            InputLabelProps={{ shrink: true }}
          />
          <Select
            size="small"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50].map((size) => (
              <MenuItem key={size} value={size}>
                {size} / page
              </MenuItem>
            ))}
          </Select>
          <Button
            variant="text"
            disabled={!hasActiveFilters}
            onClick={() => {
              setFilters({
                search: "",
                action: "",
                model: "",
                user: "",
                date_from: "",
                date_to: "",
                ordering: "-created_at",
              });
              setPage(1);
            }}
          >
            Réinitialiser
          </Button>
          <Button variant="outlined" disabled={loading || logs.length === 0 || invalidDateRange} onClick={() => void exportXlsx(params)}>
            XLSX
          </Button>
          <Button variant="outlined" disabled={loading || logs.length === 0 || invalidDateRange} onClick={() => void exportCsv(params)}>
            CSV
          </Button>
          <Button variant="outlined" disabled={loading || logs.length === 0 || invalidDateRange} onClick={() => void exportPdf(params)}>
            PDF
          </Button>
        </Stack>
      }
      footer={
        count > 0 ? (
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center">
            <Typography variant="body2">
              Page {page} / {totalPages} ({count} résultats)
            </Typography>
            <Pagination page={page} count={totalPages} onChange={(_, value) => setPage(value)} color="primary" />
          </Stack>
        ) : null
      }
    >
      {invalidDateRange ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          La date de début doit être antérieure ou égale à la date de fin.
        </Alert>
      ) : null}
      {loading || loadingChoices ? <CircularProgress /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!loading && !error && logs.length === 0 ? (
        <Box textAlign="center" color="text.secondary" my={4}>
          <Box fontSize={48} mb={1}>
            📭
          </Box>
          <Typography>Aucun log trouvé.</Typography>
        </Box>
      ) : null}
      {!loading && !error && logs.length > 0 ? <LogTable logs={logs} onOpen={setDetail} /> : null}
      <LogDetailModal open={Boolean(detail)} log={detail} onClose={() => setDetail(null)} />
    </PageTemplate>
  );
}
