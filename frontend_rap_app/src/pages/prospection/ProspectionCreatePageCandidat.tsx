// src/pages/prospections/ProspectionCreatePageCandidat.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Typography } from "@mui/material";

import PageTemplate from "../../components/PageTemplate";
import PageSection from "../../components/PageSection";
import ProspectionFormCandidat from "./ProspectionFormCandidat";
import api from "../../api/axios";
import { useCreateProspection } from "../../hooks/useProspection";
import { usePartenaire } from "../../hooks/usePartenaires";
import { useMe } from "../../hooks/useUsers";

import type {
  ProspectionFormData,
  ProspectionMotif,
  ProspectionObjectif,
  ProspectionStatut,
  ProspectionTypeProspection,
} from "../../types/prospection";

// 🔧 Utils
function toNum(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractCreatedId(value: unknown): number | null {
  const id = (value as any)?.id ?? (value as any)?.data?.id;
  return typeof id === "number" ? id : null;
}

export default function ProspectionCreatePageCandidat() {
  const navigate = useNavigate();
  const { create, loading: creating, error: createError } = useCreateProspection();
  const { user: me } = useMe();
  const [searchParams] = useSearchParams();

  const presetPartenaire = useMemo(() => toNum(searchParams.get("partenaire")), [searchParams]);
  /** Formation explicite dans l’URL (lien filtré). */
  const formationFromUrl = useMemo(() => toNum(searchParams.get("formation")), [searchParams]);
  const formationNomFromUrl = useMemo(
    () => searchParams.get("formation_nom")?.trim() || null,
    [searchParams]
  );

  const profileFormationId = useMemo(
    () => me?.formation?.id ?? me?.formation_info?.id ?? null,
    [me]
  );
  const profileFormationNom = useMemo(
    () => me?.formation?.nom ?? me?.formation_info?.nom ?? null,
    [me]
  );
  const profileNumOffre = useMemo(
    () => (me?.formation?.num_offre ?? me?.formation_info?.num_offre ?? null) as string | null,
    [me]
  );

  /** Fiche associée : priorité à l’URL, sinon formation liée au compte (fiche candidat / stagiaire). */
  const effectiveFormationId = useMemo(
    () => formationFromUrl ?? profileFormationId,
    [formationFromUrl, profileFormationId]
  );

  const returnUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (presetPartenaire) params.set("partenaire", String(presetPartenaire));
    if (effectiveFormationId) params.set("formation", String(effectiveFormationId));
    const query = params.toString();
    return query ? `/prospections/candidat?${query}` : "/prospections/candidat";
  }, [effectiveFormationId, presetPartenaire]);

  // 🔎 partenaire
  const { data: partenaireData } = usePartenaire(presetPartenaire ?? undefined);
  const partenaireNom = partenaireData?.nom ?? null;

  // 🔎 libellé formation (les comptes candidat n’ont pas accès à GET /formations/ — on s’appuie sur l’URL + le profil /me)
  const [fetchedNomForUrlFormation, setFetchedNomForUrlFormation] = useState<string | null>(null);
  useEffect(() => {
    if (!formationFromUrl) {
      setFetchedNomForUrlFormation(null);
      return;
    }
    if (formationNomFromUrl) {
      setFetchedNomForUrlFormation(null);
      return;
    }
    if (profileFormationId === formationFromUrl && profileFormationNom) {
      setFetchedNomForUrlFormation(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<unknown>(`/formations/${formationFromUrl}/`);
        const root = (isRecord(res.data) && isRecord((res.data as { data?: unknown }).data)
          ? (res.data as { data: unknown }).data
          : res.data) as unknown;
        const nom = isRecord(root) && typeof root.nom === "string" ? root.nom : null;
        if (!cancelled) setFetchedNomForUrlFormation(nom);
      } catch {
        if (!cancelled) setFetchedNomForUrlFormation(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formationFromUrl, formationNomFromUrl, profileFormationId, profileFormationNom]);

  const resolvedFormationNom = useMemo(() => {
    if (formationFromUrl) {
      if (formationNomFromUrl) return formationNomFromUrl;
      if (fetchedNomForUrlFormation) return fetchedNomForUrlFormation;
      if (profileFormationId === formationFromUrl) return profileFormationNom;
      return null;
    }
    if (profileFormationId) return profileFormationNom;
    return null;
  }, [
    formationFromUrl,
    formationNomFromUrl,
    fetchedNomForUrlFormation,
    profileFormationId,
    profileFormationNom,
  ]);

  // ✅ valeurs par défaut
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const initialValues: ProspectionFormData = useMemo(() => {
    const defaultStatut: ProspectionStatut = "a_faire";
    const defaultType: ProspectionTypeProspection = "premier_contact";
    const defaultMotif: ProspectionMotif = "autre";
    const defaultObjectif: ProspectionObjectif = "prise_contact";

    return {
      partenaire: presetPartenaire ?? null,
      partenaire_nom: partenaireNom,
      formation: effectiveFormationId,
      date_prospection: today,
      type_prospection: defaultType,
      motif: defaultMotif,
      statut: defaultStatut,
      objectif: defaultObjectif,
      commentaire: "",
      relance_prevue: null,
      owner: null,
      owner_username: null,
      formation_nom: resolvedFormationNom,
      centre_nom: null,
      num_offre:
        effectiveFormationId && profileFormationId === effectiveFormationId
          ? profileNumOffre
          : null,
      partenaire_ville: null,
      partenaire_tel: null,
      partenaire_email: null,
      formation_date_debut: null,
      formation_date_fin: null,
      type_offre_display: null,
      formation_statut_display: null,
      places_disponibles: null,
      moyen_contact: null,
      last_comment: null,
      last_comment_at: null,
      last_comment_id: null,
      comments_count: undefined,
    };
  }, [
    effectiveFormationId,
    partenaireNom,
    presetPartenaire,
    profileFormationId,
    profileNumOffre,
    resolvedFormationNom,
    today,
  ]);

  const handleSubmit = async (formData: ProspectionFormData) => {
    try {
      const created = await create({ ...formData, owner: null });
      toast.success("✅ Prospection créée avec succès");

      // TODO: remplacer window.confirm par un Dialog non bloquant pour une meilleure UX
      const wantsComment = window.confirm("Souhaitez-vous ajouter un commentaire maintenant ?");
      const createdId = extractCreatedId(created);

      if (wantsComment && createdId) {
        navigate(`/prospection-commentaires/create/${createdId}`);
      } else {
        navigate(returnUrl);
      }
    } catch {
      toast.error("❌ Erreur lors de la création");
    }
  };

  return (
    <PageTemplate
      title="Créer une prospection"
      subtitle="Ajoutez une prospection côté candidat."
      maxWidth="xl"
      backButton
      onBack={() => navigate(-1)}
    >
      {createError ? (
        <Typography color="error">❌ Impossible d’initialiser le formulaire.</Typography>
      ) : (
        <PageSection>
          <ProspectionFormCandidat
            key={["create-cand", presetPartenaire, partenaireNom, effectiveFormationId, resolvedFormationNom, profileFormationId].join(
              "-"
            )}
            mode="create"
            initialValues={initialValues}
            onSubmit={handleSubmit}
            loading={creating}
            fixedFormationId={formationFromUrl ?? undefined}
          />
        </PageSection>
      )}
    </PageTemplate>
  );
}
