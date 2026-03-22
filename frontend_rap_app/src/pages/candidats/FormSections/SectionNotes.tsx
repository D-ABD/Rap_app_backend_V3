import React, { useCallback } from "react";
import { Card, CardHeader, CardContent, TextField } from "@mui/material";
import type { CandidatFormData } from "../../../types/candidat";

interface Props {
  form: CandidatFormData;
  setForm: React.Dispatch<React.SetStateAction<CandidatFormData>>;
}

function SectionNotes({ form, setForm }: Props) {
  const updateNotes = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm((f) => ({ ...f, notes: value }));
    },
    [setForm]
  );

  return (
    <Card variant="outlined">
      <CardHeader
        title="Notes / Observations"
        subheader="Ajoutez tout contexte utile (entretien, contraintes, remarques…)"
      />
      <CardContent>
        <TextField
          fullWidth
          multiline
          minRows={4}
          placeholder="Saisir une note…"
          value={form.notes ?? ""}
          onChange={updateNotes}
        />
      </CardContent>
    </Card>
  );
}

export default React.memo(SectionNotes);
