// src/components/PageWrapper.tsx
import { Container } from "@mui/material";
import { ReactNode } from "react";

type PageWrapperProps = {
  children: ReactNode;
  /** largeur max, par défaut "lg". Mettre false pour 100% */
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  /** padding vertical, par défaut { xs: 2, sm: 3 } */
  disableGutters?: boolean;
  /** si true -> prend toute la largeur */
  fullWidth?: boolean;
};

export default function PageWrapper({
  children,
  maxWidth = "lg",
  disableGutters = false,
  fullWidth = false,
}: PageWrapperProps) {
  return (
    <Container
      maxWidth={fullWidth ? false : maxWidth}
      disableGutters={disableGutters}
      sx={{ py: { xs: 2, sm: 3 } }}
    >
      {children}
    </Container>
  );
}
