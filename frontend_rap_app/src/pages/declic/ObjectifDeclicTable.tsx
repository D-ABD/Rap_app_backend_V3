// -----------------------------------------------------------------------------
// 📊 ObjectifDeclicTable — version corrigée et complète
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
import type { ObjectifDeclic } from "src/types/declic";
import type { AppTheme } from "src/theme";
import ObjectifsDeclicDetailModal from "./ObjectifsDeclicDetailModal";

interface Props {
  data: ObjectifDeclic[];
}

export default function ObjectifDeclicTable({ data }: Props) {
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";
  const tableHeaderBackground = isLight
    ? theme.custom.table.header.background.light
    : theme.custom.table.header.background.dark;
  const tableHeaderBorder = isLight
    ? theme.custom.table.header.borderBottom.light
    : theme.custom.table.header.borderBottom.dark;
  const tableRowHoverBackground = isLight
    ? theme.custom.table.row.hover.light
    : theme.custom.table.row.hover.dark;
  const tableRowStripedBackground = isLight
    ? theme.custom.table.row.stripedEven.light
    : theme.custom.table.row.stripedEven.dark;
  const tableCellBorder = isLight
    ? theme.custom.table.cell.borderBottom.light
    : theme.custom.table.cell.borderBottom.dark;

  // 🧮 Totaux
  const totalObjectif = data.reduce((sum, o) => sum + (o.valeur_objectif ?? 0), 0);
  const totalRealisation = data.reduce(
    (sum, o) => sum + (o.data_declic?.presents ?? 0), // 🎯 total des présents Atelier 1
    0
  );
  const totalReste = data.reduce((sum, o) => sum + (o.reste_a_faire ?? 0), 0);
  const totalTaux = totalObjectif > 0 ? ((totalRealisation / totalObjectif) * 100).toFixed(1) : "-";

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
            boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
            maxHeight: "75vh",
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{
            minWidth: 1300,
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
                "👥 Réalisé ",
                "% Atteinte",
                "🔁 Reste à faire",
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
                  "&:nth-of-type(even)": { backgroundColor: tableRowStripedBackground },
                  "&:hover": { backgroundColor: tableRowHoverBackground },
                }}
              >
                {/* Année */}
                <TableCell
                  sx={{
                    fontWeight: 500,
                    position: "sticky",
                    left: 0,
                    backgroundColor: "#fff",
                    zIndex: 2,
                    borderBottom: tableCellBorder,
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
                    backgroundColor: "#fff",
                    zIndex: 2,
                    borderBottom: tableCellBorder,
                  }}
                >
                  {obj.centre?.nom ?? "—"}
                </TableCell>

                {/* Département */}
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 280,
                    backgroundColor: "#fff",
                    zIndex: 2,
                    borderBottom: tableCellBorder,
                  }}
                >
                  {obj.departement ?? "—"}
                </TableCell>

                {/* Objectif */}
                <TableCell align="right">{fmtNum(obj.valeur_objectif)}</TableCell>

                {/* Réalisé  */}
                <TableCell align="right">{fmtNum(obj.data_declic?.presents)}</TableCell>

                {/* Taux atteinte */}
                <TableCell
                  align="right"
                  sx={{
                    color:
                      obj.taux_atteinte != null && obj.taux_atteinte >= 100
                        ? "success.main"
                        : obj.taux_atteinte != null && obj.taux_atteinte < 70
                          ? "error.main"
                          : "warning.main",
                    fontWeight: 600,
                  }}
                >
                  {fmtTaux(obj.taux_atteinte)}
                </TableCell>

                {/* Reste à faire */}
                <TableCell align="right">{fmtNum(obj.reste_a_faire)}</TableCell>
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
                  borderBottom: tableCellBorder,
                }}
              >
                TOTAL
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{fmtNum(totalObjectif)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{fmtNum(totalRealisation)}</Typography>
              </TableCell>
              <TableCell align="right" sx={{ color: "primary.main", fontWeight: 700 }}>
                {typeof totalTaux === "string" ? totalTaux : `${totalTaux} %`}
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{fmtNum(totalReste)}</Typography>
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
      <ObjectifsDeclicDetailModal
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
