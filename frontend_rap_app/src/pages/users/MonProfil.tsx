// src/pages/users/MonProfil.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Card,
  CardHeader,
  CardContent,
  Grid,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  Link,
} from "@mui/material";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import { useMe } from "../../hooks/useUsers";
import { MeUpdatePayload } from "../../types/User";
import type { Candidat } from "../../types/candidat";
import api from "../../api/axios";
import { useAuth } from "../../hooks/useAuth";

const TYPE_CONTRAT_OPTIONS = [
  { value: "apprentissage", label: "Apprentissage" },
  { value: "professionnalisation", label: "Professionnalisation" },
  { value: "sans_contrat", label: "Sans contrat" },
  { value: "poei_poec", label: "POEI / POEC" },
  { value: "crif", label: "CRIF" },
  { value: "autre", label: "Autre" },
];

const TYPE_CONTRAT_CERFA_OPTIONS = [
  { value: "11", label: "11 - Premier contrat d'apprentissage" },
  { value: "21", label: "21 - Nouveau contrat meme employeur" },
  { value: "22", label: "22 - Nouveau contrat autre employeur" },
  { value: "23", label: "23 - Nouveau contrat apres rupture" },
  { value: "31", label: "31 - Modification situation juridique employeur" },
  { value: "32", label: "32 - Changement d'employeur contrat saisonnier" },
  { value: "33", label: "33 - Prolongation suite echec examen" },
  { value: "34", label: "34 - Prolongation suite RQTH" },
  { value: "35", label: "35 - Diplome supplementaire prepare" },
  { value: "36", label: "36 - Autres changements" },
  { value: "37", label: "37 - Modification lieu d'execution" },
  { value: "38", label: "38 - Modification lieu principal de formation" },
];

const TYPE_CONTRAT_CERFA_PRO_OPTIONS = [
  { value: "11", label: "11 - Contrat initial (cas general)" },
  {
    value: "12",
    label: "12 - Contrat initial avec deux employeurs pour une activite saisonniere",
  },
  { value: "21", label: "21 - Nouveau contrat apres echec a l'evaluation" },
  { value: "22", label: "22 - Nouveau contrat apres defaillance de l'organisme" },
  { value: "23", label: "23 - Nouveau contrat apres maternite, maladie ou accident du travail" },
  { value: "24", label: "24 - Nouveau contrat pour une qualification superieure ou complementaire" },
  { value: "30", label: "30 - Avenant" },
];

const NATIONALITE_OPTIONS = [
  { value: "1", label: "1 - Francaise" },
  { value: "2", label: "2 - Union europeenne" },
  { value: "3", label: "3 - Etranger hors Union europeenne" },
];

const REGIME_SOCIAL_OPTIONS = [
  { value: "1", label: "1 - MSA" },
  { value: "2", label: "2 - URSSAF" },
];

const SITUATION_OPTIONS = [
  { value: "1", label: "1 - Scolaire" },
  { value: "2", label: "2 - Prepa apprentissage" },
  { value: "3", label: "3 - Etudiant" },
  { value: "4", label: "4 - Contrat d'apprentissage" },
  { value: "5", label: "5 - Contrat de professionnalisation" },
  { value: "6", label: "6 - Contrat aide" },
  { value: "7", label: "7 - Stagiaire de la formation professionnelle" },
  { value: "8", label: "8 - CFA sans contrat suite a rupture" },
  { value: "9", label: "9 - Autre situation de stagiaire de la formation professionnelle" },
  { value: "10", label: "10 - Salarie" },
  { value: "11", label: "11 - Recherche d'emploi" },
  { value: "12", label: "12 - Inactif" },
];

const DIPLOME_OPTIONS = [
  { value: "13", label: "13 - Aucun diplome ni titre professionnel" },
  { value: "25", label: "25 - Diplome national du brevet" },
  { value: "26", label: "26 - Certificat de formation generale" },
  { value: "33", label: "33 - CAP" },
  { value: "34", label: "34 - BEP" },
  { value: "35", label: "35 - Certificat de specialisation" },
  { value: "38", label: "38 - Autre CAP/BEP" },
  { value: "41", label: "41 - Baccalaureat professionnel" },
  { value: "42", label: "42 - Baccalaureat general" },
  { value: "43", label: "43 - Baccalaureat technologique" },
  { value: "44", label: "44 - Diplome de specialisation professionnelle" },
  { value: "49", label: "49 - Autre niveau bac" },
  { value: "54", label: "54 - BTS" },
  { value: "55", label: "55 - DUT" },
  { value: "58", label: "58 - Autre niveau bac+2" },
  { value: "62", label: "62 - Licence professionnelle" },
  { value: "63", label: "63 - Licence generale" },
  { value: "64", label: "64 - BUT" },
  { value: "69", label: "69 - Autre niveau bac+3 ou 4" },
  { value: "73", label: "73 - Master" },
  { value: "75", label: "75 - Diplome d'ingenieur" },
  { value: "76", label: "76 - Diplome d'ecole de commerce" },
  { value: "79", label: "79 - Autre niveau bac+5 ou plus" },
  { value: "80", label: "80 - Doctorat" },
];

const DERNIERE_CLASSE_OPTIONS = [
  { value: "01", label: "01 - Derniere annee du cycle suivie et diplome obtenu" },
  { value: "11", label: "11 - 1ere annee validee" },
  { value: "12", label: "12 - 1ere annee non validee" },
  { value: "21", label: "21 - 2e annee validee" },
  { value: "22", label: "22 - 2e annee non validee" },
  { value: "31", label: "31 - 3e annee validee" },
  { value: "32", label: "32 - 3e annee non validee" },
  { value: "40", label: "40 - 1er cycle secondaire acheve" },
  { value: "41", label: "41 - Interruption en 3e" },
  { value: "42", label: "42 - Interruption en 4e" },
];

type CandidateCerfaForm = {
  nom: string;
  prenom: string;
  nom_naissance: string;
  sexe: string;
  date_naissance: string;
  departement_naissance: string;
  commune_naissance: string;
  pays_naissance: string;
  nationalite_code: string;
  nir: string;
  email: string;
  telephone: string;
  street_number: string;
  street_name: string;
  street_complement: string;
  code_postal: string;
  ville: string;
  rqth: boolean;
  sportif_haut_niveau: boolean;
  inscrit_france_travail: boolean;
  numero_inscription_france_travail: string;
  duree_inscription_france_travail_mois: string;
  type_contrat: string;
  type_contrat_code: string;
  regime_social_code: string;
  equivalence_jeunes: boolean;
  extension_boe: boolean;
  situation_avant_contrat_code: string;
  dernier_diplome_prepare_code: string;
  diplome_plus_eleve_obtenu_code: string;
  derniere_classe_code: string;
  intitule_diplome_prepare: string;
  projet_creation_entreprise: boolean;
  representant_lien: string;
  representant_nom_naissance: string;
  representant_prenom: string;
  representant_email: string;
  representant_street_name: string;
  representant_zip_code: string;
  representant_city: string;
};

const EMPTY_CANDIDATE_FORM: CandidateCerfaForm = {
  nom: "",
  prenom: "",
  nom_naissance: "",
  sexe: "",
  date_naissance: "",
  departement_naissance: "",
  commune_naissance: "",
  pays_naissance: "",
  nationalite_code: "",
  nir: "",
  email: "",
  telephone: "",
  street_number: "",
  street_name: "",
  street_complement: "",
  code_postal: "",
  ville: "",
  rqth: false,
  sportif_haut_niveau: false,
  inscrit_france_travail: false,
  numero_inscription_france_travail: "",
  duree_inscription_france_travail_mois: "",
  type_contrat: "",
  type_contrat_code: "",
  regime_social_code: "",
  equivalence_jeunes: false,
  extension_boe: false,
  situation_avant_contrat_code: "",
  dernier_diplome_prepare_code: "",
  diplome_plus_eleve_obtenu_code: "",
  derniere_classe_code: "",
  intitule_diplome_prepare: "",
  projet_creation_entreprise: false,
  representant_lien: "",
  representant_nom_naissance: "",
  representant_prenom: "",
  representant_email: "",
  representant_street_name: "",
  representant_zip_code: "",
  representant_city: "",
};

function extractErrors(err: unknown): Record<string, string[]> {
  const response = (err as { response?: { data?: unknown } })?.response?.data as
    | Record<string, unknown>
    | undefined;
  if (!response || typeof response !== "object") return {};
  const payload = (response.data as Record<string, unknown> | undefined) ?? response;
  const out: Record<string, string[]> = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      out[key] = value.map((item) => String(item));
    } else if (typeof value === "string") {
      out[key] = [value];
    }
  });
  return out;
}

function mapCandidateToForm(candidat: Partial<Candidat> | null | undefined): CandidateCerfaForm {
  if (!candidat) return EMPTY_CANDIDATE_FORM;
  return {
    nom: candidat.nom ?? "",
    prenom: candidat.prenom ?? "",
    nom_naissance: candidat.nom_naissance ?? "",
    sexe: candidat.sexe ?? "",
    date_naissance: candidat.date_naissance ?? "",
    departement_naissance: candidat.departement_naissance ?? "",
    commune_naissance: candidat.commune_naissance ?? "",
    pays_naissance: candidat.pays_naissance ?? "",
    nationalite_code: candidat.nationalite_code ?? "",
    nir: candidat.nir ?? "",
    email: candidat.email ?? "",
    telephone: candidat.telephone ?? "",
    street_number: candidat.street_number ?? "",
    street_name: candidat.street_name ?? "",
    street_complement: candidat.street_complement ?? "",
    code_postal: candidat.code_postal ?? "",
    ville: candidat.ville ?? "",
    rqth: !!candidat.rqth,
    sportif_haut_niveau: !!candidat.sportif_haut_niveau,
    inscrit_france_travail: !!candidat.inscrit_france_travail,
    numero_inscription_france_travail: candidat.numero_inscription_france_travail ?? "",
    duree_inscription_france_travail_mois:
      candidat.duree_inscription_france_travail_mois != null
        ? String(candidat.duree_inscription_france_travail_mois)
        : "",
    type_contrat: candidat.type_contrat ?? "",
    type_contrat_code: candidat.type_contrat_code ?? "",
    regime_social_code: candidat.regime_social_code ?? "",
    equivalence_jeunes: !!candidat.equivalence_jeunes,
    extension_boe: !!candidat.extension_boe,
    situation_avant_contrat_code: candidat.situation_avant_contrat_code ?? "",
    dernier_diplome_prepare_code: candidat.dernier_diplome_prepare_code ?? "",
    diplome_plus_eleve_obtenu_code: candidat.diplome_plus_eleve_obtenu_code ?? "",
    derniere_classe_code: candidat.derniere_classe_code ?? "",
    intitule_diplome_prepare: candidat.intitule_diplome_prepare ?? "",
    projet_creation_entreprise: !!candidat.projet_creation_entreprise,
    representant_lien: candidat.representant_lien ?? "",
    representant_nom_naissance: candidat.representant_nom_naissance ?? "",
    representant_prenom: candidat.representant_prenom ?? "",
    representant_email: candidat.representant_email ?? "",
    representant_street_name: candidat.representant_street_name ?? "",
    representant_zip_code: candidat.representant_zip_code ?? "",
    representant_city: candidat.representant_city ?? "",
  };
}

export default function MonProfil() {
  const { user, loading, error, refetch: refetchUser } = useMe();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showRgpdGateHint, setShowRgpdGateHint] = useState(false);

  const [formData, setFormData] = useState<MeUpdatePayload>({});
  const [candidateForm, setCandidateForm] = useState<CandidateCerfaForm>(EMPTY_CANDIDATE_FORM);
  const [candidateExists, setCandidateExists] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(true);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  /** Case à cocher : accepter la politique (champ compte /api/me/). */
  const [acceptPolitiqueConfidentialite, setAcceptPolitiqueConfidentialite] = useState(false);
  /** Métadonnées dossier : base légale + consentement déjà enregistré. */
  const [rgpdDossier, setRgpdDossier] = useState<{
    legalBasis: string | null;
    consentObtained: boolean;
  } | null>(null);
  /** Candidat confirme le consentement explicite sur le dossier (base légale = consentement). */
  const [confirmConsentDossier, setConfirmConsentDossier] = useState(false);
  /** Suivi demande de compte (POST /api/me/demande-compte/). */
  const [demandeCompteStatut, setDemandeCompteStatut] = useState<string | null>(null);
  const [demandeCompteLoading, setDemandeCompteLoading] = useState(false);
  const [userErrors, setUserErrors] = useState<Record<string, string[]>>({});
  const [candidateErrors, setCandidateErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  /** Candidat / stagiaire : champs contrat, suivi, RQTH en lecture seule côté API. */
  const isSelfServiceCandidate = useMemo(() => {
    const r = user?.role?.toLowerCase?.();
    return r === "candidat" || r === "stagiaire" || r === "candidatuser";
  }, [user?.role]);

  useEffect(() => {
    if (location.pathname !== "/mon-profil") return;
    const st = location.state as { rgpdRequired?: boolean } | null;
    if (st?.rgpdRequired) {
      setShowRgpdGateHint(true);
      navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, location.search, navigate]);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || "",
        bio: user.bio || "",
      });
      if (user.consent_rgpd) {
        setAcceptPolitiqueConfidentialite(true);
      }
    }
  }, [user]);

  const loadCandidateFiche = useCallback(async (opts?: { quiet?: boolean }) => {
    const quiet = Boolean(opts?.quiet);
    try {
      if (!quiet) {
        setCandidateLoading(true);
      }
      setCandidateError(null);
      /* Sans fiche : API renvoie 200 + `null` ; 404 reste géré pour compatibilité. */
      const res = await api.get("/candidats/me/", {
        validateStatus: (s) => s === 200 || s === 404,
      });
      if (res.status === 404 || res.data == null) {
        setCandidateExists(false);
        setRgpdDossier(null);
        setDemandeCompteStatut(null);
        return;
      }
      setCandidateExists(true);
      setCandidateForm(mapCandidateToForm(res.data as Partial<Candidat>));
      const c = res.data as {
        rgpd_legal_basis?: string | null;
        rgpd_consent_obtained?: boolean;
        demande_compte_statut?: string | null;
      };
      setRgpdDossier({
        legalBasis: c.rgpd_legal_basis ?? null,
        consentObtained: !!c.rgpd_consent_obtained,
      });
      setDemandeCompteStatut(c.demande_compte_statut ?? null);
      setConfirmConsentDossier(false);
    } catch {
      setCandidateError("Impossible de charger votre fiche candidat.");
    } finally {
      if (!quiet) {
        setCandidateLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadCandidateFiche();
  }, [loadCandidateFiche]);

  const handleChange = (field: keyof MeUpdatePayload, value: string) => {
    setUserErrors((prev) => ({ ...prev, [field]: [] }));
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCandidateChange = (field: keyof CandidateCerfaForm, value: string | boolean) => {
    setCandidateErrors((prev) => ({ ...prev, [field]: [] }));
    setCandidateForm((prev) => ({ ...prev, [field]: value as never }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const resolvedServerAvatarUrl = useMemo(() => {
    const url = user?.avatar_url;
    if (!url || url.includes("default_avatar") || url.startsWith("/static/")) {
      return undefined;
    }
    return url;
  }, [user?.avatar_url]);

  const typeContratCerfaOptions = useMemo(() => {
    if (candidateForm.type_contrat === "professionnalisation") {
      return TYPE_CONTRAT_CERFA_PRO_OPTIONS;
    }
    if (candidateForm.type_contrat === "apprentissage") {
      return TYPE_CONTRAT_CERFA_OPTIONS;
    }
    return [];
  }, [candidateForm.type_contrat]);

  const formationSummary = useMemo(() => {
    const name = user?.formation_info?.nom;
    const offer = user?.formation_info?.num_offre;
    const centre = user?.centre_lie?.nom || user?.centre?.nom || user?.formation_info?.centre?.nom;
    if (!name && !offer && !centre) return null;
    return [name, offer ? `N° ${offer}` : null, centre].filter(Boolean).join(" • ");
  }, [user]);

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setGlobalError(null);
      setUserErrors({});
      setCandidateErrors({});

      /* Les champs compte doivent toujours venir de /me/, jamais de la fiche candidat. */
      const userJsonBase: MeUpdatePayload = {
        email: formData.email ?? user?.email ?? "",
        first_name: formData.first_name ?? user?.first_name ?? "",
        last_name: formData.last_name ?? user?.last_name ?? "",
        phone: formData.phone ?? user?.phone ?? "",
        bio: formData.bio || "",
      };
      if (acceptPolitiqueConfidentialite && user && !user.consent_rgpd) {
        userJsonBase.consent_rgpd = true;
      }

      const userPayload =
        avatarFile !== null
          ? (() => {
              const fd = new FormData();
              Object.entries(userJsonBase).forEach(([k, v]) => {
                if (v !== undefined && v !== null && k !== "consent_rgpd") {
                  fd.append(k, v as string);
                }
              });
              if (userJsonBase.consent_rgpd) {
                fd.append("consent_rgpd", "true");
              }
              fd.append("avatar", avatarFile);
              return fd;
            })()
          : userJsonBase;

      const rawCandidatePayload: Record<string, unknown> = {
        nom: candidateForm.nom || null,
        prenom: candidateForm.prenom || null,
        nom_naissance: candidateForm.nom_naissance || null,
        sexe: candidateForm.sexe || null,
        date_naissance: candidateForm.date_naissance || null,
        departement_naissance: candidateForm.departement_naissance || null,
        commune_naissance: candidateForm.commune_naissance || null,
        pays_naissance: candidateForm.pays_naissance || null,
        nationalite_code: candidateForm.nationalite_code || null,
        nir: candidateForm.nir || null,
        email: candidateForm.email || null,
        telephone: candidateForm.telephone || null,
        street_number: candidateForm.street_number || null,
        street_name: candidateForm.street_name || null,
        street_complement: candidateForm.street_complement || null,
        code_postal: candidateForm.code_postal || null,
        ville: candidateForm.ville || null,
        rqth: candidateForm.rqth,
        sportif_haut_niveau: candidateForm.sportif_haut_niveau,
        inscrit_france_travail: candidateForm.inscrit_france_travail,
        numero_inscription_france_travail: candidateForm.numero_inscription_france_travail || null,
        duree_inscription_france_travail_mois: candidateForm.duree_inscription_france_travail_mois
          ? Number(candidateForm.duree_inscription_france_travail_mois)
          : null,
        type_contrat: candidateForm.type_contrat || null,
        type_contrat_code: candidateForm.type_contrat_code || null,
        regime_social_code: candidateForm.regime_social_code || null,
        equivalence_jeunes: candidateForm.equivalence_jeunes,
        extension_boe: candidateForm.extension_boe,
        situation_avant_contrat_code: candidateForm.situation_avant_contrat_code || null,
        dernier_diplome_prepare_code: candidateForm.dernier_diplome_prepare_code || null,
        diplome_plus_eleve_obtenu_code: candidateForm.diplome_plus_eleve_obtenu_code || null,
        derniere_classe_code: candidateForm.derniere_classe_code || null,
        intitule_diplome_prepare: candidateForm.intitule_diplome_prepare || null,
        projet_creation_entreprise: candidateForm.projet_creation_entreprise,
        representant_lien: candidateForm.representant_lien || null,
        representant_nom_naissance: candidateForm.representant_nom_naissance || null,
        representant_prenom: candidateForm.representant_prenom || null,
        representant_email: candidateForm.representant_email || null,
        representant_street_name: candidateForm.representant_street_name || null,
        representant_zip_code: candidateForm.representant_zip_code || null,
        representant_city: candidateForm.representant_city || null,
      };
      const selfServiceReadonlyKeys = new Set<string>([
        "type_contrat",
        "type_contrat_code",
        "situation_avant_contrat_code",
        "inscrit_france_travail",
        "numero_inscription_france_travail",
        "duree_inscription_france_travail_mois",
        "rqth",
      ]);
      let candidatePayload: Record<string, unknown> = isSelfServiceCandidate
        ? (Object.fromEntries(
            Object.entries(rawCandidatePayload).filter(([k]) => !selfServiceReadonlyKeys.has(k))
          ) as typeof rawCandidatePayload)
        : rawCandidatePayload;

      if (
        candidateExists &&
        confirmConsentDossier &&
        rgpdDossier?.legalBasis === "consentement" &&
        !rgpdDossier.consentObtained
      ) {
        candidatePayload = { ...candidatePayload, rgpd_consent_obtained: true };
      }

      await api.patch("/me/", userPayload, {
        headers: avatarFile ? { "Content-Type": "multipart/form-data" } : {},
      });
      if (candidateExists) {
        try {
          await api.patch("/candidats/me/", candidatePayload);
        } catch (err) {
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            setCandidateExists(false);
            setCandidateError("Aucune fiche candidat liée à ce compte n'a été trouvée.");
          } else {
            throw err;
          }
        }
      }

      await refetchUser();
      if (candidateExists) {
        await loadCandidateFiche({ quiet: true });
      }

      toast.success("✅ Profil mis à jour !");
    } catch (err) {
      const allErrors = extractErrors(err);
      const nextUserErrors: Record<string, string[]> = {};
      const nextCandidateErrors: Record<string, string[]> = {};
      Object.entries(allErrors).forEach(([key, value]) => {
        if (["email", "first_name", "last_name", "phone", "bio", "avatar", "consent_rgpd"].includes(key)) {
          nextUserErrors[key] = value;
        } else {
          nextCandidateErrors[key] = value;
        }
      });
      setUserErrors(nextUserErrors);
      setCandidateErrors(nextCandidateErrors);
      setGlobalError(
        Object.values(allErrors).flat()[0] || "Erreur lors de la mise à jour de votre profil."
      );
      toast.error("❌ Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleDemandeCompte = async () => {
    try {
      setDemandeCompteLoading(true);
      const res = await api.post("/me/demande-compte/");
      const data = res.data as { message?: string; success?: boolean };
      toast.success(
        data.message || "Demande enregistrée. L'équipe la traitera sous peu."
      );
      await loadCandidateFiche({ quiet: true });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      const msg =
        ax.response?.data?.message ||
        "Impossible d'enregistrer la demande. Réessayez ou contactez l'équipe.";
      toast.error(msg);
    } finally {
      setDemandeCompteLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await api.delete("/users/delete-account/");
      toast.success("🗑️ Votre compte a été supprimé conformément au RGPD.");
      logout();
    } catch (_e) {
      toast.error("❌ Erreur lors de la suppression du compte");
    } finally {
      setDeleting(false);
      setOpenDeleteDialog(false);
    }
  };

  if (loading || candidateLoading) return <CircularProgress />;
  if (error) return <Typography color="error">Erreur chargement profil</Typography>;
  if (!user) return null;

  return (
    <Box sx={{ maxWidth: 980, mx: "auto", mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Mon profil
      </Typography>

      {globalError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {globalError}
        </Alert>
      )}

      {showRgpdGateHint && isSelfServiceCandidate && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          onClose={() => setShowRgpdGateHint(false)}
        >
          L&apos;application a refusé une action : cochez et enregistrez le consentement RGPD sur votre compte
          (et le cas échéant sur le dossier) pour retrouver l&apos;accès complet aux parcours concernés.
        </Alert>
      )}

      {candidateError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {candidateError}
        </Alert>
      )}

      {/* ✅ Avatar actuel */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Avatar
          src={avatarFile ? URL.createObjectURL(avatarFile) : resolvedServerAvatarUrl}
          alt={user.full_name || user.email}
          sx={{ width: 64, height: 64 }}
        >
          {!avatarFile && !resolvedServerAvatarUrl
            ? (user.full_name || user.email || "?").trim().charAt(0).toUpperCase() || "?"
            : null}
        </Avatar>
        <Button variant="outlined" component="label">
          Changer l’avatar
          <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
        </Button>
      </Box>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardHeader
          title="Compte"
          subheader="Informations de connexion et contexte de votre dossier"
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField label="Rôle" fullWidth value={user.role || "—"} disabled />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Rôle lié"
                fullWidth
                value={user.role_lie?.label || user.role_display || "—"}
                disabled
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Centre lié"
                fullWidth
                value={user.centre_lie?.nom || user.centre?.nom || "—"}
                disabled
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                label="Formation liée"
                fullWidth
                value={formationSummary || "Aucune formation liée"}
                disabled
                helperText={
                  candidateExists
                    ? "Ces indications viennent de votre fiche candidat et servent au préremplissage des CERFA."
                    : "Indicateurs de contexte issus de votre compte. La fiche candidat détaillée (identité, CERFA) s’affichera ci-dessous une fois le dossier lié et accessible."
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Bio"
                fullWidth
                multiline
                minRows={3}
                value={formData.bio || ""}
                onChange={(e) => handleChange("bio", e.target.value)}
                error={!!userErrors.bio?.length}
                helperText={userErrors.bio?.[0]}
              />
            </Grid>
            {!candidateExists && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Coordonnées du compte (sans fiche candidat rattachée, ces champs alimentent la sauvegarde, y
                    compris le consentement RGPD)
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Email"
                    fullWidth
                    type="email"
                    value={formData.email ?? ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    error={!!userErrors.email?.length}
                    helperText={userErrors.email?.[0]}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Téléphone"
                    fullWidth
                    value={formData.phone ?? ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    error={!!userErrors.phone?.length}
                    helperText={userErrors.phone?.[0]}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Prénom"
                    fullWidth
                    value={formData.first_name ?? ""}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    error={!!userErrors.first_name?.length}
                    helperText={userErrors.first_name?.[0]}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Nom"
                    fullWidth
                    value={formData.last_name ?? ""}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    error={!!userErrors.last_name?.length}
                    helperText={userErrors.last_name?.[0]}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {candidateExists && isSelfServiceCandidate && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardHeader
            title="Accès et compte candidat"
            subheader="Demande adressée à l'équipe (recrutement / administrateur). La création directe du compte est réservée au staff."
          />
          <CardContent>
            {demandeCompteStatut === "en_attente" && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Votre demande de prise en charge du compte est <strong>en attente</strong> auprès de
                l'équipe.
              </Alert>
            )}
            {demandeCompteStatut === "acceptee" && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Votre demande a été <strong>acceptée</strong>. En cas de difficulté de connexion,
                contactez l'organisme.
              </Alert>
            )}
            {demandeCompteStatut === "refusee" && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Une demande précédente a été <strong>refusée</strong>. Vous pouvez déposer une nouvelle
                demande si votre situation a changé, ou contacter directement l'équipe.
              </Alert>
            )}
            {(!demandeCompteStatut ||
              demandeCompteStatut === "aucune" ||
              demandeCompteStatut === "refusee") && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Si l'équipe doit valider ou finaliser l'accès lié à votre fiche, vous pouvez enregistrer une
                  demande officielle. Pour un <strong>premier rattachement</strong> (sans fiche liée), il faut
                  passer par l'équipe, qui pourra lier le dossier et utiliser l'action « Créer ou lier le compte
                  candidat » dans l'interface staff.
                </Typography>
                <Button
                  variant="outlined"
                  disabled={demandeCompteLoading}
                  onClick={handleDemandeCompte}
                >
                  {demandeCompteLoading
                    ? "Enregistrement…"
                    : "Enregistrer une demande de compte auprès de l'équipe"}
                </Button>
              </Box>
            )}
            {demandeCompteStatut === "en_attente" && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Vous serez notifié selon le processus de l'organisme. Pas besoin d'envoyer une seconde demande
                tant que celle-ci est en cours.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {candidateExists && (
        <>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader
              title="Identité et coordonnées"
              subheader="Renseignez uniquement les informations qui vous concernent directement pour préparer vos CERFA."
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Nom d'usage"
                    fullWidth
                    value={candidateForm.nom}
                    onChange={(e) => handleCandidateChange("nom", e.target.value)}
                    error={!!candidateErrors.nom?.length}
                    helperText={candidateErrors.nom?.[0]}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Prénom"
                    fullWidth
                    value={candidateForm.prenom}
                    onChange={(e) => handleCandidateChange("prenom", e.target.value)}
                    error={!!candidateErrors.prenom?.length}
                    helperText={candidateErrors.prenom?.[0]}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Nom de naissance"
                    fullWidth
                    value={candidateForm.nom_naissance}
                    onChange={(e) => handleCandidateChange("nom_naissance", e.target.value)}
                    error={!!candidateErrors.nom_naissance?.length}
                    helperText={candidateErrors.nom_naissance?.[0]}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    label="Sexe"
                    fullWidth
                    value={candidateForm.sexe}
                    onChange={(e) => handleCandidateChange("sexe", e.target.value)}
                  >
                    <MenuItem value="">Non précisé</MenuItem>
                    <MenuItem value="M">Masculin</MenuItem>
                    <MenuItem value="F">Féminin</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Date de naissance"
                    type="date"
                    fullWidth
                    value={candidateForm.date_naissance}
                    onChange={(e) => handleCandidateChange("date_naissance", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Département de naissance"
                    fullWidth
                    value={candidateForm.departement_naissance}
                    onChange={(e) => handleCandidateChange("departement_naissance", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Commune de naissance"
                    fullWidth
                    value={candidateForm.commune_naissance}
                    onChange={(e) => handleCandidateChange("commune_naissance", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Pays de naissance"
                    fullWidth
                    value={candidateForm.pays_naissance}
                    onChange={(e) => handleCandidateChange("pays_naissance", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Email"
                    fullWidth
                    value={candidateForm.email}
                    onChange={(e) => handleCandidateChange("email", e.target.value)}
                    error={!!candidateErrors.email?.length || !!userErrors.email?.length}
                    helperText={candidateErrors.email?.[0] || userErrors.email?.[0]}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Téléphone"
                    fullWidth
                    value={candidateForm.telephone}
                    onChange={(e) => handleCandidateChange("telephone", e.target.value)}
                    error={!!candidateErrors.telephone?.length}
                    helperText={candidateErrors.telephone?.[0]}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Numéro de sécurité sociale (NIR)"
                    fullWidth
                    value={candidateForm.nir}
                    onChange={(e) => handleCandidateChange("nir", e.target.value)}
                    error={!!candidateErrors.nir?.length}
                    helperText={candidateErrors.nir?.[0]}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Nationalité CERFA"
                    fullWidth
                    value={candidateForm.nationalite_code}
                    onChange={(e) => handleCandidateChange("nationalite_code", e.target.value)}
                  >
                    <MenuItem value="">Non définie</MenuItem>
                    {NATIONALITE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    label="N° voie"
                    fullWidth
                    value={candidateForm.street_number}
                    onChange={(e) => handleCandidateChange("street_number", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField
                    label="Voie"
                    fullWidth
                    value={candidateForm.street_name}
                    onChange={(e) => handleCandidateChange("street_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField
                    label="Complément d'adresse"
                    fullWidth
                    value={candidateForm.street_complement}
                    onChange={(e) => handleCandidateChange("street_complement", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Code postal"
                    fullWidth
                    value={candidateForm.code_postal}
                    onChange={(e) => handleCandidateChange("code_postal", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    label="Ville"
                    fullWidth
                    value={candidateForm.ville}
                    onChange={(e) => handleCandidateChange("ville", e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader
              title="Informations utiles au CERFA"
              subheader="Seulement les éléments personnels repris dans les CERFA apprentissage et professionnalisation."
            />
            <CardContent>
              {isSelfServiceCandidate && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Type de contrat, situation avant contrat, indicateurs France Travail et RQTH sont affichés à titre
                  informatif (saisis ou validés par l&apos;organisation).
                </Alert>
              )}
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Type de contrat"
                    fullWidth
                    disabled={isSelfServiceCandidate}
                    value={candidateForm.type_contrat}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      const allowedCodes =
                        nextType === "professionnalisation"
                          ? new Set(TYPE_CONTRAT_CERFA_PRO_OPTIONS.map((opt) => opt.value))
                          : nextType === "apprentissage"
                            ? new Set(TYPE_CONTRAT_CERFA_OPTIONS.map((opt) => opt.value))
                            : new Set<string>();
                      setCandidateErrors((prev) => ({ ...prev, type_contrat: [], type_contrat_code: [] }));
                      setCandidateForm((prev) => ({
                        ...prev,
                        type_contrat: nextType,
                        type_contrat_code:
                          prev.type_contrat_code && allowedCodes.has(prev.type_contrat_code)
                            ? prev.type_contrat_code
                            : "",
                      }));
                    }}
                    error={!!candidateErrors.type_contrat?.length}
                    helperText={candidateErrors.type_contrat?.[0]}
                  >
                    <MenuItem value="">Non défini</MenuItem>
                    {TYPE_CONTRAT_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    select
                    label="Type de contrat CERFA (code notice)"
                    fullWidth
                    value={candidateForm.type_contrat_code}
                    onChange={(e) => handleCandidateChange("type_contrat_code", e.target.value)}
                    disabled={isSelfServiceCandidate || typeContratCerfaOptions.length === 0}
                    error={!!candidateErrors.type_contrat_code?.length}
                    helperText={
                      candidateErrors.type_contrat_code?.[0] ||
                      (typeContratCerfaOptions.length === 0
                        ? "Sélectionnez d'abord un type de contrat apprentissage ou professionnalisation."
                        : "Code officiel utilisé pour le préremplissage du CERFA.")
                    }
                  >
                    <MenuItem value="">Non défini</MenuItem>
                    {typeContratCerfaOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Régime social CERFA"
                    fullWidth
                    value={candidateForm.regime_social_code}
                    onChange={(e) => handleCandidateChange("regime_social_code", e.target.value)}
                  >
                    <MenuItem value="">Non défini</MenuItem>
                    {REGIME_SOCIAL_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Situation avant contrat CERFA"
                    fullWidth
                    value={candidateForm.situation_avant_contrat_code}
                    onChange={(e) => handleCandidateChange("situation_avant_contrat_code", e.target.value)}
                    disabled={isSelfServiceCandidate}
                  >
                    <MenuItem value="">Non définie</MenuItem>
                    {SITUATION_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Intitulé du diplôme préparé"
                    fullWidth
                    value={candidateForm.intitule_diplome_prepare}
                    onChange={(e) => handleCandidateChange("intitule_diplome_prepare", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Dernier diplôme préparé CERFA"
                    fullWidth
                    value={candidateForm.dernier_diplome_prepare_code}
                    onChange={(e) => handleCandidateChange("dernier_diplome_prepare_code", e.target.value)}
                  >
                    <MenuItem value="">Non défini</MenuItem>
                    {DIPLOME_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Diplôme le plus élevé obtenu CERFA"
                    fullWidth
                    value={candidateForm.diplome_plus_eleve_obtenu_code}
                    onChange={(e) => handleCandidateChange("diplome_plus_eleve_obtenu_code", e.target.value)}
                  >
                    <MenuItem value="">Non défini</MenuItem>
                    {DIPLOME_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Dernière année suivie CERFA"
                    fullWidth
                    value={candidateForm.derniere_classe_code}
                    onChange={(e) => handleCandidateChange("derniere_classe_code", e.target.value)}
                  >
                    <MenuItem value="">Non définie</MenuItem>
                    {DERNIERE_CLASSE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Numéro d'inscription France Travail"
                    fullWidth
                    value={candidateForm.numero_inscription_france_travail}
                    onChange={(e) => handleCandidateChange("numero_inscription_france_travail", e.target.value)}
                    disabled={isSelfServiceCandidate}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Durée d'inscription France Travail (mois)"
                    fullWidth
                    type="number"
                    value={candidateForm.duree_inscription_france_travail_mois}
                    onChange={(e) =>
                      handleCandidateChange("duree_inscription_france_travail_mois", e.target.value)
                    }
                    inputProps={{ min: 0 }}
                    disabled={isSelfServiceCandidate}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={candidateForm.rqth}
                          onChange={(e) => handleCandidateChange("rqth", e.target.checked)}
                          disabled={isSelfServiceCandidate}
                        />
                      }
                      label="RQTH"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={candidateForm.equivalence_jeunes}
                          onChange={(e) => handleCandidateChange("equivalence_jeunes", e.target.checked)}
                        />
                      }
                      label="Équivalence jeunes"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={candidateForm.extension_boe}
                          onChange={(e) => handleCandidateChange("extension_boe", e.target.checked)}
                        />
                      }
                      label="Extension BOE"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={candidateForm.inscrit_france_travail}
                          onChange={(e) => handleCandidateChange("inscrit_france_travail", e.target.checked)}
                          disabled={isSelfServiceCandidate}
                        />
                      }
                      label="Inscrit France Travail"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={candidateForm.sportif_haut_niveau}
                          onChange={(e) => handleCandidateChange("sportif_haut_niveau", e.target.checked)}
                        />
                      }
                      label="Sportif de haut niveau"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={candidateForm.projet_creation_entreprise}
                          onChange={(e) => handleCandidateChange("projet_creation_entreprise", e.target.checked)}
                        />
                      }
                      label="Projet création / reprise d'entreprise"
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader
              title="Représentant légal"
              subheader="À renseigner si nécessaire, notamment pour un candidat mineur."
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Lien"
                    fullWidth
                    value={candidateForm.representant_lien}
                    onChange={(e) => handleCandidateChange("representant_lien", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Nom de naissance"
                    fullWidth
                    value={candidateForm.representant_nom_naissance}
                    onChange={(e) => handleCandidateChange("representant_nom_naissance", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Prénom"
                    fullWidth
                    value={candidateForm.representant_prenom}
                    onChange={(e) => handleCandidateChange("representant_prenom", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Email"
                    fullWidth
                    value={candidateForm.representant_email}
                    onChange={(e) => handleCandidateChange("representant_email", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Adresse"
                    fullWidth
                    value={candidateForm.representant_street_name}
                    onChange={(e) => handleCandidateChange("representant_street_name", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    label="Code postal"
                    fullWidth
                    value={candidateForm.representant_zip_code}
                    onChange={(e) => handleCandidateChange("representant_zip_code", e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    label="Commune"
                    fullWidth
                    value={candidateForm.representant_city}
                    onChange={(e) => handleCandidateChange("representant_city", e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </>
      )}

      {!candidateExists && !candidateError && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Aucune fiche candidat détaillée n&apos;a pu être chargée (aucun dossier rattaché à ce compte, ou accès
          indisponible). Vous pouvez tout de même enregistrer le consentement RGPD (case ci-dessous + bouton
          Enregistrer) : la sauvegarde s&apos;applique à votre compte via les coordonnées affichées dans
          « Compte ». Pour lier un dossier candidat, contactez l&apos;équipe pédagogique.
        </Alert>
      )}

      <Divider sx={{ my: 3 }} />

      {/* 🔒 Informations RGPD */}
      {user && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            🔐 Consentement RGPD
          </Typography>

          {user.consent_rgpd ? (
            <Typography variant="body2">
              Vous avez accepté la politique de confidentialité
              {user.consent_date
                ? ` le ${new Date(user.consent_date).toLocaleDateString("fr-FR")}.`
                : "."}
            </Typography>
          ) : (
            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptPolitiqueConfidentialite}
                  onChange={(e) => {
                    setAcceptPolitiqueConfidentialite(e.target.checked);
                    setUserErrors((prev) => ({ ...prev, consent_rgpd: [] }));
                  }}
                />
              }
              label="J'ai lu et j'accepte la politique de confidentialité (compte & plateforme). Cochez cette case puis enregistrez le profil."
            />
          )}

          {userErrors.consent_rgpd?.[0] && (
            <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
              {userErrors.consent_rgpd[0]}
            </Typography>
          )}

          <Typography variant="body2" sx={{ mt: 1 }}>
            Consultez notre{" "}
            <Link
              href="/politique-confidentialite"
              color="primary"
              underline="always"
              target="_blank"
              rel="noopener noreferrer"
            >
              politique de confidentialité
            </Link>{" "}
            pour plus d’informations.
          </Typography>

          {candidateExists &&
            rgpdDossier?.legalBasis === "consentement" &&
            !rgpdDossier.consentObtained && (
              <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Dossier candidat : la base légale enregistrée par l&apos;organisme est le consentement. Vous pouvez
                  confirmer ici que vous validez ce consentement explicite.
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={confirmConsentDossier}
                      onChange={(e) => {
                        setConfirmConsentDossier(e.target.checked);
                        setCandidateErrors((prev) => ({ ...prev, rgpd_consent_obtained: [] }));
                      }}
                    />
                  }
                  label="Je confirme le consentement explicite lié à mon dossier (l&apos;équipe a renseigné la base légale « consentement »)."
                />
                {candidateErrors.rgpd_consent_obtained?.[0] && (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                    {candidateErrors.rgpd_consent_obtained[0]}
                  </Typography>
                )}
              </Box>
            )}

          {candidateExists && rgpdDossier?.consentObtained && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Consentement explicite sur le dossier : enregistré.
            </Typography>
          )}
        </Box>
      )}

      {/* ✅ Actions */}
      <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={saving}>
          {saving ? "⏳ Sauvegarde..." : "💾 Enregistrer"}
        </Button>

        <Button
          variant="outlined"
          color="error"
          onClick={() => setOpenDeleteDialog(true)}
          disabled={deleting}
        >
          {deleting ? "⏳ Suppression..." : "🗑️ Supprimer mon compte"}
        </Button>
      </Box>

      {/* 🧩 Modale de confirmation RGPD */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        aria-labelledby="delete-account-dialog-title"
      >
        <DialogTitle id="delete-account-dialog-title">Suppression de votre compte</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ whiteSpace: "pre-line" }}>
            ⚠️ Cette action est irréversible.
            {"\n\n"}
            Votre compte et vos données personnelles seront anonymisés conformément au RGPD.
            {"\n\n"}
            Souhaitez-vous continuer ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Annuler</Button>
          <Button onClick={handleDeleteAccount} color="error" disabled={deleting}>
            {deleting ? "Suppression..." : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 3, fontSize: "0.85rem", lineHeight: 1.4 }}
      >
        Conformément au RGPD, vous pouvez demander la suppression de votre compte. Cela entraîne la
        désactivation de votre accès. Certaines données peuvent être conservées temporairement pour
        des obligations légales ou statistiques. Pour toute demande complémentaire (export ou
        effacement total des données), veuillez contacter l’administrateur.
      </Typography>
    </Box>
  );
}
