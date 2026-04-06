import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

type ConfirmDialogTone = "default" | "warning" | "danger";

type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  children?: ReactNode;
};

const toneMap: Record<ConfirmDialogTone, "inherit" | "warning" | "error"> = {
  default: "inherit",
  warning: "warning",
  danger: "error",
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "default",
  loading = false,
  onClose,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const confirmColor = toneMap[tone];

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <WarningAmberRoundedIcon color={tone === "danger" ? "error" : "warning"} />
          <Typography variant="h6" component="span">
            {title}
          </Typography>
        </Stack>
      </DialogTitle>

      {(description || children) && (
        <DialogContent sx={{ pt: 0.5 }}>
          {description ? <DialogContentText>{description}</DialogContentText> : null}
          {children}
        </DialogContent>
      )}

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          onClick={() => void onConfirm()}
          variant="contained"
          color={confirmColor}
          disabled={loading}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
