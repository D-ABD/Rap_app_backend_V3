/**
 * Consultation des traces **ImportJob** — ``GET /api/import-export/jobs/…``.
 */
import api from "./axios";

export type ImportExportJobRow = {
  id: number;
  created_at: string;
  user_id: number | null;
  username: string | null;
  resource: string;
  url_resource: string;
  dry_run: boolean;
  status: "success" | "error";
  original_filename: string;
  http_status: number | null;
  summary: Record<string, unknown> | null;
  error_payload: Record<string, unknown> | null;
};

export type ImportExportJobsPagePayload = {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
  results: ImportExportJobRow[];
};

function triggerDownload(blobData: BlobPart, filename: string): void {
  const blobUrl = window.URL.createObjectURL(new Blob([blobData]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function downloadImportJobsCsv(params?: Record<string, unknown>): Promise<void> {
  const response = await api.get("/import-export/jobs/export-csv/", {
    params,
    responseType: "blob",
  });
  triggerDownload(response.data, "import_jobs_export.csv");
}

export async function downloadImportJobsXlsx(params?: Record<string, unknown>): Promise<void> {
  const response = await api.get("/import-export/jobs/export-xlsx/", {
    params,
    responseType: "blob",
  });
  triggerDownload(response.data, "import_jobs_export.xlsx");
}

export async function downloadImportJobsPdf(params?: Record<string, unknown>): Promise<void> {
  const response = await api.get("/import-export/jobs/export-pdf/", {
    params,
    responseType: "blob",
  });
  triggerDownload(response.data, "import_jobs_export.pdf");
}
