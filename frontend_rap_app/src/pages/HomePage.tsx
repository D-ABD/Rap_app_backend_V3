// src/pages/HomePage.tsx
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Typography, Box, Button, Card, Grid, useTheme, Link } from "@mui/material";
import { FaChartLine, FaHandshake, FaUserTie, FaInfoCircle } from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";
import logo from "../assets/logo.png";
import PageWrapper from "../components/PageWrapper"; // ✅ wrapper responsive

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();

  const features = [
    {
      icon: <FaChartLine aria-hidden="true" size={32} color={theme.palette.primary.main} />,
      title: "Tableaux de bord",
      desc: "Visualisez les indicateurs clés pour suivre l’activité en temps réel.",
      to: "/dashboard",
    },
    {
      icon: <FaHandshake aria-hidden="true" size={32} color={theme.palette.primary.main} />,
      title: "Prospection",
      desc: "Gérez les prospections, relances et appairages partenaires.",
      to: "/prospection",
    },
    {
      icon: <FaUserTie aria-hidden="true" size={32} color={theme.palette.primary.main} />,
      title: "Partenaires",
      desc: "Retrouvez et administrez les partenaires et institutions associées.",
      to: "/partenaires",
    },
    {
      icon: <FaInfoCircle aria-hidden="true" size={32} color={theme.palette.primary.main} />,
      title: "À propos",
      desc: "En savoir plus sur Rap App et ses objectifs.",
      to: "/about",
    },
  ];

  return (
    <PageWrapper maxWidth="lg">
      {/* 🔹 Hero Section */}
      <Box textAlign="center" py={{ xs: 2, md: 4 }}>
        <img src={logo} alt="Logo Rap App" style={{ height: 80, maxWidth: "100%" }} />
        <Typography
          variant="h3"
          sx={{
            mt: 2,
            color: "primary.main",
            fontWeight: "bold",
            fontSize: { xs: "2rem", md: "3rem" },
          }}
        >
          Bienvenue sur Rap App
        </Typography>
        <Typography variant="h6" sx={{ my: 2, fontSize: { xs: "1rem", md: "1.25rem" } }}>
          Suivez, gérez et analysez vos actions de formation et de prospection en toute simplicité.
        </Typography>

        {!isAuthenticated ? (
          <Button
            variant="contained"
            size="large"
            sx={{ mt: 2 }}
            onClick={() => navigate("/login")}
            startIcon={
              <span role="img" aria-label="connexion">
                🔐
              </span>
            }
          >
            Se connecter
          </Button>
        ) : (
          <Button
            variant="outlined"
            size="large"
            sx={{ mt: 2 }}
            component={RouterLink}
            to="/dashboard"
            startIcon={<FaChartLine />}
          >
            Aller au tableau de bord
          </Button>
        )}
      </Box>

      {/* 🔹 Features Grid */}
      <Grid container spacing={3} mt={{ xs: 2, md: 6 }}>
        {features.map((f) => (
          <Grid key={f.title} item xs={12} sm={6} md={3}>
            <Card
              component={RouterLink}
              to={f.to}
              sx={{
                p: 3,
                textAlign: "center",
                height: "100%",
                textDecoration: "none",
                color: "inherit",
                transition: "0.3s",
                "&:hover": {
                  transform: "translateY(-6px)",
                  boxShadow: 6,
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              {f.icon}
              <Typography
                variant="h6"
                sx={{
                  mt: 2,
                  fontSize: { xs: "1rem", md: "1.1rem" },
                  fontWeight: "bold",
                }}
              >
                {f.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{ mt: 1, fontSize: { xs: "0.85rem", md: "0.95rem" } }}
              >
                {f.desc}
              </Typography>
              <Link
                component="span"
                underline="hover"
                sx={{
                  mt: 1.5,
                  display: "inline-block",
                  fontSize: "0.85rem",
                  color: "primary.main",
                  fontWeight: 500,
                }}
              >
                Voir plus →
              </Link>
            </Card>
          </Grid>
        ))}
      </Grid>
    </PageWrapper>
  );
}
