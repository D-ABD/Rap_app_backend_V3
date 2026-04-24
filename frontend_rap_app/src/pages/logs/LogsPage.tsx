import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PageTemplate from "../../components/PageTemplate";
import SearchInput from "../../components/SearchInput";
import usePagination from "../../hooks/usePagination";
import LogDetailModal from "./LogDetailModal";
import LogTable from "./LogTable";
import { useLogChoices, useLogExports, useLogs } from "../../hooks/useLogs";
import type { LogEntry, LogFilters } from "../../types/log";

export default function LogsPage() {
  const navigate = useNavigate();
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } =
    usePagination();

  const [detail, setDetail] = useState<LogEntry | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("logs.showFilters") === "1";
  });

  const [filters, setFilters] = useState<LogFilters>({
    search: "",
    action: "",
    model: "",
    user: "",
    date_from: "",
    date_to: "",
    ordering: "-created_at",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("logs.showFilters", showFilters ? "1" : "0");
    }
  }, [showFilters]);

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
    filters.search ||
      filters.action ||
      filters.model ||
      filters.user ||
      filters.date_from ||
      filters.date_to
  );

  const invalidDateRange = Boolean(
    filters.date_from &&
      filters.date_to &&
      filters.date_from > filters.date_to
  );

  const { data, loading, error, refresh } = useLogs(params);
  const { data: choices, loading: loadingChoices } = useLogChoices();
  const { exportCsv, exportPdf, exportXlsx } = useLogExports();

  useEffect(() => {
    setCount(data?.count ?? 0);
  }, [data, setCount]);

  const logs = data?.results ?? [];

  const resetFilters = () => {
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
  };

  const footer =
    count > 0 ? (
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1}
      >
        <Typography variant="body2" color="text.secondary">
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
            color="primary"
          />
        </Box>
      </Stack>
    ) : null;

  return (
    <PageTemplate
      title="Logs"
      backButton
      onBack={() => navigate(-1)}
      refreshButton
      onRefresh={() => void refresh()}
      headerExtra={
        <SearchInput
          placeholder="Recherche texte"
          value={filters.search ?? ""}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, search: e.target.value }));
            setPage(1);
          }}
        />
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
          </Button>

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
            onClick={resetFilters}
          >
            Réinitialiser
          </Button>

          <Button
            variant="outlined"
            disabled={loading || logs.length === 0 || invalidDateRange}
            onClick={() => void exportXlsx(params)}
          >
            XLSX
          </Button>

          <Button
            variant="outlined"
            disabled={loading || logs.length === 0 || invalidDateRange}
            onClick={() => void exportCsv(params)}
          >
            CSV
          </Button>

          <Button
            variant="outlined"
            disabled={loading || logs.length === 0 || invalidDateRange}
            onClick={() => void exportPdf(params)}
          >
            PDF
          </Button>
        </Stack>
      }
      filters={
        showFilters ? (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            flexWrap="wrap"
            useFlexGap
          >
            <Select
              size="small"
              displayEmpty
              value={filters.action ?? ""}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, action: e.target.value }));
                setPage(1);
              }}
              sx={{ minWidth: 180 }}
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
              sx={{ minWidth: 190 }}
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
              sx={{ minWidth: 180 }}
            />

            <TextField
              size="small"
              type="date"
              label="Date min"
              value={filters.date_from ?? ""}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  date_from: e.target.value,
                }));
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 170 }}
            />

            <TextField
              size="small"
              type="date"
              label="Date max"
              value={filters.date_to ?? ""}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  date_to: e.target.value,
                }));
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 170 }}
            />
          </Stack>
        ) : undefined
      }
      footer={footer}
    >
      {invalidDateRange ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          La date de début doit être antérieure ou égale à la date de fin.
        </Alert>
      ) : null}

      {loading || loadingChoices ? (
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
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      {!loading && !error && logs.length === 0 ? (
        <Box
          sx={{
            minHeight: 180,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            color: "text.secondary",
          }}
        >
          <Box fontSize={48} mb={1}>
            📭
          </Box>
          <Typography>Aucun log trouvé.</Typography>
        </Box>
      ) : null}

      {!loading && !error && logs.length > 0 ? (
        <LogTable logs={logs} onOpen={setDetail} />
      ) : null}

      <LogDetailModal
        open={Boolean(detail)}
        log={detail}
        onClose={() => setDetail(null)}
      />
    </PageTemplate>
  );
}