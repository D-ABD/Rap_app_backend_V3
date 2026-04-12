import * as React from "react";
import {
  Card,
  Typography,
  Box,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableFooter,
  Button,
  FormControl,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { AppTheme } from "../../../theme";
import ArchiveIcon from "@mui/icons-material/Archive";
import {
  Filters,
  GroupBy,
  getFormationCandidateSansStatutCount,
  useFormationGrouped,
  useFormationDictionaries,
  resolveGroupLabel,
  GroupRow,
} from "../../../types/formationStats";

function toFixed0(n?: number | null) {
  return n == null ? "—" : Math.round(n).toString();
}

function formatPercent(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n > 0 && n < 1) return `${n.toFixed(2)}%`;
  if (n < 10) return `${n.toFixed(1).replace(/\.0$/, "")}%`;
  return `${Math.round(n)}%`;
}

const COLUMNS = [
  "Formations",
  "Places CRIF",
  "Inscrits saisis CRIF",
  "Places MP",
  "Inscrits saisis MP",
  "Dispo",
  "Saturation GESPERS",
  "Entrées (formations)",
  "Événements",
  "Prospections",
  "Candidats",
  "Sans statut métier",
  "Admissibles",
  "Non admissibles",
  "Entretiens OK",
  "Tests OK",
  "En accompagnement TRE",
  "En appairage",
  "Inscrits GESPERS",
  "Ecart saisis / GESPERS",
  "Sortie / fin de formation",
  "Abandons",
  "Contrats Appr.",
  "Contrats Prof.",
  "Contrats POEI/POEC",
  "Contrats Autres",
  "Appairages en cours",
  "Appairages OK",
  "Appairages En attente",
  "Appairages À faire",
];

export default function FormationGroupedWidget({
  title = "Détails des formations",
  initialBy = "centre",
  filters = {},
}: {
  title?: string;
  initialBy?: GroupBy;
  filters?: Filters;
}) {
  const theme = useTheme<AppTheme>();
  const [by, setBy] = React.useState<GroupBy>(initialBy);
  const [includeArchived, setIncludeArchived] = React.useState<boolean>(!!filters?.avec_archivees);
  const [localFilters, setLocalFilters] = React.useState<Filters>(filters);

  const effectiveFilters = React.useMemo(
    () => ({ ...localFilters, avec_archivees: includeArchived }),
    [localFilters, includeArchived]
  );

  const { data: dicts, isLoading: isLoadingDicts, error: dictError } = useFormationDictionaries();
  const { data, isLoading, error } = useFormationGrouped(by, effectiveFilters);
  const tableHeaderBackground =
    theme.palette.mode === "light"
      ? theme.custom.table.header.background.light
      : theme.custom.table.header.background.dark;
  const tableRowStripedBackground =
    theme.palette.mode === "light"
      ? theme.custom.table.row.stripedEven.light
      : theme.custom.table.row.stripedEven.dark;
  const tableRowHoverBackground =
    theme.palette.mode === "light"
      ? theme.custom.table.row.hover.light
      : theme.custom.table.row.hover.dark;

  const totals = React.useMemo(() => {
    if (!data?.results?.length) return null;
    const sum = (key: keyof GroupRow) =>
      data.results.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);

    const totalPlaces =
      data.results.reduce((acc, row) => acc + (Number(row.total_places) || 0), 0);
    const totalGespers =
      data.results.reduce((acc, row) => acc + (Number(row.nb_inscrits_gespers) || 0), 0);
    const moyenneSaturation = totalPlaces > 0 ? (100 * totalGespers) / totalPlaces : 0;

    return {
      nbFormations: sum("nb_formations"),
      totalPlacesCrif: sum("total_places_crif"),
      totalInscritsCrif: sum("total_inscrits_crif"),
      totalPlacesMp: sum("total_places_mp"),
      totalInscritsMp: sum("total_inscrits_mp"),
      totalDispo: sum("total_disponibles"),
      moyenneSaturation,
      totalEntrees: sum("entrees_formation"),
      totalEvenements: sum("nb_evenements"),
      totalProspections: sum("nb_prospections"),
      totalCandidats: sum("nb_candidats"),
      totalSansStatut: data.results.reduce(
        (acc, row) => acc + getFormationCandidateSansStatutCount(row),
        0
      ),
      totalAdmissibles: sum("nb_candidats_admissibles"),
      totalNonAdmissibles: sum("nb_candidats_non_admissibles"),
      totalEntretien: sum("nb_entretien_ok"),
      totalTest: sum("nb_test_ok"),
      totalAccompagnementTre: sum("nb_en_accompagnement_tre"),
      totalEnAppairage: sum("nb_en_appairage"),
      totalGespers,
      totalEcartInscrits: sum("ecart_inscrits_vs_gespers"),
      totalSortis: sum("nb_sortis"),
      totalAbandons: sum("nb_abandons_phase"),
      totalAppr: sum("nb_contrats_apprentissage"),
      totalProf: sum("nb_contrats_professionnalisation"),
      totalPoeiPoec: sum("nb_contrats_poei_poec"),
      totalAutres: sum("nb_contrats_autres"),
      totalAppTotal: sum("app_total"),
      totalAppOk: sum("app_appairage_ok"),
      totalAppAttente: sum("app_en_attente"),
      totalAppAFaire: sum("app_a_faire"),
    };
  }, [data]);

  if (dictError) {
    return (
      <Card sx={{ p: 3 }}>
        <Alert severity="error">{(dictError as Error).message}</Alert>
      </Card>
    );
  }

  if (isLoadingDicts) {
    return (
      <Card sx={{ p: 3, textAlign: "center" }}>
        <CircularProgress size={24} />
      </Card>
    );
  }

  return (
    <Card sx={{ p: 2, width: "100%" }}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        mb={2}
        gap={1.5}
      >
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>

        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
          <Select
            size="small"
            value={by}
            onChange={(e) => setBy(e.target.value as GroupBy)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="formation">Par formation</MenuItem>
            <MenuItem value="centre">Par centre</MenuItem>
            <MenuItem value="departement">Par département</MenuItem>
            <MenuItem value="type_offre">Par type d’offre</MenuItem>
            <MenuItem value="statut">Par statut</MenuItem>
          </Select>

          <Button
            size="small"
            variant={includeArchived ? "contained" : "outlined"}
            color={includeArchived ? "secondary" : "inherit"}
            onClick={() => setIncludeArchived((v) => !v)}
            startIcon={<ArchiveIcon fontSize="small" />}
          >
            {includeArchived ? "Retirer archivées" : "Ajouter archivées"}
          </Button>
        </Box>
      </Box>

      {/* Filtres multiples */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        {/* Centre */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={localFilters.centre ?? ""}
            onChange={(e) =>
              setLocalFilters((f) => ({ ...f, centre: e.target.value || undefined }))
            }
            displayEmpty
            disabled={!dicts}
          >
            <MenuItem value="">Tous centres</MenuItem>
            {dicts &&
              Object.entries(dicts.centresById).map(([id, label]) => (
                <MenuItem key={id} value={id}>
                  {label}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        {/* Type d’offre */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={localFilters.type_offre ?? ""}
            onChange={(e) =>
              setLocalFilters((f) => ({ ...f, type_offre: e.target.value || undefined }))
            }
            displayEmpty
            disabled={!dicts}
          >
            <MenuItem value="">Tous types d’offre</MenuItem>
            {dicts &&
              Object.entries(dicts.typeOffreById).map(([id, label]) => (
                <MenuItem key={id} value={id}>
                  {label}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        {/* Statut */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={localFilters.statut ?? ""}
            onChange={(e) =>
              setLocalFilters((f) => ({ ...f, statut: e.target.value || undefined }))
            }
            displayEmpty
            disabled={!dicts}
          >
            <MenuItem value="">Tous statuts</MenuItem>
            {dicts &&
              Object.entries(dicts.statutById).map(([id, label]) => (
                <MenuItem key={id} value={id}>
                  {label}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        {/* Bouton reset */}
        <Button
          size="small"
          variant="outlined"
          onClick={() => setLocalFilters({ ...(filters ?? {}), avec_archivees: includeArchived })}
        >
          Réinitialiser
        </Button>
      </Box>

      {/* Contenu */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      ) : error ? (
        <Alert severity="error">{(error as Error).message}</Alert>
      ) : !data ? null : (
        <Box sx={{ overflowX: "auto", maxHeight: { xs: "50vh", md: "65vh" } }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    backgroundColor: tableHeaderBackground,
                    fontWeight: "bold",
                  }}
                >
                  Groupe
                </TableCell>
                {COLUMNS.map((col) => (
                  <TableCell
                    key={col}
                    align="right"
                    sx={{
                      backgroundColor: tableHeaderBackground,
                      fontWeight: "bold",
                      fontSize: "0.8rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {data.results.map((r, idx) => {
                let label = resolveGroupLabel(r, by, dicts);
                if (by === "formation" && r.num_offre) label += ` (${r.num_offre})`;

                const isEven = idx % 2 === 0;
                const saturation = r.taux_saturation ?? 0;
                const saturationColor =
                  saturation < 50
                    ? "success.main"
                    : saturation < 80
                      ? "warning.main"
                      : "error.main";

                return (
                  <TableRow
                    key={idx}
                    sx={{
                      backgroundColor: isEven ? "background.default" : tableRowStripedBackground,
                      "&:hover": { backgroundColor: tableRowHoverBackground },
                    }}
                  >
                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 0,
                        backgroundColor: isEven ? "background.default" : tableRowStripedBackground,
                        zIndex: 1,
                        fontWeight: 500,
                        minWidth: 180,
                        maxWidth: 240,
                        overflowWrap: "break-word", // ✅ autorise les sauts de ligne
                        wordBreak: "break-word", // ✅ coupe si nécessaire
                        whiteSpace: "normal", // ✅ permet le retour à la ligne
                      }}
                    >
                      <Typography variant="body2" sx={{ lineHeight: 1.3 }}>
                        {label}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">{toFixed0(r.nb_formations)}</TableCell>
                    <TableCell align="right">{toFixed0(r.total_places_crif)}</TableCell>
                    <TableCell align="right">{toFixed0(r.total_inscrits_crif)}</TableCell>
                    <TableCell align="right">{toFixed0(r.total_places_mp)}</TableCell>
                    <TableCell align="right">{toFixed0(r.total_inscrits_mp)}</TableCell>
                    <TableCell align="right">{toFixed0(r.total_disponibles)}</TableCell>
                    <TableCell align="right" sx={{ color: saturationColor, fontWeight: 600 }}>
                      {formatPercent(saturation)}
                    </TableCell>
                    <TableCell align="right">{toFixed0(r.entrees_formation)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_evenements)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_prospections)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_candidats)}</TableCell>
                    <TableCell align="right">
                      {toFixed0(getFormationCandidateSansStatutCount(r))}
                    </TableCell>
                    <TableCell align="right">{toFixed0(r.nb_candidats_admissibles)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_candidats_non_admissibles)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_entretien_ok)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_test_ok)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_en_accompagnement_tre)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_en_appairage)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_inscrits_gespers)}</TableCell>
                    <TableCell align="right">{toFixed0(r.ecart_inscrits_vs_gespers)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_sortis)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_abandons_phase)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_contrats_apprentissage)}</TableCell>
                    <TableCell align="right">
                      {toFixed0(r.nb_contrats_professionnalisation)}
                    </TableCell>
                    <TableCell align="right">{toFixed0(r.nb_contrats_poei_poec)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_contrats_autres)}</TableCell>
                    <TableCell align="right">{toFixed0(r.app_total)}</TableCell>
                    <TableCell align="right">{toFixed0(r.app_appairage_ok)}</TableCell>
                    <TableCell align="right">{toFixed0(r.app_en_attente)}</TableCell>
                    <TableCell align="right">{toFixed0(r.app_a_faire)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>

            {totals && (
              <TableFooter>
                <TableRow
                  sx={{
                    backgroundColor:
                      theme.palette.mode === "light"
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.primary.main, 0.16),
                    fontWeight: "bold",
                  }}
                >
                  <TableCell sx={{ fontWeight: 700 }}>TOTAL</TableCell>
                  <TableCell align="right">{toFixed0(totals.nbFormations)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalPlacesCrif)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalInscritsCrif)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalPlacesMp)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalInscritsMp)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalDispo)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {formatPercent(totals.moyenneSaturation)}
                  </TableCell>
                <TableCell align="right">{toFixed0(totals.totalEntrees)}</TableCell>
                <TableCell align="right">{toFixed0(totals.totalEvenements)}</TableCell>
                <TableCell align="right">{toFixed0(totals.totalProspections)}</TableCell>
                <TableCell align="right">{toFixed0(totals.totalCandidats)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalSansStatut)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalAdmissibles)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalNonAdmissibles)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalEntretien)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalTest)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalAccompagnementTre)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalEnAppairage)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalGespers)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalEcartInscrits)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalSortis)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalAbandons)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalAppr)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalProf)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalPoeiPoec)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalAutres)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalAppTotal)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalAppOk)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalAppAttente)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalAppAFaire)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </Box>
      )}
    </Card>
  );
}
