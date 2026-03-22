// src/pages/documents/DocumentPreview.tsx
import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

type Props = {
  url?: string;
  nom?: string;
};

export default function DocumentPreview({ url, nom }: Props) {
  const [open, setOpen] = useState(false);

  // Si pas d’URL → message clair
  if (!url) return <Typography color="text.secondary">Aucun fichier</Typography>;

  // Sécurise les opérations string
  const safeUrl = url ?? "";

  const extension = safeUrl.toLowerCase().split(".").pop() || "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(extension);
  const isPdf = extension === "pdf";

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  return (
    <>
      {isImage ? (
        <Box
          component="img"
          src={safeUrl}
          alt={nom || "aperçu"}
          sx={{
            maxWidth: 80,
            maxHeight: 60,
            objectFit: "contain",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            cursor: "pointer",
          }}
          onClick={handleOpen}
        />
      ) : isPdf ? (
        <Button variant="text" onClick={handleOpen}>
          📄 Voir PDF
        </Button>
      ) : (
        <Button
          variant="text"
          component="a"
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          📎 Télécharger
        </Button>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" component="span">
            {nom || "Aperçu"}
          </Typography>

          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {/* IMAGE */}
          {isImage && (
            <Box
              component="img"
              src={safeUrl}
              alt={nom || "aperçu"}
              sx={{
                maxWidth: "90vw",
                maxHeight: "80vh",
                display: "block",
                margin: "0 auto",
              }}
            />
          )}

          {/* PDF */}
          {isPdf && (
            <Box
              component="iframe"
              src={safeUrl}
              title={nom || "aperçu PDF"}
              sx={{
                width: "90vw",
                height: "80vh",
                border: "none",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
