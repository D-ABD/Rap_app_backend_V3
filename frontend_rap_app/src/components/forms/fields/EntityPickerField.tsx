import SearchIcon from "@mui/icons-material/Search";
import { IconButton, InputAdornment } from "@mui/material";
import AppTextField from "./AppTextField";

export type EntityPickerFieldProps = {
  label: string;
  /** Texte affiché (libellé de l’entité choisie). */
  displayValue: string;
  placeholder?: string;
  onOpen: () => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
  /** Texte accessible pour le bouton de recherche. */
  openButtonAriaLabel?: string;
};

/**
 * Champ lecture seule + bouton pour ouvrir une modale de sélection d’entité.
 */
export default function EntityPickerField({
  label,
  displayValue,
  placeholder,
  onOpen,
  disabled,
  error,
  helperText,
  required,
  openButtonAriaLabel = "Ouvrir la recherche",
}: EntityPickerFieldProps) {
  return (
    <AppTextField
      label={label}
      value={displayValue}
      placeholder={placeholder}
      required={required}
      error={error}
      helperText={helperText}
      disabled={disabled}
      onClick={() => !disabled && onOpen()}
      InputProps={{
        readOnly: true,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              edge="end"
              aria-label={openButtonAriaLabel}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onOpen();
              }}
              disabled={disabled}
              size="small"
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}
