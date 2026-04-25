// ======================================================
// Création d’un plan d’action formation
// ======================================================

import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTemplate from "../../components/PageTemplate";
import type { PlanActionFormationFormValues } from "../../types/planActionFormation";
import PlanActionFormationForm, {
  getDefaultPlanActionFormationFormValues,
} from "./PlanActionFormationForm";
import { useUnsavedFormGuard } from "./useUnsavedFormGuard";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function buildInitialFormFromQuery(searchParams: URLSearchParams): PlanActionFormationFormValues {
  const next = getDefaultPlanActionFormationFormValues();
  const formation = searchParams.get("formation");
  const centresRaw = searchParams.get("centres");
  const centre = searchParams.get("centre");
  const dateDebut = searchParams.get("date_debut");
  const dateFin = searchParams.get("date_fin");
  if (formation && /^\d+$/.test(formation)) {
    next.formationIds = [Number(formation)];
  }
  if (centresRaw) {
    const ids = centresRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s))
      .map((s) => Number(s));
    if (ids.length > 0) {
      next.centreIds = ids;
    }
  } else if (centre && /^\d+$/.test(centre)) {
    next.centreIds = [Number(centre)];
  }
  if (dateDebut && ISO_DATE.test(dateDebut)) {
    next.date_debut = dateDebut;
  }
  if (dateFin && ISO_DATE.test(dateFin)) {
    next.date_fin = dateFin;
  }
  return next;
}

export default function PlanActionFormationCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [dirty, setDirty] = useState(false);
  const onDirtyChange = useCallback((d: boolean) => {
    setDirty(d);
  }, []);

  const formKey = searchParams.toString() || "create";
  const initialForm = useMemo(() => {
    if (formKey === "create") {
      return getDefaultPlanActionFormationFormValues();
    }
    return buildInitialFormFromQuery(new URLSearchParams(formKey));
  }, [formKey]);

  useUnsavedFormGuard(dirty);

  return (
    <PageTemplate
      title="Créer un plan d'action"
      subtitle="Définissez la période, le périmètre, la sélection de commentaires et les contenus de synthèse."
      backButton
      onBack={() => {
        void navigate("/plans-action-formations");
      }}
    >
      <PlanActionFormationForm
        key={formKey}
        mode="create"
        initialForm={initialForm}
        onDirtyChange={onDirtyChange}
        onCancel={() => navigate("/plans-action-formations")}
        onSaved={({ id, statut }) => {
          if (statut === "valide" || statut === "archive") {
            void navigate("/plans-action-formations", { replace: true });
          } else {
            void navigate(`/plans-action-formations/${id}/edit`, { replace: true });
          }
        }}
      />
    </PageTemplate>
  );
}
