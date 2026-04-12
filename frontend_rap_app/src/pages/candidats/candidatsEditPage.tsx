// src/pages/candidats/CandidatEditPage.tsx
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CircularProgress, Typography, Box } from "@mui/material";

import { useCandidat, useCandidatMeta, useUpdateCandidat } from "../../hooks/useCandidats";
import { useMe } from "../../hooks/useUsers";

import type { Candidat, CandidatFormData } from "../../types/candidat";
import PageTemplate from "../../components/PageTemplate";
import PageSection from "../../components/PageSection";
import CandidatForm from "./CandidatForm";
import { isAdminLikeRole, isCoreWriteRole } from "../../utils/roleGroups";

function areFieldValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b === "") return true;
  if (b == null && a === "") return true;
  return false;
}

const BASE_EDITABLE_FIELDS: Array<keyof CandidatFormData> = [
  "nom",
  "prenom",
  "sexe",
  "nom_naissance",
  "email",
  "telephone",
  "date_naissance",
  "departement_naissance",
  "commune_naissance",
  "pays_naissance",
  "nationalite_code",
  "nir",
  "inscrit_france_travail",
  "numero_inscription_france_travail",
  "duree_inscription_france_travail_mois",
  "rqth",
  "permis_b",
  "street_number",
  "street_name",
  "street_complement",
  "code_postal",
  "ville",
  "formation",
  "type_contrat",
  "type_contrat_code",
  "disponibilite",
  "communication",
  "experience",
  "csp",
  "regime_social_code",
  "sportif_haut_niveau",
  "equivalence_jeunes",
  "extension_boe",
  "dernier_diplome_prepare_code",
  "diplome_plus_eleve_obtenu_code",
  "derniere_classe_code",
  "intitule_diplome_prepare",
  "situation_avant_contrat_code",
  "projet_creation_entreprise",
  "representant_lien",
  "representant_nom_naissance",
  "representant_prenom",
  "representant_email",
  "representant_street_name",
  "representant_zip_code",
  "representant_city",
  "origine_sourcing",
  "rgpd_legal_basis",
  "rgpd_notice_status",
  "rgpd_consent_obtained",
];

const STAFF_ONLY_FIELDS: Array<keyof CandidatFormData> = [
  "numero_osia",
  "admissible",
  "inscrit_gespers",
  "en_accompagnement_tre",
  "en_appairage",
];

const ADMIN_ONLY_FIELDS: Array<keyof CandidatFormData> = [
  "notes",
  "resultat_placement",
  "responsable_placement",
  "date_placement",
  "entreprise_placement",
  "contrat_signe",
  "entreprise_validee",
  "courrier_rentree",
  "vu_par",
];

export default function CandidatEditPage() {
  const { id } = useParams();
  const candidatId = Number(id);
  const navigate = useNavigate();

  const { data: meta, loading: loadingMeta } = useCandidatMeta();
  const { user: me } = useMe();
  const { data, loading: loadingItem } = useCandidat(candidatId);
  const { update, loading: saving } = useUpdateCandidat(candidatId);

  const canEditFormation = !!me && isCoreWriteRole(me.role);
  const candidatDisplayName =
    [data?.prenom, data?.nom].filter(Boolean).join(" ").trim() ||
    data?.nom_complet ||
    "Candidat";

  /**
   * 🧩 handleSubmit
   * Laisse la gestion fine des erreurs (400 → champ par champ) au composant <CandidatForm />
   * On ne gère ici que les erreurs inattendues (réseau, 500…)
   */
  const handleSubmit = async (values: CandidatFormData) => {
    try {
      const editableFields = new Set<keyof CandidatFormData>(BASE_EDITABLE_FIELDS);

      if (me?.role && isCoreWriteRole(me.role)) {
        STAFF_ONLY_FIELDS.forEach((field) => editableFields.add(field));
        editableFields.add("formation");
      }

      if (me?.role && isAdminLikeRole(me.role)) {
        ADMIN_ONLY_FIELDS.forEach((field) => editableFields.add(field));
      }

      const payload = Object.fromEntries(
        Object.entries(values).filter(([key, value]) => {
          if (!editableFields.has(key as keyof CandidatFormData)) return false;
          if (value === undefined) return false;
          if (data && areFieldValuesEqual(value, data[key as keyof Candidat])) return false;
          return value !== undefined;
        })
      ) as CandidatFormData;

      if (Object.keys(payload).length === 0) {
        toast.success("Aucune modification a enregistrer.");
        navigate("/candidats");
        return;
      }

      await update(payload);
      toast.success("✅ Candidat mis à jour");
      navigate("/candidats");
    } catch (error: any) {
      const status = error?.response?.status;
      // ❌ Erreurs inattendues (pas du 400 de validation)
      if (status && status !== 400) {
        toast.error("Erreur serveur ou réseau lors de la mise à jour.");
      }
      throw error;
    }
  };

  // ── Loading / Erreurs ────────────────────────────────
  if (loadingMeta || loadingItem) {
    return (
      <PageTemplate
        title="Modifier le candidat"
        subtitle="Chargement des données du candidat."
        maxWidth="xl"
        backButton
        onBack={() => navigate(-1)}
        centered
      >
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>⏳ Chargement…</Typography>
      </PageTemplate>
    );
  }

  if (!data) {
    return (
      <PageTemplate
        title="Modifier le candidat"
        subtitle="Le candidat demandé n'a pas été trouvé."
        maxWidth="xl"
        backButton
        onBack={() => navigate(-1)}
      >
        <Typography color="error">❌ Candidat introuvable.</Typography>
      </PageTemplate>
    );
  }

  // ── Page principale ────────────────────────────────
  return (
    <PageTemplate
      title={`Modifier ${candidatDisplayName}`}
      subtitle="Mettez à jour le candidat dans un shell plus compact, sans toucher au formulaire métier."
      maxWidth="xl"
      backButton
      onBack={() => navigate(-1)}
    >
      <PageSection>
        <Box id="edit-section" sx={{ scrollMarginTop: "80px" }}>
          <Typography variant="h6" gutterBottom>
            Modifier les informations
          </Typography>

          <CandidatForm
            initialValues={data as Candidat}
            initialFormationInfo={data.formation_info ?? null}
            meta={meta}
            currentUser={me}
            canEditFormation={canEditFormation}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/candidats")}
            submitting={saving}
          />
        </Box>
      </PageSection>
    </PageTemplate>
  );
}
