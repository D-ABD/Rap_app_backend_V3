import HomeIcon from "@mui/icons-material/Home";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { alpha } from "@mui/material/styles";
import { Box, Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { breadcrumbLabels } from "src/utils/breadcrumbLabels";

type AppBreadcrumbsProps = {
  pathname: string;
};

export default function AppBreadcrumbs({ pathname }: AppBreadcrumbsProps) {
  const pathnames = pathname.split("/").filter((segment) => segment);

  if (pathnames.length === 0) return null;

  return (
    <Box
      sx={{
        mb: { xs: 0.75, sm: 1 },
        color: "text.secondary",
      }}
    >
      <Box
        sx={{
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": { height: 4 },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: (theme) => alpha(theme.palette.text.secondary, 0.16),
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
                width: 16,
                height: 16,
                color: "text.disabled",
                flexShrink: 0,
              }}
            >
              <NavigateNextIcon sx={{ fontSize: 14 }} />
            </Box>
          }
          sx={{
            flexWrap: "nowrap",
            minWidth: "max-content",
            "& .MuiBreadcrumbs-ol": {
              flexWrap: "nowrap",
              alignItems: "center",
              gap: { xs: 0.2, sm: 0.35 },
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
              gap: 0.45,
              px: 0,
              py: 0.15,
              fontSize: { xs: "0.78rem", sm: "0.82rem" },
              fontWeight: 600,
              color: "text.secondary",
              transition: "all 180ms ease",
              whiteSpace: "nowrap",
              "&:hover": {
                color: "primary.main",
              },
            }}
          >
            <HomeIcon sx={{ fontSize: 14 }} />
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
                  px: 0,
                  py: 0.15,
                  fontSize: { xs: "0.78rem", sm: "0.82rem" },
                  fontWeight: 700,
                  whiteSpace: "nowrap",
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
                  px: 0,
                  py: 0.15,
                  fontSize: { xs: "0.78rem", sm: "0.82rem" },
                  fontWeight: 600,
                  color: "text.secondary",
                  whiteSpace: "nowrap",
                  transition: "all 180ms ease",
                  "&:hover": {
                    color: "text.primary",
                  },
                }}
              >
                {label}
              </MuiLink>
            );
          })}
        </Breadcrumbs>
      </Box>
    </Box>
  );
}
