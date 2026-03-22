// src/components/candidats/CandidatGroupedTableWidget.tsx
import * as React from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  Select,
  MenuItem,
  Button,
  useTheme,
} from "@mui/material";
import ArchiveIcon from "@mui/icons-material/Archive";
import {
  CandidatFilters,
  CandidatGroupBy,
  useCandidatGrouped,
  getErrorMessage,
} from "../../../types/candidatStats";

/* 🛠 Utils */
function fmt(n?: number | null): string {
  return n === undefined || n === null ? "—" : Math.round(n).toString();
}

function sum(rows: Record<string, unknown>[], field: string): number {
  return rows.reduce((s, r) => s + ((r[field] as number) || 0), 0);
}

/* 🎨 Couleurs + libellés pour contrat_signe */
const CONTRAT_SIGNE_LABELS: Record<string, string> = {
  oui: "Oui",
  non: "Non",
  en_cours: "En cours",
  signe: "Signé",
  valide: "Validé",
};

/* Résolution du label */
function resolveLabel(row: Record<string, unknown>, by: CandidatGroupBy): string {
  if (row.group_label && String(row.group_label).trim() !== "") return String(row.group_label);

  const numOffre = (row["formation__num_offre"] as string) ?? null;
  switch (by) {
    case "centre": {
      const nomCentre = row["formation__centre__nom"] as string | undefined;
      const idCentre = row["formation__centre_id"];
      const formationNom = row["formation__nom"] as string | undefined;
      const suffix = numOffre ? ` (${numOffre})` : formationNom ? ` (${formationNom})` : "";
      return nomCentre
        ? `${nomCentre}${suffix}`
        : idCentre != null
          ? `Centre #${idCentre}${suffix}`
          : `—${suffix}`;
    }
    case "departement":
      return (row["departement"] as string) ?? "—";
    case "formation": {
      const nomFormation = row["formation__nom"] as string | undefined;
      const idFormation = row["formation_id"];
      if (nomFormation && numOffre) return `${nomFormation} (${numOffre})`;
      if (nomFormation) return nomFormation;
      if (idFormation != null) return `Formation #${idFormation}`;
      return "—";
    }
    case "statut":
      return (row["statut"] as string) ?? "—";
    case "type_contrat":
      return (row["type_contrat"] as string) ?? "—";
    case "cv_statut":
      return (row["cv_statut"] as string) ?? "—";
    case "resultat_placement":
      return (row["resultat_placement"] as string) ?? "—";
    case "contrat_signe": {
      const value = row["contrat_signe"] as string | undefined;
      return value ? CONTRAT_SIGNE_LABELS[value] || value : "—";
    }
    case "responsable":
      return row["responsable_placement_id"] != null
        ? `User #${row["responsable_placement_id"]}`
        : "—";
    case "entreprise":
      return (
        (row["entreprise_placement__nom"] as string) ??
        (row["entreprise_placement_id"] != null
          ? `Entreprise #${row["entreprise_placement_id"]}`
          : "—")
      );
    default:
      return "—";
  }
}

/* 🎯 Composant principal */
export default function CandidatGroupedTableWidget({
  title = "Candidats — Détails groupés",
  defaultBy = "centre",
  defaultFilters,
  showControls = true,
  className,
}: {
  title?: string;
  defaultBy?: CandidatGroupBy;
  defaultFilters?: CandidatFilters;
  showControls?: boolean;
  className?: string;
}) {
  const theme = useTheme();
  const initial = React.useRef<CandidatFilters>(defaultFilters ?? {});
  const [by, setBy] = React.useState<CandidatGroupBy>(defaultBy);
  const [filters, setFilters] = React.useState<CandidatFilters>(initial.current);
  const [includeArchived, setIncludeArchived] = React.useState<boolean>(
    !!defaultFilters?.avec_archivees
  );

  const effectiveFilters = React.useMemo(
    () => ({ ...filters, avec_archivees: includeArchived }),
    [filters, includeArchived]
  );

  const { data, isLoading, error } = useCandidatGrouped(by, effectiveFilters);

  const handleReset = React.useCallback(() => {
    setFilters(initial.current);
    setIncludeArchived(!!defaultFilters?.avec_archivees);
  }, [defaultFilters]);

  const colorSuccess =
    theme.palette.mode === "dark" ? theme.palette.success.dark : theme.palette.success.light;
  const colorTotal =
    theme.palette.mode === "dark" ? theme.palette.grey[800] : theme.palette.grey[100];
  const colorHeader = theme.palette.mode === "dark" ? theme.palette.background.default : "#e3f2fd";

  return (
    <Card className={className}>
      <CardHeader
        title={
          <Typography variant="subtitle1" fontWeight="bold">
            {title}
          </Typography>
        }
        action={
          showControls && (
            <Box display="flex" gap={1} flexWrap="wrap">
              <Select
                size="small"
                value={by}
                onChange={(e) => setBy(e.target.value as CandidatGroupBy)}
              >
                <MenuItem value="centre">Par centre</MenuItem>
                <MenuItem value="departement">Par département</MenuItem>
                <MenuItem value="formation">Par formation</MenuItem>
                <MenuItem value="statut">Par statut</MenuItem>
                <MenuItem value="type_contrat">Par type de contrat</MenuItem>
                <MenuItem value="cv_statut">Par statut CV</MenuItem>
                <MenuItem value="resultat_placement">Par résultat placement</MenuItem>
                <MenuItem value="contrat_signe">Par contrat signé</MenuItem>
                <MenuItem value="responsable">Par responsable</MenuItem>
                <MenuItem value="entreprise">Par entreprise</MenuItem>
              </Select>

              <Button
                size="small"
                variant={includeArchived ? "contained" : "outlined"}
                color={includeArchived ? "secondary" : "inherit"}
                onClick={() => setIncludeArchived((v) => !v)}
                startIcon={<ArchiveIcon fontSize="small" />}
              >
                {includeArchived ? "Retirer formations archivées" : "Ajouter formations archivées"}
              </Button>

              <Button size="small" variant="outlined" onClick={handleReset}>
                Réinitialiser
              </Button>
            </Box>
          )
        }
      />

      <CardContent sx={{ overflowX: "auto", maxHeight: "65vh" }}>
        {isLoading ? (
          <Typography color="text.secondary">Chargement…</Typography>
        ) : error ? (
          <Typography color="error.main">Erreur : {getErrorMessage(error)}</Typography>
        ) : (
          data && (
            <>
              <Box
                component="table"
                sx={{
                  minWidth: 1650,
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: "0.85rem",
                  "& th": {
                    position: "sticky",
                    top: 0,
                    bgcolor: colorHeader,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    fontWeight: "bold",
                    fontSize: "0.8rem",
                    textAlign: "right",
                    p: 1,
                  },
                  "& th:first-of-type, & td:first-of-type": {
                    textAlign: "left",
                    position: "sticky",
                    left: 0,
                    bgcolor: "background.paper",
                    fontWeight: 500,
                  },
                  "& td": {
                    borderTop: "1px solid",
                    borderColor: "divider",
                    p: 1,
                    textAlign: "right",
                  },
                }}
              >
                <thead>
                  <tr>
                    <th>Groupe</th>
                    <th>Candidats</th>
                    <th>Admissibles</th>
                    <th>En appairage</th>
                    <th>Inscrits GESPERS</th>
                    <th>Contrat signé</th>
                    <th>Apprentissage</th>
                    <th>Professionnalisation</th>
                    <th>POEI/POEC</th>
                    <th>CRIF</th>
                    <th>Sans contrat</th>
                    <th>Autres contrats</th>
                    <th>OSIA</th>
                    <th>Entretiens OK</th>
                    <th>Tests OK</th>
                    <th>En formation</th>
                    <th>RQTH</th>
                    <th>Courriers rentrée</th>
                  </tr>
                </thead>

                <tbody>
                  {data.results.map((r: Record<string, unknown>, idx: number) => {
                    const label = resolveLabel(r, by);
                    return (
                      <tr key={idx}>
                        <td>{label}</td>
                        <td>{fmt(r["total"] as number)}</td>
                        <td>{fmt(r["admissibles"] as number)}</td>
                        <td>{fmt(r["en_appairage"] as number)}</td>
                        <td>{fmt(r["gespers"] as number)}</td>
                        <td style={{ background: colorSuccess, fontWeight: 600 }}>
                          {fmt(r["app_contrat_a_signer"] as number)}
                        </td>
                        <td>{fmt(r["contrat_apprentissage"] as number)}</td>
                        <td>{fmt(r["contrat_professionnalisation"] as number)}</td>
                        <td>{fmt(r["contrat_poei_poec"] as number)}</td>
                        <td>{fmt(r["contrat_crif"] as number)}</td>
                        <td>{fmt(r["contrat_sans"] as number)}</td>
                        <td>{fmt(r["contrat_autre"] as number)}</td>
                        <td>{fmt(r["osia_count"] as number)}</td>
                        <td>{fmt(r["entretien_ok"] as number)}</td>
                        <td>{fmt(r["test_ok"] as number)}</td>
                        <td>{fmt(r["en_formation"] as number)}</td>
                        <td>{fmt(r["rqth_count"] as number)}</td>
                        <td>{fmt(r["courrier_rentree_count"] as number)}</td>
                      </tr>
                    );
                  })}

                  {data.results.length > 0 && (
                    <tr style={{ fontWeight: "bold", background: colorTotal }}>
                      <td>Total</td>
                      <td>{fmt(sum(data.results, "total"))}</td>
                      <td>{fmt(sum(data.results, "admissibles"))}</td>
                      <td>{fmt(sum(data.results, "en_appairage"))}</td>
                      <td>{fmt(sum(data.results, "gespers"))}</td>
                      <td>{fmt(sum(data.results, "app_contrat_a_signer"))}</td>
                      <td>{fmt(sum(data.results, "contrat_apprentissage"))}</td>
                      <td>{fmt(sum(data.results, "contrat_professionnalisation"))}</td>
                      <td>{fmt(sum(data.results, "contrat_poei_poec"))}</td>
                      <td>{fmt(sum(data.results, "contrat_crif"))}</td>
                      <td>{fmt(sum(data.results, "contrat_sans"))}</td>
                      <td>{fmt(sum(data.results, "contrat_autre"))}</td>
                      <td>{fmt(sum(data.results, "osia_count"))}</td>
                      <td>{fmt(sum(data.results, "entretien_ok"))}</td>
                      <td>{fmt(sum(data.results, "test_ok"))}</td>
                      <td>{fmt(sum(data.results, "en_formation"))}</td>
                      <td>{fmt(sum(data.results, "rqth_count"))}</td>
                      <td>{fmt(sum(data.results, "courrier_rentree_count"))}</td>
                    </tr>
                  )}
                </tbody>
              </Box>

              {data.results.length === 0 && (
                <Typography sx={{ p: 2, fontSize: "0.9rem" }} color="text.secondary">
                  Aucun résultat pour les filtres sélectionnés.
                </Typography>
              )}
            </>
          )
        )}
      </CardContent>
    </Card>
  );
}
