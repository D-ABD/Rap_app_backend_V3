// src/pages/prospections/CreatePartenaireButton.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@mui/material";

type Props = {
  /** Route de la page de création partenaire */
  to?: string; // défaut: "/partenaires/create"
  /** Libellé du bouton */
  label?: string; // défaut: "➕ Créer un partenaire"
  /** Où revenir après création (sinon, page courante) */
  returnTo?: string;
  /** Variante MUI (contained par défaut) */
  variant?: "text" | "outlined" | "contained";
  /** Couleur MUI */
  color?: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
  /** Taille du bouton */
  size?: "small" | "medium" | "large";
};

export default function CreatePartenaireButton({
  to = "/partenaires/create",
  label = "➕ Créer un partenaire",
  returnTo,
  variant = "contained",
  color = "primary",
  size = "medium",
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const back = returnTo ?? `${location.pathname}${location.search}`;
  const href = `${to}?returnTo=${encodeURIComponent(back)}`;

  return (
    <Button onClick={() => navigate(href)} variant={variant} color={color} size={size}>
      {label}
    </Button>
  );
}
