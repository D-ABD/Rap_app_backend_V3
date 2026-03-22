// src/components/filters/DocumentsFiltresPanel.tsx
import React, { useMemo, useCallback } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import { FiltresValues } from "../../types/Filtres";

// 🔧 Supprime les doublons par ID ou value
function uniqueById<T extends { id?: number; value?: string | number }>(arr: T[] = []): T[] {
  const seen = new Set<string | number>();
  return arr.filter((item) => {
    const key = item.id ?? item.value;
    if (key == null) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface DocumentsFiltresPanelProps {
  filtres: {
    centres: { id: number; nom: string }[];
    statuts: { id: number; nom: string }[];
    type_offres: { id: number; nom: string }[];
    formations?: {
      id: number;
      nom: string;
      num_offre?: string | null;
      type_offre_nom?: string | null;
      type_offre_libelle?: string | null;
    }[];
    formation_etats?: { value: string; label: string }[];
  };
  values: FiltresValues;
  onChange: (values: FiltresValues) => void;
}

export default function DocumentsFiltresPanel({
  filtres,
  values,
  onChange,
}: DocumentsFiltresPanelProps) {
  const centres = useMemo(() => uniqueById(filtres.centres), [filtres.centres]);
  const statuts = useMemo(() => uniqueById(filtres.statuts), [filtres.statuts]);
  const types = useMemo(() => uniqueById(filtres.type_offres), [filtres.type_offres]);
  const formationEtats = useMemo(
    () => uniqueById(filtres.formation_etats ?? []),
    [filtres.formation_etats]
  );
  const formations = useMemo(() => uniqueById(filtres.formations ?? []), [filtres.formations]);

  const handleChange = useCallback(
    (e: SelectChangeEvent<string | number>) => {
      const { name, value } = e.target;
      const parsed = value === "" ? undefined : Number.isNaN(Number(value)) ? value : Number(value);
      const key = name as keyof FiltresValues;
      onChange({ ...values, [key]: parsed } as FiltresValues);
    },
    [onChange, values]
  );

  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        mb: 2,
      }}
    >
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {/* ✅ Centre */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="filtres-centre-label">Centre</InputLabel>
          <Select
            labelId="filtres-centre-label"
            name="centre_id"
            value={(values.centre_id as string | number | undefined) ?? ""}
            label="Centre"
            onChange={handleChange}
          >
            <MenuItem value="">— Tous les centres —</MenuItem>
            {centres.map((c) => (
              <MenuItem key={`centre-${c.id}`} value={c.id}>
                {c.nom}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* ✅ Statut */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="filtres-statut-label">Statut</InputLabel>
          <Select
            labelId="filtres-statut-label"
            name="statut_id"
            value={(values.statut_id as string | number | undefined) ?? ""}
            label="Statut"
            onChange={handleChange}
          >
            <MenuItem value="">— Tous les statuts —</MenuItem>
            {statuts.map((s) => (
              <MenuItem key={`statut-${s.id}`} value={s.id}>
                {s.nom}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* ✅ Type d’offre */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="filtres-type-label">Type d’offre</InputLabel>
          <Select
            labelId="filtres-type-label"
            name="type_offre_id"
            value={(values.type_offre_id as string | number | undefined) ?? ""}
            label="Type d’offre"
            onChange={handleChange}
          >
            <MenuItem value="">— Tous les types —</MenuItem>
            {types.map((t) => (
              <MenuItem key={`type-${t.id}`} value={t.id}>
                {t.nom}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* ✅ Formation */}
        {formations.length > 0 && (
          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel id="filtres-formation-label">Formation</InputLabel>
            <Select
              labelId="filtres-formation-label"
              name="formation_id"
              value={(values.formation_id as string | number | undefined) ?? ""}
              label="Formation"
              onChange={handleChange}
              renderValue={(selected) => {
                const f = formations.find((f) => f.id === selected);
                if (!f) return "— Toutes les formations —";
                return `${f.nom ?? "—"} (${f.num_offre ?? "–"})`;
              }}
            >
              <MenuItem value="">— Toutes les formations —</MenuItem>
              {formations.map((f) => (
                <MenuItem key={`formation-${f.id}`} value={f.id}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      📚 {f.nom ?? "—"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {f.type_offre_libelle ?? f.type_offre_nom ?? "—"} · N° {f.num_offre ?? "—"}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* ✅ État formation (optionnel) */}
        {formationEtats.length > 0 && (
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="filtres-etat-label">État</InputLabel>
            <Select
              labelId="filtres-etat-label"
              name="formation_etat"
              value={(values.formation_etat as string | number | undefined) ?? ""}
              label="État"
              onChange={handleChange}
            >
              <MenuItem value="">— Tous les états —</MenuItem>
              {formationEtats.map((e) => (
                <MenuItem key={`etat-${e.value}`} value={e.value}>
                  {e.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>
    </Box>
  );
}
