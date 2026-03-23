import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  useMediaQuery,
  Checkbox,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";

import { CVThequeItem } from "src/types/cvtheque";
import { useCVThequeDownload } from "src/hooks/useCvtheque";

type Props = {
  rows: CVThequeItem[];
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;

  onPreview: (item: CVThequeItem) => void;
  onEdit: (id: number) => void;
  onDelete?: (id: number) => void;
};

export default function CVThequeTableCandidat({
  rows,
  selectedIds = [],
  onToggleSelect,
  onPreview,
  onEdit,
  onDelete,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { download } = useCVThequeDownload();

  const formatDate = (date?: string | null) => {
    if (!date) return "–";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Box width="100%" mt={2}>
      {/* 🖥️ TABLE DESKTOP */}
      {!isMobile && (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {onToggleSelect && <TableCell></TableCell>}
                <TableCell>Document</TableCell>
                <TableCell>Candidat</TableCell>
                <TableCell>Formation</TableCell>
                <TableCell>Centre</TableCell>
                <TableCell>Taille</TableCell>
                <TableCell>Déposé le</TableCell>
                <TableCell>Aperçu</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((doc) => (
                <TableRow
                  key={doc.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => onPreview(doc)}
                >
                  {/* SÉLECTION MULTIPLE */}
                  {onToggleSelect && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(doc.id)}
                        onChange={() => onToggleSelect(doc.id!)}
                      />
                    </TableCell>
                  )}

                  {/* DOCUMENT */}
                  <TableCell>
                    <Typography fontWeight={600}>{doc.titre}</Typography>

                    <Chip
                      size="small"
                      label={doc.document_type}
                      color="info"
                      sx={{ mt: 0.5 }}
                    />

                    <Typography variant="caption" sx={{ display: "block", mt: 0.3 }}>
                      {doc.extension?.toUpperCase()}
                    </Typography>
                  </TableCell>

                  {/* CANDIDAT */}
                  <TableCell>
                    <Typography
                      component={RouterLink}
                      to={`/candidats/${doc.candidat.id}`}
                      sx={{ color: "primary.main", textDecoration: "none" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {doc.candidat.prenom} {doc.candidat.nom}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {doc.candidat.ville || "—"}
                    </Typography>
                  </TableCell>

                  {/* FORMATION */}
                  <TableCell>
                    {doc.formation_nom ? (
                      <Typography
                        component={RouterLink}
                        to={`/formations?search=${encodeURIComponent(doc.formation_nom)}`}
                        sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {doc.formation_nom}
                      </Typography>
                    ) : (
                      <strong>—</strong>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {doc.formation_type_offre || "—"}
                    </Typography>
                    {doc.formation_num_offre && (
                      <Typography variant="caption" sx={{ display: "block" }}>
                        Offre n°{doc.formation_num_offre}
                      </Typography>
                    )}
                  </TableCell>

                  {/* CENTRE */}
                  <TableCell>{doc.formation_centre || "—"}</TableCell>

                  {/* TAILLE */}
                  <TableCell>{doc.taille || "—"}</TableCell>

                  {/* DATE */}
                  <TableCell>{formatDate(doc.date_depot)}</TableCell>

                  {/* APERCU */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button variant="text" onClick={() => onPreview(doc)}>
                      Voir
                    </Button>
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Modifier">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onEdit(doc.id)}
                        >
                          ✏️
                        </Button>
                      </Tooltip>

                      <Tooltip title="Télécharger">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => download(doc.id, doc.titre)}
                        >
                          ⬇️
                        </Button>
                      </Tooltip>

                      {onDelete && (
                        <Tooltip title="Supprimer">
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => onDelete(doc.id)}
                          >
                            🗑️
                          </Button>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

          </Table>
        </TableContainer>
      )}

      {/* 📱 CARDS MOBILE */}
      {isMobile && (
        <Stack spacing={2}>
          {rows.map((doc) => (
            <Card
              key={doc.id}
              variant="outlined"
              sx={{ cursor: "pointer" }}
              onClick={() => onPreview(doc)}
            >
              <CardContent>
                {/* TITRE */}
                <Typography fontWeight={600}>{doc.titre}</Typography>

                <Chip size="small" label={doc.document_type} color="info" sx={{ mb: 1 }} />

                {/* INFO CANDIDAT */}
                <Typography variant="body2">
                  {doc.candidat.prenom} {doc.candidat.nom}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {formatDate(doc.date_depot)}
                </Typography>

                {/* ACTIONS */}
                <Stack direction="row" spacing={1} mt={2}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={(e) => {
                      e.stopPropagation();
                      download(doc.id, doc.titre);
                    }}
                  >
                    ⬇️
                  </Button>

                  <Button
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(doc.id);
                    }}
                  >
                    ✏️
                  </Button>

                  {onDelete && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(doc.id);
                      }}
                    >
                      🗑️
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
