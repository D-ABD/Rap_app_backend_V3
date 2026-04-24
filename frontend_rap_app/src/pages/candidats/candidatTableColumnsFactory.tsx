/**
 * Colonnes table candidats (ResponsiveTableTemplate) — logique d’affichage inchangée.
 */
import type { RefObject, MutableRefObject } from "react";
import { Box, Checkbox, Link, IconButton, Tooltip, Typography } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import type { Candidat } from "../../types/candidat";
import type { TableColumn } from "../../components/ResponsiveTableTemplate";
import { STICKY_COL_1_PX } from "./candidatTableShared";

// Réexport helpers utilisés ici (import depuis shared pour éviter cycles)
import {
  fullName,
  formatFormation,
  typeOffreLabel,
  formatDateFR,
  contratChip,
  yesNoChip,
  stars,
  labelOrId,
  cvChip,
  phaseChip,
  atelierCountsCompact,
  getLastAppairage,
  getLinkedAccountId,
} from "./candidatTableShared";

export type CandidatColumnFactoryArgs = {
  nameLeftPx: number;
  headerCbRef: RefObject<HTMLInputElement | null>;
  allChecked: boolean;
  onToggleAll: () => void;
  selectedSet: Set<number>;
  onToggleOne: (id: number, checked: boolean) => void;
  goEdit: (id: number) => void;
  goShow: (id: number) => void;
  goCandidateAppairages: (id: number) => void;
  goCandidateProspections: (ownerId: number) => void;
  goCreateCandidateProspection: (c: Candidat) => void;
  goCreateCandidateAppairage: (c: Candidat) => void;
  onDelete?: (id: number) => void;
  onRestore?: (id: number) => void;
  onHardDelete?: (id: number) => void;
};

export function renderCandidatRowActions(
  c: Candidat,
  args: Pick<
    CandidatColumnFactoryArgs,
    | "goEdit"
    | "goShow"
    | "goCreateCandidateAppairage"
    | "goCreateCandidateProspection"
    | "onDelete"
    | "onRestore"
    | "onHardDelete"
  >
) {
  const {
    goEdit,
    goShow,
    goCreateCandidateAppairage,
    goCreateCandidateProspection,
    onDelete,
    onRestore,
    onHardDelete,
  } = args;
  return (
    <>
      <Tooltip title="Voir">
        <IconButton size="small" onClick={() => goShow(c.id)}>
          <VisibilityIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Éditer">
        <IconButton size="small" onClick={() => goEdit(c.id)}>
          <EditIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Créer un appairage">
        <IconButton
          size="small"
          color="secondary"
          onClick={() => goCreateCandidateAppairage(c)}
        >
          <AddIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
      {getLinkedAccountId(c) && (
        <Tooltip title="Créer une prospection">
          <IconButton
            size="small"
            color="primary"
            onClick={() => goCreateCandidateProspection(c)}
          >
            <AddIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      )}
      {c.is_active !== false ? (
        onDelete && (
          <Tooltip title="Archiver">
            <IconButton size="small" color="error" onClick={() => onDelete(c.id)}>
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        )
      ) : (
        <>
          {onRestore && (
            <Tooltip title="Restaurer">
              <IconButton
                size="small"
                color="success"
                onClick={() => onRestore(c.id)}
              >
                <VisibilityIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          )}
          {onHardDelete && (
            <Tooltip title="Supprimer définitivement">
              <IconButton
                size="small"
                color="error"
                onClick={() => onHardDelete(c.id)}
              >
                <DeleteIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          )}
        </>
      )}
    </>
  );
}

export function buildCandidatTableColumns(
  a: CandidatColumnFactoryArgs
): TableColumn<Candidat>[] {
  return [
    {
      key: "select",
      label: "",
      width: STICKY_COL_1_PX,
      sticky: "left",
      stickyLeftOffsetPx: 0,
      headerRender: () => (
        <Checkbox
          inputRef={a.headerCbRef as unknown as MutableRefObject<HTMLInputElement | null>}
          checked={a.allChecked}
          onChange={() => a.onToggleAll()}
        />
      ),
      render: (c) => (
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{ display: "inline-flex" }}
        >
          <Checkbox
            checked={a.selectedSet.has(c.id)}
            onChange={(e) => a.onToggleOne(c.id, e.target.checked)}
          />
        </Box>
      ),
    },
    {
      key: "candidat",
      label: "👤 Candidat",
      sticky: "left",
      stickyLeftOffsetPx: a.nameLeftPx,
      noWrap: false,
      render: (c) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {fullName(c)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {c.nom} {c.prenom}
          </Typography>
        </Box>
      ),
    },
    {
      key: "age",
      label: "🎂 Âge",
      render: (c) => (typeof c.age === "number" ? c.age : "—"),
    },
    {
      key: "contact",
      label: "📧 Contact",
      noWrap: false,
      render: (c) => (
        <Box onClick={(e) => e.stopPropagation()}>
          {c.email ? (
            <Link href={`mailto:${c.email}`} display="block">
              {c.email}
            </Link>
          ) : (
            <Typography color="text.disabled">—</Typography>
          )}
          {c.telephone && (
            <Link
              href={`tel:${c.telephone}`}
              display="block"
              variant="body2"
              color="text.secondary"
            >
              {c.telephone}
            </Link>
          )}
        </Box>
      ),
    },
    {
      key: "localisation",
      label: "📍 Localisation",
      render: (c) =>
        c.ville || c.code_postal
          ? `${c.ville ?? ""}${
              c.ville && c.code_postal ? " (" + c.code_postal + ")" : c.code_postal ?? ""
            }`
          : "—",
    },
    {
      key: "formation_complete",
      label: "🎓 Formation complète",
      noWrap: false,
      render: (c) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {formatFormation(c)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {[
              c.formation_info?.num_offre,
              c.formation_info?.centre?.nom,
              typeOffreLabel(c),
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </Typography>
        </Box>
      ),
    },
    {
      key: "periode",
      label: "📅 Période",
      noWrap: false,
      render: (c) =>
        c.formation_info?.date_debut || c.formation_info?.date_fin ? (
          <Typography variant="body2">
            {[
              formatDateFR(c.formation_info?.date_debut),
              formatDateFR(c.formation_info?.date_fin),
            ].join(" → ")}
          </Typography>
        ) : (
          <Typography color="text.disabled">—</Typography>
        ),
    },
    { key: "contrat", label: "📃 Contrat", render: (c) => c.type_contrat || "—" },
    { key: "contrat_signe", label: "✍️ Contrat signé", render: (c) => contratChip(c.contrat_signe) },
    { key: "statut_metier", label: "📌 Statut métier", render: (c) => phaseChip(c) },
    { key: "cv", label: "📄 CV", render: (c) => cvChip(c) },
    { key: "disponibilite", label: "⏳ Disp.", render: (c) => c.disponibilite || "—" },
    { key: "rqth", label: "♿ RQTH", render: (c) => yesNoChip(c.rqth) },
    { key: "permis_b", label: "🚗 Permis B", render: (c) => yesNoChip(c.permis_b) },
    { key: "admissible", label: "🟢 Admissible", render: (c) => yesNoChip(c.admissible) },
    { key: "accompagnement_tre", label: "🤝 Accompagnement TRE", render: (c) => yesNoChip(c.en_accompagnement_tre) },
    { key: "gespers", label: "🗂️ GESPERS", render: (c) => yesNoChip(c.inscrit_gespers) },
    { key: "communication", label: "💬 Com.", render: (c) => stars(c.communication) },
    { key: "experience", label: "🛠 Exp.", render: (c) => stars(c.experience) },
    { key: "csp", label: "⚖️ CSP", render: (c) => stars(c.csp) },
    { key: "entretien", label: "👥 Entretien", render: (c) => yesNoChip(c.entretien_done) },
    { key: "test", label: "🧪 Test", render: (c) => yesNoChip(c.test_is_ok) },
    { key: "inscription", label: "📝 Inscription", render: (c) => formatDateFR(c.date_inscription) },
    { key: "naissance", label: "🎂 Naissance", render: (c) => formatDateFR(c.date_naissance) },
    {
      key: "appairages",
      label: "🔗 Appairages",
      render: (c) => (
        <Box onClick={(e) => e.stopPropagation()}>
          {typeof c.nb_appairages === "number" && c.nb_appairages > 0 ? (
            <Link
              component="button"
              type="button"
              underline="hover"
              onClick={() => a.goCandidateAppairages(c.id)}
            >
              {c.nb_appairages}
            </Link>
          ) : (
            (c.nb_appairages ?? "—")
          )}
        </Box>
      ),
    },
    {
      key: "prospections",
      label: "📊 Prospections",
      render: (c) => {
        const linkedAccountId = getLinkedAccountId(c);
        return (
          <Box onClick={(e) => e.stopPropagation()}>
            {typeof c.nb_prospections === "number" &&
            c.nb_prospections > 0 &&
            linkedAccountId ? (
              <Link
                component="button"
                type="button"
                underline="hover"
                onClick={() => a.goCandidateProspections(linkedAccountId)}
              >
                {c.nb_prospections}
              </Link>
            ) : (
              (c.nb_prospections ?? "—")
            )}
          </Box>
        );
      },
    },
    {
      key: "partenaire",
      label: "🏢 Partenaire",
      render: (c) => getLastAppairage(c)?.partenaire_nom ?? "—",
    },
    {
      key: "statut_appairage",
      label: "📌 Statut app.",
      render: (c) => {
        const la = getLastAppairage(c);
        return la?.statut_display ?? la?.statut ?? "—";
      },
    },
    {
      key: "date_appairage",
      label: "📅 Date app.",
      render: (c) => formatDateFR(getLastAppairage(c)?.date_appairage),
    },
    { key: "origine", label: "🌐 Origine", render: (c) => c.origine_sourcing || "—" },
    { key: "cree_par", label: "✍️ Créé par", render: (c) => getLastAppairage(c)?.created_by_nom ?? "—" },
    {
      key: "dernier_commentaire",
      label: "💬 Dernier comm.",
      noWrap: false,
      render: (c) => {
        const la = getLastAppairage(c);
        return la?.last_commentaire ? (
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
              {la.last_commentaire}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        );
      },
    },
    { key: "courrier_rentree", label: "📨 Courrier rentrée", render: (c) => yesNoChip(c.courrier_rentree) },
    { key: "date_rentree", label: "📅 Date rentrée", render: (c) => formatDateFR(c.date_rentree) },
    { key: "vu_par", label: "👀 Vu par", render: (c) => labelOrId(c.vu_par_nom, c.vu_par) },
    {
      key: "ateliers",
      label: "📚 Ateliers",
      render: (c) => {
        const { display, title } = atelierCountsCompact(c);
        return <span title={title}>{display}</span>;
      },
    },
    { key: "numero_osia", label: "🆔 OSIA", render: (c) => c.numero_osia || "—" },
  ];
}
