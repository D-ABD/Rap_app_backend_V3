import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  type DialogProps,
} from "@mui/material";
import type { ReactNode } from "react";

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
  const showSearch = Boolean(search && (showSearchWhenLoading || !loading));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {showSearch && search ? (
          <TextField
            fullWidth
            margin="normal"
            type={search.type ?? "text"}
            placeholder={search.placeholder}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
          />
        ) : null}

        {loading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : empty ? (
          typeof emptyMessage === "string" || typeof emptyMessage === "number" ? (
            <Typography>{emptyMessage}</Typography>
          ) : (
            emptyMessage
          )
        ) : (
          children
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          {closeLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
