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
} from "@mui/material";
import { useState } from "react";
import type { ObjectifPrepa } from "src/types/prepa";
import ObjectifsPrepaDetailModal from "./ObjectifsPrepaDetailModal";

interface Props {
  data: ObjectifPrepa[];
}

export default function ObjectifPrepaTable({ data }: Props) {
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);

  // 🧮 Totaux
  const totalObjectif = data.reduce((sum, o) => sum + (o.valeur_objectif ?? 0), 0);
  const totalRealisation = data.reduce(
    (sum, o) => sum + (o.data_prepa?.presents ?? 0), // 🎯 total des présents Prépa
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
          <TableHead sx={{ backgroundColor: "#f4f6f8" }}>
            <TableRow>
              {[
                "Année",
                "Centre",
                "Département",
                "🎯 Objectif",
                "👥 Réalisé",
                "% Atteinte",
                "🔁 Reste à faire",
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
                    borderBottom: "2px solid #e0e0e0",
                    backgroundColor: "#f4f6f8",
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
                  "&:hover": { backgroundColor: "#f5faff" },
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
                  }}
                >
                  {obj.departement ?? "—"}
                </TableCell>

                {/* Objectif */}
                <TableCell align="right">{fmtNum(obj.valeur_objectif)}</TableCell>

                {/* Réalisé */}
                <TableCell align="right">{fmtNum(obj.data_prepa?.presents)}</TableCell>

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
            <TableRow sx={{ backgroundColor: "#fafbfc" }}>
              <TableCell
                colSpan={3}
                sx={{
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  backgroundColor: "#fafbfc",
                  fontWeight: 700,
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
