// ======================================================
// src/components/modals/FormationSelectModal.tsx
// Modale de sélection d'une formation
// ======================================================

import { useEffect, useState } from "react";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
} from "@mui/material";
import api from "../../api/axios";
import type { Formation } from "../../types/formation";
import EntityPickerDialog from "../dialogs/EntityPickerDialog";

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
    <EntityPickerDialog
      open={show}
      onClose={onClose}
      title="Sélectionner une formation"
      maxWidth="md"
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "🔍 Rechercher une formation...",
      }}
      showSearchWhenLoading
      loading={loading}
      error={null}
      empty={!loading && formations.length === 0}
      emptyMessage={
        <Typography sx={{ mt: 2, textAlign: "center" }}>Aucune formation trouvée.</Typography>
      }
    >
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
                      📚 <strong>{pick.nom ?? "—"}</strong> — {pick.centre?.nom ?? "—"} · {pick.num_offre ?? "—"}
                      {typeLabel && (
                        <Chip
                          label={typeLabel}
                          size="small"
                          sx={{
                            ml: 1,
                            backgroundColor: pick.type_offre?.couleur ?? "primary.light",
                            color: "primary.dark",
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
      </List>
    </EntityPickerDialog>
  );
}
