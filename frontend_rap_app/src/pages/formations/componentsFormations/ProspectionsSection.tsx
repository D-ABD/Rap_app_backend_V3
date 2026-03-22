// src/pages/formations/componentsFormations/ProspectionsSection.tsx
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Box, Typography, Divider, Stack, Button, Paper, CircularProgress } from "@mui/material";
import type { Prospection } from "../../../types/prospection";

interface Props {
  prospections: Prospection[];
  formationId: number;
  limit?: number;
  loading?: boolean; // ✅ ajouté pour compatibilité avec FormationsEditPage
}

export default function ProspectionsSection({
  prospections,
  formationId,
  limit = 3,
  loading = false,
}: Props) {
  const navigate = useNavigate();
  const [displayLimit, setDisplayLimit] = useState(limit);

  const affichées = prospections.slice(0, displayLimit);

  // ✅ Affichage du loader pendant le chargement
  if (loading) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Chargement des prospections...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        📞 Prospections ({prospections.length})
      </Typography>

      {prospections.length === 0 && (
        <Typography color="text.secondary">⚠️ Aucune prospection pour cette formation.</Typography>
      )}

      {affichées.map((p) => (
        <Box key={p.id} sx={{ py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            📅 {new Date(p.date_prospection).toLocaleDateString()} — 🧑‍💼 {p.owner_username}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            📌 {p.objectif_display} — 🏷️ {p.statut_display}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            📝 {p.commentaire || "—"}
          </Typography>
          <Divider sx={{ mt: 1 }} />
        </Box>
      ))}

      {/* Boutons de navigation */}
      <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ mt: 2 }}>
        {displayLimit < prospections.length ? (
          <Button variant="outlined" onClick={() => setDisplayLimit((prev) => prev + limit)}>
            🔽 Voir plus
          </Button>
        ) : (
          prospections.length > limit && (
            <Button variant="outlined" onClick={() => setDisplayLimit(limit)}>
              🔼 Voir moins
            </Button>
          )
        )}

        <Button
          component={RouterLink}
          to={`/formations/${formationId}/prospections`}
          variant="contained"
          color="primary"
        >
          🔍 Toutes les prospections
        </Button>

        <Button
          variant="contained"
          color="success"
          onClick={() => navigate(`/prospections/create?formation=${formationId}`)}
        >
          ➕ Ajouter une prospection
        </Button>
      </Stack>
    </Paper>
  );
}
