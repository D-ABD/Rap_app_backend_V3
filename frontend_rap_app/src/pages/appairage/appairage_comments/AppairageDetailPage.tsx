// src/pages/appairage/AppairageDetailPage.tsx
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import { Box, Button, CircularProgress, Typography, Paper, Chip } from "@mui/material";
import { useAppairage } from "../../../hooks/useAppairage";
import PageTemplate from "../../../components/PageTemplate";

export default function AppairageDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const numericId = id ? Number(id) : NaN;
  const hasValidId = !!id && Number.isFinite(numericId);

  const { data: appairage, loading, error } = useAppairage(numericId);

  if (!hasValidId) {
    return (
      <PageTemplate title="Détail Appairage" backButton onBack={() => navigate(-1)}>
        <Typography color="error" sx={{ mb: 2 }}>
          ❌ Paramètre invalide.
        </Typography>
        <Button variant="outlined" onClick={() => navigate("/appairages")}>
          ← Retour à la liste
        </Button>
      </PageTemplate>
    );
  }

  if (loading) {
    return (
      <PageTemplate title={`Appairage #${numericId}`} centered>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>⏳ Chargement…</Typography>
      </PageTemplate>
    );
  }

  if (error || !appairage) {
    return (
      <PageTemplate title={`Appairage #${numericId}`} backButton onBack={() => navigate(-1)}>
        <Typography color="error" sx={{ mb: 2 }}>
          ❌ Erreur de chargement.
        </Typography>
        <Button variant="outlined" onClick={() => navigate("/appairages")}>
          ← Retour à la liste
        </Button>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title={`Appairage #${numericId}`}
      backButton
      onBack={() => navigate(-1)}
      actions={
        <Button variant="outlined" component={RouterLink} to={`/appairages/${numericId}/edit`}>
          Modifier
        </Button>
      }
    >
      {/* Infos générales */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Infos générales
        </Typography>
        <Typography variant="body2">
          Créé par <strong>{appairage.created_by_nom || "—"}</strong> le{" "}
          {new Date(appairage.created_at).toLocaleString("fr-FR")}
        </Typography>
        {appairage.statut && <Chip label={appairage.statut} size="small" sx={{ mt: 1 }} />}
      </Paper>

      {/* Partenaire */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Partenaire
        </Typography>
        <Typography variant="body2">{appairage.partenaire_nom || "—"}</Typography>
      </Paper>

      {/* Formation */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Formation
        </Typography>
        <Typography variant="body2">{appairage.formation_nom || "—"}</Typography>
        {appairage.formation_centre && (
          <Typography variant="caption" display="block" color="text.secondary">
            {appairage.formation_centre}
          </Typography>
        )}
        {appairage.formation_type_offre && (
          <Typography variant="caption" display="block" color="text.secondary">
            Type : {appairage.formation_type_offre}
          </Typography>
        )}
      </Paper>

      {/* Commentaires liés */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Commentaires
        </Typography>
        {appairage.commentaires && appairage.commentaires.length > 0 ? (
          appairage.commentaires.map((c) => (
            <Box key={c.id} mb={1}>
              <Typography variant="body2" fontWeight="bold">
                {c.auteur_nom || "—"} • {new Date(c.created_at).toLocaleString("fr-FR")}
              </Typography>
              <Typography variant="body2">{c.body}</Typography>
            </Box>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            Aucun commentaire
          </Typography>
        )}
      </Paper>
    </PageTemplate>
  );
}
