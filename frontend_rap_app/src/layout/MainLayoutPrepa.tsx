import { useState, useContext } from "react";
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
  Paper,
  Breadcrumbs,
  Link as MuiLink,
  Button,
  Stack,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeContext } from "../contexts/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { breadcrumbLabels } from "src/utils/breadcrumbLabels";
import logo from "../assets/logo.png";
import Footer from "./footer";

const drawerWidth = 240;

export default function MainLayoutPrepa() {
  const [open, setOpen] = useState(false);
  const [anchorUser, setAnchorUser] = useState<null | HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const { user, isAuthenticated, logout } = useAuth();

  // ✅ Thème global (dark/light)
  const themeContext = useContext(ThemeContext);
  if (!themeContext) {
    throw new Error("MainLayoutPrepa doit être utilisé dans un <ThemeProvider>");
  }
  const { mode, toggleTheme } = themeContext;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const toggleDrawer = () => setOpen(!open);
  const isActive = (path: string) => location.pathname.startsWith(path);
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const pathnames = location.pathname.split("/").filter((x) => x);

  const menuItems = [
    { label: "Dashboard Prépa", path: "/dashboard/prepa", icon: <HomeIcon /> },
    { label: "IC Prépa", path: "/prepa/ic", icon: <SchoolRoundedIcon /> },
    { label: "Ateliers 1 Prépa", path: "/prepa/ateliers", icon: <SchoolRoundedIcon /> },
    { label: "Mon profil", path: "/mon-profil", icon: <AccountCircleIcon /> },
  ];

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
          {/* Menu burger (mobile) */}
          <IconButton color="inherit" edge="start" onClick={toggleDrawer} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>

          {/* Logo + titre */}
          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
            <img src={logo} alt="Logo" style={{ height: 28, marginRight: 8 }} />
            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/dashboard/prepa"
              sx={{
                color: "inherit",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: { xs: "1rem", sm: "1.1rem" },
              }}
            >
              Prépa Comp – RAP_APP
            </Typography>

            {/* 🔹 Menu horizontal Desktop */}
            {!isMobile && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 3 }}>
                {menuItems.map((item) => (
                  <Button
                    key={item.path}
                    component={Link}
                    to={item.path}
                    color="inherit"
                    sx={{
                      textTransform: "none",
                      fontWeight: isActive(item.path) ? 700 : 500,
                      borderBottom: isActive(item.path)
                        ? "2px solid white"
                        : "2px solid transparent",
                      "&:hover": { borderBottom: "2px solid white" },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            )}
          </Box>

          {/* 🔹 Toggle dark/light */}
          <IconButton color="inherit" onClick={toggleTheme}>
            {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          {/* 🔹 Menu utilisateur */}
          {isAuthenticated ? (
            <>
              <IconButton color="inherit" onClick={(e) => setAnchorUser(e.currentTarget)}>
                <AccountCircleIcon />
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
                  <AccountCircleIcon fontSize="small" /> &nbsp;Mon profil
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon fontSize="small" /> &nbsp;Déconnexion
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/login">
              Connexion
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* 🔹 Drawer (menu latéral - mobile) */}
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
          {menuItems.map((item) => (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              selected={isActive(item.path)}
              onClick={toggleDrawer}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
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
        {/* Fil d’Ariane */}
        <Paper sx={{ mb: 2, p: 1 }}>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
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
        <Footer />
      </Box>
    </Box>
  );
}
