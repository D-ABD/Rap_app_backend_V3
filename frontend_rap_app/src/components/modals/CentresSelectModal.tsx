// src/components/modals/CentresSelectModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import api from "../../api/axios";
import EntityPickerDialog from "../dialogs/EntityPickerDialog";

type CentreLite = { id: number; label: string };

type RawCentre = {
  id: number;
  nom?: string | null;
  label?: string | null;
  departement?: string | null;
  code_postal?: string | null;
};

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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractResults(payload: unknown): RawCentre[] {
  if (Array.isArray(payload)) return payload as RawCentre[];
  if (!isRecord(payload)) return [];

  if (Array.isArray(payload.results)) return payload.results as RawCentre[];

  if (isRecord(payload.data)) {
    const inner = payload.data;
    if (Array.isArray(inner.results)) return inner.results as RawCentre[];
    if (Array.isArray(inner.data)) return inner.data as RawCentre[];
  }

  if (Array.isArray(payload.data)) return payload.data as RawCentre[];
  return [];
}

function toCentreLite(c: RawCentre): CentreLite {
  const base = c.label ?? c.nom ?? `#${c.id}`;
  const suffix = c.departement ? ` (${c.departement})` : "";
  return {
    id: c.id,
    label: `${base}${suffix}`,
  };
}

export default function CentresSelectModal({ show, onClose, onSelect }: Props) {
  const [items, setItems] = useState<CentreLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const dq = useDebounce(q, 250);

  useEffect(() => {
    if (!show) return;

    let cancelled = false;

    const fetchCentres = async () => {
      setLoading(true);
      setErr(null);

      try {
        try {
          const r = await api.get("/centres/liste-simple/", {
            params: { search: dq || undefined, page_size: 200 },
          });
          const results = extractResults(r.data);
          if (!cancelled) setItems(results.map(toCentreLite));
        } catch {
          const r = await api.get("/centres/", {
            params: {
              search: dq || undefined,
              ordering: "nom",
              page_size: 200,
            },
          });
          const results = extractResults(r.data);
          if (!cancelled) setItems(results.map(toCentreLite));
        }
      } catch {
        if (!cancelled) {
          setErr("Erreur lors du chargement des centres.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchCentres();

    return () => {
      cancelled = true;
    };
  }, [show, dq]);

  const filtered = useMemo(() => {
    const s = dq.toLowerCase();
    if (!s) return items;
    return items.filter((c) => c.label.toLowerCase().includes(s));
  }, [items, dq]);

  return (
    <EntityPickerDialog
      open={show}
      onClose={onClose}
      title="Sélectionner un centre"
      search={{
        value: q,
        onChange: setQ,
        placeholder: "Rechercher un centre…",
      }}
      showSearchWhenLoading={false}
      loading={loading}
      error={err}
      empty={!loading && !err && filtered.length === 0}
      emptyMessage="Aucun centre trouvé."
    >
      <List disablePadding>
        {filtered.map((c, index) => (
          <React.Fragment key={c.id}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  onSelect(c);
                  onClose();
                }}
                sx={{
                  alignItems: "flex-start",
                  py: 1.25,
                  px: 0.5,
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {c.label}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      ID centre: #{c.id}
                    </Typography>
                  }
                  primaryTypographyProps={{ component: "div" }}
                  secondaryTypographyProps={{ component: "div" }}
                />
              </ListItemButton>
            </ListItem>

            {index < filtered.length - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>
    </EntityPickerDialog>
  );
}