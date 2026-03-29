import { useMemo } from "react";
import { Box } from "@mui/material";
import FilterTemplate, { type FieldConfig } from "./FilterTemplate";
import type { FiltresFormationsData, FiltresFormationsValues } from "../../types/formation";

type Props = {
  filtres: FiltresFormationsData | null;
  values: FiltresFormationsValues;
  onChange: (values: FiltresFormationsValues) => void;
  onReset?: () => void;
  onRefresh?: () => void;
};

// 🔹 utilitaire : unique + format {value,label}
function toOptionsUnique<T extends { id: number; nom: string }>(arr: T[] = []) {
  const seen = new Set<number>();
  return arr.reduce<Array<{ value: number; label: string }>>((acc, item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      acc.push({ value: item.id, label: item.nom });
    }
    return acc;
  }, []);
}

// 🔹 placeholder si liste vide
const withPlaceholder = (opts: Array<{ value: string | number; label: string }>) =>
  opts.length ? opts : [{ value: "", label: "—" }];

// 🔹 reset par défaut
function buildReset(values: FiltresFormationsValues): FiltresFormationsValues {
  return {
    ...values,
    texte: "",
    centre: undefined,
    statut: undefined,
    annee: undefined,
    type_offre: undefined,
    activite: undefined,
    dans: undefined, // 👈 nouveau filtre “période à venir”
    date_debut: undefined,
    date_fin: undefined,
    places_disponibles: false,
    tri: undefined,
    avec_archivees: false,
    page: 1,
  };
}

export default function FiltresFormationsPanel({
  filtres,
  values,
  onChange,
  onReset,
  onRefresh,
}: Props) {
  // 🧩 Construction dynamique des filtres
  const fields = useMemo<Array<FieldConfig<FiltresFormationsValues>>>(() => {
    if (!filtres) return [];

    return [
      {
        key: "centre",
        label: "🏫 Centre",
        type: "select",
        options: withPlaceholder(toOptionsUnique(filtres.centres)),
      },
      {
        key: "statut",
        label: "📍 Statut",
        type: "select",
        options: withPlaceholder(toOptionsUnique(filtres.statuts)),
      },
      {
        key: "type_offre",
        label: "📦 Type d'offre",
        type: "select",
        options: withPlaceholder(toOptionsUnique(filtres.type_offres)),
      },
      // ⏳ Nouveau filtre : période à venir
      {
        key: "dans" as const,
        label: "⏳ Période à venir",
        type: "select",
        tooltip: "Filtrer les formations à venir (dans les 4 semaines, 3 mois, etc.)",
        options: withPlaceholder([
          { value: "", label: "Toutes les périodes" },
          ...(filtres.periodes_a_venir?.map((p) => ({
            value: p.code,
            label: p.libelle,
          })) ?? []),
        ]),
      },

      {
        key: "annee" as const,
        label: "📆 Année",
        type: "select",
        options: [
          { value: "", label: "Toutes les années" },
          { value: 2023, label: "2023" },
          { value: 2024, label: "2024" },
          { value: 2025, label: "2025" },
          { value: 2026, label: "2026" },
        ],
      },

      // ⚙️ Filtre dynamique selon l’activité renvoyée par le backend
      {
        key: "activite" as const,
        label: "⚙️ Activité",
        type: "select",
        tooltip: "Filtrer selon l’état de la formation",
        options: withPlaceholder([
          { value: "", label: "Toutes" },
          ...(filtres.activites?.map((a) => ({
            value: a.code,
            label: a.libelle,
          })) ?? []),
        ]),
      },
      {
        key: "date_debut" as const,
        label: "📅 Débute après",
        type: "date",
      },
      {
        key: "date_fin" as const,
        label: "🏁 Finit avant",
        type: "date",
      },
      {
        key: "tri" as const,
        label: "↕️ Trier par",
        type: "select",
        options: [
          { value: "start_date", label: "Date de début croissante" },
          { value: "-start_date", label: "Date de début décroissante" },
          { value: "end_date", label: "Date de fin croissante" },
          { value: "-end_date", label: "Date de fin décroissante" },
          { value: "nom", label: "Nom A-Z" },
          { value: "-nom", label: "Nom Z-A" },
          { value: "centre__nom", label: "Centre A-Z" },
          { value: "-centre__nom", label: "Centre Z-A" },
          { value: "created_at", label: "Création ancienne -> récente" },
          { value: "-created_at", label: "Création récente -> ancienne" },
        ],
      },
      // 🗃️ Inclure les archivées (option de compatibilité)
      {
        key: "avec_archivees" as const,
        label: "🗃️ Inclure les archivées",
        type: "checkbox",
        tooltip: "Afficher aussi les formations archivées dans la liste",
      },
      {
        key: "places_disponibles" as const,
        label: "🪑 Seulement avec places disponibles",
        type: "checkbox",
      },
    ];
  }, [filtres]);

  // 🔁 Boutons d’action
  const actions = useMemo(
    () => ({
      onReset:
        onReset ??
        (() => {
          onChange(buildReset(values));
        }),
      onRefresh,
      resetLabel: "Réinitialiser",
      refreshLabel: "Rafraîchir",
    }),
    [onReset, onRefresh, onChange, values]
  );

  const ready = Boolean(filtres);

  if (!ready) {
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
    <Box>
      <FilterTemplate<FiltresFormationsValues>
        values={values}
        onChange={(next) => onChange({ ...next, page: 1 })}
        fields={fields}
        actions={actions}
        cols={4}
      />
    </Box>
  );
}
