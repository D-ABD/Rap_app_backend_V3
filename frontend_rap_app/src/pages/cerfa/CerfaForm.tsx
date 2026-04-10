import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { toast } from "react-toastify";
import { CerfaContrat, CerfaContratCreate } from "../../types/cerfa";
import { useCerfaPrefill } from "../../hooks/useCerfa";
import CandidatsSelectModal from "../../components/modals/CandidatsSelectModal";
import FormationSelectModal from "../../components/modals/FormationSelectModal";
import PartenaireSelectModal from "../../components/modals/PartenairesSelectModal";
import { NSF_SPECIALITE_OPTIONS } from "../../constants/nsfOptions";
import { suggestNsfSpecialite } from "../../constants/nsfSuggestions";
import AppTextField from "../../components/forms/fields/AppTextField";

type CodeOption = { value: string; label: string };

const CERFA_TYPE_LABELS: Record<"apprentissage" | "professionnalisation", string> = {
  apprentissage: "Contrat apprentissage",
  professionnalisation: "Contrat de professionnalisation",
};

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

const PRO_SITUATION_AVANT_OPTIONS: CodeOption[] = [
  { value: "1", label: "1 - Scolaire" },
  { value: "2", label: "2 - Prequalification" },
  { value: "3", label: "3 - Etudiant" },
  { value: "4", label: "4 - Contrat d'apprentissage" },
  { value: "5", label: "5 - Contrat de professionnalisation" },
  { value: "6", label: "6 - Salarie en contrat aide : CUI-CIE, CUI-CAE" },
  { value: "7", label: "7 - Stagiaire de la formation professionnelle" },
  { value: "8", label: "8 - Salarie" },
  { value: "9", label: "9 - Personne a la recherche d'un emploi" },
  { value: "10", label: "10 - Inactif" },
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

const PRO_DIPLOME_OPTIONS: CodeOption[] = [
  { value: "10", label: "10 - Doctorat" },
  { value: "11", label: "11 - Master 2 professionnel / DESS / diplome grande ecole" },
  { value: "12", label: "12 - Master 2 recherche / DEA" },
  { value: "19", label: "19 - Autre diplome ou titre de niveau bac +5 ou plus" },
  { value: "21", label: "21 - Master 1 professionnel" },
  { value: "22", label: "22 - Master 1 general" },
  { value: "23", label: "23 - Licence professionnelle" },
  { value: "24", label: "24 - Licence generale" },
  { value: "29", label: "29 - Autre diplome ou titre de niveau bac +3 ou 4" },
  { value: "31", label: "31 - Brevet de Technicien Superieur" },
  { value: "32", label: "32 - Diplome Universitaire de technologie" },
  { value: "39", label: "39 - Autre diplome ou titre de niveau bac +2" },
  { value: "41", label: "41 - Baccalaureat professionnel" },
  { value: "42", label: "42 - Baccalaureat general" },
  { value: "43", label: "43 - Baccalaureat technologique" },
  { value: "49", label: "49 - Autre diplome ou titre de niveau bac" },
  { value: "51", label: "51 - CAP" },
  { value: "52", label: "52 - BEP" },
  { value: "53", label: "53 - Mention complementaire" },
  { value: "59", label: "59 - Autre diplome ou titre de niveau CAP/BEP" },
  { value: "60", label: "60 - Aucun diplome ni titre professionnel" },
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

const PRO_TYPE_CONTRAT_OPTIONS: CodeOption[] = [
  { value: "11", label: "11 - Contrat initial (cas general)" },
  {
    value: "12",
    label: "12 - Contrat initial conclu conjointement avec deux employeurs pour l'exercice d'une activite saisonniere",
  },
  { value: "21", label: "21 - Nouveau contrat en raison de l'echec aux epreuves d'evaluation" },
  { value: "22", label: "22 - Nouveau contrat en raison de la defaillance de l'organisme de formation" },
  {
    value: "23",
    label: "23 - Nouveau contrat en raison de la maternite, de la maladie ou d'un accident de travail",
  },
  {
    value: "24",
    label: "24 - Nouveau contrat pour l'obtention d'une qualification superieure ou complementaire",
  },
  { value: "30", label: "30 - Avenant" },
];

const TYPE_DEROGATION_OPTIONS: CodeOption[] = [
  { value: "11", label: "11 - Age inferieur a 16 ans" },
  { value: "12", label: "12 - Age superieur a 29 ans" },
  { value: "21", label: "21 - Reduction de duree" },
  { value: "22", label: "22 - Allongement de duree" },
  { value: "50", label: "50 - Cumul de derogations" },
  { value: "60", label: "60 - Autre derogation" },
];

const PRO_TYPE_QUALIFICATION_OPTIONS: CodeOption[] = [
  { value: "1", label: "1 - Certification enregistree au RNCP autre qu'un CQP" },
  { value: "2", label: "2 - Certificat de qualification professionnelle (CQP)" },
  { value: "3", label: "3 - Qualification reconnue dans les classifications d'une convention collective nationale" },
  {
    value: "4",
    label: "4 - Action delivree dans le cadre du contrat de professionnalisation experimental prevu en application du VI de l'article 28 de la loi n° 2018-771 du 5 septembre 2018",
  },
  { value: "5", label: "5 - Action de pre-qualification ou de pre-formation abroge" },
  {
    value: "6",
    label: "6 - Certification inscrite au repertoire specifique prevu a l'article L. 6113-6 du code du travail abroge",
  },
  { value: "7", label: "7 - Autre abroge" },
  {
    value: "8",
    label: "8 - Certification ou qualification professionnelle visee dans le cadre de l'experimentation associant des actions de validation des acquis de l'experience mentionnee a l'article 11 de la loi n° 2022-1598 du 21 decembre 2022",
  },
];

const REMUNERATION_REFERENCE_OPTIONS: CodeOption[] = [
  { value: "SMIC", label: "SMIC" },
  { value: "SMC", label: "SMC" },
];

const PRO_NATURE_CONTRAT_OPTIONS: CodeOption[] = [
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "travail_temporaire", label: "travail temporaire" },
];

const APPRENTISSAGE_TYPE_CONTRAT_CODES = new Set(TYPE_CONTRAT_OPTIONS.map((opt) => opt.value));
const PROFESSIONNALISATION_TYPE_CONTRAT_CODES = new Set(PRO_TYPE_CONTRAT_OPTIONS.map((opt) => opt.value));

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
  fieldErrors?: Partial<Record<keyof CerfaContratCreate, string>>;
  globalError?: string | null;
};

type ContractSectionForm = {
  cerfa_type?: "apprentissage" | "professionnalisation" | null;
  type_contrat_code?: string | null;
  nature_contrat?: "cdi" | "cdd" | "travail_temporaire" | null;
  type_derogation_code?: string | null;
  numero_contrat_precedent?: string | null;
  emploi_occupe_pendant_contrat?: string | null;
  classification_emploi?: string | null;
  classification_niveau?: string | null;
  coefficient_hierarchique?: string | null;
  duree_periode_essai_jours?: number | null;
  date_conclusion?: string | null;
  date_debut_execution?: string | null;
  date_fin_contrat?: string | null;
  date_debut_formation_pratique_employeur?: string | null;
  date_effet_avenant?: string | null;
  travail_machines_dangereuses?: boolean | null;
  duree_hebdo_heures?: number | null;
  duree_hebdo_minutes?: number | null;
  salaire_brut_mensuel?: number | null;
  avantage_nourriture?: number | null;
  avantage_logement?: number | null;
  avantage_autre?: string | null;
  remu_annee1_periode1_debut?: string | null;
  remu_annee1_periode1_fin?: string | null;
  remu_annee1_periode1_pourcentage?: number | null;
  remu_annee1_periode1_reference?: string | null;
  remu_annee1_periode2_debut?: string | null;
  remu_annee1_periode2_fin?: string | null;
  remu_annee1_periode2_pourcentage?: number | null;
  remu_annee1_periode2_reference?: string | null;
  remu_annee2_periode1_debut?: string | null;
  remu_annee2_periode1_fin?: string | null;
  remu_annee2_periode1_pourcentage?: number | null;
  remu_annee2_periode1_reference?: string | null;
  remu_annee2_periode2_debut?: string | null;
  remu_annee2_periode2_fin?: string | null;
  remu_annee2_periode2_pourcentage?: number | null;
  remu_annee2_periode2_reference?: string | null;
  caisse_retraite?: string | null;
  lieu_signature?: string | null;
};

type MemoContractSectionProps = {
  form: ContractSectionForm;
  readOnly: boolean;
  getDateValue: (value?: string | null) => Dayjs | null;
  setField: (field: keyof CerfaContratCreate, value: unknown) => void;
};

const MemoContractSection = memo(function MemoContractSection({
  form,
  readOnly,
  getDateValue,
  setField,
}: MemoContractSectionProps) {
  const [yearTwoExpanded, setYearTwoExpanded] = useState(false);

  const renderDate = (
    field: keyof CerfaContratCreate,
    label: string,
    helperText?: string
  ) => (
    <DatePicker
      label={label}
      value={getDateValue(form[field as keyof ContractSectionForm] as string | null | undefined)}
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
  );

  const renderSelect = (
    field: keyof CerfaContratCreate,
    value: string | null | undefined,
    label: string,
    options: CodeOption[]
  ) => (
    <AppTextField
      select
      fullWidth
      label={label}
      value={value ?? ""}
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
    </AppTextField>
  );

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
      <Typography variant="subtitle2">Contrat</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Alert severity="info" sx={{ py: 0 }}>
            {form.cerfa_type === "professionnalisation"
              ? "Renseigne ici les informations contractuelles specifiques au CERFA professionnalisation."
              : "Renseigne ici les informations contractuelles du CERFA apprentissage, puis les periodes de remuneration si elles s'appliquent."}
          </Alert>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="body2" fontWeight={700}>
            Nature du contrat
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          {renderSelect(
            "type_contrat_code",
            form.type_contrat_code,
            "Type de contrat / avenant CERFA",
            form.cerfa_type === "professionnalisation" ? PRO_TYPE_CONTRAT_OPTIONS : TYPE_CONTRAT_OPTIONS
          )}
        </Grid>
        {form.cerfa_type === "professionnalisation" && (
          <Grid item xs={12} md={4}>
            {renderSelect(
              "nature_contrat",
              form.nature_contrat,
              "Nature du contrat",
              PRO_NATURE_CONTRAT_OPTIONS
            )}
          </Grid>
        )}
        <Grid item xs={12} md={4}>
          {renderSelect(
            "type_derogation_code",
            form.type_derogation_code,
            "Type de derogation CERFA",
            TYPE_DEROGATION_OPTIONS
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          <AppTextField
            fullWidth
            label="Numero du contrat precedent / avenant"
            value={form.numero_contrat_precedent ?? ""}
            onChange={(e) => setField("numero_contrat_precedent", e.target.value)}
            disabled={readOnly}
            helperText="A renseigner surtout en cas de renouvellement, avenant ou contrat precedent."
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="body2" fontWeight={700}>
            Calendrier du contrat
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          {renderDate("date_conclusion", "Date de signature / conclusion")}
        </Grid>
        <Grid item xs={12} md={4}>
          {renderDate("date_debut_execution", "Date de debut d'execution")}
        </Grid>
        <Grid item xs={12} md={4}>
          {renderDate("date_fin_contrat", "Date de fin du contrat")}
        </Grid>
        <Grid item xs={12} md={4}>
          {renderDate(
            "date_debut_formation_pratique_employeur",
            "Debut de la formation pratique chez l'employeur"
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {renderDate("date_effet_avenant", "Date d'effet de l'avenant")}
        </Grid>

        <Grid item xs={12}>
          <Typography variant="body2" fontWeight={700}>
            Temps de travail et signature
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <AppTextField
            fullWidth
            label="Duree hebdomadaire - heures"
            type="number"
            value={form.duree_hebdo_heures ?? ""}
            onChange={(e) => setField("duree_hebdo_heures", e.target.value === "" ? null : Number(e.target.value))}
            disabled={readOnly}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <AppTextField
            fullWidth
            label="Duree hebdomadaire - minutes"
            type="number"
            value={form.duree_hebdo_minutes ?? ""}
            onChange={(e) => setField("duree_hebdo_minutes", e.target.value === "" ? null : Number(e.target.value))}
            disabled={readOnly}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <AppTextField
            fullWidth
            label="Lieu de signature"
            value={form.lieu_signature ?? ""}
            onChange={(e) => setField("lieu_signature", e.target.value)}
            disabled={readOnly}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          {renderCheckbox(
            "travail_machines_dangereuses",
            "Travail sur machines dangereuses / exposition a des risques particuliers",
            form.travail_machines_dangereuses
          )}
        </Grid>

        <Grid item xs={12}>
          <Typography variant="body2" fontWeight={700}>
            Remuneration et caisse
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <AppTextField
            fullWidth
            label="Salaire brut mensuel a l'embauche"
            type="number"
            value={form.salaire_brut_mensuel ?? ""}
            onChange={(e) => setField("salaire_brut_mensuel", e.target.value === "" ? null : Number(e.target.value))}
            disabled={readOnly}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <AppTextField
            fullWidth
            label="Avantage nourriture (EUR / repas)"
            type="number"
            value={form.avantage_nourriture ?? ""}
            onChange={(e) =>
              setField("avantage_nourriture", e.target.value === "" ? null : Number(e.target.value))
            }
            disabled={readOnly}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <AppTextField
            fullWidth
            label="Avantage logement (EUR / mois)"
            type="number"
            value={form.avantage_logement ?? ""}
            onChange={(e) =>
              setField("avantage_logement", e.target.value === "" ? null : Number(e.target.value))
            }
            disabled={readOnly}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <AppTextField
            fullWidth
            label="Autre avantage en nature"
            value={form.avantage_autre ?? ""}
            onChange={(e) => setField("avantage_autre", e.target.value)}
            disabled={readOnly}
          />
        </Grid>
        <Grid item xs={12} md={8}>
          <AppTextField
            fullWidth
            label="Caisse de retraite complementaire"
            value={form.caisse_retraite ?? ""}
            onChange={(e) => setField("caisse_retraite", e.target.value)}
            disabled={readOnly}
          />
        </Grid>

        {form.cerfa_type === "professionnalisation" && (
          <>
            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={700}>
                Informations specifiques au contrat professionnalisation
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <AppTextField fullWidth label="Emploi occupe pendant le contrat" value={form.emploi_occupe_pendant_contrat ?? ""} onChange={(e) => setField("emploi_occupe_pendant_contrat", e.target.value)} disabled={readOnly} />
            </Grid>
            <Grid item xs={12} md={3}>
              <AppTextField fullWidth label="Classification de l'emploi" value={form.classification_emploi ?? ""} onChange={(e) => setField("classification_emploi", e.target.value)} disabled={readOnly} />
            </Grid>
            <Grid item xs={12} md={2}>
              <AppTextField fullWidth label="Niveau de classification" value={form.classification_niveau ?? ""} onChange={(e) => setField("classification_niveau", e.target.value)} disabled={readOnly} />
            </Grid>
            <Grid item xs={12} md={3}>
              <AppTextField fullWidth label="Coefficient hierarchique" value={form.coefficient_hierarchique ?? ""} onChange={(e) => setField("coefficient_hierarchique", e.target.value)} disabled={readOnly} />
            </Grid>
            <Grid item xs={12} md={3}>
              <AppTextField fullWidth label="Periode d'essai (jours)" type="number" value={form.duree_periode_essai_jours ?? ""} onChange={(e) => setField("duree_periode_essai_jours", e.target.value === "" ? null : Number(e.target.value))} disabled={readOnly} />
            </Grid>
          </>
        )}

        {form.cerfa_type === "apprentissage" && (
          <>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" fontWeight={700}>
                Remuneration apprentissage - 1ere annee
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Renseigne les periodes affichees sur le CERFA et la base utilisee : `SMIC` ou `SMC`.
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              {renderDate("remu_annee1_periode1_debut", "Periode 1 - debut")}
            </Grid>
            <Grid item xs={12} md={3}>
              {renderDate("remu_annee1_periode1_fin", "Periode 1 - fin")}
            </Grid>
            <Grid item xs={12} md={2}>
              <AppTextField fullWidth label="Periode 1 - %" type="number" value={form.remu_annee1_periode1_pourcentage ?? ""} onChange={(e) => setField("remu_annee1_periode1_pourcentage", e.target.value === "" ? null : Number(e.target.value))} disabled={readOnly} />
            </Grid>
            <Grid item xs={12} md={4}>
              {renderSelect(
                "remu_annee1_periode1_reference",
                form.remu_annee1_periode1_reference,
                "Periode 1 - base",
                REMUNERATION_REFERENCE_OPTIONS
              )}
            </Grid>
            <Grid item xs={12} md={3}>
              {renderDate("remu_annee1_periode2_debut", "Periode 2 - debut")}
            </Grid>
            <Grid item xs={12} md={3}>
              {renderDate("remu_annee1_periode2_fin", "Periode 2 - fin")}
            </Grid>
            <Grid item xs={12} md={2}>
              <AppTextField fullWidth label="Periode 2 - %" type="number" value={form.remu_annee1_periode2_pourcentage ?? ""} onChange={(e) => setField("remu_annee1_periode2_pourcentage", e.target.value === "" ? null : Number(e.target.value))} disabled={readOnly} />
            </Grid>
            <Grid item xs={12} md={4}>
              {renderSelect(
                "remu_annee1_periode2_reference",
                form.remu_annee1_periode2_reference,
                "Periode 2 - base",
                REMUNERATION_REFERENCE_OPTIONS
              )}
            </Grid>
            <Grid item xs={12}>
              <Accordion
                disableGutters
                expanded={yearTwoExpanded}
                onChange={(_, expanded) => setYearTwoExpanded(expanded)}
                sx={{ boxShadow: "none", border: "1px solid", borderColor: "divider", borderRadius: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" fontWeight={700}>
                    Remuneration apprentissage - 2eme annee
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pb: 0 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      {renderDate("remu_annee2_periode1_debut", "Periode 1 - debut")}
                    </Grid>
                    <Grid item xs={12} md={3}>
                      {renderDate("remu_annee2_periode1_fin", "Periode 1 - fin")}
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <AppTextField fullWidth label="Periode 1 - %" type="number" value={form.remu_annee2_periode1_pourcentage ?? ""} onChange={(e) => setField("remu_annee2_periode1_pourcentage", e.target.value === "" ? null : Number(e.target.value))} disabled={readOnly} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      {renderSelect(
                        "remu_annee2_periode1_reference",
                        form.remu_annee2_periode1_reference,
                        "Periode 1 - base",
                        REMUNERATION_REFERENCE_OPTIONS
                      )}
                    </Grid>
                    <Grid item xs={12} md={3}>
                      {renderDate("remu_annee2_periode2_debut", "Periode 2 - debut")}
                    </Grid>
                    <Grid item xs={12} md={3}>
                      {renderDate("remu_annee2_periode2_fin", "Periode 2 - fin")}
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <AppTextField fullWidth label="Periode 2 - %" type="number" value={form.remu_annee2_periode2_pourcentage ?? ""} onChange={(e) => setField("remu_annee2_periode2_pourcentage", e.target.value === "" ? null : Number(e.target.value))} disabled={readOnly} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      {renderSelect(
                        "remu_annee2_periode2_reference",
                        form.remu_annee2_periode2_reference,
                        "Periode 2 - base",
                        REMUNERATION_REFERENCE_OPTIONS
                      )}
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </>
        )}
      </Grid>
    </>
  );
});

export function CerfaForm({
  open,
  onClose,
  initialData = null,
  initialContext = null,
  initialSelections = null,
  onSubmit,
  readOnly = false,
  fieldErrors = {},
  globalError = null,
}: CerfaFormProps) {
  const [form, setForm] = useState<Partial<CerfaContratCreate>>({
    cerfa_type: "apprentissage",
    cfa_entreprise: true,
    nombre_organismes_formation: 1,
    pieces_justificatives_ok: true,
  });
  const [selectedCandidat, setSelectedCandidat] = useState<any>(null);
  const [selectedFormation, setSelectedFormation] = useState<any>(null);
  const [selectedPartenaire, setSelectedPartenaire] = useState<any>(null);

  const [showCandidatModal, setShowCandidatModal] = useState(false);
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [showPartenaireModal, setShowPartenaireModal] = useState(false);

  const getLinkedFormationFromCandidate = useCallback((candidate: any) => {
    if (candidate?.formation?.id) {
      return candidate.formation;
    }
    if (typeof candidate?.formation === "number") {
      return {
        id: candidate.formation,
        nom: candidate?.formation_nom || `Formation #${candidate.formation}`,
      };
    }
    if (typeof candidate?.formation_id === "number") {
      return {
        id: candidate.formation_id,
        nom: candidate?.formation_nom || `Formation #${candidate.formation_id}`,
      };
    }
    return null;
  }, []);
  const suggestedNsf = suggestNsfSpecialite(form.diplome_intitule, form.diplome_vise);
  const [prefillInfo, setPrefillInfo] = useState<string>("");
  const { mutateAsync: prefillCerfa, isPending: isPrefilling } = useCerfaPrefill();
  const setField = useCallback((field: keyof CerfaContratCreate, value: unknown) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

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
          error: !!fieldErrors[field],
          helperText: fieldErrors[field] || helperText,
        },
      }}
    />
  );

  const renderSelectField = (
    field: keyof CerfaContratCreate,
    label: string,
    options: CodeOption[]
  ) => (
    <AppTextField
      select
      fullWidth
      label={label}
      value={(form[field] as string | null | undefined) ?? ""}
      onChange={(e) => setField(field, e.target.value || null)}
      disabled={readOnly}
      error={!!fieldErrors[field]}
      helperText={fieldErrors[field] || "Liste CERFA codifiee."}
    >
      <MenuItem value="">Non defini</MenuItem>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </AppTextField>
  );

  const renderMemoDateField = useCallback(
    (
      field: keyof CerfaContratCreate,
      value: string | null | undefined,
      label: string,
      helperText?: string
    ) => (
      <DatePicker
        label={label}
        value={getDateValue(value)}
        onChange={(nextValue: Dayjs | null) =>
          setField(field, nextValue && nextValue.isValid() ? nextValue.format("YYYY-MM-DD") : null)
        }
        views={["year", "month", "day"]}
        openTo="year"
        format="DD/MM/YYYY"
      disabled={readOnly}
      slotProps={{
        textField: {
          fullWidth: true,
          error: !!fieldErrors[field],
          helperText: fieldErrors[field] || helperText,
        },
      }}
    />
    ),
    [fieldErrors, getDateValue, readOnly, setField]
  );

  const renderMemoSelectField = useCallback(
    (
      field: keyof CerfaContratCreate,
      value: string | null | undefined,
      label: string,
      options: CodeOption[]
    ) => (
      <AppTextField
        select
        fullWidth
        label={label}
        value={value ?? ""}
        onChange={(e) => setField(field, e.target.value || null)}
        disabled={readOnly}
        error={!!fieldErrors[field]}
        helperText={fieldErrors[field] || "Liste CERFA codifiee."}
      >
        <MenuItem value="">Non defini</MenuItem>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </AppTextField>
    ),
    [fieldErrors, readOnly, setField]
  );

  const renderMemoCheckbox = useCallback(
    (field: keyof CerfaContratCreate, label: string, value?: boolean | null) => (
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
    ),
    [readOnly, setField]
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
        if (
          formKey === "formation_duree_heures" ||
          formKey === "formation_heures_enseignements" ||
          formKey === "apprenti_rqth" ||
          formKey === "apprenti_equivalence_jeunes" ||
          formKey === "apprenti_extension_boe" ||
          formKey === "apprenti_inscrit_france_travail"
        ) {
          next[formKey] = (value ?? null) as never;
        } else if (!hasValue(next[formKey]) && hasValue(value)) {
          next[formKey] = value as never;
        }
      });
      return next;
    },
    []
  );

  const buildInitialFormData = (contrat: CerfaContrat): Partial<CerfaContratCreate> => ({
    cerfa_type: contrat.cerfa_type,
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
    employeur_urssaf_particulier: contrat.employeur_urssaf_particulier,
    employeur_organisme_prevoyance: contrat.employeur_organisme_prevoyance,
    employeur_numero_projet: contrat.employeur_numero_projet,
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
    apprenti_inscrit_france_travail: contrat.apprenti_inscrit_france_travail,
    apprenti_france_travail_numero: contrat.apprenti_france_travail_numero,
    apprenti_france_travail_duree_mois: contrat.apprenti_france_travail_duree_mois,
    apprenti_minimum_social_type: contrat.apprenti_minimum_social_type,
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
    type_qualification_visee: contrat.type_qualification_visee,
    organisme_declaration_activite: contrat.organisme_declaration_activite,
    nombre_organismes_formation: contrat.nombre_organismes_formation,
    specialite_formation: contrat.specialite_formation,
    organisation_formation: contrat.organisation_formation,
    formation_heures_enseignements: contrat.formation_heures_enseignements,
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
    nature_contrat: contrat.nature_contrat,
    type_derogation: contrat.type_derogation,
    type_derogation_code: contrat.type_derogation_code,
    numero_contrat_precedent: contrat.numero_contrat_precedent,
    emploi_occupe_pendant_contrat: contrat.emploi_occupe_pendant_contrat,
    classification_emploi: contrat.classification_emploi,
    classification_niveau: contrat.classification_niveau,
    coefficient_hierarchique: contrat.coefficient_hierarchique,
    duree_periode_essai_jours: contrat.duree_periode_essai_jours,
    date_conclusion: contrat.date_conclusion,
    date_debut_execution: contrat.date_debut_execution,
    date_fin_contrat: contrat.date_fin_contrat,
    date_debut_formation_pratique_employeur: contrat.date_debut_formation_pratique_employeur,
    date_effet_avenant: contrat.date_effet_avenant,
    travail_machines_dangereuses: contrat.travail_machines_dangereuses,
    duree_hebdo_heures: contrat.duree_hebdo_heures,
    duree_hebdo_minutes: contrat.duree_hebdo_minutes,
    salaire_brut_mensuel: contrat.salaire_brut_mensuel,
    avantage_nourriture: contrat.avantage_nourriture,
    avantage_logement: contrat.avantage_logement,
    avantage_autre: contrat.avantage_autre,
    remu_annee1_periode1_debut: contrat.remu_annee1_periode1_debut,
    remu_annee1_periode1_fin: contrat.remu_annee1_periode1_fin,
    remu_annee1_periode1_pourcentage: contrat.remu_annee1_periode1_pourcentage,
    remu_annee1_periode1_reference: contrat.remu_annee1_periode1_reference,
    remu_annee1_periode2_debut: contrat.remu_annee1_periode2_debut,
    remu_annee1_periode2_fin: contrat.remu_annee1_periode2_fin,
    remu_annee1_periode2_pourcentage: contrat.remu_annee1_periode2_pourcentage,
    remu_annee1_periode2_reference: contrat.remu_annee1_periode2_reference,
    remu_annee2_periode1_debut: contrat.remu_annee2_periode1_debut,
    remu_annee2_periode1_fin: contrat.remu_annee2_periode1_fin,
    remu_annee2_periode1_pourcentage: contrat.remu_annee2_periode1_pourcentage,
    remu_annee2_periode1_reference: contrat.remu_annee2_periode1_reference,
    remu_annee2_periode2_debut: contrat.remu_annee2_periode2_debut,
    remu_annee2_periode2_fin: contrat.remu_annee2_periode2_fin,
    remu_annee2_periode2_pourcentage: contrat.remu_annee2_periode2_pourcentage,
    remu_annee2_periode2_reference: contrat.remu_annee2_periode2_reference,
    caisse_retraite: contrat.caisse_retraite,
    lieu_signature: contrat.lieu_signature,
    opco_nom: contrat.opco_nom,
    opco_adherent_numero: contrat.opco_adherent_numero,
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
      setForm({
        cerfa_type: "apprentissage",
        cfa_entreprise: true,
        nombre_organismes_formation: 1,
        pieces_justificatives_ok: true,
        ...initialContext,
      });
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
      setForm({ cerfa_type: "apprentissage", cfa_entreprise: true, pieces_justificatives_ok: true });
      setSelectedCandidat(null);
      setSelectedFormation(null);
      setSelectedPartenaire(null);
      setPrefillInfo("");
    }
  }, [initialContext, initialData, initialSelections]);

  useEffect(() => {
    setForm((current) => {
      const currentCode = current.type_contrat_code ?? null;
      if (!currentCode) return current;
      const allowedCodes =
        current.cerfa_type === "professionnalisation"
          ? PROFESSIONNALISATION_TYPE_CONTRAT_CODES
          : APPRENTISSAGE_TYPE_CONTRAT_CODES;
      if (allowedCodes.has(currentCode)) return current;
      return {
        ...current,
        type_contrat_code: null,
        type_contrat:
          current.cerfa_type === "professionnalisation" &&
          ["apprentissage", "contrat apprentissage", "professionnalisation", "contrat de professionnalisation"].includes(
            String(current.type_contrat ?? "").trim().toLowerCase()
          )
            ? null
            : current.type_contrat,
      };
    });
  }, [form.cerfa_type]);

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

  const apprentiSection = useMemo(
    () => (
      <>
        <Typography variant="subtitle2">Apprenti</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Nom de naissance" value={form.apprenti_nom_naissance ?? ""} onChange={(e) => setField("apprenti_nom_naissance", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Nom d'usage" value={form.apprenti_nom_usage ?? ""} onChange={(e) => setField("apprenti_nom_usage", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Prenom" value={form.apprenti_prenom ?? ""} onChange={(e) => setField("apprenti_prenom", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="NIR" value={form.apprenti_nir ?? ""} onChange={(e) => setField("apprenti_nir", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Email apprenti" value={form.apprenti_email ?? ""} onChange={(e) => setField("apprenti_email", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Telephone apprenti" value={form.apprenti_telephone ?? ""} onChange={(e) => setField("apprenti_telephone", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={4}>
            {renderMemoDateField("apprenti_date_naissance", form.apprenti_date_naissance, "Date de naissance", "Le calendrier permet de choisir facilement l'annee.")}
          </Grid>
          <Grid item xs={12} md={4}>
            <AppTextField
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
            </AppTextField>
          </Grid>
          <Grid item xs={12} md={4}>
            {renderMemoSelectField("apprenti_nationalite_code", form.apprenti_nationalite_code, "Nationalite CERFA", NATIONALITE_OPTIONS)}
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Departement de naissance" value={form.apprenti_departement_naissance ?? ""} onChange={(e) => setField("apprenti_departement_naissance", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Commune de naissance" value={form.apprenti_commune_naissance ?? ""} onChange={(e) => setField("apprenti_commune_naissance", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Numero" value={form.apprenti_numero ?? ""} onChange={(e) => setField("apprenti_numero", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Voie" value={form.apprenti_voie ?? ""} onChange={(e) => setField("apprenti_voie", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Complement" value={form.apprenti_complement ?? ""} onChange={(e) => setField("apprenti_complement", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <AppTextField fullWidth label="Code postal" value={form.apprenti_code_postal ?? ""} onChange={(e) => setField("apprenti_code_postal", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <AppTextField fullWidth label="Commune" value={form.apprenti_commune ?? ""} onChange={(e) => setField("apprenti_commune", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            {renderMemoSelectField("apprenti_regime_social_code", form.apprenti_regime_social_code, "Regime social CERFA", REGIME_SOCIAL_OPTIONS)}
          </Grid>
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              {renderMemoCheckbox("apprenti_sportif_haut_niveau", "Sportif haut niveau", form.apprenti_sportif_haut_niveau)}
              {renderMemoCheckbox("apprenti_rqth", "RQTH", form.apprenti_rqth)}
              {renderMemoCheckbox("apprenti_droits_rqth", "Droits attaches a la RQTH", form.apprenti_droits_rqth)}
              {renderMemoCheckbox("apprenti_equivalence_jeunes", "Equivalence jeunes", form.apprenti_equivalence_jeunes)}
              {renderMemoCheckbox("apprenti_extension_boe", "Extension BOE", form.apprenti_extension_boe)}
              {renderMemoCheckbox("apprenti_projet_entreprise", "Projet creation / reprise", form.apprenti_projet_entreprise)}
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            {renderMemoSelectField(
              "apprenti_situation_avant_code",
              form.apprenti_situation_avant_code,
              "Situation avant contrat CERFA",
              form.cerfa_type === "professionnalisation" ? PRO_SITUATION_AVANT_OPTIONS : SITUATION_AVANT_OPTIONS
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderMemoSelectField(
              "apprenti_dernier_diplome_prepare_code",
              form.apprenti_dernier_diplome_prepare_code,
              "Dernier diplome prepare CERFA",
              form.cerfa_type === "professionnalisation" ? PRO_DIPLOME_OPTIONS : DIPLOME_OPTIONS
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderMemoSelectField("apprenti_derniere_annee_suivie_code", form.apprenti_derniere_annee_suivie_code, "Derniere annee suivie CERFA", DERNIERE_CLASSE_OPTIONS)}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderMemoSelectField(
              "apprenti_plus_haut_diplome_code",
              form.apprenti_plus_haut_diplome_code,
              "Plus haut diplome CERFA",
              form.cerfa_type === "professionnalisation" ? PRO_DIPLOME_OPTIONS : DIPLOME_OPTIONS
            )}
          </Grid>
          {form.cerfa_type === "professionnalisation" && (
            <>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={<Checkbox checked={!!form.apprenti_inscrit_france_travail} onChange={(e) => setField("apprenti_inscrit_france_travail", e.target.checked)} />}
                  label="Inscrit France Travail"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <AppTextField fullWidth label="Numero d'inscription France Travail" value={form.apprenti_france_travail_numero ?? ""} onChange={(e) => setField("apprenti_france_travail_numero", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={3}>
                <AppTextField
                  fullWidth
                  label="Duree France Travail (mois)"
                  type="number"
                  value={form.apprenti_france_travail_duree_mois ?? ""}
                  onChange={(e) => setField("apprenti_france_travail_duree_mois", e.target.value === "" ? null : Number(e.target.value))}
                  disabled={readOnly}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <AppTextField fullWidth label="Type de minimum social" value={form.apprenti_minimum_social_type ?? ""} onChange={(e) => setField("apprenti_minimum_social_type", e.target.value)} disabled={readOnly} />
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <AppTextField fullWidth label="Intitule du dernier diplome" value={form.apprenti_intitule_dernier_diplome ?? ""} onChange={(e) => setField("apprenti_intitule_dernier_diplome", e.target.value)} disabled={readOnly} />
          </Grid>
        </Grid>
      </>
    ),
    [
      form.apprenti_code_postal,
      form.apprenti_commune,
      form.apprenti_commune_naissance,
      form.apprenti_complement,
      form.apprenti_date_naissance,
      form.apprenti_departement_naissance,
      form.apprenti_derniere_annee_suivie_code,
      form.apprenti_droits_rqth,
      form.apprenti_email,
      form.apprenti_equivalence_jeunes,
      form.apprenti_extension_boe,
      form.apprenti_france_travail_duree_mois,
      form.apprenti_france_travail_numero,
      form.apprenti_inscrit_france_travail,
      form.apprenti_intitule_dernier_diplome,
      form.apprenti_minimum_social_type,
      form.apprenti_nationalite_code,
      form.apprenti_nir,
      form.apprenti_nom_naissance,
      form.apprenti_nom_usage,
      form.apprenti_numero,
      form.apprenti_plus_haut_diplome_code,
      form.apprenti_prenom,
      form.apprenti_projet_entreprise,
      form.apprenti_regime_social_code,
      form.apprenti_rqth,
      form.apprenti_sexe,
      form.apprenti_situation_avant_code,
      form.apprenti_sportif_haut_niveau,
      form.apprenti_telephone,
      form.apprenti_dernier_diplome_prepare_code,
      form.apprenti_voie,
      form.cerfa_type,
      readOnly,
      renderMemoCheckbox,
      renderMemoDateField,
      renderMemoSelectField,
      setField,
    ]
  );

  const employeurSection = useMemo(
    () => (
      <>
        <Typography variant="subtitle2">Employeur</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              {renderMemoCheckbox("employeur_prive", "Employeur prive", form.employeur_prive)}
              {renderMemoCheckbox("employeur_public", "Employeur public", form.employeur_public)}
              {renderMemoCheckbox("employeur_regime_assurance_chomage", "Regime assurance chomage specifique", form.employeur_regime_assurance_chomage)}
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Nom et prenom ou denomination" value={form.employeur_nom ?? ""} onChange={(e) => setField("employeur_nom", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="N° SIRET de l'etablissement" value={form.employeur_siret ?? ""} onChange={(e) => setField("employeur_siret", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Adresse de l'etablissement d'execution du contrat</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Courriel" value={form.employeur_email ?? ""} onChange={(e) => setField("employeur_email", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Telephone" value={form.employeur_telephone ?? ""} onChange={(e) => setField("employeur_telephone", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={4}>
            <AppTextField fullWidth label="Numero" value={form.employeur_adresse_numero ?? ""} onChange={(e) => setField("employeur_adresse_numero", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={8}>
            <AppTextField fullWidth label="Voie" value={form.employeur_adresse_voie ?? ""} onChange={(e) => setField("employeur_adresse_voie", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Complement" value={form.employeur_adresse_complement ?? ""} onChange={(e) => setField("employeur_adresse_complement", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <AppTextField fullWidth label="Code postal" value={form.employeur_code_postal ?? ""} onChange={(e) => setField("employeur_code_postal", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <AppTextField fullWidth label="Commune" value={form.employeur_commune ?? ""} onChange={(e) => setField("employeur_commune", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={4}>
            {renderMemoSelectField("employeur_type_code", form.employeur_type_code, "Type d'employeur CERFA", TYPE_EMPLOYEUR_OPTIONS)}
          </Grid>
          <Grid item xs={12} md={4}>
            {renderMemoSelectField("employeur_specifique_code", form.employeur_specifique_code, "Employeur specifique CERFA", EMPLOYEUR_SPECIFIQUE_OPTIONS)}
          </Grid>
          <Grid item xs={12} md={4}>
            <AppTextField fullWidth label="Code APE" value={form.employeur_code_ape ?? ""} onChange={(e) => setField("employeur_code_ape", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Effectif total salaries de l'entreprise" type="number" value={form.employeur_effectif ?? ""} onChange={(e) => setField("employeur_effectif", e.target.value === "" ? null : Number(e.target.value))} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Code IDCC de la convention collective applicable" value={form.employeur_code_idcc ?? ""} onChange={(e) => setField("employeur_code_idcc", e.target.value)} disabled={readOnly} />
          </Grid>
          {form.cerfa_type === "professionnalisation" && (
            <>
              <Grid item xs={12} md={4}>
                <AppTextField fullWidth label="N° URSSAF du particulier-employeur" value={form.employeur_urssaf_particulier ?? ""} onChange={(e) => setField("employeur_urssaf_particulier", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                <AppTextField fullWidth label="Organisme de prevoyance" value={form.employeur_organisme_prevoyance ?? ""} onChange={(e) => setField("employeur_organisme_prevoyance", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                <AppTextField fullWidth label="Numero du projet" value={form.employeur_numero_projet ?? ""} onChange={(e) => setField("employeur_numero_projet", e.target.value)} disabled={readOnly} />
              </Grid>
            </>
          )}
        </Grid>
      </>
    ),
    [
      form.cerfa_type,
      form.employeur_adresse_complement,
      form.employeur_adresse_numero,
      form.employeur_adresse_voie,
      form.employeur_code_ape,
      form.employeur_code_idcc,
      form.employeur_code_postal,
      form.employeur_commune,
      form.employeur_effectif,
      form.employeur_email,
      form.employeur_nom,
      form.employeur_numero_projet,
      form.employeur_organisme_prevoyance,
      form.employeur_prive,
      form.employeur_public,
      form.employeur_regime_assurance_chomage,
      form.employeur_siret,
      form.employeur_specifique_code,
      form.employeur_telephone,
      form.employeur_type_code,
      form.employeur_urssaf_particulier,
      readOnly,
      renderMemoCheckbox,
      renderMemoSelectField,
      setField,
    ]
  );

  const formationSection = useMemo(
    () => (
      <>
        <Typography variant="subtitle2">Formation</Typography>
        <Grid container spacing={2}>
          {form.cerfa_type === "professionnalisation" && (
            <Grid item xs={12} md={6}>
              {renderMemoSelectField("type_qualification_visee", form.type_qualification_visee, "Type de qualification visee", PRO_TYPE_QUALIFICATION_OPTIONS)}
            </Grid>
          )}
          <Grid item xs={12} md={6}>
            {renderMemoSelectField("diplome_vise_code", form.diplome_vise_code, "Diplome vise CERFA", form.cerfa_type === "professionnalisation" ? PRO_DIPLOME_OPTIONS : DIPLOME_OPTIONS)}
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Intitule diplome" value={form.diplome_intitule ?? ""} onChange={(e) => setField("diplome_intitule", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Code diplome" value={form.code_diplome ?? ""} onChange={(e) => setField("code_diplome", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Code RNCP" value={form.code_rncp ?? ""} onChange={(e) => setField("code_rncp", e.target.value)} disabled={readOnly} />
          </Grid>
          {form.cerfa_type === "professionnalisation" && (
            <>
              <Grid item xs={12} md={4}>
                <AppTextField fullWidth label="Declaration d'activite organisme" value={form.organisme_declaration_activite ?? ""} onChange={(e) => setField("organisme_declaration_activite", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                <AppTextField fullWidth label="Nombre d'organismes" type="number" value={form.nombre_organismes_formation ?? ""} onChange={(e) => setField("nombre_organismes_formation", e.target.value === "" ? null : Number(e.target.value))} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                <AppTextField
                  select
                  fullWidth
                  label="Code NSF specialite de formation"
                  value={form.specialite_formation ?? ""}
                  onChange={(e) => setField("specialite_formation", e.target.value)}
                  helperText="Code NSF a 3 chiffres."
                  disabled={readOnly}
                >
                  <MenuItem value="">Non defini</MenuItem>
                  {NSF_SPECIALITE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </AppTextField>
              </Grid>
              {suggestedNsf && suggestedNsf.code !== (form.specialite_formation ?? "") && (
                <Grid item xs={12}>
                  <Alert severity="info">Suggestion NSF : {suggestedNsf.label}</Alert>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <AppTextField fullWidth label="Organisation de la formation" value={form.organisation_formation ?? ""} onChange={(e) => setField("organisation_formation", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <AppTextField fullWidth label="Heures d'enseignements (CERFA pro)" type="number" value={form.formation_heures_enseignements ?? ""} onChange={(e) => setField("formation_heures_enseignements", e.target.value === "" ? null : Number(e.target.value))} helperText="Volume specifique des enseignements generaux, professionnels et technologiques." disabled={readOnly} />
              </Grid>
            </>
          )}
          <Grid item xs={12} md={6}>
            {renderMemoDateField("formation_debut", form.formation_debut, "Date debut formation")}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderMemoDateField("formation_debut", form.formation_debut, "Date debut de formation en CFA")}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderMemoDateField("formation_fin", form.formation_fin, "Date fin formation")}
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Duree totale formation (heures)" type="number" value={form.formation_duree_heures ?? ""} onChange={(e) => setField("formation_duree_heures", e.target.value === "" ? null : Number(e.target.value))} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Duree distance (heures)" type="number" value={form.formation_distance_heures ?? ""} onChange={(e) => setField("formation_distance_heures", e.target.value === "" ? null : Number(e.target.value))} disabled={readOnly} />
          </Grid>
        </Grid>
      </>
    ),
    [
      form.cerfa_type,
      form.code_diplome,
      form.code_rncp,
      form.diplome_intitule,
      form.diplome_vise_code,
      form.formation_debut,
      form.formation_distance_heures,
      form.formation_duree_heures,
      form.formation_fin,
      form.formation_heures_enseignements,
      form.nombre_organismes_formation,
      form.organisation_formation,
      form.organisme_declaration_activite,
      form.specialite_formation,
      form.type_qualification_visee,
      readOnly,
      renderMemoDateField,
      renderMemoSelectField,
      setField,
      suggestedNsf,
    ]
  );

  const cfaSection = useMemo(
    () => (
      <>
        <Typography variant="subtitle2">CFA / lieu de formation</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              {renderMemoCheckbox("cfa_entreprise", "CFA d'entreprise", form.cfa_entreprise)}
              {renderMemoCheckbox(
                "cfa_est_lieu_formation_principal",
                "CFA = lieu principal",
                form.cfa_est_lieu_formation_principal
              )}
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Denomination CFA" value={form.cfa_denomination ?? ""} onChange={(e) => setField("cfa_denomination", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <AppTextField fullWidth label="UAI CFA" value={form.cfa_uai ?? ""} onChange={(e) => setField("cfa_uai", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <AppTextField fullWidth label="SIRET CFA" value={form.cfa_siret ?? ""} onChange={(e) => setField("cfa_siret", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <AppTextField fullWidth label="Numero CFA" value={form.cfa_adresse_numero ?? ""} onChange={(e) => setField("cfa_adresse_numero", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={5}>
            <AppTextField fullWidth label="Voie CFA" value={form.cfa_adresse_voie ?? ""} onChange={(e) => setField("cfa_adresse_voie", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={4}>
            <AppTextField fullWidth label="Complement CFA" value={form.cfa_adresse_complement ?? ""} onChange={(e) => setField("cfa_adresse_complement", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <AppTextField fullWidth label="CP CFA" value={form.cfa_code_postal ?? ""} onChange={(e) => setField("cfa_code_postal", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={9}>
            <AppTextField fullWidth label="Commune CFA" value={form.cfa_commune ?? ""} onChange={(e) => setField("cfa_commune", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={6}>
            <AppTextField fullWidth label="Lieu formation - denomination" value={form.formation_lieu_denomination ?? ""} onChange={(e) => setField("formation_lieu_denomination", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <AppTextField fullWidth label="Lieu formation - UAI" value={form.formation_lieu_uai ?? ""} onChange={(e) => setField("formation_lieu_uai", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <AppTextField fullWidth label="Lieu formation - SIRET" value={form.formation_lieu_siret ?? ""} onChange={(e) => setField("formation_lieu_siret", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={5}>
            <AppTextField fullWidth label="Lieu formation - voie" value={form.formation_lieu_voie ?? ""} onChange={(e) => setField("formation_lieu_voie", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={3}>
            <AppTextField fullWidth label="Lieu formation - CP" value={form.formation_lieu_code_postal ?? ""} onChange={(e) => setField("formation_lieu_code_postal", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12} md={9}>
            <AppTextField fullWidth label="Lieu formation - commune" value={form.formation_lieu_commune ?? ""} onChange={(e) => setField("formation_lieu_commune", e.target.value)} disabled={readOnly} />
          </Grid>
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              {renderMemoCheckbox(
                "pieces_justificatives_ok",
                "L'employeur atteste disposer de l'ensemble des pieces justificatives necessaires au depot du contrat",
                form.pieces_justificatives_ok
              )}
            </Stack>
          </Grid>
        </Grid>
      </>
    ),
    [
      form.cfa_adresse_complement,
      form.cfa_adresse_numero,
      form.cfa_adresse_voie,
      form.cfa_code_postal,
      form.cfa_commune,
      form.cfa_denomination,
      form.cfa_entreprise,
      form.cfa_est_lieu_formation_principal,
      form.cfa_siret,
      form.cfa_uai,
      form.formation_lieu_code_postal,
      form.formation_lieu_commune,
      form.formation_lieu_denomination,
      form.formation_lieu_siret,
      form.formation_lieu_uai,
      form.formation_lieu_voie,
      form.pieces_justificatives_ok,
      readOnly,
      renderMemoCheckbox,
      setField,
    ]
  );

  const contractFormData = useMemo<ContractSectionForm>(
    () => ({
      cerfa_type: form.cerfa_type as "apprentissage" | "professionnalisation" | null | undefined,
      type_contrat_code: form.type_contrat_code ?? null,
      nature_contrat: (form.nature_contrat as "cdi" | "cdd" | "travail_temporaire" | null | undefined) ?? null,
      type_derogation_code: form.type_derogation_code ?? null,
      numero_contrat_precedent: form.numero_contrat_precedent ?? null,
      emploi_occupe_pendant_contrat: form.emploi_occupe_pendant_contrat ?? null,
      classification_emploi: form.classification_emploi ?? null,
      classification_niveau: form.classification_niveau ?? null,
      coefficient_hierarchique: form.coefficient_hierarchique ?? null,
      duree_periode_essai_jours: form.duree_periode_essai_jours ?? null,
      date_conclusion: form.date_conclusion ?? null,
      date_debut_execution: form.date_debut_execution ?? null,
      date_fin_contrat: form.date_fin_contrat ?? null,
      date_debut_formation_pratique_employeur: form.date_debut_formation_pratique_employeur ?? null,
      date_effet_avenant: form.date_effet_avenant ?? null,
      travail_machines_dangereuses: form.travail_machines_dangereuses ?? null,
      duree_hebdo_heures: form.duree_hebdo_heures ?? null,
      duree_hebdo_minutes: form.duree_hebdo_minutes ?? null,
      salaire_brut_mensuel: form.salaire_brut_mensuel ?? null,
      avantage_nourriture: form.avantage_nourriture ?? null,
      avantage_logement: form.avantage_logement ?? null,
      avantage_autre: form.avantage_autre ?? null,
      remu_annee1_periode1_debut: form.remu_annee1_periode1_debut ?? null,
      remu_annee1_periode1_fin: form.remu_annee1_periode1_fin ?? null,
      remu_annee1_periode1_pourcentage: form.remu_annee1_periode1_pourcentage ?? null,
      remu_annee1_periode1_reference: form.remu_annee1_periode1_reference ?? null,
      remu_annee1_periode2_debut: form.remu_annee1_periode2_debut ?? null,
      remu_annee1_periode2_fin: form.remu_annee1_periode2_fin ?? null,
      remu_annee1_periode2_pourcentage: form.remu_annee1_periode2_pourcentage ?? null,
      remu_annee1_periode2_reference: form.remu_annee1_periode2_reference ?? null,
      remu_annee2_periode1_debut: form.remu_annee2_periode1_debut ?? null,
      remu_annee2_periode1_fin: form.remu_annee2_periode1_fin ?? null,
      remu_annee2_periode1_pourcentage: form.remu_annee2_periode1_pourcentage ?? null,
      remu_annee2_periode1_reference: form.remu_annee2_periode1_reference ?? null,
      remu_annee2_periode2_debut: form.remu_annee2_periode2_debut ?? null,
      remu_annee2_periode2_fin: form.remu_annee2_periode2_fin ?? null,
      remu_annee2_periode2_pourcentage: form.remu_annee2_periode2_pourcentage ?? null,
      remu_annee2_periode2_reference: form.remu_annee2_periode2_reference ?? null,
      caisse_retraite: form.caisse_retraite ?? null,
      lieu_signature: form.lieu_signature ?? null,
    }),
    [
      form.cerfa_type,
      form.type_contrat_code,
      form.nature_contrat,
      form.type_derogation_code,
      form.numero_contrat_precedent,
      form.emploi_occupe_pendant_contrat,
      form.classification_emploi,
      form.classification_niveau,
      form.coefficient_hierarchique,
      form.duree_periode_essai_jours,
      form.date_conclusion,
      form.date_debut_execution,
      form.date_fin_contrat,
      form.date_debut_formation_pratique_employeur,
      form.date_effet_avenant,
      form.travail_machines_dangereuses,
      form.duree_hebdo_heures,
      form.duree_hebdo_minutes,
      form.salaire_brut_mensuel,
      form.avantage_nourriture,
      form.avantage_logement,
      form.avantage_autre,
      form.remu_annee1_periode1_debut,
      form.remu_annee1_periode1_fin,
      form.remu_annee1_periode1_pourcentage,
      form.remu_annee1_periode1_reference,
      form.remu_annee1_periode2_debut,
      form.remu_annee1_periode2_fin,
      form.remu_annee1_periode2_pourcentage,
      form.remu_annee1_periode2_reference,
      form.remu_annee2_periode1_debut,
      form.remu_annee2_periode1_fin,
      form.remu_annee2_periode1_pourcentage,
      form.remu_annee2_periode1_reference,
      form.remu_annee2_periode2_debut,
      form.remu_annee2_periode2_fin,
      form.remu_annee2_periode2_pourcentage,
      form.remu_annee2_periode2_reference,
      form.caisse_retraite,
      form.lieu_signature,
    ]
  );

  const selectedFormationLabel = useMemo(() => {
    const fullTitle =
      (typeof form.diplome_intitule === "string" && form.diplome_intitule.trim()) ||
      (typeof form.diplome_vise === "string" && form.diplome_vise.trim()) ||
      (selectedFormation?.nom as string | undefined) ||
      (typeof form.formation === "number" ? `Formation #${form.formation}` : "");

    return fullTitle || "";
  }, [form.diplome_intitule, form.diplome_vise, form.formation, selectedFormation]);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          {initialData ? "Modifier un contrat CERFA" : "Créer un contrat CERFA"}
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack spacing={2} mt={1}>
              <Alert severity="info">
                {CERFA_TYPE_LABELS[
                  (form.cerfa_type as "apprentissage" | "professionnalisation" | undefined) ??
                    "apprentissage"
                ]}
              </Alert>
              {prefillInfo ? <Alert severity="info">{prefillInfo}</Alert> : null}
              {globalError ? <Alert severity="error">{globalError}</Alert> : null}
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
                {selectedFormationLabel
                  ? `🎓 ${selectedFormationLabel}`
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

              <Alert severity="info" sx={{ py: 0 }}>
                {`Selection en cours : ${
                  selectedCandidat?.nom_complet || (form.candidat ? `Candidat #${form.candidat}` : "Aucun candidat")
                } | ${
                  selectedFormationLabel ? `Formation : ${selectedFormationLabel}` : "Aucune formation"
                } | ${
                  selectedPartenaire?.nom || form.employeur_nom || "Aucune entreprise"
                }`}
              </Alert>

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

              {apprentiSection}
              {employeurSection}

              <Typography variant="subtitle2">Maitres d'apprentissage</Typography>
              <Grid container spacing={2}>
              <Grid item xs={12}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  {renderCheckbox("maitre_eligible", "Maitre eligible", form.maitre_eligible)}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <AppTextField fullWidth label="Maitre 1 - nom" value={form.maitre1_nom ?? ""} onChange={(e) => setField("maitre1_nom", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <AppTextField fullWidth label="Maitre 1 - prenom" value={form.maitre1_prenom ?? ""} onChange={(e) => setField("maitre1_prenom", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                {renderDateField("maitre1_date_naissance", "Maitre 1 - naissance")}
              </Grid>
              <Grid item xs={12} md={4}>
                <AppTextField fullWidth label="Maitre 1 - email" value={form.maitre1_email ?? ""} onChange={(e) => setField("maitre1_email", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                <AppTextField fullWidth label="Maitre 1 - emploi" value={form.maitre1_emploi ?? ""} onChange={(e) => setField("maitre1_emploi", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <AppTextField fullWidth label="Maitre 1 - diplome" value={form.maitre1_diplome ?? ""} onChange={(e) => setField("maitre1_diplome", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                {renderSelectField(
                  "maitre1_niveau_diplome_code",
                  "Maitre 1 - niveau diplome CERFA",
                  MAITRE_NIVEAU_OPTIONS
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <AppTextField fullWidth label="Maitre 2 - nom" value={form.maitre2_nom ?? ""} onChange={(e) => setField("maitre2_nom", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <AppTextField fullWidth label="Maitre 2 - prenom" value={form.maitre2_prenom ?? ""} onChange={(e) => setField("maitre2_prenom", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                {renderDateField("maitre2_date_naissance", "Maitre 2 - naissance")}
              </Grid>
              <Grid item xs={12} md={4}>
                <AppTextField fullWidth label="Maitre 2 - email" value={form.maitre2_email ?? ""} onChange={(e) => setField("maitre2_email", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={4}>
                <AppTextField fullWidth label="Maitre 2 - emploi" value={form.maitre2_emploi ?? ""} onChange={(e) => setField("maitre2_emploi", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                <AppTextField fullWidth label="Maitre 2 - diplome" value={form.maitre2_diplome ?? ""} onChange={(e) => setField("maitre2_diplome", e.target.value)} disabled={readOnly} />
              </Grid>
              <Grid item xs={12} md={6}>
                {renderSelectField(
                  "maitre2_niveau_diplome_code",
                  "Maitre 2 - niveau diplome CERFA",
                  MAITRE_NIVEAU_OPTIONS
                )}
              </Grid>
              </Grid>

              {formationSection}

              {cfaSection}
              <MemoContractSection
                form={contractFormData}
                readOnly={readOnly}
                getDateValue={getDateValue}
                setField={setField}
              />
            </Stack>
          </LocalizationProvider>
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
      {showCandidatModal ? (
        <CandidatsSelectModal
          show={showCandidatModal}
          onClose={() => setShowCandidatModal(false)}
          onSelect={async (c) => {
            setSelectedCandidat(c);
            const linkedFormation = getLinkedFormationFromCandidate(c);
            if (linkedFormation) {
              setSelectedFormation(linkedFormation);
            }
            setForm((f) => ({
              ...f,
              candidat: c.id,
              formation: linkedFormation?.id ?? f.formation,
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
      ) : null}

      {/* 🧩 Sélection Formation */}
      {showFormationModal ? (
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
      ) : null}

      {/* 🧩 Sélection Partenaire */}
      {showPartenaireModal ? (
        <PartenaireSelectModal
          show={showPartenaireModal}
          onClose={() => setShowPartenaireModal(false)}
          onSelect={async (p) => {
            setSelectedPartenaire(p);
            setForm((f) => ({
              ...f,
              employeur: p.id,
              employeur_nom: p.nom,
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
      ) : null}
    </>
  );
}
