import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { Rapport } from "../../types/rapport";

interface Props {
  open: boolean;
  rapport: Rapport | null;
  onClose: () => void;
  onExport: (rapport: Rapport) => void;
}

export default function RapportDetailModal({ open, rapport, onClose, onExport }: Props) {
  const navigate = useNavigate();

  if (!rapport) return null;

  const phaseSummary = (rapport.donnees?.phase_summary as Record<string, unknown> | undefined) ?? {};
  const formationsSummary = (phaseSummary.formations as Record<string, unknown> | undefined) ?? {};
  const candidatsSummary = (phaseSummary.candidats as Record<string, unknown> | undefined) ?? {};
  const scopeSummary = (phaseSummary.scope as Record<string, unknown> | undefined) ?? {};

  const kpis = [
    { label: "Formations", value: formationsSummary.total },
    { label: "Candidats", value: candidatsSummary.total },
    { label: "Inscrits validés", value: candidatsSummary.inscrits_valides },
    { label: "En formation", value: candidatsSummary.stagiaires_en_formation },
    { label: "Sortis", value: candidatsSummary.sortis },
    { label: "Abandons", value: candidatsSummary.abandons },
  ].filter((item) => item.value !== undefined && item.value !== null);

  const phaseCounts = Object.entries(
    (candidatsSummary.parcours_phase_counts as Record<string, number> | undefined) ?? {}
  );
  const legacyCounts = Object.entries(
    (candidatsSummary.legacy_statut_counts as Record<string, number> | undefined) ?? {}
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{rapport.nom}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {kpis.length > 0 ? (
            <Grid container spacing={2}>
              {kpis.map((item) => (
                <Grid item xs={6} md={2} key={item.label}>
                  <Paper sx={{ p: 2, textAlign: "center", height: "100%" }}>
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {String(item.value)}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : null}

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2">Type</Typography>
                <Typography>{rapport.type_rapport_display || rapport.type_rapport}</Typography>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Période
                </Typography>
                <Typography>{rapport.periode_display || rapport.periode}</Typography>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Dates
                </Typography>
                <Typography>
                  {rapport.date_debut} {"->"} {rapport.date_fin}
                </Typography>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Format
                </Typography>
                <Typography>{rapport.format_display || rapport.format}</Typography>
                {rapport.temps_generation ? (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 2 }}>
                      Temps de génération
                    </Typography>
                    <Typography>{rapport.temps_generation.toFixed(2)} s</Typography>
                  </>
                ) : null}
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2">Centre</Typography>
                <Typography>{rapport.centre_nom || "—"}</Typography>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Type d’offre
                </Typography>
                <Typography>{rapport.type_offre_nom || "—"}</Typography>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Statut
                </Typography>
                <Typography>{rapport.statut_nom || "—"}</Typography>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Formation
                </Typography>
                <Typography>{rapport.formation_nom || "—"}</Typography>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Périmètre réel
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  <Chip size="small" label={`Centre: ${scopeSummary.centre_id ?? "tous"}`} />
                  <Chip size="small" label={`Formation: ${scopeSummary.formation_id ?? "toutes"}`} />
                  <Chip size="small" label={`Type offre: ${scopeSummary.type_offre_id ?? "tous"}`} />
                  <Chip size="small" label={`Statut: ${scopeSummary.statut_id ?? "tous"}`} />
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {phaseCounts.length > 0 || legacyCounts.length > 0 ? (
            <Grid container spacing={2}>
              {phaseCounts.length > 0 ? (
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Répartition par phase
                    </Typography>
                    <Stack spacing={1}>
                      {phaseCounts.map(([label, value]) => (
                        <Stack key={label} direction="row" justifyContent="space-between">
                          <Typography color="text.secondary">{label}</Typography>
                          <Typography fontWeight={600}>{value}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              ) : null}
              {legacyCounts.length > 0 ? (
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Répartition legacy
                    </Typography>
                    <Stack spacing={1}>
                      {legacyCounts.map(([label, value]) => (
                        <Stack key={label} direction="row" justifyContent="space-between">
                          <Typography color="text.secondary">{label}</Typography>
                          <Typography fontWeight={600}>{value}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              ) : null}
            </Grid>
          ) : null}

          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Données détaillées</Typography>
              <Typography variant="caption" color="text.secondary">
                Vue technique complète du JSON
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", overflowX: "auto", fontSize: 12 }}>
              {JSON.stringify(rapport.donnees || {}, null, 2)}
            </pre>
          </Paper>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between" }}>
        <Button onClick={() => onExport(rapport)}>Exporter</Button>
        <div>
          <Button onClick={() => navigate(`/rapports/${rapport.id}/edit`)}>Modifier</Button>
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </DialogActions>
    </Dialog>
  );
}
