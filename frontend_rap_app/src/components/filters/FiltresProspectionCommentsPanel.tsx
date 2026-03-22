import React, { useMemo, useCallback } from "react";
import FilterTemplate, { type FieldConfig } from "./FilterTemplate";
import type { ProspectionCommentListParams } from "../../types/prospectionComment";

type Choice<T extends string | number> = { value: T; label: string };

/** Valeurs parent (compat API) */
type BaseValues = ProspectionCommentListParams & {
  search?: string;
  formation_nom?: string;
  partenaire_nom?: string;
  created_by_username?: string;
  formation_centre_nom?: string;
  prospection_owner?: number;
  inclure_archives?: boolean; // 🆕
};

/** Valeurs utilisées par le panneau */
type UIValues = Omit<BaseValues, "prospection"> & {
  is_internal_ui: "all" | "public" | "internal";
  est_archive_ui: "all" | "active" | "archive";
};

type Props = {
  mode?: "default" | "candidate";
  filtres?: {
    authors?: Choice<string>[];
    formations?: Choice<string>[];
    partenaires?: Choice<string>[];
    centres?: Choice<string>[];
    owners?: Choice<number>[];
    user_role?: string;
  };
  values?: BaseValues;
  onChange: (values: BaseValues) => void;
  onRefresh?: () => void;
  onReset?: () => void;
};

// ✅ génère des options uniques et sûres pour les Select MUI
function toUniqueOptions<T extends string | number>(arr: Array<{ value: T; label: string }>) {
  const seen = new Set<string>();
  return arr.reduce(
    (acc, item, i) => {
      const key = `${item.value}-${item.label}`;
      if (!seen.has(key)) {
        seen.add(key);
        acc.push({ ...item, key: `${key}-${i}` });
      }
      return acc;
    },
    [] as Array<{ value: T; label: string; key: string }>
  );
}

// garde la compatibilité placeholder
const withPlaceholder = <T extends string | number>(
  opts: Array<{ value: T; label: string; key?: string }>
) =>
  opts.length
    ? opts.map((o) => ({ ...o, key: o.key ?? `${o.value}-${o.label}` }))
    : [{ value: "" as T, label: "—", key: "placeholder" }];

function normalizeValues(v?: BaseValues): BaseValues {
  return {
    prospection: v?.prospection,
    is_internal: v?.is_internal,
    created_by: v?.created_by,
    ordering: v?.ordering ?? "-created_at",
    search: v?.search ?? "",
    formation_nom: v?.formation_nom,
    partenaire_nom: v?.partenaire_nom,
    created_by_username: v?.created_by_username,
    formation_centre_nom: v?.formation_centre_nom,
    prospection_owner: v?.prospection_owner,
    est_archive: v?.est_archive ?? false, // par défaut : actifs uniquement
    inclure_archives: v?.inclure_archives ?? false,
  };
}

function uniqBy<T, K>(arr: T[], keyFn: (x: T) => K): T[] {
  const seen = new Set<K>();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default React.memo(function FiltresProspectionCommentsPanel({
  mode = "default",
  filtres,
  values,
  onChange,
  onRefresh,
  onReset,
}: Props) {
  const v = useMemo(() => normalizeValues(values), [values]);

  const safe = useMemo(
    () => ({
      authors: filtres?.authors ?? [],
      formations: filtres?.formations ?? [],
      partenaires: filtres?.partenaires ?? [],
      centres: filtres?.centres ?? [],
      owners: filtres?.owners ?? [],
      user_role: filtres?.user_role ?? "",
    }),
    [filtres]
  );

  const isCandidate = mode === "candidate";

  // ------------------------------
  // UI mapping : interne / archivé
  // ------------------------------
  const isInternalUI: UIValues["is_internal_ui"] =
    v.is_internal === true ? "internal" : v.is_internal === false ? "public" : "all";

  const estArchiveUI: UIValues["est_archive_ui"] =
    v.est_archive === true ? "archive" : v.est_archive === false ? "active" : "all";

  const uiValues: UIValues = useMemo(
    () => ({
      ...v,
      is_internal_ui: isInternalUI,
      est_archive_ui: estArchiveUI,
    }),
    [v, isInternalUI, estArchiveUI]
  );

  // ------------------------------
  // Réinitialisation par défaut
  // ------------------------------
  const defaultReset = useCallback(() => {
    const out: BaseValues = {
      prospection: v.prospection,
      is_internal: undefined,
      created_by: undefined,
      ordering: "-created_at",
      search: "",
      formation_nom: undefined,
      partenaire_nom: undefined,
      created_by_username: undefined,
      formation_centre_nom: undefined,
      prospection_owner: undefined,
      est_archive: false,
      inclure_archives: false,
    };
    onChange(out);
  }, [onChange, v]);

  // ------------------------------
  // 🧩 Gestion des changements UI
  // ------------------------------
  const handleChange = useCallback(
    (next: UIValues) => {
      const { is_internal_ui, est_archive_ui, inclure_archives, ...rest } = next;

      let is_internal: boolean | undefined;
      if (is_internal_ui === "public") is_internal = false;
      else if (is_internal_ui === "internal") is_internal = true;

      // ✅ Important : toujours fournir une valeur exploitable à l’API
      let est_archive: boolean | "both";
      if (inclure_archives) {
        est_archive = "both"; // inclure actifs + archivés
      } else if (est_archive_ui === "archive") {
        est_archive = true; // archivés seulement
      } else if (est_archive_ui === "active") {
        est_archive = false; // actifs seulement
      } else {
        est_archive = "both"; // "Tous"
      }

      const out: BaseValues = {
        prospection: v.prospection,
        is_internal,
        est_archive,
        inclure_archives,
        created_by: rest.created_by,
        ordering: rest.ordering,
        search: rest.search,
        formation_nom: rest.formation_nom,
        partenaire_nom: rest.partenaire_nom,
        created_by_username: rest.created_by_username,
        formation_centre_nom: rest.formation_centre_nom,
        prospection_owner: rest.prospection_owner,
      };

      onChange(out);
    },
    [onChange, v.prospection]
  );

  // ------------------------------
  // 🧩 Définition des champs
  // ------------------------------
  const fields = useMemo<FieldConfig<UIValues>[]>(() => {
    return [
      {
        key: "search" as const,
        label: "🔎 Recherche",
        type: "text" as const,
        placeholder: "Texte du commentaire…",
      },
      ...(isCandidate
        ? []
        : [
            {
              key: "formation_nom" as const,
              label: "🎓 Formation",
              type: "select" as const,
              options: withPlaceholder(toUniqueOptions(safe.formations)),
            },
            {
              key: "partenaire_nom" as const,
              label: "🏢 Partenaire",
              type: "select" as const,
              options: withPlaceholder(toUniqueOptions(safe.partenaires)),
            },
            {
              key: "formation_centre_nom" as const,
              label: "🏫 Centre",
              type: "select" as const,
              options: withPlaceholder(toUniqueOptions(safe.centres)),
            },
            {
              key: "prospection_owner" as const,
              label: "👤 Candidat",
              type: "select" as const,
              hidden: safe.owners.length === 0,
              options: withPlaceholder(
                toUniqueOptions(
                  uniqBy(safe.owners, (o) => Number(o.value)).map((o) => ({
                    value: Number(o.value),
                    label: o.label,
                  }))
                )
              ),
            },
          ]),
      {
        key: "is_internal_ui" as const,
        label: "👁️ Visibilité",
        type: "select" as const,
        options: [
          { value: "all", label: "Tous" },
          { value: "public", label: "Public" },
          { value: "internal", label: "Interne" },
        ],
      },
      {
        key: "est_archive_ui" as const,
        label: "📦 État",
        type: "select" as const,
        options: [
          { value: "all", label: "Tous" },
          { value: "active", label: "Actifs" },
          { value: "archive", label: "Archivés" },
        ],
      },
      {
        key: "inclure_archives" as const,
        label: "🗃️ Inclure les archivés",
        type: "checkbox" as const,
        tooltip: "Afficher aussi les commentaires archivés dans la liste",
      },
      ...(isCandidate
        ? []
        : [
            {
              key: "created_by_username" as const,
              label: "✍️ Auteur",
              type: "select" as const,
              hidden: safe.authors.length === 0,
              options: withPlaceholder(toUniqueOptions(safe.authors)),
            },
          ]),
      {
        key: "ordering" as const,
        label: "↕️ Tri",
        type: "select" as const,
        options: [
          { value: "-created_at", label: "Plus récent" },
          { value: "created_at", label: "Plus ancien" },
          { value: "-id", label: "ID décroissant" },
          { value: "id", label: "ID croissant" },
        ],
      },
    ];
  }, [safe, isCandidate]);

  // ------------------------------
  // 🧩 Boutons d’action
  // ------------------------------
  const actions = useMemo(
    () => ({
      onReset: onReset ?? defaultReset,
      onRefresh,
      resetLabel: "Réinitialiser",
      refreshLabel: "Rafraîchir",
    }),
    [onReset, onRefresh, defaultReset]
  );

  return (
    <FilterTemplate<UIValues>
      values={uiValues}
      onChange={handleChange}
      fields={fields}
      actions={actions}
      cols={3}
    />
  );
});
