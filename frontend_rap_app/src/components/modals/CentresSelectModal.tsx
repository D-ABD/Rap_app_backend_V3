// src/components/modals/CentresSelectModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { List, ListItem, ListItemButton, ListItemText } from "@mui/material";
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
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        try {
          const r = await api.get("/centres/liste-simple/", {
            params: { search: dq || undefined, page_size: 200 },
          });
          const results = extractResults(r.data);
          setItems(results.map(toCentreLite));
        } catch {
          const r = await api.get("/centres/", {
            params: {
              search: dq || undefined,
              ordering: "nom",
              page_size: 200,
            },
          });
          const results = extractResults(r.data);
          setItems(results.map(toCentreLite));
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
    <EntityPickerDialog
      open={show}
      onClose={onClose}
      title="🏫 Sélectionner un centre"
      search={{
        value: q,
        onChange: setQ,
        placeholder: "🔍 Rechercher un centre…",
      }}
      showSearchWhenLoading={false}
      loading={loading}
      error={err}
      empty={!loading && !err && filtered.length === 0}
      emptyMessage="Aucun centre trouvé."
    >
      <List>
        {filtered.map((c) => (
          <ListItem key={c.id} disablePadding>
            <ListItemButton onClick={() => onSelect(c)}>
              <ListItemText primary={c.label} secondary={`#${c.id}`} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </EntityPickerDialog>
  );
}
