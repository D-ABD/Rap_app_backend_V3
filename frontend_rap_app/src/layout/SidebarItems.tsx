import { ReactNode, useMemo } from "react";
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

/* ────────────────────────────────────────── */
/*                MENU LATÉRAL                */
/* ────────────────────────────────────────── */

export const sidebarItems: SidebarItem[] = [
  {
    label: "Accueil",
    path: "/",
    icon: <HomeIcon sx={{ color: "primary.main" }} />,
  },

  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <DashboardIcon sx={{ color: "secondary.main" }} />,
  },

  /* 🔹 Déclic */
  {
    label: "Déclic",
    icon: <EmojiObjectsIcon sx={{ color: "warning.main" }} />,
    children: [
      {
        label: "Séances Déclic",
        path: "/declic",
        icon: <EmojiObjectsIcon sx={{ color: "warning.main" }} />,
      },
      {
        label: "Objectifs Déclic",
        path: "/declic/objectifs",
        icon: <TrackChangesIcon sx={{ color: "warning.main" }} />,
      },
      {
        label: "Participants Déclic",
        path: "/participants-declic",
        icon: <PeopleIcon sx={{ color: "warning.main" }} />,
      },
    ],
  },

  /* 🔹 Prépa Comp */
  {
    label: "Prépa Comp",
    icon: <InsightsIcon sx={{ color: "success.main" }} />,
    children: [
      {
        label: "IC Prépa",
        path: "/prepa/ic",
        icon: <SchoolIcon sx={{ color: "success.main" }} />,
      },
      {
        label: "Atelier1 Prépa",
        path: "/prepa/ateliers",
        icon: <SchoolIcon sx={{ color: "success.main" }} />,
      },
      {
        label: "Stagiaires Prépa",
        path: "/prepa/stagiaires",
        icon: <PeopleIcon sx={{ color: "success.main" }} />,
      },
      {
        label: "Objectifs Prépa",
        path: "/prepa/objectifs",
        icon: <BarChartIcon sx={{ color: "success.main" }} />,
      },
    ],
  },

  /* 🔹 CRM */
  {
    label: "CRM",
    icon: <SearchIcon sx={{ color: "info.main" }} />,
    children: [
      {
        label: "Prospections",
        path: "/prospections",
        icon: <SearchIcon sx={{ color: "info.main" }} />,
      },
      {
        label: "Prospections commentaires",
        path: "/prospection-commentaires",
        icon: <CommentIcon sx={{ color: "info.main" }} />,
      },
      {
        label: "Partenaires",
        path: "/partenaires",
        icon: <BusinessIcon sx={{ color: "info.main" }} />,
      },
      {
        label: "Contrats CERFA",
        path: "/cerfa",
        icon: <DescriptionIcon sx={{ color: "info.main" }} />,
      },
      {
        label: "Appairage",
        path: "/appairages",
        icon: <WorkIcon sx={{ color: "info.main" }} />,
      },
      {
        label: "Appairages commentaires",
        path: "/appairage-commentaires",
        icon: <CommentIcon sx={{ color: "info.main" }} />,
      },
      {
        label: "Candidats",
        path: "/candidats",
        icon: <PeopleIcon sx={{ color: "info.main" }} />,
      },
      {
        label: "Ateliers TRE",
        path: "/ateliers-tre",
        icon: <SchoolIcon sx={{ color: "info.main" }} />,
      },
    ],
  },

  /* 🔹 CVThèque (PLACÉ ICI, au bon niveau) */
  {
    label: "CVThèque",
    icon: <DescriptionIcon sx={{ color: "primary.main" }} />,
    children: [
      {
        label: "Liste des CV",
        path: "/cvtheque",
        icon: <DescriptionIcon fontSize="small" />,
      },
      {
        label: "Ajouter un CV",
        path: "/cvtheque/create",
        icon: <DescriptionIcon fontSize="small" />,
      },
    ],
  },

  /* 🔹 Revue d'offres */
  {
    label: "Revue d’offres",
    icon: <FolderIcon sx={{ color: "secondary.main" }} />,
    children: [
      {
        label: "Formations",
        path: "/formations",
        icon: <AssignmentIcon sx={{ color: "secondary.main" }} />,
      },
      {
        label: "Commentaires",
        path: "/commentaires",
        icon: <CommentIcon sx={{ color: "secondary.main" }} />,
      },
      {
        label: "Documents",
        path: "/documents",
        icon: <DescriptionIcon sx={{ color: "secondary.main" }} />,
      },
      {
        label: "Événements",
        path: "/evenements",
        icon: <EventIcon sx={{ color: "secondary.main" }} />,
      },
    ],
  },

  /* 🔹 Imports Excel — traces (ImportJob) */
  {
    label: "Historique imports Excel",
    path: "/import-export/jobs",
    icon: <HistoryIcon sx={{ color: "primary.main" }} />,
  },

  /* 🔹 Paramètres */
  {
    label: "Paramètres",
    path: "/parametres",
    icon: <SettingsIcon sx={{ color: "grey.600" }} />,
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
