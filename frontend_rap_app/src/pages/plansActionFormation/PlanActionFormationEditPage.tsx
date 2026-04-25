// ======================================================
// Édition d’un plan d’action formation existant
// ======================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { AxiosError } from "axios";

import PageTemplate from "../../components/PageTemplate";
import { fetchPlanActionFormationDetail } from "../../hooks/usePlansActionFormation";
import type { PlanActionFormationDetail } from "../../types/planActionFormation";
import PlanActionFormationForm, { formValuesFromDetail } from "./PlanActionFormationForm";
import { useUnsavedFormGuard } from "./useUnsavedFormGuard";

function readAxiosMessage(err: unknown): string {
  const ax = err as AxiosError<{ message?: string; detail?: string }>;
  if (ax.response?.status === 404) {
    return "Ce plan d’action n’existe pas ou n’est plus disponible.";
  }
  if (ax.response?.data && typeof ax.response.data === "object" && "message" in ax.response.data) {
    const m = (ax.response.data as { message?: string }).message;
    if (m) return m;
  }
  return ax.message || "Impossible de charger le plan d’action.";
}

export default function PlanActionFormationEditPage() {
  const { id: idParam } = useParams();
  const navigate = useNavigate();
  const planId = idParam && /^\d+$/.test(idParam) ? Number(idParam) : NaN;

  const [detail, setDetail] = useState<PlanActionFormationDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const onDirtyChange = useCallback((d: boolean) => {
    setDirty(d);
  }, []);

  useUnsavedFormGuard(dirty);

  const initialForm = useMemo(
    () => (detail ? formValuesFromDetail(detail) : null),
    [detail]
  );

  useEffect(() => {
    if (!Number.isFinite(planId)) {
      setLoading(false);
      setLoadError("Identifiant de plan invalide.");
      return;
    }
    let c = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const d = await fetchPlanActionFormationDetail(planId);
        if (c) return;
        setDetail(d);
      } catch (e) {
        if (!c) setLoadError(readAxiosMessage(e));
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [planId]);

  const handleBack = useCallback(() => {
    void navigate("/plans-action-formations");
  }, [navigate]);

  if (loading) {
    return (
      <PageTemplate title="Modifier le plan d'action" backButton onBack={handleBack}>
        <Box display="flex" justifyContent="center" py={6}>
          <Stack spacing={2} alignItems="center">
            <CircularProgress color="primary" />
            <Typography variant="body2" color="text.secondary">
              Chargement du plan d’action…
            </Typography>
          </Stack>
        </Box>
      </PageTemplate>
    );
  }

  if (loadError || !Number.isFinite(planId) || !detail || !initialForm) {
    return (
      <PageTemplate title="Modifier le plan d'action" backButton onBack={handleBack}>
        <Stack spacing={2}>
          <Alert severity="error" role="alert">
            {loadError ?? "Chargement impossible."}
          </Alert>
          <Button variant="contained" onClick={() => navigate("/plans-action-formations")}>
            Retour à la liste
          </Button>
        </Stack>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="Modifier le plan d'action"
      subtitle={detail.titre}
      backButton
      onBack={handleBack}
    >
      <PlanActionFormationForm
        key={detail.id}
        mode="edit"
        planId={planId}
        initialForm={initialForm}
        onDirtyChange={onDirtyChange}
        onCancel={() => navigate("/plans-action-formations")}
        onSaved={({ statut }) => {
          if (statut === "brouillon") {
            return;
          }
          void navigate("/plans-action-formations");
        }}
      />
    </PageTemplate>
  );
}
