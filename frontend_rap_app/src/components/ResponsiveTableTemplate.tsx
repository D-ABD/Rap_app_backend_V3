// src/components/ResponsiveTableTemplate.tsx
import { useMemo } from "react";
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
  type SxProps,
  type Theme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ElementType, ReactNode } from "react";
import type { AppTheme } from "../theme";

export type TableColumn<T> = {
  key: keyof T | string;
  label: ReactNode;
  sticky?: "left" | "right";
  width?: number;
  flexGrow?: number;
  align?: "left" | "center" | "right";
  render?: (row: T) => ReactNode;
  headerRender?: () => ReactNode;
  hideable?: boolean;
};

interface Props<T> {
  columns: TableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string | number;
  actions?: (row: T) => ReactNode;
  cardTitle?: (row: T) => string;
  onRowClick?: (row: T) => void;
  onRowHover?: (row: T) => void;
  rowSx?: (row: T) => object;
  tableContainerComponent?: ElementType;
  containerSx?: SxProps<Theme>;
  actionsAlign?: "left" | "center" | "right";
  visibleColumnKeys?: string[];
  showActionsColumn?: boolean;
}

export default function ResponsiveTableTemplate<T>({
  columns,
  data,
  getRowId,
  actions,
  cardTitle,
  onRowClick,
  onRowHover,
  rowSx,
  tableContainerComponent,
  containerSx,
  actionsAlign = "center",
  visibleColumnKeys,
  showActionsColumn = true,
}: Props<T>) {
  const theme = useTheme<AppTheme>();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isLight = theme.palette.mode === "light";

  const tableHeaderBackground = isLight
    ? theme.custom.table.header.background.light
    : theme.custom.table.header.background.dark;
  const tableHeaderBorder = isLight
    ? theme.custom.table.header.borderBottom.light
    : theme.custom.table.header.borderBottom.dark;
  const tableRowHoverBackground = isLight
    ? theme.custom.table.row.hover.light
    : theme.custom.table.row.hover.dark;
  const tableCellBorder = isLight
    ? theme.custom.table.cell.borderBottom.light
    : theme.custom.table.cell.borderBottom.dark;

  const stickyColumnShadow = `inset -10px 0 12px -12px ${alpha(
    theme.palette.common.black,
    isLight ? 0.2 : 0.45
  )}`;

  const normalizedColumns = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        _columnKey: String(col.key),
      })),
    [columns]
  );

  const visibleColumns = useMemo(() => {
    if (!visibleColumnKeys || visibleColumnKeys.length === 0) {
      return normalizedColumns;
    }

    const visibleSet = new Set(visibleColumnKeys);
    return normalizedColumns.filter((col) => visibleSet.has(col._columnKey));
  }, [normalizedColumns, visibleColumnKeys]);

  const actionsVisible = Boolean(actions) && showActionsColumn;

  const actionContentSx: SxProps<Theme> = {
    display: "flex",
    justifyContent:
      actionsAlign === "right"
        ? "flex-end"
        : actionsAlign === "left"
          ? "flex-start"
          : "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 0.5,
    width: "100%",
    maxWidth: 220,
    ml: actionsAlign === "right" ? "auto" : 0,
    mr: actionsAlign === "left" ? "auto" : 0,

    "& .MuiStack-root": {
      flexWrap: "wrap",
      gap: theme.spacing(0.5),
      justifyContent:
        actionsAlign === "right"
          ? "flex-end"
          : actionsAlign === "left"
            ? "flex-start"
            : "center",
    },

    "& .MuiButton-root": {
      minWidth: 0,
      paddingLeft: theme.spacing(0.75),
      paddingRight: theme.spacing(0.75),
      whiteSpace: "nowrap",
      flexShrink: 0,
    },

    "& .MuiIconButton-root": {
      padding: theme.spacing(0.5),
      flexShrink: 0,
    },
  };

  const actionCellSx: SxProps<Theme> = {
    position: "sticky",
    right: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: theme.zIndex.appBar - 1,
    borderBottom: tableCellBorder,
    px: 1,
    py: 0.75,
    minWidth: 140,
    maxWidth: 240,
    width: 1,
    verticalAlign: "top",
  };

  const actionHeaderCellSx: SxProps<Theme> = {
    position: "sticky",
    top: 0,
    right: 0,
    backgroundColor: tableHeaderBackground,
    borderBottom: tableHeaderBorder,
    fontWeight: "bold",
    zIndex: theme.zIndex.appBar + 3,
    px: 1,
    minWidth: 140,
    maxWidth: 240,
    width: 1,
    whiteSpace: "nowrap",
  };

  if (isMobile) {
    return (
      <Stack spacing={2} sx={{ p: 2 }}>
        {data.map((row) => (
          <Card
            key={getRowId(row)}
            variant="outlined"
            onClick={() => onRowClick?.(row)}
            onMouseEnter={() => onRowHover?.(row)}
            onFocus={() => onRowHover?.(row)}
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

                {visibleColumns.map((col) => (
                  <Box key={col._columnKey}>
                    <Typography variant="body2" color="text.secondary">
                      {col.label}
                    </Typography>
                    <Typography variant="body1">
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "—")}
                    </Typography>
                  </Box>
                ))}

                {actionsVisible ? (
                  <Box mt={1} onClick={(e) => e.stopPropagation()} sx={actionContentSx}>
                    {actions?.(row)}
                  </Box>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <TableContainer
      {...(tableContainerComponent ? { component: tableContainerComponent } : {})}
      sx={[
        {
          maxHeight: "calc(100vh - 64px)",
          overflow: "auto",
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
        },
        ...(containerSx ? (Array.isArray(containerSx) ? containerSx : [containerSx]) : []),
      ]}
    >
      <Table
        stickyHeader
        size="small"
        sx={{
          borderCollapse: "separate",
          borderSpacing: 0,
        }}
      >
        <TableHead>
          <TableRow>
            {visibleColumns.map((col, index) => {
              const isStickyLeft = col.sticky === "left";
              const isFirstStickyLeft = isStickyLeft && index === 0;

              return (
                <TableCell
                  key={col._columnKey}
                  align={col.align ?? "left"}
                  sx={{
                    position: "sticky",
                    top: 0,
                    left: isStickyLeft ? 0 : undefined,
                    zIndex: isStickyLeft ? theme.zIndex.appBar + 4 : theme.zIndex.appBar + 2,
                    minWidth: col.width,
                    backgroundColor: tableHeaderBackground,
                    borderBottom: tableHeaderBorder,
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    boxShadow: isFirstStickyLeft ? stickyColumnShadow : undefined,
                  }}
                >
                  {col.headerRender ? col.headerRender() : col.label}
                </TableCell>
              );
            })}

            {actionsVisible ? (
              <TableCell align={actionsAlign} sx={actionHeaderCellSx}>
                Actions
              </TableCell>
            ) : null}
          </TableRow>
        </TableHead>

        <TableBody>
          {data.map((row) => (
            <TableRow
              hover
              key={getRowId(row)}
              onClick={() => onRowClick?.(row)}
              onMouseEnter={() => onRowHover?.(row)}
              onFocus={() => onRowHover?.(row)}
              sx={{
                cursor: onRowClick ? "pointer" : "default",
                "&:hover": {
                  backgroundColor: tableRowHoverBackground,
                },
                ...(rowSx ? rowSx(row) : {}),
              }}
            >
              {visibleColumns.map((col, index) => {
                const isStickyLeft = col.sticky === "left";
                const isFirstStickyLeft = isStickyLeft && index === 0;

                return (
                  <TableCell
                    key={col._columnKey}
                    align={col.align ?? "left"}
                    sx={{
                      position: isStickyLeft ? "sticky" : "static",
                      left: isStickyLeft ? 0 : undefined,
                      zIndex: isStickyLeft ? theme.zIndex.appBar - 1 : 1,
                      minWidth: col.width,
                      backgroundColor: isStickyLeft
                        ? theme.palette.background.paper
                        : undefined,
                      borderBottom: tableCellBorder,
                      whiteSpace: "nowrap",
                      boxShadow: isFirstStickyLeft ? stickyColumnShadow : undefined,
                    }}
                  >
                    {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "—")}
                  </TableCell>
                );
              })}

              {actionsVisible ? (
                <TableCell
                  align={actionsAlign}
                  onClick={(e) => e.stopPropagation()}
                  sx={actionCellSx}
                >
                  <Box sx={actionContentSx}>{actions?.(row)}</Box>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}