import { Card, CardContent, CardHeader, Typography, type CardProps } from "@mui/material";
import type { ReactNode } from "react";

export type FormSectionCardProps = {
  /** Titre de section (texte ou nœud, ex. icône + libellé). */
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
} & Omit<CardProps, "title">;

/**
 * Bloc de formulaire avec titre (carte bordée, contenu aéré).
 */
export default function FormSectionCard({ title, subtitle, children, ...cardProps }: FormSectionCardProps) {
  const titleNode =
    typeof title === "string" ? (
      <Typography component="h2" variant="subtitle1" fontWeight={600}>
        {title}
      </Typography>
    ) : (
      title
    );
  return (
    <Card variant="outlined" {...cardProps}>
      <CardHeader
        title={titleNode}
        subheader={subtitle}
        sx={{ pb: 0 }}
      />
      <CardContent sx={{ pt: 1 }}>{children}</CardContent>
    </Card>
  );
}
