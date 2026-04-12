# Tokens design system — source de vérité TypeScript

Ce document décrit les jetons **`theme.custom.*`** : la définition stricte vit dans le code TypeScript, pas dans ce fichier.

## Convention de typage du thème

Pour conserver la **compatibilité** avec le premier `createTheme(...)` interne, la propriété **`custom`** reste **optionnelle** dans l’augmentation globale de `Theme`.

En revanche, le thème **réellement retourné** par l’application est typé via **`AppTheme`**, qui **garantit** la présence de `custom`.

### Règle d’usage dans l’application

Dans les composants qui lisent les **tokens personnalisés** (`theme.custom.*`), utiliser :

```tsx
import { useTheme } from "@mui/material";
import type { AppTheme } from "../theme";

const theme = useTheme<AppTheme>();
```

On accède ainsi à `theme.custom.layout`, `theme.custom.nav`, `theme.custom.footer`, etc. **sans** `?.` sur `custom`.

### Règle de migration

| Contexte | Référence |
|----------|-----------|
| Thème MUI interne (`getTheme`, `createTheme`) | `custom` peut rester optionnel pour compatibilité avec l’API MUI. |
| Code applicatif | Référence recommandée : **`AppTheme`**. |
| Nouveaux composants / migration design system | **`useTheme<AppTheme>()`** systématique dès qu’on consomme `theme.custom`. |

Éviter le mélange **`useTheme()`** / **`useTheme<AppTheme>()`** et **`theme.custom?.`** / **`theme.custom.`** dans le même périmètre : pour tout code qui touche aux jetons du design system, **`useTheme<AppTheme>()`** uniquement.

---

## Fichiers source

| Fichier | Rôle |
|---------|------|
| `src/theme/tokens/appCustomTokens.types.ts` | Interfaces imbriquées (`AppCustomTokens`, `NavDrawerItemTokens`, …), type **`AppTheme`**, augmentation `Theme.custom`. |
| `src/theme/tokens/createAppCustomTokens.ts` | Fabrique `createAppCustomTokens(theme)` : valeurs résolues (chaînes CSS, alphas, références palette). |
| `src/theme/tokens/index.ts` | Réexport public (`AppCustomTokens`, `AppTheme`, `createAppCustomTokens`). |
| `src/theme.ts` | Fusion des jetons dans `getTheme` (retour typé **`AppTheme`**) via `createTheme(theme, { custom: createAppCustomTokens(theme) })`. |

## Accès dans les composants

```tsx
import { useTheme } from "@mui/material";
import type { AppTheme } from "../theme";

const Footer = () => {
  const theme = useTheme<AppTheme>();

  return (
    <Box
      sx={{
        borderTop: `${theme.custom.footer.border.widthPx}px ${theme.custom.footer.border.style} ${
          theme.palette.mode === "light"
            ? theme.custom.footer.border.color.light
            : theme.custom.footer.border.color.dark
        }`,
        background:
          theme.palette.mode === "light"
            ? theme.custom.footer.background.gradient.light
            : theme.custom.footer.background.gradient.dark,
      }}
    />
  );
};
```

## Arborescence `theme.custom` (aperçu)

Chaque branche est typée explicitement ; pas de clés « plates » ambiguës pour la navigation.

```
custom
├── layout
│   ├── shell.backgroundGradient.{ light, dark }
│   └── main.{ paddingX.{ xs, sm, md }, backdropBlur.{ sm, md, lg } }
├── nav
│   ├── drawerItem
│   │   ├── transitionDurationMs, easing
│   │   ├── sizing.{ minHeightSx.{ root, branch }, borderRadiusSx.{ root, branch } }
│   │   ├── spacing.{ marginXSx, marginYSx, paddingXSx.{ root, branch }, paddingLeftSx.{ root, branch } }
│   │   ├── icon.{ minWidthPx, translateXSelectedPx }
│   │   ├── label.{ root.{ fontSizeRem, fontWeight }, branch.{ fontSizeRem, fontWeight } }
│   │   └── interaction.{ selected.{ background, insetRing }, hover.{ backdropFromText } }  // alphas 0–1
│   └── topButton
│       ├── typography.{ fontSizeRem, letterSpacing, fontWeight.{ active, idle } }
│       ├── shape.{ minHeightPx, paddingXSx, borderRadiusPill }
│       ├── border.{ widthPx, style }
│       ├── transitionDurationMs, easing
│       └── state.{ active.{ borderWhiteAlpha, backgroundWhiteAlpha, insetBottomShadow }, idle.{…}, hover.{…} }
├── footer
│   ├── border.{ widthPx, style, color.{ light, dark } }
│   ├── background.gradient.{ light, dark }
│   ├── elevation.boxShadow.{ light, dark }
│   ├── accentOverlay.{ gradient.{ light, dark }, opacity }
│   └── backdrop.{ filter }
├── surface
│   ├── pageHeader.{ outer.{ paddingX, paddingY }, inner.{ paddingX, paddingY, border, shape, boxShadow } }
│   ├── elevated.{ boxShadowRest, boxShadowHover }
│   └── muted.background.{ light, dark }
├── kpi
│   ├── cardBackground.rest.{ light, dark }
│   ├── elevation.{ rest, hover }.{ light, dark }
│   └── highlight.{ outlineWidthPx, outlineStyle }
├── table
│   ├── header.{ background, borderBottom }.{ light, dark }
│   ├── row.{ stripedEven, hover, archived.{ background, opacity } }
│   └── cell.borderBottom.{ light, dark }
├── form
│   ├── section.{ paperBackground, accentHeaderBackground }.{ light, dark }
│   └── divider.{ dashedColor.{ light, dark }, dashedWidth }
├── overlay
│   ├── scrim.background.{ light, dark }
│   └── modalSectionTitle.{ background, borderBottom }.{ light, dark }
├── typographyComplements.{ eyebrowLetterSpacing, pageTitleLetterSpacing }
├── status
│   ├── prospection.{ archived.{ rowBackground, chipBackground, chipColor, chipBorder }, active.{…} }
│   └── chip.{ placeholderText }
├── chart
│   ├── axis.stroke.{ light, dark }
│   ├── grid.stroke.{ light, dark }
│   ├── tooltip.{ background, border }.{ light, dark }
│   └── series.ordered (readonly string[])
├── editor.quill.{ black, white, red, … }
└── dataviz.statut.pickableHex (readonly — aligné sur `STATUT_COLORS`)
```

## Nommage

- **`root` / `branch`** : item de liste racine vs sous-item (drawer), au lieu de `nested` ambigu dans les types exportés.
- **`LightDark<T>`** : paires explicites `{ light: T; dark: T }` pour les chaînes CSS ou les alphas.
- Les **alphas** dans `nav.drawerItem.interaction` sont des **nombres** destinés à `alpha(theme.palette.*, value)` dans les helpers `sx` (lot migration navigation).

## Évolution

- Ajouter un domaine : nouvelle interface `CustomXxxTokens` + clé sous `AppCustomTokens` + implémentation dans `createAppCustomTokens`.
- Modifier une valeur : éditer **uniquement** `createAppCustomTokens.ts` (ou factoriser des constantes partagées dans un fichier `defaults` si besoin).

---

*La liste tabulaire historique a été remplacée par cette structure exécutable ; l’audit détaillé reste dans `_audit.md`.*
