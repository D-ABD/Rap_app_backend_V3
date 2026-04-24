import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  type DialogProps,
  useTheme,
} from "@mui/material";
import type { ReactNode } from "react";
import type { AppTheme } from "../../theme";
import SearchInput from "../SearchInput";

export type EntityPickerSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "search" | "text";
};

export type EntityPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  maxWidth?: DialogProps["maxWidth"];
  closeLabel?: string;
  /** Champ de recherche (optionnel). */
  search?: EntityPickerSearchProps;
  /** Afficher la recherche pendant le chargement (sinon masquée tant que `loading`). */
  showSearchWhenLoading?: boolean;
  loading?: boolean;
  error?: string | null;
  /** État vide explicite (affiche `emptyMessage` à la place de `children`). */
  empty?: boolean;
  emptyMessage?: ReactNode;
  children?: ReactNode;
};

/**
 * Coque de dialogue pour sélection d’entité (recherche + liste + chargement / erreur).
 * La logique d’appel API et le rendu de liste restent dans le composant appelant.
 */
export default function EntityPickerDialog({
  open,
  onClose,
  title,
  maxWidth = "sm",
  closeLabel = "Fermer",
  search,
  showSearchWhenLoading = true,
  loading = false,
  error = null,
  empty = false,
  emptyMessage = "Aucun résultat.",
  children,
}: EntityPickerDialogProps) {
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";

  const showSearch = Boolean(search && (showSearchWhenLoading || !loading));

  const dialogSectionTokens = theme.custom.dialog.section;
  const sectionBackground = isLight
    ? dialogSectionTokens.background.light
    : dialogSectionTokens.background.dark;
  const sectionBorder = isLight
    ? dialogSectionTokens.border.light
    : dialogSectionTokens.border.dark;

  const sectionTitleBackground = isLight
    ? theme.custom.overlay.modalSectionTitle.background.light
    : theme.custom.overlay.modalSectionTitle.background.dark;
  const sectionTitleBorder = isLight
    ? theme.custom.overlay.modalSectionTitle.borderBottom.light
    : theme.custom.overlay.modalSectionTitle.borderBottom.dark;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth}>
      <DialogTitle>{title}</DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {showSearch && search ? (
            <SearchInput
              fullWidth
              type={search.type ?? "text"}
              placeholder={search.placeholder}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
            />
          ) : null}

          <Box
            sx={{
              border: sectionBorder,
              borderRadius: dialogSectionTokens.borderRadius,
              background: sectionBackground,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: dialogSectionTokens.padding,
                py: 1,
                background: sectionTitleBackground,
                borderBottom: sectionTitleBorder,
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Résultats
              </Typography>
            </Box>

            <Box sx={{ p: dialogSectionTokens.padding }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Typography color="error">{error}</Typography>
              ) : empty ? (
                typeof emptyMessage === "string" || typeof emptyMessage === "number" ? (
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                ) : (
                  emptyMessage
                )
              ) : (
                children
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary">
          {closeLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}