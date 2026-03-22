// ── Utilitaires ───────────────────────────────────────────────────────────────
export interface Choice {
  value: string | number;
  label: string;
}

// Aligné sur models.TextChoices
export type TypeAtelier =
  | "atelier_1"
  | "atelier_2"
  | "atelier_3"
  | "atelier_4"
  | "atelier_5"
  | "atelier_6"
  | "atelier_7"
  | "autre";

export interface BasicUserRef {
  id: number;
  full_name?: string;
}

export interface BaseMeta {
  created_by?: number | BasicUserRef | null;
  created_at?: string | null; // ISO
  updated_at?: string | null; // ISO
  is_active?: boolean;
}

// ── Présences ─────────────────────────────────────────────────────────────────
// Aligné sur PresenceStatut du modèle
export type PresenceStatut = "present" | "absent" | "excuse" | "inconnu";

// Lecture (serializer complet)
export interface AtelierTREPresence {
  id: number;
  candidat: { id: number; nom: string };
  candidat_id?: number;
  statut: PresenceStatut;
  statut_display: string;
  commentaire: string | null;
  created_at: string;
  updated_at: string;
}

// Écriture (formulaire / POST)
export interface AtelierTREPresenceInput {
  candidat_id: number;
  statut: PresenceStatut;
  commentaire?: string | null;
}

// ── Formulaire ───────────────────────────────────────────────────────────────
export interface AtelierTREFormData {
  type_atelier: TypeAtelier;
  date_atelier?: string | null;
  centre?: number | null;
  candidats?: number[];
  presences?: AtelierTREPresenceInput[]; // ✅ type correct pour POST/PUT
}

// ── AtelierTRE (liste + détail) ──────────────────────────────────────────────
export interface AtelierTRE extends BaseMeta {
  id: number;

  type_atelier: TypeAtelier;
  type_atelier_display: string;

  date_atelier: string | null; // ISO ex. "2025-09-10T09:00:00Z" ou null

  centre: number | null;
  centre_detail?: { id: number; label: string } | null;

  // M2M (écriture via ids)
  candidats: number[];

  // Lecture conviviale
  candidats_detail?: { id: number; nom: string }[];

  // Présences détaillées (nouveau champ du serializer)
  presences?: AtelierTREPresence[];

  // Stats
  nb_inscrits: number;
  presence_counts?: {
    present: number;
    absent: number;
    excuse: number;
    inconnu: number;
  };
}

// ── Réponses API ─────────────────────────────────────────────────────────────
export interface AtelierTREListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AtelierTRE[];
}

export interface AtelierTREMeta {
  type_atelier_choices: Choice[];
  centre_choices: Choice[];
  candidat_choices: Choice[];
  presence_statut_choices?: Choice[]; // ✅ correspond au backend
}
// ── Export Excel ──────────────────────────────────────────────────────────────
export interface AtelierTREExportRow {
  id: number;
  type_atelier: string;
  centre: string | null;
  date_atelier: string | null;
  nb_inscrits: number;
  pres_present: number;
  pres_absent: number;
  pres_excuse: number;
  pres_inconnu: number;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ── Filtres liste (inchangé) ────────────────────────────────────────────────
export interface AtelierTREFiltresValues {
  type_atelier?: TypeAtelier;
  date_atelier_min?: string; // "YYYY-MM-DD"
  date_atelier_max?: string; // "YYYY-MM-DD"
  centre?: number;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string; // e.g. "-date_atelier"
}
