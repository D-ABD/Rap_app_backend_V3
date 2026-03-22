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
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArchiveIcon from "@mui/icons-material/Archive";
import {
  Filters,
  GroupBy,
  useFormationGrouped,
  useFormationDictionaries,
  resolveGroupLabel,
  GroupRow,
} from "../../../types/formationStats";

function toFixed0(n?: number | null) {
  return n == null ? "—" : Math.round(n).toString();
}

const COLUMNS = [
  "Formations",
  "Places CRIF",
  "Inscrits CRIF",
  "Places MP",
  "Inscrits MP",
  "Dispo",
  "Saturation",
  "Entrées (formations)",
  "Candidats",
  "Admissibles",
  "Entretiens OK",
  "Tests OK",
  "Inscrits GESPERS",
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
  const [by, setBy] = React.useState<GroupBy>(initialBy);
  const [includeArchived, setIncludeArchived] = React.useState<boolean>(!!filters?.avec_archivees);
  const [localFilters, setLocalFilters] = React.useState<Filters>(filters);

  const effectiveFilters = React.useMemo(
    () => ({ ...localFilters, avec_archivees: includeArchived }),
    [localFilters, includeArchived]
  );

  const { data: dicts, isLoading: isLoadingDicts, error: dictError } = useFormationDictionaries();
  const { data, isLoading, error } = useFormationGrouped(by, effectiveFilters);

  const totals = React.useMemo(() => {
    if (!data?.results?.length) return null;
    const sum = (key: keyof GroupRow) =>
      data.results.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);

    const moyenneSaturation =
      data.results.reduce((acc, r) => acc + (Number(r.taux_saturation) || 0), 0) /
      data.results.length;

    return {
      nbFormations: sum("nb_formations"),
      totalPlacesCrif: sum("total_places_crif"),
      totalInscritsCrif: sum("total_inscrits_crif"),
      totalPlacesMp: sum("total_places_mp"),
      totalInscritsMp: sum("total_inscrits_mp"),
      totalDispo: sum("total_disponibles"),
      moyenneSaturation,
      totalEntrees: sum("entrees_formation"),
      totalCandidats: sum("nb_candidats"),
      totalAdmissibles: sum("nb_admissibles"),
      totalEntretien: sum("nb_entretien_ok"),
      totalTest: sum("nb_test_ok"),
      totalGespers: sum("nb_inscrits_gespers"),
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
                    backgroundColor: "primary.light",
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
                      backgroundColor: "primary.light",
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
                      backgroundColor: isEven ? "background.default" : "grey.50",
                      "&:hover": { backgroundColor: "action.hover" },
                    }}
                  >
                    <TableCell
                      sx={{
                        position: "sticky",
                        left: 0,
                        backgroundColor: isEven ? "background.default" : "grey.50",
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
                      {Math.round(saturation)}%
                    </TableCell>
                    <TableCell align="right">{toFixed0(r.entrees_formation)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_candidats)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_admissibles)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_entretien_ok)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_test_ok)}</TableCell>
                    <TableCell align="right">{toFixed0(r.nb_inscrits_gespers)}</TableCell>
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
                <TableRow sx={{ backgroundColor: alpha("#1976d2", 0.1), fontWeight: "bold" }}>
                  <TableCell sx={{ fontWeight: 700 }}>TOTAL</TableCell>
                  <TableCell align="right">{toFixed0(totals.nbFormations)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalPlacesCrif)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalInscritsCrif)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalPlacesMp)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalInscritsMp)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalDispo)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {Math.round(totals.moyenneSaturation)}%
                  </TableCell>
                  <TableCell align="right">{toFixed0(totals.totalEntrees)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalCandidats)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalAdmissibles)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalEntretien)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalTest)}</TableCell>
                  <TableCell align="right">{toFixed0(totals.totalGespers)}</TableCell>
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
