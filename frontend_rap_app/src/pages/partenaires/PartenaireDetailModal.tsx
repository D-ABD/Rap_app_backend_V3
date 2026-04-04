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
  Link,
  CircularProgress,
  Paper,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CampaignIcon from "@mui/icons-material/Campaign";
import HandshakeIcon from "@mui/icons-material/Handshake";
import LaunchIcon from "@mui/icons-material/Launch";
import { useNavigate } from "react-router-dom";
import type { Partenaire } from "../../types/partenaire";

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

const getDepartementLabel = (zipCode?: string | null): string => {
  if (!zipCode) return "—";
  const digits = zipCode.replace(/\s+/g, "");
  if (/^97\d{2}$/.test(digits) || /^98\d{2}$/.test(digits)) return digits.slice(0, 3);
  if (/^\d{5}$/.test(digits)) return digits.slice(0, 2);
  return "—";
};

const TYPE_EMPLOYEUR_CODE_LABELS: Record<string, string> = {
  "11": "11 - Repertoire des metiers",
  "12": "12 - RCS",
  "13": "13 - MSA",
  "14": "14 - Profession liberale",
  "15": "15 - Association",
  "16": "16 - Autre employeur prive",
  "21": "21 - Service de l'Etat",
  "22": "22 - Commune",
  "23": "23 - Departement",
  "24": "24 - Region",
  "25": "25 - Etablissement public hospitalier",
  "26": "26 - EPLE",
  "27": "27 - EPA Etat",
  "28": "28 - EPA local",
  "29": "29 - Autre employeur public",
  "30": "30 - EPIC",
};

const EMPLOYEUR_SPECIFIQUE_CODE_LABELS: Record<string, string> = {
  "0": "0 - Aucun de ces cas",
  "1": "1 - Entreprise de travail temporaire",
  "2": "2 - Groupement d'employeurs",
  "3": "3 - Employeur saisonnier",
  "4": "4 - Apprentissage familial",
};

const NIVEAU_DIPLOME_CODE_LABELS: Record<string, string> = {
  "0": "0 - Aucun",
  "3": "3 - CAP / BEP",
  "4": "4 - Baccalaureat",
  "5": "5 - DEUG / BTS / DUT / DEUST",
  "6": "6 - Licence / Licence pro / BUT / Maitrise",
  "7": "7 - Master / DEA / DESS / Ingenieur",
  "8": "8 - Doctorat / HDR",
};

/* ---------- Props ---------- */
type Props = {
  open: boolean;
  onClose: () => void;
  partenaire?: Partenaire | null;
  loading?: boolean;
  onEdit?: (id: number) => void;
};

/* ---------- Component ---------- */
export default function PartenaireDetailModal({
  open,
  onClose,
  partenaire,
  loading = false,
  onEdit,
}: Props) {
  const navigate = useNavigate();
  if (!open) return null;

  if (loading || !partenaire)
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogContent sx={{ textAlign: "center", py: 6 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );

  const prospectionsCount = partenaire.prospections_count ?? partenaire.prospections?.count ?? 0;
  const appairagesCount = partenaire.appairages_count ?? partenaire.appairages?.count ?? 0;
  const partenaireNom = encodeURIComponent(partenaire.nom);
  const prospectionsUrl = `/prospections?partenaire=${partenaire.id}`;
  const appairagesUrl = `/appairages?partenaire=${partenaire.id}`;
  const createProspectionUrl = `/prospections/create?partenaire=${partenaire.id}&partenaire_nom=${partenaireNom}`;
  const createAppairageUrl = `/appairages/create?partenaire=${partenaire.id}&partenaire_nom=${partenaireNom}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      disableEnforceFocus
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pr: 2,
        }}
      >
        <Typography variant="h6" component="span">
          🏢 Détail du partenaire :{" "}
          <Typography component="span" color="primary" fontWeight={600}>
            {partenaire.nom}
          </Typography>
        </Typography>

        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<EditIcon fontSize="small" />}
          onClick={() => onEdit?.(partenaire.id)}
        >
          Modifier
        </Button>
      </DialogTitle>

      <DialogContent dividers>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Grid container spacing={3}>
            {/* ─────────── Identité ─────────── */}
            <Grid item xs={12}>
              <Section title="Identité">
                <Field label="Nom" value={nn(partenaire.nom)} />
                <Field label="Type" value={nn(partenaire.type_display)} />
                <Field label="Secteur d’activité" value={nn(partenaire.secteur_activite)} />
                <Field label="Slug" value={nn(partenaire.slug)} />
                <Field label="Actif" value={yn(partenaire.is_active)} />
              </Section>
            </Grid>

            {/* ─────────── Adresse ─────────── */}
            <Grid item xs={12}>
              <Section title="Adresse">
                <Field label="Numéro" value={nn(partenaire.street_number)} />
                <Field label="Rue" value={nn(partenaire.street_name)} />
                <Field label="Complément" value={nn(partenaire.street_complement)} />
                <Field label="Code postal" value={nn(partenaire.zip_code)} />
                <Field label="Département" value={getDepartementLabel(partenaire.zip_code)} />
                <Field label="Ville" value={nn(partenaire.city)} />
                <Field label="Pays" value={nn(partenaire.country)} />
                <Field label="Adresse complète" value={nn(partenaire.full_address)} />
                <Field label="Adresse renseignée" value={yn(partenaire.has_address)} />
              </Section>
            </Grid>

            {/* ─────────── Coordonnées ─────────── */}
            <Grid item xs={12}>
              <Section title="Coordonnées">
                <Field
                  label="Téléphone"
                  value={
                    partenaire.telephone ? (
                      <Link href={`tel:${partenaire.telephone}`} underline="hover">
                        {partenaire.telephone}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <Field
                  label="Email"
                  value={
                    partenaire.email ? (
                      <Link href={`mailto:${partenaire.email}`} underline="hover">
                        {partenaire.email}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <Field label="Contact renseigné" value={yn(partenaire.has_contact)} />
                <Field label="Contact info" value={nn(partenaire.contact_info)} />
              </Section>
            </Grid>

            {/* ─────────── Centre par défaut ─────────── */}
            <Grid item xs={12}>
              <Section title="Centre par défaut">
                <Field label="Centre ID" value={nn(partenaire.default_centre_id)} />
                <Field label="Centre nom" value={nn(partenaire.default_centre_nom)} />
              </Section>
            </Grid>

            {/* ─────────── Contact principal ─────────── */}
            <Grid item xs={12}>
              <Section title="Contact principal">
                <Field label="Nom" value={nn(partenaire.contact_nom)} />
                <Field label="Poste" value={nn(partenaire.contact_poste)} />
                <Field label="Téléphone" value={nn(partenaire.contact_telephone)} />
                <Field label="Email" value={nn(partenaire.contact_email)} />
              </Section>
            </Grid>

            {/* ─────────── Web ─────────── */}
            <Grid item xs={12}>
              <Section title="Web et réseaux">
                <Field
                  label="Site web"
                  value={
                    partenaire.website ? (
                      <Link href={partenaire.website} target="_blank" rel="noopener">
                        {partenaire.website}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <Field
                  label="Réseau social"
                  value={
                    partenaire.social_network_url ? (
                      <Link href={partenaire.social_network_url} target="_blank" rel="noopener">
                        {partenaire.social_network_url}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <Field label="Web renseigné" value={yn(partenaire.has_web)} />
              </Section>
            </Grid>

            {/* ─────────── Données employeur ─────────── */}
            <Grid item xs={12}>
              <Section title="Données employeur">
                <Field label="SIRET" value={nn(partenaire.siret)} />
                <Field
                  label="Type employeur CERFA"
                  value={nn(
                    partenaire.type_employeur_code
                      ? TYPE_EMPLOYEUR_CODE_LABELS[partenaire.type_employeur_code] ?? partenaire.type_employeur_code
                      : null
                  )}
                />
                <Field
                  label="Employeur spécifique CERFA"
                  value={nn(
                    partenaire.employeur_specifique_code
                      ? EMPLOYEUR_SPECIFIQUE_CODE_LABELS[partenaire.employeur_specifique_code] ??
                          partenaire.employeur_specifique_code
                      : null
                  )}
                />
                <Field label="Code APE" value={nn(partenaire.code_ape)} />
                <Field label="Effectif total" value={nn(partenaire.effectif_total)} />
                <Field label="IDCC" value={nn(partenaire.idcc)} />
                <Field
                  label="Assurance chômage spéciale"
                  value={yn(partenaire.assurance_chomage_speciale)}
                />
              </Section>
            </Grid>

            {/* ─────────── Métadonnées ─────────── */}
            <Grid item xs={12}>
              <Section title="Métadonnées">
                <Field label="Créé le" value={fmt(partenaire.created_at)} />
                <Field label="Mis à jour le" value={fmt(partenaire.updated_at)} />
                <Field label="Créé par" value={partenaire.created_by?.full_name ?? "—"} />
              </Section>
            </Grid>

            <Grid item xs={12}>
              <Section title="Maîtres d’apprentissage">
                <Field label="Maitre 1 - nom" value={nn(partenaire.maitre1_nom_naissance)} />
                <Field label="Maitre 1 - prénom" value={nn(partenaire.maitre1_prenom)} />
                <Field label="Maitre 1 - diplôme" value={nn(partenaire.maitre1_diplome_titre)} />
                <Field
                  label="Maitre 1 - niveau CERFA"
                  value={nn(
                    partenaire.maitre1_niveau_diplome_code
                      ? NIVEAU_DIPLOME_CODE_LABELS[partenaire.maitre1_niveau_diplome_code] ??
                          partenaire.maitre1_niveau_diplome_code
                      : null
                  )}
                />
                <Field label="Maitre 2 - nom" value={nn(partenaire.maitre2_nom_naissance)} />
                <Field label="Maitre 2 - prénom" value={nn(partenaire.maitre2_prenom)} />
                <Field label="Maitre 2 - diplôme" value={nn(partenaire.maitre2_diplome_titre)} />
                <Field
                  label="Maitre 2 - niveau CERFA"
                  value={nn(
                    partenaire.maitre2_niveau_diplome_code
                      ? NIVEAU_DIPLOME_CODE_LABELS[partenaire.maitre2_niveau_diplome_code] ??
                          partenaire.maitre2_niveau_diplome_code
                      : null
                  )}
                />
              </Section>
            </Grid>

            <Grid item xs={12}>
              <Section title="Liens métier">
                <Field
                  label="Prospections"
                  value={
                    <Link href={prospectionsUrl} underline="hover" onClick={(e) => e.stopPropagation()}>
                      {prospectionsCount}
                    </Link>
                  }
                />
                <Field
                  label="Appairages"
                  value={
                    <Link href={appairagesUrl} underline="hover" onClick={(e) => e.stopPropagation()}>
                      {appairagesCount}
                    </Link>
                  }
                />
              </Section>
            </Grid>
          </Grid>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<CampaignIcon />}
            onClick={() => {
              onClose();
              navigate(createProspectionUrl);
            }}
          >
            Créer une prospection
          </Button>
          <Button
            variant="outlined"
            startIcon={<HandshakeIcon />}
            onClick={() => {
              onClose();
              navigate(createAppairageUrl);
            }}
          >
            Créer un appairage
          </Button>
          <Button
            variant="outlined"
            startIcon={<LaunchIcon />}
            onClick={() => {
              onClose();
              navigate(prospectionsUrl);
            }}
          >
            Voir les prospections
          </Button>
          <Button
            variant="outlined"
            startIcon={<LaunchIcon />}
            onClick={() => {
              onClose();
              navigate(appairagesUrl);
            }}
          >
            Voir les appairages
          </Button>
        </Box>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------- Sous-composants ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "primary.main" }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Grid container spacing={1}>
        {children}
      </Grid>
    </Box>
  );
}

function Field({ label, value }: { label: string; value: string | number | React.ReactNode }) {
  const str = typeof value === "number" ? String(value) : value;
  const isMissing = str === null || str === undefined || str === "" || str === "—";

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="body2">
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
