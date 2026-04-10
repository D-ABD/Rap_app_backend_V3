import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Typography } from "@mui/material";
import type { LogEntry } from "../../types/log";

interface Props {
  open: boolean;
  log: LogEntry | null;
  onClose: () => void;
}

export default function LogDetailModal({ open, log, onClose }: Props) {
  if (!log) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Log #{log.id}</DialogTitle>
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
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
