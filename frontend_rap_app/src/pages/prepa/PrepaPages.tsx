import { Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PageTemplate from "src/components/PageTemplate";

export default function PrepaPage() {
  const navigate = useNavigate();

  return (
    <PageTemplate title="Prépa" centered>
      <Button variant="outlined" onClick={() => navigate(-1)} startIcon={<span>←</span>}>
        Retour
      </Button>

      <Stack spacing={4} alignItems="center" width="100%">
        <Typography variant="h6" color="text.secondary">
          Choisissez une catégorie d’activités :
        </Typography>

        <Stack spacing={2} width="100%" maxWidth={400}>
          <Button variant="contained" size="large" fullWidth onClick={() => navigate("/prepa/ic")}>
            🟦 Informations Collectives (IC)
          </Button>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => navigate("/prepa/ateliers")}
          >
            🟪 Ateliers Prépa
          </Button>
        </Stack>
      </Stack>
    </PageTemplate>
  );
}
