// src/layout/MainLayout.tsx
import { useState, useEffect, useContext, useCallback } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  Box,
  Divider,
  Collapse,
  Button,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Stack,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";

import MenuIcon from "@mui/icons-material/Menu";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import AccountCircle from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import SearchIcon from "@mui/icons-material/Search";
import FolderIcon from "@mui/icons-material/Folder";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import {
  canAccessDeclicRole,
  canAccessPrepaRole,
  isAdminLikeRole,
  isCoreStaffRole,
  normalizeRole,
} from "../utils/roleGroups";
import EmojiObjectsIcon from "@mui/icons-material/EmojiObjects";
import InsightsIcon from "@mui/icons-material/Insights";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import SchoolIcon from "@mui/icons-material/School";
import BarChartIcon from "@mui/icons-material/BarChart";
import EventIcon from "@mui/icons-material/Event";

import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";

import { useSidebarItems } from "./SidebarItems";
import { useAuth } from "../hooks/useAuth";
import { ThemeContext } from "../contexts/ThemeContext";
import logo from "../assets/logo.png";
import Footer from "./footer";
import AppBreadcrumbs from "../components/layout/AppBreadcrumbs";
import { getDrawerItemSx } from "./navigationStyles";

const drawerWidth = 240;

export default function MainLayout() {
  const [open, setOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState<Record<string, boolean>>({});
  const [anchorCrm, setAnchorCrm] = useState<null | HTMLElement>(null);
  const [anchorRevue, setAnchorRevue] = useState<null | HTMLElement>(null);
  const [anchorDeclic, setAnchorDeclic] = useState<null | HTMLElement>(null);
  const [anchorPrepa, setAnchorPrepa] = useState<null | HTMLElement>(null);
  const [anchorUser, setAnchorUser] = useState<null | HTMLElement>(null);
  const [anchorCvtheque, setAnchorCvtheque] = useState<null | HTMLElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const { user, isAuthenticated, logout } = useAuth();
  const sidebarItems = useSidebarItems();

  // ✅ Contexte thème
  const themeContext = useContext(ThemeContext);
  if (!themeContext) {
    throw new Error("MainLayout doit être utilisé dans un <ThemeProvider>");
  }
  const { mode, toggleTheme } = themeContext;

  // ✅ Responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const toggleDrawer = () => setOpen((prev) => !prev);
  const toggleSubmenu = (label: string) => {
    setSubmenuOpen((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // ✅ Correction du warning ESLint — fonction mémorisée
  const isActive = useCallback(
    (path?: string) => !!path && location.pathname.startsWith(path),
    [location.pathname]
  );

  // Auto-ouverture des sous-menus si actif (sidebarItems doit être stable → useMemo dans useSidebarItems)
  useEffect(() => {
    const newState: Record<string, boolean> = {};
    sidebarItems.forEach((item) => {
      if (item.children?.some((child) => isActive(child.path))) {
        newState[item.label] = true;
      }
    });
    setSubmenuOpen((prev) => {
      let changed = false;
      for (const [k, v] of Object.entries(newState)) {
        if (prev[k] !== v) {
          changed = true;
          break;
        }
      }
      if (!changed) return prev;
      return { ...prev, ...newState };
    });
  }, [location.pathname, isActive, sidebarItems]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const role = normalizeRole(user?.role);
  const isCoreStaff = isCoreStaffRole(role);
  const canSeeDeclic = canAccessDeclicRole(role);
  const canSeePrepa = canAccessPrepaRole(role);
  const canSeeParametres = isAdminLikeRole(role);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <CssBaseline />

      {/* 🔹 Navbar */}
      <AppBar
        position="fixed"
        elevation={3}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: "blur(8px)",
          background: (theme) =>
            theme.palette.mode === "light" ? "rgba(25, 118, 210, 0.9)" : "rgba(18,18,18,0.9)",
        }}
      >
        <Toolbar sx={{ px: { xs: 1, sm: 2 }, minHeight: 56 }}>
          {/* Bouton menu burger */}
          <IconButton color="inherit" edge="start" onClick={toggleDrawer} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>

          {/* Logo + Titre */}
          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
            <img src={logo} alt="Logo" style={{ height: 28, marginRight: 8 }} />
            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/"
              sx={{
                color: "inherit",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: { xs: "1rem", sm: "1.1rem" },
              }}
            >
              Rap App
            </Typography>
          </Box>

          {/* 🔹 Menu Desktop */}
          {!isMobile && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button color="inherit" component={Link} to="/">
                Accueil
              </Button>
              <Button color="inherit" component={Link} to="/dashboard">
                Dashboard
              </Button>

              {/* Déclic */}
              {canSeeDeclic && (
                <>
                  <Button
                    color="inherit"
                    onClick={(e) => setAnchorDeclic(e.currentTarget)}
                    endIcon={<EmojiObjectsIcon />}
                  >
                    Déclic
                  </Button>
                  <Menu
                    anchorEl={anchorDeclic}
                    open={Boolean(anchorDeclic)}
                    onClose={() => setAnchorDeclic(null)}
                    PaperProps={{ sx: { borderRadius: 2, boxShadow: 3, mt: 1 } }}
                  >
                    <MenuItem component={Link} to="/declic" onClick={() => setAnchorDeclic(null)}>
                      <EmojiObjectsIcon fontSize="small" sx={{ mr: 1 }} /> Séances Déclic
                    </MenuItem>
                    <MenuItem
                      component={Link}
                      to="/declic/objectifs"
                      onClick={() => setAnchorDeclic(null)}
                    >
                      <TrackChangesIcon fontSize="small" sx={{ mr: 1 }} /> Objectifs Déclic
                    </MenuItem>
                  </Menu>
                </>
              )}

              {/* Prépa Comp */}
              {canSeePrepa && (
                <>
                  <Button
                    color="inherit"
                    onClick={(e) => setAnchorPrepa(e.currentTarget)}
                    endIcon={<InsightsIcon />}
                  >
                    Prépa Comp
                  </Button>
                  <Menu
                    anchorEl={anchorPrepa}
                    open={Boolean(anchorPrepa)}
                    onClose={() => setAnchorPrepa(null)}
                    PaperProps={{ sx: { borderRadius: 2, boxShadow: 3, mt: 1 } }}
                  >
                    <MenuItem component={Link} to="/prepa/ic" onClick={() => setAnchorPrepa(null)}>
                      <SchoolIcon fontSize="small" sx={{ mr: 1 }} /> IC Prépa
                    </MenuItem>
                    <MenuItem
                      component={Link}
                      to="/prepa/ateliers"
                      onClick={() => setAnchorPrepa(null)}
                    >
                      <SchoolIcon fontSize="small" sx={{ mr: 1 }} /> Ateliers Prépa
                    </MenuItem>
                    <MenuItem
                      component={Link}
                      to="/prepa/stagiaires"
                      onClick={() => setAnchorPrepa(null)}
                    >
                      <SchoolIcon fontSize="small" sx={{ mr: 1 }} /> Stagiaires Prépa
                    </MenuItem>

                    <MenuItem
                      component={Link}
                      to="/prepa/objectifs"
                      onClick={() => setAnchorPrepa(null)}
                    >
                      <BarChartIcon fontSize="small" sx={{ mr: 1 }} /> objectifs Prépa
                    </MenuItem>
                  </Menu>
                </>
              )}

              {/* CVThèque */}
              <Button
                color="inherit"
                onClick={(e) => setAnchorCvtheque(e.currentTarget)}
                endIcon={<DescriptionIcon />}
              >
                CVThèque
              </Button>
              <Menu
                anchorEl={anchorCvtheque}
                open={Boolean(anchorCvtheque)}
                onClose={() => setAnchorCvtheque(null)}
                PaperProps={{ sx: { borderRadius: 2, boxShadow: 3, mt: 1 } }}
              >
                <MenuItem
                  component={Link}
                  to="/cvtheque"
                  onClick={() => setAnchorCvtheque(null)}
                >
                  <DescriptionIcon fontSize="small" sx={{ mr: 1 }} /> Liste des CV
                </MenuItem>

                <MenuItem
                  component={Link}
                  to="/cvtheque/create"
                  onClick={() => setAnchorCvtheque(null)}
                >
                  <DescriptionIcon fontSize="small" sx={{ mr: 1 }} /> Ajouter un CV
                </MenuItem>
              </Menu>

              {/* CRM */}
              <Button
                color="inherit"
                onClick={(e) => setAnchorCrm(e.currentTarget)}
                endIcon={<SearchIcon />}
              >
                CRM
              </Button>
              <Menu
                anchorEl={anchorCrm}
                open={Boolean(anchorCrm)}
                onClose={() => setAnchorCrm(null)}
                PaperProps={{ sx: { borderRadius: 2, boxShadow: 3, mt: 1 } }}
              >
                <MenuItem component={Link} to="/prospections">
                  Prospections
                </MenuItem>
                <MenuItem component={Link} to="/prospection-commentaires">
                  Prospections commentaires
                </MenuItem>
                <MenuItem component={Link} to="/partenaires">
                  Partenaires
                </MenuItem>
                <MenuItem component={Link} to="/cerfa">
                    Contrats CERFA
                </MenuItem>

                {isCoreStaff && (
                  <>
                    <MenuItem component={Link} to="/appairages">
                      Appairage
                    </MenuItem>
                    <MenuItem component={Link} to="/appairage-commentaires">
                      Appairages commentaires
                    </MenuItem>
                    <MenuItem component={Link} to="/candidats">
                      Candidats
                    </MenuItem>
                    <MenuItem component={Link} to="/ateliers-tre">
                      Ateliers TRE
                    </MenuItem>
                  </>
                )}
              </Menu>

              {/* Revue d’offres */}
              {isCoreStaff && (
                <>
                  <Button
                    color="inherit"
                    onClick={(e) => setAnchorRevue(e.currentTarget)}
                    endIcon={<FolderIcon />}
                  >
                    Revue d&apos;offres
                  </Button>
                  <Menu
                    anchorEl={anchorRevue}
                    open={Boolean(anchorRevue)}
                    onClose={() => setAnchorRevue(null)}
                    PaperProps={{
                      sx: { borderRadius: 2, boxShadow: 3, mt: 1 },
                    }}
                  >
                    <MenuItem component={Link} to="/formations">
                      Formations
                    </MenuItem>
                    <MenuItem component={Link} to="/commentaires">
                      Commentaires
                    </MenuItem>
                    <MenuItem component={Link} to="/documents">
                      Documents
                    </MenuItem>
                    <MenuItem component={Link} to="/evenements">
                      <EventIcon fontSize="small" sx={{ mr: 1 }} /> Événements
                    </MenuItem>
                  </Menu>
                </>
              )}

              <Button color="inherit" component={Link} to="/about">
                À propos
              </Button>
              {canSeeParametres && (
                <Button color="inherit" component={Link} to="/parametres">
                  Paramètres
                </Button>
              )}
            </Stack>
          )}

          {/* Toggle thème */}
          <IconButton color="inherit" onClick={toggleTheme}>
            {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          {/* Auth */}
          {isAuthenticated ? (
            <>
              <IconButton color="inherit" onClick={(e) => setAnchorUser(e.currentTarget)}>
                <AccountCircle />
              </IconButton>
              <Menu
                anchorEl={anchorUser}
                open={Boolean(anchorUser)}
                onClose={() => setAnchorUser(null)}
                PaperProps={{ sx: { borderRadius: 2, boxShadow: 3, mt: 1 } }}
              >
                <MenuItem disabled>{user?.username || user?.email}</MenuItem>
                {user?.role && <MenuItem disabled>🎭 Rôle : {user.role}</MenuItem>}
                <MenuItem component={Link} to="/mon-profil" onClick={() => setAnchorUser(null)}>
                  <AccountCircle fontSize="small" /> &nbsp;Mon profil
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon fontSize="small" /> &nbsp;Déconnexion
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              color="inherit"
              component={Link}
              to="/login"
              startIcon={<LoginIcon />}
              sx={{ fontSize: { xs: "0.8rem", sm: "1rem" } }}
            >
              Connexion
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* 🔹 Sidebar Drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={toggleDrawer}
        ModalProps={{ keepMounted: true }}
        sx={{
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: (theme) => `1px solid ${theme.palette.divider}`,
            borderTopRightRadius: 12,
            borderBottomRightRadius: 12,
          },
        }}
      >
        <Toolbar />
        <Divider />
        <List>
          {sidebarItems.map((item) => (
            <Box key={item.label}>
              <ListItemButton
                component={item.path ? Link : "div"}
                to={item.path || ""}
                selected={isActive(item.path)}
                onClick={() => {
                  if (item.children) toggleSubmenu(item.label);
                  if (item.path) toggleDrawer();
                }}
                sx={getDrawerItemSx()}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
                {item.children && (submenuOpen[item.label] ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>

              {item.children && (
                <Collapse in={submenuOpen[item.label]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.label}
                        sx={getDrawerItemSx(true)}
                        component={Link}
                        to={child.path || ""}
                        selected={isActive(child.path)}
                        onClick={toggleDrawer}
                      >
                        <ListItemIcon>{child.icon}</ListItemIcon>
                        <ListItemText primary={child.label} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              )}
            </Box>
          ))}
        </List>
      </Drawer>

      {/* 🔹 Contenu principal */}
      <Box
        component="main"
        sx={{
          flex: 1,
          p: { xs: 2, sm: 3 },
          mt: { xs: 7, sm: 8 },
          backgroundColor: (theme) => theme.palette.background.default,
          color: (theme) => theme.palette.text.primary,
          transition: "background-color 0.3s ease",
        }}
      >
        <AppBreadcrumbs pathname={location.pathname} />

        <Outlet />
      </Box>

      {/* 🔹 Footer */}
      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: "center",
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          backgroundColor: (theme) => theme.palette.background.paper,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          <Footer />
        </Typography>
      </Box>
    </Box>
  );
}
