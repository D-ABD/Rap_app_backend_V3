import { useNavigate } from "react-router-dom";
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
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { Document } from "../../types/document";
import DocumentPreview from "./DocumentPreview";
import { useDocumentsApi } from "src/hooks/useDocuments";

interface Props {
  documents: Document[];
  showActions?: boolean;
  onDelete?: (id: number) => void;
}

export default function DocumentsTable({ documents, showActions = false, onDelete }: Props) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { downloadDocument } = useDocumentsApi();

  const formatDate = (date?: string | null) => {
    if (!date) return "–";
    const d = new Date(date);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Box width="100%" mt={2}>
      {/* 🖥️ Desktop Table */}
      {!isMobile && (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Taille</TableCell>
                <TableCell>Créé le</TableCell>
                <TableCell>MàJ le</TableCell> {/* ✅ nouvelle colonne */}
                <TableCell>Aperçu</TableCell>
                <TableCell>Formation liée</TableCell>
                {showActions && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>

            <TableBody>
              {documents.map((doc) => (
                <TableRow
                  key={`document-${doc.id}`}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() =>
                    navigate(`/documents/edit/${doc.id}?formation_id=${doc.formation}`)
                  }
                >
                  <TableCell>{doc.nom_fichier}</TableCell>
                  <TableCell>{doc.type_document_display}</TableCell>
                  <TableCell>{doc.taille_readable ?? "–"}</TableCell>
                  <TableCell>{formatDate(doc.created_at)}</TableCell>
                  <TableCell>{formatDate((doc as any).updated_at)}</TableCell>

                  {/* ✅ Aperçu isolé */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DocumentPreview url={doc.download_url || doc.fichier} nom={doc.nom_fichier} />
                  </TableCell>

                  <TableCell>
                    {doc.formation ? (
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {doc.formation_nom ?? "—"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {doc.formation_type_offre_libelle ?? "—"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          N° offre : {doc.formation_num_offre ?? "—"}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        — Aucune formation
                      </Typography>
                    )}
                  </TableCell>

                  {showActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() =>
                            navigate(`/documents/edit/${doc.id}?formation_id=${doc.formation}`)
                          }
                        >
                          ✏️ Modifier
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadDocument(doc.id, doc.nom_fichier);
                          }}
                        >
                          ⬇️ Télécharger
                        </Button>
                        {onDelete && (
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => onDelete(doc.id)}
                          >
                            🗑️ Supprimer
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 📱 Mobile Card List */}
      {isMobile && (
        <Stack spacing={2}>
          {documents.map((doc) => (
            <Card key={`card-${doc.id}`} variant="outlined">
              <CardContent>
                <Typography variant="body2" gutterBottom>
                  🗂️ {doc.type_document_display} — <strong>{doc.nom_fichier}</strong>
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  📅 Créé le {formatDate(doc.created_at)} · MàJ le{" "}
                  {formatDate((doc as any).updated_at)}
                </Typography>

                <Box mb={1} mt={1}>
                  <DocumentPreview url={doc.download_url || doc.fichier} nom={doc.nom_fichier} />
                </Box>

                {/* 📘 Formation liée */}
                {doc.formation ? (
                  <Box mb={1}>
                    <Typography variant="subtitle2" color="primary">
                      Formation liée :
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {doc.formation_nom ?? "—"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {doc.formation_type_offre_libelle ?? "—"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      N° offre : {doc.formation_num_offre ?? "—"}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    — Aucune formation liée
                  </Typography>
                )}

                {showActions && (
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        navigate(`/documents/edit/${doc.id}?formation_id=${doc.formation}`)
                      }
                    >
                      ✏️ Modifier
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadDocument(doc.id, doc.nom_fichier);
                      }}
                    >
                      ⬇️ Télécharger
                    </Button>

                    {onDelete && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => onDelete(doc.id)}
                      >
                        🗑️ Supprimer
                      </Button>
                    )}
                  </Stack>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
