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
import type { AppTheme } from "../../../theme";
import {
  CandidatFilters,
  CandidatGroupBy,
  getCandidatSansStatutCount,
  useCandidatGrouped,
  getErrorMessage,
  resolveCandidatGroupLabel,
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
  const base = resolveCandidatGroupLabel(row as never, by);
  const numOffre = (row["formation__num_offre"] as string) ?? null;

  if (by === "centre") {
    const formationNom = row["formation__nom"] as string | undefined;
    const suffix = numOffre ? ` (${numOffre})` : formationNom ? ` (${formationNom})` : "";
    return `${base}${suffix}`;
  }

  if (by === "formation" && numOffre && base !== "—") {
    return `${base} (${numOffre})`;
  }

  if (by === "contrat_signe") {
    const value = row["contrat_signe"] as string | undefined;
    return value ? CONTRAT_SIGNE_LABELS[value] || value : "—";
  }

  return base;
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
  const theme = useTheme<AppTheme>();
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
    theme.palette.mode === "light"
      ? theme.custom.table.row.stripedEven.light
      : theme.custom.table.row.stripedEven.dark;
  const colorHeader =
    theme.palette.mode === "light"
      ? theme.custom.table.header.background.light
      : theme.custom.table.header.background.dark;

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
                <MenuItem value="statut_metier">Par statut métier</MenuItem>
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
                    <th>Sans statut métier</th>
                    <th>Admissibles</th>
                    <th>Non admissibles</th>
                    <th>En accompagnement TRE</th>
                    <th>En appairage</th>
                    <th>Inscrits GESPERS</th>
                    <th>Sortie / fin de formation</th>
                    <th>Abandons</th>
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
                        <td>
                          {fmt(
                            getCandidatSansStatutCount({
                              total: (r["total"] as number) ?? 0,
                              admissibles: (r["admissibles"] as number) ?? 0,
                              non_admissibles: (r["non_admissibles"] as number) ?? 0,
                              en_formation: (r["en_formation"] as number) ?? 0,
                              en_appairage: (r["en_appairage"] as number) ?? 0,
                              en_accompagnement: (r["en_accompagnement"] as number) ?? 0,
                              inscrits_gespers: (r["inscrits_gespers"] as number) ?? 0,
                              sortis: (r["sortis"] as number) ?? 0,
                              abandons_phase: (r["abandons_phase"] as number) ?? 0,
                            })
                          )}
                        </td>
                        <td>{fmt(r["admissibles"] as number)}</td>
                        <td>{fmt(r["non_admissibles"] as number)}</td>
                        <td>{fmt(r["en_accompagnement"] as number)}</td>
                        <td>{fmt(r["en_appairage"] as number)}</td>
                        <td>{fmt(r["inscrits_gespers"] as number)}</td>
                        <td>{fmt(r["sortis"] as number)}</td>
                        <td>{fmt(r["abandons_phase"] as number)}</td>
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
                      <td>
                        {fmt(
                          data.results.reduce(
                            (acc, row) =>
                              acc +
                              getCandidatSansStatutCount({
                                total: (row["total"] as number) ?? 0,
                                admissibles: (row["admissibles"] as number) ?? 0,
                                non_admissibles: (row["non_admissibles"] as number) ?? 0,
                                en_formation: (row["en_formation"] as number) ?? 0,
                                en_appairage: (row["en_appairage"] as number) ?? 0,
                                en_accompagnement: (row["en_accompagnement"] as number) ?? 0,
                                inscrits_gespers: (row["inscrits_gespers"] as number) ?? 0,
                                sortis: (row["sortis"] as number) ?? 0,
                                abandons_phase: (row["abandons_phase"] as number) ?? 0,
                              }),
                            0
                          )
                        )}
                      </td>
                      <td>{fmt(sum(data.results, "admissibles"))}</td>
                      <td>{fmt(sum(data.results, "non_admissibles"))}</td>
                      <td>{fmt(sum(data.results, "en_accompagnement"))}</td>
                      <td>{fmt(sum(data.results, "en_appairage"))}</td>
                      <td>{fmt(sum(data.results, "inscrits_gespers"))}</td>
                      <td>{fmt(sum(data.results, "sortis"))}</td>
                      <td>{fmt(sum(data.results, "abandons_phase"))}</td>
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
