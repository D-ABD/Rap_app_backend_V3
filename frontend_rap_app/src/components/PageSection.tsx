// src/components/PageSection.tsx
import { Paper } from "@mui/material";
import { ReactNode } from "react";

export default function PageSection({ children }: { children: ReactNode }) {
  return <Paper sx={{ p: 2, mb: 2 }}>{children}</Paper>;
}
