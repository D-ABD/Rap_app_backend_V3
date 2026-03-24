// src/pages/appairages/appairage_comments/AppairageCommentForm.tsx
import { useCallback, useEffect, useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useQuill } from "react-quilljs";
import "quill/dist/quill.snow.css";
import type {
  AppairageCommentCreateInput,
  AppairageCommentUpdateInput,
  AppairageCommentDTO,
} from "../../../types/appairageComment";
import { colorOptions } from "../../../utils/registerQuillFormats";

type Props = {
  initial?: AppairageCommentDTO | null;
  appairageId?: number;
  onSubmit: (data: AppairageCommentCreateInput | AppairageCommentUpdateInput) => Promise<void>;
};

const MAX_BODY_LEN = 4000;
const TOOLBAR = [
  ["bold", "italic", "strike"],
  [{ color: colorOptions }, { background: colorOptions }],
  ["clean"],
];

export default function AppairageCommentForm({ initial = null, appairageId, onSubmit }: Props) {
  const [appairage, setAppairage] = useState<number | "">(initial?.appairage ?? appairageId ?? "");
  const [body, setBody] = useState<string>(initial?.body ?? "");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { quill, quillRef } = useQuill({
    theme: "snow",
    modules: {
      toolbar: { container: TOOLBAR },
      history: { delay: 500, maxStack: 100, userOnly: true },
      clipboard: { matchVisual: false },
    },
    formats: ["bold", "italic", "strike", "color", "background"],
  });

  useEffect(() => {
    if (appairageId != null) {
      setAppairage(appairageId);
    }
  }, [appairageId]);

  useEffect(() => {
    if (!quill) return;
    const isEmpty = quill.root.innerHTML === "<p><br></p>" || quill.getText().trim() === "";
    if (initial?.body && isEmpty) {
      quill.clipboard.dangerouslyPasteHTML(initial.body);
    }
  }, [quill, initial?.body]);

  useEffect(() => {
    if (!quill) return;
    const sync = () => {
      const html = quill.root.innerHTML ?? "";
      setBody(html);
      if (html.length > MAX_BODY_LEN) {
        quill.deleteText(MAX_BODY_LEN, quill.getLength());
      }
    };
    quill.on("text-change", sync);
    return () => {
      quill.off("text-change", sync);
    };
  }, [quill]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      const bodyHtml = (quill?.root.innerHTML ?? body).trim();
      const bodyText = (quill?.getText() ?? "").trim();
      if (bodyText.length === 0) {
        setError("Veuillez renseigner un commentaire.");
        return;
      }

      setSubmitting(true);

      const payload: AppairageCommentCreateInput | AppairageCommentUpdateInput = initial
        ? { body: bodyHtml } // update → seul le body est modifiable
        : {
            appairage: Number(appairage),
            body: bodyHtml,
          };

      try {
        await onSubmit(payload);
        if (!initial) {
          setBody(""); // reset seulement en création
        }
      } catch {
        setError("Échec de l’enregistrement.");
      } finally {
        setSubmitting(false);
      }
    },
    [appairage, body, onSubmit, initial, quill]
  );

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2 }}>
      <Stack spacing={2}>
        {/* Champ Appairage visible uniquement en création si pas fourni */}
        {!initial && appairageId == null && (
          <TextField
            label="Appairage ID"
            type="number"
            value={appairage}
            onChange={(e) => setAppairage(Number(e.target.value) || "")}
            required
            fullWidth
          />
        )}

        {/* Champ commentaire */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Commentaire
          </Typography>
          <Box
            sx={{
              "& .ql-editor": {
                minHeight: 160,
                maxHeight: 320,
                overflowY: "auto",
                backgroundColor: "#fff",
                borderRadius: 1,
                padding: "0.5rem",
                fontSize: "0.95rem",
                lineHeight: 1.5,
              },
            }}
          >
            <div ref={quillRef} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {MAX_BODY_LEN - body.length} caractères restants
          </Typography>
        </Box>

        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}

        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? "Enregistrement…" : initial ? "Mettre à jour" : "Enregistrer"}
        </Button>
      </Stack>
    </Box>
  );
}
