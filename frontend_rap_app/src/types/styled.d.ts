// src/styled.d.ts
import "styled-components";

declare module "styled-components" {
  export interface DefaultTheme {
    colors: {
      background: string;
      backgroundLight: string;
      surface: string;
      text: string;
      primary: string;
      success: string;
      error: string;
      warning: string;
      info: string;
      accent: string;
      secondary: string;
      disabled: string;
      border: string;
      white: string;
      black: string;
      gray: string;
      primaryFocus?: string;

      // 🌈 couleurs sémantiques
      textPrimary: string;
      textSecondary: string;
      backgroundDefault: string;
      backgroundPaper: string;
      onPrimary: string;
      onSurface: string;

      // ✨ couleurs de hover facultatives
      hoverPrimary?: string;
      hoverSecondary?: string;
      hoverSuccess?: string;
      hoverError?: string;
      hoverWarning?: string;
    };

    spacing: {
      xs: string;
      s: string;
      m: string;
      l: string;
      xl: string;
    };

    fontSizes: {
      small: string;
      body: string;
      title: string;
      header: string;
    };

    borderRadius: {
      s: string;
      m: string;
      l: string;
    };

    fontWeights: {
      normal: number;
      medium: number;
      bold: number;
    };

    breakpoints: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };

    zIndex: {
      base: number;
      dropdown: number;
      overlay: number;
      modal: number;
      toast: number;
    };

    shadows: {
      none: string;
      sm: string;
      md: string;
      lg: string;
    };
  }
}
// src/styled.d.ts
import "styled-components";

declare module "styled-components" {
  export interface DefaultTheme {
    colors: {
      background: string;
      backgroundLight: string;
      surface: string;
      text: string;
      primary: string;
      success: string;
      error: string;
      warning: string;
      info: string;
      accent: string;
      secondary: string;
      disabled: string;
      border: string;
      white: string;
      black: string;
      gray: string;
      primaryFocus?: string;

      // 🌈 couleurs sémantiques
      textPrimary: string;
      textSecondary: string;
      backgroundDefault: string;
      backgroundPaper: string;
      onPrimary: string;
      onSurface: string;

      // ✨ couleurs de hover facultatives
      hoverPrimary?: string;
      hoverSecondary?: string;
      hoverSuccess?: string;
      hoverError?: string;
      hoverWarning?: string;

      // 🆕 Couleurs spécifiques Dashboard (facultatives)
      dashboardBackground?: string;
      dashboardCard?: string;
      dashboardAccent?: string;
    };

    // … le reste inchangé …

    // 🆕 Section spéciale Dashboard
    dashboard?: {
      cardRadius?: string;
      cardPadding?: string;
      headerHeight?: string;
    };
  }
}
