import { Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import type { Rapport } from "../../types/rapport";

interface Props {
  rapports: Rapport[];
  onOpen: (rapport: Rapport) => void;
  onEdit: (id: number) => void;
  onDelete: (rapport: Rapport) => void;
  onExport: (rapport: Rapport) => void;
}

export default function RapportTable({ rapports, onOpen, onEdit, onDelete, onExport }: Props) {
  const getSummary = (rapport: Rapport) => {
    const summary = (rapport.donnees?.phase_summary as Record<string, unknown> | undefined) ?? {};
    const candidats = (summary.candidats as Record<string, unknown> | undefined) ?? {};
    return {
      total: Number(candidats.total ?? 0),
      enFormation: Number(candidats.stagiaires_en_formation ?? 0),
      abandons: Number(candidats.abandons ?? 0),
    };
  };

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nom</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Période</TableCell>
            <TableCell>Dates</TableCell>
            <TableCell>Synthèse</TableCell>
            <TableCell>Format</TableCell>
            <TableCell>Centre</TableCell>
            <TableCell>Formation</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rapports.map((rapport) => {
            const summary = getSummary(rapport);
            return (
              <TableRow key={rapport.id} hover onClick={() => onOpen(rapport)} sx={{ cursor: "pointer" }}>
                <TableCell>
                  <Typography fontWeight={600}>{rapport.nom}</Typography>
                </TableCell>
                <TableCell>{rapport.type_rapport_display || rapport.type_rapport}</TableCell>
                <TableCell>{rapport.periode_display || rapport.periode}</TableCell>
                <TableCell>
                  {rapport.date_debut} {"->"} {rapport.date_fin}
                </TableCell>
                <TableCell>
                  {summary.total > 0 ? (
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      <Chip size="small" label={`Candidats ${summary.total}`} />
                      <Chip size="small" color="success" label={`Formation ${summary.enFormation}`} />
                      {summary.abandons > 0 ? <Chip size="small" color="error" label={`Abandons ${summary.abandons}`} /> : null}
                    </Box>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{rapport.format_display || rapport.format}</TableCell>
                <TableCell>{rapport.centre_nom || "—"}</TableCell>
                <TableCell>{rapport.formation_nom || "—"}</TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Button size="small" onClick={() => onExport(rapport)}>
                    Exporter
                  </Button>
                  <Button size="small" onClick={() => onEdit(rapport.id)}>
                    Modifier
                  </Button>
                  <Button size="small" color="error" onClick={() => onDelete(rapport)}>
                    Archiver
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
