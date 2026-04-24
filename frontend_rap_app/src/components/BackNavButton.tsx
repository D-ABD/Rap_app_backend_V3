import Button from "@mui/material/Button";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material";
import type { AppTheme } from "../theme";

type BackNavButtonProps = {
  fallbackTo?: string;
};

export default function BackNavButton({ fallbackTo = "/" }: BackNavButtonProps) {
  const navigate = useNavigate();
  const theme = useTheme<AppTheme>();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackTo);
  };

  const controlsTokens = theme.custom.page.template.header.controls;

  return (
    <Button
      startIcon={<ArrowBackIcon aria-hidden />}
      onClick={handleBack}
      variant="outlined"
      size="small"
      aria-label="Revenir à la page précédente"
      sx={{
        borderRadius: theme.shape.borderRadius * controlsTokens.radiusMultiplier,
        minHeight: theme.spacing(controlsTokens.minHeight.default),
      }}
    >
      Retour
    </Button>
  );
}