import { Box, Typography, Paper, Button, Stack, Divider } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";

export default function PolitiqueConfidentialite() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 800,
          width: "100%",
          p: { xs: 3, sm: 5 },
          borderRadius: 3,
        }}
      >
        <Typography variant="h4" fontWeight="bold" gutterBottom textAlign="center">
          Politique de confidentialité
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph textAlign="center">
          Cette politique explique comment nous collectons, utilisons et protégeons vos données
          personnelles dans le cadre de l’utilisation de notre application.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* ---------------------------- */}
        {/* 🔹 SECTION 1 */}
        {/* ---------------------------- */}
        <Typography variant="h6" gutterBottom>
          1. Données collectées
        </Typography>
        <Typography variant="body2" paragraph>
          Nous collectons uniquement les informations nécessaires à la création et à la gestion de
          votre compte utilisateur : prénom, nom, adresse e-mail, mot de passe et, le cas échéant,
          numéro de téléphone. Des données supplémentaires peuvent être enregistrées dans le cadre
          de votre activité sur la plateforme (par exemple : formations suivies, prospections ou
          partenaires associés).
        </Typography>

        {/* ---------------------------- */}
        {/* 🔹 SECTION 2 */}
        {/* ---------------------------- */}
        <Typography variant="h6" gutterBottom>
          2. Finalités du traitement
        </Typography>

        {/* ❗ Correction : ul sorti de Typography */}
        <Box component="div" sx={{ mb: 2 }} color="text.secondary">
          <Typography variant="body2">
            Vos données sont utilisées exclusivement pour :
          </Typography>
          <ul>
            <li>vous permettre d’accéder à votre espace personnel ;</li>
            <li>assurer le suivi de votre parcours et de vos prospections ;</li>
            <li>améliorer la qualité des services proposés ;</li>
            <li>garantir la sécurité et la traçabilité des actions sur la plateforme.</li>
          </ul>
        </Box>

        {/* ---------------------------- */}
        {/* 🔹 SECTION 3 */}
        {/* ---------------------------- */}
        <Typography variant="h6" gutterBottom>
          3. Durée de conservation
        </Typography>
        <Typography variant="body2" paragraph>
          Vos données sont conservées tant que votre compte est actif. En cas d’inactivité
          prolongée, elles pourront être archivées ou supprimées après un délai maximum de 24 mois.
          Vous pouvez demander la suppression de votre compte à tout moment via l’espace personnel
          ou le formulaire de contact.
        </Typography>

        {/* ---------------------------- */}
        {/* 🔹 SECTION 4 */}
        {/* ---------------------------- */}
        <Typography variant="h6" gutterBottom>
          4. Partage et confidentialité
        </Typography>
        <Typography variant="body2" paragraph>
          Nous ne partageons pas vos données personnelles avec des tiers sans votre consentement
          explicite, sauf en cas d’obligation légale. Les accès sont limités aux personnels
          habilités et aux prestataires techniques nécessaires au fonctionnement du service
          (hébergement, messagerie, statistiques internes).
        </Typography>

        {/* ---------------------------- */}
        {/* 🔹 SECTION 5 */}
        {/* ---------------------------- */}
        <Typography variant="h6" gutterBottom>
          5. Sécurité des données
        </Typography>
        <Typography variant="body2" paragraph>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées
          (chiffrement, journalisation des accès, connexions sécurisées HTTPS) afin de protéger vos
          données contre toute perte, utilisation abusive ou accès non autorisé.
        </Typography>

        {/* ---------------------------- */}
        {/* 🔹 SECTION 6 */}
        {/* ---------------------------- */}
        <Typography variant="h6" gutterBottom>
          6. Vos droits
        </Typography>
        <Typography variant="body2" paragraph>
          Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, d’opposition, de
          portabilité et de suppression de vos données. Pour exercer ces droits, vous pouvez nous
          contacter via la page de contact ou depuis votre espace personnel.
        </Typography>

        <Typography
          variant="body2"
          paragraph
          sx={{
            mt: 4,
            fontStyle: "italic",
            textAlign: "right",
            color: "text.secondary",
          }}
        >
          Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
        </Typography>

        {/* 🔹 Boutons navigation */}
        <Divider sx={{ my: 3 }} />
        <Stack spacing={2} direction="row" justifyContent="center">
          <Button variant="outlined" onClick={() => navigate(-1)}>
            ⬅️ Retour
          </Button>
          <Button variant="contained" component={Link} to="/">
            🏠 Accueil
          </Button>
          <Button variant="contained" color="primary" component={Link} to="/dashboard">
            📊 Tableau de bord
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
