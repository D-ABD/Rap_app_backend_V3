import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from "@mui/material";
import { toast } from "react-toastify";
import api from "../../api/axios";
import type { Centre } from "../../types/centre";

/**
 * 🔹 Page ou composant intégré pour afficher les détails d’un centre
 */
type Props = {
  centre?: Centre;
};

export default function CentreDetailPage({ centre: propCentre }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [centre, setCentre] = useState<Centre | null>(propCentre || null);
  const [loading, setLoading] = useState(!propCentre);

  useEffect(() => {
    if (propCentre) return;
    const fetchCentre = async () => {
      try {
        const res = await api.get(`/centres/${id}/`);
        setCentre(res.data);
      } catch {
        toast.error("Erreur lors du chargement du centre");
        navigate("/centres");
      } finally {
        setLoading(false);
      }
    };
    fetchCentre();
  }, [id, navigate, propCentre]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="20vh">
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement...</Typography>
      </Box>
    );
  }

  if (!centre) {
    return <Typography color="error">Centre introuvable.</Typography>;
  }

  return (
    <Paper
      sx={{
        p: 2.5,
        backgroundColor: "#fafafa",
        borderRadius: 2,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <Section title="🏫 Informations générales">
        <DetailTable
          rows={[
            ["Nom du centre", centre.nom],
            ["Code postal", centre.code_postal],
            ["Commune", centre.commune],
            ["Numéro de voie", centre.numero_voie],
            ["Nom de la voie", centre.nom_voie],
            ["Complément d’adresse", centre.complement_adresse],
            ["N° UAI du centre", centre.numero_uai_centre],
            ["N° SIRET du centre", centre.siret_centre],
            ["CFA d’entreprise", centre.cfa_entreprise ? "Oui" : "Non"],
          ]}
        />
      </Section>

      <Section title="🏢 CFA Responsable">
        <DetailTable
          rows={[
            [
              "CFA responsable est lieu principal",
              centre.cfa_responsable_est_lieu_principal ? "Oui" : "Non",
            ],
            ["Dénomination", centre.cfa_responsable_denomination],
            ["N° UAI du CFA", centre.cfa_responsable_uai],
            ["N° SIRET du CFA", centre.cfa_responsable_siret],
            ["Numéro de voie", centre.cfa_responsable_numero],
            ["Voie", centre.cfa_responsable_voie],
            ["Complément", centre.cfa_responsable_complement],
            ["Code postal", centre.cfa_responsable_code_postal],
            ["Commune", centre.cfa_responsable_commune],
          ]}
        />
      </Section>

      <Section title="🕓 Métadonnées">
        <DetailTable
          rows={[
            ["Créé le", centre.created_at ? new Date(centre.created_at).toLocaleString() : null],
            [
              "Mis à jour le",
              centre.updated_at ? new Date(centre.updated_at).toLocaleString() : null,
            ],
            ["Adresse complète", centre.full_address],
            ["Nombre de PrepaCompGlobal", String(centre.nb_prepa_comp_global ?? "0")],
          ]}
        />
      </Section>
    </Paper>
  );
}

/* ───────── Sous-composants ───────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" fontWeight="bold" sx={{ color: "primary.main", mb: 1 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 1.5 }} />
      {children}
    </Box>
  );
}

function DetailTable({ rows }: { rows: (string | number | null | undefined)[][] }) {
  return (
    <TableContainer>
      <Table size="small" sx={{ tableLayout: "fixed" }}>
        <TableBody>
          {rows.map(([label, value], index) => (
            <TableRow key={index}>
              <TableCell
                sx={{
                  width: "40%",
                  fontWeight: 600,
                  color: "text.secondary",
                  borderBottom: "1px dashed #ddd",
                  py: 0.5,
                }}
              >
                {label}
              </TableCell>
              <TableCell
                sx={{
                  width: "60%",
                  textAlign: "right",
                  borderBottom: "1px dashed #ddd",
                  py: 0.5,
                }}
              >
                {value && String(value).trim() !== "" ? (
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {value}
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: "error.main", fontWeight: 600 }}>
                    NC
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
