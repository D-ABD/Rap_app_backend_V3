// src/components/modals/PostCreateChoiceModal.tsx
import { ReactNode } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

type Variant = "primary" | "secondary" | "danger" | "success" | "warning";

type NavButtonProps = {
  href: string;
  label: string;
  variant?: Variant;
  onClick?: () => void;
};

function NavButton({ href, label, variant = "primary", onClick }: NavButtonProps) {
  return (
    <Button
      component="a"
      href={href}
      onClick={onClick}
      variant={variant === "secondary" ? "outlined" : "contained"}
      color={
        variant === "danger"
          ? "error"
          : variant === "success"
            ? "success"
            : variant === "warning"
              ? "warning"
              : "primary"
      }
      sx={{ textTransform: "none" }}
    >
      {label}
    </Button>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;

  resourceLabel: string;
  persistId?: number;
  extraContent?: ReactNode;

  primaryHref?: string;
  primaryLabel?: string;
  primaryVariant?: Variant;

  secondaryHref?: string;
  secondaryLabel?: string;
  secondaryVariant?: Variant;

  tertiaryHref?: string;
  tertiaryLabel?: string;
  tertiaryVariant?: Variant;

  cancelLabel?: string;
  cancelVariant?: Variant;
};

export default function PostCreateChoiceModal({
  open,
  onClose,
  resourceLabel,
  persistId,
  extraContent,

  primaryHref,
  primaryLabel,
  primaryVariant = "primary",

  secondaryHref,
  secondaryLabel,
  secondaryVariant = "secondary",

  tertiaryHref,
  tertiaryLabel,
  tertiaryVariant = "secondary",

  cancelLabel,
  cancelVariant = "secondary",
}: Props) {
  const hasPrimary = !!primaryHref && !!primaryLabel;
  const hasSecondary = !!secondaryHref && !!secondaryLabel;
  const hasTertiary = !!tertiaryHref && !!tertiaryLabel;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {resourceLabel} créé{persistId ? ` (#${persistId})` : ""}
      </DialogTitle>
      <DialogContent dividers>
        {extraContent}
        <Typography sx={{ mt: 1 }}>Que souhaitez-vous faire ensuite&nbsp;?</Typography>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1, justifyContent: "flex-end" }}>
        {hasPrimary && (
          <NavButton
            href={primaryHref!}
            label={primaryLabel!}
            variant={primaryVariant}
            onClick={onClose}
          />
        )}
        {hasSecondary && (
          <NavButton
            href={secondaryHref!}
            label={secondaryLabel!}
            variant={secondaryVariant}
            onClick={onClose}
          />
        )}
        {hasTertiary && (
          <NavButton
            href={tertiaryHref!}
            label={tertiaryLabel!}
            variant={tertiaryVariant}
            onClick={onClose}
          />
        )}
        {cancelLabel && (
          <Button
            onClick={onClose}
            variant={cancelVariant === "secondary" ? "outlined" : "contained"}
            color={
              cancelVariant === "danger"
                ? "error"
                : cancelVariant === "success"
                  ? "success"
                  : cancelVariant === "warning"
                    ? "warning"
                    : "primary"
            }
            sx={{ textTransform: "none" }}
          >
            {cancelLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
