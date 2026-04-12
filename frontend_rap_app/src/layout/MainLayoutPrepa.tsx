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
  Button,
  Stack,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeContext } from "../contexts/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import logo from "../assets/logo.png";
import Footer from "./footer";
import AppBreadcrumbs from "../components/layout/AppBreadcrumbs";
import { getDrawerItemSx, getTopNavButtonSx } from "./navigationStyles";

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
  const menuItems = [
    { label: "Dashboard Prépa", path: "/dashboard/prepa", icon: <HomeIcon /> },
    { label: "IC Prépa", path: "/prepa/ic", icon: <SchoolRoundedIcon /> },
    { label: "Ateliers Prépa", path: "/prepa/ateliers", icon: <SchoolRoundedIcon /> },
    { label: "Stagiaires Prépa", path: "/prepa/stagiaires", icon: <SchoolRoundedIcon /> },
    { label: "Mon profil", path: "/mon-profil", icon: <AccountCircleIcon /> },
  ];
  const appBarTextColor = theme.palette.common.white;
  const topSurfaceBorderColor = alpha(
    theme.palette.common.white,
    theme.palette.mode === "light" ? 0.16 : 0.12
  );
  const topSurfaceBg = alpha(
    theme.palette.common.white,
    theme.palette.mode === "light" ? 0.08 : 0.05
  );

  const menuPaperSx = {
    mt: 1.25,
    borderRadius: 3,
    minWidth: 220,
    border: "1px solid",
    borderColor: alpha(theme.palette.divider, 0.9),
    backgroundColor: alpha(
      theme.palette.background.paper,
      theme.palette.mode === "light" ? 0.96 : 0.92
    ),
    backgroundImage: `linear-gradient(180deg, ${alpha(
      theme.palette.primary.main,
      theme.palette.mode === "light" ? 0.04 : 0.1
    )} 0%, ${alpha(theme.palette.background.paper, 0)} 100%)`,
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
        backgroundColor: alpha(
          theme.palette.primary.main,
          theme.palette.mode === "light" ? 0.08 : 0.16
        ),
      },
    },
  } as const;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: (currentTheme) =>
          currentTheme.palette.mode === "light"
            ? `radial-gradient(circle at top, ${alpha(
                currentTheme.palette.primary.main,
                0.08
              )} 0%, transparent 34%), ${currentTheme.palette.background.default}`
            : `radial-gradient(circle at top, ${alpha(
                currentTheme.palette.primary.main,
                0.22
              )} 0%, transparent 28%), linear-gradient(180deg, ${alpha(
                currentTheme.palette.common.black,
                0.18
              )} 0%, transparent 24%), ${currentTheme.palette.background.default}`,
      }}
    >
      <CssBaseline />

      {/* 🔹 Navbar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (currentTheme) => currentTheme.zIndex.drawer + 1,
          backdropFilter: "blur(18px)",
          background: (currentTheme) =>
            currentTheme.palette.mode === "light"
              ? currentTheme.palette.gradients.primary
              : `linear-gradient(135deg, ${alpha(
                  currentTheme.palette.background.paper,
                  0.96
                )} 0%, ${alpha(currentTheme.palette.primary.dark, 0.9)} 100%)`,
          color: appBarTextColor,
          borderBottom: (currentTheme) =>
            `1px solid ${alpha(
              currentTheme.palette.mode === "light"
                ? currentTheme.palette.common.white
                : currentTheme.palette.primary.light,
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
          {/* Menu burger (mobile) */}
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

          {/* Logo + titre */}
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
                    ? `linear-gradient(135deg, ${alpha(
                        currentTheme.palette.common.white,
                        0.18
                      )} 0%, ${alpha(currentTheme.palette.common.white, 0.08)} 100%)`
                    : `linear-gradient(135deg, ${alpha(
                        currentTheme.palette.primary.light,
                        0.2
                      )} 0%, ${alpha(currentTheme.palette.secondary.main, 0.12)} 100%)`,
                boxShadow: (currentTheme) =>
                  currentTheme.palette.mode === "light"
                    ? `0 10px 24px ${alpha(
                        currentTheme.palette.primary.dark,
                        0.22
                      )}`
                    : `0 12px 28px ${alpha(
                        currentTheme.palette.common.black,
                        0.24
                      )}`,
                overflow: "hidden",
              }}
            >
              <Box component="img" src={logo} alt="Logo" sx={{ height: 26, width: "auto" }} />
            </Box>
            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/dashboard/prepa"
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
              Prépa Comp – RAP_APP
            </Typography>

            {/* 🔹 Menu horizontal Desktop */}
            {!isMobile && (
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{
                  ml: 3,
                  px: 0.75,
                  py: 0.5,
                  borderRadius: 999,
                  border: "1px solid",
                  borderColor: topSurfaceBorderColor,
                  bgcolor: topSurfaceBg,
                }}
              >
                {menuItems.map((item) => (
                  <Button
                    key={item.path}
                    component={Link}
                    to={item.path}
                    color="inherit"
                    sx={getTopNavButtonSx(isActive(item.path))}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            )}
          </Box>

          {/* 🔹 Toggle dark/light */}
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

          {/* 🔹 Menu utilisateur */}
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
                <AccountCircleIcon />
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
                  <AccountCircleIcon fontSize="small" /> &nbsp;Mon profil
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
              bgcolor: (currentTheme) =>
                alpha(currentTheme.palette.primary.main, currentTheme.palette.mode === "light" ? 0.1 : 0.18),
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
              Prépa Comp
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Navigation principale
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mx: 2 }} />
        <List sx={{ px: 1.25, py: 1.25 }}>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              selected={isActive(item.path)}
              onClick={toggleDrawer}
              sx={getDrawerItemSx()}
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
          px: { xs: 1.5, sm: 2.5, lg: 3.5 },
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
