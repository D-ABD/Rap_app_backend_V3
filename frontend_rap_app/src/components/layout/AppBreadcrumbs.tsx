import HomeIcon from "@mui/icons-material/Home";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Breadcrumbs, Link as MuiLink, Paper, Typography } from "@mui/material";
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
        mb: 2,
        p: 1.25,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: (theme) => (theme.palette.mode === "light" ? "#fff" : "#1e1e1e"),
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
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
          const label = breadcrumbLabels[value] ?? value.charAt(0).toUpperCase() + value.slice(1);

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
  );
}
