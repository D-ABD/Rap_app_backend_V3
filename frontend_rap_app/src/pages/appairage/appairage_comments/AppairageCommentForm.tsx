// src/pages/appairages/appairage_comments/AppairageCommentForm.tsx
import { useCallback, useEffect, useId, useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import type {
  AppairageCommentCreateInput,
  AppairageCommentUpdateInput,
  AppairageCommentDTO,
} from "../../../types/appairageComment";

type Props = {
  initial?: AppairageCommentDTO | null;
  appairageId?: number;
  onSubmit: (data: AppairageCommentCreateInput | AppairageCommentUpdateInput) => Promise<void>;
};

const MAX_BODY_LEN = 4000;

export default function AppairageCommentForm({ initial = null, appairageId, onSubmit }: Props) {
  const [appairage, setAppairage] = useState<number | "">(initial?.appairage ?? appairageId ?? "");
  const [body, setBody] = useState<string>(initial?.body ?? "");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const bodyId = useId();

  useEffect(() => {
    if (appairageId != null) {
      setAppairage(appairageId);
    }
  }, [appairageId]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      if (body.trim().length === 0) {
        setError("Veuillez renseigner un commentaire.");
        return;
      }

      setSubmitting(true);

      const payload: AppairageCommentCreateInput | AppairageCommentUpdateInput = initial
        ? { body: body.trim() } // update → seul le body est modifiable
        : {
            appairage: Number(appairage),
            body: body.trim(),
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
    [appairage, body, onSubmit, initial]
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
        <TextField
          id={bodyId}
          label="Commentaire"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          fullWidth
          multiline
          minRows={3}
          inputProps={{ maxLength: MAX_BODY_LEN }}
        />

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
