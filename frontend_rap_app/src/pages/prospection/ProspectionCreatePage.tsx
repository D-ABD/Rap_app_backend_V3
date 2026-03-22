// src/pages/prospections/ProspectionCreatePage.tsx (ADMIN)
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Typography } from "@mui/material";

import PageTemplate from "../../components/PageTemplate";
import ProspectionForm from "./ProspectionForm";

import type {
  ProspectionFormData,
  ProspectionMotif,
  ProspectionObjectif,
  ProspectionStatut,
  ProspectionTypeProspection,
} from "../../types/prospection";
import { useCreateProspection } from "../../hooks/useProspection";
import { usePartenaire } from "../../hooks/usePartenaires";
import api from "../../api/axios";

function extractCreatedId(x: unknown): number | null {
  if (typeof x !== "object" || x === null) return null;
  const root = x as Record<string, unknown>;
  if (typeof root.id === "number") return root.id;
  const data = root.data;
  if (typeof data === "object" && data !== null) {
    const id = (data as Record<string, unknown>).id;
    if (typeof id === "number") return id;
  }
  return null;
}

function toNum(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export default function ProspectionCreatePage() {
  const navigate = useNavigate();
  const { create, loading: creating, error: createError } = useCreateProspection();

  const [searchParams] = useSearchParams();
  const presetPartenaire = useMemo(() => toNum(searchParams.get("partenaire")), [searchParams]);
  const presetFormation = useMemo(() => toNum(searchParams.get("formation")), [searchParams]);

  // 🔤 labels transmis en URL (affichage immédiat)
  const paramPartenaireNom = searchParams.get("partenaire_nom")?.trim() || null;
  const paramFormationNom = searchParams.get("formation_nom")?.trim() || null;

  // 🔎 nom du partenaire via hook (fallback si pas fourni en URL)
  const { data: partenaireData } = usePartenaire(presetPartenaire ?? undefined);
  const partenaireNom = paramPartenaireNom ?? partenaireData?.nom ?? null;

  // 🔎 nom (léger) de la formation: on part du param URL sinon fetch
  const [formationNom, setFormationNom] = useState<string | null>(paramFormationNom ?? null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!presetFormation || formationNom) return;
      try {
        const res = await api.get<unknown>(`/formations/${presetFormation}/`);
        const raw = res.data as unknown;
        const data = isRecord(raw) && isRecord(raw.data) ? raw.data : raw;
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

  // ✅ Valeurs par défaut strictement typées
  const initialValues: ProspectionFormData = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const defaultStatut: ProspectionStatut = "a_faire";
    const defaultType: ProspectionTypeProspection = "premier_contact";
    const defaultMotif: ProspectionMotif = "autre";
    const defaultObjectif: ProspectionObjectif = "prise_contact";

    return {
      partenaire: presetPartenaire ?? null,
      partenaire_nom: partenaireNom,

      formation: presetFormation ?? null,
      date_prospection: today,
      type_prospection: defaultType,
      motif: defaultMotif,
      statut: defaultStatut,
      objectif: defaultObjectif,
      commentaire: "",
      relance_prevue: null,

      owner: null,
      owner_username: null,

      formation_nom: formationNom,
      centre_nom: null,
      num_offre: null,

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
  }, [presetPartenaire, partenaireNom, presetFormation, formationNom]);

  const handleSubmit = async (formData: ProspectionFormData) => {
    try {
      const created = await create(formData);
      toast.success("✅ Prospection créée avec succès");

      const wantsComment = window.confirm("Souhaitez-vous ajouter un commentaire maintenant ?");
      const createdId = extractCreatedId(created);

      if (wantsComment && createdId) {
        navigate(`/prospection-commentaires/create/${createdId}`);
      } else {
        navigate("/prospections");
      }
    } catch {
      toast.error("❌ Erreur lors de la création");
    }
  };

  return (
    <PageTemplate title="➕ Nouvelle prospection" backButton onBack={() => navigate(-1)}>
      {createError ? (
        <Typography color="error">❌ Impossible d’initialiser le formulaire.</Typography>
      ) : (
        <ProspectionForm
          key={`create-${presetPartenaire ?? "none"}-${partenaireNom ?? ""}-${presetFormation ?? "none"}-${formationNom ?? ""}`}
          mode="create"
          initialValues={initialValues}
          onSubmit={handleSubmit}
          loading={creating}
          fixedFormationId={presetFormation ?? undefined}
        />
      )}
    </PageTemplate>
  );
}
