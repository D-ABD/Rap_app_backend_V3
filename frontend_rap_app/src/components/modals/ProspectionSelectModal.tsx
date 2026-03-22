// src/components/modals/ProspectionSelectModal.tsx
import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Typography,
  Button,
  Box,
} from "@mui/material";
import api from "../../api/axios";

interface Props {
  show: boolean;
  onClose: () => void;
  onSelect: (prospection: ProspectionLite) => void;
}

export interface ProspectionLite {
  id: number;
  partenaire_nom?: string;
  formation_nom?: string;
  statut_display?: string;
  owner_username?: string;
  date_prospection?: string;
}

export default function ProspectionSelectModal({ show, onClose, onSelect }: Props) {
  const [items, setItems] = useState<ProspectionLite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    api
      .get("/prospections/", {
        params: { page_size: 100, ordering: "-date_prospection" },
      })
      .then((res) => {
        const results = res?.data?.data?.results ?? res?.data?.results ?? [];
        if (Array.isArray(results)) {
          const mapped: ProspectionLite[] = results
            .map((r: unknown) => {
              const obj = r as Record<string, unknown>;
              return {
                id: Number(obj.id),
                partenaire_nom:
                  typeof obj.partenaire_nom === "string" ? obj.partenaire_nom : undefined,
                formation_nom:
                  typeof obj.formation_nom === "string" ? obj.formation_nom : undefined,
                statut_display:
                  typeof obj.statut_display === "string" ? obj.statut_display : undefined,
                owner_username:
                  typeof obj.owner_username === "string" ? obj.owner_username : undefined,
                date_prospection:
                  typeof obj.date_prospection === "string" ? obj.date_prospection : undefined,
              };
            })
            .filter((x) => Number.isFinite(x.id));
          setItems(mapped);
          setError(false);
        } else {
          setItems([]);
          setError(false);
        }
      })
      .catch(() => {
        setError(true);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [show]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((p) => {
      const parts = [
        p.partenaire_nom ?? "",
        p.formation_nom ?? "",
        p.statut_display ?? "",
        p.owner_username ?? "",
        String(p.id),
      ].map((s) => s.toLowerCase());
      return parts.some((s) => s.includes(q));
    });
  }, [items, search]);

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>🔎 Sélectionner une prospection</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">❌ Erreur lors du chargement des prospections.</Typography>
        ) : (
          <>
            <TextField
              fullWidth
              placeholder="Rechercher par partenaire, formation, statut, owner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              margin="normal"
            />
            {filtered.length === 0 ? (
              <Typography>Aucune prospection trouvée.</Typography>
            ) : (
              <List>
                {filtered.map((p) => (
                  <ListItem key={p.id} divider disablePadding>
                    <ListItemButton onClick={() => onSelect(p)}>
                      <ListItemText
                        primary={`#${p.id} ${
                          p.partenaire_nom ? `• ${p.partenaire_nom}` : ""
                        } ${p.formation_nom ? `• ${p.formation_nom}` : ""}`}
                        secondary={`${p.statut_display ?? ""} ${
                          p.owner_username ? `• ${p.owner_username}` : ""
                        } ${
                          p.date_prospection
                            ? `• ${new Date(p.date_prospection).toLocaleDateString()}`
                            : ""
                        }`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </>
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
