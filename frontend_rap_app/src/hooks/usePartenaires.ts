// src/hooks/usePartenaires.ts
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import api from "../api/axios";
import {
  Partenaire,
  PartenaireChoicesResponse,
  PartenaireWithRelations,
  Paginated, // { results, count }
} from "../types/partenaire";

/* ────────────────────────────────────────────────────────────────────────────
   Helpers sans any
   ──────────────────────────────────────────────────────────────────────────── */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function hasData(v: unknown): v is { data: unknown } {
  return isRecord(v) && "data" in v;
}
/** Accepte T ou {data:T} */
function unwrap<T>(payload: unknown): T {
  return hasData(payload) ? (payload.data as T) : (payload as T);
}

/** Enveloppe API standard ``{ success, message, data }`` : refuser un 200 explicite en échec. */
function assertEnvelopeSuccess(payload: unknown): void {
  if (!isRecord(payload) || !("success" in payload)) return;
  if (payload.success === false) {
    const msg =
      typeof payload.message === "string" && payload.message.trim()
        ? payload.message
        : "La requête a échoué.";
    throw new Error(msg);
  }
}

/** Texte affichable pour Toast / message utilisateur (Axios 4xx, réseau, etc.) */
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data;
    if (d && typeof d === "object" && d !== null) {
      const o = d as Record<string, unknown>;
      if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
      if (typeof o.detail === "string" && o.detail.trim()) return o.detail.trim();
      if (Array.isArray(o.detail) && o.detail.length) {
        const first = o.detail[0];
        if (typeof first === "string") return first;
      }
    }
    const s = err.response?.status;
    if (s === 404) return "Ressource introuvable (404). Vérifiez que le partenaire existe et que vous y avez accès.";
    if (s === 403) return "Accès refusé (403).";
    if (s === 401) return "Session expirée — reconnectez-vous (401).";
    if (err.message === "Network Error" || err.code === "ERR_NETWORK") {
      return "Réseau : le serveur API n’a pas répondu. Vérifiez l’adresse, que Django tourne, et l’onglet Réseau (F12).";
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return "";
}
const trimStr = (v: unknown) => (typeof v === "string" ? v.trim() : v);
const normalizePhone = (v: unknown) =>
  typeof v === "string" ? v.replace(/[.\-\s]/g, "") : (v as string | null);
const toNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/* ────────────────────────────────────────────────────────────────────────────
   Type d’écriture (payload) distinct du type de lecture Partenaire
   - Le backend peut accepter un id dans `default_centre` OU `default_centre_id`
   ──────────────────────────────────────────────────────────────────────────── */
type PartenaireWritePayload = {
  nom?: string;
  type?: Partenaire["type"];
  secteur_activite?: string | null;

  // 🏠 Adresse
  street_number?: string | null;
  street_name?: string | null;
  street_complement?: string | null;
  zip_code?: string | null;
  city?: string | null;
  country?: string | null;

  // ☎️ Coordonnées générales
  telephone?: string | null;
  email?: string | null;

  // ✅ en écriture: ids seulement
  default_centre?: number | null;
  default_centre_id?: number | null;

  // 👤 Contact principal
  contact_nom?: string | null;
  contact_poste?: string | null;
  contact_telephone?: string | null;
  contact_email?: string | null;

  // 🌐 Web
  website?: string | null;
  social_network_url?: string | null;

  // ⚙️ Actions et descriptif
  actions?: Partenaire["actions"] | null;
  action_description?: string | null;
  description?: string | null;

  // 🏢 Données employeur codifiées pour le CERFA
  siret?: string | null;
  type_employeur_code?: string | null;
  employeur_specifique_code?: string | null;
  code_ape?: string | null;
  effectif_total?: number | null;
  idcc?: string | null;
  assurance_chomage_speciale?: boolean;

  // 🎓 Maître d’apprentissage n°1
  maitre1_nom_naissance?: string | null;
  maitre1_prenom?: string | null;
  maitre1_date_naissance?: string | null;
  maitre1_courriel?: string | null;
  maitre1_emploi_occupe?: string | null;
  maitre1_diplome_titre?: string | null;
  maitre1_niveau_diplome_code?: string | null;

  // 🎓 Maître d’apprentissage n°2
  maitre2_nom_naissance?: string | null;
  maitre2_prenom?: string | null;
  maitre2_date_naissance?: string | null;
  maitre2_courriel?: string | null;
  maitre2_emploi_occupe?: string | null;
  maitre2_diplome_titre?: string | null;
  maitre2_niveau_diplome_code?: string | null;

  is_active?: boolean;
};

/**
 * Nettoie et normalise le payload avant envoi au back.
 * - Retire les champs non éditables / read-only
 * - Transforme "" -> null (sauf pour `actions` où on supprime la clé si vide/null)
 * - Ajoute un protocole https:// si manquant pour website/social_network_url
 * - Évite l’erreur de cohérence zip_code/city (zip sans city)
 * - Trim des strings, email en lowercase, téléphone sans séparateurs
 * - Normalise le centre par défaut: accepte objet {id}, id (number|string) -> number
 */
function cleanPartenairePayload(input: Partial<Partenaire>): PartenaireWritePayload {
  // Clés autorisées côté écriture
  const allowedKeys: (keyof PartenaireWritePayload)[] = [
    "nom",
    "type",
    "secteur_activite",

    // Adresse
    "street_number",
    "street_name",
    "street_complement",
    "zip_code",
    "city",
    "country",

    // Coordonnées
    "telephone",
    "email",

    // Centre
    "default_centre",
    "default_centre_id",

    // Contact
    "contact_nom",
    "contact_poste",
    "contact_telephone",
    "contact_email",

    // Web
    "website",
    "social_network_url",

    // Actions / descriptions
    "actions",
    "action_description",
    "description",

    // Données employeur
    "siret",
    "type_employeur_code",
    "employeur_specifique_code",
    "code_ape",
    "effectif_total",
    "idcc",
    "assurance_chomage_speciale",

    // Maîtres d’apprentissage
    "maitre1_nom_naissance",
    "maitre1_prenom",
    "maitre1_date_naissance",
    "maitre1_courriel",
    "maitre1_emploi_occupe",
    "maitre1_diplome_titre",
    "maitre1_niveau_diplome_code",

    "maitre2_nom_naissance",
    "maitre2_prenom",
    "maitre2_date_naissance",
    "maitre2_courriel",
    "maitre2_emploi_occupe",
    "maitre2_diplome_titre",
    "maitre2_niveau_diplome_code",

    "is_active",
  ];

  // 1) Copie filtrée + normalisation "" -> null + trim
  const baseEntries = Object.entries(input)
    .filter(([k]) => (allowedKeys as string[]).includes(k))
    .map(([k, v]) => [k, v === "" ? null : trimStr(v)])
    .filter(([, v]) => v !== undefined); // supprime undefined

  const out: PartenaireWritePayload = Object.fromEntries(baseEntries) as PartenaireWritePayload;

  // 2) `actions` ne doit pas être "" ou null (ChoiceField sans allow_blank/allow_null)
  if ("actions" in out) {
    const a = out.actions as unknown;
    if (a === null || a === "") {
      delete out.actions; // on retire complètement la clé
    }
  }

  // 3) URLs : ajoute https:// si renseignées sans protocole
  if (out.website && typeof out.website === "string" && !/^https?:\/\//i.test(out.website)) {
    out.website = `https://${out.website}`;
  }
  if (
    out.social_network_url &&
    typeof out.social_network_url === "string" &&
    !/^https?:\/\//i.test(out.social_network_url)
  ) {
    out.social_network_url = `https://${out.social_network_url}`;
  }

  // 4) Cohérence zip_code/city (le modèle lève une ValidationError si zip_code sans city)
  if (out.zip_code && (!out.city || (typeof out.city === "string" && out.city.trim() === ""))) {
    delete out.zip_code;
  }

  // 5) email -> lowercase
  if (out.contact_email && typeof out.contact_email === "string") {
    out.contact_email = out.contact_email.trim().toLowerCase();
  }

  // 6) téléphone : retirer séparateurs
  if (out.contact_telephone) {
    out.contact_telephone = normalizePhone(out.contact_telephone);
  }

  // 7) Normaliser le centre par défaut à un id (si présent)
  //    - si input.default_centre est un objet { id }, ou un id (string/number), on remplit out.default_centre
  //    - si input.default_centre_id est fourni, on le normalise aussi
  const dcRaw = (input as unknown as Record<string, unknown>)["default_centre"];
  const dciRaw = (input as unknown as Record<string, unknown>)["default_centre_id"];

  let dcId: number | null = null;
  if (isRecord(dcRaw) && "id" in dcRaw) {
    dcId = toNumber((dcRaw as { id: unknown }).id);
  } else {
    dcId = toNumber(dcRaw);
  }
  const dciId = toNumber(dciRaw);

  if (dcId !== null) {
    out.default_centre = dcId;
    delete out.default_centre_id; // on privilégie default_centre si les deux existent
  } else if (dciId !== null) {
    out.default_centre_id = dciId;
  } else {
    // aucun id valable fourni -> ne rien envoyer
    delete out.default_centre;
    delete out.default_centre_id;
  }

  return out;
}

/* ────────────────────────────────────────────────────────────────────────────
   Liste des partenaires
   ──────────────────────────────────────────────────────────────────────────── */
export function useListPartenaires(params: Record<string, string | number | boolean> = {}) {
  const [data, setData] = useState<Partenaire[] | Paginated<Partenaire>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Stabilise la dépendance pour éviter des refetchs à chaque render
  const paramsKey = useMemo(() => {
    try {
      return JSON.stringify(params);
    } catch {
      return "{}";
    }
  }, [params]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const parsedParams = JSON.parse(paramsKey) as Record<string, string | number | boolean>;
        const res = await api.get<unknown>("/partenaires/", {
          params: parsedParams,
        });
        const payload = unwrap<Partenaire[] | Paginated<Partenaire>>(res.data);
        if (!alive) return;
        setData(payload);
      } catch (err) {
        if (!alive) return;
        if (err instanceof Error) setError(err);
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [paramsKey]);

  return { data, loading, error };
}

export function useDesarchiverPartenaire() {
  return {
    restore: async (id: number) => {
      const res = await api.post<unknown>(`/partenaires/${id}/desarchiver/`);
      return unwrap<Partenaire>(res.data);
    },
  };
}

export function useReafficherPartenaireDansMaListe() {
  return {
    /** Corps JSON minimal : certains parcours DRF/Axios n’apprécient pas un POST totalement vide. */
    reafficher: async (id: number) => {
      const res = await api.post<unknown>(`/partenaires/${id}/reafficher-dans-ma-liste/`, {});
      assertEnvelopeSuccess(res.data);
      return unwrap<Partenaire>(res.data);
    },
  };
}

export function useHardDeletePartenaire() {
  return {
    hardDelete: async (id: number) => {
      const res = await api.post<unknown>(`/partenaires/${id}/hard-delete/`);
      return unwrap<{ id: number; hard_deleted: boolean; resource: string }>(res.data);
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   Détail d’un partenaire
   ──────────────────────────────────────────────────────────────────────────── */
export function usePartenaire(id?: number) {
  const [data, setData] = useState<Partenaire | null>(null);
  const [loading, setLoading] = useState<boolean>(!!id);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Même champ que la liste « Inclure les archivés » : accès cohérent au détail
        // (fiches inactives + pas d’exclusion retrait côté backend si ``avec_archivees``).
        const res = await api.get<unknown>(`/partenaires/${id}/`, {
          params: { avec_archivees: 1 },
        });
        const payload = unwrap<Partenaire>(res.data);
        if (!alive) return;
        setData(payload);
      } catch (err) {
        if (!alive) return;
        if (err instanceof Error) setError(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return { data, loading, error };
}

/* ────────────────────────────────────────────────────────────────────────────
   Détail + relations
   ──────────────────────────────────────────────────────────────────────────── */
export function usePartenaireWithRelations(id?: number) {
  const [data, setData] = useState<PartenaireWithRelations | null>(null);
  const [loading, setLoading] = useState<boolean>(!!id);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<unknown>(`/partenaires/${id}/with-relations/`, {
          params: { avec_archivees: 1 },
        });
        const payload = unwrap<PartenaireWithRelations>(res.data);
        if (!alive) return;
        setData(payload);
      } catch (err) {
        if (!alive) return;
        if (err instanceof Error) setError(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return { data, loading, error };
}

/* ────────────────────────────────────────────────────────────────────────────
   Création
   ──────────────────────────────────────────────────────────────────────────── */
export function useCreatePartenaire() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  async function create(payload: Partial<Partenaire>): Promise<Partenaire> {
    setLoading(true);
    setError(null);
    const cleaned: PartenaireWritePayload = cleanPartenairePayload(payload);
    try {
      const res = await api.post<unknown>("/partenaires/", cleaned);
      return unwrap<Partenaire>(res.data);
    } catch (err) {
      if (err instanceof Error) setError(err);

      // logs utiles en dev uniquement
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.groupCollapsed("⛔ create partenaire failed");
        if (isRecord(err) && "response" in err) {
          const _r = (err as { response?: { status?: number; data?: unknown } }).response;
          // eslint-disable-next-line no-console
          console.debug("status / data :", _r?.status, _r?.data);
        }
        // eslint-disable-next-line no-console
        console.groupEnd();
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { create, loading, error };
}

/* ────────────────────────────────────────────────────────────────────────────
   Mise à jour (PATCH)
   ──────────────────────────────────────────────────────────────────────────── */
export function useUpdatePartenaire(id: number) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  async function update(payload: Partial<Partenaire>): Promise<Partenaire> {
    setLoading(true);
    setError(null);
    const cleaned: PartenaireWritePayload = cleanPartenairePayload(payload);
    try {
      const res = await api.patch<unknown>(`/partenaires/${id}/`, cleaned);
      return unwrap<Partenaire>(res.data);
    } catch (err) {
      if (err instanceof Error) setError(err);

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.groupCollapsed("⛔ update partenaire failed");
        if (isRecord(err) && "response" in err) {
          const _r = (err as { response?: { status?: number; data?: unknown } }).response;
          // eslint-disable-next-line no-console
          console.debug("Réponse backend :", _r);
        }
        // eslint-disable-next-line no-console
        console.groupEnd();
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { update, loading, error };
}

/* ────────────────────────────────────────────────────────────────────────────
   Suppression
   ──────────────────────────────────────────────────────────────────────────── */
export function useDeletePartenaire() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  async function remove(id: number): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/partenaires/${id}/`);
    } catch (err) {
      if (err instanceof Error) setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { remove, loading, error };
}

/* ────────────────────────────────────────────────────────────────────────────
   Choices (types / actions)
   ──────────────────────────────────────────────────────────────────────────── */
export function usePartenaireChoices() {
  const [data, setData] = useState<PartenaireChoicesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<unknown>("/partenaires/choices/");
        const payload = unwrap<PartenaireChoicesResponse>(res.data);
        if (!alive) return;
        setData(payload);
      } catch (err) {
        if (!alive) return;
        if (err instanceof Error) setError(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { data, loading, error };
}

/* ────────────────────────────────────────────────────────────────────────────
   Filtres (villes, secteurs, users)
   ──────────────────────────────────────────────────────────────────────────── */
export type FilterOption = {
  value: string;
  label: string;
};

export type UserFilterOption = {
  id: number;
  full_name: string;
};

export type PartenaireFiltersResponse = {
  cities: FilterOption[];
  secteurs: FilterOption[];
  users: UserFilterOption[];
};

export function usePartenaireFilters(
  listParams: Record<string, string | number | boolean> = {}
) {
  const [data, setData] = useState<PartenaireFiltersResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const paramsKey = useMemo(() => {
    try {
      return JSON.stringify(listParams);
    } catch {
      return "{}";
    }
  }, [listParams]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const parsed = JSON.parse(paramsKey) as Record<string, string | number | boolean>;
        const res = await api.get<unknown>("/partenaires/filter-options/", {
          params: Object.keys(parsed).length ? parsed : undefined,
        });
        const payload = unwrap<PartenaireFiltersResponse>(res.data);
        if (!alive) return;
        setData(payload);
      } catch (err) {
        if (!alive) return;
        if (err instanceof Error) {
          setError(err);
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.debug("[usePartenaireFilters] erreur lors du chargement des filtres :", err);
          }
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [paramsKey]);

  return { data, loading, error };
}
