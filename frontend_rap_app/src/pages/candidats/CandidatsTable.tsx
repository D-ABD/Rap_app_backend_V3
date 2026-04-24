// src/pages/candidats/CandidatsTable.tsx
import { Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Candidat } from "../../types/candidat";
import ResponsiveTableTemplate from "../../components/ResponsiveTableTemplate";
import { STICKY_COL_2_LEFT_PX } from "./candidatTableShared";
import {
  buildCandidatTableColumns,
  renderCandidatRowActions,
} from "./candidatTableColumnsFactory";

type Props = {
  items: Candidat[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onDelete?: (id: number) => void;
  onRestore?: (id: number) => void;
  onHardDelete?: (id: number) => void;
  onRowClick?: (id: number, candidate?: Candidat) => void | Promise<void>;
  onRowHover?: (candidate: Candidat) => void;
  maxHeight?: string;
  visibleColumnKeys?: string[];
  showActionsColumn?: boolean;
};

function buildCandidateProspectionCreateUrl(c: Candidat): string | null {
  const account = c.compte_utilisateur;
  const ownerId =
    typeof account === "number"
      ? account
      : account && typeof account === "object" && typeof account.id === "number"
        ? account.id
        : null;
  if (!ownerId) return null;
  const params = new URLSearchParams();
  params.set("owner", String(ownerId));
  const name =
    c.nom_complet?.trim() ||
    [c.nom, c.prenom].filter(Boolean).join(" ").trim() ||
    "";
  params.set("owner_username", name);
  if (typeof c.formation === "number") params.set("formation", String(c.formation));
  if (c.formation_info?.nom) params.set("formation_nom", c.formation_info.nom);
  return `/prospections/create?${params.toString()}`;
}

function buildCandidateAppairageCreateUrl(c: Candidat): string {
  const params = new URLSearchParams();
  params.set("candidat", String(c.id));
  params.set(
    "candidat_nom",
    c.nom_complet?.trim() || [c.nom, c.prenom].filter(Boolean).join(" ").trim() || ""
  );
  if (typeof c.formation === "number") params.set("formation", String(c.formation));
  if (c.formation_info?.nom) params.set("formation_nom", c.formation_info.nom);
  return `/appairages/create?${params.toString()}`;
}

export default function CandidatsTable({
  items,
  selectedIds,
  onSelectionChange,
  onDelete,
  onRestore,
  onHardDelete,
  onRowClick,
  onRowHover,
  maxHeight = "65vh",
  visibleColumnKeys,
  showActionsColumn = true,
}: Props) {
  const navigate = useNavigate();
  const headerCbRef = useRef<HTMLInputElement | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const pageIds = useMemo(() => items.map((i) => i.id), [items]);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));
  const someChecked = pageIds.some((id) => selectedSet.has(id)) && !allChecked;

  useEffect(() => {
    if (headerCbRef.current) headerCbRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const visibleSet = useMemo(
    () =>
      visibleColumnKeys && visibleColumnKeys.length > 0
        ? new Set(visibleColumnKeys)
        : null,
    [visibleColumnKeys]
  );

  const nameLeftPx =
    !visibleSet || visibleSet.has("select") ? STICKY_COL_2_LEFT_PX : 0;

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
      } else if (selectedSet.has(id)) {
        onSelectionChange(selectedIds.filter((x) => x !== id));
      }
    },
    [onSelectionChange, selectedIds, selectedSet]
  );

  const goEdit = useCallback(
    (id: number) => navigate(`/candidats/${id}/edit`),
    [navigate]
  );
  const goShow = useCallback((id: number) => navigate(`/candidats/${id}`), [navigate]);
  const goCandidateAppairages = useCallback(
    (id: number) => navigate(`/appairages?candidat=${id}`),
    [navigate]
  );
  const goCandidateProspections = useCallback(
    (ownerId: number) => navigate(`/prospections?owner=${ownerId}`),
    [navigate]
  );
  const goCreateCandidateProspection = useCallback(
    (candidate: Candidat) => {
      const url = buildCandidateProspectionCreateUrl(candidate);
      if (url) navigate(url);
    },
    [navigate]
  );
  const goCreateCandidateAppairage = useCallback(
    (candidate: Candidat) => {
      navigate(buildCandidateAppairageCreateUrl(candidate));
    },
    [navigate]
  );

  const columnArgs = useMemo(
    () => ({
      nameLeftPx,
      headerCbRef,
      allChecked,
      onToggleAll: toggleAllThisPage,
      selectedSet,
      onToggleOne: toggleOne,
      goEdit,
      goShow,
      goCandidateAppairages,
      goCandidateProspections,
      goCreateCandidateProspection,
      goCreateCandidateAppairage,
      onDelete,
      onRestore,
      onHardDelete,
    }),
    [
      nameLeftPx,
      allChecked,
      toggleAllThisPage,
      selectedSet,
      toggleOne,
      goEdit,
      goShow,
      goCandidateAppairages,
      goCandidateProspections,
      goCreateCandidateProspection,
      goCreateCandidateAppairage,
      onDelete,
      onRestore,
      onHardDelete,
    ]
  );

  const columns = useMemo(() => buildCandidatTableColumns(columnArgs), [columnArgs]);

  if (!items.length) {
    return (
      <Typography sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
        Aucun candidat.
      </Typography>
    );
  }

  return (
    <ResponsiveTableTemplate<Candidat>
      columns={columns}
      data={items}
      getRowId={(c) => c.id}
      onRowClick={(c) => {
        if (onRowClick) void onRowClick(c.id, c);
        else goEdit(c.id);
      }}
      onRowKeyDown={(e, c) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (onRowClick) void onRowClick(c.id, c);
          else goEdit(c.id);
        }
      }}
      rowHintTitle="Ouvrir le détail (clic ou Entrée)"
      onRowHover={onRowHover}
      visibleColumnKeys={visibleColumnKeys}
      showActionsColumn={showActionsColumn}
      actions={(c) =>
        renderCandidatRowActions(c, {
          goEdit,
          goShow,
          goCreateCandidateAppairage,
          goCreateCandidateProspection,
          onDelete,
          onRestore,
          onHardDelete,
        })
      }
      cardTitle={(c) =>
        c.nom_complet?.trim() ||
        [c.nom, c.prenom].filter(Boolean).join(" ").trim() ||
        "Candidat"
      }
      containerSx={{ maxHeight, borderRadius: 2, position: "relative" }}
    />
  );
}
