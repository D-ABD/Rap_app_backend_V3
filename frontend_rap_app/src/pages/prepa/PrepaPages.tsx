import { Button, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PageTemplate from "src/components/PageTemplate";

export default function PrepaPage() {
  const navigate = useNavigate();

  return (
    <PageTemplate
      title="Prépa"
      centered
      subtitle="Choisissez une catégorie d’activités :"
    >
      <Stack spacing={2} width="100%" maxWidth={400}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() => navigate("/prepa/ic")}
        >
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

        <Button
          variant="outlined"
          size="large"
          fullWidth
          onClick={() => navigate("/prepa/stagiaires")}
        >
          👥 Stagiaires Prépa
        </Button>
      </Stack>
    </PageTemplate>
  );
}