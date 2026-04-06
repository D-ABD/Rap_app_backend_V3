// src/components/PageWrapper.tsx
import { Container, type SxProps, type Theme } from "@mui/material";
import { ReactNode } from "react";

type PageWrapperProps = {
  children: ReactNode;
  /** largeur max, par défaut "lg". Mettre false pour 100% */
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  /** padding vertical, par défaut { xs: 2, sm: 3 } */
  disableGutters?: boolean;
  /** si true -> prend toute la largeur */
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
};

export default function PageWrapper({
  children,
  maxWidth = "lg",
  disableGutters = false,
  fullWidth = false,
  sx,
}: PageWrapperProps) {
  return (
    <Container
      maxWidth={fullWidth ? false : maxWidth}
      disableGutters={disableGutters}
      sx={{
        py: { xs: 2, sm: 3 },
        ...sx,
      }}
    >
      {children}
    </Container>
  );
}
