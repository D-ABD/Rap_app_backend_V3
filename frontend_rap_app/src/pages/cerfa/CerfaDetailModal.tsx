// src/pages/cerfa/CerfaDetailModal.tsx
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
  Paper,
  Tooltip,
  Alert,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import EditIcon from "@mui/icons-material/Edit";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { toast } from "react-toastify";
import { useCerfaGeneratePdf, useCerfaDownloadPdf, downloadBlob } from "../../hooks/useCerfa";
import type { CerfaContrat } from "../../types/cerfa";

/* ---------- Helpers ---------- */
const dtfFR =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
      })
    : undefined;

const fmt = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dtfFR ? dtfFR.format(d) : d.toLocaleDateString("fr-FR");
};

const nn = (s?: string | number | null) =>
  s === null || s === undefined || s === "" ? "—" : String(s);
const yn = (value?: boolean | null) => (value === null || value === undefined ? "—" : value ? "Oui" : "Non");

/* ---------- Props ---------- */
type Props = {
  open: boolean;
  onClose: () => void;
  contrat?: CerfaContrat | null;
  loading?: boolean;
  onEdit?: (id: number) => void;
};

/* ---------- Component ---------- */
export default function CerfaDetailModal({
  open,
  onClose,
  contrat,
  loading = false,
  onEdit,
}: Props) {
  const { mutateAsync: generatePdf, isPending: isGenerating } = useCerfaGeneratePdf(
    contrat?.id ?? 0
  );
  const { mutateAsync: downloadPdf, isPending: isDownloading } = useCerfaDownloadPdf();

  if (!open) return null;

  if (loading || !contrat)
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogContent sx={{ textAlign: "center", py: 6 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );

  // ✅ Champs essentiels
  const requiredFields: Record<string, any> = {
    "Nom de naissance": contrat.apprenti_nom_naissance,
    Prénom: contrat.apprenti_prenom,
    "Nom employeur": contrat.employeur_nom,
    "SIRET employeur": contrat.employeur_siret,
    "Diplôme visé": contrat.diplome_vise || contrat.diplome_intitule,
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([, v]) => v === null || v === undefined || v === "")
    .map(([label]) => label);

  const hasMissingFields = missingFields.length > 0;

  /* ---------- Action : Génération + Téléchargement automatique ---------- */
  const handleGeneratePdf = async () => {
    if (!contrat) return;
    try {
      toast.info("📄 Génération du PDF en cours...");
      const res = await generatePdf();

      if (res?.pdf_url) {
        toast.success("✅ PDF généré avec succès, téléchargement automatique...");

        // ⬇️ Téléchargement automatique du fichier
        const blob = await downloadPdf(contrat.id);
        downloadBlob(blob, `cerfa_${contrat.id}.pdf`);
      } else {
        toast.warning("PDF généré mais aucune URL détectée.");
      }
    } catch (_err: any) {
      toast.error("❌ Erreur lors de la génération du PDF.");
    }
  };

  /* ---------- Téléchargement manuel ---------- */
  const handleDownloadPdf = async () => {
    if (!contrat) return;
    try {
      toast.info("📥 Téléchargement du PDF...");
      const blob = await downloadPdf(contrat.id);
      downloadBlob(blob, `cerfa_${contrat.id}.pdf`);
    } catch {
      toast.error("❌ Erreur lors du téléchargement du PDF.");
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
          🧾 Contrat CERFA —{" "}
          <Typography component="span" color="primary" fontWeight={600}>
            {contrat.apprenti_prenom} {contrat.apprenti_nom_naissance}
          </Typography>
        </Typography>

        <Box display="flex" gap={1}>
          {/* 🪄 Bouton Générer + téléchargement */}
          <Tooltip title="Générer le PDF CERFA">
            <span>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                startIcon={isGenerating ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
                disabled={isGenerating}
                onClick={handleGeneratePdf}
              >
                {isGenerating ? "Génération..." : "Générer PDF"}
              </Button>
            </span>
          </Tooltip>

          {/* 📥 Bouton Télécharger PDF (manuel) */}
          <Tooltip title="Télécharger le PDF existant">
            <span>
              <Button
                variant="outlined"
                startIcon={isDownloading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
                onClick={handleDownloadPdf}
                disabled={isDownloading}
              >
                Télécharger
              </Button>
            </span>
          </Tooltip>

          {/* ✏️ Modifier */}
          <Tooltip title="Modifier le contrat">
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => onEdit?.(contrat.id)}
            >
              Modifier
            </Button>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {hasMissingFields && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ Champs manquants : <strong>{missingFields.join(", ")}</strong>.
            <br />
            Complétez-les avant de générer le PDF.
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Section title="Apprenti">
                <Field label="Nom de naissance" value={nn(contrat.apprenti_nom_naissance)} />
                <Field label="Nom d'usage" value={nn(contrat.apprenti_nom_usage)} />
                <Field label="Prénom" value={nn(contrat.apprenti_prenom)} />
                <Field label="NIR" value={nn(contrat.apprenti_nir)} />
                <Field label="Email" value={nn(contrat.apprenti_email)} />
                <Field label="Téléphone" value={nn(contrat.apprenti_telephone)} />
                <Field label="Date de naissance" value={fmt(contrat.apprenti_date_naissance)} />
                <Field label="Sexe" value={nn(contrat.apprenti_sexe)} />
                <Field label="Département de naissance" value={nn(contrat.apprenti_departement_naissance)} />
                <Field label="Commune de naissance" value={nn(contrat.apprenti_commune_naissance)} />
                <Field label="Nationalité CERFA" value={nn(contrat.apprenti_nationalite)} />
                <Field label="Régime social CERFA" value={nn(contrat.apprenti_regime_social)} />
                <Field label="Numéro" value={nn(contrat.apprenti_numero)} />
                <Field label="Voie" value={nn(contrat.apprenti_voie)} />
                <Field label="Complément" value={nn(contrat.apprenti_complement)} />
                <Field label="Code postal" value={nn(contrat.apprenti_code_postal)} />
                <Field label="Commune" value={nn(contrat.apprenti_commune)} />
                <Field label="Sportif haut niveau" value={yn(contrat.apprenti_sportif_haut_niveau)} />
                <Field label="RQTH" value={yn(contrat.apprenti_rqth)} />
                <Field label="Droits attachés RQTH" value={yn(contrat.apprenti_droits_rqth)} />
                <Field label="Équivalence jeunes" value={yn(contrat.apprenti_equivalence_jeunes)} />
                <Field label="Extension BOE" value={yn(contrat.apprenti_extension_boe)} />
                <Field label="Situation avant contrat CERFA" value={nn(contrat.apprenti_situation_avant)} />
                <Field label="Dernier diplôme préparé CERFA" value={nn(contrat.apprenti_dernier_diplome_prepare)} />
                <Field label="Dernière année suivie CERFA" value={nn(contrat.apprenti_derniere_annee_suivie)} />
                <Field label="Intitulé dernier diplôme" value={nn(contrat.apprenti_intitule_dernier_diplome)} />
                <Field label="Plus haut diplôme CERFA" value={nn(contrat.apprenti_plus_haut_diplome)} />
                <Field label="Projet création / reprise" value={yn(contrat.apprenti_projet_entreprise)} />
              </Section>
            </Grid>

            <Grid item xs={12}>
              <Section title="Employeur">
                <Field label="Employeur prive" value={yn(contrat.employeur_prive)} />
                <Field label="Employeur public" value={yn(contrat.employeur_public)} />
                <Field label="Nom et prenom ou denomination" value={nn(contrat.employeur_nom)} />
                <Field label="N° SIRET de l'etablissement" value={nn(contrat.employeur_siret)} />
                <Field label="Telephone" value={nn(contrat.employeur_telephone)} />
                <Field label="Courriel" value={nn(contrat.employeur_email)} />
                <Field label="Numero" value={nn(contrat.employeur_adresse_numero)} />
                <Field label="Voie" value={nn(contrat.employeur_adresse_voie)} />
                <Field label="Complement" value={nn(contrat.employeur_adresse_complement)} />
                <Field label="Code postal" value={nn(contrat.employeur_code_postal)} />
                <Field label="Commune" value={nn(contrat.employeur_commune)} />
                <Field label="Type d'employeur CERFA" value={nn(contrat.employeur_type)} />
                <Field label="Employeur specifique CERFA" value={nn(contrat.employeur_specifique)} />
                <Field label="Code APE" value={nn(contrat.employeur_code_ape)} />
                <Field label="Effectif total salaries de l'entreprise" value={nn(contrat.employeur_effectif)} />
                <Field label="Code IDCC de la convention collective applicable" value={nn(contrat.employeur_code_idcc)} />
                <Field
                  label="Regime assurance chomage specifique"
                  value={yn(contrat.employeur_regime_assurance_chomage)}
                />
              </Section>
            </Grid>

            <Grid item xs={12}>
              <Section title="Formation / Diplôme">
                <Field label="Diplôme visé CERFA" value={nn(contrat.diplome_vise)} />
                <Field label="Intitule precis" value={nn(contrat.diplome_intitule)} />
                <Field label="Code diplome" value={nn(contrat.code_diplome)} />
                <Field label="Code RNCP" value={nn(contrat.code_rncp)} />
                <Field label="Date debut formation" value={fmt(contrat.formation_debut)} />
                <Field label="Date debut formation CFA" value={fmt(contrat.formation_debut)} />
                <Field label="Date fin epreuves / examens" value={fmt(contrat.formation_fin)} />
                <Field label="Duree formation (heures)" value={nn(contrat.formation_duree_heures)} />
                <Field label="Heures a distance" value={nn(contrat.formation_distance_heures)} />
              </Section>
            </Grid>

            <Grid item xs={12}>
              <Section title="Contrat">
                <Field label="Type de contrat CERFA" value={nn(contrat.type_contrat)} />
                <Field label="Type de derogation CERFA" value={nn(contrat.type_derogation)} />
                <Field label="Numero contrat precedent" value={nn(contrat.numero_contrat_precedent)} />
                <Field label="Date conclusion" value={fmt(contrat.date_conclusion)} />
                <Field label="Date debut execution" value={fmt(contrat.date_debut_execution)} />
                <Field label="Date fin contrat" value={fmt(contrat.date_fin_contrat)} />
                <Field
                  label="Date debut formation pratique employeur"
                  value={fmt(contrat.date_debut_formation_pratique_employeur)}
                />
                <Field label="Date effet avenant" value={fmt(contrat.date_effet_avenant)} />
                <Field
                  label="Travail sur machines dangereuses"
                  value={yn(contrat.travail_machines_dangereuses)}
                />
                <Field label="Duree hebdo (heures)" value={nn(contrat.duree_hebdo_heures)} />
                <Field label="Duree hebdo (minutes)" value={nn(contrat.duree_hebdo_minutes)} />
                <Field label="Salaire brut mensuel" value={nn(contrat.salaire_brut_mensuel)} />
                <Field label="Caisse retraite" value={nn(contrat.caisse_retraite)} />
                <Field label="Lieu de signature" value={nn(contrat.lieu_signature)} />
              </Section>
            </Grid>

            <Grid item xs={12}>
              <Section title="CFA / lieu de formation">
                <Field label="CFA d'entreprise" value={yn(contrat.cfa_entreprise)} />
                <Field label="Denomination CFA" value={nn(contrat.cfa_denomination)} />
                <Field label="UAI CFA" value={nn(contrat.cfa_uai)} />
                <Field label="SIRET CFA" value={nn(contrat.cfa_siret)} />
                <Field label="Numero CFA" value={nn(contrat.cfa_adresse_numero)} />
                <Field label="Voie CFA" value={nn(contrat.cfa_adresse_voie)} />
                <Field label="Complement CFA" value={nn(contrat.cfa_adresse_complement)} />
                <Field label="Code postal CFA" value={nn(contrat.cfa_code_postal)} />
                <Field label="Commune CFA" value={nn(contrat.cfa_commune)} />
                <Field
                  label="CFA = lieu principal"
                  value={yn(contrat.cfa_est_lieu_formation_principal)}
                />
                <Field label="Lieu principal - denomination" value={nn(contrat.formation_lieu_denomination)} />
                <Field label="Lieu principal - UAI" value={nn(contrat.formation_lieu_uai)} />
                <Field label="Lieu principal - SIRET" value={nn(contrat.formation_lieu_siret)} />
                <Field label="Lieu principal - voie" value={nn(contrat.formation_lieu_voie)} />
                <Field label="Lieu principal - code postal" value={nn(contrat.formation_lieu_code_postal)} />
                <Field label="Lieu principal - commune" value={nn(contrat.formation_lieu_commune)} />
                <Field
                  label="Pieces justificatives necessaires au depot"
                  value={yn(contrat.pieces_justificatives_ok)}
                />
              </Section>
            </Grid>

            <Grid item xs={12}>
              <Section title="Maitres d'apprentissage">
                <Field label="Maitre eligible" value={yn(contrat.maitre_eligible)} />
                <Field label="Maitre 1 - nom" value={nn(contrat.maitre1_nom)} />
                <Field label="Maitre 1 - prenom" value={nn(contrat.maitre1_prenom)} />
                <Field label="Maitre 1 - naissance" value={fmt(contrat.maitre1_date_naissance)} />
                <Field label="Maitre 1 - courriel" value={nn(contrat.maitre1_email)} />
                <Field label="Maitre 1 - emploi" value={nn(contrat.maitre1_emploi)} />
                <Field label="Maitre 1 - diplome" value={nn(contrat.maitre1_diplome)} />
                <Field label="Maitre 1 - niveau CERFA" value={nn(contrat.maitre1_niveau_diplome)} />
                <Field label="Maitre 2 - nom" value={nn(contrat.maitre2_nom)} />
                <Field label="Maitre 2 - prenom" value={nn(contrat.maitre2_prenom)} />
                <Field label="Maitre 2 - naissance" value={fmt(contrat.maitre2_date_naissance)} />
                <Field label="Maitre 2 - courriel" value={nn(contrat.maitre2_email)} />
                <Field label="Maitre 2 - emploi" value={nn(contrat.maitre2_emploi)} />
                <Field label="Maitre 2 - diplome" value={nn(contrat.maitre2_diplome)} />
                <Field label="Maitre 2 - niveau CERFA" value={nn(contrat.maitre2_niveau_diplome)} />
              </Section>
            </Grid>
          </Grid>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
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
          <span style={{ color: "#d32f2f", fontStyle: "italic", fontWeight: 500 }}>
            — Non communiqué
          </span>
        ) : (
          str
        )}
      </Typography>
    </Grid>
  );
}
