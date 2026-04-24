import { useState, useContext, useEffect } from "react";
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
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Stack,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import DescriptionIcon from "@mui/icons-material/Description";
import InfoIcon from "@mui/icons-material/Info";
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircle from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CommentIcon from "@mui/icons-material/Comment";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupIcon from "@mui/icons-material/Group";

import { Link, useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ThemeContext } from "../contexts/ThemeContext";
import logo from "../assets/logo.png";
import Footer from "./footer";
import AppBreadcrumbs from "../components/layout/AppBreadcrumbs";
import { getDrawerItemSx, getTopNavButtonSx } from "./navigationStyles";
import type { AppTheme } from "../theme";

const drawerWidth = 240;

export default function MainLayoutCandidat() {
  const [open, setOpen] = useState(false);
  const [anchorUser, setAnchorUser] = useState<null | HTMLElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const themeContext = useContext(ThemeContext);
  if (!themeContext) {
    throw new Error("MainLayoutCandidat doit être utilisé dans un <ThemeProvider>");
  }
  const { mode, toggleTheme } = themeContext;

  const theme = useTheme<AppTheme>();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const openDrawer = () => setOpen(true);
  const closeDrawer = () => setOpen(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    closeDrawer();
    setAnchorUser(null);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname.startsWith(path);

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
        background: theme.palette.mode === "light"
          ? theme.custom.layout.shell.backgroundGradient.light
          : theme.custom.layout.shell.backgroundGradient.dark,
      }}
    >
      <CssBaseline />

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
          <IconButton
            color="inherit"
            edge="start"
            onClick={openDrawer}
            sx={{
              mr: 0.5,
              width: 42,
              height: 42,
              border: "1px solid",
              borderColor: topSurfaceBorderColor,
              bgcolor: topSurfaceBg,
              display: { xs: "flex", md: "none" },
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
              component={Link}
              to="/"
              noWrap
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
              <Button
                color="inherit"
                component={Link}
                to="/dashboard"
                sx={getTopNavButtonSx(theme, isActive("/dashboard"))}
              >
                Dashboard
              </Button>

              <Button
                color="inherit"
                component={Link}
                to="/prospections/candidat"
                sx={getTopNavButtonSx(theme, isActive("/prospections/candidat"))}
              >
                Prospections
              </Button>

              <Button
                color="inherit"
                component={Link}
                to="/prospection-commentaires"
                sx={getTopNavButtonSx(theme, isActive("/prospection-commentaires"))}
              >
                Commentaires prospections
              </Button>

              <Button
                color="inherit"
                component={Link}
                to="/partenaires/candidat"
                sx={getTopNavButtonSx(theme, isActive("/partenaires/candidat"))}
              >
                Partenaires
              </Button>

              <Button
                color="inherit"
                component={Link}
                to="/cvtheque/candidat"
                sx={getTopNavButtonSx(theme, isActive("/cvtheque/candidat"))}
              >
                CVThèque
              </Button>

              <Button
                color="inherit"
                component={Link}
                to="/about"
                sx={getTopNavButtonSx(theme, isActive("/about"))}
              >
                À propos
              </Button>
            </Stack>
          )}

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
                  <LogoutIcon fontSize="small" /> Déconnexion
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

      <Drawer
        variant="temporary"
        open={open}
        onClose={closeDrawer}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: (currentTheme) =>
              `1px solid ${alpha(currentTheme.palette.divider, 0.95)}`,
            borderTopRightRadius: 24,
            borderBottomRightRadius: 24,
            background: (currentTheme) =>
              currentTheme.palette.mode === "light"
                ? `linear-gradient(180deg, ${alpha(
                    currentTheme.palette.common.white,
                    0.99
                  )} 0%, ${alpha(currentTheme.palette.background.default, 0.98)} 100%)`
                : `linear-gradient(180deg, ${alpha(
                    currentTheme.palette.background.paper,
                    0.98
                  )} 0%, ${alpha(currentTheme.palette.primary.dark, 0.24)} 100%)`,
            boxShadow: (currentTheme) =>
              currentTheme.palette.mode === "light"
                ? `0 24px 48px ${alpha(
                    currentTheme.palette.common.black,
                    0.14
                  )}`
                : `0 28px 60px ${alpha(
                    currentTheme.palette.common.black,
                    0.34
                  )}`,
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
                alpha(
                  currentTheme.palette.primary.main,
                  currentTheme.palette.mode === "light" ? 0.1 : 0.18
                ),
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
          <ListItemButton
            component={Link}
            to="/dashboard"
            onClick={closeDrawer}
            selected={isActive("/dashboard")}
            sx={getDrawerItemSx(theme)}
          >
            <ListItemIcon>
              <DashboardIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/prospections/candidat"
            onClick={closeDrawer}
            selected={isActive("/prospections/candidat")}
            sx={getDrawerItemSx(theme)}
          >
            <ListItemIcon>
              <AssignmentIcon color="info" />
            </ListItemIcon>
            <ListItemText primary="Prospections" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/prospection-commentaires"
            onClick={closeDrawer}
            selected={isActive("/prospection-commentaires")}
            sx={getDrawerItemSx(theme)}
          >
            <ListItemIcon>
              <CommentIcon color="secondary" />
            </ListItemIcon>
            <ListItemText primary="Commentaires" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/partenaires/candidat"
            onClick={closeDrawer}
            selected={isActive("/partenaires/candidat")}
            sx={getDrawerItemSx(theme)}
          >
            <ListItemIcon>
              <GroupIcon color="success" />
            </ListItemIcon>
            <ListItemText primary="Partenaires" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/cvtheque/candidat"
            onClick={closeDrawer}
            selected={isActive("/cvtheque/candidat")}
            sx={getDrawerItemSx(theme)}
          >
            <ListItemIcon>
              <DescriptionIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="CVThèque" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/about"
            onClick={closeDrawer}
            selected={isActive("/about")}
            sx={getDrawerItemSx(theme)}
          >
            <ListItemIcon>
              <InfoIcon color="action" />
            </ListItemIcon>
            <ListItemText primary="À propos" />
          </ListItemButton>
        </List>
      </Drawer>

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

      <Box sx={{ px: { xs: 0, sm: 0.75 }, pb: { xs: 0, sm: 0.75 } }}>
        <Footer />
      </Box>
    </Box>
  );
}
