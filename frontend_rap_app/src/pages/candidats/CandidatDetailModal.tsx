import type { ReactNode } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  Divider,
  Paper,
  CircularProgress,
  Stack,
  Alert,
  Chip,
  Link,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useNavigate } from "react-router-dom";
import type { Candidat } from "../../types/candidat";
import { useCandidateAccountActions, useCandidateLifecycleActions } from "../../hooks/useCandidats";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks/useAuth";
import { getCandidatBusinessStatusLabel } from "../../shared/utils/candidatStatus";

/* ---------- Helpers ---------- */
type CandidatWithFormation = Candidat & {
  formation_nom?: string | null;
  formation_centre_nom?: string | null;
  formation_type_offre_nom?: string | null;
  formation_type_offre_libelle?: string | null;
  formation_num_offre?: string | null;
  formation_date_debut?: string | null;
  formation_date_fin?: string | null;
};

const dtfFR = typeof Intl !== "undefined" ? new Intl.DateTimeFormat("fr-FR") : undefined;

const fmt = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dtfFR ? dtfFR.format(d) : d.toLocaleDateString("fr-FR");
};

const nn = (s?: string | null) => (s ?? "").toString().trim() || "—";
const yn = (b?: boolean | null) => (typeof b === "boolean" ? (b ? "Oui" : "Non") : "—");

const TYPE_CONTRAT_LABELS: Record<string, string> = {
  apprentissage: "Apprentissage",
  professionnalisation: "Professionnalisation",
  sans_contrat: "Sans contrat",
  poei_poec: "POEI / POEC",
  crif: "CRIF",
  autre: "Autre",
};

function typeContratLabel(value?: string | null): string {
  if (!value) return "—";
  return TYPE_CONTRAT_LABELS[value] ?? value;
}

function getLinkedAccountId(candidat?: CandidatWithFormation | null): number | null {
  const account = candidat?.compte_utilisateur;
  if (typeof account === "number") return account;
  if (account && typeof account === "object" && typeof account.id === "number") return account.id;
  return null;
}

function buildCandidateProspectionCreateUrl(candidat?: CandidatWithFormation | null): string | null {
  const ownerId = getLinkedAccountId(candidat);
  if (!ownerId || !candidat?.id) return null;

  const params = new URLSearchParams();
  params.set("owner", String(ownerId));
  params.set("owner_username", nn(candidat.nom_complet || `${candidat.prenom ?? ""} ${candidat.nom ?? ""}`.trim()));

  if (typeof candidat.formation === "number") {
    params.set("formation", String(candidat.formation));
  }
  if (candidat.formation_nom) {
    params.set("formation_nom", candidat.formation_nom);
  }

  return `/prospections/create?${params.toString()}`;
}

function buildCandidateAppairageCreateUrl(candidat?: CandidatWithFormation | null): string | null {
  if (!candidat?.id) return null;

  const params = new URLSearchParams();
  params.set("candidat", String(candidat.id));
  params.set(
    "candidat_nom",
    nn(candidat.nom_complet || `${candidat.prenom ?? ""} ${candidat.nom ?? ""}`.trim())
  );

  if (typeof candidat.formation === "number") {
    params.set("formation", String(candidat.formation));
  }
  if (candidat.formation_nom) {
    params.set("formation_nom", candidat.formation_nom);
  }

  return `/appairages/create?${params.toString()}`;
}

function uiPhaseLabel(candidat?: CandidatWithFormation | null): string {
  return getCandidatBusinessStatusLabel(candidat);
}

function accountRequestLabel(status?: string | null): string {
  if (status === "en_attente") return "Demande en attente";
  if (status === "acceptee") return "Demande acceptée";
  if (status === "refusee") return "Demande refusée";
  return "Aucune demande";
}

function accountRequestChip(status?: string | null) {
  const label = accountRequestLabel(status);
  let color: "default" | "warning" | "success" | "error" = "default";
  if (status === "en_attente") color = "warning";
  if (status === "acceptee") color = "success";
  if (status === "refusee") color = "error";
  return <Chip size="small" color={color} label={label} variant="outlined" />;
}

/* ---------- Props ---------- */
interface Props {
  open: boolean;
  onClose: () => void;
  candidat?: CandidatWithFormation | null;
  loading?: boolean;
  onEdit?: (id: number) => void;
  onLifecycleSuccess?: () => Promise<void> | void;
}

/* ---------- Sections à afficher ---------- */
const SECTIONS: {
  title: string;
  fields: { key: keyof CandidatWithFormation; label: string }[];
}[] = [
  {
    title: "Identité",
    fields: [
      { key: "sexe", label: "Sexe" },
      { key: "nom_naissance", label: "Nom de naissance" },
      { key: "nom", label: "Nom d’usage" },
      { key: "prenom", label: "Prénom" },
      { key: "date_naissance", label: "Date de naissance" },
      { key: "departement_naissance", label: "Département de naissance" },
      { key: "commune_naissance", label: "Commune de naissance" },
      { key: "pays_naissance", label: "Pays de naissance" },
      { key: "nationalite", label: "Nationalité" },
      { key: "nir", label: "NIR" },
    ],
  },
  {
    title: "Contact et Adresse",
    fields: [
      { key: "email", label: "Email" },
      { key: "telephone", label: "Téléphone" },
      { key: "street_number", label: "Numéro de voie" },
      { key: "street_name", label: "Rue" },
      { key: "street_complement", label: "Complément" },
      { key: "code_postal", label: "Code postal" },
      { key: "ville", label: "Ville" },
    ],
  },
  {
    title: "Formation",
    fields: [
      { key: "centre_nom", label: "Centre" },
      { key: "date_rentree", label: "Date de rentrée" },
      { key: "formation_nom", label: "Nom formation" },
      { key: "formation_centre_nom", label: "Centre (formation)" },
      { key: "formation_type_offre_nom", label: "Type d’offre" },
      { key: "formation_num_offre", label: "N° offre" },
      { key: "formation_date_debut", label: "Début de formation" },
      { key: "formation_date_fin", label: "Fin de formation" },
    ],
  },
  {
    title: "Statut",
    fields: [
      { key: "statut_metier_display", label: "Statut métier" },
      { key: "admissible", label: "Admissible" },
      { key: "en_accompagnement_tre", label: "En accompagnement TRE" },
      { key: "en_appairage", label: "En appairage" },
      { key: "entretien_done", label: "Entretien réalisé" },
      { key: "test_is_ok", label: "Test d’entrée OK" },
      { key: "inscrit_gespers", label: "Inscrit GESPERS" },
    ],
  },
  {
    title: "Contrat",
    fields: [
      { key: "type_contrat", label: "Type de contrat" },
      { key: "contrat_signe_display", label: "Contrat signé" },
    ],
  },
  {
    title: "Complément",
    fields: [
      { key: "disponibilite", label: "Disponibilité" },
      { key: "cv_statut_display", label: "Statut du CV" },
      { key: "permis_b", label: "Permis B" },
      { key: "rqth", label: "RQTH" },
      { key: "communication", label: "Communication ★" },
      { key: "experience", label: "Expérience ★" },
      { key: "csp", label: "CSP ★" },
    ],
  },
  {
    title: "Placement",
    fields: [
      { key: "resultat_placement_display", label: "Résultat placement" },
      { key: "date_placement", label: "Date placement" },
      { key: "contrat_signe_display", label: "Contrat signé" },
      { key: "entreprise_placement_nom", label: "Entreprise placement" },
      { key: "entreprise_validee_nom", label: "Entreprise validée" },
      { key: "responsable_placement_nom", label: "Responsable placement" },
      { key: "vu_par_nom", label: "Vu par (staff)" },
      { key: "courrier_rentree", label: "Courrier rentrée envoyé" },
      { key: "numero_osia", label: "Numéro OSIA" },
    ],
  },
  {
    title: "Infos pour CERFA : Parcours scolaire et projet...",
    fields: [
      { key: "dernier_diplome_prepare", label: "Dernier diplôme préparé" },
      { key: "diplome_plus_eleve_obtenu", label: "Diplôme le plus élevé obtenu" },
      { key: "derniere_classe", label: "Dernière classe fréquentée" },
      { key: "intitule_diplome_prepare", label: "Intitulé du diplôme préparé" },
      { key: "situation_avant_contrat", label: "Situation avant contrat" },
      { key: "projet_creation_entreprise", label: "Projet création entreprise" },
      { key: "regime_social", label: "Régime social" },
      { key: "sportif_haut_niveau", label: "Sportif de haut niveau" },
      { key: "equivalence_jeunes", label: "Équivalence jeunes" },
      { key: "extension_boe", label: "Extension BOE" },
      { key: "situation_actuelle", label: "Situation actuelle" },
    ],
  },
  {
    title: "Représentant légal",
    fields: [
      { key: "representant_lien", label: "Lien" },
      { key: "representant_nom_naissance", label: "Nom naissance" },
      { key: "representant_prenom", label: "Prénom" },
      { key: "representant_email", label: "Email" },
      { key: "representant_street_name", label: "Rue" },
      { key: "representant_zip_code", label: "Code postal" },
      { key: "representant_city", label: "Ville" },
    ],
  },
  {
    title: "Métadonnées / Système",
    fields: [
      { key: "date_inscription", label: "Date d’inscription" },
      { key: "created_at", label: "Créé le" },
      { key: "updated_at", label: "Mis à jour le" },
      { key: "created_by", label: "Créé par (ID ou user)" },
      { key: "nb_appairages", label: "Nb appairages" },
      { key: "nb_prospections", label: "Nb prospections" },
    ],
  },
];

/* ---------- Component ---------- */
export default function CandidatDetailModal({
  open,
  onClose,
  candidat,
  loading = false,
  onEdit,
  onLifecycleSuccess,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    loading: lifecycleLoading,
    setAdmissible,
    clearAdmissible,
    setGespers,
    clearGespers,
    setAccompagnement,
    clearAccompagnement,
    setAppairage,
    clearAppairage,
    startFormation,
    cancelStartFormation,
    completeFormation,
    abandon,
  } = useCandidateLifecycleActions();
  const {
    loading: accountLoading,
    createAccount,
    approveAccountRequest,
    rejectAccountRequest,
  } = useCandidateAccountActions();

  if (!open) return null;

  const la = candidat?.last_appairage ?? null;
  const linkedAccountId = getLinkedAccountId(candidat);
  const isStaffLike = !!user && ["admin", "superadmin", "staff", "staff_read"].includes(user.role);
  const hasLinkedAccount = !!candidat?.compte_utilisateur;
  const requestStatus = candidat?.demande_compte_statut ?? null;
  const canReverseFormation = candidat?.parcours_phase === "stagiaire_en_formation";
  const canMarkAdmissible = !candidat?.admissible;
  const canClearAdmissible = !!candidat?.admissible;
  const canSetGespers = !candidat?.inscrit_gespers;
  const canClearGespers = !!candidat?.inscrit_gespers;
  const canSetAccompagnement = !candidat?.en_accompagnement_tre;
  const canClearAccompagnement = !!candidat?.en_accompagnement_tre;
  const canSetAppairage = !candidat?.en_appairage;
  const canClearAppairage = !!candidat?.en_appairage;
  const createProspectionUrl = buildCandidateProspectionCreateUrl(candidat);
  const createAppairageUrl = buildCandidateAppairageCreateUrl(candidat);
  const openCandidateAppairages = () => {
    if (!candidat?.id) return;
    onClose();
    navigate(`/appairages?candidat=${candidat.id}`);
  };
  const openCandidateProspections = () => {
    if (!linkedAccountId) return;
    onClose();
    navigate(`/prospections?owner=${linkedAccountId}`);
  };

  const confirmAction = (label: string) =>
    window.confirm(`Êtes-vous sûr de vouloir passer le statut en ${label} ?`);

  const handleLifecycleAction = async (
    action:
      | "setAdmissible"
      | "clearAdmissible"
      | "setGespers"
      | "clearGespers"
      | "setAccompagnement"
      | "clearAccompagnement"
      | "setAppairage"
      | "clearAppairage"
      | "start"
      | "cancelStart"
      | "complete"
      | "abandon"
  ) => {
    if (!candidat?.id) return;

    try {
      if (action === "setAdmissible") {
        if (!confirmAction("Candidat admissible")) return;
        const result = await setAdmissible(candidat.id);
        toast.success(result.message || "Statut admissible enregistré.");
      } else if (action === "clearAdmissible") {
        if (!confirmAction("Candidat")) return;
        const result = await clearAdmissible(candidat.id);
        toast.success(result.message || "Statut admissible retiré.");
      } else if (action === "setGespers") {
        if (!confirmAction("Inscrit GESPERS")) return;
        const result = await setGespers(candidat.id);
        toast.success(result.message || "Inscription GESPERS enregistrée.");
      } else if (action === "clearGespers") {
        if (!confirmAction("Candidat")) return;
        const result = await clearGespers(candidat.id);
        toast.success(result.message || "Inscription GESPERS annulée.");
      } else if (action === "setAccompagnement") {
        if (!confirmAction("En accompagnement TRE")) return;
        const result = await setAccompagnement(candidat.id);
        toast.success(result.message || "Accompagnement TRE enregistré.");
      } else if (action === "clearAccompagnement") {
        if (!confirmAction("Candidat")) return;
        const result = await clearAccompagnement(candidat.id);
        toast.success(result.message || "Accompagnement TRE retiré.");
      } else if (action === "setAppairage") {
        if (!confirmAction("En appairage")) return;
        const result = await setAppairage(candidat.id);
        toast.success(result.message || "Appairage enregistré.");
      } else if (action === "clearAppairage") {
        if (!confirmAction("Candidat")) return;
        const result = await clearAppairage(candidat.id);
        toast.success(result.message || "Appairage retiré.");
      } else if (action === "start") {
        if (!confirmAction("En formation")) return;
        const result = await startFormation(candidat.id);
        toast.success(result.message || "Entrée en formation enregistrée.");
      } else if (action === "cancelStart") {
        if (!confirmAction("Candidat")) return;
        const result = await cancelStartFormation(candidat.id);
        toast.success(result.message || "Entrée en formation annulée.");
      } else if (action === "complete") {
        if (!confirmAction("Sortie / fin de formation")) return;
        const result = await completeFormation(candidat.id);
        toast.success(result.message || "Sortie de formation enregistrée.");
      } else {
        if (!confirmAction("Abandon")) return;
        const result = await abandon(candidat.id);
        toast.success(result.message || "Abandon enregistré.");
      }

      await onLifecycleSuccess?.();
    } catch (error: any) {
      const message =
        error?.message ||
        "L'action demandée n'a pas pu être exécutée pour ce candidat.";
      toast.error(message);
    }
  };

  const handleAccountAction = async (action: "create" | "approve" | "reject") => {
    if (!candidat?.id) return;

    try {
      if (action === "create") {
        const result = await createAccount(candidat.id);
        toast.success(
          result.message ||
            "Compte candidat créé ou lié. Le passage en stagiaire se fera uniquement à l'entrée en formation."
        );
      } else if (action === "approve") {
        const result = await approveAccountRequest(candidat.id);
        toast.success(result.message || "Demande de compte validée.");
      } else {
        const result = await rejectAccountRequest(candidat.id);
        toast.success(result.message || "Demande de compte refusée.");
      }

      await onLifecycleSuccess?.();
    } catch (error: any) {
      toast.error(
        error?.message || "L'action sur le compte candidat n'a pas pu être exécutée."
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      disableEnforceFocus
    >
      {/* ────── En-tête ────── */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography component="div" variant="h6" fontWeight={700}>
          👤 Détail du candidat
        </Typography>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogTitle>

      {/* ────── Contenu ────── */}
      <DialogContent dividers>
        {loading || !candidat ? (
          <Box textAlign="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Grid container spacing={3}>
              {SECTIONS.map((section) => (
                <Grid item xs={12} key={section.title}>
                  <Section title={section.title}>
                    {section.fields.map(({ key, label }) => {
                      const val = candidat[key];
                      const value =
                        key === "nb_appairages" && typeof candidat.nb_appairages === "number" ? (
                          candidat.nb_appairages > 0 ? (
                            <Link component="button" type="button" underline="hover" onClick={openCandidateAppairages}>
                              {candidat.nb_appairages}
                            </Link>
                          ) : (
                            "0"
                          )
                        ) : key === "nb_prospections" && typeof candidat.nb_prospections === "number" ? (
                          candidat.nb_prospections > 0 && linkedAccountId ? (
                            <Link component="button" type="button" underline="hover" onClick={openCandidateProspections}>
                              {candidat.nb_prospections}
                            </Link>
                          ) : (
                            String(candidat.nb_prospections)
                          )
                        ) : typeof val === "boolean"
                          ? yn(val)
                          : key === "type_contrat"
                            ? typeContratLabel(val as string | null)
                          : key === "parcours_phase_display" || key === "statut_metier_display"
                            ? uiPhaseLabel(candidat)
                          : key.toLowerCase().includes("date")
                            ? fmt(val as string)
                            : nn(val as string);
                      return <Field key={key as string} label={label} value={value} />;
                    })}
                  </Section>
                </Grid>
              ))}

              {candidat && (
                <Grid item xs={12}>
                  <Section title="Actions de parcours">
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mb: 1 }}>
                        Statut métier actuel : <strong>{uiPhaseLabel(candidat)}</strong>
                      </Alert>
                      <Alert severity="info" variant="outlined" sx={{ mb: 1 }}>
                        Etats actifs : admissible {yn(candidat.admissible).toLowerCase()} · GESPERS{" "}
                        {yn(candidat.inscrit_gespers).toLowerCase()} · accompagnement TRE{" "}
                        {yn(candidat.en_accompagnement_tre).toLowerCase()} · appairage{" "}
                        {yn(candidat.en_appairage).toLowerCase()}
                      </Alert>
                      <Alert
                        severity={candidat.type_contrat ? "success" : "info"}
                        variant="outlined"
                        sx={{ mb: 1 }}
                      >
                        Type de contrat actuel : <strong>{typeContratLabel(candidat.type_contrat)}</strong>
                        {" · "}
                        Contrat signe : <strong>{nn(candidat.contrat_signe_display)}</strong>
                      </Alert>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap">
                        {createAppairageUrl && (
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => {
                              onClose();
                              navigate(createAppairageUrl);
                            }}
                          >
                            Créer un appairage
                          </Button>
                        )}
                        {createProspectionUrl && (
                          <Button
                            variant="contained"
                            onClick={() => {
                              onClose();
                              navigate(createProspectionUrl);
                            }}
                          >
                            Créer une prospection
                          </Button>
                        )}
                        {canMarkAdmissible && (
                          <Button
                            variant="outlined"
                            disabled={lifecycleLoading}
                            onClick={() => handleLifecycleAction("setAdmissible")}
                          >
                            Candidat admissible
                          </Button>
                        )}
                        {canClearAdmissible && (
                          <Button
                            variant="outlined"
                            disabled={lifecycleLoading}
                            onClick={() => handleLifecycleAction("clearAdmissible")}
                          >
                            Annuler admissible
                          </Button>
                        )}
                        {canSetGespers && (
                          <Button
                            variant="outlined"
                            disabled={lifecycleLoading}
                            onClick={() => handleLifecycleAction("setGespers")}
                          >
                            Inscrire GESPERS
                          </Button>
                        )}
                        {canClearGespers && (
                          <Button
                            variant="outlined"
                            disabled={lifecycleLoading}
                            onClick={() => handleLifecycleAction("clearGespers")}
                          >
                            Annuler inscription GESPERS
                          </Button>
                        )}
                        {canSetAccompagnement && (
                          <Button
                            variant="outlined"
                            disabled={lifecycleLoading}
                            onClick={() => handleLifecycleAction("setAccompagnement")}
                          >
                            En accompagnement TRE
                          </Button>
                        )}
                        {canClearAccompagnement && (
                          <Button
                            variant="outlined"
                            disabled={lifecycleLoading}
                            onClick={() => handleLifecycleAction("clearAccompagnement")}
                          >
                            Retirer accompagnement TRE
                          </Button>
                        )}
                        {canSetAppairage && (
                          <Button
                            variant="outlined"
                            disabled={lifecycleLoading}
                            onClick={() => handleLifecycleAction("setAppairage")}
                          >
                            En appairage
                          </Button>
                        )}
                        {canClearAppairage && (
                          <Button
                            variant="outlined"
                            disabled={lifecycleLoading}
                            onClick={() => handleLifecycleAction("clearAppairage")}
                          >
                            Retirer appairage
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          disabled={lifecycleLoading}
                          onClick={() => handleLifecycleAction("start")}
                        >
                          En formation
                        </Button>
                        {canReverseFormation && (
                          <Button
                            variant="outlined"
                            disabled={lifecycleLoading}
                            onClick={() => handleLifecycleAction("cancelStart")}
                          >
                            Annuler en formation
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          disabled={lifecycleLoading}
                          onClick={() => handleLifecycleAction("complete")}
                        >
                          Sortie / fin de formation
                        </Button>
                        <Button
                          color="error"
                          variant="outlined"
                          disabled={lifecycleLoading}
                          onClick={() => handleLifecycleAction("abandon")}
                        >
                          Enregistrer un abandon
                        </Button>
                      </Stack>
                    </Grid>
                  </Section>
                </Grid>
              )}

              {candidat && isStaffLike && (
                <Grid item xs={12}>
                  <Section title="Compte candidat">
                    <Grid item xs={12}>
                      <Stack spacing={1}>
                        <Alert severity={hasLinkedAccount ? "success" : "info"}>
                          Compte lié :{" "}
                          <strong>
                            {hasLinkedAccount
                              ? "oui"
                              : "non"}
                          </strong>
                          {candidat.email ? ` - ${candidat.email}` : ""}
                        </Alert>
                        <Alert severity="info" variant="outlined">
                          Créer ou lier un compte laisse le candidat au statut candidat.
                          Le rôle stagiaire n'est attribué qu'au moment de l'entrée en
                          formation.
                        </Alert>
                        <Box>
                          <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                            <strong>État de la demande :</strong>
                          </Typography>
                          <Box sx={{ mb: 1 }}>{accountRequestChip(requestStatus)}</Box>
                        </Box>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap">
                          {!hasLinkedAccount && (
                            <Button
                              variant="outlined"
                              disabled={accountLoading}
                              onClick={() => handleAccountAction("create")}
                            >
                              Créer ou lier le compte candidat
                            </Button>
                          )}
                          {requestStatus === "en_attente" && (
                            <>
                              <Button
                                variant="contained"
                                disabled={accountLoading}
                                onClick={() => handleAccountAction("approve")}
                              >
                                Valider la demande de compte
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                disabled={accountLoading}
                                onClick={() => handleAccountAction("reject")}
                              >
                                Refuser la demande de compte
                              </Button>
                            </>
                          )}
                        </Stack>
                      </Stack>
                    </Grid>
                  </Section>
                </Grid>
              )}

              {/* ───────────── Dernier appairage ───────────── */}
              {la && (
                <Grid item xs={12}>
                  <Section title="Dernier appairage">
                    <Field label="Partenaire" value={nn(la.partenaire_nom)} />
                    <Field label="Statut" value={nn(la.statut_display ?? la.statut)} />
                    <Field label="Date d’appairage" value={fmt(la.date_appairage)} />
                    <Field label="Commentaire" value={nn(la.commentaire)} />
                  </Section>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}
      </DialogContent>

      {/* ────── Actions ────── */}
      <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
        {candidat && onEdit && candidat.id != null && (
          <Button startIcon={<EditIcon />} color="primary" variant="contained" onClick={() => onEdit(candidat.id)}>
            Modifier
          </Button>
        )}
        <Button variant="outlined" onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------- Sous-composants ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "primary.main", mb: 0.5 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Grid container spacing={1}>
        {children}
      </Grid>
    </Box>
  );
}

function Field({ label, value }: { label: string; value?: ReactNode }) {
  const display =
    value === null ||
    value === undefined ||
    value === "—" ||
    (typeof value === "string" && !value.trim()) ? (
      <span style={{ color: "red", fontStyle: "italic", opacity: 0.85 }}>— NC</span>
    ) : (
      value
    );

  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="body2">
        <strong>{label} :</strong> {display}
      </Typography>
    </Grid>
  );
}
