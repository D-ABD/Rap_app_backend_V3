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
import { alpha } from "@mui/material/styles";
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
import { getDrawerItemSx, getTopNavButtonSx } from "./navigationStyles";
import type { AppTheme } from "../theme";

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
  const theme = useTheme<AppTheme>();
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
  const appBarTextColor = theme.palette.common.white;
  const topSurfaceBorderColor = alpha(theme.palette.common.white, theme.palette.mode === "light" ? 0.16 : 0.12);
  const topSurfaceBg = alpha(theme.palette.common.white, theme.palette.mode === "light" ? 0.08 : 0.05);
  const menuPaperSx = {
    mt: 1.25,
    borderRadius: 3,
    minWidth: 220,
    border: "1px solid",
    borderColor: alpha(theme.palette.divider, 0.9),
    backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 0.96 : 0.92),
    backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.04 : 0.1)} 0%, ${alpha(theme.palette.background.paper, 0)} 100%)`,
    backdropFilter: "blur(16px)",
    boxShadow:
      theme.palette.mode === "light"
        ? `0 18px 40px ${alpha(theme.palette.common.black, 0.12)}`
        : `0 24px 52px ${alpha(theme.palette.common.black, 0.34)}`,
    "& .MuiMenuItem-root": {
      borderRadius: 2,
      mx: 0.75,
      my: 0.25,
      minHeight: 40,
      fontSize: "0.92rem",
      transition: "all 180ms ease",
      "&:hover": {
        backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.08 : 0.16),
      },
    },
  } as const;
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: theme.palette.mode === "light"
          ? theme.custom.layout.shell.backgroundGradient.light
          : theme.custom.layout.shell.backgroundGradient.dark,
      }}
    >
      <CssBaseline />

      {/* 🔹 Navbar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: "blur(18px)",
          background: (currentTheme) =>
            currentTheme.palette.mode === "light"
              ? currentTheme.palette.gradients.primary
              : `linear-gradient(135deg, ${alpha(currentTheme.palette.background.paper, 0.96)} 0%, ${alpha(currentTheme.palette.primary.dark, 0.9)} 100%)`,
          color: appBarTextColor,
          borderBottom: (currentTheme) =>
            `1px solid ${alpha(
              currentTheme.palette.mode === "light" ? currentTheme.palette.common.white : currentTheme.palette.primary.light,
              currentTheme.palette.mode === "light" ? 0.18 : 0.16
            )}`,
          boxShadow: (currentTheme) =>
            currentTheme.palette.mode === "light"
              ? `0 16px 38px ${alpha(currentTheme.palette.primary.dark, 0.24)}`
              : `0 16px 40px ${alpha(currentTheme.palette.common.black, 0.3)}`,
        }}
      >
        <Toolbar
          sx={{
            px: { xs: 1.25, sm: 2.25, lg: 3 },
            minHeight: { xs: 64, sm: 72 },
            gap: 1,
          }}
        >
          {/* Bouton menu burger */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleDrawer}
            sx={{
              mr: 0.5,
              width: 42,
              height: 42,
              border: "1px solid",
              borderColor: topSurfaceBorderColor,
              bgcolor: topSurfaceBg,
              "&:hover": {
                bgcolor: (currentTheme) =>
                  alpha(
                    currentTheme.palette.common.white,
                    currentTheme.palette.mode === "light" ? 0.16 : 0.1
                  ),
              },
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo + Titre */}
          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: { xs: 40, sm: 44 },
                height: { xs: 40, sm: 44 },
                mr: 1.25,
                borderRadius: 2.5,
                display: "grid",
                placeItems: "center",
                border: "1px solid",
                borderColor: topSurfaceBorderColor,
                background: (currentTheme) =>
                  currentTheme.palette.mode === "light"
                    ? `linear-gradient(135deg, ${alpha(currentTheme.palette.common.white, 0.18)} 0%, ${alpha(currentTheme.palette.common.white, 0.08)} 100%)`
                    : `linear-gradient(135deg, ${alpha(currentTheme.palette.primary.light, 0.2)} 0%, ${alpha(currentTheme.palette.secondary.main, 0.12)} 100%)`,
                boxShadow: (currentTheme) =>
                  currentTheme.palette.mode === "light"
                    ? `0 10px 24px ${alpha(currentTheme.palette.primary.dark, 0.22)}`
                    : `0 12px 28px ${alpha(currentTheme.palette.common.black, 0.24)}`,
                overflow: "hidden",
              }}
            >
              <Box component="img" src={logo} alt="Logo" sx={{ height: 26, width: "auto" }} />
            </Box>
            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/"
              sx={{
                color: appBarTextColor,
                textDecoration: "none",
                fontWeight: 800,
                fontSize: { xs: "1rem", sm: "1.1rem", lg: "1.18rem" },
                letterSpacing: "-0.02em",
                textShadow:
                  theme.palette.mode === "light"
                    ? `0 1px 2px ${alpha(theme.palette.primary.dark, 0.18)}`
                    : "none",
              }}
            >
              Rap App
            </Typography>
          </Box>

          {/* 🔹 Menu Desktop */}
          {!isMobile && (
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{
                px: 0.75,
                py: 0.5,
                borderRadius: 999,
                border: "1px solid",
                borderColor: topSurfaceBorderColor,
                bgcolor: topSurfaceBg,
              }}
            >
              <Button color="inherit" component={Link} to="/" sx={getTopNavButtonSx(theme, isActive("/"))}>
                Accueil
              </Button>
              <Button color="inherit" component={Link} to="/dashboard" sx={getTopNavButtonSx(theme, isActive("/dashboard"))}>
                Dashboard
              </Button>

              {/* Déclic */}
              {canSeeDeclic && (
                <>
                  <Button
                    color="inherit"
                    onClick={(e) => setAnchorDeclic(e.currentTarget)}
                    endIcon={<EmojiObjectsIcon />}
                    sx={getTopNavButtonSx(theme, isActive("/declic"))}
                  >
                    Déclic
                  </Button>
                  <Menu
                    anchorEl={anchorDeclic}
                    open={Boolean(anchorDeclic)}
                    onClose={() => setAnchorDeclic(null)}
                    PaperProps={{ sx: menuPaperSx }}
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
                    sx={getTopNavButtonSx(theme, isActive("/prepa"))}
                  >
                    Prépa Comp
                  </Button>
                  <Menu
                    anchorEl={anchorPrepa}
                    open={Boolean(anchorPrepa)}
                    onClose={() => setAnchorPrepa(null)}
                    PaperProps={{ sx: menuPaperSx }}
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
                sx={getTopNavButtonSx(theme, isActive("/cvtheque"))}
              >
                CVThèque
              </Button>
              <Menu
                anchorEl={anchorCvtheque}
                open={Boolean(anchorCvtheque)}
                onClose={() => setAnchorCvtheque(null)}
                PaperProps={{ sx: menuPaperSx }}
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
                sx={getTopNavButtonSx(theme, isActive("/prospections") || isActive("/partenaires") || isActive("/cerfa") || isActive("/appairages") || isActive("/candidats") || isActive("/ateliers-tre"))}
              >
                CRM
              </Button>
              <Menu
                anchorEl={anchorCrm}
                open={Boolean(anchorCrm)}
                onClose={() => setAnchorCrm(null)}
                PaperProps={{ sx: menuPaperSx }}
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
                    sx={getTopNavButtonSx(theme, isActive("/formations") || isActive("/commentaires") || isActive("/documents") || isActive("/evenements"))}
                  >
                    Revue d&apos;offres
                  </Button>
                  <Menu
                    anchorEl={anchorRevue}
                    open={Boolean(anchorRevue)}
                    onClose={() => setAnchorRevue(null)}
                    PaperProps={{ sx: menuPaperSx }}
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

              <Button color="inherit" component={Link} to="/about" sx={getTopNavButtonSx(theme, isActive("/about"))}>
                À propos
              </Button>
              {canSeeParametres && (
                <Button color="inherit" component={Link} to="/parametres" sx={getTopNavButtonSx(theme, isActive("/parametres"))}>
                  Paramètres
                </Button>
              )}
            </Stack>
          )}

          {/* Toggle thème */}
          <IconButton
            color="inherit"
            onClick={toggleTheme}
            sx={{
              ml: { xs: 0.25, sm: 0.5 },
              width: 42,
              height: 42,
              border: "1px solid",
              borderColor: topSurfaceBorderColor,
              bgcolor: topSurfaceBg,
              "&:hover": {
                bgcolor: (currentTheme) =>
                  alpha(
                    currentTheme.palette.common.white,
                    currentTheme.palette.mode === "light" ? 0.16 : 0.1
                  ),
              },
            }}
          >
            {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          {/* Auth */}
          {isAuthenticated ? (
            <>
              <IconButton
                color="inherit"
                onClick={(e) => setAnchorUser(e.currentTarget)}
                sx={{
                  width: 42,
                  height: 42,
                  border: "1px solid",
                  borderColor: topSurfaceBorderColor,
                  bgcolor: topSurfaceBg,
                  "&:hover": {
                    bgcolor: (currentTheme) =>
                      alpha(
                        currentTheme.palette.common.white,
                        currentTheme.palette.mode === "light" ? 0.16 : 0.1
                      ),
                  },
                }}
              >
                <AccountCircle />
              </IconButton>
              <Menu
                anchorEl={anchorUser}
                open={Boolean(anchorUser)}
                onClose={() => setAnchorUser(null)}
                PaperProps={{ sx: menuPaperSx }}
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
              sx={{
                fontSize: { xs: "0.8rem", sm: "0.95rem" },
                borderRadius: 999,
                border: "1px solid",
                borderColor: topSurfaceBorderColor,
                px: 1.5,
                bgcolor: topSurfaceBg,
              }}
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
            borderRight: (currentTheme) => `1px solid ${alpha(currentTheme.palette.divider, 0.95)}`,
            borderTopRightRadius: 24,
            borderBottomRightRadius: 24,
            background: (currentTheme) =>
              currentTheme.palette.mode === "light"
                ? `linear-gradient(180deg, ${alpha(currentTheme.palette.common.white, 0.99)} 0%, ${alpha(currentTheme.palette.background.default, 0.98)} 100%)`
                : `linear-gradient(180deg, ${alpha(currentTheme.palette.background.paper, 0.98)} 0%, ${alpha(currentTheme.palette.primary.dark, 0.24)} 100%)`,
            boxShadow: (currentTheme) =>
              currentTheme.palette.mode === "light"
                ? `0 24px 48px ${alpha(currentTheme.palette.common.black, 0.14)}`
                : `0 28px 60px ${alpha(currentTheme.palette.common.black, 0.34)}`,
            backdropFilter: "blur(18px)",
            overflowX: "hidden",
          },
        }}
      >
        <Toolbar />
        <Box
          sx={{
            px: 2,
            pt: 2,
            pb: 1,
            display: "flex",
            alignItems: "center",
            gap: 1.25,
          }}
        >
          <Box
            component="img"
            src={logo}
            alt="Logo"
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              p: 0.75,
              bgcolor: (currentTheme) => alpha(currentTheme.palette.primary.main, currentTheme.palette.mode === "light" ? 0.1 : 0.18),
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
              RAP App
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Navigation principale
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mx: 2 }} />
        <List sx={{ px: 1.25, py: 1.25 }}>
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
                sx={getDrawerItemSx(theme)}
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
                        sx={getDrawerItemSx(theme, true)}
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
          px: {
            xs: theme.custom.layout.main.paddingX.xs,
            sm: theme.custom.layout.main.paddingX.sm,
            lg: theme.custom.layout.main.paddingX.md,
          },
          pt: { xs: 8.5, sm: 10 },
          pb: { xs: 2, sm: 3 },
          color: (currentTheme) => currentTheme.palette.text.primary,
          transition: "background-color 0.3s ease",
        }}
      >
        <Box sx={{ maxWidth: 1600, mx: "auto", width: "100%" }}>
          <AppBreadcrumbs pathname={location.pathname} />

          <Box
            sx={{
              minHeight: "calc(100vh - 172px)",
              px: { xs: 0.25, sm: 0.5 },
              backdropFilter: {
                xs: theme.custom.layout.main.backdropBlur.sm,
                sm: theme.custom.layout.main.backdropBlur.md,
                lg: theme.custom.layout.main.backdropBlur.lg,
              },
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>

      {/* 🔹 Footer */}
      <Box sx={{ px: { xs: 0, sm: 0.75 }, pb: { xs: 0, sm: 0.75 } }}>
        <Footer />
      </Box>
    </Box>
  );
}
