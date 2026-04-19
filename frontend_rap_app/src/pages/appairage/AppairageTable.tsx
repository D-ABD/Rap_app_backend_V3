// src/components/appairages/AppairageTable.tsx
import { useMemo, useCallback } from "react";
import { Checkbox, Link, Typography, Stack, Chip, Box } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ResponsiveTableTemplate, {
  type TableColumn,
} from "../../components/ResponsiveTableTemplate";
import type { AppairageListItem, TypeOffreMini } from "../../types/appairage";

export type FormationChoice = { value: number; label: string };

type Props = {
  items: AppairageListItem[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onRowClick: (id: number) => void;
  onDeleteClick?: (id: number) => void;
  onRestoreClick?: (id: number) => void;
  onHardDeleteClick?: (id: number) => void;
  canHardDelete?: boolean;
  onHistoryClick?: (id: number) => void;
  formationChoices?: FormationChoice[];
  maxHeight?: string;
  visibleColumnKeys?: string[];
  showActionsColumn?: boolean;
};

const dtfFR =
  typeof Intl !== "undefined" ? new Intl.DateTimeFormat("fr-FR") : undefined;

function formatDateFR(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dtfFR ? dtfFR.format(d) : d.toLocaleDateString("fr-FR");
}

function resolveFormationLabel(
  r: AppairageListItem,
  formationMap: Map<number, string>
): string {
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
  onRestoreClick,
  onHardDeleteClick,
  canHardDelete = false,
  formationChoices,
  maxHeight,
  visibleColumnKeys,
  showActionsColumn = true,
}: Props) {
  const formationMap = useMemo(() => {
    const m = new Map<number, string>();
    formationChoices?.forEach((f) => m.set(f.value, f.label));
    return m;
  }, [formationChoices]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const pageIds = useMemo(() => items.map((i) => i.id), [items]);

  const allChecked =
    pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));
  const someChecked = pageIds.some((id) => selectedSet.has(id)) && !allChecked;

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
        if (!selectedSet.has(id)) {
          onSelectionChange([...selectedIds, id]);
        }
      } else if (selectedSet.has(id)) {
        onSelectionChange(selectedIds.filter((x) => x !== id));
      }
    },
    [onSelectionChange, selectedIds, selectedSet]
  );

  const columns = useMemo<TableColumn<AppairageListItem>[]>(
    () => [
      {
        key: "select",
        label: "",
        width: 60,
        sticky: "left",
        hideable: false,
        headerRender: () => (
          <Checkbox
            checked={allChecked}
            indeterminate={someChecked}
            onChange={toggleAllThisPage}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        render: (row) => {
          const isChecked = selectedSet.has(row.id);
          return (
            <Box onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isChecked}
                onChange={(e) => toggleOne(row.id, e.target.checked)}
              />
            </Box>
          );
        },
      },
      {
        key: "candidat_nom",
        label: "👤 Candidat",
        width: 220,
        sticky: "left",
        hideable: false,
        render: (row) => (
          <Box title={row.candidat_nom ?? ""}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {row.candidat ? (
                <Link
                  component={RouterLink}
                  to={`/candidats/${row.candidat}`}
                  onClick={(e) => e.stopPropagation()}
                  underline="hover"
                >
                  {row.candidat_nom ?? "—"}
                </Link>
              ) : (
                row.candidat_nom ?? "—"
              )}
            </Typography>
          </Box>
        ),
      },
      {
        key: "appairage",
        label: "📌 Appairage",
        width: 160,
        hideable: true,
        render: (row) => (
          <Box display="flex" flexDirection="column">
            <Typography variant="body2">{formatDateFR(row.date_appairage)}</Typography>
            {row.statut_display && (
              <Chip
                size="small"
                color="info"
                label={row.statut_display}
                sx={{ mt: 0.3, maxWidth: "100%" }}
              />
            )}
          </Box>
        ),
      },
      {
        key: "activite_display",
        label: "🟢 Activité",
        width: 140,
        hideable: true,
        render: (row) =>
          row.activite_display ? (
            <Chip
              size="small"
              label={row.activite_display}
              color={
                row.activite_display.toLowerCase().includes("archiv")
                  ? "default"
                  : "success"
              }
              sx={{
                fontWeight: 600,
                textTransform: "capitalize",
                bgcolor: row.activite_display.toLowerCase().includes("archiv")
                  ? "grey.200"
                  : "success.light",
              }}
            />
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          ),
      },
      {
        key: "partenaire_nom",
        label: "🏢 Partenaire",
        width: 240,
        hideable: true,
        render: (row) => (
          <Box sx={{ maxWidth: 220 }}>
            <Typography variant="body2" fontWeight="bold" noWrap>
              {row.partenaire ? (
                <Link
                  component={RouterLink}
                  to={`/partenaires/${row.partenaire}/edit`}
                  onClick={(e) => e.stopPropagation()}
                  underline="hover"
                >
                  {row.partenaire_nom ?? "—"}
                </Link>
              ) : (
                row.partenaire_nom ?? "—"
              )}
            </Typography>

            {row.partenaire_contact_nom && (
              <Typography variant="caption" color="text.secondary" display="block">
                👤 {row.partenaire_contact_nom}
              </Typography>
            )}

            {row.partenaire_telephone && (
              <Typography variant="caption" color="text.secondary" display="block">
                📞 {row.partenaire_telephone}
              </Typography>
            )}

            {row.partenaire_email && (
              <Link
                href={`mailto:${row.partenaire_email}`}
                onClick={(e) => e.stopPropagation()}
                underline="hover"
                sx={{ fontSize: "0.75rem" }}
              >
                ✉️ {row.partenaire_email}
              </Link>
            )}
          </Box>
        ),
      },
      {
        key: "formation",
        label: "🎓 Formation + Centre",
        width: 260,
        hideable: true,
        render: (row) => {
          const formationLib = resolveFormationLabel(row, formationMap);
          const centreNom =
            row.formation_bref?.centre_nom ?? row.formation_detail?.centre_nom ?? "—";

          return (
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {row.formation ? (
                  <Link
                    component={RouterLink}
                    to={`/formations/${row.formation}`}
                    onClick={(e) => e.stopPropagation()}
                    underline="hover"
                  >
                    {formationLib}
                  </Link>
                ) : (
                  formationLib
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {centreNom}
              </Typography>
            </Box>
          );
        },
      },
      {
        key: "offre",
        label: "📑 Offre",
        width: 180,
        hideable: true,
        render: (row) => {
          const typeOffreLib = resolveTypeOffre(row);
          const numOffre =
            row.formation_bref?.num_offre ?? row.formation_detail?.num_offre ?? "—";
          const statutFormation = row.formation_detail?.statut ?? "—";

          return (
            <Box>
              <Typography variant="body2">{typeOffreLib}</Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                N° {numOffre} — {statutFormation}
              </Typography>
            </Box>
          );
        },
      },
      {
        key: "dates",
        label: "📅 Dates",
        width: 150,
        hideable: true,
        render: (row) => {
          const debut = formatDateFR(
            row.formation_bref?.start_date ?? row.formation_detail?.start_date
          );
          const fin = formatDateFR(row.formation_detail?.end_date);

          return (
            <Box>
              <Typography variant="body2">{debut}</Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                → {fin}
              </Typography>
            </Box>
          );
        },
      },
      {
        key: "places",
        label: "📊 Places",
        width: 130,
        hideable: true,
        render: (row) => {
          const placesDispo = row.formation_places_disponibles;
          const placesTotal = row.formation_places_total;

          return (
            <Box>
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
            </Box>
          );
        },
      },
      {
        key: "last_commentaire",
        label: "💬 Commentaire",
        width: 260,
        hideable: true,
        render: (row) =>
          row.last_commentaire ? (
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
                {row.last_commentaire}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          ),
      },
      {
        key: "created_at",
        label: "Création",
        width: 160,
        hideable: true,
        render: (row) => (
          <Box>
            <Typography variant="body2">{row.created_by_nom ?? "—"}</Typography>
            {row.created_at && (
              <Typography variant="caption" color="text.secondary">
                {formatDateFR(row.created_at)}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        key: "updated_at",
        label: "Mise à jour",
        width: 160,
        hideable: true,
        render: (row) => (
          <Box>
            <Typography variant="body2">{row.updated_by_nom ?? "—"}</Typography>
            {row.updated_at && (
              <Typography variant="caption" color="text.secondary">
                {formatDateFR(row.updated_at)}
              </Typography>
            )}
          </Box>
        ),
      },
    ],
    [
      allChecked,
      formationMap,
      selectedSet,
      someChecked,
      toggleAllThisPage,
      toggleOne,
    ]
  );

  const actions = useCallback(
    (row: AppairageListItem) => (
      <Stack direction="row" spacing={1} onClick={(e) => e.stopPropagation()}>
        <Link component="button" color="primary" onClick={() => onRowClick(row.id)}>
          Éditer
        </Link>

        <Link
          component={RouterLink}
          to={`/appairage-commentaires?appairage=${row.id}`}
          underline="hover"
        >
          Commentaires
        </Link>

        {onDeleteClick && (
          <>
            <Link
              component="button"
              color={row.activite === "archive" ? "success" : "error"}
              onClick={() =>
                row.activite === "archive"
                  ? onRestoreClick?.(row.id)
                  : onDeleteClick(row.id)
              }
            >
              {row.activite === "archive" ? "Restaurer" : "Archiver"}
            </Link>

            {row.activite === "archive" && canHardDelete && onHardDeleteClick && (
              <Link
                component="button"
                color="error"
                onClick={() => onHardDeleteClick(row.id)}
              >
                Supprimer définitivement
              </Link>
            )}
          </>
        )}
      </Stack>
    ),
    [canHardDelete, onDeleteClick, onHardDeleteClick, onRestoreClick, onRowClick]
  );

  return (
    <ResponsiveTableTemplate<AppairageListItem>
      columns={columns}
      data={items}
      getRowId={(row) => row.id}
      actions={actions}
      onRowClick={(row) => onRowClick(row.id)}
      containerSx={{
        maxHeight: maxHeight ?? "65vh",
      }}
      visibleColumnKeys={visibleColumnKeys}
      showActionsColumn={showActionsColumn}
      actionsAlign="left"
    />
  );
}