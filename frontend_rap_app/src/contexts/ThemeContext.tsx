// src/contexts/ThemeContext.tsx
import { createContext } from "react";

/**
 * 🎨 ThemeMode
 */
export type ThemeMode = "light" | "dark";

/**
 * 🔁 ThemeContextType
 */
export interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

/**
 * 🧠 ThemeContext
 */
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
