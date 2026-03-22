// src/pages/formations/componentsFormations/FormationSection.tsx
import { Accordion, AccordionSummary, AccordionDetails, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ReactNode } from "react";

interface Props {
  title?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export default function FormationSection({ title, children, defaultExpanded = false }: Props) {
  return (
    <Accordion defaultExpanded={defaultExpanded} sx={{ mt: 2 }}>
      {title && (
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="bold">{title}</Typography>
        </AccordionSummary>
      )}
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}
