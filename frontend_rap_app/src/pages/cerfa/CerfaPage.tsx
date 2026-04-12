import { useMemo, useState, useEffect } from "react";
import {
  Stack,
  Button,
  Typography,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { toast } from "react-toastify";
import { useSearchParams } from "react-router-dom";
import { CerfaContrat, CerfaContratCreate } from "../../types/cerfa";
import {
  useCerfaCreate,
  useCerfaDelete,
  useCerfaDownloadPdf,
  useCerfaList,
  useCerfaUpdate, // ✅ anticipé pour mise à jour
} from "../../hooks/useCerfa";
import PageTemplate from "../../components/PageTemplate";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import TableSkeleton from "../../components/ui/TableSkeleton";
import SearchInput from "../../components/SearchInput";
import CerfaTable from "./CerfaTable";
import { CerfaForm } from "./CerfaForm";
import CerfaDetailModal from "./CerfaDetailModal";
import { useAuth } from "../../hooks/useAuth";
import { useCentres } from "../../hooks/useCentres";
import FiltresCerfaPanel, { CerfaFiltresValues } from "../../components/filters/FiltresCerfaPanel";

export default function CerfaPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<CerfaFiltresValues>({
    search: "",
    centre: "",
    cerfa_type: "",
    type_contrat_code: "",
    auto_generated: "",
    date_field: "created_at",
    date_from: "",
    date_to: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showTypeChoice, setShowTypeChoice] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formFieldErrors, setFormFieldErrors] = useState<
    Partial<Record<keyof CerfaContratCreate, string>>
  >({});
  const [newCerfaType, setNewCerfaType] = useState<"apprentissage" | "professionnalisation">(
    "apprentissage"
  );
  const [selectedContrat, setSelectedContrat] = useState<CerfaContrat | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const parseId = (value: string | null): number | null => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const normalizeCandidateCerfaType = (value: string | null) => {
    if (value === "professionnalisation") return "professionnalisation" as const;
    if (value === "apprentissage") return "apprentissage" as const;
    return null;
  };

  const candidateContext = useMemo(() => {
    const candidat = parseId(searchParams.get("candidat"));
    const formation = parseId(searchParams.get("formation"));
    const employeur = parseId(searchParams.get("employeur"));
    const cerfaType =
      normalizeCandidateCerfaType(searchParams.get("cerfa_type")) ??
      normalizeCandidateCerfaType(searchParams.get("candidate_type_contrat"));
    const formationNom = searchParams.get("formation_nom");
    const employeurNom = searchParams.get("employeur_nom");

    if (!candidat && !formation && !employeur) return null;

    return {
      cerfaType,
      form: {
        cerfa_type: cerfaType ?? "apprentissage",
        candidat: candidat ?? undefined,
        formation: formation ?? undefined,
        employeur: employeur ?? undefined,
        employeur_nom: employeurNom ?? undefined,
      } as Partial<CerfaContratCreate>,
      selections: {
        candidat: candidat ? { id: candidat, nom_complet: searchParams.get("candidat_nom") } : null,
        formation: formation ? { id: formation, nom: formationNom } : null,
        partenaire: employeur ? { id: employeur, nom: employeurNom } : null,
      },
    };
  }, [searchParams]);

  const queryParams = useMemo(
    () => ({
      search: filters.search,
      centre:
        filters.centre != null && filters.centre !== ""
          ? Number(filters.centre)
          : undefined,
      cerfa_type: (filters.cerfa_type || undefined) as
        | "apprentissage"
        | "professionnalisation"
        | undefined,
      type_contrat_code: filters.type_contrat_code || undefined,
      auto_generated:
        filters.auto_generated === "true"
          ? true
          : filters.auto_generated === "false"
            ? false
            : undefined,
      date_field: (filters.date_field || undefined) as
        | "created_at"
        | "date_conclusion"
        | "date_debut_execution"
        | "formation_debut"
        | undefined,
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
      page,
      page_size: pageSize,
      reloadKey,
    }),
    [filters, page, pageSize, reloadKey]
  );
  const editingId = selectedId ?? selectedContrat?.id ?? null;

  const { data, isLoading, isError, refetch } = useCerfaList(queryParams);
  const { data: centresData } = useCentres({ page: 1, page_size: 200, ordering: "nom" });
  const { mutateAsync: createCerfa, isPending: isCreating } = useCerfaCreate();
  const { mutateAsync: updateCerfa, isPending: isUpdating } = useCerfaUpdate(editingId ?? -1);
  const { mutateAsync: remove } = useCerfaDelete();
  const { mutateAsync: downloadPdf } = useCerfaDownloadPdf();
  const role = (user?.role ?? "").toLowerCase();
  const canWriteCerfa = ["staff", "admin", "superadmin", "commercial", "charge_recrutement"].includes(role);

  const contrats: CerfaContrat[] = useMemo(() => data?.results ?? [], [data]);
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(contrats.map((contrat) => contrat.id));
  const activeFiltersCount = useMemo(
    () =>
      Object.entries(filters).filter(([key, value]) => {
        if (key === "search") return false;
        if (value == null) return false;
        if (typeof value === "string") return value.trim() !== "";
        return true;
      }).length,
    [filters]
  );

  const formatBackendMessages = (messages: unknown): string => {
    if (Array.isArray(messages)) {
      return messages.map((msg) => String(msg)).join(", ");
    }
    if (messages && typeof messages === "object") {
      return Object.entries(messages as Record<string, unknown>)
        .map(([key, value]) => `${key}: ${formatBackendMessages(value)}`)
        .join(", ");
    }
    return String(messages ?? "");
  };

  const extractCerfaFieldErrors = (errorData: unknown) => {
    const next: Partial<Record<keyof CerfaContratCreate, string>> = {};
    if (!errorData || typeof errorData !== "object" || Array.isArray(errorData)) {
      return next;
    }
    Object.entries(errorData as Record<string, unknown>).forEach(([field, messages]) => {
      next[field as keyof CerfaContratCreate] = formatBackendMessages(messages);
    });
    return next;
  };

  const buildCerfaFileName = (contrat?: CerfaContrat | null) => {
    const prefix =
      contrat?.cerfa_type === "professionnalisation" ? "cerfa_pro" : "cerfa_apprent";
    const slugify = (value?: string | null) =>
      (value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "") || "inconnu";

    return `${prefix}_${slugify(contrat?.apprenti_nom_naissance)}_${slugify(
      contrat?.apprenti_prenom
    )}.pdf`;
  };

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (selectedContrat?.id && selectedId !== selectedContrat.id) {
      setSelectedId(selectedContrat.id);
    }
  }, [selectedContrat, selectedId]);

  useEffect(() => {
    if (!canWriteCerfa) return;
    if (candidateContext) {
      setSelectedContrat(null);
      setSelectedId(null);
      if (candidateContext.cerfaType) {
        setShowForm(true);
      } else {
        setShowTypeChoice(true);
      }
    }
  }, [candidateContext, canWriteCerfa]);

  const openCerfaByType = (type: "apprentissage" | "professionnalisation") => {
    if (candidateContext) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("cerfa_type", type);
        return next;
      });
      setShowTypeChoice(false);
      return;
    }

    setShowTypeChoice(false);
    setSelectedContrat(null);
    setSelectedId(null);
    setNewCerfaType(type);
    if (type === "professionnalisation") {
      toast.info("CERFA professionnalisation selectionne. Le choix est memorise pour ce flux.");
    }
    setShowForm(true);
  };

  const handleRowClick = (id: number) => {
    const contrat = contrats.find((c) => c.id === id);
    if (contrat) {
      setSelectedContrat(contrat);
      setShowDetail(true);
    }
  };

  const handleDelete = async () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (!idsToDelete.length) return;

    setArchiveLoading(true);
    try {
      await Promise.all(idsToDelete.map((id) => remove(id)));
      toast.success(`📦 ${idsToDelete.length} contrat(s) archive(s)`);
      setShowConfirm(false);
      setSelectedIds([]);
      setSelectedId(null);
      setReloadKey((k) => k + 1);
    } catch (_err) {
      toast.error("Erreur lors de l'archivage.");
    } finally {
      setArchiveLoading(false);
    }
  };

  // ✅ Création CERFA avec affichage des champs manquants
  const handleCreateCerfa = async (data: CerfaContratCreate) => {
    try {
      setFormError(null);
      setFormFieldErrors({});
      await createCerfa(data);
      toast.success("✅ Contrat CERFA créé avec succès !");
      setShowForm(false);
      setSelectedContrat(null);
      setSelectedId(null);
      setReloadKey((k) => k + 1);
    } catch (_err: any) {
      const errorData = _err?.response?.data;
      let message = "❌ Erreur lors de la création du CERFA";

      if (typeof errorData === "string") {
        message = errorData;
      } else if (Array.isArray(errorData?.missing_fields)) {
        message = `⚠️ Champs manquants : ${errorData.missing_fields.join(", ")}`;
      } else if (errorData?.missing_fields) {
        message = `⚠️ Champs manquants : ${errorData.missing_fields}`;
      } else if (errorData?.error) {
        message = errorData.error;
      } else if (errorData?.detail) {
        message = errorData.detail;
      } else if (errorData && typeof errorData === "object") {
        const errors = Object.entries(errorData)
          .map(([field, messages]) => `${field}: ${formatBackendMessages(messages)}`)
          .join(" | ");
        message = `⚠️ Erreur de validation : ${errors}`;
      }

      setFormError(message);
      setFormFieldErrors(extractCerfaFieldErrors(errorData));
      toast.error(message);

      if (import.meta.env.MODE !== "production" && errorData) {
        toast.info("📨 Détails complets de l’erreur backend affichés en console (mode dev)");
        // eslint-disable-next-line no-console
        console.group("📨 Détails complets de l’erreur backend");
        // eslint-disable-next-line no-console
        console.log(errorData);
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
    }
  };

  return (
    <PageTemplate
      headerExtra={
        <SearchInput
          placeholder="Rechercher par apprenti, employeur..."
          value={filters.search}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, search: e.target.value }));
            setPage(1);
          }}
        />
      }
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          <Button
            variant="outlined"
            onClick={() => setShowFilters((v) => !v)}
            startIcon={<span>{showFilters ? "🫣" : "🔎"}</span>}
          >
            {showFilters ? "Masquer filtres" : "Afficher filtres"}
            {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!canWriteCerfa}
            onClick={() => {
              if (!canWriteCerfa) return;
              setSelectedContrat(null);
              setSelectedId(null);
              setShowTypeChoice(true);
            }}
          >
            Nouveau CERFA
          </Button>
          {canWriteCerfa && selectedIds.length > 0 && (
            <>
              <Button color="error" variant="contained" onClick={() => setShowConfirm(true)}>
                Archiver ({selectedIds.length})
              </Button>
              <Button variant="outlined" onClick={selectAll}>
                Tout sélectionner
              </Button>
              <Button variant="outlined" onClick={clearSelection}>
                Annuler
              </Button>
            </>
          )}
        </Stack>
      }
      filters={
        showFilters ? (
          <FiltresCerfaPanel
            centres={centresData?.results ?? []}
            values={filters}
            onChange={(newValues) => {
              setFilters(newValues);
              setPage(1);
            }}
            onRefresh={() => setReloadKey((k) => k + 1)}
          />
        ) : undefined
      }
      showFilters={showFilters}
      footer={
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
      }
    >
      {isLoading ? (
        <TableSkeleton columns={8} rows={8} showToolbar={false} />
      ) : isError ? (
        <ErrorState
          message="Les contrats CERFA n'ont pas pu être chargés."
          onRetry={() => void refetch()}
        />
      ) : contrats.length === 0 ? (
        <EmptyState
          title="Aucun contrat trouvé"
          description="Ajustez les filtres ou créez un nouveau CERFA."
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!canWriteCerfa}
              onClick={() => {
                if (!canWriteCerfa) return;
                setSelectedContrat(null);
                setSelectedId(null);
                setShowTypeChoice(true);
              }}
            >
              Nouveau CERFA
            </Button>
          }
        />
      ) : (
        <CerfaTable
          contrats={contrats}
          selectedIds={selectedIds}
          onToggleSelect={(id) =>
            setSelectedIds((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
            )
          }
          onRowClick={handleRowClick}
          onDeleteClick={(id) => {
            if (!canWriteCerfa) return;
            setSelectedId(id);
            setShowConfirm(true);
          }}
          onDownloadPdf={async (id) => {
            try {
              const blob = await downloadPdf(id);
              const contrat = contrats.find((c) => c.id === id);
              const fileName = buildCerfaFileName(contrat);
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch {
              toast.error("Erreur lors du téléchargement du PDF");
            }
          }}
          onEditClick={(id) => {
            if (!canWriteCerfa) return;
            const contrat = contrats.find((c) => c.id === id);
            if (contrat) {
              setSelectedContrat(contrat);
              setSelectedId(id);
              setShowForm(true);
            }
          }}
          canWrite={canWriteCerfa}
        />
      )}

      {/* ✅ Formulaire CERFA */}
      <CerfaForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedContrat(null);
          setSelectedId(null);
          setFormError(null);
          setFormFieldErrors({});
          if (candidateContext) {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              [
                "candidat",
                "candidat_nom",
                "cerfa_type",
                "formation",
                "formation_nom",
                "employeur",
                "employeur_nom",
              ].forEach((key) => next.delete(key));
              return next;
            });
          }
        }}
        initialData={selectedContrat}
        initialContext={selectedContrat ? null : candidateContext?.form ?? { cerfa_type: newCerfaType }}
        initialSelections={selectedContrat ? null : candidateContext?.selections ?? null}
        onSubmit={
          selectedContrat
            ? async (data) => {
                if (!editingId) {
                  toast.error("Impossible de retrouver l'identifiant du CERFA a modifier.");
                  return;
                }
                try {
                  setFormError(null);
                  setFormFieldErrors({});
                  await updateCerfa(data);
                  toast.success("✅ Contrat mis à jour !");
                  setShowForm(false);
                  setSelectedContrat(null);
                  setReloadKey((k) => k + 1);
                } catch (_err: any) {
                  const errorData = _err?.response?.data;
                  let message = "Erreur lors de la mise a jour du contrat.";

                  if (typeof errorData === "string") {
                    message = errorData;
                  } else if (Array.isArray(errorData?.missing_fields)) {
                    message = `Champs manquants : ${errorData.missing_fields.join(", ")}`;
                  } else if (errorData?.missing_fields) {
                    message = `Champs manquants : ${errorData.missing_fields}`;
                  } else if (errorData?.error) {
                    message = errorData.error;
                  } else if (errorData?.detail) {
                    message = errorData.detail;
                  } else if (errorData && typeof errorData === "object") {
                    const errors = Object.entries(errorData)
                      .map(([field, messages]) => `${field}: ${formatBackendMessages(messages)}`)
                      .join(" | ");
                    message = `Erreur de validation : ${errors}`;
                  }

                  setFormError(message);
                  setFormFieldErrors(extractCerfaFieldErrors(errorData));
                  toast.error(message);
                }
              }
            : handleCreateCerfa
        }
        readOnly={isCreating || isUpdating}
        fieldErrors={formFieldErrors}
        globalError={formError}
      />

      <Dialog open={showTypeChoice} onClose={() => setShowTypeChoice(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Type de CERFA</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Choisissez le type de CERFA a creer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowTypeChoice(false)} variant="outlined">
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={() => openCerfaByType("apprentissage")}
            disabled={!canWriteCerfa}
          >
            Apprentissage
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => openCerfaByType("professionnalisation")}
            disabled={!canWriteCerfa}
          >
            Professionnalisation
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Détail CERFA */}
      <CerfaDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        contrat={selectedContrat}
        onEdit={(id) => {
          if (!canWriteCerfa) return;
          const contrat = contrats.find((c) => c.id === id) ?? selectedContrat;
          if (contrat) {
            setSelectedContrat(contrat);
            setSelectedId(id);
            setShowDetail(false);
            setShowForm(true);
          }
        }}
        canWrite={canWriteCerfa}
      />

      <ConfirmDialog
        open={showConfirm}
        onClose={() => !archiveLoading && setShowConfirm(false)}
        onConfirm={handleDelete}
        loading={archiveLoading}
        tone="warning"
        title="Confirmation"
        description={
          selectedId
            ? "Archiver ce contrat CERFA ?"
            : `Archiver ${selectedIds.length} contrat(s) sélectionné(s) ?`
        }
        confirmLabel="Archiver"
        cancelLabel="Annuler"
      />
    </PageTemplate>
  );
}
