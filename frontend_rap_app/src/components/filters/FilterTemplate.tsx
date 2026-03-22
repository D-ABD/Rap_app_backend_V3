// src/components/filters/FilterTemplate.tsx
import React from "react";
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Box,
} from "@mui/material";

type Option = { value: string | number; label: string };
type FieldType = "select" | "text" | "number" | "checkbox" | "date";

export type FieldConfig<T, K extends keyof T = keyof T> = {
  key: K;
  label: string;
  type: FieldType;
  options?: Option[];
  placeholder?: string;
  disabled?: boolean;
  hidden?: boolean;
  width?: string | number;
  parse?: (raw: string) => T[K] | undefined;
  format?: (val: T[K] | undefined) => string;
};

type Actions = {
  onReset?: () => void;
  onRefresh?: () => void;
  resetLabel?: string;
  refreshLabel?: string;
};

type Props<T extends object> = {
  values: T;
  onChange: (next: T) => void;
  fields: FieldConfig<T>[];
  actions?: Actions;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  loading?: boolean;
};

function isNumberOption(opts?: Option[]): boolean {
  return Array.isArray(opts) && opts.some((o) => typeof o.value === "number");
}

const toSelectValue = (v: unknown): string => (v == null ? "" : String(v));
const toInputValue = (v: unknown): string => (v == null ? "" : String(v));

function autoParse(raw: string, type: FieldType, opts?: Option[]) {
  if (raw === "") return undefined;
  if (type === "number") return Number(raw);
  if (type === "select" && isNumberOption(opts)) return Number(raw);
  return raw;
}

export default function FilterTemplate<T extends object>({
  values,
  onChange,
  fields,
  actions,
  cols = 4,
  loading,
}: Props<T>) {
  const safeValues =
    values && typeof values === "object"
      ? (values as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  return (
    <Box
      sx={{
        mb: 2,
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        backgroundColor: "background.default",
      }}
      aria-busy={!!loading}
      aria-live="polite"
    >
      <Grid container spacing={2}>
        {fields
          .filter((f) => f && f.key != null && !f.hidden)
          .map((f) => {
            const k = String(f.key);
            const val = safeValues[k];
            const disabled = !!loading || f.disabled;

            return (
              <Grid item xs={12} sm={6} md={12 / cols} key={k}>
                {f.type === "select" && (
                  <FormControl fullWidth size="small" disabled={disabled}>
                    <InputLabel>{f.label}</InputLabel>
                    <Select
                      value={toSelectValue(val)}
                      label={f.label}
                      onChange={(e) => {
                        const nextVal = f.parse
                          ? f.parse(e.target.value)
                          : autoParse(e.target.value, f.type, f.options);
                        onChange({
                          ...(values as T),
                          [f.key]: nextVal,
                        } as T);
                      }}
                    >
                      <MenuItem value="">— Tous —</MenuItem>
                      {(f.options ?? []).map((opt) => (
                        <MenuItem key={String(opt.value)} value={String(opt.value)}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {f.type === "text" && (
                  <TextField
                    fullWidth
                    size="small"
                    label={f.label}
                    placeholder={f.placeholder}
                    disabled={disabled}
                    value={f.format ? f.format(val as T[keyof T]) : toInputValue(val)}
                    onChange={(e) =>
                      onChange({
                        ...(values as T),
                        [f.key]: f.parse ? f.parse(e.target.value) : e.target.value,
                      } as T)
                    }
                  />
                )}

                {f.type === "number" && (
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label={f.label}
                    placeholder={f.placeholder}
                    disabled={disabled}
                    value={toInputValue(val)}
                    onChange={(e) =>
                      onChange({
                        ...(values as T),
                        [f.key]: f.parse
                          ? f.parse(e.target.value)
                          : autoParse(e.target.value, "number"),
                      } as T)
                    }
                  />
                )}

                {f.type === "date" && (
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label={f.label}
                    InputLabelProps={{ shrink: true }}
                    disabled={disabled}
                    value={toInputValue(val)}
                    onChange={(e) =>
                      onChange({
                        ...(values as T),
                        [f.key]: f.parse ? f.parse(e.target.value) : e.target.value,
                      } as T)
                    }
                  />
                )}

                {f.type === "checkbox" && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(val)}
                        onChange={(e) =>
                          onChange({
                            ...(values as T),
                            [f.key]: e.target.checked,
                          } as T)
                        }
                        disabled={disabled}
                      />
                    }
                    label={f.label}
                  />
                )}
              </Grid>
            );
          })}

        {(actions?.onReset || actions?.onRefresh) && (
          <Grid
            item
            xs={12}
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 1,
              mt: 1,
            }}
          >
            {actions?.onReset && (
              <Button
                variant="outlined"
                size="small"
                onClick={actions.onReset}
                disabled={!!loading}
              >
                ♻︎ {actions.resetLabel ?? "Réinitialiser"}
              </Button>
            )}
            {actions?.onRefresh && (
              <Button
                variant="outlined"
                size="small"
                onClick={actions.onRefresh}
                disabled={!!loading}
              >
                ↻ {actions.refreshLabel ?? "Rafraîchir"}
              </Button>
            )}
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
