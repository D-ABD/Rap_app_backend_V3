// ======================================================
// src/components/ui/FiltresCommentairesPanel.tsx
// Filtres alignés avec CommentaireViewSet.filter_options enrichi
// ======================================================

import React, { useMemo, useCallback } from "react";
import { Box } from "@mui/material";
import FilterTemplate, { type FieldConfig } from "./FilterTemplate";
import { CommentaireFiltresValues } from "../../types/commentaire";

interface FiltresPanelProps {
  filtres?: {
    centres: { id: number; nom: string }[];
    statuts: { id: string | number; nom: string }[];
    type_offres: { id: number; nom: string }[];
    formations?: { id: number; nom: string; num_offre?: string }[]; // ✅ ajout num_offre
    formation_etats?: { value: string | number; label: string }[];
    auteurs?: { id: number; nom: string }[];
  };
  values: CommentaireFiltresValues;
  onChange: (values: CommentaireFiltresValues) => void;
  onReset?: () => void;
  onRefresh?: (extraParams?: Record<string, any>) => void;
}

/** util: supprime les doublons et formate en options {value,label} */
function toOptionsUnique<
  T extends {
    id?: number | string;
    value?: string | number;
    nom?: string;
    label?: string;
  },
>(arr: T[] = [], labelKey: "nom" | "label" = "nom") {
  const seen = new Set<string | number>();
  return arr.reduce<Array<{ value: string | number; label: string }>>((acc, item) => {
    const value = item.id ?? item.value;
    const label = (labelKey === "nom" ? item.nom : item.label) ?? "";
    if (value == null || !label || seen.has(value)) return acc;
    seen.add(value);
    acc.push({ value, label });
    return acc;
  }, []);
}

/** insère un placeholder quand la liste d'options est vide */
const withPlaceholder = (opts: Array<{ value: string | number; label: string }>) =>
  opts.length ? opts : [{ value: "", label: "—" }];

/** reset par défaut si onReset non fourni */
function defaultReset(values: CommentaireFiltresValues): CommentaireFiltresValues {
  return {
    ...values,
    centre_id: undefined,
    formation: undefined, // ✅ renommé ici
    statut_id: undefined,
    type_offre_id: undefined,
    formation_etat: undefined,
    auteur_id: undefined,
    include_archived: false,
  };
}

export default React.memo(function FiltresCommentairesPanel({
  filtres,
  values,
  onChange,
  onReset,
  onRefresh,
}: FiltresPanelProps) {
  // ------------------------------------------------------
  // 🔄 Gestion de la logique statut ↔ archivés
  // ------------------------------------------------------
  const handleStatutChange = useCallback(
    (newStatutId: string | number | undefined) => {
      const statut = String(newStatutId || "").toLowerCase();

      // 🔁 Synchronise automatiquement include_archived
      const include_archived = statut === "archive" || statut === "archived" || statut === "all";

      const newValues = { ...values, statut_id: newStatutId, include_archived };
      onChange(newValues);
      if (onRefresh) onRefresh(newValues);
    },
    [onChange, onRefresh, values]
  );

  // ------------------------------------------------------
  // 🧩 Définition dynamique des champs
  // ------------------------------------------------------
  const fields = useMemo<Array<FieldConfig<CommentaireFiltresValues>>>(() => {
    if (!filtres) return [];

    const baseFields = [
      {
        key: "centre_id" as const,
        label: "🏫 Centre",
        type: "select" as const,
        options: withPlaceholder(toOptionsUnique(filtres.centres, "nom")),
      },
      {
        key: "formation" as const,
        label: "📘 Formation (nom + n° offre)",
        type: "select" as const,
        options: withPlaceholder(
          (filtres.formations ?? []).map((f) => ({
            value: f.id,
            label: f.num_offre ? `${f.nom} — ${f.num_offre}` : f.nom,
          }))
        ),
      },
      {
        key: "statut_id" as const,
        label: "💬 Statut du commentaire",
        type: "select" as const,
        onChange: (val: CommentaireFiltresValues["statut_id"]) => handleStatutChange(val),
        options: withPlaceholder([
          { value: "actif", label: "Actif" },
          { value: "archive", label: "Archivé" },
          { value: "all", label: "Tous" },
        ]),
      },
      {
        key: "type_offre_id" as const,
        label: "📦 Type d’offre",
        type: "select" as const,
        options: withPlaceholder(toOptionsUnique(filtres.type_offres, "nom")),
      },
      ...(filtres.formation_etats && filtres.formation_etats.length
        ? [
            {
              key: "formation_etat" as const,
              label: "📚 État de formation",
              type: "select" as const,
              options: withPlaceholder(toOptionsUnique(filtres.formation_etats, "label")),
            } as FieldConfig<CommentaireFiltresValues>,
          ]
        : []),
      ...(filtres.auteurs && filtres.auteurs.length
        ? [
            {
              key: "auteur_id" as const,
              label: "✍️ Auteur",
              type: "select" as const,
              options: withPlaceholder(toOptionsUnique(filtres.auteurs, "nom")),
            } as FieldConfig<CommentaireFiltresValues>,
          ]
        : []),
    ];

    return baseFields;
  }, [filtres, handleStatutChange]);

  // ------------------------------------------------------
  // 🧭 Actions reset / refresh
  // ------------------------------------------------------
  const actions = useMemo(
    () => ({
      onReset: onReset ? onReset : () => onChange(defaultReset(values)),
      onRefresh,
      resetLabel: "Réinitialiser",
      refreshLabel: "Rafraîchir",
    }),
    [onReset, onRefresh, onChange, values]
  );

  // ------------------------------------------------------
  // 🧭 Affichage
  // ------------------------------------------------------
  if (!filtres) {
    return (
      <Box
        role="status"
        aria-live="polite"
        sx={{
          p: "0.75rem 1rem",
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 2,
          color: "text.secondary",
          bgcolor: "grey.50",
          mb: 2,
          textAlign: "center",
        }}
      >
        Chargement des filtres…
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <FilterTemplate<CommentaireFiltresValues>
        values={values}
        onChange={onChange}
        fields={fields}
        actions={actions}
        cols={3}
      />

      {/* --- Filtres additionnels : Archivés --- */}
      <Box
        sx={{
          mt: 1,
          p: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      ></Box>
    </Box>
  );
});
