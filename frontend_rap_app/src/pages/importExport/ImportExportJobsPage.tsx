import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import PageTemplate from "../../components/PageTemplate";
import { downloadImportJobsCsv, downloadImportJobsPdf, downloadImportJobsXlsx } from "../../api/importExportJobs";
import useFetch from "../../hooks/useFetch";
import usePagination from "../../hooks/usePagination";
import { useSimpleUsers } from "../../hooks/useUsers";
import type { ImportExportJobRow } from "../../api/importExportJobs";
import type { SimpleUser } from "../../types/User";

const IMPORT_JOB_RESOURCE_OPTIONS = [
  "centre",
  "type_offre",
  "statut",
  "partenaire",
  "formation",
  "document",
  "candidat",
  "cvtheque",
] as const;

const IMPORT_JOB_STATUS_MULTI = ["success", "error"] as const;

function parseCsvParam(sp: URLSearchParams, key: string, allowed: readonly string[]): string[] {
  const raw = sp.get(key);
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((v) => allowed.includes(v));
}

function readFiltersFromSearchParams(sp: URLSearchParams) {
  const resourceFilter = sp.get("resource")?.trim() ?? "";
  const resourcesInFilter = parseCsvParam(sp, "resource__in", IMPORT_JOB_RESOURCE_OPTIONS);
  const userFilter = sp.get("user")?.trim() ?? "";
  const dateMinFilter = sp.get("date_min")?.trim() ?? "";
  const dateMaxFilter = sp.get("date_max")?.trim() ?? "";
  const st = sp.get("status");
  const statusFilter: "" | "success" | "error" = st === "success" || st === "error" ? st : "";
  const statusesInFilter = parseCsvParam(sp, "status__in", IMPORT_JOB_STATUS_MULTI);
  const dr = sp.get("dry_run");
  const dryRunFilter: "" | "true" | "false" = dr === "true" ? "true" : dr === "false" ? "false" : "";
  const ord = sp.get("ordering");
  const ordering: "-created_at" | "created_at" = ord === "created_at" || ord === "-created_at" ? ord : "-created_at";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const ps = parseInt(sp.get("page_size") ?? "10", 10);
  const pageSize = [10, 20, 50].includes(ps) ? ps : 10;
  return {
    resourceFilter,
    resourcesInFilter,
    userFilter,
    dateMinFilter,
    dateMaxFilter,
    statusFilter,
    statusesInFilter,
    dryRunFilter,
    ordering,
    page,
    pageSize,
  };
}

function buildSearchParamsFromFilters(state: {
  resourceFilter: string;
  resourcesInFilter: string[];
  userFilter: string;
  dateMinFilter: string;
  dateMaxFilter: string;
  statusFilter: "" | "success" | "error";
  statusesInFilter: string[];
  dryRunFilter: "" | "true" | "false";
  ordering: "-created_at" | "created_at";
  page: number;
  pageSize: number;
}): URLSearchParams {
  const next = new URLSearchParams();
  if (state.resourceFilter.trim()) next.set("resource", state.resourceFilter.trim());
  if (state.resourcesInFilter.length) next.set("resource__in", state.resourcesInFilter.join(","));
  if (state.userFilter.trim()) next.set("user", state.userFilter.trim());
  if (state.dateMinFilter) next.set("date_min", state.dateMinFilter);
  if (state.dateMaxFilter) next.set("date_max", state.dateMaxFilter);
  if (state.statusFilter) next.set("status", state.statusFilter);
  if (state.statusesInFilter.length) next.set("status__in", state.statusesInFilter.join(","));
  if (state.dryRunFilter === "true") next.set("dry_run", "true");
  if (state.dryRunFilter === "false") next.set("dry_run", "false");
  if (state.ordering !== "-created_at") next.set("ordering", state.ordering);
  if (state.page !== 1) next.set("page", String(state.page));
  if (state.pageSize !== 10) next.set("page_size", String(state.pageSize));
  return next;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function JsonBlock({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {label} : —
      </Typography>
    );
  }
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>
      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "grey.50", maxHeight: 240, overflow: "auto" }}>
        <Typography component="pre" variant="caption" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap", m: 0 }}>
          {JSON.stringify(value, null, 2)}
        </Typography>
      </Paper>
    </Box>
  );
}

export default function ImportExportJobsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const init = readFiltersFromSearchParams(searchParams);
  const { page, setPage, pageSize, setPageSize, count, setCount, totalPages } = usePagination(init.page, init.pageSize);
  const [resourceFilter, setResourceFilter] = useState(init.resourceFilter);
  const [resourcesInFilter, setResourcesInFilter] = useState<string[]>(init.resourcesInFilter);
  const [userFilter, setUserFilter] = useState(init.userFilter);
  const [dateMinFilter, setDateMinFilter] = useState(init.dateMinFilter);
  const [dateMaxFilter, setDateMaxFilter] = useState(init.dateMaxFilter);
  const [statusFilter, setStatusFilter] = useState<"" | "success" | "error">(init.statusFilter);
  const [statusesInFilter, setStatusesInFilter] = useState<string[]>(init.statusesInFilter);
  const [dryRunFilter, setDryRunFilter] = useState<"" | "true" | "false">(init.dryRunFilter);
  const [ordering, setOrdering] = useState<"-created_at" | "created_at">(init.ordering);
  const [detail, setDetail] = useState<ImportExportJobRow | null>(null);
  const { users: simpleUsers, loading: simpleUsersLoading } = useSimpleUsers();
  const skipNextUrlHydrate = useRef(false);
  const skipInitialUrlHydrate = useRef(true);

  useEffect(() => {
    if (skipNextUrlHydrate.current) {
      skipNextUrlHydrate.current = false;
      return;
    }
    if (skipInitialUrlHydrate.current) {
      skipInitialUrlHydrate.current = false;
      return;
    }
    const next = readFiltersFromSearchParams(searchParams);
    setResourceFilter(next.resourceFilter);
    setResourcesInFilter(next.resourcesInFilter);
    setUserFilter(next.userFilter);
    setDateMinFilter(next.dateMinFilter);
    setDateMaxFilter(next.dateMaxFilter);
    setStatusFilter(next.statusFilter);
    setStatusesInFilter(next.statusesInFilter);
    setDryRunFilter(next.dryRunFilter);
    setOrdering(next.ordering);
    setPage(next.page);
    setPageSize(next.pageSize);
  }, [searchParams, setPage, setPageSize]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const prevParams = new URLSearchParams(typeof prev === "string" ? prev : prev);
        const built = buildSearchParamsFromFilters({
          resourceFilter,
          resourcesInFilter,
          userFilter,
          dateMinFilter,
          dateMaxFilter,
          statusFilter,
          statusesInFilter,
          dryRunFilter,
          ordering,
          page,
          pageSize,
        });
        if (built.toString() === prevParams.toString()) return prev;
        skipNextUrlHydrate.current = true;
        return built;
      },
      { replace: true }
    );
  }, [
    resourceFilter,
    resourcesInFilter,
    userFilter,
    dateMinFilter,
    dateMaxFilter,
    statusFilter,
    statusesInFilter,
    dryRunFilter,
    ordering,
    page,
    pageSize,
    setSearchParams,
  ]);

  const toDateInput = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const applyPeriodPreset = (days: 7 | 30) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    setDateMinFilter(toDateInput(start));
    setDateMaxFilter(toDateInput(now));
    setPage(1);
  };
  const applyCurrentMonthPreset = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setDateMinFilter(toDateInput(start));
    setDateMaxFilter(toDateInput(now));
    setPage(1);
  };

  /** Lundi de la semaine calendaire contenant `d` (semaine = lun–dim). */
  const mondayOfWeekContaining = (d: Date): Date => {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = copy.getDay();
    const daysFromMonday = dow === 0 ? 6 : dow - 1;
    copy.setDate(copy.getDate() - daysFromMonday);
    return copy;
  };

  const applyPreviousWeekPreset = () => {
    const thisMonday = mondayOfWeekContaining(new Date());
    const prevSunday = new Date(thisMonday);
    prevSunday.setDate(prevSunday.getDate() - 1);
    const prevMonday = new Date(prevSunday);
    prevMonday.setDate(prevMonday.getDate() - 6);
    setDateMinFilter(toDateInput(prevMonday));
    setDateMaxFilter(toDateInput(prevSunday));
    setPage(1);
  };

  const applyPreviousMonthPreset = () => {
    const now = new Date();
    const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastPrevMonth = new Date(firstThisMonth);
    lastPrevMonth.setDate(0);
    const firstPrevMonth = new Date(lastPrevMonth.getFullYear(), lastPrevMonth.getMonth(), 1);
    setDateMinFilter(toDateInput(firstPrevMonth));
    setDateMaxFilter(toDateInput(lastPrevMonth));
    setPage(1);
  };

  const params = useMemo(
    () => ({
      page,
      page_size: pageSize,
      ordering,
      ...(resourceFilter.trim() ? { resource: resourceFilter.trim() } : {}),
      ...(resourcesInFilter.length ? { resource__in: resourcesInFilter.join(",") } : {}),
      ...(userFilter.trim() ? { user: userFilter.trim() } : {}),
      ...(dateMinFilter ? { date_min: dateMinFilter } : {}),
      ...(dateMaxFilter ? { date_max: dateMaxFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(statusesInFilter.length ? { status__in: statusesInFilter.join(",") } : {}),
      ...(dryRunFilter === "true" ? { dry_run: true } : {}),
      ...(dryRunFilter === "false" ? { dry_run: false } : {}),
    }),
    [
      page,
      pageSize,
      ordering,
      resourceFilter,
      resourcesInFilter,
      userFilter,
      dateMinFilter,
      dateMaxFilter,
      statusFilter,
      statusesInFilter,
      dryRunFilter,
    ]
  );
  const exportParams = useMemo(
    () => ({
      ordering,
      ...(resourceFilter.trim() ? { resource: resourceFilter.trim() } : {}),
      ...(resourcesInFilter.length ? { resource__in: resourcesInFilter.join(",") } : {}),
      ...(userFilter.trim() ? { user: userFilter.trim() } : {}),
      ...(dateMinFilter ? { date_min: dateMinFilter } : {}),
      ...(dateMaxFilter ? { date_max: dateMaxFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(statusesInFilter.length ? { status__in: statusesInFilter.join(",") } : {}),
      ...(dryRunFilter === "true" ? { dry_run: true } : {}),
      ...(dryRunFilter === "false" ? { dry_run: false } : {}),
    }),
    [ordering, resourceFilter, resourcesInFilter, userFilter, dateMinFilter, dateMaxFilter, statusFilter, statusesInFilter, dryRunFilter]
  );

  const { data, loading, error, fetchData } = useFetch<{
    count: number;
    results: ImportExportJobRow[];
  }>("/import-export/jobs/", params, false);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCount(data?.count ?? 0);
  }, [data?.count, setCount]);

  const rows = data?.results ?? [];

  return (
    <>
      <PageTemplate
        title="Historique des imports Excel"
        subtitle="Traces des appels import (.xlsx) sous /api/import-export/ — vos imports uniquement, sauf rôle administrateur."
        backButton
        onBack={() => navigate(-1)}
        refreshButton
        onRefresh={() => void fetchData()}
        actions={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label="Ressource"
              placeholder="ex. centre, formation"
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value);
                setPage(1);
              }}
            />
            <Select
              size="small"
              multiple
              displayEmpty
              input={<OutlinedInput />}
              value={resourcesInFilter}
              onChange={(e) => {
                const v = e.target.value;
                setResourcesInFilter(typeof v === "string" ? v.split(",") : v);
                setPage(1);
              }}
              renderValue={(selected) => {
                const vals = selected as string[];
                if (!vals.length) return "Ressources (multi)";
                return vals.join(", ");
              }}
              sx={{ minWidth: 210 }}
            >
              {IMPORT_JOB_RESOURCE_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  <Checkbox checked={resourcesInFilter.includes(opt)} />
                  <ListItemText primary={opt} />
                </MenuItem>
              ))}
            </Select>
            <Stack direction="row" spacing={0.5}>
              <Button size="small" variant="text" onClick={() => applyPeriodPreset(7)}>
                7j
              </Button>
              <Button size="small" variant="text" onClick={() => applyPeriodPreset(30)}>
                30j
              </Button>
              <Button size="small" variant="text" onClick={applyCurrentMonthPreset}>
                Mois
              </Button>
              <Button size="small" variant="text" onClick={applyPreviousWeekPreset}>
                Sem. préc.
              </Button>
              <Button size="small" variant="text" onClick={applyPreviousMonthPreset}>
                Mois préc.
              </Button>
            </Stack>
            <Autocomplete
              freeSolo
              size="small"
              sx={{ minWidth: 260 }}
              options={simpleUsers}
              loading={simpleUsersLoading}
              getOptionLabel={(option: string | SimpleUser) =>
                typeof option === "string" ? option : `${option.nom} (${option.username})`
              }
              value={userFilter}
              onInputChange={(_, newInputValue, reason) => {
                if (reason === "input") {
                  setUserFilter(newInputValue);
                  setPage(1);
                } else if (reason === "clear") {
                  setUserFilter("");
                  setPage(1);
                }
              }}
              onChange={(_, newValue) => {
                if (typeof newValue === "string") {
                  setUserFilter(newValue);
                } else if (newValue) {
                  setUserFilter(newValue.username);
                } else {
                  setUserFilter("");
                }
                setPage(1);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Utilisateur"
                  placeholder="Filtrer par login (contient) ou choisir…"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {simpleUsersLoading ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <TextField
              size="small"
              type="date"
              label="Date min"
              value={dateMinFilter}
              onChange={(e) => {
                setDateMinFilter(e.target.value);
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="Date max"
              value={dateMaxFilter}
              onChange={(e) => {
                setDateMaxFilter(e.target.value);
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
            />
            <Select
              size="small"
              displayEmpty
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "" | "success" | "error");
                setPage(1);
              }}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">Tous les statuts</MenuItem>
              <MenuItem value="success">Succès</MenuItem>
              <MenuItem value="error">Erreur</MenuItem>
            </Select>
            <Select
              size="small"
              multiple
              displayEmpty
              input={<OutlinedInput />}
              value={statusesInFilter}
              onChange={(e) => {
                const v = e.target.value;
                setStatusesInFilter(typeof v === "string" ? v.split(",") : v);
                setPage(1);
              }}
              renderValue={(selected) => {
                const vals = selected as string[];
                if (!vals.length) return "Statuts (multi)";
                return vals.join(", ");
              }}
              sx={{ minWidth: 190 }}
            >
              {IMPORT_JOB_STATUS_MULTI.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  <Checkbox checked={statusesInFilter.includes(opt)} />
                  <ListItemText primary={opt} />
                </MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              displayEmpty
              value={dryRunFilter}
              onChange={(e) => {
                setDryRunFilter(e.target.value as "" | "true" | "false");
                setPage(1);
              }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Dry-run : tous</MenuItem>
              <MenuItem value="true">Simulation seulement</MenuItem>
              <MenuItem value="false">Import réel seulement</MenuItem>
            </Select>
            <Select
              size="small"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((n) => (
                <MenuItem key={n} value={n}>
                  {n} / page
                </MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              value={ordering}
              onChange={(e) => {
                setOrdering(e.target.value as "-created_at" | "created_at");
                setPage(1);
              }}
              sx={{ minWidth: 190 }}
            >
              <MenuItem value="-created_at">Tri : plus récents</MenuItem>
              <MenuItem value="created_at">Tri : plus anciens</MenuItem>
            </Select>
            <Button
              variant="text"
              disabled={
                !resourceFilter.trim() &&
                !resourcesInFilter.length &&
                !userFilter.trim() &&
                !dateMinFilter &&
                !dateMaxFilter &&
                !statusFilter &&
                !statusesInFilter.length &&
                !dryRunFilter
              }
              onClick={() => {
                setResourceFilter("");
                setResourcesInFilter([]);
                setUserFilter("");
                setDateMinFilter("");
                setDateMaxFilter("");
                setOrdering("-created_at");
                setStatusFilter("");
                setStatusesInFilter([]);
                setDryRunFilter("");
                setPage(1);
              }}
            >
              Réinitialiser filtres
            </Button>
            <Button
              variant="outlined"
              disabled={loading || rows.length === 0}
              onClick={() => void downloadImportJobsCsv(exportParams)}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              disabled={loading || rows.length === 0}
              onClick={() => void downloadImportJobsXlsx(exportParams)}
            >
              Export XLSX
            </Button>
            <Button
              variant="outlined"
              disabled={loading || rows.length === 0}
              onClick={() => void downloadImportJobsPdf(exportParams)}
            >
              Export PDF
            </Button>
          </Stack>
        }
        footer={
          count > 0 ? (
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {count} trace{count > 1 ? "s" : ""}
              </Typography>
              <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
            </Stack>
          ) : null
        }
      >
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        {loading && !data ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Ressource</TableCell>
                  <TableCell>Fichier</TableCell>
                  <TableCell>Utilisateur</TableCell>
                  <TableCell align="center">HTTP</TableCell>
                  <TableCell align="center">Statut</TableCell>
                  <TableCell align="right">Détail</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography color="text.secondary" align="center" py={2}>
                        Aucune trace pour ces critères.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{formatWhen(row.created_at)}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.url_resource || row.resource}</Typography>
                        {row.dry_run ? (
                          <Chip size="small" label="simulation" color="info" variant="outlined" sx={{ mt: 0.5 }} />
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap title={row.original_filename}>
                          {row.original_filename || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.username ?? "—"}</TableCell>
                      <TableCell align="center">{row.http_status ?? "—"}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={row.status === "success" ? "OK" : "Erreur"}
                          color={row.status === "success" ? "success" : "error"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => setDetail(row)}>
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </PageTemplate>

      <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
        <DialogTitle>Import #{detail?.id}</DialogTitle>
        <DialogContent dividers>
          {detail ? (
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Date</strong> : {formatWhen(detail.created_at)}
              </Typography>
              <Typography variant="body2">
                <strong>Ressource</strong> : {detail.resource} ({detail.url_resource})
              </Typography>
              <Typography variant="body2">
                <strong>Fichier</strong> : {detail.original_filename || "—"}
              </Typography>
              <Typography variant="body2">
                <strong>Utilisateur</strong> : {detail.username ?? "—"} (id {detail.user_id ?? "—"})
              </Typography>
              <Typography variant="body2">
                <strong>HTTP</strong> : {detail.http_status ?? "—"} · <strong>Statut</strong> : {detail.status}
              </Typography>
              <JsonBlock label="Résumé (summary)" value={detail.summary} />
              <JsonBlock label="Erreur (error_payload)" value={detail.error_payload} />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
