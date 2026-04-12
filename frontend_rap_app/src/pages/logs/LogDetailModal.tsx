import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Typography, useTheme } from "@mui/material";
import type { LogEntry } from "../../types/log";
import type { AppTheme } from "src/theme";

interface Props {
  open: boolean;
  log: LogEntry | null;
  onClose: () => void;
}

export default function LogDetailModal({ open, log, onClose }: Props) {
  const theme = useTheme<AppTheme>();
  const isLight = theme.palette.mode === "light";
  const modalScrim = isLight ? theme.custom.overlay.scrim.background.light : theme.custom.overlay.scrim.background.dark;
  const modalTitleBackground = isLight ? theme.custom.overlay.modalSectionTitle.background.light : theme.custom.overlay.modalSectionTitle.background.dark;
  const modalTitleBorder = isLight ? theme.custom.overlay.modalSectionTitle.borderBottom.light : theme.custom.overlay.modalSectionTitle.borderBottom.dark;
  if (!log) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" BackdropProps={{ sx: { backgroundColor: modalScrim } }}>
      <DialogTitle sx={{ backgroundColor: modalTitleBackground, borderBottom: modalTitleBorder }}>Log #{log.id}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2">Date</Typography>
              <Typography>{log.date}</Typography>
              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                Action
              </Typography>
              <Typography>{log.action}</Typography>
              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                Modèle
              </Typography>
              <Typography>{log.model || "—"}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2">Object ID</Typography>
              <Typography>{log.object_id ?? "—"}</Typography>
              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                Utilisateur
              </Typography>
              <Typography>{log.user}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Détails
              </Typography>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>{log.details || "—"}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ borderTop: modalTitleBorder }}>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
