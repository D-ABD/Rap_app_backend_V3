import HomeIcon from "@mui/icons-material/Home";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { alpha } from "@mui/material/styles";
import { Box, Breadcrumbs, Link as MuiLink, Paper, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { breadcrumbLabels } from "src/utils/breadcrumbLabels";

type AppBreadcrumbsProps = {
  pathname: string;
};

export default function AppBreadcrumbs({ pathname }: AppBreadcrumbsProps) {
  const pathnames = pathname.split("/").filter((segment) => segment);

  if (pathnames.length === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        mb: { xs: 1.5, sm: 2 },
        px: { xs: 1.1, sm: 1.5 },
        py: { xs: 1, sm: 1.15 },
        borderRadius: 4,
        border: "1px solid",
        borderColor: (theme) => alpha(theme.palette.divider, 0.95),
        color: "text.secondary",
        bgcolor: (theme) =>
          alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 0.94 : 0.88),
        backgroundImage: (theme) =>
          `linear-gradient(135deg, ${alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.06 : 0.16)} 0%, ${alpha(theme.palette.secondary.main, theme.palette.mode === "light" ? 0.035 : 0.1)} 100%)`,
        boxShadow: (theme) =>
          theme.palette.mode === "light"
            ? `0 12px 32px ${alpha(theme.palette.common.black, 0.06)}`
            : `0 18px 38px ${alpha(theme.palette.common.black, 0.28)}`,
        backdropFilter: "blur(14px)",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": { height: 6 },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: (theme) => alpha(theme.palette.text.secondary, 0.22),
            borderRadius: 999,
          },
        }}
      >
        <Breadcrumbs
          aria-label="breadcrumb"
          separator={
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: "50%",
                bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.05 : 0.1),
                color: "text.disabled",
                flexShrink: 0,
              }}
            >
              <NavigateNextIcon sx={{ fontSize: 15 }} />
            </Box>
          }
          sx={{
            flexWrap: "nowrap",
            minWidth: "max-content",
            "& .MuiBreadcrumbs-ol": {
              flexWrap: "nowrap",
              alignItems: "center",
              gap: { xs: 0.4, sm: 0.65 },
            },
          }}
        >
          <MuiLink
            component={Link}
            to="/"
            underline="none"
            color="inherit"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              px: { xs: 1, sm: 1.2 },
              py: 0.7,
              borderRadius: 999,
              fontSize: { xs: "0.84rem", sm: "0.9rem" },
              fontWeight: 700,
              color: "text.secondary",
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.08 : 0.16),
              border: "1px solid",
              borderColor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.14 : 0.28),
              transition: "all 180ms ease",
              whiteSpace: "nowrap",
              "&:hover": {
                color: "primary.main",
                bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.12 : 0.22),
                transform: "translateY(-1px)",
              },
            }}
          >
            <HomeIcon sx={{ fontSize: 16 }} />
            Accueil
          </MuiLink>

          {pathnames.map((value, index) => {
            const to = `/${pathnames.slice(0, index + 1).join("/")}`;
            const isLast = index === pathnames.length - 1;
            const label = breadcrumbLabels[value] ?? value.charAt(0).toUpperCase() + value.slice(1);

            return isLast ? (
              <Typography
                key={to}
                color="text.primary"
                sx={{
                  px: { xs: 1, sm: 1.2 },
                  py: 0.7,
                  borderRadius: 999,
                  fontSize: { xs: "0.84rem", sm: "0.9rem" },
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.05 : 0.1),
                  border: "1px solid",
                  borderColor: (theme) => alpha(theme.palette.divider, 0.95),
                }}
              >
                {label}
              </Typography>
            ) : (
              <MuiLink
                key={to}
                component={Link}
                underline="none"
                color="inherit"
                to={to}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  px: { xs: 0.85, sm: 1 },
                  py: 0.6,
                  borderRadius: 999,
                  fontSize: { xs: "0.82rem", sm: "0.88rem" },
                  fontWeight: 600,
                  color: "text.secondary",
                  whiteSpace: "nowrap",
                  transition: "all 180ms ease",
                  "&:hover": {
                    color: "text.primary",
                    bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.045 : 0.08),
                  },
                }}
              >
                {label}
              </MuiLink>
            );
          })}
        </Breadcrumbs>
      </Box>
    </Paper>
  );
}
