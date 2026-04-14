// src/pages/formations/FormationsDetailPage.tsx
import { Box, Grid, Paper, Typography, Divider, Button, CircularProgress, Stack } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useState } from "react";

import { useFormation } from "../../hooks/useFormations";
import PageTemplate from "../../components/PageTemplate";
import FormationCommentsModal from "../../components/modals/FormationCommentsModal"; // ✅ import ajouté
import { nsfSpecialiteLabel } from "../../constants/nsfOptions";

/* ---------- Helpers ---------- */
const dtfFR =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : undefined;

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
export default function FormationsDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: formation, loading, error } = useFormation(Number(id));

  // ✅ état pour ouvrir/fermer la modal
  const [openComments, setOpenComments] = useState(false);

  if (loading) return <CircularProgress sx={{ m: 2 }} />;
  if (error || !formation) {
    toast.error("Erreur lors du chargement de la formation");
    return null;
  }

  const scrollToEdit = () => {
    const el = document.getElementById("edit-section");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PageTemplate
      title="Détail de la formation"
      backButton
      onBack={() => navigate(-1)}
      actions={
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<EditIcon fontSize="small" />}
          onClick={scrollToEdit}
        >
          Modifier
        </Button>
      }
    >
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Section title="Actions rapides">
              <Grid item xs={12}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button variant="contained" onClick={() => navigate(`/candidats/create?formation=${formation.id}`)}>
                    Ajouter un candidat
                  </Button>
                  <Button variant="outlined" onClick={() => navigate(`/prospections/create?formation=${formation.id}`)}>
                    Ajouter une prospection
                  </Button>
                  <Button variant="outlined" onClick={() => navigate(`/appairages/create?formation=${formation.id}`)}>
                    Ajouter un appairage
                  </Button>
                  <Button variant="outlined" onClick={() => navigate(`/evenements/create?formation=${formation.id}`)}>
                    Ajouter un événement
                  </Button>
                  <Button variant="outlined" onClick={() => navigate(`/documents/create?formation_id=${formation.id}`)}>
                    Ajouter un document
                  </Button>
                </Stack>
              </Grid>
            </Section>
          </Grid>

          {/* ─────────── Identité ─────────── */}
          <Grid item xs={12}>
            <Section title="Identité">
              <Field label="Nom" value={nn(formation.nom)} />
              <Field label="Centre" value={formation.centre?.nom ?? "—"} />
              <Field label="Type d’offre" value={formation.type_offre?.libelle ?? "—"} />
              <Field label="Statut" value={formation.statut?.libelle ?? "—"} />
              <Field label="Active" value={yn(formation.is_active)} />
              <Field label="Statut temporel" value={nn(formation.status_temporel)} />
              <Field label="À recruter" value={yn(formation.is_a_recruter)} />
            </Section>
          </Grid>

          {/* ─────────── Dates ─────────── */}
          <Grid item xs={12}>
            <Section title="Dates">
              <Field label="Date de début" value={fmt(formation.start_date)} />
              <Field label="Date de fin" value={fmt(formation.end_date)} />
              <Field label="Créée le" value={fmt(formation.created_at)} />
              <Field label="Mise à jour le" value={fmt(formation.updated_at)} />
            </Section>
          </Grid>

          {/* ─────────── Références ─────────── */}
          <Grid item xs={12}>
            <Section title="Références administratives">
              <Field label="N° Kairos" value={nn(formation.num_kairos)} />
              <Field label="N° Offre" value={nn(formation.num_offre)} />
              <Field label="N° Produit" value={nn(formation.num_produit)} />
              <Field label="Assistante" value={nn(formation.assistante)} />
              <Field label="Convocation envoyée" value={yn(formation.convocation_envoie)} />
            </Section>
          </Grid>

          {/* ─────────── Diplôme ─────────── */}
          <Grid item xs={12}>
            <Section title="Diplôme ou titre visé">
              <Field label="Intitulé" value={nn(formation.intitule_diplome)} />
              <Field label="Code diplôme CERFA" value={nn(formation.diplome_vise_code)} />
              <Field label="Type qualification visée" value={qualificationLabel(formation.type_qualification_visee)} />
              <Field
                label="Code NSF spécialité de formation"
                value={nsfSpecialiteLabel(formation.specialite_formation)}
              />
              <Field label="Code diplôme" value={nn(formation.code_diplome)} />
              <Field label="Code RNCP" value={nn(formation.code_rncp)} />
              <Field label="Total heures" value={nn(formation.total_heures)} />
              <Field
                label="Heures d'enseignements généraux"
                value={nn(formation.heures_enseignements_generaux)}
              />
              <Field label="Heures distanciel" value={nn(formation.heures_distanciel)} />
            </Section>
          </Grid>

          {/* ─────────── Places & inscrits ─────────── */}
          <Grid item xs={12}>
            <Section title="Places et inscrits">
              <Field label="Capacité" value={nn(formation.cap)} />
              <Field label="Prévu CRIF" value={nn(formation.prevus_crif)} />
              <Field label="Prévu MP" value={nn(formation.prevus_mp)} />
              <Field label="Inscrits CRIF" value={nn(formation.inscrits_crif)} />
              <Field label="Inscrits MP" value={nn(formation.inscrits_mp)} />
              <Field label="Inscrits total" value={nn(formation.inscrits_total)} />
              <Field label="Prévu total" value={nn(formation.prevus_total)} />
              <Field label="Places restantes" value={nn(formation.places_restantes)} />
              <Field label="À recruter" value={nn(formation.a_recruter)} />
            </Section>
          </Grid>

          {/* ─────────── Contrôle GESPERS (lecture seule) ─────────── */}
          <Grid item xs={12}>
            <Section title="Contrôle GESPERS">
              <Field label="Inscrits GESPERS CRIF" value={nn(formation.inscrits_crif_gespers)} />
              <Field label="Inscrits GESPERS MP" value={nn(formation.inscrits_mp_gespers)} />
              <Field label="Total inscrits GESPERS" value={nn(formation.total_inscrits_gespers)} />
              <Field label="Écart saisie / GESPERS" value={nn(formation.ecart_inscrits)} />
              <Field label="Saturation GESPERS" value={nn(formation.taux_saturation_gespers)} />
            </Section>
          </Grid>

          {/* ─────────── Statistiques & indicateurs ─────────── */}
          <Grid item xs={12}>
            <Section title="Statistiques et indicateurs">
              <Field label="Entrées en formation" value={nn(formation.entree_formation)} />
              <Field
                label="Candidats"
                value={
                  <Button component={Link} to={buildCandidatesUrl(formation.id)} size="small">
                    {nn(formation.nombre_candidats)}
                  </Button>
                }
              />
              <Field
                label="Inscrits"
                value={
                  <Button component={Link} to={buildInscritsUrl(formation.id)} size="small">
                    {nn(formation.inscrits_total)}
                  </Button>
                }
              />
              <Field label="Entretiens" value={nn(formation.nombre_entretiens)} />
              <Field
                label="Événements"
                value={
                  <Button component={Link} to={buildEvenementsUrl(formation.id)} size="small">
                    {nn(formation.nombre_evenements)}
                  </Button>
                }
              />
              <Field label="Saturation" value={nn(formation.saturation)} />
              <Field label="Badge saturation" value={nn(formation.saturation_badge)} />
              <Field label="Badge label" value={nn(formation.saturation_badge_label)} />
              <Field label="Taux de transformation" value={nn(formation.taux_transformation)} />
              <Field label="Badge transformation" value={nn(formation.transformation_badge)} />
            </Section>
          </Grid>

          {/* ─────────── Relations ─────────── */}
          <Grid item xs={12}>
            <Section title="Relations et liaisons">
              <Field
                label="Partenaires"
                value={
                  formation.partenaires?.length
                    ? formation.partenaires.map((p) => (
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
                  formation.prospections?.length ? (
                    <Button component={Link} to={buildProspectionsUrl(formation.id)} size="small">
                      {formation.prospections.length} prospection(s)
                    </Button>
                  ) : (
                    "—"
                  )
                }
              />
              <Field
                label="Appairages"
                value={
                  <Button component={Link} to={buildAppairagesUrl(formation.id)} size="small">
                    Voir les appairages liés
                  </Button>
                }
              />
              <Field
                label="Événements liés"
                value={
                  <Button component={Link} to={buildEvenementsUrl(formation.id)} size="small">
                    Voir les événements
                  </Button>
                }
              />
              <Field
                label="Documents"
                value={formation.documents?.length ? formation.documents.length : "—"}
              />
              <Field
                label="Commentaires"
                value={
                  formation.commentaires?.length ? (
                    <Button
                      variant="outlined"
                      size="small"
                      color="warning"
                      onClick={() => setOpenComments(true)} // ✅ ouverture modal
                    >
                      Voir les commentaires({formation.commentaires.length})
                    </Button>
                  ) : (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => setOpenComments(true)} // ✅ ouverture modal
                    >
                      Ajouter un commentaire
                    </Button>
                  )
                }
              />
            </Section>
          </Grid>
        </Grid>
      </Paper>

      {/* ✅ Modal insérée ici */}
      <FormationCommentsModal
        open={openComments}
        onClose={() => setOpenComments(false)}
        formationId={formation.id}
      />
    </PageTemplate>
  );
}

/* ---------- Sous-composants ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Grid container spacing={1}>
        {children}
      </Grid>
    </Box>
  );
}

/**
 * 🔹 Affiche “— NC” en rouge italique quand la donnée est vide
 */
function Field({ label, value }: { label: string; value: string | number | React.ReactNode }) {
  const str = typeof value === "number" ? String(value) : value;
  const isMissing =
    str === null ||
    str === undefined ||
    str === "" ||
    str === "—" ||
    (typeof str === "string" && !str.trim());

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="body2">
        <strong>{label} :</strong>{" "}
        {isMissing ? (
          <span style={{ color: "red", fontStyle: "italic", opacity: 0.85 }}>— NC</span>
        ) : (
          str
        )}
      </Typography>
    </Grid>
  );
}
