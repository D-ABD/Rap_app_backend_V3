// src/hooks/useDocuments.ts

import { useCallback } from "react";
import api from "../api/axios";
import type { DocumentFormData, DocumentQueryParams, TypeDocumentChoice } from "../types/document";
import { toast } from "react-toastify";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export function useDocumentsApi() {
  const fetchDocuments = useCallback(async (params?: DocumentQueryParams) => {
    const res = await api.get<ApiResponse<Document[]>>("/documents/", {
      params,
    });
    return res.data.data;
  }, []);

  const fetchDocument = useCallback(async (id: number) => {
    const res = await api.get<ApiResponse<Document>>(`/documents/${id}/`);
    return res.data.data;
  }, []);

  const createDocument = useCallback(async (data: DocumentFormData) => {
    const formData = new FormData();
    formData.append("nom_fichier", data.nom_fichier);
    if (data.fichier) formData.append("fichier", data.fichier);
    formData.append("type_document", data.type_document);
    if (data.formation !== null) {
      formData.append("formation", String(data.formation));
    }

    const res = await api.post<ApiResponse<Document>>("/documents/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  }, []);

  const updateDocument = useCallback(async (id: number, data: Partial<DocumentFormData>) => {
    const formData = new FormData();
    if (data.nom_fichier) formData.append("nom_fichier", data.nom_fichier);
    if (data.fichier) formData.append("fichier", data.fichier);
    if (data.type_document) formData.append("type_document", data.type_document);
    if (data.formation !== null && data.formation !== undefined) {
      formData.append("formation", String(data.formation));
    }

    const res = await api.put<ApiResponse<Document>>(`/documents/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  }, []);

  const deleteDocument = useCallback(async (id: number) => {
    await api.delete(`/documents/${id}/`);
  }, []);

  const fetchTypeDocuments = useCallback(async () => {
    const res = await api.get<ApiResponse<TypeDocumentChoice[]>>("/documents/types/");
    return res.data.data;
  }, []);

  const downloadDocument = useCallback(async (id: number, nom_fichier?: string) => {
    try {
      const res = await api.get(`/documents/${id}/download/`, { responseType: "blob" });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", nom_fichier || `document_${id}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (_err) {
      toast.error("❌ Téléchargement impossible");
    }
  }, []);

  return {
    fetchDocuments,
    fetchDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    fetchTypeDocuments,
    downloadDocument,
  };
}
