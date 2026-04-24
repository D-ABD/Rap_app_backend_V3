// src/components/modals/FormationDetailModal.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Divider,
  Grid,
  Box,
  Button,
  CircularProgress,
  Stack,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useFormation } from "../../hooks/useFormations";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AddDocumentButton from "../../pages/formations/componentsFormations/AddDocumentButton";
import FormationCommentsModal from "../../components/modals/FormationCommentsModal";
import { Commentaire } from "src/types/commentaire";
import { nsfSpecialiteLabel } from "../../constants/nsfOptions";
import type { AppTheme } from "src/theme";
import type { Formation } from "../../types/formation";

/* ---------- Types ---------- */
type Props = {
  open: boolean;
  onClose: () => void;
  formationId: number;
  formation?: Formation | null;
};

/* ---------- Helpers ---------- */
const dtfFR =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : undefined;

// 🔒 Désinfection minimale sans dépendance
function sanitizeHTML(input: string): string {
  const allowedTags = ["b", "i", "em", "strong", "u", "p", "span", "br"];
  const allowedAttrs = ["style"];

  const div = document.createElement("div");
  div.innerHTML = input;

  const elements = div.getElementsByTagName("*");
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (!allowedTags.includes(el.tagName.toLowerCase())) {
      el.remove();
      continue;
    }

    // Supprime les attributs non autorisés
    for (const attr of Array.from(el.attributes)) {
      if (!allowedAttrs.includes(attr.name.toLowerCase())) {
        el.removeAttribute(attr.name);
      }
    }
  }

  return div.innerHTML;
}

const fmt = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dtfFR ? dtfFR.format(d) : d.toLocaleDateString("fr-FR");
};

const nn = (s?: string | number | null) =>
  s === null || s === undefined || s === "" ? "—" : String(s);

const yn = (b?: boolean | null) => (typeof b === "boolean" ? (b ? "Oui" : "Non") : "—");
const QUALIFICATION_VISEE_LABELS: Record<string, string> = {
  "1": "1 - Certification enregistree au RNCP autre qu'un CQP",
  "2": "2 - Certificat de qualification professionnelle (CQP)",
  "3": "3 - Qualification reconnue dans les classifications d'une convention collective nationale",
  "4": "4 - Action delivree dans le cadre du contrat de professionnalisation experimental",
  "5": "5 - Action de pre-qualification ou de pre-formation abroge",
  "6": "6 - Certification inscrite au repertoire specifique abroge",
  "7": "7 - Autre abroge",
  "8": "8 - Certification ou qualification professionnelle visee dans le cadre de l'experimentation VAE 2022",
};
const qualificationLabel = (value?: string | null) => (value ? QUALIFICATION_VISEE_LABELS[value] ?? value : "—");
const buildCandidatesUrl = (id: number) => `/candidats?formation=${id}`;
const buildInscritsUrl = (id: number) => `/candidats?formation=${id}&parcours_phase=stagiaire_en_formation`;
const buildProspectionsUrl = (id: number) => `/prospections?formation=${id}`;
const buildAppairagesUrl = (id: number) => `/appairages?formation=${id}`;
const buildEvenementsUrl = (id: number) => `/evenements?formation=${id}`;

/* ---------- Composant principal ---------- */
export default function FormationDetailModal({
  open,
  onClose,
  formationId,
  formation: initialFormation,
}: Props) {
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";
  const modalScrim = isLight
    ? theme.custom.overlay.scrim.background.light
    : theme.custom.overlay.scrim.background.dark;
  const modalTitleBackground = isLight
    ? theme.custom.overlay.modalSectionTitle.background.light
    : theme.custom.overlay.modalSectionTitle.background.dark;
  const modalTitleBorder = isLight
    ? theme.custom.overlay.modalSectionTitle.borderBottom.light
    : theme.custom.overlay.modalSectionTitle.borderBottom.dark;
  const dialogSection = theme.custom.dialog.section;
  const sectionBorder = isLight ? dialogSection.border.light : dialogSection.border.dark;
  const sectionBg = isLight ? dialogSection.background.light : dialogSection.background.dark;
  const { data: formation, loading, error } = useFormation(formationId);
  const displayFormation = formation ?? initialFormation ?? null;
  const [openComments, setOpenComments] = useState(false);
  const navigate = useNavigate();

  if (!open) return null;

  if (!displayFormation && loading)
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogContent sx={{ textAlign: "center", py: 5 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );

  if (error || !displayFormation)
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogContent>
          <Typography color="error">Erreur lors du chargement de la formation.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Fermer</Button>
        </DialogActions>
      </Dialog>
    );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      disableEnforceFocus
      BackdropProps={{ sx: { backgroundColor: modalScrim } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1, backgroundColor: modalTitleBackground, borderBottom: modalTitleBorder }}>
        📘 Détail de la formation :{" "}
        <Typography component="span" color="primary" fontWeight={600}>
          {displayFormation.nom}
        </Typography>
        {loading && displayFormation ? <CircularProgress size={18} sx={{ ml: 1.5, verticalAlign: "middle" }} /> : null}
      </DialogTitle>

      <DialogContent dividers>
        <Box
          sx={{
            p: dialogSection.padding,
            borderRadius: dialogSection.borderRadius,
            border: sectionBorder,
            background: sectionBg,
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Section title="Actions rapides">
                <Grid item xs={12}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => navigate(`/candidats/create?formation=${displayFormation.id}`)}
                    >
                      Ajouter un candidat
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/prospections/create?formation=${displayFormation.id}`)}
                    >
                      Ajouter une prospection
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/appairages/create?formation=${displayFormation.id}`)}
                    >
                      Ajouter un appairage
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/evenements/create?formation=${displayFormation.id}`)}
                    >
                      Ajouter un événement
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/documents/create?formation_id=${displayFormation.id}`)}
                    >
                      Ajouter un document
                    </Button>
                  </Stack>
                </Grid>
              </Section>
            </Grid>

            {/* ─────────── Identité ─────────── */}
            <Grid item xs={12}>
              <Section title="Identité">
                <Field label="Nom" value={nn(displayFormation.nom)} />
                <Field label="Centre" value={displayFormation.centre?.nom ?? "—"} />
                <Field label="Type d’offre" value={displayFormation.type_offre?.libelle ?? "—"} />
                <Field label="Statut" value={displayFormation.statut?.libelle ?? "—"} />
                <Field label="Est archivée" value={yn(displayFormation.est_archivee)} />
                <Field
                  label="Activité"
                  value={
                    displayFormation.activite === "archivee"
                      ? "Archivée"
                      : displayFormation.activite === "active"
                        ? "Active"
                        : "—"
                  }
                />
              </Section>
            </Grid>

            {/* ─────────── Dates ─────────── */}
            <Grid item xs={12}>
              <Section title="Dates">
                <Field label="Date de début" value={fmt(displayFormation.start_date)} />
                <Field label="Date de fin" value={fmt(displayFormation.end_date)} />
                <Field label="Terminée" value={yn(displayFormation.is_past)} />
                <Field label="Créée le" value={fmt(displayFormation.created_at)} />
                <Field label="Mise à jour le" value={fmt(displayFormation.updated_at)} />
              </Section>
            </Grid>

            {/* ─────────── Références ─────────── */}
            <Grid item xs={12}>
              <Section title="Références administratives">
                <Field label="N° Kairos" value={nn(displayFormation.num_kairos)} />
                <Field label="N° Offre" value={nn(displayFormation.num_offre)} />
                <Field label="N° Produit" value={nn(displayFormation.num_produit)} />
                <Field label="Assistante" value={nn(displayFormation.assistante)} />
                <Field label="Convocation envoyée" value={yn(displayFormation.convocation_envoie)} />
              </Section>
            </Grid>

            {/* ─────────── Diplôme ─────────── */}
            <Grid item xs={12}>
              <Section title="Diplôme ou titre visé">
                <Field label="Intitulé" value={nn(displayFormation.intitule_diplome)} />
                <Field label="Code diplôme CERFA" value={nn(displayFormation.diplome_vise_code)} />
                <Field label="Type qualification visée" value={qualificationLabel(displayFormation.type_qualification_visee)} />
                <Field
                  label="Code NSF spécialité de formation"
                  value={nsfSpecialiteLabel(displayFormation.specialite_formation)}
                />
                <Field label="Code diplôme" value={nn(displayFormation.code_diplome)} />
                <Field label="Code RNCP" value={nn(displayFormation.code_rncp)} />
                <Field label="Total heures" value={nn(displayFormation.total_heures)} />
                <Field
                  label="Heures d'enseignements généraux"
                  value={nn(displayFormation.heures_enseignements_generaux)}
                />
                <Field label="Heures distanciel" value={nn(displayFormation.heures_distanciel)} />
              </Section>
            </Grid>

            {/* ─────────── Places & inscrits ─────────── */}
            <Grid item xs={12}>
              <Section title="Places et inscrits">
                <Field label="Capacité" value={nn(displayFormation.cap)} />
                <Field label="Prévu CRIF" value={nn(displayFormation.prevus_crif)} />
                <Field label="Prévu MP" value={nn(displayFormation.prevus_mp)} />
                <Field label="Total places" value={nn(displayFormation.total_places)} />
                <Field label="Inscrits CRIF" value={nn(displayFormation.inscrits_crif)} />
                <Field label="Inscrits MP" value={nn(displayFormation.inscrits_mp)} />
                <Field label="Inscrits total" value={nn(displayFormation.inscrits_total)} />
                <Field label="Total inscrits" value={nn(displayFormation.total_inscrits)} />
                <Field label="Prévu total" value={nn(displayFormation.prevus_total)} />
                <Field label="Places restantes" value={nn(displayFormation.places_restantes)} />
                <Field label="Places disponibles" value={nn(displayFormation.places_disponibles)} />
                <Field label="Places restantes CRIF" value={nn(displayFormation.places_restantes_crif)} />
                <Field label="Places restantes MP" value={nn(displayFormation.places_restantes_mp)} />
                <Field label="À recruter (nb)" value={nn(displayFormation.a_recruter)} />
              </Section>
            </Grid>

            {/* ─────────── Contrôle GESPERS (lecture seule) ─────────── */}
            <Grid item xs={12}>
              <Section title="Contrôle GESPERS">
                <Field label="Inscrits GESPERS CRIF" value={nn(displayFormation.inscrits_crif_gespers)} />
                <Field label="Inscrits GESPERS MP" value={nn(displayFormation.inscrits_mp_gespers)} />
                <Field label="Total inscrits GESPERS" value={nn(displayFormation.total_inscrits_gespers)} />
                <Field label="Écart saisie / GESPERS" value={nn(displayFormation.ecart_inscrits)} />
                <Field label="Saturation GESPERS" value={nn(displayFormation.taux_saturation_gespers)} />
              </Section>
            </Grid>

            {/* ─────────── Statistiques & indicateurs ─────────── */}
            <Grid item xs={12}>
              <Section title="Statistiques et indicateurs">
                <Field label="Entrées en formation" value={nn(displayFormation.entree_formation)} />
                <Field label="Présents en formation" value={nn(displayFormation.presents_en_formation)} />
                <Field
                  label="Candidats"
                  value={
                    <Button component={Link} to={buildCandidatesUrl(displayFormation.id)} size="small">
                      {nn(displayFormation.nombre_candidats)}
                    </Button>
                  }
                />
                <Field
                  label="Inscrits"
                  value={
                    <Button component={Link} to={buildInscritsUrl(displayFormation.id)} size="small">
                      {nn(displayFormation.inscrits_total)}
                    </Button>
                  }
                />
                <Field label="Entretiens" value={nn(displayFormation.nombre_entretiens)} />
                <Field
                  label="Événements"
                  value={
                    <Button component={Link} to={buildEvenementsUrl(displayFormation.id)} size="small">
                      {nn(displayFormation.nombre_evenements)}
                    </Button>
                  }
                />
                <Field label="Saturation" value={nn(displayFormation.saturation)} />
                <Field label="Taux saturation" value={nn(displayFormation.taux_saturation)} />
                <Field label="Taux de transformation" value={nn(displayFormation.taux_transformation)} />
                <Field label="Nombre prospections" value={nn(displayFormation.nombre_prospections)} />
                <Field label="Nombre appairages" value={nn(displayFormation.nombre_appairages)} />
              </Section>
            </Grid>

            {/* ─────────── Relations ─────────── */}
            <Grid item xs={12}>
              <Section title="Relations et liaisons">
                <Field
                  label="Partenaires"
                  value={
                    displayFormation.partenaires?.length
                      ? displayFormation.partenaires.map((p) => (
                          <span key={p.id}>
                            <Link to={`/partenaires/${p.id}/edit`}>{p.nom}</Link>{" "}
                          </span>
                        ))
                      : "—"
                  }
                />
                <Field
                  label="Prospections"
                  value={
                    displayFormation.prospections?.length
                      ? (
                          <Button component={Link} to={buildProspectionsUrl(displayFormation.id)} size="small">
                            {displayFormation.prospections.length} prospection(s)
                          </Button>
                        )
                      : "—"
                  }
                />
                <Field
                  label="Appairages"
                  value={
                    displayFormation.appairages?.length ? (
                      <Button component={Link} to={buildAppairagesUrl(displayFormation.id)} size="small">
                        {displayFormation.appairages.length} appairage(s)
                      </Button>
                    ) : (
                      <Button component={Link} to={buildAppairagesUrl(displayFormation.id)} size="small">
                        Voir les appairages liés
                      </Button>
                    )
                  }
                />
                <Field
                  label="Événements liés"
                  value={
                    <Button component={Link} to={buildEvenementsUrl(displayFormation.id)} size="small">
                      Voir les événements
                    </Button>
                  }
                />

                {/* 🆕 Documents */}
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    <strong>Documents :</strong>{" "}
                    {displayFormation.documents?.length ? (
                      <Box component="span" sx={{ color: "text.primary" }}>
                        {displayFormation.documents.map((doc, idx) => (
                          <span key={doc.id}>
                            <Box
                              component="a"
                              href={doc.download_url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                textDecoration: "underline",
                                color: "primary.main",
                              }}
                            >
                              {doc.nom_fichier}
                            </Box>
                            {idx < (displayFormation.documents?.length ?? 0) - 1 ? ", " : ""}
                          </span>
                        ))}
                      </Box>
                    ) : (
                      <Box
                        component="span"
                        sx={{
                          color: "error.main",
                          fontStyle: "italic",
                          opacity: 0.8,
                        }}
                      >
                        — Aucun document
                      </Box>
                    )}
                  </Typography>

                  {/* Bouton pour ajouter un document */}
                  <Box sx={{ mt: 1 }}>
                    <AddDocumentButton
                      formationId={displayFormation.id}
                      onCreated={() => {
                        toast.success("✅ Document ajouté !");
                        // 🔁 tu pourras rafraîchir la formation ici si besoin
                      }}
                    />
                  </Box>
                </Grid>

                {/* 🗒️ Dernier commentaire (le plus récent selon date maj/création) */}
                {displayFormation.commentaires?.length
                  ? (() => {
                      const dernier = ([...displayFormation.commentaires] as Commentaire[])
                        .filter((c) => c.created_at || c.updated_at)
                        .sort((a, b) => {
                          const dateA = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
                          const dateB = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
                          return dateB - dateA;
                        })[0];

                      if (!dernier) return null;

                      const auteur =
                        dernier.auteur ?? dernier.created_by_username ?? "Auteur inconnu";
                      const dateMaj = dernier.updated_at ? fmt(dernier.updated_at) : null;
                      const dateCrea = dernier.created_at ? fmt(dernier.created_at) : null;

                      return (
                        <Box
                          sx={{
                            mt: 1,
                            ml: 1,
                            borderLeft: (t) => `3px solid ${t.palette.primary.main}`,
                            pl: 1.5,
                            bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                            borderRadius: 1,
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{ mb: 0.5, fontWeight: 500 }}
                          >
                            🗒️ Dernier commentaire :
                          </Typography>

                          <Box
                            sx={{
                              "& p": { m: 0 },
                              "& span": { borderRadius: "2px", padding: "1px 3px" },
                            }}
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHTML(
                                dernier.contenu ?? displayFormation.dernier_commentaire ?? ""
                              ),
                            }}
                          />

                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ display: "block", mt: 0.5 }}
                          >
                            — {auteur}
                            {dateMaj
                              ? `, modifié le ${dateMaj}`
                              : dateCrea
                                ? `, le ${dateCrea}`
                                : ""}
                          </Typography>
                        </Box>
                      );
                    })()
                  : null}

                <Field
                  label="Commentaires"
                  value={
                    displayFormation.commentaires?.length ? (
                      <Button
                        variant="outlined"
                        size="small"
                        color="primary"
                        onClick={() => {
                          // Ouvre la modale + charge les commentaires de cette formation
                          setOpenComments(true);
                          // (optionnel) tu pourrais aussi ici stocker formation.id dans un état si tu gères plusieurs formations
                        }}
                      >
                        Voir tous les commentaires ({displayFormation.commentaires.length})
                      </Button>
                    ) : (
                      <Button
                        variant="text"
                        size="small"
                        color="primary"
                        onClick={() => {
                          setOpenComments(true);
                        }}
                      >
                        Ajouter un commentaire
                      </Button>
                    )
                  }
                />
                <Field
                  label="Historique"
                  value={
                    displayFormation.historique?.length
                      ? `${displayFormation.historique.length} entrée(s) d'historique`
                      : "—"
                  }
                />
              </Section>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      {/* ✅ Actions principales : Fermer + Modifier */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Fermer
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            onClose();
            navigate(`/formations/${displayFormation.id}/edit`);
          }}
        >
          Modifier
        </Button>
      </DialogActions>

      {/* ✅ Sous-modale : commentaires */}
      <FormationCommentsModal
        open={openComments}
        onClose={() => setOpenComments(false)}
        formationId={displayFormation.id}
      />
    </Dialog>
  );
}

/* ---------- Sous-composants ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";
  const modalTitleBackground = isLight
    ? theme.custom.overlay.modalSectionTitle.background.light
    : theme.custom.overlay.modalSectionTitle.background.dark;
  const modalTitleBorder = isLight
    ? theme.custom.overlay.modalSectionTitle.borderBottom.light
    : theme.custom.overlay.modalSectionTitle.borderBottom.dark;
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ mb: 1, px: 1.25, py: 0.75, borderRadius: 1.5, backgroundColor: modalTitleBackground, borderBottom: modalTitleBorder }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "primary.main" }}>
          {title}
        </Typography>
      </Box>
      <Divider sx={{ mb: 1, display: "none" }} />
      <Grid container spacing={1}>
        {children}
      </Grid>
    </Box>
  );
}

function Field({ label, value }: { label: string; value: string | number | React.ReactNode }) {
  const str = typeof value === "number" ? String(value) : value;
  const isMissing =
    str === null ||
    str === undefined ||
    str === "" ||
    str === "—" ||
    (typeof str === "string" && !str.trim());

  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
        <strong>{label} :</strong>{" "}
        {isMissing ? (
          <span style={{ color: "red", fontStyle: "italic", opacity: 0.8 }}>— NC</span>
        ) : (
          str
        )}
      </Typography>
    </Grid>
  );
}
