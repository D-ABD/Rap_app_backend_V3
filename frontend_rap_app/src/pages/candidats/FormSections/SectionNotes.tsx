import React, { useCallback } from "react";
import { Card, CardHeader, CardContent } from "@mui/material";
import AppTextField from "../../../components/forms/fields/AppTextField";
import type { CandidatFormData } from "../../../types/candidat";

interface Props {
  form: CandidatFormData;
  setForm: React.Dispatch<React.SetStateAction<CandidatFormData>>;
  errors?: Record<string, string[]>;
}

function SectionNotes({ form, setForm, errors }: Props) {
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
        <AppTextField
          fullWidth
          multiline
          minRows={4}
          placeholder="Saisir une note…"
          value={form.notes ?? ""}
          onChange={updateNotes}
          error={!!errors?.notes?.length}
          helperText={errors?.notes?.[0]}
        />
      </CardContent>
    </Card>
  );
}

export default React.memo(SectionNotes);
