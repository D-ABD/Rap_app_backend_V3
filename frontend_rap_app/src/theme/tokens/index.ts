/**
 * Jetons personnalisés du design system (`theme.custom`).
 * L’import side-effect charge l’augmentation `declare module` pour `Theme.custom`.
 */
import "./appCustomTokens.types";

export type { AppCustomTokens, AppTheme } from "./appCustomTokens.types";
export { createAppCustomTokens } from "./createAppCustomTokens";
