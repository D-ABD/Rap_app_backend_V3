import { useMemo, useState, FormEvent } from "react";
import {
  Box,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  Paper,
  Stack,
  Divider,
} from "@mui/material";
import {
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import type { SelectChangeEvent } from "@mui/material";
import { toast } from "react-toastify";

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

  const { choices, loading: loadingChoices, error } = useProspectionChoices();

  const hasCandidateOwner = !!form.owner;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
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

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
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
    };

    try {
      await onSubmit(payload);
    } catch {
      toast.error("Erreur lors de la soumission.");
    }
  };

  if (loadingChoices) return <CircularProgress />;
  if (error) return <Typography color="error">❌ Erreur lors du chargement des choix.</Typography>;

  const Section = ({
    icon,
    title,
    children,
  }: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
  }) => (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, background: "#fafafa" }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        {icon}
        <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
          {title}
        </Typography>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Paper>
  );

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* ─────────── Sélections ─────────── */}
      <Section
        icon={<BusinessIcon color="primary" />}
        title="Entités liées (Partenaire, Formation, Candidat)"
      >
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {/* Partenaire */}
          <Box>
            <Typography variant="body2" gutterBottom>
              🏢 Partenaire : <strong>{partenaireNom ?? "— Non défini"}</strong>
            </Typography>
            <Button variant="outlined" onClick={() => setShowPartenaireModal(true)}>
              {form.partenaire ? "Modifier le partenaire" : "Sélectionner un partenaire"}
            </Button>
          </Box>

          {/* Formation */}
          {!fixedFormationId && (
            <Box>
              <Typography variant="body2" gutterBottom>
                🎓 Formation : <strong>{formationNom ?? "— Non définie"}</strong>
              </Typography>
              <Typography variant="body2" gutterBottom>
                🧾 Numéro d’offre : <strong>{numOffre ?? "— Non défini"}</strong>
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setShowFormationModal(true)}
                disabled={hasCandidateOwner}
              >
                {form.formation ? "Modifier la formation" : "Sélectionner une formation"}
              </Button>
              {hasCandidateOwner && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  ⚠️ La formation du candidat sélectionné sera utilisée automatiquement.
                </Typography>
              )}
            </Box>
          )}

          {/* Candidat */}
          <Box>
            <Typography variant="body2" gutterBottom>
              👤 Candidat : <strong>{ownerUsername ?? "— Aucun"}</strong>
            </Typography>
            <Button variant="outlined" onClick={() => setShowOwnerModal(true)}>
              {form.owner ? "Modifier le candidat" : "Attribuer à un candidat"}
            </Button>

            {!form.owner && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                ℹ️ Vous pouvez attribuer cette prospection à un candidat existant.
              </Typography>
            )}

            {form.owner && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                ✅ Cette prospection sera liée au candidat sélectionné.
                {form.formation_nom && (
                  <>
                    {" "}
                    Formation : <strong>{form.formation_nom}</strong> (automatique)
                  </>
                )}
              </Typography>
            )}
          </Box>
        </Stack>
      </Section>

      {/* ─────────── Informations prospection ─────────── */}
      <Section icon={<AssignmentIcon color="primary" />} title="Informations de prospection">
        <Grid
          container
          spacing={2}
          sx={{
            "& .MuiFormControl-root, & .MuiTextField-root": { width: "100%" },
            "& .MuiGrid-item": { display: "flex", alignItems: "center" },
          }}
        >
          {/* Colonne gauche */}
          <Grid item xs={12} sm={6}>
            <Stack spacing={2}>
              <TextField
                type="date"
                name="date_prospection"
                label="Date de prospection"
                value={form.date_prospection}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required
              />

              <FormControl required>
                <InputLabel>Type</InputLabel>
                <Select
                  name="type_prospection"
                  value={form.type_prospection}
                  onChange={handleSelectChange}
                >
                  {choices!.type_prospection.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl required>
                <InputLabel>Motif</InputLabel>
                <Select name="motif" value={form.motif} onChange={handleSelectChange}>
                  {choices!.motif.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Grid>

          {/* Colonne droite */}
          <Grid item xs={12} sm={6}>
            <Stack spacing={2}>
              <FormControl>
                <InputLabel>Moyen de contact</InputLabel>
                <Select
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
                </Select>
              </FormControl>

              <FormControl required>
                <InputLabel>Statut</InputLabel>
                <Select name="statut" value={form.statut} onChange={handleSelectChange}>
                  {choices!.statut.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                type="date"
                name="relance_prevue"
                label="Relance prévue"
                value={form.relance_prevue ?? ""}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: todayStr }}
                helperText="Définit automatiquement le statut 'À relancer'."
              />
            </Stack>
          </Grid>

          {/* Ligne complète pour l’objectif */}
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Objectif</InputLabel>
              <Select name="objectif" value={form.objectif} onChange={handleSelectChange}>
                {choices!.objectif.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Section>

      {/* ─────────── Actions ─────────── */}
      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 2 }}>
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
      </Stack>

      {/* ─────────── Modales ─────────── */}
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
          // 🟢 Cas "Aucun candidat" → désattribution
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

          // 🧩 Cas normal → candidat avec compte
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
