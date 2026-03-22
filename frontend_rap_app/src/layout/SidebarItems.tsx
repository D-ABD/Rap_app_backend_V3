import { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

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
    ],
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

export function useSidebarItems(): SidebarItem[] {
  const { user } = useAuth();
  const isStaff = user?.is_staff || user?.is_superuser || user?.role === "admin";

  const redirectMap: Record<string, [string, string]> = {
    Prospections: ["/prospections", "/prospections/candidat"],
    Partenaires: ["/partenaires", "/partenaires/candidat"],
  };

  return sidebarItems.map((item: SidebarItem) => {
    if (item.label === "CRM" && item.children) {
      return {
        ...item,
        children: item.children.map((child: SidebarItem) => {
          const redirect = redirectMap[child.label];
          if (redirect) {
            const [staffPath, candidatPath] = redirect;
            return { ...child, path: isStaff ? staffPath : candidatPath };
          }
          return child;
        }),
      };
    }
    return item;
  });
}
