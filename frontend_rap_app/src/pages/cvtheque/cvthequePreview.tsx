import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect, useRef } from "react";
import { CVThequeItem } from "src/types/cvtheque";
import api from "src/api/axios";

type Props = {
  item: CVThequeItem;
  open: boolean;
  onClose: () => void;
};

export default function CVThequePreview({ item, open, onClose }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const previousBlobUrlRef = useRef<string | null>(null);

  if (!item) return null;

  const previewUrl = item.preview_url;

  // ================================================================
  // 1️⃣ Charger le PDF en blob (fix 401 + fix ESLint)
  // ================================================================
  useEffect(() => {
    let revoked = false;

    async function loadPdf() {
      if (!open) return;
      if (!previewUrl) return;

      setLoading(true);

      try {
        const response = await api.get(previewUrl, {
          responseType: "blob",
        });

        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        if (!revoked) {
          // Revoke ancien blob (évite fuite mémoire)
          if (previousBlobUrlRef.current) {
            URL.revokeObjectURL(previousBlobUrlRef.current);
          }

          previousBlobUrlRef.current = url;
          setBlobUrl(url);
        }
      } catch (_err) {
        if (!revoked) {
          if (previousBlobUrlRef.current) {
            URL.revokeObjectURL(previousBlobUrlRef.current);
            previousBlobUrlRef.current = null;
          }
          setBlobUrl(null);
        }
      }

      setLoading(false);
    }

    loadPdf();

    // Cleanup propre
    return () => {
      revoked = true;
      if (previousBlobUrlRef.current) {
        URL.revokeObjectURL(previousBlobUrlRef.current);
        previousBlobUrlRef.current = null;
      }
    };
  }, [open, previewUrl]);

  // ================================================================
  // 2️⃣ Aucun fichier disponible
  // ================================================================
  if (!previewUrl) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Typography variant="h6" component="span">
            Aucun fichier disponible
          </Typography>

          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Typography color="text.secondary">
            Ce document n’a pas de fichier associé.
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  const nom = item.titre || "Document";

  // ================================================================
  // 3️⃣ Affichage principal
  // ================================================================
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <Typography variant="h6" component="span">
          {nom}
        </Typography>

        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ textAlign: "center" }}>
        {loading && (
          <Typography sx={{ mb: 2 }}>Chargement du PDF…</Typography>
        )}

        {!loading && blobUrl && (
          <Box
            component="iframe"
            src={blobUrl}
            title={nom}
            sx={{
              width: "100%",
              height: "80vh",
              border: "none",
              borderRadius: 2,
            }}
          />
        )}

        {/* Fallback téléchargement */}
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Si le document ne s'affiche pas :
        </Typography>

        {item.download_url ? (
          <Button
            component="a"
            variant="contained"
            href={item.download_url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mt: 1 }}
          >
            Télécharger le fichier
          </Button>
        ) : (
          <Button variant="contained" disabled sx={{ mt: 1 }}>
            Télécharger le fichier
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
