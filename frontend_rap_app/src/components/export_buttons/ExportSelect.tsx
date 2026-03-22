import { Select, MenuItem, SelectChangeEvent } from "@mui/material";
import { ExportFormat } from "../../types/export";

interface ExportSelectProps {
  value: ExportFormat;
  onChange: (value: ExportFormat) => void;
  options?: ExportFormat[]; // ✅ permet de limiter les formats par page
}

const DEFAULT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: "pdf", label: "📄 PDF" },
  { value: "xlsx", label: "📑 Excel" },
];

export default function ExportSelect({ value, onChange, options }: ExportSelectProps) {
  const handleChange = (e: SelectChangeEvent<ExportFormat>) => {
    onChange(e.target.value as ExportFormat);
  };

  const visibleOptions = options
    ? DEFAULT_OPTIONS.filter((opt) => options.includes(opt.value))
    : DEFAULT_OPTIONS;

  return (
    <Select
      value={value}
      onChange={handleChange}
      aria-label="Format d’export"
      title="Choisir le format d’export"
      size="small"
      sx={{ minWidth: 180 }}
    >
      {visibleOptions.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </Select>
  );
}
