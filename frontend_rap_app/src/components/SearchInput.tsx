// src/components/SearchInput.tsx
import { TextField } from "@mui/material";
import type { TextFieldProps } from "@mui/material";

export default function SearchInput(props: TextFieldProps) {
  const safeValue = props.value ?? ""; // 🔥 Force controlled value
  
  return (
    <TextField
      {...props}
      value={safeValue}              // 🔥 ON FORCE ICI
      type="search"
      size="small"
      variant="outlined"
      placeholder={props.placeholder ?? "Rechercher..."}
      fullWidth={false}
      sx={{
        width: "clamp(240px, 40vw, 420px)",
        maxWidth: "100%",
        "& .MuiOutlinedInput-root.Mui-focused fieldset": {
          borderColor: (theme) => theme.palette.primary.main,
          boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}33`,
        },
        "& .MuiInputBase-input::placeholder": {
          color: (theme) => theme.palette.text.secondary,
          opacity: 1,
        },
        "@media (max-width:768px)": {
          width: "100%",
        },
      }}
    />
  );
}
