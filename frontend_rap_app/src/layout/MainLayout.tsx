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
  Breadcrumbs,
  Link as MuiLink,
  Stack,
  Paper,
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
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import HomeIcon from "@mui/icons-material/Home";
import EmojiObjectsIcon from "@mui/icons-material/EmojiObjects";
import InsightsIcon from "@mui/icons-material/Insights";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import SchoolIcon from "@mui/icons-material/School";
import BarChartIcon from "@mui/icons-material/BarChart";

import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";

import { sidebarItems } from "./SidebarItems";
import { useAuth } from "../hooks/useAuth";
import { ThemeContext } from "../contexts/ThemeContext";
import logo from "../assets/logo.png";
import { breadcrumbLabels } from "../utils/breadcrumbLabels";
import Footer from "./footer";

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

  // Auto-ouverture des sous-menus si actif
  useEffect(() => {
    const newState: Record<string, boolean> = {};
    sidebarItems.forEach((item) => {
      if (item.children?.some((child) => isActive(child.path))) {
        newState[item.label] = true;
      }
    });
    setSubmenuOpen((prev) => ({ ...prev, ...newState }));
  }, [location.pathname, isActive]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const canSeeAdvanced =
    !!user &&
    (user.is_superuser === true ||
      user.is_staff === true ||
      ["admin", "superadmin", "staff", "staff_read"].includes((user.role ?? "").toLowerCase()));

  // ✅ Fil d’Ariane
  const pathnames = location.pathname.split("/").filter((x) => x);

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

              {/* Prépa Comp */}
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
                  <SchoolIcon fontSize="small" sx={{ mr: 1 }} /> Ateliers1 Prépa
                </MenuItem>

                <MenuItem
                  component={Link}
                  to="/prepa/objectifs"
                  onClick={() => setAnchorPrepa(null)}
                >
                  <BarChartIcon fontSize="small" sx={{ mr: 1 }} /> objectifs Prépa
                </MenuItem>
              </Menu>

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
                {/*
  <MenuItem component={Link} to="/cerfa">Contrats CERFA</MenuItem> 
  */}

                {canSeeAdvanced && (
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
              {canSeeAdvanced && (
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
                  </Menu>
                </>
              )}

              <Button color="inherit" component={Link} to="/about">
                À propos
              </Button>
              <Button color="inherit" component={Link} to="/parametres">
                Paramètres
              </Button>
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
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  "&.Mui-selected": {
                    backgroundColor: (theme) =>
                      theme.palette.mode === "light" ? "#e3f2fd" : "#333",
                    "& .MuiListItemIcon-root, & .MuiListItemText-primary": {
                      fontWeight: "bold",
                      color: (theme) => theme.palette.primary.main,
                    },
                  },
                  "&:hover": {
                    backgroundColor: (theme) =>
                      theme.palette.mode === "light" ? "#f5f5f5" : "#2a2a2a",
                  },
                }}
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
                        sx={{ pl: 4 }}
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
          backgroundColor: (theme) => (theme.palette.mode === "light" ? "#f9f9f9" : "#121212"),
          transition: "background-color 0.3s ease",
        }}
      >
        {/* ✅ Fil d’Ariane */}
        <Paper
          elevation={0}
          sx={{
            mb: 2,
            p: 1,
            borderRadius: 1,
            bgcolor: (theme) => (theme.palette.mode === "light" ? "#fff" : "#1e1e1e"),
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <Breadcrumbs aria-label="breadcrumb" separator={<NavigateNextIcon fontSize="small" />}>
            <MuiLink component={Link} to="/" underline="hover" color="inherit">
              <HomeIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: "middle" }} />
              Accueil
            </MuiLink>
            {pathnames.map((value, index) => {
              const to = `/${pathnames.slice(0, index + 1).join("/")}`;
              const isLast = index === pathnames.length - 1;
              const label =
                breadcrumbLabels[value] ?? value.charAt(0).toUpperCase() + value.slice(1);

              return isLast ? (
                <Typography key={to} color="text.primary">
                  {label}
                </Typography>
              ) : (
                <MuiLink key={to} component={Link} underline="hover" color="inherit" to={to}>
                  {label}
                </MuiLink>
              );
            })}
          </Breadcrumbs>
        </Paper>

        <Outlet />
      </Box>

      {/* 🔹 Footer */}
      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: "center",
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          backgroundColor: (theme) => (theme.palette.mode === "light" ? "#fafafa" : "#1a1a1a"),
        }}
      >
        <Typography variant="caption" color="text.secondary">
          <Footer />
        </Typography>
      </Box>
    </Box>
  );
}
