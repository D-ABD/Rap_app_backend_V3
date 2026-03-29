import { useMemo } from "react";
import FilterTemplate, { type FieldConfig } from "./FilterTemplate";

export type CerfaFiltresValues = {
  search?: string;
  centre?: string;
  cerfa_type?: string;
  type_contrat_code?: string;
  auto_generated?: string;
  date_field?: "created_at" | "date_conclusion" | "date_debut_execution" | "formation_debut";
  date_from?: string;
  date_to?: string;
};

type CentreOption = {
  id: number;
  nom: string;
};

type Props = {
  centres?: CentreOption[];
  values: CerfaFiltresValues;
  onChange: (values: CerfaFiltresValues) => void;
  onRefresh?: () => void;
};

function buildReset(values: CerfaFiltresValues): CerfaFiltresValues {
  return {
    ...values,
    search: "",
    centre: "",
    cerfa_type: "",
    type_contrat_code: "",
    auto_generated: "",
    date_field: "created_at",
    date_from: "",
    date_to: "",
  };
}

export default function FiltresCerfaPanel({ centres = [], values, onChange, onRefresh }: Props) {
  const fields = useMemo<Array<FieldConfig<CerfaFiltresValues>>>(() => {
    return [
      {
        key: "centre",
        label: "Centre",
        type: "select",
        options: centres.map((centre) => ({
          value: String(centre.id),
          label: centre.nom,
        })),
      },
      {
        key: "cerfa_type",
        label: "Type de contrat",
        type: "select",
        options: [
          { value: "apprentissage", label: "Contrat apprentissage" },
          { value: "professionnalisation", label: "Contrat de professionnalisation" },
        ],
      },
      {
        key: "type_contrat_code",
        label: "Type contrat CERFA",
        type: "select",
        options: [
          { value: "11", label: "11 - Premier contrat d'apprentissage" },
          { value: "21", label: "21 - Nouveau contrat, meme employeur" },
          { value: "22", label: "22 - Nouveau contrat, autre employeur" },
          { value: "23", label: "23 - Nouveau contrat apres rupture" },
          { value: "31", label: "31 - Situation juridique modifiee" },
          { value: "32", label: "32 - Contrat saisonnier" },
          { value: "33", label: "33 - Prolongation suite a echec" },
          { value: "34", label: "34 - Prolongation suite a RQTH" },
          { value: "35", label: "35 - Diplome supplementaire" },
          { value: "36", label: "36 - Autres changements" },
          { value: "37", label: "37 - Modification du lieu d'execution" },
          { value: "38", label: "38 - Modification du lieu principal de formation" },
        ],
      },
      {
        key: "auto_generated",
        label: "Origine",
        type: "select",
        options: [
          { value: "true", label: "Pre-rempli automatiquement" },
          { value: "false", label: "Saisi manuellement" },
        ],
      },
      {
        key: "date_field",
        label: "Periode sur",
        type: "select",
        options: [
          { value: "created_at", label: "Date de creation" },
          { value: "date_conclusion", label: "Date de conclusion" },
          { value: "date_debut_execution", label: "Date debut execution" },
          { value: "formation_debut", label: "Date debut formation" },
        ],
      },
      {
        key: "date_from",
        label: "Du",
        type: "date",
      },
      {
        key: "date_to",
        label: "Au",
        type: "date",
      },
    ];
  }, [centres]);

  return (
    <FilterTemplate<CerfaFiltresValues>
      values={values}
      onChange={onChange}
      fields={fields}
      actions={{
        onReset: () => onChange(buildReset(values)),
        onRefresh,
        resetLabel: "Reinitialiser",
        refreshLabel: "Rafraichir",
      }}
      cols={4}
    />
  );
}
