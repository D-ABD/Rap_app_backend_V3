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
  Link,
  CircularProgress,
  Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddCommentIcon from "@mui/icons-material/AddComment";
import LaunchIcon from "@mui/icons-material/Launch";
import { useMemo } from "react";
import { useProspection } from "../../hooks/useProspection";
import React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import CommentaireContent from "../commentaires/CommentaireContent";

/* ---------- Helpers ---------- */
const useFormatters = () => {
  const dtfFR = useMemo(
    () =>
      typeof Intl !== "undefined"
        ? new Intl.DateTimeFormat("fr-FR", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : undefined,
    []
  );

  const fmt = (iso?: string | null): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "—"
      : dtfFR
        ? dtfFR.format(d)
        : d.toLocaleDateString("fr-FR");
  };

  const nn = (s?: string | number | null) =>
    s === null || s === undefined || s === "" ? "—" : String(s);

  const yn = (b?: boolean | null) => (typeof b === "boolean" ? (b ? "Oui" : "Non") : "—");

  return { fmt, nn, yn };
};

/* ---------- Props ---------- */
type Props = {
  open: boolean;
  onClose: () => void;
  prospectionId: number | null;
  onEdit?: (id: number) => void;
};

/* ---------- Component ---------- */
export default function ProspectionDetailModal({ open, onClose, prospectionId, onEdit }: Props) {
  const navigate = useNavigate();
  const { fmt, nn, yn } = useFormatters();
  const { data: prospection, loading } = useProspection(prospectionId ?? null);

  if (!open) return null;

  const titleId = "prospection-detail-title";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      disableEnforceFocus
      aria-labelledby={titleId}
    >
      <DialogTitle
        id={titleId}
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography component="div" variant="h6" fontWeight={700}>
          📞 Détail de la prospection
        </Typography>
        <Button onClick={onClose} variant="outlined">
          Fermer
        </Button>
      </DialogTitle>

      <DialogContent dividers aria-busy={loading}>
        {loading || !prospection ? (
          <Box textAlign="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Grid container spacing={3}>
              {/* ───── Centre ───── */}
              <Grid item xs={12}>
                <Section title="Centre">
                  <Field label="Nom du centre" value={nn(prospection.centre_nom)} />
                  <Field label="Identifiant" value={nn(prospection.centre)} />
                </Section>
              </Grid>

              {/* ───── Partenaire ───── */}
              <Grid item xs={12}>
                <Section title="Partenaire">
                  <Field label="Nom" value={nn(prospection.partenaire_nom)} />
                  <Field label="Ville" value={nn(prospection.partenaire_ville)} />
                  <Field
                    label="Ouvrir"
                    value={
                      prospection.partenaire ? (
                        <Link
                          component={RouterLink}
                          to={`/partenaires/${prospection.partenaire}/edit`}
                          underline="hover"
                        >
                          Voir le partenaire
                        </Link>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Field
                    label="Téléphone"
                    value={
                      prospection.partenaire_tel ? (
                        <Link
                          href={`tel:${prospection.partenaire_tel.replace(/[^\d+]/g, "")}`}
                          underline="hover"
                        >
                          {prospection.partenaire_tel}
                        </Link>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Field
                    label="Email"
                    value={
                      prospection.partenaire_email ? (
                        <Link href={`mailto:${prospection.partenaire_email}`} underline="hover">
                          {prospection.partenaire_email}
                        </Link>
                      ) : (
                        "—"
                      )
                    }
                  />
                </Section>
              </Grid>

              {/* ───── Formation ───── */}
              <Grid item xs={12}>
                <Section title="Formation">
                  <Field label="Nom formation" value={nn(prospection.formation_nom)} />
                  <Field
                    label="Ouvrir"
                    value={
                      prospection.formation ? (
                        <Link
                          component={RouterLink}
                          to={`/formations/${prospection.formation}`}
                          underline="hover"
                        >
                          Voir la formation
                        </Link>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Field label="N° offre" value={nn(prospection.num_offre)} />
                  <Field
                    label="Dates"
                    value={`${fmt(prospection.formation_date_debut)} → ${fmt(
                      prospection.formation_date_fin
                    )}`}
                  />
                  <Field label="Type d’offre" value={nn(prospection.type_offre_display)} />
                  <Field
                    label="Statut formation"
                    value={nn(prospection.formation_statut_display)}
                  />
                  <Field
                    label="Places disponibles"
                    value={
                      prospection.places_disponibles != null
                        ? String(prospection.places_disponibles)
                        : "—"
                    }
                  />
                </Section>
              </Grid>

              {/* ───── Candidat / Owner ───── */}
              <Grid item xs={12}>
                <Section title="Candidat / Propriétaire">
                  <Field label="Utilisateur associé" value={nn(prospection.owner_username)} />
                  <Field
                    label="Navigation"
                    value={
                      prospection.owner ? (
                        <Link
                          component={RouterLink}
                          to={`/candidats?owner=${prospection.owner}`}
                          underline="hover"
                        >
                          Voir les candidats liés
                        </Link>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Field label="ID utilisateur" value={nn(prospection.owner)} />
                  <Field label="Actif ?" value={yn(prospection.is_active)} />
                </Section>
              </Grid>

              {/* ───── Prospection ───── */}
              <Grid item xs={12}>
                <Section title="Prospection">
                  <Field
                    label="Type de prospection"
                    value={`${nn(prospection.type_prospection_display)} (${nn(
                      prospection.type_prospection
                    )})`}
                  />
                  <Field
                    label="Motif"
                    value={`${nn(prospection.motif_display)} (${nn(prospection.motif)})`}
                  />
                  <Field
                    label="Objectif"
                    value={`${nn(prospection.objectif_display)} (${nn(prospection.objectif)})`}
                  />
                  <Field
                    label="Statut"
                    value={`${nn(prospection.statut_display)} (${nn(prospection.statut)})`}
                  />
                  <Field
                    label="Activité"
                    value={
                      <Chip
                        size="small"
                        label={prospection.activite_display || "—"}
                        color={
                          prospection.activite === "archivee"
                            ? "default"
                            : prospection.activite === "active"
                              ? "success"
                              : "warning"
                        }
                        sx={{
                          fontWeight: 600,
                          bgcolor:
                            prospection.activite === "archivee" ? "grey.200" : "success.light",
                          textTransform: "capitalize",
                        }}
                      />
                    }
                  />
                  <Field
                    label="Moyen de contact"
                    value={`${nn(prospection.moyen_contact_display)} (${nn(
                      prospection.moyen_contact
                    )})`}
                  />
                  <Field label="Relance prévue" value={fmt(prospection.relance_prevue)} />
                  <Field label="Date prospection" value={fmt(prospection.date_prospection)} />
                  <Field label="Relance nécessaire" value={yn(prospection.relance_necessaire)} />
                  <Field
                    label="Commentaire"
                    value={
                      prospection.commentaire ? (
                        <Box sx={{ minWidth: 0, width: "100%" }}>
                          <CommentaireContent html={prospection.commentaire} />
                        </Box>
                      ) : (
                        "—"
                      )
                    }
                  />
                </Section>
              </Grid>

              {/* ───── Métadonnées ───── */}
              <Grid item xs={12}>
                <Section title="Métadonnées">
                  <Field label="Créé par" value={nn(prospection.created_by)} />
                  <Field label="Créé le" value={fmt(prospection.created_at)} />
                  <Field label="Modifié le" value={fmt(prospection.updated_at)} />
                  <Field label="Activité" value={nn(prospection.activite_display)} />
                </Section>
              </Grid>

              {/* ───── Commentaires ───── */}
              <Grid item xs={12}>
                <Section title="Commentaires">
                  <Field
                    label="Dernier commentaire"
                    value={
                      prospection.last_comment ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontStyle: "italic" }}
                        >
                          “
                          {prospection.last_comment.length > 120
                            ? prospection.last_comment.slice(0, 120) + "…"
                            : prospection.last_comment}
                          ”
                        </Typography>
                      ) : (
                        "— Aucun commentaire"
                      )
                    }
                  />
                  <Field
                    label="Date dernier commentaire"
                    value={fmt(prospection.last_comment_at)}
                  />
                  <Field
                    label="Total commentaires"
                    value={String(prospection.comments_count ?? "—")}
                  />
                </Section>
              </Grid>
            </Grid>
          </Paper>
        )}
      </DialogContent>

      {/* ---------- Actions ---------- */}
      <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
        <Box display="flex" gap={1} flexWrap="wrap">
          {prospection && onEdit && prospection.id != null && (
            <Button
              startIcon={<EditIcon />}
              variant="contained"
              color="primary"
              onClick={() => onEdit(prospection.id)}
            >
              Modifier
            </Button>
          )}
          {prospection && prospection.id != null && (
            <Button
              startIcon={<AddCommentIcon />}
              variant="outlined"
              onClick={() => navigate(`/prospection-commentaires/create/${prospection.id}`)}
            >
              Ajouter un commentaire
            </Button>
          )}
          {prospection && prospection.id != null && (
            <Button
              startIcon={<LaunchIcon />}
              variant="outlined"
              onClick={() => navigate(`/prospection-commentaires?prospection=${prospection.id}`)}
            >
              Voir les commentaires
            </Button>
          )}
        </Box>
        <Button variant="outlined" onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
/* ---------- Sous-composants ---------- */
const Section = React.memo(function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "primary.main" }} gutterBottom>
        {title}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Grid container spacing={1}>
        {children}
      </Grid>
    </Box>
  );
});

const Field = React.memo(function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | React.ReactNode;
}) {
  const isReactElement = typeof value !== "string" && typeof value !== "number";
  const str = typeof value === "number" ? String(value) : value;
  const isMissing =
    str === null ||
    str === undefined ||
    str === "" ||
    str === "—" ||
    (typeof str === "string" && !str.trim());

  return (
    <Grid item xs={12} sm={6} md={4}>
      {isReactElement ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
            {label} :
          </Typography>
          {value}
        </Box>
      ) : (
        <Typography variant="body2">
          <strong>{label} :</strong>{" "}
          {isMissing ? (
            <span style={{ color: "red", fontStyle: "italic", opacity: 0.85 }}>— NC</span>
          ) : (
            str
          )}
        </Typography>
      )}
    </Grid>
  );
});

