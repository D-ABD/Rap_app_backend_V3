import Button from "@mui/material/Button";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

type BackNavButtonProps = {
  fallbackTo?: string;
};

export default function BackNavButton({ fallbackTo = "/" }: BackNavButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackTo);
  };

  return (
    <Button
      startIcon={<ArrowBackIcon aria-hidden />}
      onClick={handleBack}
      variant="outlined"
      size="small"
      aria-label="Revenir à la page précédente"
    >
      Retour
    </Button>
  );
}
