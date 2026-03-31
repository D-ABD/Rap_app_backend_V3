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
import { nsfSpecialiteLabel } from "../../constants/nsfOptions";

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
const contractTypeLabel = (code?: string | null, label?: string | null) => {
  const codeText = code?.trim();
  const labelText = label?.trim();
  if (
    labelText &&
    ["apprentissage", "contrat apprentissage", "professionnalisation", "contrat de professionnalisation"].includes(
      labelText.toLowerCase()
    )
  ) {
    return codeText || "—";
  }
  if (codeText && labelText) {
    return labelText.startsWith(`${codeText} - `) ? labelText : `${codeText} - ${labelText}`;
  }
  return codeText || labelText || "—";
};
const cerfaTypeLabel = (value?: "apprentissage" | "professionnalisation" | string | null) => {
  if (value === "professionnalisation") return "Contrat de professionnalisation";
  if (value === "apprentissage") return "Contrat apprentissage";
  return "—";
};
const cerfaFileName = (contrat?: CerfaContrat | null) => {
  const prefix =
    contrat?.cerfa_type === "professionnalisation" ? "cerfa_pro" : "cerfa_apprent";
  const slugify = (value?: string | null) =>
    (value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "inconnu";

  return `${prefix}_${slugify(contrat?.apprenti_nom_naissance)}_${slugify(
    contrat?.apprenti_prenom
  )}.pdf`;
};

/* ---------- Props ---------- */
type Props = {
  open: boolean;
  onClose: () => void;
  contrat?: CerfaContrat | null;
  loading?: boolean;
  onEdit?: (id: number) => void;
  canWrite?: boolean;
};

/* ---------- Component ---------- */
export default function CerfaDetailModal({
  open,
  onClose,
  contrat,
  loading = false,
  onEdit,
  canWrite = true,
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

  const isProfessionnalisation = contrat.cerfa_type === "professionnalisation";

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
        downloadBlob(blob, cerfaFileName(contrat));
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
      downloadBlob(blob, cerfaFileName(contrat));
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
          {canWrite && (
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
          )}

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
          {canWrite && (
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
          )}
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
              <Section title="Type de CERFA">
                <Field label="Nature du contrat" value={cerfaTypeLabel(contrat.cerfa_type)} />
              </Section>
            </Grid>

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
                <Field label="Inscrit France Travail" value={yn(contrat.apprenti_inscrit_france_travail)} />
                <Field label="Numero France Travail" value={nn(contrat.apprenti_france_travail_numero)} />
                <Field
                  label="Duree France Travail (mois)"
                  value={nn(contrat.apprenti_france_travail_duree_mois)}
                />
                <Field label="Type minimum social" value={nn(contrat.apprenti_minimum_social_type)} />
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
                <Field label="N° URSSAF particulier-employeur" value={nn(contrat.employeur_urssaf_particulier)} />
                <Field
                  label="Organisme de prevoyance"
                  value={nn(contrat.employeur_organisme_prevoyance)}
                />
                <Field label="Numero du projet" value={nn(contrat.employeur_numero_projet)} />
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
                <Field
                  label="Code NSF specialite de formation"
                  value={nsfSpecialiteLabel(contrat.specialite_formation)}
                />
                <Field label="Date debut formation" value={fmt(contrat.formation_debut)} />
                <Field label="Date fin epreuves / examens" value={fmt(contrat.formation_fin)} />
                <Field label="Duree totale formation (heures)" value={nn(contrat.formation_duree_heures)} />
                <Field label="Heures a distance" value={nn(contrat.formation_distance_heures)} />
                {isProfessionnalisation && (
                  <>
                    <Field
                      label="Type qualification visee"
                      value={qualificationLabel(contrat.type_qualification_visee)}
                    />
                    <Field
                      label="Declaration d'activite organisme"
                      value={nn(contrat.organisme_declaration_activite)}
                    />
                    <Field
                      label="Nombre d'organismes"
                      value={nn(contrat.nombre_organismes_formation)}
                    />
                    <Field
                      label="Organisation de la formation"
                      value={nn(contrat.organisation_formation)}
                    />
                    <Field
                      label="Heures d'enseignements (CERFA pro)"
                      value={nn(contrat.formation_heures_enseignements)}
                    />
                    <Field label="Date debut formation CFA" value={fmt(contrat.formation_debut)} />
                  </>
                )}
              </Section>
            </Grid>

            <Grid item xs={12}>
              <Section title="Contrat">
                <Field
                  label="Type de contrat CERFA"
                  value={contractTypeLabel(contrat.type_contrat_code, contrat.type_contrat)}
                />
                {isProfessionnalisation && (
                  <Field label="Nature du contrat" value={nn(contrat.nature_contrat)} />
                )}
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
                <Field
                  label="Avantage nourriture (EUR / repas)"
                  value={nn(contrat.avantage_nourriture)}
                />
                <Field
                  label="Avantage logement (EUR / mois)"
                  value={nn(contrat.avantage_logement)}
                />
                <Field label="Autre avantage en nature" value={nn(contrat.avantage_autre)} />
                {!isProfessionnalisation && (
                  <>
                    <Field
                      label="1ere annee - periode 1"
                      value={`${fmt(contrat.remu_annee1_periode1_debut)} -> ${fmt(contrat.remu_annee1_periode1_fin)} / ${nn(contrat.remu_annee1_periode1_pourcentage)}% du ${nn(contrat.remu_annee1_periode1_reference)}`}
                    />
                    <Field
                      label="1ere annee - periode 2"
                      value={`${fmt(contrat.remu_annee1_periode2_debut)} -> ${fmt(contrat.remu_annee1_periode2_fin)} / ${nn(contrat.remu_annee1_periode2_pourcentage)}% du ${nn(contrat.remu_annee1_periode2_reference)}`}
                    />
                    <Field
                      label="2eme annee - periode 1"
                      value={`${fmt(contrat.remu_annee2_periode1_debut)} -> ${fmt(contrat.remu_annee2_periode1_fin)} / ${nn(contrat.remu_annee2_periode1_pourcentage)}% du ${nn(contrat.remu_annee2_periode1_reference)}`}
                    />
                    <Field
                      label="2eme annee - periode 2"
                      value={`${fmt(contrat.remu_annee2_periode2_debut)} -> ${fmt(contrat.remu_annee2_periode2_fin)} / ${nn(contrat.remu_annee2_periode2_pourcentage)}% du ${nn(contrat.remu_annee2_periode2_reference)}`}
                    />
                  </>
                )}
                <Field label="Caisse retraite" value={nn(contrat.caisse_retraite)} />
                <Field label="Lieu de signature" value={nn(contrat.lieu_signature)} />
                {isProfessionnalisation ? (
                  <>
                    <Field label="Numero contrat precedent" value={nn(contrat.numero_contrat_precedent)} />
                    <Field
                      label="Emploi occupe pendant le contrat"
                      value={nn(contrat.emploi_occupe_pendant_contrat)}
                    />
                    <Field label="Classification emploi" value={nn(contrat.classification_emploi)} />
                    <Field label="Niveau classification" value={nn(contrat.classification_niveau)} />
                    <Field
                      label="Coefficient hierarchique"
                      value={nn(contrat.coefficient_hierarchique)}
                    />
                    <Field
                      label="Periode d'essai (jours)"
                      value={nn(contrat.duree_periode_essai_jours)}
                    />
                    <Field label="Nom OPCO" value={nn(contrat.opco_nom)} />
                    <Field label="Numero adherent OPCO" value={nn(contrat.opco_adherent_numero)} />
                  </>
                ) : (
                  <>
                    <Field label="Type de derogation CERFA" value={nn(contrat.type_derogation)} />
                    <Field label="Numero contrat precedent" value={nn(contrat.numero_contrat_precedent)} />
                  </>
                )}
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
