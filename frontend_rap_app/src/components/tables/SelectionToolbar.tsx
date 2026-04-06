import { Button } from "@mui/material";

export type SelectionToolbarProps = {
  /** Nombre d’éléments sélectionnés ; si 0, rien n’est rendu. */
  count: number;
  onClear: () => void;
  onSelectAll: () => void;
  children?: React.ReactNode;
  selectAllLabel?: string;
  clearLabel?: string;
};

/**
 * Actions de sélection multiple (sélectionner tout / annuler) + slot pour actions métier (ex. archivage).
 */
export default function SelectionToolbar({
  count,
  onClear,
  onSelectAll,
  children,
  selectAllLabel = "Tout sélectionner",
  clearLabel = "Annuler",
}: SelectionToolbarProps) {
  if (count <= 0) return null;

  return (
    <>
      {children}
      <Button variant="outlined" onClick={onSelectAll}>
        {selectAllLabel}
      </Button>
      <Button variant="outlined" onClick={onClear}>
        {clearLabel}
      </Button>
    </>
  );
}
