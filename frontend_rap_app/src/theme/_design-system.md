# Design system cible — dossier `src/theme/`

**Objectif :** centraliser les décisions visuelles dans le module `src/theme/` tout en conservant **`src/theme.ts` à la racine** comme **façade** pour le reste de l’application (`getTheme`, export par défaut).

**Principe :** les évolutions de **consommation** (`theme.custom` dans les composants) se font **sans changer le comportement métier** ; toute refonte visuelle globale reste pilotée par `getTheme` et les jetons documentés dans `_tokens.md`.

**Convention :** dans le code applicatif, tout composant qui **consomme les tokens du design system** (`theme.custom.*`) utilise **`useTheme<AppTheme>()`** (voir `_tokens.md`, section « Convention de typage du thème »). Cela évite un mélange de `useTheme()` / `useTheme<AppTheme>()` et de `theme.custom?.` / `theme.custom.` au fil des migrations.

---

## État actuel (aligné avec `_migration-plan.md`)

### Déjà en place

- **`src/theme.ts`** : définition complète du thème MUI (`createTheme`, `palette`, `typography`, `shadows`, `components`, etc.) + fusion **`theme.custom`** via `createAppCustomTokens(theme)` après `responsiveFontSizes`.
- **`src/theme/tokens/`** :
  - `appCustomTokens.types.ts` — interfaces imbriquées strictes + augmentation `Theme.custom`.
  - `createAppCustomTokens.ts` — valeurs résolues consommables (`layout`, `nav`, `footer`, `surface`, `kpi`, `table`, `form`, `overlay`, `chart`, `editor`, `dataviz`, …).
  - `index.ts` — réexport public.
- **Documentation** : `_audit.md`, `_design-system.md`, `_tokens.md`, `_migration-plan.md`.

### Encore à faire (cible d’architecture)

- **Découper** le gros `theme.ts` en `palette.ts`, `typography.ts`, `shadows.ts`, `components.ts`, éventuellement `index.ts` qui assemble — **sans** modifier le rendu ni la façade `src/theme.ts` (refactor interne optionnel).
- **Migrer les composants** pour qu’ils lisent `theme.custom.*` au lieu de littéraux (voir lots dans `_migration-plan.md`).

---

## 1. Structure de dossier — actuelle + cible optionnelle

### Actuelle (réelle)

```
src/
  theme.ts                    # getTheme + createTheme + merge theme.custom
  theme/
    _audit.md
    _design-system.md         # ce fichier
    _tokens.md
    _migration-plan.md
    tokens/
      appCustomTokens.types.ts
      createAppCustomTokens.ts
      index.ts
```

### Cible optionnelle (refactor Phase « modularisation »)

```
src/
  theme.ts                    # Façade : importe depuis ./theme/index ou réexporte getTheme
  theme/
    index.ts                  # createTheme assemblé, responsiveFontSizes, merge custom
    types.ts                  # declare module (Palette, Theme, Chip, Button…)
    palette.ts
    typography.ts
    shadows.ts
    components.ts             # MuiCssBaseline, MuiButton, …
    tokens/                   # inchangé (types + fabrique custom)
    ...
```

**Remarque :** le découpage en `palette.ts` / `components.ts` est **indépendant** de la migration des écrans vers `theme.custom` ; il peut être planifié quand la dette de `theme.ts` devient pénible à maintenir.

---

## 2. Fichiers « à créer » uniquement si modularisation

| Fichier | Responsabilité |
|---------|----------------|
| `theme/index.ts` | Assembler `createTheme`, `responsiveFontSizes`, fusion `custom`. |
| `theme/types.ts` | Extensions `declare module` (hors celles déjà dans `theme.ts` / `appCustomTokens.types.ts` — à consolider pour éviter doublons). |
| `theme/palette.ts` | Extraction de l’objet `palette` actuel. |
| `theme/typography.ts` | Extraction de `typography`. |
| `theme/shadows.ts` | Extraction des tableaux `shadows`. |
| `theme/components.ts` | Extraction de `components: { Mui* }`. |

Les **jetons `custom`** ne sont **pas** dans un fichier nommé `custom.ts` à la racine de `theme/` : ils vivent dans **`theme/tokens/`** (types + `createAppCustomTokens`).

---

## 3. Organisation des tokens

### 3.1 Niveau MUI standard (dans `theme.ts` aujourd’hui)

- **`palette`**, **`typography`**, **`shape`**, **`shadows`**, **`components`** : comportement des primitives MUI.

### 3.2 Niveau `custom` (`theme.custom` — types dans `appCustomTokens.types.ts`)

Regrouper tout ce qui est **réutilisable** et **non couvert** par une seule primitive :

- **Layout shell** : `custom.layout.shell`, `custom.layout.main` (gradients, padding, blur).
- **Navigation** : `custom.nav.drawerItem.*`, `custom.nav.topButton.*` (structures imbriquées, pas de clés plates ambiguës).
- **Footer** : `custom.footer.*` (bordure, fond, ombre, overlay, backdrop).
- **Surfaces** : `custom.surface.*` (pageHeader, elevated, muted).
- **KPI, tables, formulaires, overlays, chart, editor, dataviz** : voir arborescence dans `_tokens.md`.

**Convention :** clés **sémantiques** et **imbriquées** ; les chaînes CSS finales sont produites par **`createAppCustomTokens(theme)`** pour rester cohérentes avec `palette.mode`.

---

## 4. Conventions de nommage

- **Domaine** : `layout`, `nav`, `footer`, `surface`, `kpi`, `table`, `form`, `overlay`, `chart`, `editor`, `dataviz`, `status`, …
- **Mode** : paires `LightDark<T>` ou champs `light` / `dark` dans les types ; la fabrique utilise `theme.palette` et `alpha` où nécessaire.
- **Éviter la duplication** avec `palette` : si la valeur est déjà `divider` ou `background.paper`, le composant peut utiliser la palette MUI ; les tokens `custom` servent aux **assemblages** (gradients, ombres composées) et aux **valeurs métier** (table legacy, prospection).

---

## 5. Mapping styles locaux → `theme.custom` (référence)

| Origine typique | Emplacement actuel dans les tokens |
|-----------------|-----------------------------------|
| `MainLayout*` (fond racine) | `custom.layout.shell.backgroundGradient` |
| `footer.tsx` | `custom.footer.{ border, background, elevation, accentOverlay, backdrop }` |
| `navigationStyles.ts` | `custom.nav.drawerItem.*`, `custom.nav.topButton.*` |
| `PageTemplate` / `StatCard` | `custom.surface.pageHeader`, `custom.kpi.*` |
| Tables legacy | `custom.table.*` |
| Recharts | `custom.chart.*` |
| `STATUT_COLORS` | `custom.dataviz.statut.pickableHex` (référence partagée) |

Le détail des clés est dans **`_tokens.md`** et dans **`appCustomTokens.types.ts`**.

---

## 6. Compatibilité imports

- Les imports applicatifs continuent de viser **`src/theme.ts`** (`getTheme`).
- Les **types** `AppCustomTokens` peuvent être importés depuis **`./theme/tokens`** pour les tests ou helpers ; les pages n’ont pas besoin d’importer la fabrique si elles utilisent uniquement `useTheme().custom`.
- Éviter d’importer des futurs `palette.ts` / `components.ts` depuis les écrans une fois le découpage fait : la façade **`getTheme`** reste le point d’entrée public.

---

*Document aligné sur l’implémentation actuelle (`theme.custom` + `theme/tokens/`) ; la modularisation complète de `theme.ts` reste optionnelle.*
