import React, { useMemo, useCallback } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
} from "@mui/material";
import { CVThequeFilters } from "src/types/cvtheque";

export interface CVThequeFiltresValues {
  document_type?: string;
  centre_id?: number | "";
  formation_id?: number | "";
  type_offre_id?: number | "";
  statut_formation?: number | "";
}

interface Props {
  filtres: CVThequeFilters | undefined;
  values: CVThequeFiltresValues;
  onChange: (v: CVThequeFiltresValues) => void;
}

// 🔧 Supprime doublons
function unique(arr: any[] = [], accessor: (x: any) => any = (x) => x) {
  const seen = new Set();
  return arr.filter((item) => {
    const key = accessor(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function CVThequeFiltresPanel({ filtres, values, onChange }: Props) {
  const documentTypes = useMemo(
    () => unique(filtres?.document_types ?? [], (x) => x.value),
    [filtres]
  );

  const centres = useMemo(
    () => unique(filtres?.centres ?? [], (x) => x.value),
    [filtres]
  );

  const typeOffres = useMemo(
    () => unique(filtres?.type_offres ?? [], (x) => x.value),
    [filtres]
  );

  const formations = useMemo(
    () => unique(filtres?.formations ?? [], (x) => x.id),
    [filtres]
  );

  const statutsFormation = useMemo(
    () => unique(filtres?.statuts_formation ?? [], (x) => x.value),
    [filtres]
  );

  // 🔥 Toujours retourner une valeur contrôlée
  const safe = (v: any) => (v !== undefined && v !== null ? v : "");

  const handleChange = useCallback(
    (e: SelectChangeEvent<any>) => {
      const { name, value } = e.target;

      let parsed: any = value;
      if (value === "" || value === undefined) parsed = "";
      else if (!isNaN(Number(value))) parsed = Number(value);

      onChange({ ...values, [name]: parsed });
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
        mb: 2,
        bgcolor: "background.paper",
      }}
    >
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {/* TYPE DOCUMENT */}
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id="doc-type-label">Type document</InputLabel>
          <Select
            labelId="doc-type-label"
            name="document_type"
            value={safe(values.document_type)}
            label="Type document"
            onChange={handleChange}
          >
            <MenuItem value="">— Tous —</MenuItem>
            {documentTypes.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* CENTRE */}
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id="centre-label">Centre</InputLabel>
          <Select
            labelId="centre-label"
            name="centre_id"
            value={safe(values.centre_id)}
            label="Centre"
            onChange={handleChange}
          >
            <MenuItem value="">— Tous —</MenuItem>
            {centres.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* FORMATION */}
        {formations.length > 0 && (
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="formation-label">Formation</InputLabel>
            <Select
              labelId="formation-label"
              name="formation_id"
              value={safe(values.formation_id)}
              label="Formation"
              onChange={handleChange}
            >
              <MenuItem value="">— Toutes —</MenuItem>
              {formations.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.nom} — {f.type_offre} — {f.statut}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* TYPE D’OFFRE */}
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id="type-offre-label">Type d’offre</InputLabel>
          <Select
            labelId="type-offre-label"
            name="type_offre_id"
            value={safe(values.type_offre_id)}
            label="Type d’offre"
            onChange={handleChange}
          >
            <MenuItem value="">— Tous —</MenuItem>
            {typeOffres.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* STATUT FORMATION */}
        {statutsFormation.length > 0 && (
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="statut-formation-label">Statut formation</InputLabel>
            <Select
              labelId="statut-formation-label"
              name="statut_formation"
              value={safe(values.statut_formation)}
              label="Statut formation"
              onChange={handleChange}
            >
              <MenuItem value="">— Tous —</MenuItem>
              {statutsFormation.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>
    </Box>
  );
}
