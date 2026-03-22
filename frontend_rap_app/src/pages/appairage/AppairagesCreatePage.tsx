// src/pages/appairages/AppairagesCreatePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, CircularProgress, Typography } from "@mui/material";

import AppairageForm from "./AppairageForm";
import { useCreateAppairage, useAppairageMeta } from "../../hooks/useAppairage";
import { usePartenaire } from "../../hooks/usePartenaires";
import api from "../../api/axios";
import PageTemplate from "../../components/PageTemplate";

import type {
  AppairageCreatePayload,
  AppairageFormData,
  AppairageStatut,
} from "../../types/appairage";

// Helpers
function toNum(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export default function AppairagesCreatePage() {
  const navigate = useNavigate();
  const { create, loading: creating, error: createError } = useCreateAppairage();

  // 🔹 Charger meta
  const { data: meta, loading: metaLoading, error: metaError } = useAppairageMeta();

  const [searchParams] = useSearchParams();
  const presetPartenaire = useMemo(() => toNum(searchParams.get("partenaire")), [searchParams]);
  const presetFormation = useMemo(() => toNum(searchParams.get("formation")), [searchParams]);

  // labels transmis en URL
  const paramPartenaireNom = searchParams.get("partenaire_nom")?.trim() || null;
  const paramFormationNom = searchParams.get("formation_nom")?.trim() || null;

  // nom du partenaire via hook
  const { data: partenaireData } = usePartenaire(presetPartenaire ?? undefined);
  const partenaireNom = paramPartenaireNom ?? partenaireData?.nom ?? null;

  // nom formation (fallback API)
  const [formationNom, setFormationNom] = useState<string | null>(paramFormationNom ?? null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!presetFormation || formationNom) return;
      try {
        const res = await api.get<unknown>(`/formations/${presetFormation}/`);
        const raw = res.data as unknown;
        const data =
          isRecord(raw) && isRecord(raw.data) ? raw.data : (raw as Record<string, unknown>);
        const nom = isRecord(data) && typeof data.nom === "string" ? data.nom : null;
        if (!cancelled && nom) setFormationNom(nom);
      } catch {
        if (!cancelled) setFormationNom(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [presetFormation, formationNom]);

  // valeurs initiales
  const initialValues: Partial<AppairageFormData> = useMemo(() => {
    const defaultStatut: AppairageStatut = "transmis";
    return {
      partenaire: presetPartenaire ?? null,
      partenaire_nom: partenaireNom,
      formation: presetFormation ?? null,
      formation_nom: formationNom,
      candidat: null,
      candidat_nom: null,
      candidat_prenom: null,
      statut: defaultStatut,
      commentaire: "",
      last_commentaire: null,
      commentaires: [],
    };
  }, [presetPartenaire, partenaireNom, presetFormation, formationNom]);

  const handleSubmit = async (formData: AppairageCreatePayload) => {
    try {
      await create(formData);
      toast.success("✅ Appairage créé avec succès");
      navigate("/appairages");
    } catch {
      toast.error("❌ Erreur lors de la création");
    }
  };

  // erreurs bloquantes
  if (createError || metaError) {
    return (
      <PageTemplate title="➕ Nouvel appairage">
        <Typography color="error">❌ Impossible d’initialiser le formulaire.</Typography>
      </PageTemplate>
    );
  }

  // attente meta
  if (metaLoading || !meta) {
    return (
      <PageTemplate title="➕ Nouvel appairage" centered>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>⏳ Chargement du formulaire…</Typography>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="➕ Nouvel appairage" backButton onBack={() => navigate(-1)}>
      <Box mt={2}>
        <AppairageForm
          mode="create"
          initialValues={initialValues}
          onSubmit={handleSubmit}
          loading={creating}
          fixedFormationId={presetFormation ?? undefined}
          meta={meta}
        />
      </Box>
    </PageTemplate>
  );
}
