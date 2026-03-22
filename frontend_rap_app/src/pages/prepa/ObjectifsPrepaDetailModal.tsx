// -----------------------------------------------------------------------------
// 🎯 Modal Détail Objectif Prépa — Centre + Département
// -----------------------------------------------------------------------------
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useObjectifsPrepa } from "src/hooks/usePrepaObjectifs";
import type { ObjectifPrepa } from "src/types/prepa";

// ─────────────────────────────────────────────
// 📌 Props
// ─────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  centreId?: number | null;
}

// ─────────────────────────────────────────────
// 📘 Component principal
// ─────────────────────────────────────────────
export default function ObjectifsPrepaDetailModal({ open, onClose, centreId }: Props) {
  const { data: paginated, isLoading, isError } = useObjectifsPrepa();
  const [objectif, setObjectif] = useState<ObjectifPrepa | null>(null);
  const navigate = useNavigate();

  // ✅ Mémorisation pour éviter le warning ESLint
  const objectifs = useMemo(() => paginated?.results ?? [], [paginated]);

  // 📍 Sélection du centre
  useEffect(() => {
    if (centreId && objectifs.length > 0) {
      const found = objectifs.find((d: ObjectifPrepa) => d.centre?.id === centreId) ?? null;
      setObjectif(found);
    } else {
      setObjectif(null);
    }
  }, [centreId, objectifs]);

  // 📊 Cumul du département
  const departementStats = useMemo(() => {
    if (!objectif?.departement) return null;

    const duDepartement = objectifs.filter(
      (d: ObjectifPrepa) => d.departement === objectif.departement
    );

    const totalObjectif = duDepartement.reduce(
      (sum: number, o: ObjectifPrepa) => sum + (o.valeur_objectif ?? 0),
      0
    );
    const totalRealisation = duDepartement.reduce(
      (sum: number, o: ObjectifPrepa) => sum + (o.data_prepa?.adhesions ?? 0),
      0
    );
    const totalReste = duDepartement.reduce(
      (sum: number, o: ObjectifPrepa) => sum + (o.reste_a_faire ?? 0),
      0
    );

    const tauxAtteinte = totalObjectif > 0 ? (totalRealisation / totalObjectif) * 100 : null;

    return {
      departement: objectif.departement,
      nbCentres: duDepartement.length,
      totalObjectif,
      totalRealisation,
      totalReste,
      tauxAtteinte,
    };
  }, [objectif, objectifs]);

  const fmtTaux = (val?: number | null) => (val != null ? `${val.toFixed(1)} %` : "—");

  if (!open) return null;

  // 🌀 Loading
  if (isLoading) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogContent sx={{ textAlign: "center", py: 5 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Chargement des données…
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  // ⚠️ Erreur
  if (isError || !objectif) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogContent>
          <Typography color="error">
            Erreur lors du chargement des informations du centre.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Fermer</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ─────────────────────────────────────────────
  // 🎯 Données Centre + Département
  // ─────────────────────────────────────────────
  const centreFields = [
    { label: "Année", value: objectif.annee },
    { label: "Centre", value: objectif.centre?.nom ?? "—" },
    { label: "Département", value: objectif.departement ?? "—" },
    { label: "Objectif annuel", value: objectif.valeur_objectif },
    {
      label: "Réalisation (adhésions)",
      value: objectif.data_prepa?.adhesions ?? 0,
    },
    { label: "Taux d’atteinte", value: fmtTaux(objectif.taux_atteinte) },
    { label: "Reste à faire", value: objectif.reste_a_faire ?? "—" },
    { label: "Taux de prescription", value: fmtTaux(objectif.taux_prescription) },
    { label: "Taux de présence", value: fmtTaux(objectif.taux_presence) },
    { label: "Taux d’adhésion", value: fmtTaux(objectif.taux_adhesion) },
  ];

  const departementFields = departementStats
    ? [
        { label: "Département", value: departementStats.departement },
        { label: "Centres inclus", value: departementStats.nbCentres },
        { label: "Objectif cumulé", value: departementStats.totalObjectif },
        { label: "Réalisation cumulée", value: departementStats.totalRealisation },
        {
          label: "Taux d’atteinte global",
          value: fmtTaux(departementStats.tauxAtteinte),
        },
        { label: "Reste à faire total", value: departementStats.totalReste },
      ]
    : [];

  // 🧭 Handler bouton Modifier
  const handleEdit = () => {
    if (objectif?.id) {
      onClose();
      navigate(`/prepa/objectifs/${objectif.id}/edit`);
    }
  };

  // ─────────────────────────────────────────────
  // 🧱 Rendu principal
  // ─────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
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
        <Typography component="div" variant="subtitle1" fontWeight={700}>
          🎯 Détail des objectifs — {objectif.centre?.nom ?? "Centre inconnu"}
        </Typography>
        <Button startIcon={<EditIcon />} color="primary" variant="contained" onClick={handleEdit}>
          Modifier
        </Button>
      </DialogTitle>

      {/* ────── Contenu ────── */}
      <DialogContent dividers>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Grid container spacing={4}>
            {/* Colonne Centre */}
            <Grid item xs={12} md={6}>
              <Section title="📍 Objectifs du centre">
                {centreFields.map((f, i) => (
                  <Field key={i} label={f.label} value={f.value} />
                ))}
              </Section>
            </Grid>

            {/* Colonne Département */}
            <Grid item xs={12} md={6}>
              <Section title="🏙️ Cumul départemental">
                {departementStats ? (
                  departementFields.map((f, i) => <Field key={i} label={f.label} value={f.value} />)
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Aucun autre centre dans ce département.
                  </Typography>
                )}
              </Section>
            </Grid>
          </Grid>

          {/* Commentaire */}
          {objectif.commentaire && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Commentaire
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {objectif.commentaire}
              </Typography>
            </Box>
          )}
        </Paper>
      </DialogContent>

      {/* ────── Actions ────── */}
      <DialogActions sx={{ justifyContent: "flex-end", px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// 🔹 Sous-composants réutilisables
// ─────────────────────────────────────────────
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

function Field({ label, value }: { label: string; value?: string | number | null }) {
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
