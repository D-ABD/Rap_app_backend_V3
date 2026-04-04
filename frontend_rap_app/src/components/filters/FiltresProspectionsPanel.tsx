import React, { useMemo, useCallback } from "react";
import FilterTemplate, { type FieldConfig } from "../filters/FilterTemplate";
import type {
  ProspectionFiltresValues,
  Choice,
  ProspectionStatut,
  ProspectionObjectif,
  ProspectionMotif,
  ProspectionTypeProspection,
  ProspectionMoyenContact,
} from "../../types/prospection";
import { isCoreStaffRole } from "../../utils/roleGroups";

type Props = {
  filtres:
    | {
        statut: Choice<ProspectionStatut>[];
        objectif: Choice<ProspectionObjectif>[];
        motif: Choice<ProspectionMotif>[];
        type_prospection: Choice<ProspectionTypeProspection>[];
        moyen_contact: Choice<ProspectionMoyenContact>[];
        owners?: Choice<number>[];
        formations?: Choice<number>[];
        partenaires?: Choice<number>[];
        user_role?: string;

        // 🆕 listes pour les filtres formation
        formation_statut?: Choice<number>[];
        formation_type_offre?: Choice<number>[];
        centres?: Choice<number>[];
      }
    | undefined;
  values: ProspectionFiltresValues;
  onChange: (values: ProspectionFiltresValues) => void;
  onRefresh?: () => void;
  onReset?: () => void;
};

// 🔹 Placeholder pour garder un sélecteur visible/clair si liste vide
const withPlaceholder = (opts: Array<{ value: string | number; label: string }>) =>
  opts.length ? opts : [{ value: "", label: "—" }];

// 🔹 Supprime les doublons par value
function uniqueBy<T extends { value: string | number }>(arr: T[]): T[] {
  const seen = new Set();
  return arr.filter((item) => {
    if (seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });
}

export default React.memo(function FiltresProspectionsPanel({
  filtres,
  values,
  onChange,
  onRefresh,
  onReset,
}: Props) {
  // ⛑️ Normalise toutes les listes pour éviter .map sur undefined
  const safe = useMemo(
    () => ({
      statut: filtres?.statut ?? [],
      objectif: filtres?.objectif ?? [],
      motif: filtres?.motif ?? [],
      type_prospection: filtres?.type_prospection ?? [],
      moyen_contact: filtres?.moyen_contact ?? [],
      owners: filtres?.owners ?? [],
      formations: filtres?.formations ?? [],
      partenaires: filtres?.partenaires ?? [],
      user_role: filtres?.user_role ?? "",

      // 🆕
      formation_statut: filtres?.formation_statut ?? [],
      formation_type_offre: filtres?.formation_type_offre ?? [],
      centres: filtres?.centres ?? [],
    }),
    [filtres]
  );

  const canSeeOwners = useMemo(() => isCoreStaffRole(safe.user_role), [safe.user_role]);

  const defaultReset = useCallback(() => {
    onChange({
      ...values,
      search: "",
      partenaire: undefined,
      formation: undefined,
      statut: undefined,
      objectif: undefined,
      motif: undefined,
      type_prospection: undefined,
      moyen_contact: undefined,
      owner: undefined,
      date_min: undefined,
      date_max: undefined,

      // 🆕 reset des nouveaux filtres
      formation_statut: undefined,
      formation_type_offre: undefined,
      centre: undefined,
      activite: undefined, // ✅ reset du nouveau filtre
      avec_archivees: false, // ✅ reset explicite

      page: 1,
    });
  }, [onChange, values]);

  const fields = useMemo<FieldConfig<ProspectionFiltresValues>[]>(
    () => [
      {
        key: "search" as const,
        label: "🔎 Recherche",
        type: "text" as const,
        placeholder: "partenaire, tel, CP, ville, formation, centre, commentaire, owner…",
      },
      {
        key: "formation" as const,
        label: "🎓 Formation",
        type: "select" as const,
        hidden: safe.formations.length === 0,
        options: uniqueBy(
          safe.formations.map((o) => ({
            value: Number(o.value),
            label: o.label,
          }))
        ),
      },
      {
        key: "partenaire" as const,
        label: "🏢 Partenaire",
        type: "select" as const,
        hidden: safe.partenaires.length === 0,
        options: uniqueBy(
          safe.partenaires.map((o) => ({
            value: Number(o.value),
            label: o.label,
          }))
        ),
      },
      {
        key: "formation_type_offre" as const,
        label: "📦 Type d’offre",
        type: "select" as const,
        hidden: safe.formation_type_offre.length === 0,
        options: withPlaceholder(
          uniqueBy(
            safe.formation_type_offre.map((o) => ({
              value: Number(o.value),
              label: o.label,
            }))
          )
        ),
      },
      {
        key: "formation_statut" as const,
        label: "🏷️ Statut de la formation",
        type: "select" as const,
        hidden: safe.formation_statut.length === 0,
        options: withPlaceholder(
          uniqueBy(
            safe.formation_statut.map((o) => ({
              value: Number(o.value),
              label: o.label,
            }))
          )
        ),
      },
      {
        key: "centre" as const,
        label: "🏫 Centre",
        type: "select" as const,
        hidden: safe.centres.length === 0,
        options: withPlaceholder(
          uniqueBy(
            safe.centres.map((o) => ({
              value: Number(o.value),
              label: o.label,
            }))
          )
        ),
      },
      {
        key: "statut" as const,
        label: "📍 Statut",
        type: "select" as const,
        options: withPlaceholder(
          uniqueBy(
            safe.statut.map((o) => ({
              value: String(o.value),
              label: o.label,
            }))
          )
        ),
      },
      {
        key: "objectif" as const,
        label: "🎯 Objectif",
        type: "select" as const,
        options: withPlaceholder(
          uniqueBy(
            safe.objectif.map((o) => ({
              value: String(o.value),
              label: o.label,
            }))
          )
        ),
      },
      {
        key: "motif" as const,
        label: "📝 Motif",
        type: "select" as const,
        options: withPlaceholder(
          uniqueBy(safe.motif.map((o) => ({ value: String(o.value), label: o.label })))
        ),
      },
      {
        key: "type_prospection" as const,
        label: "🔄 Type de prospection",
        type: "select" as const,
        options: withPlaceholder(
          uniqueBy(
            safe.type_prospection.map((o) => ({
              value: String(o.value),
              label: o.label,
            }))
          )
        ),
      },
      {
        key: "moyen_contact" as const,
        label: "📞 Moyen de contact",
        type: "select" as const,
        options: withPlaceholder(
          uniqueBy(
            safe.moyen_contact.map((o) => ({
              value: String(o.value),
              label: o.label,
            }))
          )
        ),
      },
      {
        key: "owner" as const,
        label: "👤 Candidat",
        type: "select" as const,
        hidden: !canSeeOwners || safe.owners.length === 0,
        options: uniqueBy(safe.owners.map((o) => ({ value: Number(o.value), label: o.label }))),
      },
      { key: "date_min" as const, label: "📅 Date min", type: "date" as const },
      { key: "date_max" as const, label: "📅 Date max", type: "date" as const },

      // 🆕 Nouveau champ “Activité”
      {
        key: "activite" as const,
        label: "🗂 Activité",
        type: "select" as const,
        options: [
          { value: "", label: "Toutes" },
          { value: "active", label: "Actives uniquement" },
          { value: "archivee", label: "Archivées uniquement" },
        ],
        tooltip: "Filtrer par activité (active / archivée)",
      },

      // 🗃 Champ existant : Inclure les archivées
      {
        key: "avec_archivees" as const,
        label: "🗃 Inclure les archivées",
        type: "checkbox" as const,
        tooltip: "Afficher aussi les prospections archivées",
      },
    ],
    [safe, canSeeOwners]
  );

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
    <FilterTemplate<ProspectionFiltresValues>
      values={values}
      onChange={onChange}
      fields={fields}
      actions={actions}
      cols={3}
    />
  );
});
