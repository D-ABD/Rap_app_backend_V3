// ======================================================
// src/components/modals/FormationSelectModal.tsx
// Modale de sélection d'une formation
// ======================================================

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Box,
  Typography,
  Chip,
} from "@mui/material";
import api from "../../api/axios";
import type { Formation } from "../../types/formation";

/* ---------- Types ---------- */
export type FormationPick = {
  id: number;
  nom: string | null;
  num_offre: string | null;
  centre: { id: number; nom: string } | null;
  type_offre: {
    id: number;
    nom: string | null;
    libelle: string | null;
    couleur: string | null;
  } | null;
  date_debut?: string | null;
  date_fin?: string | null;
};

interface Props {
  show: boolean;
  onClose: () => void;
  onSelect: (pick: FormationPick) => void;
}

/* ---------- Helpers ---------- */
function readStartDate(f: Formation): string | null {
  const obj = f as unknown as Record<string, unknown>;
  const keys = [
    "date_debut",
    "dateDebut",
    "date_rentree",
    "dateRentree",
    "debut",
    "start_date",
    "startDate",
  ] as const;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

function readEndDate(f: Formation): string | null {
  const obj = f as unknown as Record<string, unknown>;
  const keys = ["date_fin", "dateFin", "fin", "end_date", "endDate", "date_fin_prevue"] as const;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

function formatDate(d?: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dt);
}

function toPick(f: Formation): FormationPick {
  const date_debut = readStartDate(f);
  const date_fin = readEndDate(f);
  return {
    id: f.id,
    nom: f.nom ?? null,
    num_offre: f.num_offre ?? null,
    centre: f.centre ? { id: f.centre.id, nom: f.centre.nom } : null,
    type_offre: f.type_offre
      ? {
          id: f.type_offre.id,
          nom: f.type_offre.nom ?? null,
          libelle: f.type_offre.libelle ?? null,
          couleur: f.type_offre.couleur ?? null,
        }
      : null,
    date_debut,
    date_fin,
  };
}

/* ---------- Component ---------- */
export default function FormationSelectModal({ show, onClose, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get("/formations/", {
          params: { texte: search, page_size: 20 },
        });
        const data = (res.data?.data?.results ?? res.data?.results ?? []) as Formation[];
        if (!cancelled) setFormations(data);
      } catch (_err) {
        if (import.meta.env.MODE !== "production") {
          // eslint-disable-next-line no-console
          console.error("Erreur lors du chargement des formations :", _err);
        }
        if (!cancelled) setFormations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => {
      cancelled = true;
    };
  }, [search, show]);

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Sélectionner une formation</DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          type="text"
          placeholder="🔍 Rechercher une formation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          margin="normal"
        />

        {loading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {formations.map((f) => {
              const pick = toPick(f);
              const typeLabel = pick.type_offre?.nom ?? pick.type_offre?.libelle ?? null;
              return (
                <ListItem key={f.id} disablePadding>
                  <ListItemButton onClick={() => onSelect(pick)}>
                    <ListItemText
                      primary={
                        <>
                          📚 <strong>{pick.nom ?? "—"}</strong> — {pick.centre?.nom ?? "—"} ·{" "}
                          {pick.num_offre ?? "—"}
                          {typeLabel && (
                            <Chip
                              label={typeLabel}
                              size="small"
                              sx={{
                                ml: 1,
                                backgroundColor: pick.type_offre?.couleur ?? "#dbeafe",
                                color: "#1e40af",
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </>
                      }
                      secondary={`📅 ${formatDate(pick.date_debut)} → ${formatDate(pick.date_fin)}`}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
            {formations.length === 0 && !loading && (
              <Typography sx={{ mt: 2, textAlign: "center" }}>Aucune formation trouvée.</Typography>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          ❌ Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
