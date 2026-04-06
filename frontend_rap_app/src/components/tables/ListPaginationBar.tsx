import { Pagination, Stack, Typography, type PaginationProps } from "@mui/material";

export type ListPaginationBarProps = {
  page: number;
  totalPages: number;
  count: number;
  onPageChange: (page: number) => void;
} & Pick<PaginationProps, "size" | "color" | "disabled">;

/**
 * Résumé de page + contrôle MUI `Pagination` (pattern commun aux listes Lot 6).
 */
export default function ListPaginationBar({
  page,
  totalPages,
  count,
  onPageChange,
  size = "medium",
  color = "primary",
  disabled,
}: ListPaginationBarProps) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={1}>
      <Typography variant="body2" component="p" sx={{ m: 0 }}>
        Page {page} / {totalPages} ({count} résultats)
      </Typography>
      <Pagination
        page={page}
        count={totalPages || 1}
        onChange={(_, val) => onPageChange(val)}
        color={color}
        size={size}
        disabled={disabled}
      />
    </Stack>
  );
}
