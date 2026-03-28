import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Alert,
  Grid,
  Typography,
  Divider,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { toast } from "react-toastify";
import { CerfaContrat, CerfaContratCreate } from "../../types/cerfa";
import { useCerfaPrefill } from "../../hooks/useCerfa";
import CandidatsSelectModal from "../../components/modals/CandidatsSelectModal";
import FormationSelectModal from "../../components/modals/FormationSelectModal";
import PartenaireSelectModal from "../../components/modals/PartenairesSelectModal";

type CerfaFormProps = {
  open: boolean;
  onClose: () => void;
  initialData?: CerfaContrat | null;
  initialContext?: Partial<CerfaContratCreate> | null;
  initialSelections?: {
    candidat?: { id: number; nom_complet?: string | null } | null;
    formation?: { id: number; nom?: string | null } | null;
    partenaire?: { id: number; nom?: string | null } | null;
  } | null;
  onSubmit?: (data: CerfaContratCreate) => Promise<void> | void;
  readOnly?: boolean;
};

export function CerfaForm({
  open,
  onClose,
  initialData = null,
  initialContext = null,
  initialSelections = null,
  onSubmit,
  readOnly = false,
}: CerfaFormProps) {
  const [form, setForm] = useState<Partial<CerfaContratCreate>>({});
  const [selectedCandidat, setSelectedCandidat] = useState<any>(null);
  const [selectedFormation, setSelectedFormation] = useState<any>(null);
  const [selectedPartenaire, setSelectedPartenaire] = useState<any>(null);

  const [showCandidatModal, setShowCandidatModal] = useState(false);
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [showPartenaireModal, setShowPartenaireModal] = useState(false);
  const [prefillInfo, setPrefillInfo] = useState<string>("");
  const { mutateAsync: prefillCerfa, isPending: isPrefilling } = useCerfaPrefill();
  const setField = (field: keyof CerfaContratCreate, value: unknown) =>
    setForm((current) => ({ ...current, [field]: value }));

  const hasValue = (value: unknown) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  };

  const mergePrefillIntoForm = useCallback(
    (
      current: Partial<CerfaContratCreate>,
      payload: Partial<CerfaContratCreate>
    ) => {
      const next = { ...current };
      Object.entries(payload).forEach(([key, value]) => {
        const formKey = key as keyof CerfaContratCreate;
        if (!hasValue(next[formKey]) && hasValue(value)) {
          next[formKey] = value as never;
        }
      });
      return next;
    },
    []
  );

  const buildInitialFormData = (contrat: CerfaContrat): Partial<CerfaContratCreate> => ({
    candidat: contrat.candidat,
    formation: contrat.formation,
    employeur: contrat.employeur,
    auto_generated: contrat.auto_generated,
    employeur_prive: contrat.employeur_prive,
    employeur_public: contrat.employeur_public,
    employeur_nom: contrat.employeur_nom,
    employeur_adresse_numero: contrat.employeur_adresse_numero,
    employeur_adresse_voie: contrat.employeur_adresse_voie,
    employeur_adresse_complement: contrat.employeur_adresse_complement,
    employeur_code_postal: contrat.employeur_code_postal,
    employeur_commune: contrat.employeur_commune,
    employeur_telephone: contrat.employeur_telephone,
    employeur_email: contrat.employeur_email,
    employeur_siret: contrat.employeur_siret,
    employeur_type: contrat.employeur_type,
    employeur_specifique: contrat.employeur_specifique,
    employeur_code_ape: contrat.employeur_code_ape,
    employeur_effectif: contrat.employeur_effectif,
    employeur_code_idcc: contrat.employeur_code_idcc,
    employeur_regime_assurance_chomage: contrat.employeur_regime_assurance_chomage,
    maitre1_nom: contrat.maitre1_nom,
    maitre1_prenom: contrat.maitre1_prenom,
    maitre1_date_naissance: contrat.maitre1_date_naissance,
    maitre1_email: contrat.maitre1_email,
    maitre1_emploi: contrat.maitre1_emploi,
    maitre1_diplome: contrat.maitre1_diplome,
    maitre1_niveau_diplome: contrat.maitre1_niveau_diplome,
    maitre2_nom: contrat.maitre2_nom,
    maitre2_prenom: contrat.maitre2_prenom,
    maitre2_date_naissance: contrat.maitre2_date_naissance,
    maitre2_email: contrat.maitre2_email,
    maitre2_emploi: contrat.maitre2_emploi,
    maitre2_diplome: contrat.maitre2_diplome,
    maitre2_niveau_diplome: contrat.maitre2_niveau_diplome,
    maitre_eligible: contrat.maitre_eligible,
    apprenti_nom_naissance: contrat.apprenti_nom_naissance,
    apprenti_nom_usage: contrat.apprenti_nom_usage,
    apprenti_prenom: contrat.apprenti_prenom,
    apprenti_nir: contrat.apprenti_nir,
    apprenti_numero: contrat.apprenti_numero,
    apprenti_voie: contrat.apprenti_voie,
    apprenti_complement: contrat.apprenti_complement,
    apprenti_code_postal: contrat.apprenti_code_postal,
    apprenti_commune: contrat.apprenti_commune,
    apprenti_telephone: contrat.apprenti_telephone,
    apprenti_email: contrat.apprenti_email,
    representant_nom: contrat.representant_nom,
    representant_lien: contrat.representant_lien,
    representant_adresse_numero: contrat.representant_adresse_numero,
    representant_adresse_voie: contrat.representant_adresse_voie,
    representant_adresse_complement: contrat.representant_adresse_complement,
    representant_code_postal: contrat.representant_code_postal,
    representant_commune: contrat.representant_commune,
    representant_email: contrat.representant_email,
    apprenti_date_naissance: contrat.apprenti_date_naissance,
    apprenti_sexe: contrat.apprenti_sexe,
    apprenti_departement_naissance: contrat.apprenti_departement_naissance,
    apprenti_commune_naissance: contrat.apprenti_commune_naissance,
    apprenti_nationalite: contrat.apprenti_nationalite,
    apprenti_regime_social: contrat.apprenti_regime_social,
    apprenti_sportif_haut_niveau: contrat.apprenti_sportif_haut_niveau,
    apprenti_rqth: contrat.apprenti_rqth,
    apprenti_droits_rqth: contrat.apprenti_droits_rqth,
    apprenti_equivalence_jeunes: contrat.apprenti_equivalence_jeunes,
    apprenti_extension_boe: contrat.apprenti_extension_boe,
    apprenti_situation_avant: contrat.apprenti_situation_avant,
    apprenti_dernier_diplome_prepare: contrat.apprenti_dernier_diplome_prepare,
    apprenti_derniere_annee_suivie: contrat.apprenti_derniere_annee_suivie,
    apprenti_intitule_dernier_diplome: contrat.apprenti_intitule_dernier_diplome,
    apprenti_plus_haut_diplome: contrat.apprenti_plus_haut_diplome,
    apprenti_projet_entreprise: contrat.apprenti_projet_entreprise,
    cfa_entreprise: contrat.cfa_entreprise,
    cfa_denomination: contrat.cfa_denomination,
    cfa_uai: contrat.cfa_uai,
    cfa_siret: contrat.cfa_siret,
    cfa_adresse_numero: contrat.cfa_adresse_numero,
    cfa_adresse_voie: contrat.cfa_adresse_voie,
    cfa_adresse_complement: contrat.cfa_adresse_complement,
    cfa_code_postal: contrat.cfa_code_postal,
    cfa_commune: contrat.cfa_commune,
    cfa_est_lieu_formation_principal: contrat.cfa_est_lieu_formation_principal,
    diplome_vise: contrat.diplome_vise,
    diplome_intitule: contrat.diplome_intitule,
    code_diplome: contrat.code_diplome,
    code_rncp: contrat.code_rncp,
    formation_debut: contrat.formation_debut,
    formation_fin: contrat.formation_fin,
    formation_duree_heures: contrat.formation_duree_heures,
    formation_distance_heures: contrat.formation_distance_heures,
    formation_lieu_denomination: contrat.formation_lieu_denomination,
    formation_lieu_uai: contrat.formation_lieu_uai,
    formation_lieu_siret: contrat.formation_lieu_siret,
    formation_lieu_voie: contrat.formation_lieu_voie,
    formation_lieu_code_postal: contrat.formation_lieu_code_postal,
    formation_lieu_commune: contrat.formation_lieu_commune,
    type_contrat: contrat.type_contrat,
    type_derogation: contrat.type_derogation,
    numero_contrat_precedent: contrat.numero_contrat_precedent,
    date_conclusion: contrat.date_conclusion,
    date_debut_execution: contrat.date_debut_execution,
    date_fin_contrat: contrat.date_fin_contrat,
    date_effet_avenant: contrat.date_effet_avenant,
    duree_hebdo_heures: contrat.duree_hebdo_heures,
    duree_hebdo_minutes: contrat.duree_hebdo_minutes,
    salaire_brut_mensuel: contrat.salaire_brut_mensuel,
    caisse_retraite: contrat.caisse_retraite,
    lieu_signature: contrat.lieu_signature,
  });

  // 🔁 Pré-remplissage en mode édition
  useEffect(() => {
    if (initialData) {
      setForm(buildInitialFormData(initialData));
      setSelectedCandidat({
        id: initialData.candidat,
        nom_complet: [initialData.apprenti_prenom, initialData.apprenti_nom_naissance]
          .filter(Boolean)
          .join(" "),
      });
      setSelectedFormation(
        initialData.formation
          ? {
              id: initialData.formation,
              nom: initialData.diplome_vise || initialData.diplome_intitule || `Formation #${initialData.formation}`,
            }
          : null
      );
      setSelectedPartenaire(
        initialData.employeur
          ? {
              id: initialData.employeur,
              nom: initialData.employeur_nom || `Partenaire #${initialData.employeur}`,
            }
          : null
      );
      setPrefillInfo("Les informations du CERFA existant ont ete rechargees.");
    } else if (initialContext) {
      setForm(initialContext);
      setSelectedCandidat(
        initialSelections?.candidat?.id
          ? {
              id: initialSelections.candidat.id,
              nom_complet:
                initialSelections.candidat.nom_complet ??
                (typeof initialContext.candidat === "number"
                  ? `Candidat #${initialContext.candidat}`
                  : ""),
            }
          : null
      );
      setSelectedFormation(
        initialSelections?.formation?.id
          ? {
              id: initialSelections.formation.id,
              nom:
                initialSelections.formation.nom ??
                (typeof initialContext.formation === "number"
                  ? `Formation #${initialContext.formation}`
                  : ""),
            }
          : null
      );
      setSelectedPartenaire(
        initialSelections?.partenaire?.id
          ? {
              id: initialSelections.partenaire.id,
              nom:
                initialSelections.partenaire.nom ??
                (typeof initialContext.employeur === "number"
                  ? `Partenaire #${initialContext.employeur}`
                  : ""),
            }
          : null
      );
      setPrefillInfo("Le contexte CERFA a ete initialise depuis la fiche candidat.");
    } else {
      setForm({});
      setSelectedCandidat(null);
      setSelectedFormation(null);
      setSelectedPartenaire(null);
      setPrefillInfo("");
    }
  }, [initialContext, initialData, initialSelections]);

  const applyPrefill = useCallback(
    async (
      params: {
        candidat?: number | string | null;
        formation?: number | string | null;
        employeur?: number | string | null;
      },
      message: string
    ) => {
      try {
        const payload = await prefillCerfa(params);
        setForm((current) => mergePrefillIntoForm(current, payload));
        setPrefillInfo(message);
      } catch (_err) {
        toast.error("Erreur lors du pre-remplissage automatique du CERFA.");
      }
    },
    [mergePrefillIntoForm, prefillCerfa]
  );

  const applyCandidateOnlyPrefill = useCallback(
    async (candidatId: number, message: string) => {
      try {
        const payload = await prefillCerfa({ candidat: candidatId });
        if (!payload || typeof payload !== "object") {
          toast.error("Impossible de pre-remplir le CERFA avec les donnees candidat.");
          return;
        }
        setForm((current) => mergePrefillIntoForm(current, payload));
        if (typeof payload.formation === "number") {
          setSelectedFormation((current: any) =>
            current?.id === payload.formation
              ? current
              : {
                  id: payload.formation,
                  nom:
                    (typeof payload.diplome_vise === "string" && payload.diplome_vise) ||
                    (typeof payload.diplome_intitule === "string" && payload.diplome_intitule) ||
                    `Formation #${payload.formation}`,
                }
          );
        }
        setPrefillInfo(message);
      } catch (_err) {
        toast.error("Erreur lors du pre-remplissage candidat du CERFA.");
      }
    },
    [mergePrefillIntoForm, prefillCerfa]
  );

  useEffect(() => {
    if (!open || initialData || !initialContext) return;
    if (typeof initialContext.candidat !== "number") return;

    void applyCandidateOnlyPrefill(
      initialContext.candidat,
      "Le CERFA a ete pre-rempli automatiquement avec les donnees du candidat."
    );
  }, [applyCandidateOnlyPrefill, initialContext, initialData, open]);

  const handlePrefill = async () => {
    if (!form.candidat && !form.formation && !form.employeur) {
      toast.error("Selectionne au moins un candidat, une formation ou un employeur.");
      return;
    }

    try {
      const payload = await prefillCerfa({
        candidat: form.candidat,
        formation: form.formation,
        employeur: form.employeur,
      });
      setForm((current) => mergePrefillIntoForm(current, payload));
      setPrefillInfo("Le formulaire a ete pre-rempli avec les donnees deja disponibles.");
      toast.success("Pre-remplissage CERFA effectue.");
    } catch (_err) {
      toast.error("Erreur lors du pre-remplissage du CERFA.");
    }
  };

  // ✅ Validation minimale avant envoi
  const handleSubmit = () => {
    if (!initialData && !form.candidat) {
      toast.error("Veuillez selectionner un candidat.");
      return;
    }

    if (onSubmit) {
      onSubmit(form as CerfaContratCreate);
    }
  };

  const renderCheckbox = (
    field: keyof CerfaContratCreate,
    label: string,
    value?: boolean | null
  ) => (
    <FormControlLabel
      control={
        <Checkbox
          checked={!!value}
          onChange={(e) => setField(field, e.target.checked)}
          disabled={readOnly}
        />
      }
      label={label}
    />
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          {initialData ? "Modifier un contrat CERFA" : "Créer un contrat CERFA"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {prefillInfo ? <Alert severity="info">{prefillInfo}</Alert> : null}
            <Button
              variant="outlined"
              onClick={() => setShowCandidatModal(true)}
              disabled={readOnly}
            >
              {selectedCandidat
                ? `👤 ${selectedCandidat.nom_complet}`
                : form.candidat
                  ? `👤 Candidat #${form.candidat}`
                  : "Sélectionner un candidat"}
            </Button>

            <Button
              variant="outlined"
              onClick={() => setShowFormationModal(true)}
              disabled={readOnly}
            >
              {selectedFormation
                ? `🎓 ${selectedFormation.nom}`
                : form.formation
                  ? `🎓 Formation #${form.formation}`
                  : "Sélectionner une formation"}
            </Button>

            <Button
              variant="outlined"
              onClick={() => setShowPartenaireModal(true)}
              disabled={readOnly}
            >
              {selectedPartenaire
                ? `🏢 ${selectedPartenaire.nom}`
                : form.employeur_nom
                  ? `🏢 ${form.employeur_nom}`
                  : "Sélectionner un partenaire"}
            </Button>

            <TextField
              label="Date de conclusion"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.date_conclusion ?? ""}
              onChange={(e) => setField("date_conclusion", e.target.value)}
              disabled={readOnly}
            />

            <Button
              variant="contained"
              color="secondary"
              startIcon={<AutoFixHighIcon />}
              onClick={handlePrefill}
              disabled={readOnly || isPrefilling}
            >
              {isPrefilling ? "Pre-remplissage..." : "Pre-remplir avec les donnees disponibles"}
            </Button>

            <Divider />

            <Typography variant="subtitle2">Apprenti</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nom de naissance"
                  value={form.apprenti_nom_naissance ?? ""}
                  onChange={(e) => setField("apprenti_nom_naissance", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nom d'usage"
                  value={form.apprenti_nom_usage ?? ""}
                  onChange={(e) => setField("apprenti_nom_usage", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Prenom"
                  value={form.apprenti_prenom ?? ""}
                  onChange={(e) => setField("apprenti_prenom", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="NIR"
                  value={form.apprenti_nir ?? ""}
                  onChange={(e) => setField("apprenti_nir", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email apprenti"
                  value={form.apprenti_email ?? ""}
                  onChange={(e) => setField("apprenti_email", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telephone apprenti"
                  value={form.apprenti_telephone ?? ""}
                  onChange={(e) => setField("apprenti_telephone", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Date de naissance"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.apprenti_date_naissance ?? ""}
                  onChange={(e) => setField("apprenti_date_naissance", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Sexe"
                  value={form.apprenti_sexe ?? ""}
                  onChange={(e) => setField("apprenti_sexe", e.target.value as "M" | "F" | null)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Nationalite"
                  value={form.apprenti_nationalite ?? ""}
                  onChange={(e) => setField("apprenti_nationalite", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Departement de naissance"
                  value={form.apprenti_departement_naissance ?? ""}
                  onChange={(e) => setField("apprenti_departement_naissance", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Commune de naissance"
                  value={form.apprenti_commune_naissance ?? ""}
                  onChange={(e) => setField("apprenti_commune_naissance", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Numero"
                  value={form.apprenti_numero ?? ""}
                  onChange={(e) => setField("apprenti_numero", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Voie"
                  value={form.apprenti_voie ?? ""}
                  onChange={(e) => setField("apprenti_voie", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Complement"
                  value={form.apprenti_complement ?? ""}
                  onChange={(e) => setField("apprenti_complement", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Code postal"
                  value={form.apprenti_code_postal ?? ""}
                  onChange={(e) => setField("apprenti_code_postal", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Commune"
                  value={form.apprenti_commune ?? ""}
                  onChange={(e) => setField("apprenti_commune", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Regime social"
                  value={form.apprenti_regime_social ?? ""}
                  onChange={(e) => setField("apprenti_regime_social", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  {renderCheckbox(
                    "apprenti_sportif_haut_niveau",
                    "Sportif haut niveau",
                    form.apprenti_sportif_haut_niveau
                  )}
                  {renderCheckbox("apprenti_rqth", "RQTH", form.apprenti_rqth)}
                  {renderCheckbox(
                    "apprenti_droits_rqth",
                    "Droits attaches a la RQTH",
                    form.apprenti_droits_rqth
                  )}
                  {renderCheckbox(
                    "apprenti_equivalence_jeunes",
                    "Equivalence jeunes",
                    form.apprenti_equivalence_jeunes
                  )}
                  {renderCheckbox(
                    "apprenti_extension_boe",
                    "Extension BOE",
                    form.apprenti_extension_boe
                  )}
                  {renderCheckbox(
                    "apprenti_projet_entreprise",
                    "Projet creation / reprise",
                    form.apprenti_projet_entreprise
                  )}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Situation avant contrat"
                  value={form.apprenti_situation_avant ?? ""}
                  onChange={(e) => setField("apprenti_situation_avant", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Dernier diplome prepare"
                  value={form.apprenti_dernier_diplome_prepare ?? ""}
                  onChange={(e) => setField("apprenti_dernier_diplome_prepare", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Derniere annee suivie"
                  value={form.apprenti_derniere_annee_suivie ?? ""}
                  onChange={(e) => setField("apprenti_derniere_annee_suivie", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Plus haut diplome"
                  value={form.apprenti_plus_haut_diplome ?? ""}
                  onChange={(e) => setField("apprenti_plus_haut_diplome", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Intitule du dernier diplome"
                  value={form.apprenti_intitule_dernier_diplome ?? ""}
                  onChange={(e) => setField("apprenti_intitule_dernier_diplome", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2">Employeur</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  {renderCheckbox("employeur_prive", "Employeur prive", form.employeur_prive)}
                  {renderCheckbox("employeur_public", "Employeur public", form.employeur_public)}
                  {renderCheckbox(
                    "employeur_regime_assurance_chomage",
                    "Regime assurance chomage specifique",
                    form.employeur_regime_assurance_chomage
                  )}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nom employeur"
                  value={form.employeur_nom ?? ""}
                  onChange={(e) => setField("employeur_nom", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SIRET employeur"
                  value={form.employeur_siret ?? ""}
                  onChange={(e) => setField("employeur_siret", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email employeur"
                  value={form.employeur_email ?? ""}
                  onChange={(e) => setField("employeur_email", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telephone employeur"
                  value={form.employeur_telephone ?? ""}
                  onChange={(e) => setField("employeur_telephone", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Numero"
                  value={form.employeur_adresse_numero ?? ""}
                  onChange={(e) => setField("employeur_adresse_numero", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Voie"
                  value={form.employeur_adresse_voie ?? ""}
                  onChange={(e) => setField("employeur_adresse_voie", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Complement"
                  value={form.employeur_adresse_complement ?? ""}
                  onChange={(e) => setField("employeur_adresse_complement", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Code postal"
                  value={form.employeur_code_postal ?? ""}
                  onChange={(e) => setField("employeur_code_postal", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Commune"
                  value={form.employeur_commune ?? ""}
                  onChange={(e) => setField("employeur_commune", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Type employeur"
                  value={form.employeur_type ?? ""}
                  onChange={(e) => setField("employeur_type", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Employeur specifique"
                  value={form.employeur_specifique ?? ""}
                  onChange={(e) => setField("employeur_specifique", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Code APE"
                  value={form.employeur_code_ape ?? ""}
                  onChange={(e) => setField("employeur_code_ape", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Effectif"
                  type="number"
                  value={form.employeur_effectif ?? ""}
                  onChange={(e) =>
                    setField(
                      "employeur_effectif",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Code IDCC"
                  value={form.employeur_code_idcc ?? ""}
                  onChange={(e) => setField("employeur_code_idcc", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2">Maitres d'apprentissage</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  {renderCheckbox("maitre_eligible", "Maitre eligible", form.maitre_eligible)}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Maitre 1 - nom" value={form.maitre1_nom ?? ""} onChange={(e) => setField("maitre1_nom", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Maitre 1 - prenom" value={form.maitre1_prenom ?? ""} onChange={(e) => setField("maitre1_prenom", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label="Maitre 1 - naissance" value={form.maitre1_date_naissance ?? ""} onChange={(e) => setField("maitre1_date_naissance", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Maitre 1 - email" value={form.maitre1_email ?? ""} onChange={(e) => setField("maitre1_email", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Maitre 1 - emploi" value={form.maitre1_emploi ?? ""} onChange={(e) => setField("maitre1_emploi", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Maitre 1 - diplome" value={form.maitre1_diplome ?? ""} onChange={(e) => setField("maitre1_diplome", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Maitre 1 - niveau diplome" value={form.maitre1_niveau_diplome ?? ""} onChange={(e) => setField("maitre1_niveau_diplome", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Maitre 2 - nom" value={form.maitre2_nom ?? ""} onChange={(e) => setField("maitre2_nom", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Maitre 2 - prenom" value={form.maitre2_prenom ?? ""} onChange={(e) => setField("maitre2_prenom", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label="Maitre 2 - naissance" value={form.maitre2_date_naissance ?? ""} onChange={(e) => setField("maitre2_date_naissance", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Maitre 2 - email" value={form.maitre2_email ?? ""} onChange={(e) => setField("maitre2_email", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Maitre 2 - emploi" value={form.maitre2_emploi ?? ""} onChange={(e) => setField("maitre2_emploi", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Maitre 2 - diplome" value={form.maitre2_diplome ?? ""} onChange={(e) => setField("maitre2_diplome", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Maitre 2 - niveau diplome" value={form.maitre2_niveau_diplome ?? ""} onChange={(e) => setField("maitre2_niveau_diplome", e.target.value)} disabled={readOnly} />
              </Grid>
            </Grid>

            <Typography variant="subtitle2">Formation</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Diplome vise"
                  value={form.diplome_vise ?? ""}
                  onChange={(e) => setField("diplome_vise", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Intitule diplome"
                  value={form.diplome_intitule ?? ""}
                  onChange={(e) => setField("diplome_intitule", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Code diplome"
                  value={form.code_diplome ?? ""}
                  onChange={(e) => setField("code_diplome", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Code RNCP"
                  value={form.code_rncp ?? ""}
                  onChange={(e) => setField("code_rncp", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date debut formation"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.formation_debut ?? ""}
                  onChange={(e) => setField("formation_debut", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date debut de formation en CFA"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.formation_debut ?? ""}
                  onChange={(e) => setField("formation_debut", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date fin formation"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.formation_fin ?? ""}
                  onChange={(e) => setField("formation_fin", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Duree formation (heures)"
                  type="number"
                  value={form.formation_duree_heures ?? ""}
                  onChange={(e) =>
                    setField(
                      "formation_duree_heures",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Duree distance (heures)"
                  type="number"
                  value={form.formation_distance_heures ?? ""}
                  onChange={(e) =>
                    setField(
                      "formation_distance_heures",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  disabled={readOnly}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2">CFA / lieu de formation</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  {renderCheckbox("cfa_entreprise", "CFA d'entreprise", form.cfa_entreprise)}
                  {renderCheckbox(
                    "cfa_est_lieu_formation_principal",
                    "CFA = lieu principal",
                    form.cfa_est_lieu_formation_principal
                  )}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Denomination CFA" value={form.cfa_denomination ?? ""} onChange={(e) => setField("cfa_denomination", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="UAI CFA" value={form.cfa_uai ?? ""} onChange={(e) => setField("cfa_uai", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="SIRET CFA" value={form.cfa_siret ?? ""} onChange={(e) => setField("cfa_siret", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Numero CFA" value={form.cfa_adresse_numero ?? ""} onChange={(e) => setField("cfa_adresse_numero", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField fullWidth label="Voie CFA" value={form.cfa_adresse_voie ?? ""} onChange={(e) => setField("cfa_adresse_voie", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Complement CFA" value={form.cfa_adresse_complement ?? ""} onChange={(e) => setField("cfa_adresse_complement", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="CP CFA" value={form.cfa_code_postal ?? ""} onChange={(e) => setField("cfa_code_postal", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={9}>
                <TextField fullWidth label="Commune CFA" value={form.cfa_commune ?? ""} onChange={(e) => setField("cfa_commune", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Lieu formation - denomination" value={form.formation_lieu_denomination ?? ""} onChange={(e) => setField("formation_lieu_denomination", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Lieu formation - UAI" value={form.formation_lieu_uai ?? ""} onChange={(e) => setField("formation_lieu_uai", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Lieu formation - SIRET" value={form.formation_lieu_siret ?? ""} onChange={(e) => setField("formation_lieu_siret", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField fullWidth label="Lieu formation - voie" value={form.formation_lieu_voie ?? ""} onChange={(e) => setField("formation_lieu_voie", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Lieu formation - CP" value={form.formation_lieu_code_postal ?? ""} onChange={(e) => setField("formation_lieu_code_postal", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={9}>
                <TextField fullWidth label="Lieu formation - commune" value={form.formation_lieu_commune ?? ""} onChange={(e) => setField("formation_lieu_commune", e.target.value)} disabled={readOnly} />
              </Grid>
            </Grid>

            <Typography variant="subtitle2">Contrat</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Date debut execution"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.date_debut_execution ?? ""}
                  onChange={(e) => setField("date_debut_execution", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Date fin contrat"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.date_fin_contrat ?? ""}
                  onChange={(e) => setField("date_fin_contrat", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Lieu de signature"
                  value={form.lieu_signature ?? ""}
                  onChange={(e) => setField("lieu_signature", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Duree hebdo (heures)"
                  type="number"
                  value={form.duree_hebdo_heures ?? ""}
                  onChange={(e) =>
                    setField(
                      "duree_hebdo_heures",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Duree hebdo (minutes)"
                  type="number"
                  value={form.duree_hebdo_minutes ?? ""}
                  onChange={(e) =>
                    setField(
                      "duree_hebdo_minutes",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Salaire brut mensuel"
                  type="number"
                  value={form.salaire_brut_mensuel ?? ""}
                  onChange={(e) =>
                    setField(
                      "salaire_brut_mensuel",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Caisse retraite"
                  value={form.caisse_retraite ?? ""}
                  onChange={(e) => setField("caisse_retraite", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={readOnly}>
            Annuler
          </Button>
          <Button variant="contained" color="primary" onClick={handleSubmit} disabled={readOnly}>
            {readOnly ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🧩 Sélection Candidat */}
      <CandidatsSelectModal
        show={showCandidatModal}
        onClose={() => setShowCandidatModal(false)}
        onSelect={async (c) => {
          setSelectedCandidat(c);
          if (c?.formation?.id) {
            setSelectedFormation(c.formation);
          }
          setForm((f) => ({
            ...f,
            candidat: c.id,
            formation: c?.formation?.id ?? f.formation,
            apprenti_nom_naissance: c.nom_naissance ?? undefined,
            apprenti_nom_usage: c.nom ?? undefined,
            apprenti_prenom: c.prenom || undefined,
          }));
          setPrefillInfo("Le candidat a ete selectionne pour le CERFA.");
          setShowCandidatModal(false);
          await applyCandidateOnlyPrefill(
            c.id,
            "Le CERFA a ete pre-rempli automatiquement avec les donnees du candidat et sa formation."
          );
        }}
      />

      {/* 🧩 Sélection Formation */}
      <FormationSelectModal
        show={showFormationModal}
        onClose={() => setShowFormationModal(false)}
        onSelect={async (f) => {
          setSelectedFormation(f);
          setForm((p) => ({ ...p, formation: f.id }));
          setShowFormationModal(false);
          await applyPrefill(
            {
              candidat: form.candidat,
              formation: f.id,
              employeur: form.employeur,
            },
            "Le CERFA a ete complete avec les donnees de la formation selectionnee."
          );
        }}
      />

      {/* 🧩 Sélection Partenaire */}
      <PartenaireSelectModal
        show={showPartenaireModal}
        onClose={() => setShowPartenaireModal(false)}
        onSelect={async (p) => {
          setSelectedPartenaire(p);
          setForm((f) => ({
            ...f,
            employeur: p.id, // ✅ c’est cette clé que le backend attend
            employeur_nom: p.nom, // (facultatif : pour affichage local)
          }));
          setShowPartenaireModal(false);
          await applyPrefill(
            {
              candidat: form.candidat,
              formation: form.formation,
              employeur: p.id,
            },
            "Le CERFA a ete complete avec les donnees de l'employeur selectionne."
          );
        }}
      />
    </>
  );
}
