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
  MenuItem,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { toast } from "react-toastify";
import { CerfaContrat, CerfaContratCreate } from "../../types/cerfa";
import { useCerfaPrefill } from "../../hooks/useCerfa";
import CandidatsSelectModal from "../../components/modals/CandidatsSelectModal";
import FormationSelectModal from "../../components/modals/FormationSelectModal";
import PartenaireSelectModal from "../../components/modals/PartenairesSelectModal";

type CodeOption = { value: string; label: string };

const NATIONALITE_OPTIONS: CodeOption[] = [
  { value: "1", label: "1 - Francaise" },
  { value: "2", label: "2 - Union europeenne" },
  { value: "3", label: "3 - Etranger hors Union europeenne" },
];

const REGIME_SOCIAL_OPTIONS: CodeOption[] = [
  { value: "1", label: "1 - MSA" },
  { value: "2", label: "2 - URSSAF" },
];

const SITUATION_AVANT_OPTIONS: CodeOption[] = [
  { value: "1", label: "1 - Scolaire" },
  { value: "2", label: "2 - Prepa apprentissage" },
  { value: "3", label: "3 - Etudiant" },
  { value: "4", label: "4 - Contrat d'apprentissage" },
  { value: "5", label: "5 - Contrat de professionnalisation" },
  { value: "6", label: "6 - Contrat aide" },
  { value: "7", label: "7 - Stagiaire avant contrat" },
  { value: "8", label: "8 - Stagiaire apres rupture" },
  { value: "9", label: "9 - Autre stagiaire formation pro" },
  { value: "10", label: "10 - Salarie" },
  { value: "11", label: "11 - Recherche d'emploi" },
  { value: "12", label: "12 - Inactif" },
];

const DIPLOME_OPTIONS: CodeOption[] = [
  { value: "13", label: "13 - Aucun diplome ni titre professionnel" },
  { value: "25", label: "25 - Diplome national du Brevet" },
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

const DERNIERE_CLASSE_OPTIONS: CodeOption[] = [
  { value: "01", label: "01 - Derniere annee validee et diplome obtenu" },
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

const TYPE_EMPLOYEUR_OPTIONS: CodeOption[] = [
  { value: "11", label: "11 - Repertoire des metiers" },
  { value: "12", label: "12 - RCS" },
  { value: "13", label: "13 - MSA" },
  { value: "14", label: "14 - Profession liberale" },
  { value: "15", label: "15 - Association" },
  { value: "16", label: "16 - Autre employeur prive" },
  { value: "21", label: "21 - Service de l'Etat" },
  { value: "22", label: "22 - Commune" },
  { value: "23", label: "23 - Departement" },
  { value: "24", label: "24 - Region" },
  { value: "25", label: "25 - Etablissement public hospitalier" },
  { value: "26", label: "26 - EPLE" },
  { value: "27", label: "27 - EPA Etat" },
  { value: "28", label: "28 - EPA local" },
  { value: "29", label: "29 - Autre employeur public" },
  { value: "30", label: "30 - EPIC" },
];

const EMPLOYEUR_SPECIFIQUE_OPTIONS: CodeOption[] = [
  { value: "0", label: "0 - Aucun de ces cas" },
  { value: "1", label: "1 - Entreprise de travail temporaire" },
  { value: "2", label: "2 - Groupement d'employeurs" },
  { value: "3", label: "3 - Employeur saisonnier" },
  { value: "4", label: "4 - Apprentissage familial" },
];

const MAITRE_NIVEAU_OPTIONS: CodeOption[] = [
  { value: "0", label: "0 - Aucun" },
  { value: "3", label: "3 - CAP / BEP" },
  { value: "4", label: "4 - Baccalaureat" },
  { value: "5", label: "5 - DEUG / BTS / DUT / DEUST" },
  { value: "6", label: "6 - Licence / Licence pro / BUT / Maitrise" },
  { value: "7", label: "7 - Master / DEA / DESS / Ingenieur" },
  { value: "8", label: "8 - Doctorat / HDR" },
];

const TYPE_CONTRAT_OPTIONS: CodeOption[] = [
  { value: "11", label: "11 - Premier contrat d'apprentissage" },
  { value: "21", label: "21 - Nouveau contrat meme employeur" },
  { value: "22", label: "22 - Nouveau contrat autre employeur" },
  { value: "23", label: "23 - Nouveau contrat apres rupture" },
  { value: "31", label: "31 - Modification situation juridique" },
  { value: "32", label: "32 - Changement employeur saisonnier" },
  { value: "33", label: "33 - Prolongation suite a echec" },
  { value: "34", label: "34 - Prolongation suite a RQTH" },
  { value: "35", label: "35 - Diplome supplementaire" },
  { value: "36", label: "36 - Autres changements" },
  { value: "37", label: "37 - Modification lieu d'execution" },
  { value: "38", label: "38 - Modification lieu principal de formation" },
];

const TYPE_DEROGATION_OPTIONS: CodeOption[] = [
  { value: "11", label: "11 - Age inferieur a 16 ans" },
  { value: "12", label: "12 - Age superieur a 29 ans" },
  { value: "21", label: "21 - Reduction de duree" },
  { value: "22", label: "22 - Allongement de duree" },
  { value: "50", label: "50 - Cumul de derogations" },
  { value: "60", label: "60 - Autre derogation" },
];

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
  const [form, setForm] = useState<Partial<CerfaContratCreate>>({
    pieces_justificatives_ok: true,
  });
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

  const getDateValue = useCallback((value?: string | null) => {
    if (!value) return null;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
  }, []);

  const renderDateField = (
    field: keyof CerfaContratCreate,
    label: string,
    helperText?: string
  ) => (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label={label}
        value={getDateValue(form[field] as string | null | undefined)}
        onChange={(value: Dayjs | null) =>
          setField(field, value && value.isValid() ? value.format("YYYY-MM-DD") : null)
        }
        views={["year", "month", "day"]}
        openTo="year"
        format="DD/MM/YYYY"
        disabled={readOnly}
        slotProps={{
          textField: {
            fullWidth: true,
            helperText,
          },
        }}
      />
    </LocalizationProvider>
  );

  const renderSelectField = (
    field: keyof CerfaContratCreate,
    label: string,
    options: CodeOption[]
  ) => (
    <TextField
      select
      fullWidth
      label={label}
      value={(form[field] as string | null | undefined) ?? ""}
      onChange={(e) => setField(field, e.target.value || null)}
      disabled={readOnly}
      helperText="Liste CERFA codifiee."
    >
      <MenuItem value="">Non defini</MenuItem>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );

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
    employeur_type_code: contrat.employeur_type_code,
    employeur_specifique: contrat.employeur_specifique,
    employeur_specifique_code: contrat.employeur_specifique_code,
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
    maitre1_niveau_diplome_code: contrat.maitre1_niveau_diplome_code,
    maitre2_nom: contrat.maitre2_nom,
    maitre2_prenom: contrat.maitre2_prenom,
    maitre2_date_naissance: contrat.maitre2_date_naissance,
    maitre2_email: contrat.maitre2_email,
    maitre2_emploi: contrat.maitre2_emploi,
    maitre2_diplome: contrat.maitre2_diplome,
    maitre2_niveau_diplome: contrat.maitre2_niveau_diplome,
    maitre2_niveau_diplome_code: contrat.maitre2_niveau_diplome_code,
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
    apprenti_nationalite_code: contrat.apprenti_nationalite_code,
    apprenti_regime_social: contrat.apprenti_regime_social,
    apprenti_regime_social_code: contrat.apprenti_regime_social_code,
    apprenti_sportif_haut_niveau: contrat.apprenti_sportif_haut_niveau,
    apprenti_rqth: contrat.apprenti_rqth,
    apprenti_droits_rqth: contrat.apprenti_droits_rqth,
    apprenti_equivalence_jeunes: contrat.apprenti_equivalence_jeunes,
    apprenti_extension_boe: contrat.apprenti_extension_boe,
    apprenti_situation_avant: contrat.apprenti_situation_avant,
    apprenti_situation_avant_code: contrat.apprenti_situation_avant_code,
    apprenti_dernier_diplome_prepare: contrat.apprenti_dernier_diplome_prepare,
    apprenti_dernier_diplome_prepare_code: contrat.apprenti_dernier_diplome_prepare_code,
    apprenti_derniere_annee_suivie: contrat.apprenti_derniere_annee_suivie,
    apprenti_derniere_annee_suivie_code: contrat.apprenti_derniere_annee_suivie_code,
    apprenti_intitule_dernier_diplome: contrat.apprenti_intitule_dernier_diplome,
    apprenti_plus_haut_diplome: contrat.apprenti_plus_haut_diplome,
    apprenti_plus_haut_diplome_code: contrat.apprenti_plus_haut_diplome_code,
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
    diplome_vise_code: contrat.diplome_vise_code,
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
    pieces_justificatives_ok: contrat.pieces_justificatives_ok ?? true,
    type_contrat: contrat.type_contrat,
    type_contrat_code: contrat.type_contrat_code,
    type_derogation: contrat.type_derogation,
    type_derogation_code: contrat.type_derogation_code,
    numero_contrat_precedent: contrat.numero_contrat_precedent,
    date_conclusion: contrat.date_conclusion,
    date_debut_execution: contrat.date_debut_execution,
    date_fin_contrat: contrat.date_fin_contrat,
    date_debut_formation_pratique_employeur: contrat.date_debut_formation_pratique_employeur,
    date_effet_avenant: contrat.date_effet_avenant,
    travail_machines_dangereuses: contrat.travail_machines_dangereuses,
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
      setForm({ pieces_justificatives_ok: true, ...initialContext });
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
      setForm({ pieces_justificatives_ok: true });
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

            {renderDateField(
              "date_conclusion",
              "Date de conclusion",
              "Le calendrier permet de choisir facilement l'annee."
            )}

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
                {renderDateField(
                  "apprenti_date_naissance",
                  "Date de naissance",
                  "Le calendrier permet de choisir facilement l'annee."
                )}
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Sexe"
                  value={form.apprenti_sexe ?? ""}
                  onChange={(e) => setField("apprenti_sexe", (e.target.value || null) as "M" | "F" | null)}
                  disabled={readOnly}
                >
                  <MenuItem value="">Non defini</MenuItem>
                  <MenuItem value="M">M</MenuItem>
                  <MenuItem value="F">F</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                {renderSelectField("apprenti_nationalite_code", "Nationalite CERFA", NATIONALITE_OPTIONS)}
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
                {renderSelectField("apprenti_regime_social_code", "Regime social CERFA", REGIME_SOCIAL_OPTIONS)}
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
                {renderSelectField("apprenti_situation_avant_code", "Situation avant contrat CERFA", SITUATION_AVANT_OPTIONS)}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderSelectField("apprenti_dernier_diplome_prepare_code", "Dernier diplome prepare CERFA", DIPLOME_OPTIONS)}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderSelectField("apprenti_derniere_annee_suivie_code", "Derniere annee suivie CERFA", DERNIERE_CLASSE_OPTIONS)}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderSelectField("apprenti_plus_haut_diplome_code", "Plus haut diplome CERFA", DIPLOME_OPTIONS)}
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
                  label="Nom et prenom ou denomination"
                  value={form.employeur_nom ?? ""}
                  onChange={(e) => setField("employeur_nom", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="N° SIRET de l'etablissement"
                  value={form.employeur_siret ?? ""}
                  onChange={(e) => setField("employeur_siret", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Adresse de l'etablissement d'execution du contrat
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Courriel"
                  value={form.employeur_email ?? ""}
                  onChange={(e) => setField("employeur_email", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telephone"
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
                {renderSelectField("employeur_type_code", "Type d'employeur CERFA", TYPE_EMPLOYEUR_OPTIONS)}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderSelectField("employeur_specifique_code", "Employeur specifique CERFA", EMPLOYEUR_SPECIFIQUE_OPTIONS)}
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
                  label="Effectif total salaries de l'entreprise"
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
                  label="Code IDCC de la convention collective applicable"
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
                {renderDateField("maitre1_date_naissance", "Maitre 1 - naissance")}
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
                {renderSelectField("maitre1_niveau_diplome_code", "Maitre 1 - niveau diplome CERFA", MAITRE_NIVEAU_OPTIONS)}
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Maitre 2 - nom" value={form.maitre2_nom ?? ""} onChange={(e) => setField("maitre2_nom", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Maitre 2 - prenom" value={form.maitre2_prenom ?? ""} onChange={(e) => setField("maitre2_prenom", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                {renderDateField("maitre2_date_naissance", "Maitre 2 - naissance")}
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
                {renderSelectField("maitre2_niveau_diplome_code", "Maitre 2 - niveau diplome CERFA", MAITRE_NIVEAU_OPTIONS)}
              </Grid>
            </Grid>

            <Typography variant="subtitle2">Formation</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                {renderSelectField("diplome_vise_code", "Diplome vise CERFA", DIPLOME_OPTIONS)}
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
                {renderDateField("formation_debut", "Date debut formation")}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderDateField("formation_debut", "Date debut de formation en CFA")}
              </Grid>
              <Grid item xs={12} md={6}>
                {renderDateField("formation_fin", "Date fin formation")}
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
              <Grid item xs={12}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  {renderCheckbox(
                    "pieces_justificatives_ok",
                    "L'employeur atteste disposer de l'ensemble des pieces justificatives necessaires au depot du contrat",
                    form.pieces_justificatives_ok
                  )}
                </Stack>
              </Grid>
            </Grid>

            <Typography variant="subtitle2">Contrat</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                {renderSelectField("type_contrat_code", "Type de contrat CERFA", TYPE_CONTRAT_OPTIONS)}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderSelectField("type_derogation_code", "Type de derogation CERFA", TYPE_DEROGATION_OPTIONS)}
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Numero contrat precedent"
                  value={form.numero_contrat_precedent ?? ""}
                  onChange={(e) => setField("numero_contrat_precedent", e.target.value)}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                {renderDateField("date_debut_execution", "Date debut execution")}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderDateField(
                  "date_debut_formation_pratique_employeur",
                  "Date debut formation pratique employeur"
                )}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderDateField("date_fin_contrat", "Date fin contrat")}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderDateField("date_effet_avenant", "Date effet avenant")}
              </Grid>
              <Grid item xs={12} md={4}>
                {renderCheckbox(
                  "travail_machines_dangereuses",
                  "Travail sur machines dangereuses",
                  form.travail_machines_dangereuses
                )}
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
