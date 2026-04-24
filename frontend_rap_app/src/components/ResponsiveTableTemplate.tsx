// src/components/ResponsiveTableTemplate.tsx
import {
  useCallback,
  useMemo,
  type ElementType,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
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
import type { AppTheme } from "../theme";

export type TableColumn<T> = {
  key: keyof T | string;
  label: ReactNode;
  sticky?: "left" | "right";
  /**
   * Décalage en px pour `sticky: "left"` (2e colonne = largeur de la 1re, ex. 36).
   * La colonne la plus à gauche reste en général à 0.
   */
  stickyLeftOffsetPx?: number;
  width?: number;
  flexGrow?: number;
  align?: "left" | "center" | "right";
  /** Si false, le texte peut revenir à la ligne (ex. contenu riche). Par défaut : nowrap. */
  noWrap?: boolean;
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
  /** Surcharge clavier (ex. Enter / Espace) — ne pas supprimer l’a11y des tables métier. */
  onRowKeyDown?: (e: KeyboardEvent<HTMLElement>, row: T) => void;
  /** Attribut `title` sur chaque ligne (indice clavier / clic). */
  rowHintTitle?: string;
  /** MUI `TableRow` sélectionné (surlignage) */
  isRowSelected?: (row: T) => boolean;
  rowSx?: (row: T) => object;
  tableContainerComponent?: ElementType;
  containerSx?: SxProps<Theme>;
  actionsAlign?: "left" | "center" | "right";
  visibleColumnKeys?: string[];
  showActionsColumn?: boolean;
  density?: "default" | "compact";
  /** Lignes après les données (ex. ligne TOTAL en bas de tableau). */
  tableBodyFooter?: ReactNode;
  /** Complément sous les cartes (mobile) — ex. mêmes totaux que `tableBodyFooter`. */
  mobileStackFooter?: ReactNode;
}

export default function ResponsiveTableTemplate<T>({
  columns,
  data,
  getRowId,
  actions,
  cardTitle,
  onRowClick,
  onRowHover,
  onRowKeyDown,
  rowHintTitle,
  isRowSelected,
  rowSx,
  tableContainerComponent,
  containerSx,
  actionsAlign = "center",
  visibleColumnKeys,
  showActionsColumn = true,
  density = "default",
  tableBodyFooter,
  mobileStackFooter,
}: Props<T>) {
  const theme = useTheme<AppTheme>();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isLight = theme.palette.mode === "light";

  const tableTokens = theme.custom.table;
  const densityTokens = tableTokens.densities?.[density];
  const densitySpacing = densityTokens?.spacing;
  const densitySizing = densityTokens?.sizing;
  const densityRadius = densityTokens?.radius;
  const densityTypography = densityTokens?.typography;

  const tableHeaderBackground = isLight
    ? tableTokens.header.background.light
    : tableTokens.header.background.dark;

  const tableHeaderBorder = isLight
    ? tableTokens.header.borderBottom.light
    : tableTokens.header.borderBottom.dark;

  const tableRowHoverBackground = isLight
    ? tableTokens.row.hover.light
    : tableTokens.row.hover.dark;

  const tableRowStripedBackground = isLight
    ? tableTokens.row.stripedEven.light
    : tableTokens.row.stripedEven.dark;

  const tableCellBorder = isLight
    ? tableTokens.cell.borderBottom.light
    : tableTokens.cell.borderBottom.dark;

  const tableContainerBackground = isLight
    ? tableTokens.container.background.light
    : tableTokens.container.background.dark;

  const tableContainerBorder = isLight
    ? tableTokens.container.border.light
    : tableTokens.container.border.dark;

  const stickyColumnShadow = isLight
    ? tableTokens.sticky.shadow.light
    : tableTokens.sticky.shadow.dark;

  const cellPaddingX = densitySpacing?.cellPaddingX ?? 1;
  const cellPaddingY = densitySpacing?.cellPaddingY ?? 0.75;
  const headerPaddingX = densitySpacing?.headerPaddingX ?? 1;
  const headerPaddingY = densitySpacing?.headerPaddingY ?? 0.75;
  const inlineGap = densitySpacing?.inlineGap ?? 0.5;
  const stackGap = densitySpacing?.stackGap ?? 0.5;

  const rowMinHeight = densitySizing?.rowMinHeight ?? 44;
  const actionSize = densitySizing?.actionSize ?? 32;

  const mobilePrimaryVariant = densityTypography?.primaryVariant ?? "body2";
  const mobileSecondaryVariant =
    densityTypography?.secondaryVariant ?? "body2";
  const mobileMetaVariant = densityTypography?.metaVariant ?? "caption";

  const controlRadius = densityRadius?.controlSx ?? 1.5;
  const surfaceRadius = tableTokens.mobileCard.borderRadius;
  const tableMaxHeight = tableTokens.container.maxHeight;

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

  const minStickyLeftOffsetPx = useMemo(() => {
    const lefts = visibleColumns
      .filter((c) => c.sticky === "left")
      .map((c) => c.stickyLeftOffsetPx ?? 0);
    return lefts.length ? Math.min(...lefts) : 0;
  }, [visibleColumns]);

  const stickyLeftRank = useCallback(
    (offsetPx: number) => {
      const uniq = [
        ...new Set(
          visibleColumns
            .filter((c) => c.sticky === "left")
            .map((c) => c.stickyLeftOffsetPx ?? 0)
        ),
      ].sort((a, b) => a - b);
      return Math.max(0, uniq.indexOf(offsetPx));
    },
    [visibleColumns]
  );

  const actionsVisible = Boolean(actions) && showActionsColumn;

  const createRowClickHandler = useCallback(
    (row: T) => (e: MouseEvent) => {
      if (!onRowClick) return;
      const t = e.target as HTMLElement;
      if (t.closest("button, a, input, [role='checkbox'], textarea")) return;
      onRowClick(row);
    },
    [onRowClick]
  );

  const getCellValue = (
    row: T,
    col: TableColumn<T> & { _columnKey?: string }
  ) => (col.render ? col.render(row) : String(row[col.key as keyof T] ?? "—"));

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
    gap: inlineGap,
    width: "100%",
    maxWidth: theme.spacing(27.5),
    ml: actionsAlign === "right" ? "auto" : 0,
    mr: actionsAlign === "left" ? "auto" : 0,
    "& .MuiStack-root": {
      flexWrap: "wrap",
      gap: theme.spacing(inlineGap),
    },
    "& .MuiButton-root": {
      minWidth: 0,
      px: Math.max(cellPaddingX - 0.25, 0.5),
      minHeight: actionSize,
      whiteSpace: "nowrap",
      flexShrink: 0,
      borderRadius: controlRadius,
    },
    "& .MuiIconButton-root": {
      p: 0.5,
      width: actionSize,
      height: actionSize,
      flexShrink: 0,
      borderRadius: controlRadius,
    },
  };

  const actionCellSx: SxProps<Theme> = {
    position: "sticky",
    right: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: theme.zIndex.appBar - 1,
    borderBottom: tableCellBorder,
    px: cellPaddingX,
    py: cellPaddingY,
    minWidth: theme.spacing(tableTokens.actionsColumn.minWidth),
    maxWidth: theme.spacing(tableTokens.actionsColumn.maxWidth),
    width: 1,
    minHeight: rowMinHeight,
    verticalAlign: "top",
    boxShadow: stickyColumnShadow,
  };

  const actionHeaderCellSx: SxProps<Theme> = {
    position: "sticky",
    top: 0,
    right: 0,
    backgroundColor: tableHeaderBackground,
    borderBottom: tableHeaderBorder,
    fontWeight: theme.typography.fontWeightBold,
    zIndex: theme.zIndex.appBar + 3,
    px: headerPaddingX,
    py: headerPaddingY,
    minWidth: theme.spacing(tableTokens.actionsColumn.minWidth),
    maxWidth: theme.spacing(tableTokens.actionsColumn.maxWidth),
    width: 1,
    whiteSpace: "nowrap",
    boxShadow: stickyColumnShadow,
  };

  if (isMobile) {
    return (
      <Stack spacing={stackGap}>
        {data.map((row) => (
          <Card
            key={getRowId(row)}
            variant="outlined"
            onClick={onRowClick ? createRowClickHandler(row) : undefined}
            onKeyDown={onRowKeyDown ? (e) => onRowKeyDown(e, row) : undefined}
            onMouseEnter={() => onRowHover?.(row)}
            onFocus={() => onRowHover?.(row)}
            role={onRowClick || onRowKeyDown ? "button" : undefined}
            tabIndex={onRowClick || onRowKeyDown ? 0 : undefined}
            title={rowHintTitle}
            sx={{
              cursor: onRowClick || onRowKeyDown ? "pointer" : "default",
              borderRadius: surfaceRadius,
              boxShadow: "none",
              transition: theme.transitions.create(
                ["border-color", "background-color", "box-shadow"],
                { duration: theme.transitions.duration.shorter }
              ),
              "&:hover": onRowClick
                ? {
                    borderColor: "divider",
                    backgroundColor: tableRowHoverBackground,
                  }
                : undefined,
              "&:focus-within": {
                    outline: "none",
                    borderColor: "primary.main",
                  },
              ...(rowSx ? rowSx(row) : {}),
            }}
          >
            <CardContent
              sx={{
                p: tableTokens.mobileCard.padding,
                "&:last-child": {
                  pb: tableTokens.mobileCard.padding,
                },
              }}
            >
              <Stack spacing={stackGap}>
                {cardTitle && (
                  <Typography
                    variant={mobileSecondaryVariant}
                    fontWeight={theme.typography.fontWeightBold}
                  >
                    {cardTitle(row)}
                  </Typography>
                )}

                {visibleColumns.map((col) => (
                  <Box key={col._columnKey}>
                    <Typography
                      variant={mobileMetaVariant}
                      color="text.secondary"
                    >
                      {col.label}
                    </Typography>
                    <Typography variant={mobilePrimaryVariant}>
                      {getCellValue(row, col)}
                    </Typography>
                  </Box>
                ))}

                {actionsVisible ? (
                  <Box onClick={(e) => e.stopPropagation()} sx={actionContentSx}>
                    {actions?.(row)}
                  </Box>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ))}
        {mobileStackFooter}
      </Stack>
    );
  }

  return (
    <TableContainer
      {...(tableContainerComponent ? { component: tableContainerComponent } : {})}
      sx={[
        {
          maxHeight: tableMaxHeight,
          overflow: "auto",
          width: "100%",
          backgroundColor: tableContainerBackground,
          border: tableContainerBorder,
          borderRadius: tableTokens.container.borderRadius,
        },
        ...(containerSx
          ? Array.isArray(containerSx)
            ? containerSx
            : [containerSx]
          : []),
      ]}
    >
      <Table
        stickyHeader
        size="small"
        sx={{
          width: "100%",
          minWidth: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          tableLayout: "auto",
        }}
      >
        <TableHead>
          <TableRow>
            {visibleColumns.map((col) => {
              const isStickyLeft = col.sticky === "left";
              const offset = col.stickyLeftOffsetPx ?? 0;
              const isFirstStickyLeft =
                isStickyLeft && offset === minStickyLeftOffsetPx;
              const slRank = isStickyLeft ? stickyLeftRank(offset) : 0;

              return (
                <TableCell
                  key={col._columnKey}
                  align={col.align ?? "left"}
                  sx={{
                    position: "sticky",
                    top: 0,
                    left: isStickyLeft ? `${offset}px` : undefined,
                    zIndex: isStickyLeft
                      ? theme.zIndex.appBar + 4 - slRank
                      : theme.zIndex.appBar + 2,
                    minWidth: col.width,
                    backgroundColor: tableHeaderBackground,
                    borderBottom: tableHeaderBorder,
                    fontWeight: theme.typography.fontWeightBold,
                    whiteSpace: col.noWrap === false ? "normal" : "nowrap",
                    px: headerPaddingX,
                    py: headerPaddingY,
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
          {data.map((row, rowIndex) => (
            <TableRow
              hover
              key={getRowId(row)}
              onClick={onRowClick ? createRowClickHandler(row) : undefined}
              onKeyDown={onRowKeyDown ? (e) => onRowKeyDown(e, row) : undefined}
              onMouseEnter={() => onRowHover?.(row)}
              onFocus={() => onRowHover?.(row)}
              selected={isRowSelected ? isRowSelected(row) : false}
              role={onRowClick || onRowKeyDown ? "button" : undefined}
              tabIndex={onRowClick || onRowKeyDown ? 0 : undefined}
              title={rowHintTitle}
              sx={{
                cursor: onRowClick || onRowKeyDown ? "pointer" : "default",
                minHeight: rowMinHeight,
                backgroundColor:
                  rowIndex % 2 === 1 ? tableRowStripedBackground : undefined,
                transition: theme.transitions.create(
                  ["background-color", "box-shadow"],
                  { duration: theme.transitions.duration.shorter }
                ),
                "&:hover": {
                  backgroundColor: tableRowHoverBackground,
                },
                "&:focus-within": {
                  backgroundColor: tableRowHoverBackground,
                },
                ...(rowSx ? rowSx(row) : {}),
              }}
            >
              {visibleColumns.map((col) => {
                const isStickyLeft = col.sticky === "left";
                const offset = col.stickyLeftOffsetPx ?? 0;
                const isFirstStickyLeft =
                  isStickyLeft && offset === minStickyLeftOffsetPx;
                const slRank = isStickyLeft ? stickyLeftRank(offset) : 0;

                return (
                  <TableCell
                    key={col._columnKey}
                    align={col.align ?? "left"}
                    sx={{
                      position: isStickyLeft ? "sticky" : "static",
                      left: isStickyLeft ? `${offset}px` : undefined,
                      zIndex: isStickyLeft
                        ? theme.zIndex.appBar - 1 - slRank
                        : 1,
                      minWidth: col.width,
                      backgroundColor: isStickyLeft
                        ? theme.palette.background.paper
                        : undefined,
                      borderBottom: tableCellBorder,
                      whiteSpace: col.noWrap === false ? "normal" : "nowrap",
                      verticalAlign: col.noWrap === false ? "top" : undefined,
                      px: cellPaddingX,
                      py: cellPaddingY,
                      minHeight: rowMinHeight,
                      boxShadow: isFirstStickyLeft ? stickyColumnShadow : undefined,
                    }}
                  >
                    {getCellValue(row, col)}
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
          {tableBodyFooter}
        </TableBody>
      </Table>
    </TableContainer>
  );
}