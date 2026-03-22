// src/components/appairages/AppairageTable.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Link,
  Typography,
  Stack,
  Chip,
  Box,
} from "@mui/material";
import { useEffect, useMemo, useRef, useCallback } from "react";
import type { AppairageListItem, TypeOffreMini } from "../../types/appairage";

export type FormationChoice = { value: number; label: string };

type Props = {
  items: AppairageListItem[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onRowClick: (id: number) => void;
  onDeleteClick?: (id: number) => void;
  onHistoryClick?: (id: number) => void;
  formationChoices?: FormationChoice[];
  maxHeight?: string;
};

const STICKY_COL_1_PX = 36;

const dtfFR = typeof Intl !== "undefined" ? new Intl.DateTimeFormat("fr-FR") : undefined;

function formatDateFR(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dtfFR ? dtfFR.format(d) : d.toLocaleDateString("fr-FR");
}

function resolveFormationLabel(r: AppairageListItem, formationMap: Map<number, string>): string {
  if (r.formation_nom) return r.formation_nom;
  const id = r.formation ?? null;
  if (id != null && formationMap.size) {
    const label = formationMap.get(id);
    if (label) return label;
  }
  return "—";
}

function resolveTypeOffre(r: AppairageListItem): string {
  const maybe = r.formation_detail?.type_offre ?? r.formation_type_offre ?? null;
  if (!maybe) return "—";
  if (typeof maybe === "string") return maybe;
  const obj = maybe as TypeOffreMini;
  return obj.libelle ?? obj.nom ?? "—";
}

export default function AppairageTable({
  items,
  selectedIds,
  onSelectionChange,
  onRowClick,
  onDeleteClick,
  formationChoices,
  maxHeight,
}: Props) {
  const formationMap = useMemo(() => {
    const m = new Map<number, string>();
    formationChoices?.forEach((f) => m.set(f.value, f.label));
    return m;
  }, [formationChoices]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const pageIds = useMemo(() => items.map((i) => i.id), [items]);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));
  const someChecked = pageIds.some((id) => selectedSet.has(id)) && !allChecked;

  const headerCbRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggleAllThisPage = useCallback(() => {
    if (allChecked) {
      onSelectionChange(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      const set = new Set(selectedIds);
      for (const id of pageIds) set.add(id);
      onSelectionChange(Array.from(set));
    }
  }, [allChecked, onSelectionChange, pageIds, selectedIds]);

  const toggleOne = useCallback(
    (id: number, checked: boolean) => {
      if (checked) {
        if (!selectedSet.has(id)) onSelectionChange([...selectedIds, id]);
      } else {
        if (selectedSet.has(id)) onSelectionChange(selectedIds.filter((x) => x !== id));
      }
    },
    [onSelectionChange, selectedIds, selectedSet]
  );

  if (!items.length) {
    return (
      <Typography variant="body2" sx={{ p: 2, color: "text.secondary", textAlign: "center" }}>
        Aucun appairage.
      </Typography>
    );
  }

  return (
    <TableContainer
      sx={{
        maxHeight: maxHeight ?? "65vh",
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                width: STICKY_COL_1_PX,
                textAlign: "center",
                left: 0,
                zIndex: 5,
                bgcolor: "grey.100",
                position: "sticky",
              }}
            >
              <Checkbox
                inputRef={headerCbRef}
                checked={allChecked}
                onChange={toggleAllThisPage}
                onClick={(e) => e.stopPropagation()}
              />
            </TableCell>
            <TableCell
              sx={{
                position: "sticky",
                left: STICKY_COL_1_PX,
                zIndex: 4,
                bgcolor: "grey.100",
              }}
            >
              👤 Candidat
            </TableCell>
            <TableCell>📌 Appairage</TableCell>
            <TableCell>🟢 Activité</TableCell>
            <TableCell>🏢 Partenaire</TableCell>
            <TableCell>🎓 Formation + Centre</TableCell>
            <TableCell>📑 Offre</TableCell>
            <TableCell>📅 Dates</TableCell>
            <TableCell>📊 Places</TableCell>
            <TableCell>💬 Commentaire</TableCell>
            <TableCell>Création</TableCell>
            <TableCell>Mise à jour</TableCell>
            <TableCell>⚙️ Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((r) => {
            const isChecked = selectedSet.has(r.id);
            const formationLib = resolveFormationLabel(r, formationMap);
            const typeOffreLib = resolveTypeOffre(r);
            const numOffre = r.formation_bref?.num_offre ?? r.formation_detail?.num_offre ?? "—";
            const centreNom = r.formation_bref?.centre_nom ?? r.formation_detail?.centre_nom ?? "—";
            const debut = formatDateFR(
              r.formation_bref?.start_date ?? r.formation_detail?.start_date
            );
            const fin = formatDateFR(r.formation_detail?.end_date);
            const statutFormation = r.formation_detail?.statut ?? "—";
            const placesDispo = r.formation_places_disponibles;
            const placesTotal = r.formation_places_total;

            return (
              <TableRow
                key={r.id}
                hover
                tabIndex={0}
                onClick={() => onRowClick(r.id)}
                sx={{
                  cursor: "pointer",
                  "&:nth-of-type(even)": { bgcolor: "grey.50" },
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRowClick(r.id);
                  }
                }}
              >
                {/* ✅ Sélection */}
                <TableCell
                  sx={{
                    width: STICKY_COL_1_PX,
                    textAlign: "center",
                    left: 0,
                    position: "sticky",
                    bgcolor: "background.paper",
                    zIndex: 2,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isChecked}
                    onChange={(e) => toggleOne(r.id, e.target.checked)}
                  />
                </TableCell>

                {/* ✅ Candidat */}
                <TableCell
                  sx={{
                    position: "sticky",
                    left: STICKY_COL_1_PX,
                    bgcolor: "background.paper",
                    zIndex: 1,
                    whiteSpace: "nowrap",
                  }}
                  title={r.candidat_nom ?? ""}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {r.candidat_nom ?? "—"}
                  </Typography>
                </TableCell>

                {/* ✅ Date + statut appairage */}
                <TableCell>
                  <Box display="flex" flexDirection="column">
                    <Typography variant="body2">{formatDateFR(r.date_appairage)}</Typography>
                    {r.statut_display && (
                      <Chip
                        size="small"
                        color="info"
                        label={r.statut_display}
                        sx={{ mt: 0.3, maxWidth: "100%" }}
                      />
                    )}
                  </Box>
                </TableCell>

                {/* ✅ Activité */}
                <TableCell>
                  {r.activite_display ? (
                    <Chip
                      size="small"
                      label={r.activite_display}
                      color={
                        r.activite_display.toLowerCase().includes("archiv") ? "default" : "success"
                      }
                      sx={{
                        fontWeight: 600,
                        textTransform: "capitalize",
                        bgcolor: r.activite_display.toLowerCase().includes("archiv")
                          ? "grey.200"
                          : "success.light",
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>

                {/* ✅ Partenaire */}
                <TableCell sx={{ maxWidth: 220 }}>
                  <Typography variant="body2" fontWeight="bold" noWrap>
                    {r.partenaire_nom ?? "—"}
                  </Typography>
                  {r.partenaire_contact_nom && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      👤 {r.partenaire_contact_nom}
                    </Typography>
                  )}
                  {r.partenaire_telephone && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      📞 {r.partenaire_telephone}
                    </Typography>
                  )}
                  {r.partenaire_email && (
                    <Link
                      href={`mailto:${r.partenaire_email}`}
                      onClick={(e) => e.stopPropagation()}
                      underline="hover"
                      sx={{ fontSize: "0.75rem" }}
                    >
                      ✉️ {r.partenaire_email}
                    </Link>
                  )}
                </TableCell>

                {/* ✅ Formation */}
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {formationLib}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {centreNom}
                  </Typography>
                </TableCell>

                {/* ✅ Offre */}
                <TableCell>
                  <Typography variant="body2">{typeOffreLib}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    N° {numOffre} — {statutFormation}
                  </Typography>
                </TableCell>

                {/* ✅ Dates */}
                <TableCell>
                  <Typography variant="body2">{debut}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    → {fin}
                  </Typography>
                </TableCell>

                {/* ✅ Places */}
                <TableCell>
                  {typeof placesTotal === "number" && (
                    <Typography variant="body2">Total: {placesTotal}</Typography>
                  )}
                  {typeof placesDispo === "number" ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      color={placesDispo > 0 ? "success" : "error"}
                      label={`${placesDispo} dispo`}
                      sx={{ mt: 0.3 }}
                    />
                  ) : (
                    <Typography variant="caption" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>

                {/* ✅ Dernier commentaire */}
                <TableCell>
                  {r.last_commentaire ? (
                    <Box
                      sx={{
                        backgroundColor: (theme) => theme.palette.action.hover,
                        p: 0.6,
                        borderRadius: 1,
                        maxWidth: 260,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.last_commentaire}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      —
                    </Typography>
                  )}
                </TableCell>

                {/* ✅ Audit création */}
                <TableCell>
                  <Typography variant="body2">{r.created_by_nom ?? "—"}</Typography>
                  {r.created_at && (
                    <Typography variant="caption" color="text.secondary">
                      {formatDateFR(r.created_at)}
                    </Typography>
                  )}
                </TableCell>

                {/* ✅ Audit maj */}
                <TableCell>
                  <Typography variant="body2">{r.updated_by_nom ?? "—"}</Typography>
                  {r.updated_at && (
                    <Typography variant="caption" color="text.secondary">
                      {formatDateFR(r.updated_at)}
                    </Typography>
                  )}
                </TableCell>

                {/* ✅ Actions */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Stack direction="row" spacing={1}>
                    <Link component="button" color="primary" onClick={() => onRowClick(r.id)}>
                      Éditer
                    </Link>
                    {onDeleteClick && (
                      <Link component="button" color="error" onClick={() => onDeleteClick(r.id)}>
                        Supprimer
                      </Link>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
