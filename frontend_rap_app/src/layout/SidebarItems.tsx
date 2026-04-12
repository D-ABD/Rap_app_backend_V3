import { ReactNode, useMemo } from "react";
import type { SvgIconComponent } from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import {
  canAccessDeclicRole,
  canAccessPrepaRole,
  isAdminLikeRole,
  isCandidateLikeRole,
  isCoreStaffRole,
  normalizeRole,
} from "../utils/roleGroups";

import HomeIcon from "@mui/icons-material/Home";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SearchIcon from "@mui/icons-material/Search";
import FolderIcon from "@mui/icons-material/Folder";
import SettingsIcon from "@mui/icons-material/Settings";
import PeopleIcon from "@mui/icons-material/People";
import WorkIcon from "@mui/icons-material/Work";
import SchoolIcon from "@mui/icons-material/School";
import DescriptionIcon from "@mui/icons-material/Description";
import BusinessIcon from "@mui/icons-material/Business";
import CommentIcon from "@mui/icons-material/Comment";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EmojiObjectsIcon from "@mui/icons-material/EmojiObjects";
import InsightsIcon from "@mui/icons-material/Insights";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import BarChartIcon from "@mui/icons-material/BarChart";
import EventIcon from "@mui/icons-material/Event";
import HistoryIcon from "@mui/icons-material/History";

export interface SidebarItem {
  label: string;
  path?: string;
  icon: ReactNode;
  children?: SidebarItem[];
}

const createSidebarIcon = (
  IconComponent: SvgIconComponent,
  color:
    | "primary.main"
    | "secondary.main"
    | "warning.main"
    | "success.main"
    | "info.main"
    | "text.secondary"
) => <IconComponent sx={{ color, fontSize: 20 }} />;

/* ────────────────────────────────────────── */
/*                MENU LATÉRAL                */
/* ────────────────────────────────────────── */

export const sidebarItems: SidebarItem[] = [
  {
    label: "Accueil",
    path: "/",
    icon: createSidebarIcon(HomeIcon, "primary.main"),
  },

  {
    label: "Dashboard",
    path: "/dashboard",
    icon: createSidebarIcon(DashboardIcon, "secondary.main"),
  },

  /* 🔹 Déclic */
  {
    label: "Déclic",
    icon: createSidebarIcon(EmojiObjectsIcon, "warning.main"),
    children: [
      {
        label: "Séances Déclic",
        path: "/declic",
        icon: createSidebarIcon(EmojiObjectsIcon, "warning.main"),
      },
      {
        label: "Objectifs Déclic",
        path: "/declic/objectifs",
        icon: createSidebarIcon(TrackChangesIcon, "warning.main"),
      },
      {
        label: "Participants Déclic",
        path: "/participants-declic",
        icon: createSidebarIcon(PeopleIcon, "warning.main"),
      },
    ],
  },

  /* 🔹 Prépa Comp */
  {
    label: "Prépa Comp",
    icon: createSidebarIcon(InsightsIcon, "success.main"),
    children: [
      {
        label: "IC Prépa",
        path: "/prepa/ic",
        icon: createSidebarIcon(SchoolIcon, "success.main"),
      },
      {
        label: "Ateliers Prépa",
        path: "/prepa/ateliers",
        icon: createSidebarIcon(SchoolIcon, "success.main"),
      },
      {
        label: "Stagiaires Prépa",
        path: "/prepa/stagiaires",
        icon: createSidebarIcon(PeopleIcon, "success.main"),
      },
      {
        label: "Objectifs Prépa",
        path: "/prepa/objectifs",
        icon: createSidebarIcon(BarChartIcon, "success.main"),
      },
    ],
  },

  /* 🔹 CRM */
  {
    label: "CRM",
    icon: createSidebarIcon(SearchIcon, "info.main"),
    children: [
      {
        label: "Prospections",
        path: "/prospections",
        icon: createSidebarIcon(SearchIcon, "info.main"),
      },
      {
        label: "Prospections commentaires",
        path: "/prospection-commentaires",
        icon: createSidebarIcon(CommentIcon, "info.main"),
      },
      {
        label: "Partenaires",
        path: "/partenaires",
        icon: createSidebarIcon(BusinessIcon, "info.main"),
      },
      {
        label: "Contrats CERFA",
        path: "/cerfa",
        icon: createSidebarIcon(DescriptionIcon, "info.main"),
      },
      {
        label: "Appairage",
        path: "/appairages",
        icon: createSidebarIcon(WorkIcon, "info.main"),
      },
      {
        label: "Appairages commentaires",
        path: "/appairage-commentaires",
        icon: createSidebarIcon(CommentIcon, "info.main"),
      },
      {
        label: "Candidats",
        path: "/candidats",
        icon: createSidebarIcon(PeopleIcon, "info.main"),
      },
      {
        label: "Ateliers TRE",
        path: "/ateliers-tre",
        icon: createSidebarIcon(SchoolIcon, "info.main"),
      },
    ],
  },

  /* 🔹 CVThèque (PLACÉ ICI, au bon niveau) */
  {
    label: "CVThèque",
    icon: createSidebarIcon(DescriptionIcon, "primary.main"),
    children: [
      {
        label: "Liste des CV",
        path: "/cvtheque",
        icon: createSidebarIcon(DescriptionIcon, "primary.main"),
      },
      {
        label: "Ajouter un CV",
        path: "/cvtheque/create",
        icon: createSidebarIcon(DescriptionIcon, "primary.main"),
      },
    ],
  },

  /* 🔹 Revue d'offres */
  {
    label: "Revue d’offres",
    icon: createSidebarIcon(FolderIcon, "secondary.main"),
    children: [
      {
        label: "Formations",
        path: "/formations",
        icon: createSidebarIcon(AssignmentIcon, "secondary.main"),
      },
      {
        label: "Commentaires",
        path: "/commentaires",
        icon: createSidebarIcon(CommentIcon, "secondary.main"),
      },
      {
        label: "Documents",
        path: "/documents",
        icon: createSidebarIcon(DescriptionIcon, "secondary.main"),
      },
      {
        label: "Événements",
        path: "/evenements",
        icon: createSidebarIcon(EventIcon, "secondary.main"),
      },
    ],
  },

  /* 🔹 Imports Excel — traces (ImportJob) */
  {
    label: "Historique imports Excel",
    path: "/import-export/jobs",
    icon: createSidebarIcon(HistoryIcon, "primary.main"),
  },

  /* 🔹 Paramètres */
  {
    label: "Paramètres",
    path: "/parametres",
    icon: createSidebarIcon(SettingsIcon, "text.secondary"),
  },
];

/* ────────────────────────────────────────── */
/*       ADAPTATION DYNAMIQUE POUR STAFF      */
/* ────────────────────────────────────────── */

const sidebarRedirectMap: Record<string, [string, string]> = {
  Prospections: ["/prospections", "/prospections/candidat"],
  Partenaires: ["/partenaires", "/partenaires/candidat"],
  "Liste des CV": ["/cvtheque", "/cvtheque/candidat"],
  "Ajouter un CV": ["/cvtheque/create", "/cvtheque/create/candidat"],
};

export function useSidebarItems(): SidebarItem[] {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const isCandidateLike = isCandidateLikeRole(role);
  const isCoreStaff = isCoreStaffRole(role);
  const canAccessPrepa = canAccessPrepaRole(role);
  const canAccessDeclic = canAccessDeclicRole(role);
  const canAccessParametres = isAdminLikeRole(role);

  return useMemo(() => {
    return sidebarItems
      .map((item: SidebarItem) => {
      if (item.label === "Déclic" && !canAccessDeclic) return null;
      if (item.label === "Prépa Comp" && !canAccessPrepa) return null;
      if (item.label === "Paramètres" && !canAccessParametres) return null;

      if (item.label === "CRM" && item.children) {
        const filteredChildren = item.children.filter((child: SidebarItem) => {
          if (isCandidateLike) {
            return ["Prospections", "Partenaires"].includes(child.label);
          }
          return isCoreStaff;
        });
        if (item.label === "CRM" && item.children) {
          return {
            ...item,
            children: filteredChildren.map((child: SidebarItem) => {
              const redirect = sidebarRedirectMap[child.label];
              if (redirect) {
                const [staffPath, candidatPath] = redirect;
                return { ...child, path: isCandidateLike ? candidatPath : staffPath };
              }
              return child;
            }),
          };
        }
      }

      if (item.label === "CVThèque" && item.children) {
        if (!(isCoreStaff || isCandidateLike)) return null;
        return {
          ...item,
          children: item.children.map((child: SidebarItem) => {
            const redirect = sidebarRedirectMap[child.label];
            if (redirect) {
              const [staffPath, candidatPath] = redirect;
              return { ...child, path: isCandidateLike ? candidatPath : staffPath };
            }
            return child;
          }),
        };
      }

      if (item.label === "Revue d’offres") {
        if (!isCoreStaff) return null;
      }
      if (item.label === "Historique imports Excel") {
        if (!isCoreStaff) return null;
      }
      return item;
    })
      .filter((item): item is SidebarItem => item !== null)
      .filter((item) => !item.children || item.children.length > 0);
  }, [
    isCandidateLike,
    isCoreStaff,
    canAccessPrepa,
    canAccessDeclic,
    canAccessParametres,
  ]);
}
