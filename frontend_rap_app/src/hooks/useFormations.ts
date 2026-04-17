import { useState, useEffect, useMemo, useCallback } from "react";
import { AxiosError } from "axios";
import { toast } from "react-toastify";
import api from "../api/axios";

import type {
  Formation,
  FormationFormData,
  FormationFormErrors,
  FormationExportFormat,
  FormationMeta,
  FormationStatsParMois,
  PaginatedResponse,
  NomId,
} from "../types/formation";
import type { Commentaire } from "../types/commentaire";
import type { Evenement } from "../types/evenement";
import type { Prospection } from "../types/prospection";
import type { HistoriqueFormation } from "../types/historique";

const formationDetailCache = new Map<number, Formation>();
const formationDetailRequests = new Map<number, Promise<Formation>>();

// Type minimal d'écriture : uniquement les champs acceptés en POST
export type FormationWritePayload = {
  nom?: string;
  centre_id?: number | null;
  type_offre_id?: number | null;
  statut_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  num_kairos?: string | null;
  num_offre?: string | null;
  num_produit?: string | null;
  assistante?: string | null;
  prevus_crif?: number | null;
  prevus_mp?: number | null;
  inscrits_crif?: number | null;
  inscrits_mp?: number | null;
  cap?: number | null;
  convocation_envoie?: boolean;
  entree_formation?: number | null;
  nombre_candidats?: number | null;
  nombre_entretiens?: number | null;
  intitule_diplome?: string | null;
  diplome_vise_code?: string | null;
  type_qualification_visee?: string | null;
  specialite_formation?: string | null;
  code_diplome?: string | null;
  code_rncp?: string | null;
  total_heures?: number | null;
  heures_distanciel?: number | null;
};

function cleanFormationPayload(input: FormationFormData): FormationWritePayload {
  const payload = {
    ...input,
    centre_id: input.centre_id ? Number(input.centre_id) || null : null,
    type_offre_id: input.type_offre_id ? Number(input.type_offre_id) || null : null,
    statut_id: input.statut_id ? Number(input.statut_id) || null : null,
  } as Record<string, string | number | boolean | null | undefined>;

  // 🔧 Nettoyage : chaîne vide → null
  for (const key of Object.keys(payload)) {
    const val = payload[key];
    if (typeof val === "string" && val.trim() === "") {
      payload[key] = null;
    }
  }

  // 🧩 Cast final vers le type attendu
  return payload as FormationWritePayload;
}

export interface FormationOption {
  value: number;
  label: string;
}

export interface UseFormationChoicesResult {
  centres: NomId[];
  statuts: NomId[];
  typeOffres: NomId[];
  loading: boolean;
  refresh: () => void; // volontairement sync côté signature
}

export function useFormationCreationChoices() {
  const [centres, setCentres] = useState<NomId[]>([]);
  const [statuts, setStatuts] = useState<NomId[]>([]);
  const [typeOffres, setTypeOffres] = useState<NomId[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/formations/filtres/", {
        params: { ref_complet: true }, // ✅ centres = périmètre, statuts/type_offres = complets
      });
      const data = res.data?.data ?? {};
      setCentres(Array.isArray(data.centres) ? data.centres : []);
      setStatuts(Array.isArray(data.statuts) ? data.statuts : []);
      setTypeOffres(Array.isArray(data.type_offres) ? data.type_offres : []);
    } catch {
      toast.error("Erreur lors du chargement des référentiels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChoices();
  }, [fetchChoices]);

  const refresh = useCallback(() => fetchChoices(), [fetchChoices]);

  return useMemo(
    () => ({ centres, statuts, typeOffres, loading, refresh }),
    [centres, statuts, typeOffres, loading, refresh]
  );
}

export function useFormationChoices(): UseFormationChoicesResult {
  const [centres, setCentres] = useState<NomId[]>([]);
  const [statuts, setStatuts] = useState<NomId[]>([]);
  const [typeOffres, setTypeOffres] = useState<NomId[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Callback stable
  const fetchChoices = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Inclut ref_complet=true pour afficher tous les statuts / types d’offre
      const res = await api.get("/formations/filtres/", {
        params: { ref_complet: true },
      });

      const data = res.data?.data ?? {};

      setCentres(Array.isArray(data.centres) ? data.centres : []);
      setStatuts(Array.isArray(data.statuts) ? data.statuts : []);
      setTypeOffres(Array.isArray(data.type_offres) ? data.type_offres : []);
    } catch {
      toast.error("Erreur lors du chargement des choix de formulaire");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Appel unique au montage
  useEffect(() => {
    fetchChoices();
  }, [fetchChoices]);

  // ✅ Fonction refresh stable
  const refresh = useCallback(() => {
    fetchChoices();
  }, [fetchChoices]);

  // ✅ Retourne des valeurs stables pour éviter les re-renders inutiles
  return useMemo(
    () => ({
      centres,
      statuts,
      typeOffres,
      loading,
      refresh,
    }),
    [centres, statuts, typeOffres, loading, refresh]
  );
}
// ✅ Remplace l’interface par celle-ci (on garde search/starts pour rétro-compat)
interface UseFormationsOptions {
  // Nouveau / canonique côté API
  texte?: string;
  date_debut?: string;
  date_fin?: string;

  // Ancien / rétro-compat → mappé vers les champs ci-dessus
  search?: string;
  start_date?: string;
  end_date?: string;

  // Le reste inchangé
  page?: number;
  ordering?: string; // OrderingFilter DRF (ex: -date_debut, nom)
  tri?: string; // alias supporté côté API (optionnel)
  centre?: number;
  statut?: number;
  type_offre?: number;
  page_size?: number;
  avec_archivees?: boolean;
  activite?: string;
}

interface WrappedResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

// ✅ Liste paginée
// ✅ Dans useFormations, ajoute une petite couche de mapping avant l'appel axios
export function useFormations(filters: UseFormationsOptions = {}) {
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const [data, setData] = useState<PaginatedResponse<Formation> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AxiosError | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const parsed = JSON.parse(filtersKey) as UseFormationsOptions;

      // 🔁 Mapping rétro-compat
      const params: Record<string, unknown> = { ...parsed };

      // search -> texte (API attend "texte")
      if (!params.texte && typeof parsed.search === "string") {
        params.texte = parsed.search.trim() || undefined;
      } else if (typeof parsed.texte === "string") {
        params.texte = parsed.texte.trim() || undefined;
      }

      // start_date/end_date -> date_debut/date_fin
      if (!params.date_debut && parsed.start_date) params.date_debut = parsed.start_date;
      if (!params.date_fin && parsed.end_date) params.date_fin = parsed.end_date;

      // Nettoyage: "" -> undefined pour éviter du bruit dans la querystring
      for (const k of Object.keys(params)) {
        const v = params[k];
        if (typeof v === "string" && v.trim() === "") params[k] = undefined;
      }

      const response = await api.get<PaginatedResponse<Formation>>("/formations/", {
        params,
      });
      setData((response.data as { data?: PaginatedResponse<Formation> })?.data ?? response.data);
      setError(null);
    } catch (err) {
      setError(err as AxiosError);
    } finally {
      setLoading(false);
    }
  }, [filtersKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

// ✅ Lecture
export function useFormation(id: number) {
  const [data, setData] = useState<Formation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AxiosError | null>(null);

  useEffect(() => {
    const cached = formationDetailCache.get(id) ?? null;
    setData(cached);
    setLoading(!cached);

    const inFlight = formationDetailRequests.get(id);
    const request =
      inFlight ??
      api
        .get<WrappedResponse<Formation>>(`/formations/${id}/`)
        .then((res) => {
          formationDetailCache.set(id, res.data.data);
          return res.data.data;
        })
        .finally(() => {
          formationDetailRequests.delete(id);
        });

    if (!inFlight) {
      formationDetailRequests.set(id, request);
    }

    request
      .then((formation) => {
        setData(formation);
        setError(null);
      })
      .catch((err) => {
        setError(err);
        setData((current) => current ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}

export function prefetchFormationDetail(formation: Formation) {
  if (formation.id == null) return Promise.resolve(formation);

  if (!formationDetailCache.has(formation.id)) {
    formationDetailCache.set(formation.id, formation);
  }

  const inFlight = formationDetailRequests.get(formation.id);
  if (inFlight) return inFlight;

  const request = api
    .get<WrappedResponse<Formation>>(`/formations/${formation.id}/`)
    .then((res) => {
      formationDetailCache.set(formation.id, res.data.data);
      return res.data.data;
    })
    .finally(() => {
      formationDetailRequests.delete(formation.id);
    });

  formationDetailRequests.set(formation.id, request);
  return request;
}

// ✅ Création
export function useCreateFormation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  // useCallback → stabilise la référence
  const createFormation = useCallback(async (formData: FormationFormData) => {
    setLoading(true);
    try {
      const cleaned = cleanFormationPayload(formData);
      const response = await api.post<WrappedResponse<Formation>>("/formations/", cleaned);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err as AxiosError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Objet de retour stable
  return { createFormation, loading, error };
}

// ✅ Mise à jour
export function useUpdateFormation(id: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const updateFormation = useCallback(
    async (formData: FormationFormData) => {
      setLoading(true);
      try {
        const cleaned = cleanFormationPayload(formData);
        const response = await api.patch<WrappedResponse<Formation>>(`/formations/${id}/`, cleaned);
        setError(null);
        return response.data.data;
      } catch (err) {
        setError(err as AxiosError);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  return { updateFormation, loading, error };
}

// ✅ Suppression
export function useDeleteFormation(id: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const deleteFormation = async () => {
    setLoading(true);
    try {
      await api.delete(`/formations/${id}/`);
      setError(null);
    } catch (err) {
      setError(err as AxiosError);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteFormation, loading, error };
}

// ✅ Formulaire
export function useFormationForm(initialValues: FormationFormData) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormationFormErrors>({});

  const handleChange = <K extends keyof FormationFormData>(
    field: K,
    value: FormationFormData[K]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
  };

  return { values, setValues, errors, setErrors, handleChange, reset };
}

// ✅ Détails étendus (formation + entités liées)
// ✅ Détails étendus (formation + entités liées)
export function useFormationDetails(id: number) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AxiosError | null>(null);

  const [formation, setFormation] = useState<Formation | null>(null);
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [prospections, setProspections] = useState<Prospection[]>([]);
  const [historique, setHistorique] = useState<HistoriqueFormation[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [fRes, cRes, dRes, eRes, prRes, hRes] = await Promise.all([
          api.get<ApiSuccessResponse<Formation>>(`/formations/${id}/`),
          api.get<ApiSuccessResponse<Commentaire[]>>(`/formations/${id}/commentaires/`),
          api.get<ApiSuccessResponse<Document[]>>(`/formations/${id}/documents/`),
          api.get<ApiSuccessResponse<Evenement[]>>(`/formations/${id}/evenements/`),
          api.get<ApiSuccessResponse<Prospection[]>>(`/formations/${id}/prospections/`),
          api.get<ApiSuccessResponse<HistoriqueFormation[]>>(`/formations/${id}/historique/`),
        ]);

        setFormation(fRes.data.data);
        setCommentaires(cRes.data.data);
        setDocuments(dRes.data.data);
        setEvenements(eRes.data.data);
        setProspections(prRes.data.data);
        setHistorique(hRes.data.data);
        setError(null);
      } catch (err) {
        setError(err as AxiosError);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [id]);

  return {
    loading,
    error,
    formation,
    commentaires,
    documents,
    evenements,
    prospections,
    historique,
  };
}

// ✅ Duplication
export function useDupliquerFormation(id: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const dupliquer = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ data: Formation }>(`/formations/${id}/dupliquer/`);
      toast.success("Formation dupliquée");
      return res.data.data;
    } catch (err) {
      setError(err as AxiosError);
      toast.error("Erreur lors de la duplication");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { dupliquer, loading, error };
}

// ✅ Export CSV/PDF/Word
export function useExportFormation(id: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const exporter = async (format: FormationExportFormat) => {
    setLoading(true);
    try {
      const response = await api.get(`/formations/${id}/export_${format}/`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/octet-stream",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `formation_${id}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export terminé");
    } catch (err) {
      setError(err as AxiosError);
      toast.error("Erreur lors de l'export");
    } finally {
      setLoading(false);
    }
  };

  return { exporter, loading, error };
}

// ✅ Métadonnées
export function useFormationMeta() {
  const [meta, setMeta] = useState<FormationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AxiosError | null>(null);

  useEffect(() => {
    api
      .get<{ data: FormationMeta }>("/formations/meta/")
      .then((res) => setMeta(res.data.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  return { meta, loading, error };
}

// ✅ Statistiques
export function useFormationStatsParMois() {
  const [stats, setStats] = useState<FormationStatsParMois>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AxiosError | null>(null);

  useEffect(() => {
    api
      .get<{ data: FormationStatsParMois }>("/formations/stats_par_mois/")
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading, error };
}

export function useHistoriqueFormation(formationId?: number) {
  const [data, setData] = useState<HistoriqueFormation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AxiosError | null>(null);

  useEffect(() => {
    const url = formationId ? `/formations/${formationId}/historique/` : `/formations/historique/`;

    api
      .get<{ data: HistoriqueFormation[] }>(url)
      .then((res) => {
        setData(res.data?.data ?? res.data);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [formationId]);

  return { data, loading, error };
}

export function useProspectionsByFormation(formationId: number) {
  const [prospections, setProspections] = useState<Prospection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!formationId) return;

    setLoading(true);

    api
      .get(`/prospections/`, {
        params: { formation: formationId }, // ⬅️ clé de filtre côté API
      })
      .then((res) => {
        setProspections(res.data?.data?.results || []);
      })
      .catch(() => {
        // ✅ suppression du paramètre err inutilisé
        setProspections([]);
      })
      .finally(() => setLoading(false));
  }, [formationId]);

  return { prospections, loading };
}

// =============================================
// hooks/useFormations.ts
// (Options simples pour <select>)
// =============================================

export function useFormationsOptions() {
  const [options, setOptions] = useState<FormationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // Adapte l'endpoint à ton backend (ex: /formations/liste-simple/)
        const res = await api.get("/formations/liste-simple/");
        const data = res.data?.data || res.data || [];
        const opts: FormationOption[] = Array.isArray(data)
          ? data.map((f: { id: number; nom: string; num_offre?: string | null }) => ({
              value: f.id,
              label: f.num_offre ? `${f.num_offre} — ${f.nom}` : f.nom,
            }))
          : [];

        if (!alive) return;
        setOptions(opts);
      } catch (e) {
        if (!alive) return;
        setError(e as Error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { options, loading, error };
}
// ✅ Archiver une formation
export function useArchiverFormation(id: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const archiver = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ status: string; detail?: string }>(
        `/formations/${id}/archiver/`
      );
      toast.success("Formation archivée");
      return res.data;
    } catch (err) {
      setError(err as AxiosError);
      toast.error("Erreur lors de l'archivage");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { archiver, loading, error };
}

// ✅ Désarchiver une formation
export function useDesarchiverFormation(id: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const desarchiver = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ status: string; detail?: string }>(
        `/formations/${id}/desarchiver/`
      );
      toast.success("Formation restaurée");
      return res.data;
    } catch (err) {
      setError(err as AxiosError);
      toast.error("Erreur lors de la restauration");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { desarchiver, loading, error };
}

// ✅ Suppression définitive d'une formation archivée
export function useHardDeleteFormation(id: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const hardDelete = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>(`/formations/${id}/hard-delete/`);
      toast.success(res.data?.message || "Formation supprimée définitivement");
      return res.data;
    } catch (err) {
      setError(err as AxiosError);
      toast.error("Erreur lors de la suppression définitive");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { hardDelete, loading, error };
}
