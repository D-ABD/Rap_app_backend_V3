import { useMemo, useState, useEffect } from "react";
import {
  Box,
  Stack,
  Button,
  CircularProgress,
  Typography,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useTheme,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
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
import SearchInput from "../../components/SearchInput";
import CerfaTable from "./CerfaTable";
import { CerfaForm } from "./CerfaForm";
import CerfaDetailModal from "./CerfaDetailModal";

export default function CerfaPage() {
  const _theme = useTheme(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({ search: "" });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedContrat, setSelectedContrat] = useState<CerfaContrat | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const parseId = (value: string | null): number | null => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const candidateContext = useMemo(() => {
    const candidat = parseId(searchParams.get("candidat"));
    const formation = parseId(searchParams.get("formation"));
    const employeur = parseId(searchParams.get("employeur"));
    const formationNom = searchParams.get("formation_nom");
    const employeurNom = searchParams.get("employeur_nom");

    if (!candidat && !formation && !employeur) return null;

    return {
      form: {
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
    () => ({ search: filters.search, page, page_size: pageSize, reloadKey }),
    [filters, page, pageSize, reloadKey]
  );
  const editingId = selectedId ?? selectedContrat?.id ?? null;

  const { data, isLoading, isError } = useCerfaList(queryParams);
  const { mutateAsync: createCerfa, isPending: isCreating } = useCerfaCreate();
  const { mutateAsync: updateCerfa, isPending: isUpdating } = useCerfaUpdate(editingId ?? -1);
  const { mutateAsync: remove } = useCerfaDelete();
  const { mutateAsync: downloadPdf } = useCerfaDownloadPdf();

  const contrats: CerfaContrat[] = useMemo(() => data?.results ?? [], [data]);
  const count = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

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

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (selectedContrat?.id && selectedId !== selectedContrat.id) {
      setSelectedId(selectedContrat.id);
    }
  }, [selectedContrat, selectedId]);

  useEffect(() => {
    if (candidateContext) {
      setSelectedContrat(null);
      setSelectedId(null);
      setShowForm(true);
    }
  }, [candidateContext]);

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

    try {
      await Promise.all(idsToDelete.map((id) => remove(id)));
      toast.success(`🗑️ ${idsToDelete.length} contrat(s) supprimé(s)`);
      setShowConfirm(false);
      setSelectedIds([]);
      setSelectedId(null);
      setReloadKey((k) => k + 1);
    } catch (_err) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  // ✅ Création CERFA avec affichage des champs manquants
  const handleCreateCerfa = async (data: CerfaContratCreate) => {
    try {
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
      title="📑 Contrats CERFA"
      actions={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <SearchInput
            placeholder="Rechercher par apprenti, employeur..."
            value={filters.search}
            onChange={(e) => {
              setFilters({ ...filters, search: e.target.value });
              setPage(1);
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedContrat(null);
              setSelectedId(null);
              setShowForm(true);
            }}
          >
            Nouveau CERFA
          </Button>
          {selectedIds.length > 0 && (
            <Button color="error" onClick={() => setShowConfirm(true)}>
              Supprimer ({selectedIds.length})
            </Button>
          )}
        </Stack>
      }
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
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Typography color="error">Erreur de chargement.</Typography>
      ) : contrats.length === 0 ? (
        <Typography>Aucun contrat trouvé.</Typography>
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
            setSelectedId(id);
            setShowConfirm(true);
          }}
          onDownloadPdf={async (id) => {
            try {
              const blob = await downloadPdf(id);
              const fileName = `cerfa_${id}.pdf`;
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
            const contrat = contrats.find((c) => c.id === id);
            if (contrat) {
              setSelectedContrat(contrat);
              setSelectedId(id);
              setShowForm(true);
            }
          }}
        />
      )}

      {/* ✅ Formulaire CERFA */}
      <CerfaForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedContrat(null);
          setSelectedId(null);
          if (candidateContext) {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              [
                "candidat",
                "candidat_nom",
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
        initialContext={selectedContrat ? null : candidateContext?.form ?? null}
        initialSelections={selectedContrat ? null : candidateContext?.selections ?? null}
        onSubmit={
          selectedContrat
            ? async (data) => {
                if (!editingId) {
                  toast.error("Impossible de retrouver l'identifiant du CERFA a modifier.");
                  return;
                }
                try {
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

                  toast.error(message);
                }
              }
            : handleCreateCerfa
        }
        readOnly={isCreating || isUpdating}
      />

      {/* ✅ Détail CERFA */}
      <CerfaDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        contrat={selectedContrat}
        onEdit={(id) => {
          const contrat = contrats.find((c) => c.id === id) ?? selectedContrat;
          if (contrat) {
            setSelectedContrat(contrat);
            setSelectedId(id);
            setShowDetail(false);
            setShowForm(true);
          }
        }}
      />

      {/* ✅ Confirmation suppression */}
      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)}>
        <DialogTitle>
          <WarningAmberIcon color="warning" sx={{ mr: 1 }} />
          Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedId
              ? "Supprimer ce contrat CERFA ?"
              : `Supprimer ${selectedIds.length} contrat(s) sélectionné(s) ?`}
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
