import {
  Box,
  Button,
  Chip,
  DialogTitle,
  Grid,
  Link,
  Paper,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import type { ReactNode } from "react";
import { AtelierTRE, AtelierTREPresence } from "../../types/ateliersTre";
import DetailViewLayout from "../../components/layout/DetailViewLayout";
import DetailSection from "../../components/ui/DetailSection";
import DetailField from "../../components/ui/DetailField";
import LoadingState from "../../components/ui/LoadingState";

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
  return Number.isNaN(d.getTime()) ? "—" : dtfFR ? dtfFR.format(d) : d.toLocaleString("fr-FR");
};

function renderPresenceChip(status: string) {
  const colors: Record<string, "success" | "error" | "warning" | "default"> = {
    present: "success",
    absent: "error",
    excuse: "warning",
    inconnu: "default",
  };
  const labels: Record<string, string> = {
    present: "Présent",
    absent: "Absent",
    excuse: "Excusé",
    inconnu: "Non renseigné",
  };
  const color = colors[status] ?? "default";
  const label = labels[status] ?? status;
  return <Chip size="small" color={color} label={label} variant="outlined" />;
}

/** Affichage aligné sur l’ancien `Field` : texte vide → « — NC » rouge. */
function atelierScalar(value: unknown): ReactNode {
  if (
    value === null ||
    value === undefined ||
    value === "—" ||
    (typeof value === "string" && !value.trim())
  ) {
    return (
      <Typography component="span" color="error" variant="body2" sx={{ fontStyle: "italic", opacity: 0.85 }}>
        — NC
      </Typography>
    );
  }
  return String(value);
}

interface Props {
  open: boolean;
  onClose: () => void;
  atelier?: AtelierTRE | null;
  loading?: boolean;
  onEdit?: (id: number) => void;
}

export default function AtelierTREDetailModal({
  open,
  onClose,
  atelier,
  loading = false,
  onEdit,
}: Props) {
  if (!open) return null;

  return (
    <DetailViewLayout
      open={open}
      onClose={onClose}
      maxWidth="lg"
      scroll="paper"
      disableEnforceFocus
      titleSlot={
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography component="span" variant="h6" fontWeight={700}>
            🧑‍🏫 Détail Atelier TRE
          </Typography>
          <Button onClick={onClose} variant="outlined">
            Fermer
          </Button>
        </DialogTitle>
      }
      actions={
        <>
          {atelier && onEdit && atelier.id != null ? (
            <Button startIcon={<EditIcon />} color="primary" variant="contained" onClick={() => onEdit(atelier.id)}>
              Modifier
            </Button>
          ) : (
            <span />
          )}
          <Button variant="outlined" onClick={onClose}>
            Fermer
          </Button>
        </>
      }
      actionsSx={{ justifyContent: "space-between", px: 3, py: 2 }}
    >
      {loading || !atelier ? (
        <LoadingState label="Chargement de l'atelier..." minHeight={200} />
      ) : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <DetailSection title="Informations générales">
                <DetailField label="Type d'atelier" value={atelierScalar(atelier.type_atelier_display)} />
                <DetailField label="Date de l'atelier" value={fmt(atelier.date_atelier)} />
                <DetailField
                  label="Centre"
                  value={
                    atelier.centre_detail?.label ? (
                      <Link component={RouterLink} to="/centres" underline="hover">
                        {atelier.centre_detail.label}
                      </Link>
                    ) : (
                      atelierScalar(atelier.centre)
                    )
                  }
                />
                <DetailField label="Nombre d'inscrits" value={atelierScalar(atelier.nb_inscrits)} />
              </DetailSection>
            </Grid>

            <Grid item xs={12}>
              <DetailSection title="Présences" withGrid={false}>
                {atelier.presences && atelier.presences.length > 0 ? (
                  <>
                    {atelier.presence_counts ? (
                      <Typography
                        variant="body2"
                        sx={{
                          mb: 1,
                          fontWeight: 500,
                          color: "text.secondary",
                        }}
                      >
                        👥 {atelier.presences.length} présences enregistrées :{" "}
                        <strong>{atelier.presence_counts.present}</strong> présents,{" "}
                        <strong>{atelier.presence_counts.absent}</strong> absents,{" "}
                        <strong>{atelier.presence_counts.excuse}</strong> excusés,{" "}
                        <strong>{atelier.presence_counts.inconnu}</strong> non renseignés
                      </Typography>
                    ) : null}

                    <Grid container spacing={1}>
                      {atelier.presences.map((p: AtelierTREPresence) => (
                        <Grid item xs={12} sm={6} md={4} key={p.id}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <Link
                              component={RouterLink}
                              to={`/candidats/${p.candidat.id}`}
                              underline="hover"
                              sx={{ fontWeight: 500, fontSize: "0.875rem" }}
                            >
                              {p.candidat.nom}
                            </Link>
                            {renderPresenceChip(p.statut)}
                            {p.commentaire ? (
                              <Typography variant="body2" component="em" sx={{ opacity: 0.7 }}>
                                ({p.commentaire})
                              </Typography>
                            ) : null}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </>
                ) : (
                  <Typography variant="body2" color="error">
                    Aucune présence enregistrée (NC)
                  </Typography>
                )}
              </DetailSection>
            </Grid>

            <Grid item xs={12}>
              <DetailSection title="Candidats associés" withGrid={false}>
                {atelier.candidats_detail?.length ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {atelier.candidats_detail.map((c) => (
                      <Link
                        key={c.id}
                        component={RouterLink}
                        to={`/candidats/${c.id}`}
                        underline="hover"
                        sx={{ fontSize: "0.95rem" }}
                      >
                        {c.nom}
                      </Link>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="error">
                    Aucun candidat (NC)
                  </Typography>
                )}
              </DetailSection>
            </Grid>

            <Grid item xs={12}>
              <DetailSection title="Statistiques de présence">
                {atelier.presence_counts ? (
                  <>
                    <DetailField label="Présents" value={String(atelier.presence_counts.present)} />
                    <DetailField label="Absents" value={String(atelier.presence_counts.absent)} />
                    <DetailField label="Excusés" value={String(atelier.presence_counts.excuse)} />
                    <DetailField label="Non renseignés" value={String(atelier.presence_counts.inconnu)} />
                    <DetailField
                      label="Nombre de présents"
                      fullWidth
                      value={`${atelier.presence_counts.present} / ${atelier.nb_inscrits} (${(
                        (atelier.presence_counts.present / (atelier.nb_inscrits || 1)) *
                        100
                      ).toFixed(1)}%)`}
                    />
                  </>
                ) : (
                  <Typography variant="body2" color="error">
                    Aucune donnée (NC)
                  </Typography>
                )}
              </DetailSection>
            </Grid>

            <Grid item xs={12}>
              <DetailSection title="Métadonnées">
                <DetailField label="Créé le" value={fmt(atelier.created_at)} />
                <DetailField label="Mis à jour le" value={fmt(atelier.updated_at)} />
                <DetailField label="Actif ?" value={atelier.is_active ? "Oui" : "Non"} />
              </DetailSection>
            </Grid>
          </Grid>
        </Paper>
      )}
    </DetailViewLayout>
  );
}
