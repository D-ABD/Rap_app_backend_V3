import { Card, CardContent, CardHeader, Typography, type CardProps, useTheme } from "@mui/material";
import type { ReactNode } from "react";
import type { AppTheme } from "../../theme";

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
  const theme = useTheme<AppTheme>();
  const titleNode =
    typeof title === "string" ? (
      <Typography component="h2" variant="subtitle1" fontWeight={600}>
        {title}
      </Typography>
    ) : (
      title
    );
  return (
    <Card
      variant="outlined"
      sx={{
        backgroundColor:
          theme.palette.mode === "light"
            ? theme.custom.form.section.paperBackground.light
            : theme.custom.form.section.paperBackground.dark,
      }}
      {...cardProps}
    >
      <CardHeader
        title={titleNode}
        subheader={subtitle}
        sx={{
          pb: 0,
          backgroundColor:
            theme.palette.mode === "light"
              ? theme.custom.form.section.accentHeaderBackground.light
              : theme.custom.form.section.accentHeaderBackground.dark,
        }}
      />
      <CardContent sx={{ pt: 1 }}>{children}</CardContent>
    </Card>
  );
}
