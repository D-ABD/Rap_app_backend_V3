import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Candidat, CandidatFormData, CandidatMeta } from "../../types/candidat";
import { User } from "../../types/User";
import FormationSelectModal, { FormationPick } from "../../components/modals/FormationSelectModal";
import UsersSelectModal, { UserPick } from "../../components/modals/UsersSelectModal";
import { isCoreWriteRole } from "../../utils/roleGroups";

// Sections
import { mapFormationInfo } from "./FormSections/utils";
import SectionIdentite from "./FormSections/SectionIdentite";
import SectionIndicateurs from "./FormSections/SectionInSuvi";
import SectionNotes from "./FormSections/SectionNotes";
import ActionsBar from "./FormSections/ActionsBar";
import SectionAssignations from "./FormSections/SectionAssignations";
import SectionInfosContrat from "./FormSections/SectionInfosContrat";

// ------------------ MEMO ------------------
const MemoIdentite = React.memo(SectionIdentite);
const MemoIndicateurs = React.memo(SectionIndicateurs);
const MemoNotes = React.memo(SectionNotes);
const MemoAssignations = React.memo(SectionAssignations);
const MemoInfosContrat = React.memo(SectionInfosContrat);

type Props = {
  initialValues?: CandidatFormData;
  initialFormationInfo?: Candidat["formation_info"] | null;
  meta?: CandidatMeta | null;
  currentUser?: User | null;
  canEditFormation?: boolean;
  submitting?: boolean;
  onSubmit: (values: CandidatFormData) => Promise<void>;
  onCancel?: () => void;
};

export default function CandidatForm({
  initialValues,
  initialFormationInfo,
  meta,
  currentUser,
  canEditFormation = true,
  submitting = false,
  onSubmit,
  onCancel,
}: Props) {
  const extractApiErrors = useCallback((payload: unknown): Record<string, string[]> => {
    if (!payload || typeof payload !== "object") return {};

    const source =
      "errors" in payload &&
      payload.errors &&
      typeof payload.errors === "object" &&
      !Array.isArray(payload.errors)
        ? (payload.errors as Record<string, unknown>)
        : (payload as Record<string, unknown>);

    const parsed: Record<string, string[]> = {};

    for (const [key, value] of Object.entries(source)) {
      if (Array.isArray(value)) {
        parsed[key] = value.map((item) => String(item));
      } else if (typeof value === "string") {
        parsed[key] = [value];
      }
    }

    return parsed;
  }, []);

  // ---------------------------------------------------------------------
  // FORM STATE
  // ---------------------------------------------------------------------
  const formRef = useRef<CandidatFormData>(initialValues ?? ({} as CandidatFormData));
  const [, forceRender] = useState(0);

  const setForm = useCallback(
    (updater: Partial<CandidatFormData> | ((prev: CandidatFormData) => CandidatFormData)) => {
      const current = formRef.current;
      formRef.current =
        typeof updater === "function" ? updater(current) : { ...current, ...updater };
      forceRender((n) => n + 1);
    },
    []
  );

  const form = formRef.current;

  // ---------------------------------------------------------------------
  // STATES
  // ---------------------------------------------------------------------
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [formationInfo, setFormationInfo] = useState<FormationPick | null>(
    mapFormationInfo(initialFormationInfo)
  );
  const [openSection, setOpenSection] = useState<string | false>("identite");
  const requiresRgpdForManualCreate =
    !initialValues &&
    !!currentUser &&
    isCoreWriteRole(currentUser.role) &&
    !!meta?.rgpd_legal_basis_choices?.length;
  const effectiveFormation = form.formation ?? initialValues?.formation;

  const identiteForm = useMemo(
    () => ({
      nom: form.nom,
      prenom: form.prenom,
      sexe: form.sexe,
      email: form.email,
      telephone: form.telephone,
      date_naissance: form.date_naissance,
      rqth: form.rqth,
      permis_b: form.permis_b,
      numero_osia: form.numero_osia,
      street_number: form.street_number,
      street_name: form.street_name,
      street_complement: form.street_complement,
      code_postal: form.code_postal,
      ville: form.ville,
      formation: form.formation,
      type_contrat: form.type_contrat,
      contrat_signe: form.contrat_signe,
    }),
    [
      form.code_postal,
      form.contrat_signe,
      form.date_naissance,
      form.email,
      form.formation,
      form.nom,
      form.numero_osia,
      form.permis_b,
      form.prenom,
      form.rqth,
      form.sexe,
      form.street_complement,
      form.street_name,
      form.street_number,
      form.telephone,
      form.type_contrat,
      form.ville,
    ]
  );

  const suiviForm = useMemo(
    () => ({
      cv_statut: form.cv_statut,
      disponibilite: form.disponibilite,
      communication: form.communication,
      experience: form.experience,
      csp: form.csp,
      entretien_done: form.entretien_done,
      test_is_ok: form.test_is_ok,
      admissible: form.admissible,
      inscrit_gespers: form.inscrit_gespers,
      en_accompagnement_tre: form.en_accompagnement_tre,
      en_appairage: form.en_appairage,
      courrier_rentree: form.courrier_rentree,
      rgpd_legal_basis: form.rgpd_legal_basis,
      rgpd_consent_obtained: form.rgpd_consent_obtained,
      parcours_phase: form.parcours_phase,
    }),
    [
      form.admissible,
      form.communication,
      form.csp,
      form.courrier_rentree,
      form.cv_statut,
      form.disponibilite,
      form.en_accompagnement_tre,
      form.en_appairage,
      form.entretien_done,
      form.experience,
      form.inscrit_gespers,
      form.parcours_phase,
      form.rgpd_consent_obtained,
      form.rgpd_legal_basis,
      form.test_is_ok,
    ]
  );

  const assignationsForm = useMemo(
    () => ({
      vu_par: form.vu_par,
    }),
    [form.vu_par]
  );

  const cerfaForm = useMemo(
    () => ({
      nom_naissance: form.nom_naissance,
      departement_naissance: form.departement_naissance,
      commune_naissance: form.commune_naissance,
      pays_naissance: form.pays_naissance,
      nationalite_code: form.nationalite_code,
      nir: form.nir,
      inscrit_france_travail: form.inscrit_france_travail,
      numero_inscription_france_travail: form.numero_inscription_france_travail,
      duree_inscription_france_travail_mois: form.duree_inscription_france_travail_mois,
      situation_avant_contrat_code: form.situation_avant_contrat_code,
      dernier_diplome_prepare_code: form.dernier_diplome_prepare_code,
      diplome_plus_eleve_obtenu_code: form.diplome_plus_eleve_obtenu_code,
      derniere_classe_code: form.derniere_classe_code,
      intitule_diplome_prepare: form.intitule_diplome_prepare,
      regime_social_code: form.regime_social_code,
      type_contrat_code: form.type_contrat_code,
      sportif_haut_niveau: form.sportif_haut_niveau,
      equivalence_jeunes: form.equivalence_jeunes,
      extension_boe: form.extension_boe,
      projet_creation_entreprise: form.projet_creation_entreprise,
    }),
    [
      form.commune_naissance,
      form.departement_naissance,
      form.derniere_classe_code,
      form.dernier_diplome_prepare_code,
      form.diplome_plus_eleve_obtenu_code,
      form.equivalence_jeunes,
      form.extension_boe,
      form.intitule_diplome_prepare,
      form.nationalite_code,
      form.nir,
      form.inscrit_france_travail,
      form.numero_inscription_france_travail,
      form.duree_inscription_france_travail_mois,
      form.nom_naissance,
      form.pays_naissance,
      form.projet_creation_entreprise,
      form.regime_social_code,
      form.type_contrat_code,
      form.situation_avant_contrat_code,
      form.sportif_haut_niveau,
    ]
  );

  const notesForm = useMemo(
    () => ({
      notes: form.notes,
    }),
    [form.notes]
  );

  // ---------------------------------------------------------------------
  // toggleSection
  // ---------------------------------------------------------------------
  const toggleSection = useCallback(
    (section: string) => {
      setOpenSection((prev) => (prev === section ? false : section));
    },
    []
  );

  // ---------------------------------------------------------------------
  // handleSubmit — formation obligatoire
  // ---------------------------------------------------------------------
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});
      setGlobalError(null);

      if (!effectiveFormation) {
        setOpenSection("identite");
        setGlobalError("Veuillez sélectionner une formation.");
        return;
      }

      if (requiresRgpdForManualCreate && !form.rgpd_legal_basis) {
        setOpenSection("suivi");
        setErrors({
          rgpd_legal_basis: ["Veuillez sélectionner une base légale RGPD avant de créer le candidat."],
        });
        setGlobalError("Base légale RGPD obligatoire pour créer un candidat manuellement.");
        return;
      }

      if (form.rgpd_legal_basis === "consentement" && !form.rgpd_consent_obtained) {
        setOpenSection("suivi");
        setErrors({
          rgpd_consent_obtained: [
            "Le consentement explicite doit être confirmé quand la base légale est le consentement.",
          ],
        });
        setGlobalError("Le consentement explicite est requis avec la base légale « consentement ».");
        return;
      }

      try {
        await onSubmit(form);
      } catch (err: any) {
        const responseData = err?.response?.data;
        if (err.response?.status === 400 && typeof responseData === "object") {
          const parsedErrors = extractApiErrors(responseData);
          setErrors(parsedErrors);

          const nonFieldErrors = parsedErrors.non_field_errors;
          if (nonFieldErrors?.length) {
            setGlobalError(nonFieldErrors.join(", "));
          } else if (typeof responseData?.message === "string") {
            setGlobalError(responseData.message);
          } else {
            const [firstField, firstMessages] = Object.entries(parsedErrors)[0] ?? [];
            if (firstField && firstMessages?.length) {
              if ([
                "nom",
                "prenom",
                "email",
                "telephone",
                "formation",
                "date_naissance",
                "nir",
                "code_postal",
                "ville",
                "type_contrat",
                "contrat_signe",
                "numero_osia",
              ].includes(firstField)) {
                setOpenSection("identite");
              } else if (
                [
                  "type_contrat_code",
                  "nom_naissance",
                  "departement_naissance",
                  "commune_naissance",
                  "pays_naissance",
                  "nationalite_code",
                  "inscrit_france_travail",
                  "numero_inscription_france_travail",
                  "duree_inscription_france_travail_mois",
                  "situation_avant_contrat_code",
                  "dernier_diplome_prepare_code",
                  "diplome_plus_eleve_obtenu_code",
                  "derniere_classe_code",
                  "intitule_diplome_prepare",
                  "regime_social_code",
                  "sportif_haut_niveau",
                  "equivalence_jeunes",
                  "extension_boe",
                  "projet_creation_entreprise",
                ].includes(firstField)
              ) {
                setOpenSection("cerfa");
              } else if (firstField.startsWith("rgpd_")) {
                setOpenSection("suivi");
              }
              const userLabel =
                firstField === "type_contrat_code"
                  ? "Type de contrat CERFA (code notice)"
                  : firstField === "type_contrat"
                    ? "Type de contrat du stagiaire"
                    : firstField === "contrat_signe"
                      ? "Contrat signe"
                      : firstField === "numero_osia" &&
                          firstMessages.join(" ").toLowerCase().includes("requis quand le contrat est signe")
                        ? "Pour enregistrer un contrat signe a \"Oui\", renseignez d'abord le numero OSIA."
                      : null;
              setGlobalError(
                userLabel ===
                  "Pour enregistrer un contrat signe a \"Oui\", renseignez d'abord le numero OSIA."
                  ? userLabel
                  : userLabel
                    ? `${userLabel} : ${firstMessages.join(", ")}`
                    : firstMessages.join(", ")
              );
            }
          }
        } else {
          setGlobalError("Une erreur inattendue est survenue.");
        }
      }
    },
    [effectiveFormation, extractApiErrors, form, onSubmit, requiresRgpdForManualCreate]
  );

  // ---------------------------------------------------------------------
  // select formation
  // ---------------------------------------------------------------------
  const handleSelectFormation = useCallback((pick: FormationPick) => {
    setForm((f) => ({ ...f, formation: pick.id }));
    setFormationInfo(pick);
    setShowFormationModal(false);
  }, [setForm]);

  // ---------------------------------------------------------------------
  // select vu_par
  // ---------------------------------------------------------------------
  const handleSelectUser = useCallback((pick: UserPick) => {
    setForm((f) => ({ ...f, vu_par: pick.id }));
    setShowUsersModal(false);
  }, [setForm]);

  // ---------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------
  return (
    <Box component="form" onSubmit={handleSubmit} display="grid" gap={2}>

      <Alert severity="info" sx={{ mb: 1 }}>
        Les champs marqués d’un * sont obligatoires. Remplissez au minimum la section{" "}
        <b>Identité + Formation</b>.
      </Alert>

      {globalError && <Alert severity="error">{globalError}</Alert>}

      {/* Identité (inclut Adresse + Formation) */}
      <Accordion
        expanded={openSection === "identite"}
        onChange={() => toggleSection("identite")}
        TransitionProps={{ unmountOnExit: true }}
        sx={{ borderLeft: errors.nom || errors.prenom ? "3px solid red" : undefined }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Identité & Formation</Typography>
        </AccordionSummary>

        <AccordionDetails>
          <MemoIdentite
            form={identiteForm}
            setForm={setForm}
            meta={meta}
            errors={errors}

            canEditFormation={canEditFormation}
            showFormationModal={showFormationModal}
            setShowFormationModal={setShowFormationModal}
            formationInfo={formationInfo}
          />
        </AccordionDetails>
      </Accordion>

      {/* Suivi */}
      <Accordion
        expanded={openSection === "suivi"}
        onChange={() => toggleSection("suivi")}
        TransitionProps={{ unmountOnExit: true }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Suivi administratif</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <MemoIndicateurs form={suiviForm} setForm={setForm} meta={meta} errors={errors} />
        </AccordionDetails>
      </Accordion>

      {/* Assignations */}
      <Accordion
        expanded={openSection === "assignations"}
        onChange={() => toggleSection("assignations")}
        TransitionProps={{ unmountOnExit: true }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Assignations / visibilité</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <MemoAssignations
            form={assignationsForm}
            setForm={setForm}
            showUsersModal={showUsersModal}
            setShowUsersModal={setShowUsersModal}
            errors={errors}
          />
        </AccordionDetails>
      </Accordion>

      {/* CERFA / contrat */}
      <Accordion
        expanded={openSection === "cerfa"}
        onChange={() => toggleSection("cerfa")}
        TransitionProps={{ unmountOnExit: true }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Informations CERFA / contrat</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <MemoInfosContrat form={cerfaForm} setForm={setForm} errors={errors} />
        </AccordionDetails>
      </Accordion>

      {/* Notes */}
      <Accordion
        expanded={openSection === "notes"}
        onChange={() => toggleSection("notes")}
        TransitionProps={{ unmountOnExit: true }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Notes internes</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <MemoNotes form={notesForm} setForm={setForm} errors={errors} />
        </AccordionDetails>
      </Accordion>

      <ActionsBar onCancel={onCancel} submitting={submitting} />

      {/* Modaux */}
      <FormationSelectModal
        show={showFormationModal}
        onClose={() => setShowFormationModal(false)}
        onSelect={handleSelectFormation}
      />

      <UsersSelectModal
        show={showUsersModal}
        onClose={() => setShowUsersModal(false)}
        allowedRoles={["staff", "admin", "superadmin", "commercial", "charge_recrutement"]}
        onSelect={handleSelectUser}
      />
    </Box>
  );
}
