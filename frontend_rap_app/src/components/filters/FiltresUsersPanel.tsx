// src/components/users/FiltresUsersPanel.tsx
import React, { useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import FilterTemplate, { type FieldConfig } from "./FilterTemplate";

type Option = { value: string | number; label: string };

// 🔹 Propriétés du panneau
export interface FiltresUsersPanelProps<
  T extends Record<string, string | number | boolean | undefined>,
> {
  values: T;
  options: Partial<Record<keyof T, Option[]>>;
  loading?: boolean;
  onChange: (next: T) => void;
  onReset?: () => void;
  onRefresh?: () => void;
  labels?: Partial<Record<keyof T, string>>;
}

// 🔹 Supprime les doublons d’options par value
function uniqueById<T extends { value: string | number }>(arr: T[] = []): T[] {
  const seen = new Set<string | number>();
  return arr.filter((item) => {
    if (seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });
}

// 🔹 Placeholder quand la liste est vide
const withPlaceholder = (opts: Array<{ value: string | number; label: string }>) =>
  opts.length ? opts : [{ value: "", label: "—" }];

function humanizeKey(k: string): string {
  const s = k.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function FiltresUsersPanel<
  T extends Record<string, string | number | boolean | undefined>,
>({
  values,
  options,
  loading = false,
  onChange,
  onReset,
  onRefresh,
  labels,
}: FiltresUsersPanelProps<T>) {
  // 🔹 Normalise les entrées options
  const entries = useMemo(() => Object.entries(options ?? {}) as [keyof T, Option[]][], [options]);

  // 🔹 Reset par défaut
  const defaultReset = useCallback(() => {
    const next = { ...values };
    for (const [key] of entries) {
      (next as Record<keyof T, string | number | boolean | undefined>)[key] = undefined;
    }
    onChange(next as T);
  }, [entries, onChange, values]);

  // 🔹 Construit les champs pour FilterTemplate
  const fields: FieldConfig<T>[] = useMemo(() => {
    return entries.map(([key, opts]) => ({
      key: key as keyof T,
      label: (labels?.[key] as string) ?? humanizeKey(String(key)),
      type: "select" as const,
      disabled: loading,
      options: withPlaceholder(uniqueById(opts)),
    }));
  }, [entries, labels, loading]);

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
    <>
      {loading && (
        <Box
          role="status"
          aria-live="polite"
          sx={{
            px: 2,
            py: 1.5,
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
            color: "text.secondary",
            backgroundColor: "background.default",
            mb: 2,
            textAlign: "center",
          }}
        >
          Chargement des filtres…
        </Box>
      )}

      <FilterTemplate<T>
        values={values}
        onChange={onChange}
        fields={fields}
        loading={loading}
        actions={actions}
        cols={4}
      />
    </>
  );
}
