// src/pages/prospections/components/ProspectionCommentsBlock.tsx
import { useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import ProspectionCommentsModal from "../../../components/modals/ProspectionCommentsModal";

type Props = {
  prospectionId: number;
  isStaff?: boolean;
};

export default function ProspectionCommentsBlock({ prospectionId, isStaff = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Box mt={3}>
      <Typography variant="h6" gutterBottom>
        Commentaires
      </Typography>

      <Button
        variant="outlined"
        startIcon={<span aria-hidden>💬</span>}
        onClick={() => setOpen(true)}
      >
        Ouvrir les commentaires
      </Button>

      <ProspectionCommentsModal
        open={open}
        onClose={() => setOpen(false)}
        prospectionId={prospectionId}
        isStaff={isStaff}
      />
    </Box>
  );
}
