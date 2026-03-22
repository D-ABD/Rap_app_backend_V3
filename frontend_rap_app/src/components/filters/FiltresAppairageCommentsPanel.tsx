// src/components/filters/FiltresAppairageCommentsPanel.tsx
import React, { useCallback, useMemo } from "react";
import FilterTemplate, { type FieldConfig } from "./FilterTemplate";
import type { AppairageCommentListParams } from "../../types/appairageComment";

type Choice<T extends string | number> = { value: T; label: string };

/** Valeurs parent (compat API) */
type BaseValues = AppairageCommentListParams & {
  search?: string;
  partenaire_nom?: string;
  candidat_nom?: string;
  created_by_username?: string;
  appairage_owner?: number;
  inclure_archives?: boolean; // 🆕
};

/** Valeurs utilisées par le panneau */
type UIValues = Omit<BaseValues, "appairage"> & {
  est_archive_ui: "all" | "active" | "archive";
};

type Props = {
  mode?: "default" | "candidate";
  filtres?: {
    authors?: Choice<string>[];
    partenaires?: Choice<string>[];
    candidats?: Choice<string>[];
    owners?: Choice<number>[];
    user_role?: string;
  };
  values?: BaseValues;
  onChange: (values: BaseValues) => void;
  onRefresh?: () => void;
  onReset?: () => void;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */
type OptionWithKey<T extends string | number> = {
  value: T;
  label: string;
  key?: string;
};

const withPlaceholder = <T extends string | number>(
  opts: OptionWithKey<T>[]
): OptionWithKey<T>[] =>
  opts.length
    ? opts.map((o, i) => ({ ...o, key: o.key ?? `${o.value}-${i}` }))
    : [{ value: "" as T, label: "—", key: "placeholder" }];

function normalizeValues(v?: BaseValues): BaseValues {
  return {
    appairage: v?.appairage,
    created_by: v?.created_by,
    ordering: v?.ordering ?? "-created_at",
    search: v?.search ?? "",
    partenaire_nom: v?.partenaire_nom,
    candidat_nom: v?.candidat_nom,
    created_by_username: v?.created_by_username,
    appairage_owner: v?.appairage_owner,
    est_archive: v?.est_archive, // ✅ ne pas forcer à false
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

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */
export default React.memo(function FiltresAppairageCommentsPanel({
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
      partenaires: filtres?.partenaires ?? [],
      candidats: filtres?.candidats ?? [],
      owners: filtres?.owners ?? [],
      user_role: filtres?.user_role ?? "",
    }),
    [filtres]
  );

  const isCandidate = mode === "candidate";

  /* ------------------------------ */
  /* UI mapping pour archivage      */
  /* ------------------------------ */
  const estArchiveUI: UIValues["est_archive_ui"] =
    v.est_archive === true ? "archive" : v.est_archive === false ? "active" : "all";

  const uiValues: UIValues = useMemo(
    () => ({
      ...v,
      est_archive_ui: estArchiveUI,
    }),
    [v, estArchiveUI]
  );

  /* ------------------------------ */
  /* RESET par défaut               */
  /* ------------------------------ */
  const defaultReset = useCallback(() => {
    const out: BaseValues = {
      appairage: v.appairage,
      created_by: undefined,
      ordering: "-created_at",
      search: "",
      partenaire_nom: undefined,
      candidat_nom: undefined,
      created_by_username: undefined,
      appairage_owner: undefined,
      est_archive: undefined,
      inclure_archives: false,
    };
    onChange(out);
  }, [onChange, v]);

  /* ------------------------------ */
  /* Gestion des changements UI     */
  /* ------------------------------ */
  const handleChange = useCallback(
    (next: UIValues) => {
      const { est_archive_ui, inclure_archives, ...rest } = next;

      let est_archive: boolean | undefined;
      if (est_archive_ui === "active") est_archive = false;
      else if (est_archive_ui === "archive") est_archive = true;

      // ✅ Si "inclure archivés" est activé → on ne filtre plus par état
      const finalEstArchive = inclure_archives ? undefined : est_archive;

      const out: BaseValues = {
        ...v,
        ...rest,
        est_archive: finalEstArchive,
        inclure_archives,
      };
      onChange(out);
    },
    [onChange, v]
  );

  /* ------------------------------ */
  /* Champs de filtre               */
  /* ------------------------------ */
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
              key: "partenaire_nom" as const,
              label: "🏢 Partenaire",
              type: "select" as const,
              options: withPlaceholder(safe.partenaires),
            },
            {
              key: "candidat_nom" as const,
              label: "👤 Candidat",
              type: "select" as const,
              options: withPlaceholder(safe.candidats),
            },
            {
              key: "appairage_owner" as const,
              label: "👥 Référent",
              type: "select" as const,
              hidden: safe.owners.length === 0,
              options: withPlaceholder(
                uniqBy(safe.owners, (o) => Number(o.value)).map((o) => ({
                  value: Number(o.value),
                  label: o.label,
                }))
              ),
            },
          ]),
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
              options: withPlaceholder(safe.authors),
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

  /* ------------------------------ */
  /* Boutons d’action               */
  /* ------------------------------ */
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
