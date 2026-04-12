# Audit exhaustif du design — frontend Rap App

**Date de l’audit :** 2026-04-12  
**Périmètre :** `frontend_rap_app/src/` (TypeScript / TSX)  
**Méthode :** recherche automatisée (motifs `sx`, `style`, `alpha`, hex, `rgba`, gradients, `backdropFilter`, `useTheme`, `theme.palette`, `styled`, etc.) sur l’arborescence ; lecture ciblée des fichiers de thème, layout, navigation et échantillons représentatifs.

---

## 1. Méthodologie et limites

### 1.1 Ce qui a été couvert

- **~420 fichiers** `.ts` / `.tsx` sous `src/`.
- Requêtes globales sur les motifs demandés (équivalent à une revue « par motif » de tout le dossier `src`).

### 1.2 Lecture manuelle approfondie (échantillon ciblé)

| Fichier | Objectif |
|---------|----------|
| `src/theme.ts` | Source de vérité MUI actuelle (palette, typo, shadows, `components`) |
| `src/layout/navigationStyles.ts` | Styles navigation / tiroir partagés |
| `src/layout/footer.tsx` | Duplication probable avec tokens du thème |
| `src/layout/MainLayout*.tsx` | Coquille, `backdropFilter`, gradients (aperçu) |
| `src/contexts/ThemeProvider.tsx` | Chaîne `getTheme` |
| `src/main.tsx` | `CssBaseline`, imports CSS |
| `src/index.css`, `src/App.css` | CSS global |
| `src/components/PageTemplate.tsx` | Surface d’en-tête, `alpha` |
| `src/components/dashboard/StatCard.tsx` | Ombres / fonds en dur |
| `src/components/filters/FiltresUsersPanel.tsx` | `styled-components` + fallback hex |
| `src/types/styled.d.ts` | Thème parallèle (non branché sur MUI) |

### 1.3 Limites et zones d’incertitude

- **Lecture ligne à ligne** : non réalisée pour chaque page/composant ; l’inventaire des styles **locaux** repose sur les **résultats de grep**. Un fichier sans motif capté peut encore contenir des styles via des helpers non cherchés (ex. constantes importées depuis un autre fichier).
- **Fichiers non sous `src/`** : non inclus (`public/`, config Vite à la racine du package, etc.).
- **`App.css` / `index.css`** : présents dans le repo ; **aucun import** trouvé dans `main.tsx` ou `App.tsx` au moment de l’audit → considérés comme **orphelins ou legacy** jusqu’à vérification manuelle dans la config bundler.
- **Tests** : `src/api/__tests__/axios.test.ts` non prioritaire pour le design ; non analysé en détail.
- **Double `CssBaseline`** : présent dans `ThemeProvider`, `main.tsx` et chaque `MainLayout*.tsx` — comportement MUI généralement idempotent, mais **redondance** à noter pour la maintenance.

---

## 2. Synthèses chiffrées (grep sur `src/`)

| Motif / indicateur | Ordre de grandeur |
|--------------------|-------------------|
| Fichiers avec au moins un `sx={{` | **~274 fichiers** |
| Fichiers avec `style={{` | **~35 fichiers** |
| Fichiers avec `alpha(` | **~11 fichiers** (dont `theme.ts`) |
| Fichiers avec `linear-gradient` / `radial-gradient` (hors `theme.ts` typiquement) | Layouts, `footer`, quelques pages |
| Fichiers avec littéraux `#` hex (hors seul `theme.ts`) | **~50+ fichiers** (widgets, tables, modales, Quill, constantes) |
| `styled(` (MUI) | **0** fichier détecté |
| `styled-components` (`import styled`) | **Au moins 1** : `FiltresUsersPanel.tsx` |
| `makeStyles` / `useStyles` (JSS legacy) | **0** |
| Fichiers `.css` sous `src/` | **2** : `index.css`, `App.css` |

---

## 3. Cartographie A — Sources de design

### 3.1 Fichier central : `src/theme.ts` — **déjà dans le thème**

**Extensions TypeScript :** `Palette.gradients`, `tertiary`, `neutral`, overrides `Button` / `Chip`.

**Contenu déjà centralisé (aperçu non exhaustif) :**

- `palette` complète (mode clair/sombre), `gradients`, couleurs sémantiques `success` / `warning` / `error` / `info`.
- `typography` (hiérarchie + couleurs inline sur certains variants).
- `shape.borderRadius`, `shadows` personnalisés (tableaux complets light/dark).
- **`components` MUI :** `MuiCssBaseline`, `MuiButton`, `MuiPaper`, `MuiCard`, `MuiCardContent`, `MuiAppBar`, `MuiToolbar`, `MuiDrawer`, `MuiListItemButton`, `MuiChip`, `MuiTableContainer`, `MuiTableHead`, `MuiTableRow`, `MuiTableCell`, `MuiTextField`, `MuiOutlinedInput`, `MuiInputLabel`, `MuiFormControl`, `MuiSelect`, `MuiDialog`, `MuiMenu`, `MuiTooltip`, `MuiDivider`, `MuiAvatar`, `MuiIconButton`, `MuiTabs`, `MuiTab`, `MuiFab`, `MuiLink`, `MuiBadge`.

**Verdict :** grande partie du shell « générique MUI » est **déjà pilotée par le thème**.

---

### 3.2 Layout shell (`src/layout/**`)

| Fichier | Rôle | Design |
|---------|------|--------|
| `MainLayout.tsx` | Layout principal | **À migrer** : nombreux `sx`, `alpha`, gradients, `backdropFilter` (chevauchement avec styles déjà dans `MuiAppBar` / `MuiDrawer` du thème). |
| `MainLayoutPrepa.tsx` | Idem domaine prépa | **À migrer** (même famille que ci-dessus). |
| `MainLayoutDeclic.tsx` | Idem déclic | **À migrer**. |
| `MainLayoutCandidat.tsx` | Idem candidat | **À migrer**. |
| `SidebarItems.tsx` | Items menu | **À migrer** (au minimum harmoniser avec `navigationStyles` / thème). |
| `navigationStyles.ts` | `getDrawerItemSx`, `getTopNavButtonSx` | **Hybride** : utilise `theme.palette` et `alpha` — **bien orienté thème**, mais **reste hors** `theme.ts` ; à **rapprocher** du design system (`custom` / `components`). |
| `footer.tsx` | Pied de page | **Duplication** : bordures, gradients, ombres très proches de `MuiCssBaseline` / `divider` / surfaces déjà dans `theme.ts` → **à migrer vers tokens**. |

---

### 3.3 Composants transverses (`src/components/**`)

**Fichiers avec forte densité `sx` (échantillon grep) :**

- `PageTemplate.tsx`, `PageWrapper.tsx`, `PageSection.tsx` — surfaces d’en-tête, `alpha`, ombres.
- `ResponsiveTableTemplate.tsx`, `dashboard/StatCard.tsx`, `dashboard/ChartCard.tsx`.
- `filters/*` (nombreux panneaux), `modals/*`, `export_buttons/*`, `forms/FormSectionCard.tsx`, `forms/RichHtmlEditorField.tsx`.
- `layout/AppBreadcrumbs.tsx`, `SearchInput.tsx`, `EtatBadge.tsx`, `ui/*` (squelettes, empty state, etc.).

**styled-components :**

- `components/filters/FiltresUsersPanel.tsx` — `LoadingBox` avec fallback **`#e5e7eb`**, `#6b7280`, `#f9fafb` si `theme` styled absent → **à migrer** vers tokens MUI ou bridge unique.

**Verdict global composants :** **majoritairement « à migrer »** (consommation de tokens) tout en gardant **structure / responsive** en local.

---

### 3.4 Pages (`src/pages/**`)

- **Très forte** utilisation de `sx` (liste ~274 fichiers inclut majoritairement des pages).
- Sous-dossiers **widgets** (`overviewDashboard`, `groupeddashboard`, `saturationdashboard`, `commentsDahboard`) : **nombreux hex** pour graphiques Recharts / cartes KPI → **à migrer** vers `palette.charts` ou `custom.dataViz` (voir `_tokens.md`).
- Tables métier (`*Table.tsx`), modales (`*Modal.tsx`) : mélange **couleurs sémantiques métier** (ex. statuts) et **gris Material legacy** (`#f5f5f5`, `#e0e0e0`) → **à migrer** pour cohérence.

---

### 3.5 Autres fichiers « design » hors thème

| Fichier | Nature |
|---------|--------|
| `src/constants/colors.ts` | Palette **STATUT_COLORS** + `getContrastText` — **à intégrer** au futur `custom` / chart tokens (ou laisser importé par le thème uniquement). |
| `src/utils/registerQuillFormats.ts` | Nombreux **hex** pour formats éditeur — **acceptable en local** à terme *ou* mapping vers tokens « éditeur » si unification souhaitée. |
| `src/types/styled.d.ts` | Déclarations **styled-components** ; **non synchronisées** avec le thème MUI actuel — risque de **double vérité** si styled-components s’étend. |

---

## 4. Cartographie B — Déjà centralisé vs à migrer vs acceptable local

### 4.1 Déjà dans le thème (`src/theme.ts`)

- Overrides **Mui** listés en §3.1.
- Gradients nommés dans `palette.gradients`.
- Ombres globales `shadows[1..24]`.
- Typographie globale.

### 4.2 À migrer vers le thème (tokens / `components` / `sx` utilisant le thème)

- **Tous les layouts** listés §3.2 (surtout duplication avec `AppBar` / `Drawer` déjà stylés).
- `footer.tsx`.
- Composants **StatCard**, stats prépa/déclic dupliqués (`PrepaStatsOperations`, `PrepaStatsSummary`, `DeclicStatsSummary`, `DéclicStatsOperations`, etc. — même patterns `rgba` / ombres).
- Tables avec **gris MUI anciens** : ex. `ObjectifDeclicTable`, `ProspectionTable`, `CentreDetailPage`, `PartenaireCandidatForm`, etc.
- **Widgets Recharts** : tous les fichiers `pages/widgets/overviewDashboard/*.tsx` avec `stroke` / `fill` / hex.
- **Modales** avec hex inline (nombreux fichiers listés par grep `#`).
- **FiltresUsersPanel** (styled-components + fallback).

### 4.3 Duplications détectées (même intention visuelle, deux sources)

- **Footer** vs `divider` / surfaces / `MuiCssBaseline` dans `theme.ts`.
- **ListItem** : `MuiListItemButton` dans `theme.ts` **vs** `navigationStyles.getDrawerItemSx` (deux systèmes de sélection/hover).
- **Tables** : styles par défaut `MuiTable*` dans le thème **vs** `TableHead` avec `#f4f6f8` etc. dans certaines pages.
- **StatCard** et blocs stats dans pages prépa/déclic : **même ombre / fond** réécrits en dur.

### 4.4 Acceptable en local (après décision produit)

- **Styles purement structurels** : `display`, `flexDirection`, `gridTemplateColumns`, `gap` sans valeur de couleur — peuvent rester en `sx` **sans token** (ou tokens d’espacement seulement).
- **Couleurs entièrement métier** (ex. statut prospect « archivé ») si **documentées** — de préférence via **token sémantique** (`status.archived`) plutôt qu’hex inline.
- **Quill / registerQuillFormats** : couleurs d’édition HTML — souvent **locales** au module éditeur.
- **Images / assets** dans `public/` : hors scope thème TS.

---

## 5. Classification par catégories demandées

| Catégorie | Fichiers / zones typiques | Statut |
|-----------|---------------------------|--------|
| **Layout shell** | `MainLayout*.tsx`, `footer.tsx` | Majoritairement **à migrer** |
| **Navigation** | `navigationStyles.ts`, `SidebarItems.tsx`, parties `AppBar`/`Drawer` dans layouts | **Hybride** : logique OK, styles à centraliser |
| **Surfaces** | `PageTemplate`, `PageWrapper`, sections page | **À migrer** (ombres, bordures) |
| **Cards** | `StatCard`, `ChartCard`, cartes widgets | **À migrer** |
| **Tables** | `*Table.tsx`, templates responsive | Forte présence **hex legacy** → **à migrer** |
| **Formulaires** | Champs, `FormSectionCard`, éditeurs riches | **À migrer** (focus, surfaces) ; Quill **partiellement local** |
| **Dialogs / menus / overlays** | `modals/*`, `ConfirmDialog`, menus MUI | Thème partiel MUI ; **compléter** si styles locaux |
| **Typographie** | Dispersé dans `sx` (`fontWeight`, `fontSize`) | **Partiellement** dans `theme.typography` ; beaucoup d’overrides locaux |
| **États interactifs** | hover/selected dans tables et listes | Mix thème + local |
| **Spacing / radius / shadows** | Partout | Thème global existe ; **beaucoup de valeurs brutes** restantes |

---

## 6. Liste explicite — fichiers analysés vs non analysés

### 6.1 Fichiers réellement analysés (grep exhaustif + lecture ciblée)

- **Ensemble des ~420 fichiers** `src/**/*.ts` et `src/**/*.tsx` : passés au crible des **motifs de design** (pas lecture humaine fichier par fichier).
- **Lecture détaillée** : `theme.ts`, `navigationStyles.ts`, `footer.tsx`, `MainLayout*.tsx` (structure + extraits styles), `ThemeProvider.tsx`, `main.tsx`, `App.tsx`, `index.css`, `App.css`, `PageTemplate.tsx`, `StatCard.tsx`, `FiltresUsersPanel.tsx`, `types/styled.d.ts`.

### 6.2 Fichiers / zones non analysés en profondeur

- **`frontend_rap_app` hors `src/`** (ex. `vite.config.ts`, `package.json`, dossier `public/`).
- **Test** `src/api/__tests__/axios.test.ts` : hors périmètre UI.
- **Contenu exact** de chaque ligne des **~270 fichiers** avec `sx` : non relu manuellement ; l’audit repose sur la **détection automatique** des motifs.

---

## 7. Hypothèses et incertitudes

1. **`index.css` / `App.css`** : absence d’import repérée — si un outil externe les injecte, l’audit devra être **complété**.
2. **Nombre exact de fichiers avec `sx`** : ~274 (comptage sur liste `files_with_matches` ; arrondi si évolution du repo).
3. **Régressions visuelles** futures : toute migration devra être validée par **comparaison visuelle** (non couverte par cet audit).

---

*Fin du rapport d’audit — Phase 1.*
