// src/components/ResponsiveTableTemplate.tsx
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  Card,
  CardContent,
  Typography,
  Stack,
  useMediaQuery,
} from "@mui/material";
import { ReactNode } from "react";

export type TableColumn<T> = {
  key: keyof T | string;
  label: ReactNode; // 👈 accepte string | JSX
  sticky?: "left" | "right";
  width?: number; // largeur minimale
  flexGrow?: number; // 👈 optionnel, pour étendre une colonne
  align?: "left" | "center" | "right"; // ✅ nouvelle propriété
  render?: (row: T) => ReactNode;
};

interface Props<T> {
  columns: TableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string | number;
  actions?: (row: T) => ReactNode;
  cardTitle?: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowSx?: (row: T) => object; // ✅ style conditionnel par ligne
}

export default function ResponsiveTableTemplate<T>({
  columns,
  data,
  getRowId,
  actions,
  cardTitle,
  onRowClick,
  rowSx,
}: Props<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  /* 🔹 Vue mobile => affichage en cartes */
  if (isMobile) {
    return (
      <Stack spacing={2} sx={{ p: 2 }}>
        {data.map((row) => (
          <Card
            key={getRowId(row)}
            variant="outlined"
            onClick={() => onRowClick?.(row)}
            sx={{
              cursor: onRowClick ? "pointer" : "default",
              ...(rowSx ? rowSx(row) : {}),
            }}
          >
            <CardContent>
              <Stack spacing={1}>
                {cardTitle && (
                  <Typography variant="h6" fontWeight="bold">
                    {cardTitle(row)}
                  </Typography>
                )}
                {columns.map((col) => (
                  <Box key={String(col.key)}>
                    <Typography variant="body2" color="text.secondary">
                      {col.label}
                    </Typography>
                    <Typography variant="body1">
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "—")}
                    </Typography>
                  </Box>
                ))}
                {actions && <Box mt={1}>{actions(row)}</Box>}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  /* 🔹 Vue desktop => affichage en table */
  return (
    <TableContainer
      sx={{
        maxHeight: "calc(100vh - 64px)",
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={String(col.key)}
                align={col.align ?? "left"} // ✅ prise en compte du nouvel align
                sx={{
                  position: col.sticky ? "sticky" : "static",
                  left: col.sticky === "left" ? 0 : undefined,
                  right: col.sticky === "right" ? 0 : undefined,
                  zIndex: col.sticky ? theme.zIndex.appBar : 1,
                  minWidth: col.width,
                  flexGrow: col.flexGrow ?? 0,
                  backgroundColor: theme.palette.background.paper,
                  fontWeight: "bold",
                }}
              >
                {col.label}
              </TableCell>
            ))}
            {actions && (
              <TableCell
                align="center"
                sx={{
                  position: "sticky",
                  right: 0,
                  backgroundColor: theme.palette.background.paper,
                  fontWeight: "bold",
                  zIndex: theme.zIndex.appBar,
                }}
              >
                Actions
              </TableCell>
            )}
          </TableRow>
        </TableHead>

        <TableBody>
          {data.map((row) => (
            <TableRow
              hover
              key={getRowId(row)}
              onClick={() => onRowClick?.(row)}
              sx={{
                cursor: onRowClick ? "pointer" : "default",
                ...(rowSx ? rowSx(row) : {}),
              }}
            >
              {columns.map((col) => (
                <TableCell
                  key={String(col.key)}
                  align={col.align ?? "left"} // ✅ ajout align ici aussi
                  sx={{
                    position: col.sticky ? "sticky" : "static",
                    left: col.sticky === "left" ? 0 : undefined,
                    right: col.sticky === "right" ? 0 : undefined,
                    zIndex: col.sticky ? theme.zIndex.appBar - 1 : 1,
                    minWidth: col.width,
                    flexGrow: col.flexGrow ?? 0,
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                  {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "—")}
                </TableCell>
              ))}
              {actions && (
                <TableCell
                  align="center"
                  sx={{
                    position: "sticky",
                    right: 0,
                    backgroundColor: theme.palette.background.paper,
                    zIndex: theme.zIndex.appBar - 1,
                  }}
                >
                  {actions(row)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
