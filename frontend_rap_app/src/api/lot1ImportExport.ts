/**
 * URLs canoniques import/export Excel — §2.15 (préfixe axios = /api).
 * Lots 1–4 (référentiels, partenaires, formations, documents, candidats, CVThèque) : ``/import-export/<resource>/…``.
 * Helpers export liste : ``buildFormationExportQueryParams``, … (hors pagination).
 * Traces **ImportJob** (liste paginée) : ``GET /import-export/jobs/`` — voir ``importExportJobs.ts`` et page **Historique imports Excel**.
 */
import api from "./axios";

export type Lot1ImportResourceSlug =
  | "centre"
  | "type_offre"
  | "statut"
  | "partenaire"
  | "formation"
  | "document"
  | "candidat"
  | "cvtheque";

export function lot1ImportTemplatePath(resource: Lot1ImportResourceSlug): string {
  return `/import-export/${resource}/import-template/`;
}

export function lot1ExportPath(resource: Lot1ImportResourceSlug): string {
  return `/import-export/${resource}/export-xlsx/`;
}

export function lot1ImportPath(resource: Lot1ImportResourceSlug, dryRun?: boolean): string {
  const base = `/import-export/${resource}/import-xlsx/`;
  if (dryRun) return `${base}?dry_run=true`;
  return base;
}

/** Route SPA — liste paginée des traces **ImportJob** (même périmètre API **IsStaffOrAbove**). */
export const importExportJobsAppPath = "/import-export/jobs";

/** Filtres liste → query export (sans pagination) — aligné sur le queryset REST. */
export function buildLot1ExportQueryParams(filters: {
  search?: string;
  includeArchived?: boolean;
  archivesOnly?: boolean;
}): Record<string, string | boolean> {
  const p: Record<string, string | boolean> = {};
  const s = filters.search?.trim();
  if (s) p.search = s;
  if (filters.includeArchived) p.avec_archivees = true;
  if (filters.archivesOnly) p.archives_seules = true;
  return p;
}

/** Export partenaires : mêmes filtres que la liste (hors pagination / reloadKey). */
export function buildPartenaireExportQueryParams(filters: {
  search?: string;
  city?: string;
  secteur_activite?: string;
  type?: string;
  created_by?: number;
  has_appairages?: string;
  has_prospections?: string;
  avec_archivees?: boolean;
  archives_seules?: boolean;
}): Record<string, string | number | boolean> {
  const p: Record<string, string | number | boolean> = {};
  if (filters.search?.trim()) p.search = filters.search.trim();
  if (filters.city?.trim()) p.city = filters.city.trim();
  if (filters.secteur_activite?.trim()) p.secteur_activite = filters.secteur_activite.trim();
  if (filters.type?.trim()) p.type = filters.type.trim();
  if (filters.created_by != null) p.created_by = filters.created_by;
  if (filters.has_appairages) p.has_appairages = filters.has_appairages;
  if (filters.has_prospections) p.has_prospections = filters.has_prospections;
  if (filters.avec_archivees) p.avec_archivees = true;
  if (filters.archives_seules) p.archives_seules = true;
  return p;
}

/** Export formations : aligné sur ``GET /formations/`` (filtres query, hors pagination). */
export function buildFormationExportQueryParams(filters: {
  texte?: string;
  centre?: number;
  statut?: number;
  type_offre?: number;
  date_debut?: string;
  date_fin?: string;
  places_disponibles?: boolean;
  tri?: string;
  dans?: string;
  avec_archivees?: boolean;
  activite?: string;
  annee?: number;
}): Record<string, string | number | boolean> {
  const p: Record<string, string | number | boolean> = {};
  const t = filters.texte?.trim();
  if (t) p.texte = t;
  if (filters.centre != null) p.centre = filters.centre;
  if (filters.statut != null) p.statut = filters.statut;
  if (filters.type_offre != null) p.type_offre = filters.type_offre;
  if (filters.date_debut?.trim()) p.date_debut = filters.date_debut.trim();
  if (filters.date_fin?.trim()) p.date_fin = filters.date_fin.trim();
  if (filters.places_disponibles) p.places_disponibles = "true";
  if (filters.tri?.trim()) p.tri = filters.tri.trim();
  if (filters.dans?.trim()) p.dans = filters.dans.trim();
  if (filters.avec_archivees) p.avec_archivees = true;
  if (filters.activite?.trim()) p.activite = filters.activite.trim();
  if (filters.annee != null) p.annee = filters.annee;
  return p;
}

/** Export candidats : query alignée sur ``GET /candidats/`` (hors pagination). */
export function buildCandidatExportQueryParams(filters: {
  search?: string;
  ordering?: string;
  centre?: number;
  formation?: number;
  owner?: number;
  parcours_phase?: string;
  statut?: string;
  cv_statut?: string;
  type_contrat?: string;
  disponibilite?: string;
  resultat_placement?: string;
  contrat_signe?: string;
  responsable_placement?: number;
  ville?: string;
  code_postal?: string;
  rqth?: boolean | "true" | "false";
  permis_b?: boolean | "true" | "false";
  admissible?: boolean | "true" | "false";
  inscrit_gespers?: boolean | "true" | "false";
  en_accompagnement_tre?: boolean | "true" | "false";
  en_appairage?: boolean | "true" | "false";
  has_osia?: boolean | "true" | "false";
  entretien_done?: boolean | "true" | "false";
  test_is_ok?: boolean | "true" | "false";
  date_min?: string;
  date_max?: string;
  avec_archivees?: boolean | "true";
  archives_seules?: boolean | "true";
}): Record<string, string | number | boolean> {
  const p: Record<string, string | number | boolean> = {};
  const tri = filters.ordering?.trim();
  if (tri) p.ordering = tri;
  const s = filters.search?.trim();
  if (s) p.search = s;
  if (filters.centre != null) p.centre = filters.centre;
  if (filters.formation != null) p.formation = filters.formation;
  if (filters.owner != null) p.owner = filters.owner;
  if (filters.parcours_phase?.trim()) p.parcours_phase = filters.parcours_phase.trim();
  if (filters.statut?.trim()) p.statut = filters.statut.trim();
  if (filters.cv_statut?.trim()) p.cv_statut = filters.cv_statut.trim();
  if (filters.type_contrat?.trim()) p.type_contrat = filters.type_contrat.trim();
  if (filters.disponibilite?.trim()) p.disponibilite = filters.disponibilite.trim();
  if (filters.resultat_placement?.trim()) p.resultat_placement = filters.resultat_placement.trim();
  if (filters.contrat_signe?.trim()) p.contrat_signe = filters.contrat_signe.trim();
  if (filters.responsable_placement != null) p.responsable_placement = filters.responsable_placement;
  if (filters.ville?.trim()) p.ville = filters.ville.trim();
  if (filters.code_postal?.trim()) p.code_postal = filters.code_postal.trim();
  if (filters.date_min?.trim()) p.date_min = filters.date_min.trim();
  if (filters.date_max?.trim()) p.date_max = filters.date_max.trim();

  const boolish = (
    key: keyof typeof filters,
    v: boolean | "true" | "false" | undefined
  ) => {
    if (v === undefined) return;
    if (v === true || v === "true") p[key as string] = true;
    else if (v === false || v === "false") p[key as string] = false;
  };
  boolish("rqth", filters.rqth);
  boolish("permis_b", filters.permis_b);
  boolish("admissible", filters.admissible);
  boolish("inscrit_gespers", filters.inscrit_gespers);
  boolish("en_accompagnement_tre", filters.en_accompagnement_tre);
  boolish("en_appairage", filters.en_appairage);
  boolish("has_osia", filters.has_osia);
  boolish("entretien_done", filters.entretien_done);
  boolish("test_is_ok", filters.test_is_ok);
  if (filters.avec_archivees === true || filters.avec_archivees === "true") p.avec_archivees = true;
  if (filters.archives_seules === true || filters.archives_seules === "true") p.archives_seules = true;
  return p;
}

/** Export documents : aligné sur ``GET /documents/`` (hors pagination). */
export function buildDocumentExportQueryParams(filters: {
  search?: string;
  formation?: string | number;
  centre_id?: number;
  statut_id?: number;
  type_offre_id?: number;
  avec_archivees?: boolean;
  archives_seules?: boolean;
  ordering?: string;
}): Record<string, string | number | boolean> {
  const p: Record<string, string | number | boolean> = {};
  const s = filters.search?.trim();
  if (s) p.search = s;
  if (filters.formation != null && filters.formation !== "") {
    const n = typeof filters.formation === "number" ? filters.formation : Number(filters.formation);
    if (Number.isFinite(n)) p.formation = n;
  }
  if (filters.centre_id != null) p.centre_id = filters.centre_id;
  if (filters.statut_id != null) p.statut_id = filters.statut_id;
  if (filters.type_offre_id != null) p.type_offre_id = filters.type_offre_id;
  if (filters.avec_archivees) p.avec_archivees = true;
  if (filters.archives_seules) p.archives_seules = true;
  const o = filters.ordering?.trim();
  if (o) p.ordering = o;
  return p;
}

/** Export CVThèque : aligné sur ``GET /cvtheque/`` (hors pagination). */
export function buildCvthequeExportQueryParams(filters: {
  search?: string;
  candidat?: number;
  ville?: string;
  document_type?: string;
  centre_id?: number;
  formation_id?: number;
  type_offre_id?: number;
  statut_formation?: number;
  avec_archivees?: boolean;
  archives_seules?: boolean;
}): Record<string, string | number | boolean> {
  const p: Record<string, string | number | boolean> = {};
  const s = filters.search?.trim();
  if (s) p.search = s;
  if (filters.candidat != null) p.candidat = filters.candidat;
  if (filters.ville?.trim()) p.ville = filters.ville.trim();
  if (filters.document_type?.trim()) p.document_type = filters.document_type.trim();
  if (filters.centre_id != null) p.centre_id = filters.centre_id;
  if (filters.formation_id != null) p.formation_id = filters.formation_id;
  if (filters.type_offre_id != null) p.type_offre_id = filters.type_offre_id;
  if (filters.statut_formation != null) p.statut_formation = filters.statut_formation;
  if (filters.avec_archivees) p.avec_archivees = true;
  if (filters.archives_seules) p.archives_seules = true;
  return p;
}

export async function downloadLot1Blob(
  url: string,
  filename: string,
  params?: Record<string, unknown>
): Promise<void> {
  const response = await api.get(url, { params, responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export type Lot1ImportSummary = {
  created?: number;
  updated?: number;
  failed?: number;
  skipped?: number;
};

export type Lot1ImportSuccessPayload = {
  dry_run?: boolean;
  summary?: Lot1ImportSummary;
};

function parseImportErrorMessage(data: unknown): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.detail === "string") return o.detail;
    if (typeof o.file === "string") return o.file;
    if (Array.isArray(o.file) && typeof o.file[0] === "string") return o.file[0];
  }
  return "Import impossible.";
}

export async function postLot1Import(
  resource: Lot1ImportResourceSlug,
  file: File,
  dryRun: boolean
): Promise<Lot1ImportSuccessPayload> {
  const form = new FormData();
  form.append("file", file);
  const url = lot1ImportPath(resource, dryRun);
  try {
    const res = await api.post<Lot1ImportSuccessPayload>(url, form);
    return res.data;
  } catch (err: unknown) {
    const ax = err as { response?: { data?: unknown } };
    const msg = parseImportErrorMessage(ax.response?.data);
    throw new Error(msg);
  }
}
