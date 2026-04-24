// src/components/SearchInput.tsx
import { TextField, useTheme } from "@mui/material";
import type { TextFieldProps } from "@mui/material";
import type { AppTheme } from "../theme";

export default function SearchInput(props: TextFieldProps) {
  const theme = useTheme<AppTheme>();
  const { sx: sxProp, ...rest } = props;

  const safeValue = props.value ?? "";

  const searchTokens = theme.custom.input.search;

  const widthSx = {
    width: {
      xs: searchTokens.mobileWidth,
      md: searchTokens.width,
    },
  };

  return (
    <TextField
      {...rest}
      value={safeValue}
      type="search"
      size="small"
      variant="outlined"
      placeholder={props.placeholder ?? "Rechercher..."}
      fullWidth={false}
      sx={
        sxProp === undefined
          ? widthSx
          : Array.isArray(sxProp)
            ? [...sxProp, widthSx]
            : [sxProp, widthSx]
      }
    />
  );
}