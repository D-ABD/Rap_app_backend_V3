// types/user.ts

// 🎭 Rôles possibles
export type CustomUserRole =
  | "superadmin"
  | "admin"
  | "staff"
  | "staff_read"
  | "commercial"
  | "charge_recrutement"
  | "stagiaire"
  | "candidat"
  | "candidatuser" // rôle transitoire du cycle de vie candidat
  | "declic_staff"
  | "prepa_staff"
  | "test"; // rôle technique uniquement, à ne pas exposer comme rôle métier normal

// ✅ Interface principale utilisée dans tout le frontend
export interface User {
  consent_rgpd?: boolean;
  consent_date?: string | null;
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  bio?: string;
  avatar?: string | null;
  avatar_url?: string;
  role: CustomUserRole;
  role_display?: string;
  is_active: boolean;
  date_joined?: string;
  full_name?: string;
  is_staff?: boolean;
  is_staff_read?: boolean; // ✅ corrige la casse pour coller à l’API
  is_superuser?: boolean;
  is_admin?: boolean;

  last_login?: string;
  formation?: {
    id: number;
    nom: string;
    num_offre: string;
    centre: {
      id: number;
      nom: string;
    };
    type_offre: {
      id: number;
      nom: string;
      libelle: string;
      couleur: string;
    };
  } | null;
  formation_info?: {
    id: number;
    nom: string;
    num_offre: string;
    centre?: { id: number; nom: string };
    type_offre?: { id: number; nom: string; libelle: string; couleur: string };
  };

  // ✅ Ajoutés ici, pas dedans
  centre?: { id: number; nom: string } | null;
  centre_lie?: { id: number; nom: string } | null;
  role_lie?: { value: CustomUserRole; label: string } | null;
  centres?: { id: number; nom: string }[];
  type_offre?: {
    id: number;
    nom: string;
    libelle: string;
    couleur: string;
  };
}

// ✏️ Données de formulaire pour création/édition
export interface UserFormData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone?: string;
  bio?: string;
  avatar?: File | null;
  role: CustomUserRole;
}

// ➕ Création avec mot de passe (admin)
export interface UserCreatePayload extends Record<string, unknown> {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone?: string;
  bio?: string;
  avatar?: File | null;
  role: CustomUserRole;
  password: string;
}

// ✏️ Mise à jour partielle
export interface UserUpdatePayload extends Partial<Record<string, unknown>> {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  avatar?: File | null;
  role?: CustomUserRole;
  password?: string;
  formation?: number; // ✅
}

// 📄 Liste simplifiée
export interface SimpleUser {
  id: number;
  nom: string;
  /** Login — utile pour filtres API (ex. traces ImportJob). */
  username: string;
}

// 🧾 Rôles disponibles pour un <select>
export interface RoleChoice {
  value: CustomUserRole;
  label: string;
}

// 🔐 Inscription
export interface RegistrationPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
  user: {
    email: string;
  };
}

export interface UserFiltresValues {
  [key: string]: string | number | undefined;
  role?: string;
  is_active?: string;
  formation?: number;
  centre?: number;
  type_offre?: number;
  date_joined_min?: string;
  date_joined_max?: string;
}

export type UserFiltresOptions = Record<
  keyof UserFiltresValues,
  { value: string | number; label: string }[]
>;

// ✅ Profil utilisateur connecté (GET /api/me/)
export interface MeResponse {
  success: boolean;
  message: string;
  data: User;
}

// ✅ Mise à jour du profil (PATCH /api/me/)
// ✅ Mise à jour du profil (PATCH /api/me/ ou /api/candidats/me/)
export interface MeUpdatePayload {
  // ----- Champs User -----
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  avatar?: File | null;

  // ----- Champs Candidat (profil enrichi) -----
  street_name?: string;
  street_complement?: string;
  code_postal?: string;
  ville?: string;
  disponibilite?: string;
  formation?: number | null;
  centre?: number | null;
}

export interface MeUpdateResponse {
  success: boolean;
  message: string;
  data: User;
}

// ✅ Liste des rôles (GET /api/roles/)
export type RolesResponse = RoleChoice[];
