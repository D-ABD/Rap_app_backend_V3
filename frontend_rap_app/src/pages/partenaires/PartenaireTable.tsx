// src/pages/partenaires/PartenairesTable.tsx
import { Checkbox, IconButton, Link, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import type { Partenaire } from "../../types/partenaire";
import ResponsiveTableTemplate, {
  type TableColumn,
} from "../../components/ResponsiveTableTemplate";

/* ==== Utils ==== */
function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
}

/** {count}, number, ou rien */
type Countish = number | { count: number } | undefined | null;
const getCount = (v: Countish): number | undefined => {
  if (typeof v === "number") return v;
  if (
    v &&
    typeof v === "object" &&
    "count" in v &&
    typeof (v as { count: unknown }).count === "number"
  ) {
    return (v as { count: number }).count;
  }
  return undefined;
};

/** Partenaire avec relations & annotations possibles */
type ExtendedPartenaire = Partenaire & {
  prospections?: { count: number };
  appairages?: { count: number };
  formations?: { count: number };
  candidats?: { count: number };

  prospections_count?: number;
  appairages_count?: number;
  formations_count?: number;
  candidats_count?: number;

  updated_by?: { id: number; full_name: string } | null;
  updated_by_nom?: string | null;
};

interface Props {
  partenaires: ExtendedPartenaire[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onRowClick: (id: number) => void;
  onDeleteClick: (id: number) => void;

  // URLs ou callbacks (rendent les compteurs cliquables)
  buildProspectionsUrl?: (partenaireId: number) => string;
  buildAppairagesUrl?: (partenaireId: number) => string;
  buildFormationsUrl?: (partenaireId: number) => string;
  buildCandidatsUrl?: (partenaireId: number) => string;

  onClickProspections?: (partenaireId: number) => void;
  onClickAppairages?: (partenaireId: number) => void;
  onClickFormations?: (partenaireId: number) => void;
  onClickCandidats?: (partenaireId: number) => void;
}

export default function PartenairesTable({
  partenaires,
  selectedIds,
  onToggleSelect,
  onRowClick,
  onDeleteClick,
  buildProspectionsUrl,
  buildAppairagesUrl,
  buildFormationsUrl,
  buildCandidatsUrl,
  onClickProspections,
  onClickAppairages,
  onClickFormations,
  onClickCandidats,
}: Props) {
  type Kind = "prospections" | "appairages" | "formations" | "candidats";

  const renderCountLink = (count: number | undefined, partenaireId: number, kind: Kind) => {
    if (typeof count !== "number") return "—";

    const onClickMap: Partial<Record<Kind, ((id: number) => void) | undefined>> = {
      prospections: onClickProspections,
      appairages: onClickAppairages,
      formations: onClickFormations,
      candidats: onClickCandidats,
    };

    const urlMap: Partial<Record<Kind, ((id: number) => string) | undefined>> = {
      prospections: buildProspectionsUrl,
      appairages: buildAppairagesUrl,
      formations: buildFormationsUrl,
      candidats: buildCandidatsUrl,
    };

    const onClick = onClickMap[kind];
    const buildUrl = urlMap[kind];

    if (onClick) {
      return (
        <Typography
          component="button"
          sx={{
            all: "unset",
            cursor: "pointer",
            color: "primary.main",
            textDecoration: "underline",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(partenaireId);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onClick?.(partenaireId);
            }
          }}
        >
          {count}
        </Typography>
      );
    }

    if (buildUrl) {
      const href = buildUrl(partenaireId);
      return (
        <Link href={href} onClick={(e) => e.stopPropagation()} underline="hover">
          {count}
        </Link>
      );
    }

    return String(count);
  };

  const columns: TableColumn<ExtendedPartenaire>[] = [
    {
      key: "select",
      label: "#",
      sticky: "left",
      render: (p) => (
        <Checkbox
          checked={selectedIds.includes(p.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect(p.id)}
          inputProps={{ "aria-label": `Sélectionner ${p.nom}` }}
        />
      ),
      width: 50,
    },
    {
      key: "nom",
      label: "Nom Partenaire",
      sticky: "left",
      width: 260,
      render: (p) => <strong>{p.nom || "—"}</strong>,
    },
    // 🆕 Ajout du centre
    {
      key: "default_centre_nom",
      label: "Centre",
      render: (p) =>
        p.default_centre_nom ? (
          <Typography component="span">{p.default_centre_nom}</Typography>
        ) : (
          "—"
        ),
    },
    { key: "type_display", label: "Type" },
    { key: "contact_nom", label: "Contact" },
    {
      key: "contact_email",
      label: "Email",
      render: (p) =>
        p.contact_email ? (
          <Link href={`mailto:${p.contact_email}`} onClick={(e) => e.stopPropagation()}>
            {p.contact_email}
          </Link>
        ) : p.has_contact ? (
          "(mail)"
        ) : (
          "—"
        ),
    },
    {
      key: "contact_telephone",
      label: "Téléphone",
      render: (p) =>
        p.contact_telephone ? (
          <Link href={`tel:${p.contact_telephone}`} onClick={(e) => e.stopPropagation()}>
            {p.contact_telephone}
          </Link>
        ) : p.has_contact ? (
          "(tél.)"
        ) : (
          "—"
        ),
    },
    { key: "zip_code", label: "CP" },
    { key: "city", label: "Ville" },
    { key: "secteur_activite", label: "Secteur" },

    {
      key: "description",
      label: "Description",
      render: (p) => (
        <Typography
          variant="body2"
          sx={{
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {p.description || "—"}
        </Typography>
      ),
    },
    {
      key: "created_at",
      label: "Création",
      render: (p) => (
        <>
          <div>{formatDate(p.created_at)}</div>
          <div>{p.created_by?.full_name || "—"}</div>
        </>
      ),
    },
    {
      key: "updated_at",
      label: "MAJ",
      render: (p) => (
        <>
          <div>{formatDate(p.updated_at)}</div>
          <div>{p.updated_by_nom || p.created_by?.full_name || "—"}</div>
        </>
      ),
    },
    {
      key: "appairages",
      label: "Appairages",
      render: (p) =>
        renderCountLink(
          getCount(p.appairages) ??
            (typeof p.appairages_count === "number" ? p.appairages_count : undefined),
          p.id,
          "appairages"
        ),
    },
    {
      key: "prospections",
      label: "Prospec.",
      render: (p) =>
        renderCountLink(
          getCount(p.prospections) ??
            (typeof p.prospections_count === "number" ? p.prospections_count : undefined),
          p.id,
          "prospections"
        ),
    },
    {
      key: "formations",
      label: "Formations",
      render: (p) =>
        renderCountLink(
          getCount(p.formations) ??
            (typeof p.formations_count === "number" ? p.formations_count : undefined),
          p.id,
          "formations"
        ),
    },
    {
      key: "candidats",
      label: "Candidats",
      render: (p) =>
        renderCountLink(
          getCount(p.candidats) ??
            (typeof p.candidats_count === "number" ? p.candidats_count : undefined),
          p.id,
          "candidats"
        ),
    },
  ];

  return (
    <ResponsiveTableTemplate
      columns={columns}
      data={partenaires}
      getRowId={(p) => p.id}
      cardTitle={(p) => p.nom}
      actions={(p) => (
        <IconButton
          color="error"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(p.id);
          }}
          aria-label={`Supprimer ${p.nom}`}
        >
          <DeleteIcon />
        </IconButton>
      )}
      onRowClick={(p) => onRowClick(p.id)} // ✅ clic ligne → callback
    />
  );
}
