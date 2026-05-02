import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { toast } from "react-toastify";
import type { PrepaParticipation, PrepaPresenceStatut, StagiairePrepa } from "src/types/prepa";
import StagiairesPrepaSelectModal from "src/components/modals/StagiairesPrepaSelectModal";

interface Props {
  participations: PrepaParticipation[];
  onChange: (participations: PrepaParticipation[]) => void;
  centreId?: number;
  typePrepa?: string;
}

const PRESENCE_CHOICES: Array<{ value: PrepaPresenceStatut; label: string }> = [
  { value: "inscrit", label: "Inscrit" },
  { value: "present", label: "Présent" },
  { value: "absent", label: "Absent" },
];

function canonPresenceStatut(statut?: PrepaPresenceStatut): PrepaPresenceStatut {
  if (statut === "termine") return "present";
  if (statut === "a_repositionner") return "absent";
  return statut ?? "inscrit";
}

const emptyParticipation = (): PrepaParticipation => ({
  nom: "",
  prenom: "",
  telephone: "",
  email: "",
  statut_parcours: "en_attente",
  statut: "inscrit",
  commentaire: "",
});

const participationKey = (participation: PrepaParticipation, index: number) =>
  String(
    participation.stagiaire_prepa_id ??
      participation.stagiaire_prepa?.id ??
      `${participation.nom ?? ""}-${participation.prenom ?? ""}-${participation.email ?? ""}-${index}`
  );

const formatAtelierEnCours = (stagiaire: StagiairePrepa) => {
  const atelier = stagiaire.atelier_en_cours_display ?? stagiaire.atelier_en_cours;
  const date = stagiaire.atelier_en_cours_date;
  if (!atelier) return "";
  return date ? `${atelier} du ${new Date(date).toLocaleDateString("fr-FR")}` : String(atelier);
};

function toParticipation(stagiaire: StagiairePrepa): PrepaParticipation {
  return {
    stagiaire_prepa_id: stagiaire.id ?? null,
    nom: stagiaire.nom ?? "",
    prenom: stagiaire.prenom ?? "",
    telephone: stagiaire.telephone ?? "",
    email: stagiaire.email ?? "",
    statut_parcours: stagiaire.statut_parcours ?? "en_attente",
    statut: "inscrit",
    commentaire: "",
  };
}

function formatStagiaireLabel(stagiaire: StagiairePrepa | null | undefined): string {
  if (!stagiaire) return "Ce stagiaire";
  const fullName = `${stagiaire.prenom ?? ""} ${stagiaire.nom ?? ""}`.trim();
  return fullName || "Ce stagiaire";
}

export default function PrepaInvitesSection({ participations, onChange, centreId, typePrepa }: Props) {
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const participationsSafe = useMemo(() => participations ?? [], [participations]);

  const selectedStagiaires = useMemo(
    () =>
      participationsSafe.map((participation) => ({
        id: participation.stagiaire_prepa_id ?? participation.stagiaire_prepa?.id,
        nom: participation.nom ?? participation.stagiaire_prepa?.nom ?? "",
        prenom: participation.prenom ?? participation.stagiaire_prepa?.prenom ?? "",
        telephone: participation.telephone ?? participation.stagiaire_prepa?.telephone ?? "",
        email: participation.email ?? participation.stagiaire_prepa?.email ?? "",
        statut_parcours:
          participation.statut_parcours ?? participation.stagiaire_prepa?.statut_parcours ?? "en_attente",
      })),
    [participationsSafe]
  );

  const updateParticipation = (
    index: number,
    patch: Partial<PrepaParticipation>
  ) => {
    const next = participationsSafe.map((participation, idx) =>
      idx === index ? { ...participation, ...patch } : participation
    );
    onChange(next);
  };

  const addManualParticipation = () => onChange([...participationsSafe, emptyParticipation()]);

  const importStagiaires = (importedStagiaires: StagiairePrepa[]) => {
    const existingIds = new Set(
      participationsSafe
        .map((participation) => participation.stagiaire_prepa_id ?? participation.stagiaire_prepa?.id)
        .filter((value): value is number => typeof value === "number")
    );

    const existingKeys = new Set(
      participationsSafe.map((participation, index) => participationKey(participation, index).toLowerCase())
    );

    let duplicateCount = 0;
    let missingAt1Count = 0;
    let firstMissingAt1: StagiairePrepa | null = null;
    const requiresAt1 =
      typePrepa !== "atelier_1" &&
      typePrepa !== "info_collective" &&
      Boolean(typePrepa);

    const nextImported = importedStagiaires
      .map(toParticipation)
      .filter((participation, index) => {
        const source: StagiairePrepa | undefined = importedStagiaires[index];
        const id = participation.stagiaire_prepa_id ?? participation.stagiaire_prepa?.id;
        if (requiresAt1 && !source?.atelier_1_realise && !source?.date_entree_calculee) {
          missingAt1Count += 1;
          if (!firstMissingAt1) firstMissingAt1 = source;
          return false;
        }
        if (typeof id === "number" && existingIds.has(id)) {
          duplicateCount += 1;
          return false;
        }
        const isDuplicate = existingKeys.has(participationKey(participation, index).toLowerCase());
        if (isDuplicate) duplicateCount += 1;
        return !isDuplicate;
      });

    if (duplicateCount > 0) {
      toast.warning(
        duplicateCount === 1
          ? "Ce stagiaire est déjà inscrit à l'atelier."
          : `${duplicateCount} stagiaires sont déjà inscrits à l'atelier.`
      );
    }
    if (missingAt1Count > 0) {
      const target = firstMissingAt1;
      if (missingAt1Count === 1 && target) {
        toast.error(
          `Inscription impossible : ${formatStagiaireLabel(target)} doit commencer le parcours par un Atelier 1.`
        );
      } else {
        toast.error(
          `${missingAt1Count} stagiaires ne peuvent pas être ajoutés ici : le parcours doit commencer par un Atelier 1.`
        );
      }
    }
    onChange([...participationsSafe, ...nextImported]);
  };

  const removeParticipation = (index: number) => {
    const targetKey = participationKey(participationsSafe[index], index);
    onChange(participationsSafe.filter((_, idx) => idx !== index));
    setSelectedKeys((prev) => prev.filter((key) => key !== targetKey));
    setExpandedKey((prev) => (prev === targetKey ? null : prev));
  };

  const toggleSelected = (key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const setStatusForSelection = (statut: PrepaPresenceStatut) => {
    if (!selectedKeys.length) return;
    onChange(
      participationsSafe.map((participation, index) =>
        selectedKeys.includes(participationKey(participation, index))
          ? { ...participation, statut }
          : participation
      )
    );
  };

  const clearSelection = () => setSelectedKeys([]);
  const statusCounts = useMemo(
    () => ({
      inscrit: participationsSafe.filter((participation) => canonPresenceStatut(participation.statut) === "inscrit").length,
      present: participationsSafe.filter((participation) => canonPresenceStatut(participation.statut) === "present").length,
      absent: participationsSafe.filter((participation) => canonPresenceStatut(participation.statut) === "absent").length,
    }),
    [participationsSafe]
  );

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box>
          <Typography variant="h6">Participation nominative atelier</Typography>
          <Typography variant="body2" color="text.secondary">
            Renseigne ici les stagiaires inscrits à la séance, puis marque leur présence individuellement ou en lot.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="contained" onClick={() => setShowSelectModal(true)}>
            Ajouter via modal
          </Button>
          <Button variant="outlined" onClick={addManualParticipation}>
            Ajouter manuellement
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2, flexWrap: "wrap" }} useFlexGap>
        <Chip label={`${participationsSafe.length} lignes nominatives`} />
        <Chip color="success" variant="outlined" label={`${statusCounts.present} présents`} />
        <Chip color="error" variant="outlined" label={`${statusCounts.absent} absents`} />
        <Chip variant="outlined" label={`${statusCounts.inscrit} inscrits`} />
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }}>
        <Button variant="outlined" disabled={selectedKeys.length === 0} onClick={() => setStatusForSelection("present")}>
          Marquer présents ({selectedKeys.length})
        </Button>
        <Button variant="outlined" disabled={selectedKeys.length === 0} onClick={() => setStatusForSelection("absent")}>
          Marquer absents ({selectedKeys.length})
        </Button>
        <Button variant="outlined" disabled={selectedKeys.length === 0} onClick={() => setStatusForSelection("inscrit")}>
          Repasser en inscrits
        </Button>
        <Button variant="text" disabled={selectedKeys.length === 0} onClick={clearSelection}>
          Vider la sélection
        </Button>
      </Stack>

      {participationsSafe.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucun stagiaire renseigné pour le moment.
        </Typography>
      ) : null}

      <Stack spacing={1.25}>
        {participationsSafe.map((participation, index) => {
          const key = participationKey(participation, index);
          const label =
            PRESENCE_CHOICES.find((choice) => choice.value === canonPresenceStatut(participation.statut))?.label ??
            participation.statut;
          const isExpanded = expandedKey === key;
          const displayNom = `${participation.prenom ?? participation.stagiaire_prepa?.prenom ?? ""} ${participation.nom ?? participation.stagiaire_prepa?.nom ?? ""}`.trim() || `Participant ${index + 1}`;
          const contact = participation.email || participation.telephone || "";
          const parcoursLabel =
            participation.stagiaire_prepa?.statut_parcours_courant_display ??
            participation.stagiaire_prepa?.statut_parcours_display ??
            participation.statut_parcours;
          return (
            <Paper key={key} variant="outlined" sx={{ p: 1.25 }}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", md: "center" }}
                spacing={1}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                  <Checkbox checked={selectedKeys.includes(key)} onChange={() => toggleSelected(key)} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>
                      {displayNom}
                    </Typography>
                    {contact ? (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {contact}
                      </Typography>
                    ) : null}
                    {parcoursLabel ? (
                      <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.25 }}>
                        Parcours: {parcoursLabel}
                      </Typography>
                    ) : null}
                  </Box>
                  <Chip size="small" variant="outlined" label={label} />
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                  <Select
                    size="small"
                    value={canonPresenceStatut(participation.statut)}
                    onChange={(e) =>
                      updateParticipation(index, { statut: e.target.value as PrepaPresenceStatut })
                    }
                    sx={{ minWidth: 132 }}
                  >
                    {PRESENCE_CHOICES.map((choice) => (
                      <MenuItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <Button
                    variant="text"
                    onClick={() => setExpandedKey((prev) => (prev === key ? null : key))}
                    endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                  >
                    {isExpanded ? "Réduire" : "Détails"}
                  </Button>
                  <Button color="error" variant="text" onClick={() => removeParticipation(index)}>
                    Retirer
                  </Button>
                </Stack>
              </Stack>

              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Divider sx={{ my: 1.5 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      required
                      label="Nom"
                      value={participation.nom ?? participation.stagiaire_prepa?.nom ?? ""}
                      onChange={(e) => updateParticipation(index, { nom: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      required
                      label="Prénom"
                      value={participation.prenom ?? participation.stagiaire_prepa?.prenom ?? ""}
                      onChange={(e) => updateParticipation(index, { prenom: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Téléphone"
                      value={participation.telephone ?? participation.stagiaire_prepa?.telephone ?? ""}
                      onChange={(e) => updateParticipation(index, { telephone: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      type="email"
                      label="Email"
                      value={participation.email ?? participation.stagiaire_prepa?.email ?? ""}
                      onChange={(e) => updateParticipation(index, { email: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Commentaire présence"
                      value={participation.commentaire ?? ""}
                      onChange={(e) => updateParticipation(index, { commentaire: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Collapse>
            </Paper>
          );
        })}
      </Stack>

      <StagiairesPrepaSelectModal
        show={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        onSelect={importStagiaires}
        centreId={centreId}
        selectedStagiaires={selectedStagiaires}
      />
    </Paper>
  );
}
