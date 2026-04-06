import { useEffect, useMemo, useState, FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  CircularProgress,
  Typography,
  Stack,
} from "@mui/material";
import {
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import type { SelectChangeEvent } from "@mui/material";
import { toast } from "react-toastify";
import { toApiError } from "../../api/httpClient";

import { useProspectionChoices } from "../../hooks/useProspection";
import type {
  ProspectionFormData,
  ProspectionMoyenContact,
  ProspectionMotif,
  ProspectionObjectif,
  ProspectionStatut,
  ProspectionTypeProspection,
} from "../../types/prospection";

import FormationSelectModal from "../../components/modals/FormationSelectModal";
import CandidatsSelectModal, {
  type CandidatPick,
} from "../../components/modals/CandidatsSelectModal";
import type { Partenaire } from "../../types/partenaire";
import PartenaireSelectModal from "../../components/modals/PartenairesSelectModal";
import RichHtmlEditorField from "../../components/forms/RichHtmlEditorField";
import FormSectionCard from "../../components/forms/FormSectionCard";
import FormActionsBar from "../../components/forms/FormActionsBar";
import AppDateField from "../../components/forms/fields/AppDateField";
import AppSelectField from "../../components/forms/fields/AppSelectField";
import EntityPickerField from "../../components/forms/fields/EntityPickerField";

const TERMINAUX: ProspectionStatut[] = ["acceptee", "refusee", "annulee"];
type Mode = "create" | "edit";

interface Props {
  mode?: Mode;
  initialValues: ProspectionFormData | null;
  onSubmit: (data: ProspectionFormData) => Promise<void>;
  loading: boolean;
  fixedFormationId?: number;
}

type ProspectionFormDraft = {
  partenaire: number | null;
  formation?: number | null;
  date_prospection: string;
  type_prospection: ProspectionTypeProspection;
  motif: ProspectionMotif;
  statut: ProspectionStatut;
  objectif: ProspectionObjectif;
  moyen_contact?: ProspectionMoyenContact | null;
  relance_prevue?: string | null;
  owner: number | null;
  owner_username?: string | null;
  partenaire_nom?: string | null;
  formation_nom?: string | null;
  centre_nom?: string | null;
  num_offre?: string | null;
  commentaire?: string | null;
};

function extractOwnerUserId(candidate: CandidatPick): number | null {
  if (typeof candidate.compte_utilisateur_id === "number") return candidate.compte_utilisateur_id;
  const cu = candidate.compte_utilisateur;
  return cu && typeof cu.id === "number" ? cu.id : null;
}

function extractCandidateDisplayName(candidate: CandidatPick): string {
  return (
    candidate.nom_complet ||
    `${candidate.prenom ?? ""} ${candidate.nom ?? ""}`.trim() ||
    `Candidat #${candidate.id}`
  );
}

export default function ProspectionForm({
  mode = "create",
  initialValues,
  onSubmit,
  loading,
  fixedFormationId,
}: Props) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState<ProspectionFormDraft>({
    partenaire: initialValues?.partenaire ?? null,
    formation: fixedFormationId ?? initialValues?.formation ?? undefined,
    date_prospection: initialValues?.date_prospection
      ? initialValues.date_prospection.slice(0, 10)
      : todayStr,
    type_prospection: initialValues?.type_prospection ?? "nouveau_prospect",
    motif: initialValues?.motif ?? "autre",
    statut: initialValues?.statut ?? "a_faire",
    objectif: initialValues?.objectif ?? "prise_contact",
    moyen_contact: initialValues?.moyen_contact ?? null,
    relance_prevue: initialValues?.relance_prevue ?? undefined,
    owner: initialValues?.owner ?? null,
    owner_username: initialValues?.owner_username ?? null,
    partenaire_nom: initialValues?.partenaire_nom ?? null,
    formation_nom: initialValues?.formation_nom ?? null,
    centre_nom: initialValues?.centre_nom ?? null,
    num_offre: initialValues?.num_offre ?? null,
    commentaire: initialValues?.commentaire ?? "",
  });

  const [partenaireNom, setPartenaireNom] = useState<string | null>(
    initialValues?.partenaire_nom ?? null
  );
  const [formationNom, setFormationNom] = useState<string | null>(
    initialValues?.formation_nom ?? null
  );
  const [numOffre] = useState<string | null>(initialValues?.num_offre ?? null);
  const [ownerUsername, setOwnerUsername] = useState<string | null>(
    initialValues?.owner_username ?? null
  );

  const [showPartenaireModal, setShowPartenaireModal] = useState(false);
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const { choices, loading: loadingChoices, error } = useProspectionChoices();

  const hasCandidateOwner = !!form.owner;

  useEffect(() => {
    setForm({
      partenaire: initialValues?.partenaire ?? null,
      formation: fixedFormationId ?? initialValues?.formation ?? undefined,
      date_prospection: initialValues?.date_prospection
        ? initialValues.date_prospection.slice(0, 10)
        : todayStr,
      type_prospection: initialValues?.type_prospection ?? "nouveau_prospect",
      motif: initialValues?.motif ?? "autre",
      statut: initialValues?.statut ?? "a_faire",
      objectif: initialValues?.objectif ?? "prise_contact",
      moyen_contact: initialValues?.moyen_contact ?? null,
      relance_prevue: initialValues?.relance_prevue ?? undefined,
      owner: initialValues?.owner ?? null,
      owner_username: initialValues?.owner_username ?? null,
      partenaire_nom: initialValues?.partenaire_nom ?? null,
      formation_nom: initialValues?.formation_nom ?? null,
      centre_nom: initialValues?.centre_nom ?? null,
      num_offre: initialValues?.num_offre ?? null,
      commentaire: initialValues?.commentaire ?? "",
    });
    setPartenaireNom(initialValues?.partenaire_nom ?? null);
    setFormationNom(initialValues?.formation_nom ?? null);
    setOwnerUsername(initialValues?.owner_username ?? null);
    setGeneralError("");
  }, [fixedFormationId, initialValues, todayStr]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setGeneralError("");
    setForm((prev) => {
      const next = { ...prev, [name]: value } as ProspectionFormDraft;
      if (name === "relance_prevue") {
        if (value) {
          if (!TERMINAUX.includes(prev.statut)) next.statut = "a_relancer";
        } else if (prev.statut === "a_relancer") {
          next.statut = "en_cours";
        }
      }
      return next;
    });
  };

  const handleSelectChange = (e: SelectChangeEvent<unknown>) => {
    const { name, value } = e.target;
    setGeneralError("");
    setForm((prev) => {
      const next = { ...prev, [name]: value } as ProspectionFormDraft;
      if (name === "moyen_contact") {
        next.moyen_contact = value === "" ? null : (value as ProspectionMoyenContact);
      }
      return next;
    });
  };

  const handleSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!form.partenaire) {
      toast.warning("Veuillez sélectionner un partenaire.");
      return;
    }
    if (
      !form.date_prospection ||
      !form.type_prospection ||
      !form.motif ||
      !form.statut ||
      !form.objectif
    ) {
      toast.warning("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (form.statut === "a_relancer" && !form.relance_prevue) {
      toast.warning("Merci de saisir une date de relance prévue.");
      return;
    }

    const payload: ProspectionFormData = {
      partenaire: form.partenaire,
      formation: fixedFormationId ?? form.formation ?? null,
      date_prospection: form.date_prospection,
      type_prospection: form.type_prospection,
      motif: form.motif,
      statut: form.statut,
      objectif: form.objectif,
      owner: form.owner ?? null,
      moyen_contact: form.moyen_contact ?? null,
      ...(form.relance_prevue ? { relance_prevue: form.relance_prevue } : {}),
      ...(partenaireNom ? { partenaire_nom: partenaireNom } : {}),
      ...(formationNom ? { formation_nom: formationNom } : {}),
      ...(form.commentaire ? { commentaire: form.commentaire } : {}),
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      const apiError = toApiError(err);
      const message =
        apiError.message || "Impossible d'enregistrer la prospection avec les données actuelles.";
      setGeneralError(message);
      toast.error(message);
    }
  };

  if (loadingChoices) return <CircularProgress />;
  if (error) return <Typography color="error">❌ Erreur lors du chargement des choix.</Typography>;

  const sectionTitle = (icon: React.ReactNode, text: string) => (
    <Stack direction="row" alignItems="center" spacing={1}>
      {icon}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "primary.main" }}>
        {text}
      </Typography>
    </Stack>
  );

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {generalError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {generalError}
        </Alert>
      ) : null}

      <FormSectionCard sx={{ mb: 3, background: "#fafafa" }} title={sectionTitle(<BusinessIcon color="primary" />, "Entités liées (Partenaire, Formation, Candidat)")}>
        <Stack spacing={2}>
          <EntityPickerField
            label="Partenaire"
            displayValue={partenaireNom ?? ""}
            placeholder="— Non défini"
            onOpen={() => setShowPartenaireModal(true)}
            required
            helperText="Sélectionnez le partenaire lié à cette prospection."
          />

          {!fixedFormationId ? (
            <EntityPickerField
              label="Formation"
              displayValue={formationNom ?? ""}
              placeholder="— Non définie"
              onOpen={() => setShowFormationModal(true)}
              disabled={hasCandidateOwner}
              helperText={
                hasCandidateOwner ? (
                  "La formation du candidat sélectionné sera utilisée automatiquement."
                ) : (
                  <>
                    Numéro d&apos;offre : <strong>{numOffre ?? "— Non défini"}</strong>
                  </>
                )
              }
            />
          ) : null}

          <EntityPickerField
            label="Candidat"
            displayValue={ownerUsername ?? ""}
            placeholder="— Aucun"
            onOpen={() => setShowOwnerModal(true)}
            helperText={
              !form.owner ? (
                "Vous pouvez attribuer cette prospection à un candidat existant."
              ) : form.formation_nom ? (
                <>
                  Cette prospection sera liée au candidat sélectionné. Formation :{" "}
                  <strong>{form.formation_nom}</strong> (automatique)
                </>
              ) : (
                "Cette prospection sera liée au candidat sélectionné."
              )
            }
          />
        </Stack>
      </FormSectionCard>

      <FormSectionCard sx={{ mb: 3, background: "#fafafa" }} title={sectionTitle(<AssignmentIcon color="primary" />, "Informations de prospection")}>
        <Grid
          container
          spacing={2}
          sx={{
            "& .MuiFormControl-root, & .MuiTextField-root": { width: "100%" },
            "& .MuiGrid-item": { display: "flex", alignItems: "center" },
          }}
        >
          <Grid item xs={12} sm={6}>
            <Stack spacing={2}>
              <AppDateField
                name="date_prospection"
                label="Date de prospection"
                value={form.date_prospection}
                onChange={handleInputChange}
                required
              />

              <AppSelectField
                label="Type"
                labelId="prospection-type-prospection"
                name="type_prospection"
                value={form.type_prospection}
                onChange={handleSelectChange}
                required
              >
                {choices!.type_prospection.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </AppSelectField>

              <AppSelectField
                label="Motif"
                labelId="prospection-motif"
                name="motif"
                value={form.motif}
                onChange={handleSelectChange}
                required
              >
                {choices!.motif.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </AppSelectField>
            </Stack>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Stack spacing={2}>
              <AppSelectField
                label="Moyen de contact"
                labelId="prospection-moyen-contact"
                name="moyen_contact"
                value={form.moyen_contact ?? ""}
                onChange={handleSelectChange}
              >
                <MenuItem value="">—</MenuItem>
                {choices!.moyen_contact.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </AppSelectField>

              <AppSelectField
                label="Statut"
                labelId="prospection-statut"
                name="statut"
                value={form.statut}
                onChange={handleSelectChange}
                required
              >
                {choices!.statut.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </AppSelectField>

              <AppDateField
                name="relance_prevue"
                label="Relance prévue"
                value={form.relance_prevue ?? ""}
                onChange={handleInputChange}
                inputProps={{ min: todayStr }}
                helperText="Définit automatiquement le statut 'À relancer'."
              />
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <AppSelectField
              label="Objectif"
              labelId="prospection-objectif"
              name="objectif"
              value={form.objectif}
              onChange={handleSelectChange}
              required
            >
              {choices!.objectif.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </AppSelectField>
          </Grid>
        </Grid>
      </FormSectionCard>

      <FormSectionCard sx={{ mb: 3, background: "#fafafa" }} title={sectionTitle(<AssignmentIcon color="primary" />, "Commentaire libre")}>
        <RichHtmlEditorField
          label="Commentaire"
          value={form.commentaire ?? ""}
          onChange={(value) => setForm((prev) => ({ ...prev, commentaire: value }))}
          placeholder="Ajouter un commentaire enrichi : gras, couleur, listes…"
        />
      </FormSectionCard>

      <FormActionsBar sx={{ mt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          endIcon={loading ? <CircularProgress size={18} /> : <SendIcon />}
          disabled={loading}
        >
          {loading
            ? mode === "create"
              ? "Création..."
              : "Mise à jour..."
            : mode === "create"
              ? "Créer la prospection"
              : "Mettre à jour"}
        </Button>
      </FormActionsBar>

      <PartenaireSelectModal
        show={showPartenaireModal}
        onClose={() => setShowPartenaireModal(false)}
        onSelect={(p: Partenaire) => {
          setForm((fm) => ({ ...fm, partenaire: p.id }));
          setPartenaireNom(p.nom ?? null);
          setShowPartenaireModal(false);
        }}
      />

      <FormationSelectModal
        show={showFormationModal}
        onClose={() => setShowFormationModal(false)}
        onSelect={(f) => {
          setForm((fm) => ({ ...fm, formation: f.id }));
          setFormationNom(f.nom);
          setShowFormationModal(false);
        }}
      />

      <CandidatsSelectModal
        show={showOwnerModal}
        onClose={() => setShowOwnerModal(false)}
        onSelect={(cand) => {
          if (cand.id === 0) {
            setForm((fm) => ({
              ...fm,
              owner: null,
              owner_username: null,
              formation: null,
              formation_nom: null,
            }));
            setOwnerUsername(null);
            toast.info("Prospection non attribuée à un candidat.");
            setShowOwnerModal(false);
            return;
          }

          const ownerId = extractOwnerUserId(cand);
          if (!ownerId) {
            toast.warning("Ce candidat n'a pas de compte utilisateur lié.");
            return;
          }
          const name = extractCandidateDisplayName(cand);
          setForm((fm) => ({
            ...fm,
            owner: ownerId,
            formation: cand.formation?.id ?? fm.formation,
            formation_nom: cand.formation?.nom ?? fm.formation_nom,
          }));
          setOwnerUsername(name);
          setShowOwnerModal(false);
        }}
      />
    </Box>
  );
}
