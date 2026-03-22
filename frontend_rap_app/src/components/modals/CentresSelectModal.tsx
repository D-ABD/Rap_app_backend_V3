// src/components/modals/CentresSelectModal.tsx
import React, { useEffect, useMemo, useState } from "react";
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
} from "@mui/material";
import api from "../../api/axios";

type CentreLite = { id: number; label: string };

type Props = {
  show: boolean;
  onClose: () => void;
  onSelect: (centre: CentreLite) => void;
};

function useDebounce<T>(v: T, ms = 300) {
  const [val, setVal] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setVal(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return val;
}

export default function CentresSelectModal({ show, onClose, onSelect }: Props) {
  const [items, setItems] = useState<CentreLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const dq = useDebounce(q, 250);

  useEffect(() => {
    if (!show) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        try {
          // endpoint « liste simple »
          const r = await api.get("/centres/liste-simple/", {
            params: { search: dq || undefined, page_size: 200 },
          });
          const payload = r.data;
          const results = Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload)
              ? payload
              : [];
          setItems(
            results.map((c: { id: number; nom?: string; label?: string }) => ({
              id: c.id,
              label: c.label ?? c.nom ?? `#${c.id}`,
            }))
          );
        } catch {
          // fallback DRF standard
          const r = await api.get("/centres/", {
            params: {
              search: dq || undefined,
              ordering: "nom",
              page_size: 200,
            },
          });
          const payload = r.data;
          const results = Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload)
              ? payload
              : [];
          setItems(
            results.map((c: { id: number; nom?: string; label?: string }) => ({
              id: c.id,
              label: c.label ?? c.nom ?? `#${c.id}`,
            }))
          );
        }
      } catch {
        setErr("Erreur lors du chargement des centres.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [show, dq]);

  const filtered = useMemo(() => {
    const s = dq.toLowerCase();
    if (!s) return items;
    return items.filter((c) => c.label.toLowerCase().includes(s));
  }, [items, dq]);

  return (
    <Dialog open={show} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>🏫 Sélectionner un centre</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress />
          </Box>
        ) : err ? (
          <Typography color="error">❌ {err}</Typography>
        ) : (
          <>
            <TextField
              fullWidth
              placeholder="🔍 Rechercher un centre…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              margin="normal"
            />
            {filtered.length === 0 ? (
              <Typography>Aucun centre.</Typography>
            ) : (
              <List>
                {filtered.map((c) => (
                  <ListItem key={c.id} disablePadding>
                    <ListItemButton onClick={() => onSelect(c)}>
                      <ListItemText primary={c.label} secondary={`#${c.id}`} />
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
