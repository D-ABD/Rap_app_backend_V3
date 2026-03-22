import React, { useCallback } from "react";
import { Box, Button } from "@mui/material";

type Props = {
  onCancel?: () => void;
  submitting?: boolean;
};

function ActionsBar({ onCancel, submitting }: Props) {
  const handleCancel = useCallback(() => {
    if (onCancel) onCancel();
  }, [onCancel]);

  return (
    <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
      {onCancel && (
        <Button variant="outlined" onClick={handleCancel}>
          Annuler
        </Button>
      )}
      <Button type="submit" variant="contained" disabled={submitting}>
        {submitting ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </Box>
  );
}

export default React.memo(ActionsBar);
