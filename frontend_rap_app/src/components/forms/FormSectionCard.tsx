// src/components/forms/FormSectionCard.tsx
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  type CardProps,
  useTheme,
  Box,
  Stack,
  type SxProps,
  type Theme,
} from "@mui/material";
import type { ReactNode } from "react";
import type { AppTheme } from "../../theme";

export type FormSectionCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
} & Omit<CardProps, "title">;

export default function FormSectionCard({
  title,
  subtitle,
  children,
  sx: sxProp,
  ...cardProps
}: FormSectionCardProps) {
  const theme = useTheme<AppTheme>();
  const tokens = theme.custom.form.sectionCard;
  const isLight = theme.palette.mode === "light";

  const background = isLight ? tokens.background.light : tokens.background.dark;
  const border = isLight ? tokens.border.light : tokens.border.dark;

  const baseSx: SxProps<Theme> = {
    borderRadius: tokens.borderRadius,
    background,
    border,
    p: tokens.padding,
  };
  const mergedSx: SxProps<Theme> = [
    baseSx,
    ...(Array.isArray(sxProp) ? sxProp : sxProp ? [sxProp] : []),
  ];

  const titleNode =
    typeof title === "string" ? (
      <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
    ) : (
      title
    );

  const subtitleNode =
    typeof subtitle === "string" ? (
      <Typography component="div" variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    ) : (
      subtitle
    );

  return (
    <Card variant="outlined" sx={mergedSx} {...cardProps}>
      <Stack spacing={tokens.titleGap}>
        <CardHeader
          title={titleNode}
          subheader={subtitleNode}
          sx={{ p: 0 }}
        />

        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing(tokens.contentGap),
            }}
          >
            {children}
          </Box>
        </CardContent>
      </Stack>
    </Card>
  );
}