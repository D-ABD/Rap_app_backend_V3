import { Link as RouterLink } from "react-router-dom";
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
} from "@mui/material";
import PageTemplate from "../../components/PageTemplate";
import { useAuth } from "../../hooks/useAuth";

const ParametresPage = () => {
  const { logout } = useAuth();

  const cards = [
    {
      title: "Utilisateurs",
      text: "Gérer les comptes, les rôles et l'activation des utilisateurs.",
      link: "/users",
    },
    {
      title: "Centres",
      text: "Gérer les centres de formation.",
      link: "/centres",
    },
    {
      title: "Types d'offres",
      text: "Gérer les types d’offres de formation.",
      link: "/typeoffres",
    },
    {
      title: "Statuts",
      text: "Configurer les statuts des formations.",
      link: "/statuts",
    },
    {
      title: "Rapports",
      text: "Créer, modifier et exporter les rapports métier.",
      link: "/rapports",
    },
    {
      title: "Logs",
      text: "Consulter et exporter les journaux d'activité.",
      link: "/logs",
    },
    {
      title: "Administration",
      text: "Accès à l'interface d’administration Django.",
      link: "/admin/",
      external: true,
    },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <PageTemplate
      title="Paramètres"
      centered={false}
      actions={
        <Button variant="contained" color="error" onClick={handleLogout}>
          🚪 Déconnexion
        </Button>
      }
    >
      <Grid container spacing={3}>
        {cards.map((c) => (
          <Grid item xs={12} sm={6} md={4} key={c.title}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {c.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {c.text}
                </Typography>
              </CardContent>

              <CardActions>
                {c.external ? (
                  <Button
                    component="a"
                    href={c.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    color="primary"
                  >
                    Accéder
                  </Button>
                ) : (
                  <Button
                    component={RouterLink}
                    to={c.link}
                    size="small"
                    color="primary"
                  >
                    Accéder
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </PageTemplate>
  );
};

export default ParametresPage;