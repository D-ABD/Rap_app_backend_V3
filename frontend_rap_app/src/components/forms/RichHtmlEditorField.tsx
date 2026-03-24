import { Box, FormHelperText, Typography } from "@mui/material";
import { useEffect } from "react";
import { useQuill } from "react-quilljs";
import "quill/dist/quill.snow.css";
import { defaultFormats, defaultModules } from "../../utils/registerQuillFormats";

interface Props {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  error?: boolean;
  helperText?: string;
}

export default function RichHtmlEditorField({
  label,
  value,
  onChange,
  placeholder,
  minHeight = 140,
  error = false,
  helperText,
}: Props) {
  const { quill, quillRef } = useQuill({
    theme: "snow",
    modules: defaultModules,
    formats: defaultFormats,
    placeholder,
  });

  useEffect(() => {
    if (!quill) return;
    const incoming = value ?? "";
    const current = quill.root.innerHTML === "<p><br></p>" ? "" : quill.root.innerHTML;
    if (incoming !== current) {
      quill.setContents([]);
      if (incoming) quill.clipboard.dangerouslyPasteHTML(incoming);
    }
  }, [quill, value]);

  useEffect(() => {
    if (!quill) return;
    const sync = () => {
      const text = quill.getText().trim();
      onChange(text ? quill.root.innerHTML : "");
    };
    quill.on("text-change", sync);
    return () => quill.off("text-change", sync);
  }, [onChange, quill]);

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>
      <Box
        sx={{
          border: (theme) => `1px solid ${error ? theme.palette.error.main : theme.palette.divider}`,
          borderRadius: 1,
          overflow: "hidden",
          backgroundColor: "#fff",
          "& .ql-toolbar": {
            border: "none",
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          },
          "& .ql-container": { border: "none" },
          "& .ql-editor": {
            minHeight,
            fontSize: "0.95rem",
            lineHeight: 1.5,
          },
        }}
      >
        <div ref={quillRef} />
      </Box>
      {helperText ? <FormHelperText error={error}>{helperText}</FormHelperText> : null}
    </Box>
  );
}
