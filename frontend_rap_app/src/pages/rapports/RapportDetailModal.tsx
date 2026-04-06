import { Button, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { Rapport } from "../../types/rapport";
import DetailViewLayout from "../../components/layout/DetailViewLayout";
import DetailSection from "../../components/ui/DetailSection";
import DetailField, { formatDetailScalar } from "../../components/ui/DetailField";

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
    <DetailViewLayout
      open={open}
      onClose={onClose}
      title={rapport.nom}
      actions={
        <>
          <Button onClick={() => onExport(rapport)}>Exporter</Button>
          <div>
            <Button onClick={() => navigate(`/rapports/${rapport.id}/edit`)}>Modifier</Button>
            <Button onClick={onClose}>Fermer</Button>
          </div>
        </>
      }
      actionsSx={{ justifyContent: "space-between" }}
    >
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
              <DetailSection title="Paramètres du rapport" sx={{ mb: 0 }}>
                <DetailField label="Type" value={formatDetailScalar(rapport.type_rapport_display || rapport.type_rapport)} />
                <DetailField label="Période" value={formatDetailScalar(rapport.periode_display || rapport.periode)} />
                <DetailField
                  label="Dates"
                  value={`${rapport.date_debut} → ${rapport.date_fin}`}
                />
                <DetailField label="Format" value={formatDetailScalar(rapport.format_display || rapport.format)} />
                {rapport.temps_generation ? (
                  <DetailField
                    label="Temps de génération"
                    value={`${rapport.temps_generation.toFixed(2)} s`}
                  />
                ) : null}
              </DetailSection>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <DetailSection title="Contexte" sx={{ mb: 0 }}>
                <DetailField label="Centre" value={formatDetailScalar(rapport.centre_nom)} />
                <DetailField label="Type d'offre" value={formatDetailScalar(rapport.type_offre_nom)} />
                <DetailField label="Statut" value={formatDetailScalar(rapport.statut_nom)} />
                <DetailField label="Formation" value={formatDetailScalar(rapport.formation_nom)} />
                <DetailField
                  label="Périmètre réel"
                  fullWidth
                  value={
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                      <Chip size="small" label={`Centre: ${scopeSummary.centre_id ?? "tous"}`} />
                      <Chip size="small" label={`Formation: ${scopeSummary.formation_id ?? "toutes"}`} />
                      <Chip size="small" label={`Type offre: ${scopeSummary.type_offre_id ?? "tous"}`} />
                      <Chip size="small" label={`Statut: ${scopeSummary.statut_id ?? "tous"}`} />
                    </Stack>
                  }
                />
              </DetailSection>
            </Paper>
          </Grid>
        </Grid>

        {phaseCounts.length > 0 || legacyCounts.length > 0 ? (
          <Grid container spacing={2}>
            {phaseCounts.length > 0 ? (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <DetailSection title="Répartition par phase" withGrid={false} sx={{ mb: 0 }}>
                    <Stack spacing={1}>
                      {phaseCounts.map(([label, value]) => (
                        <Stack key={label} direction="row" justifyContent="space-between">
                          <Typography color="text.secondary">{label}</Typography>
                          <Typography fontWeight={600}>{value}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </DetailSection>
                </Paper>
              </Grid>
            ) : null}
            {legacyCounts.length > 0 ? (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <DetailSection title="Répartition legacy" withGrid={false} sx={{ mb: 0 }}>
                    <Stack spacing={1}>
                      {legacyCounts.map(([label, value]) => (
                        <Stack key={label} direction="row" justifyContent="space-between">
                          <Typography color="text.secondary">{label}</Typography>
                          <Typography fontWeight={600}>{value}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </DetailSection>
                </Paper>
              </Grid>
            ) : null}
          </Grid>
        ) : null}

        <Paper sx={{ p: 2 }}>
          <DetailSection
            title="Données détaillées"
            subtitle="Vue technique complète du JSON"
            withGrid={false}
            sx={{ mb: 0 }}
          >
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", overflowX: "auto", fontSize: 12 }}>
              {JSON.stringify(rapport.donnees || {}, null, 2)}
            </pre>
          </DetailSection>
        </Paper>
      </Stack>
    </DetailViewLayout>
  );
}
