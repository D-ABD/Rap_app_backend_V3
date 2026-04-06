import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  type DialogProps,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

export type DetailViewLayoutProps = {
  open: boolean;
  onClose: () => void;
  /** Titre simple (ignoré si `titleSlot` est fourni) */
  title?: ReactNode;
  /** Remplace entièrement la zone titre (ex. titre + bouton Fermer) */
  titleSlot?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  maxWidth?: DialogProps["maxWidth"];
  fullWidth?: boolean;
  scroll?: DialogProps["scroll"];
  disableEnforceFocus?: boolean;
  /** Styles MUI pour la barre d’actions */
  actionsSx?: SxProps<Theme>;
};

/**
 * Coque de modale « fiche détail » : Dialog + contenu scrollable + actions.
 * Ne contient pas de logique métier.
 */
export default function DetailViewLayout({
  open,
  onClose,
  title,
  titleSlot,
  children,
  actions,
  maxWidth = "md",
  fullWidth = true,
  scroll = "paper",
  disableEnforceFocus,
  actionsSx,
}: DetailViewLayoutProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth={fullWidth}
      maxWidth={maxWidth}
      scroll={scroll}
      disableEnforceFocus={disableEnforceFocus}
    >
      {titleSlot ?? <DialogTitle>{title}</DialogTitle>}
      <DialogContent dividers>{children}</DialogContent>
      {actions != null ? <DialogActions sx={actionsSx}>{actions}</DialogActions> : null}
    </Dialog>
  );
}
