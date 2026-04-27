import { useEffect, useMemo, useState, FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  FormHelperText,
  MenuItem,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
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
import FormActionsBar from "../../components/forms/FormActionsBar";

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

function extractFormationFromCandidate(candidate: CandidatPick): {
  id: number | null;
  nom: string | null;
} {
  const formationId =
    candidate.formation && typeof candidate.formation.id === "number"
      ? candidate.formation.id
      : null;
  const formationNom =
    candidate.formation_nom ?? candidate.formation?.nom ?? null;

  return { id: formationId, nom: formationNom };
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
  const submitLabel = loading
    ? mode === "create"
      ? "⏳ Création…"
      : "⏳ Sauvegarde…"
    : mode === "create"
      ? "✅ Créer la prospection"
      : "✅ Enregistrer les modifications";

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

  if (loadingChoices) {
    return (
      <Stack alignItems="center" justifyContent="center" spacing={1.5} py={5} px={2}>
        <CircularProgress size={36} />
        <Typography variant="body2" color="text.secondary">
          Chargement des listes de prospection…
        </Typography>
      </Stack>
    );
  }
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 1 }}>
        Erreur lors du chargement des choix. Réessayez plus tard.
      </Alert>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
      {generalError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {generalError}
        </Alert>
      ) : null}

      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h6">Sélection</Typography>
          <Typography variant="body2" color="text.secondary">
            Associez un partenaire, un candidat et vérifiez la formation retenue.
          </Typography>
        </Stack>

        <Divider />

        <Stack spacing={2.5}>
          <Stack spacing={1}>
            <TextField
              label="Partenaire"
              value={partenaireNom ?? "Partenaire inconnu"}
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <Box>
              <Button
                variant="outlined"
                onClick={() => setShowPartenaireModal(true)}
                disabled={loading}
              >
                🔍 {partenaireNom ? "Changer de partenaire" : "Sélectionner un partenaire"}
              </Button>
            </Box>
          </Stack>

          <Stack spacing={1}>
            <TextField
              label="Candidat"
              value={ownerUsername ?? "Aucun candidat sélectionné"}
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <Box>
              <Button
                variant="outlined"
                onClick={() => setShowOwnerModal(true)}
                disabled={loading}
              >
                🔍 {form.owner ? "Changer de candidat" : "Sélectionner un candidat"}
              </Button>
            </Box>
            <FormHelperText>
              {!form.owner
                ? "Vous pouvez attribuer cette prospection à un candidat existant."
                : "La formation du candidat sélectionné sera reprise automatiquement si elle existe."}
            </FormHelperText>
          </Stack>

          <Stack spacing={1}>
            <TextField
              label="Formation"
              value={formationNom ?? (fixedFormationId ? `#${fixedFormationId}` : "Formation inconnue")}
              fullWidth
              InputProps={{ readOnly: true }}
            />
            {!fixedFormationId ? (
              <Box>
                <Button
                  variant="outlined"
                  onClick={() => setShowFormationModal(true)}
                  disabled={loading}
                >
                  🔍 {formationNom ? "Changer de formation" : "Sélectionner une formation"}
                </Button>
              </Box>
            ) : null}
            <FormHelperText>
              {hasCandidateOwner
                ? "La formation du candidat a été préremplie, mais vous pouvez la modifier."
                : typeof fixedFormationId === "number"
                  ? `Formation fixée (#${fixedFormationId}).`
                  : `Numéro d'offre : ${numOffre ?? "— Non défini"}`}
            </FormHelperText>
          </Stack>
        </Stack>

        <Divider />

        <Stack spacing={1}>
          <Typography variant="h6">Suivi</Typography>
          <Typography variant="body2" color="text.secondary">
            Définissez le cadre de la prospection, son statut et la relance éventuelle.
          </Typography>
        </Stack>

        <Stack spacing={2.5}>
          <TextField
            label="Date de prospection"
            type="date"
            name="date_prospection"
            value={form.date_prospection}
            onChange={handleInputChange}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
            disabled={loading}
          />

          <TextField
            select
            label="Type"
            name="type_prospection"
            value={form.type_prospection}
            onChange={handleSelectChange}
            fullWidth
            required
            disabled={loading}
          >
            {choices!.type_prospection.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Motif"
            name="motif"
            value={form.motif}
            onChange={handleSelectChange}
            fullWidth
            required
            disabled={loading}
          >
            {choices!.motif.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Moyen de contact"
            name="moyen_contact"
            value={form.moyen_contact ?? ""}
            onChange={handleSelectChange}
            fullWidth
            disabled={loading}
          >
            <MenuItem value="">—</MenuItem>
            {choices!.moyen_contact.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Statut"
            name="statut"
            value={form.statut}
            onChange={handleSelectChange}
            fullWidth
            required
            disabled={loading}
          >
            {choices!.statut.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Objectif"
            name="objectif"
            value={form.objectif}
            onChange={handleSelectChange}
            fullWidth
            required
            disabled={loading}
          >
            {choices!.objectif.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Relance prévue"
            type="date"
            name="relance_prevue"
            value={form.relance_prevue ?? ""}
            onChange={handleInputChange}
            fullWidth
            disabled={loading}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: todayStr }}
            helperText="Définit automatiquement le statut « À relancer »."
          />
        </Stack>

        <Divider />

        <Stack spacing={1}>
          <Typography variant="h6">Commentaire</Typography>
          <Typography variant="body2" color="text.secondary">
            Texte enrichi : gras, couleurs, listes, etc.
          </Typography>
        </Stack>

        <RichHtmlEditorField
          label="Commentaire"
          value={form.commentaire ?? ""}
          onChange={(value) => setForm((prev) => ({ ...prev, commentaire: value }))}
          placeholder="Ajouter un commentaire enrichi : gras, couleur, listes…"
        />

        <Divider />

        <FormActionsBar>
          <Button type="submit" variant="contained" disabled={loading}>
            {submitLabel}
          </Button>
        </FormActionsBar>
      </Stack>

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
            setFormationNom(null);
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
          const candidateFormation = extractFormationFromCandidate(cand);
          setForm((fm) => ({
            ...fm,
            owner: ownerId,
            formation: candidateFormation.id ?? fm.formation,
            formation_nom: candidateFormation.nom ?? fm.formation_nom,
          }));
          setOwnerUsername(name);
          if (candidateFormation.nom) {
            setFormationNom(candidateFormation.nom);
          }
          setShowOwnerModal(false);
        }}
      />
    </Box>
  );
}
