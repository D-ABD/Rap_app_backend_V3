import type { ReactNode } from "react";
import type { TableColumn } from "../ResponsiveTableTemplate";

export type { TableColumn } from "../ResponsiveTableTemplate";

/**
 * Colonne texte simple (valeur par défaut : `row[key]` ou « — »).
 */
export function colText<T extends object>(
  key: keyof T | string,
  label: ReactNode,
  extra?: Partial<TableColumn<T>>
): TableColumn<T> {
  return { key, label, ...extra };
}

/**
 * Colonne entièrement pilotée par un `render`.
 */
export function colCustom<T extends object>(
  key: keyof T | string,
  label: ReactNode,
  render: (row: T) => ReactNode,
  extra?: Partial<TableColumn<T>>
): TableColumn<T> {
  return { key, label, render, ...extra };
}
