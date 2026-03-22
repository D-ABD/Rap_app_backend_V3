// src/hooks/useThemeMode.ts

import { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext";

/**
 * 🎨 useThemeMode
 *
 * Hook personnalisé pour accéder au contexte de thème (`ThemeContext`).
 * Il permet de :
 * - connaître le thème actif (`light` ou `dark`)
 * - basculer entre les deux modes avec `toggleTheme()`
 *
 * ✅ Ce hook doit obligatoirement être utilisé dans un composant enfant de `<ThemeProvider>`.
 *
 * @returns Un objet contenant `mode` et `toggleTheme`
 * @throws Une erreur si utilisé en dehors de `<ThemeProvider>`
 */
export const useThemeMode = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemeMode must be used in ThemeProvider");
  }

  return context;
};
