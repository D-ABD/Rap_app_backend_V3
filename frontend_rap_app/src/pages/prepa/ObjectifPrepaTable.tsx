// -----------------------------------------------------------------------------
// 📊 ObjectifPrepaTable — version corrigée et complète (PREPA)
// -----------------------------------------------------------------------------
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  useTheme,
} from "@mui/material";
import { useState } from "react";
import type { ObjectifPrepa } from "src/types/prepa";
import ObjectifsPrepaDetailModal from "./ObjectifsPrepaDetailModal";
import type { AppTheme } from "../../theme";

interface Props {
  data: ObjectifPrepa[];
}

export default function ObjectifPrepaTable({ data }: Props) {
  const theme = useTheme<AppTheme>();
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const tableHeaderBackground =
    theme.palette.mode === "light"
      ? theme.custom.table.header.background.light
      : theme.custom.table.header.background.dark;
  const tableHeaderBorder =
    theme.palette.mode === "light"
      ? theme.custom.table.header.borderBottom.light
      : theme.custom.table.header.borderBottom.dark;
  const tableRowHoverBackground =
    theme.palette.mode === "light"
      ? theme.custom.table.row.hover.light
      : theme.custom.table.row.hover.dark;
  const tableRowStripedBackground =
    theme.palette.mode === "light"
      ? theme.custom.table.row.stripedEven.light
      : theme.custom.table.row.stripedEven.dark;

  // 🧮 Totaux
  const totalObjectif = data.reduce((sum, o) => sum + (o.valeur_objectif ?? 0), 0);
  const totalAtelier1Inscrits = data.reduce((sum, o) => sum + (o.data_prepa?.atelier1_inscrits ?? 0), 0);
  const totalAtelier1Presents = data.reduce((sum, o) => sum + (o.data_prepa?.atelier1_presents ?? o.data_prepa?.atelier1 ?? 0), 0);
  const totalAdhesions = data.reduce((sum, o) => sum + (o.data_prepa?.adhesions ?? 0), 0);
  const totalResteInscrits = data.reduce((sum, o) => sum + (o.reste_a_faire_inscrits ?? 0), 0);
  const totalRestePresents = data.reduce((sum, o) => sum + (o.reste_a_faire_presents ?? o.reste_a_faire ?? 0), 0);
  const totalTauxInscrits = totalObjectif > 0 ? ((totalAtelier1Inscrits / totalObjectif) * 100).toFixed(1) : "-";
  const totalTauxPresents = totalObjectif > 0 ? ((totalAtelier1Presents / totalObjectif) * 100).toFixed(1) : "-";

  // 🔢 Formatage
  const fmtTaux = (val?: number | null) => (val != null ? `${val.toFixed(1)} %` : "—");
  const fmtNum = (n?: number | null) => (typeof n === "number" ? n.toLocaleString("fr-FR") : "—");

  return (
    <>
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 3,
          overflow: "auto",
          boxShadow: theme.custom.surface.elevated.boxShadowRest,
          maxHeight: "75vh",
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{
            minWidth: 1680,
            "& th, & td": { whiteSpace: "nowrap" },
          }}
        >
          {/* ─────────── HEADER ─────────── */}
          <TableHead sx={{ backgroundColor: tableHeaderBackground }}>
            <TableRow>
              {[
                "Année",
                "Centre",
                "Département",
                "🎯 Objectif",
                "🟠 A1 inscrits",
                "🟢 A1 présents",
                "% Obj engagés",
                "% Obj réels",
                "🔁 Reste engagés",
                "🔁 Reste réels",
                "🤝 Adhésions",
                "📊 Taux Prescription",
                "📈 Taux Présence",
                "🤝 Taux Adhésion",
                "📉 Taux Rétention",
              ].map((label, idx) => (
                <TableCell
                  key={label}
                  align={idx >= 3 ? "right" : "left"}
                  sx={{
                    fontWeight: 700,
                    color: "text.primary",
                    borderBottom: tableHeaderBorder,
                    backgroundColor: tableHeaderBackground,
                    position: idx < 3 ? "sticky" : "static",
                    left: idx === 0 ? 0 : idx === 1 ? 100 : idx === 2 ? 280 : "auto",
                    zIndex: idx < 3 ? 2 : 1,
                  }}
                >
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          {/* ─────────── BODY ─────────── */}
          <TableBody>
            {data.map((obj) => (
              <TableRow
                key={obj.id}
                hover
                onClick={() => setSelectedCentreId(obj.centre?.id ?? null)}
                sx={{
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                  "&:hover": { backgroundColor: tableRowHoverBackground },
                }}
              >
                {/* Année */}
                <TableCell
                  sx={{
                    fontWeight: 500,
                    position: "sticky",
                    left: 0,
                    backgroundColor: "background.paper",
                    zIndex: 2,
                  }}
                >
                  {obj.annee}
                </TableCell>

                {/* Centre */}
                <TableCell
                  sx={{
                    fontWeight: 600,
                    color: "primary.main",
                    position: "sticky",
                    left: 100,
                    backgroundColor: "background.paper",
                    zIndex: 2,
                  }}
                >
                  {obj.centre?.nom ?? "—"}
                </TableCell>

                {/* Département */}
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 280,
                    backgroundColor: "background.paper",
                    zIndex: 2,
                  }}
                >
                  {obj.departement ?? "—"}
                </TableCell>

                {/* Objectif */}
                <TableCell align="right">{fmtNum(obj.valeur_objectif)}</TableCell>

                <TableCell align="right">{fmtNum(obj.data_prepa?.atelier1_inscrits)}</TableCell>
                <TableCell align="right">{fmtNum(obj.data_prepa?.atelier1_presents ?? obj.data_prepa?.atelier1)}</TableCell>

                <TableCell
                  align="right"
                  sx={{
                    color:
                      obj.taux_atteinte_inscrits != null && obj.taux_atteinte_inscrits >= 100
                        ? "success.main"
                        : obj.taux_atteinte_inscrits != null && obj.taux_atteinte_inscrits < 70
                          ? "error.main"
                          : "warning.main",
                    fontWeight: 600,
                  }}
                >
                  {fmtTaux(obj.taux_atteinte_inscrits)}
                </TableCell>

                <TableCell
                  align="right"
                  sx={{
                    color:
                      obj.taux_atteinte_presents != null && obj.taux_atteinte_presents >= 100
                        ? "success.main"
                        : obj.taux_atteinte_presents != null && obj.taux_atteinte_presents < 70
                          ? "error.main"
                          : "warning.main",
                    fontWeight: 600,
                  }}
                >
                  {fmtTaux(obj.taux_atteinte_presents ?? obj.taux_atteinte)}
                </TableCell>

                <TableCell align="right">{fmtNum(obj.reste_a_faire_inscrits)}</TableCell>
                <TableCell align="right">{fmtNum(obj.reste_a_faire_presents ?? obj.reste_a_faire)}</TableCell>
                <TableCell align="right">{fmtNum(obj.data_prepa?.adhesions)}</TableCell>

                {/* Taux prescription */}
                <TableCell align="right">{fmtTaux(obj.taux_prescription)}</TableCell>

                {/* Taux présence */}
                <TableCell align="right">{fmtTaux(obj.taux_presence)}</TableCell>

                {/* Taux adhésion */}
                <TableCell align="right">{fmtTaux(obj.taux_adhesion)}</TableCell>

                {/* Taux rétention */}
                <TableCell align="right">{fmtTaux(obj.taux_retention)}</TableCell>
              </TableRow>
            ))}

            {/* Ligne TOTAL */}
            <TableRow sx={{ backgroundColor: tableRowStripedBackground }}>
              <TableCell
                colSpan={3}
                sx={{
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  backgroundColor: tableRowStripedBackground,
                  fontWeight: 700,
                }}
              >
                TOTAL
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{fmtNum(totalObjectif)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{fmtNum(totalAtelier1Inscrits)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{fmtNum(totalAtelier1Presents)}</Typography>
              </TableCell>
              <TableCell align="right" sx={{ color: "warning.main", fontWeight: 700 }}>
                {typeof totalTauxInscrits === "string" ? `${totalTauxInscrits} %` : totalTauxInscrits}
              </TableCell>
              <TableCell align="right" sx={{ color: "primary.main", fontWeight: 700 }}>
                {typeof totalTauxPresents === "string" ? `${totalTauxPresents} %` : totalTauxPresents}
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{fmtNum(totalResteInscrits)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{fmtNum(totalRestePresents)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{fmtNum(totalAdhesions)}</Typography>
              </TableCell>
              <TableCell align="center" colSpan={4}>
                <Typography fontWeight={700} color="text.secondary">
                  —
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* 🪟 Modal détail */}
      <ObjectifsPrepaDetailModal
        open={Boolean(selectedCentreId)}
        centreId={selectedCentreId}
        onClose={() => setSelectedCentreId(null)}
      />

      {/* 💡 Légende */}
      <Box mt={1.5} textAlign="right">
        <Typography variant="caption" color="text.secondary">
          💡 Cliquez sur une ligne pour afficher les détails du centre et du département
        </Typography>
      </Box>
    </>
  );
}
