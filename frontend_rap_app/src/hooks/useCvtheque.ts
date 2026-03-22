// =======================================================
// 🔥 HOOKS — CVTHEQUE (VERSION CLEAN & OFFICIELLE)
// =======================================================

import { useState, useEffect, useCallback } from "react";
import api from "src/api/axios";

import {
  CVThequeItem,
  CVThequeDetail,
  PaginatedResponse,
  CVThequePayload,
  CVChoicesResponse,
} from "src/types/cvtheque";

const BASE_URL = "/cvtheque/";


// =======================================================
// 📌 LIST — chargement paginé (v3 officielle)
// =======================================================
export const useCVThequeList = (params?: any) => {
  const [data, setData] = useState<PaginatedResponse<CVThequeItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get(BASE_URL, { params });

      // Peut être { data: ... } ou directement la payload
      const payload = res.data?.data || res.data;

      // Peut être : 
      // - pagination DRF → payload.results = { results: [...], filters: {...} }
      // - ou liste brute → payload = [...]
      const wrapper = payload.results || payload;

      const results = Array.isArray(wrapper.results)
        ? wrapper.results                     // cas pagination : { results: [...] }
        : Array.isArray(wrapper)
        ? wrapper                              // cas liste brute : [...]
        : [];

      const filters =
        wrapper.filters ??                     // cas pagination : { results, filters }
        payload.filters ??                     // fallback si un jour tu changes le backend
        null;

      setData({
        count: payload.count ?? results.length,
        next: payload.next ?? null,
        previous: payload.previous ?? null,
        results,
        filters,
      });
    } catch (err) {
      setError(err);
    }

    setLoading(false);
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
};


// =======================================================
// 📌 DETAIL — un document (v2 clean)
// =======================================================
export const useCVDetail = (id: number) => {
  const [data, setData] = useState<CVThequeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get(`${BASE_URL}${id}/`);
      setData(res.data); // backend renvoie un objet directement
    } catch (err) {
      setError(err);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
};


// =======================================================
// 📌 CREATE
// =======================================================
export const useCreateCV = () => {
  const [loading, setLoading] = useState(false);

  const create = async (payload: CVThequePayload) => {
    setLoading(true);

    try {
      const form = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          form.append(key, value as any);
        }
      });

      const res = await api.post(BASE_URL, form);
      return { success: true, data: res.data };
    } catch (err: any) {
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return { create, loading };
};


// =======================================================
// 📌 UPDATE
// =======================================================
export const useUpdateCV = () => {
  const [loading, setLoading] = useState(false);

  const update = async (id: number, payload: CVThequePayload) => {
    setLoading(true);

    try {
      const form = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          form.append(key, value as any);
        }
      });

      const res = await api.patch(`${BASE_URL}${id}/`, form);
      return { success: true, data: res.data };
    } catch (err: any) {
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return { update, loading };
};


// =======================================================
// 📌 DELETE
// =======================================================
export const useDeleteCV = () => {
  const [loading, setLoading] = useState(false);

  const remove = async (id: number) => {
    setLoading(true);

    try {
      const res = await api.delete(`${BASE_URL}${id}/`);
      return { success: true, data: res.data };
    } catch (err: any) {
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return { remove, loading };
};


// =======================================================
// 📌 MES DOCUMENTS (pour candidats)
// =======================================================
export const useMesDocuments = () => {
  const [data, setData] = useState<CVThequeItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get(`${BASE_URL}mes-documents/`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, reload: load };
};


// =======================================================
// 📌 CHOICES
// =======================================================
export const useCVChoices = () => {
  const [data, setData] = useState<CVChoicesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const load = async () => {
    setLoading(true);

    try {
      const res = await api.get("/candidats/", { params: { page_size: 500 } });
      const payload = res.data;

      setData({
        candidates: payload.results.map((c: any) => ({
          value: c.id,
          label: `${c.prenom} ${c.nom}`,
        })),
        document_types: [
          { value: "CV", label: "CV" },
          { value: "LM", label: "Lettre de motivation" },
          { value: "DIPLOME", label: "Diplôme" },
          { value: "AUTRE", label: "Autre document" },
        ],
      });
    } catch (err) {
      setError(err);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return { data, loading, error, reload: load };
};


// =======================================================
// 📌 TELECHARGEMENT (API sécurisée)
// =======================================================
export const useCVThequeDownload = () => {
  const download = async (id: number, filename: string) => {
    const res = await api.get(`/cvtheque/${id}/download/`, {
      responseType: "blob",
    });

    const blobUrl = window.URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(blobUrl);
  };

  return { download };
};
