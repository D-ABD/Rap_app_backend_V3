
# Plan de migration incrémentale — design system
Règle d’exécution universelle :

* Ne traiter qu’un seul lot à la fois
* Ne modifier que les fichiers explicitement listés dans le lot courant
* Interdiction de modifier tout fichier hors liste, même si une amélioration semble évidente
* Avant patch :

  * lister les tokens réellement utilisés
  * lister les styles locaux laissés en place
* Après patch :

  * lister les fichiers modifiés
  * lister les tokens branchés
  * lister les styles locaux restants
  * lister les risques éventuels
* Ne jamais élargir le périmètre sans demande explicite
* Préserver le rendu actuel au maximum


**Règle :** chaque lot = une branche courte, revue visuelle (clair / sombre), **aucun** changement de logique métier, routes, API ou permissions.
Applique STRICTEMENT le lot X du fichier `_migration-plan.md`.

Respect absolu :

* du périmètre du lot
* des règles d’exécution universelle
* de la convention `AppTheme`
* de l’interdiction de toucher hors périmètre

Ne fais aucune amélioration opportuniste.
Ne refactore pas la structure des fichiers au-delà de ce qui est nécessaire au lot courant.

---

## État actuel (à jour)

### Déjà en place

- **`theme.custom`** est fusionné dans `getTheme` (`src/theme.ts`) via `createAppCustomTokens(theme)` après `responsiveFontSizes`.
- **Types stricts** : `src/theme/tokens/appCustomTokens.types.ts` (`AppCustomTokens`, structures imbriquées).
- **Valeurs** : `src/theme/tokens/createAppCustomTokens.ts` (shell, footer, nav, surface, kpi, table, form, overlay, chart, etc.).
- **Réexport** : `src/theme/tokens/index.ts` ; doc arbre : `src/theme/_tokens.md`.
- **Façade** : les imports applicatifs passent toujours par `src/theme.ts` (`getTheme`).
- **Typage applicatif** : `getTheme` retourne **`AppTheme`** (`custom` garanti) ; convention **`useTheme<AppTheme>()`** pour tout code qui lit `theme.custom` (détaillé dans `_tokens.md` et `_design-system.md`).

### Pas encore fait (objet des lots ci-dessous)

- Les **composants** consomment encore en majorité des littéraux ou `sx` locaux au lieu de `theme.custom.*`.
- **`navigationStyles.ts`** et **`getDrawerItemSx` / `getTopNavButtonSx`** ne lisent pas encore les sous-structures `theme.custom.nav.drawerItem` / `theme.custom.nav.topButton` (les valeurs sont alignées dans la fabrique pour préparer la bascule).
- **Refactor modulaire** `palette.ts` / `components.ts` extraits de `theme.ts` : hors périmètre des lots UI ; peut suivre une fois la migration des consommations stabilisée.

### Prérequis pour chaque lot

- **`useTheme<AppTheme>()`** dans les fichiers migrés (import `AppTheme` depuis `../theme` ou équivalent) : accès à **`theme.custom.*` sans `?.`** — voir section « Convention de typage du thème » dans `_tokens.md`.
- Dans les **helpers non React** (ex. `navigationStyles.ts`) : **ne pas utiliser `useTheme`** ; typer explicitement les signatures avec **`(theme: AppTheme)`** dès qu’un helper lit `theme.custom.*`.
- Interdiction de modifier ou créer de nouveaux tokens pendant les lots — utiliser uniquement ceux déjà définis dans `createAppCustomTokens`.
- Préférer les chemins documentés dans `_tokens.md` plutôt que de réintroduire des hex.

---

## Lot 1 — Layouts (shell)

Statut : Terminé le 12 avril 2026

### Fichiers concernés (prioritaires)

- `src/layout/MainLayout.tsx`
- `src/layout/MainLayoutPrepa.tsx`
- `src/layout/MainLayoutDeclic.tsx`
- `src/layout/MainLayoutCandidat.tsx`
- `src/layout/footer.tsx`

### Tokens à brancher (déjà définis dans `createAppCustomTokens`)

| Zone | Chemins `theme.custom` |
|------|-------------------------|
| Fond page / shell | `layout.shell.backgroundGradient.{ light, dark }` |
| Conteneur principal | `layout.main.paddingX.{ xs, sm, md }`, `layout.main.backdropBlur.{ sm, md, lg }` |
| Pied de page | `footer.border.{ widthPx, style, color.{ light, dark } }`, `footer.background.gradient.*`, `footer.elevation.boxShadow.*`, `footer.accentOverlay.*`, `footer.backdrop.filter` |

### Styles à retirer localement (cible)

- `sx` avec gradients / `backdropFilter` / ombres dupliquant les valeurs déjà portées par ces tokens pour le **Box racine** et le **footer**.
- Conserver dans le composant uniquement : **structure** (`display`, `flexDirection`, `minHeight`, positionnement drawer), pas les familles de couleurs recopiées.

### Risques

- Régression sur blur et empilement de calques.
- Les `MainLayout*` ont aussi menus (`menuPaperSx`) : traiter au **lot 2** si la logique est navigation ; sinon prévoir un futur `custom.nav.menuPaper` si besoin d’un token dédié.

### Ordre recommandé

1. **`footer.tsx`** — remplacer les littéraux par `theme.custom.footer.*` (surface isolée).
2. **`MainLayout.tsx`** — aligner le `Box` racine sur `layout.shell` + `layout.main` ; valider light/dark.
3. **`MainLayoutPrepa` / `Declic` / `Candidat`** — même pattern, diff minimal entre fichiers.

### Réalisé

- `src/layout/footer.tsx`
- `src/layout/MainLayout.tsx`
- `src/layout/MainLayoutPrepa.tsx`
- `src/layout/MainLayoutDeclic.tsx`
- `src/layout/MainLayoutCandidat.tsx`

---

## Lot 2 — Navigation

### Fichiers concernés

- `src/layout/navigationStyles.ts`
- `src/layout/SidebarItems.tsx`
- Sections `AppBar` / `Drawer` / `ListItemButton` dans les `MainLayout*` (restes du lot 1)

Statut : À faire

### Tokens à brancher

| Rôle | Chemins `theme.custom` |
|------|-------------------------|
| Item tiroir | `nav.drawerItem.{ transitionDurationMs, easing, sizing, spacing, icon, label, interaction }` |
| Bouton barre du haut | `nav.topButton.{ typography, shape, border, transitionDurationMs, easing, state }` |

Implémentation attendue : **`getDrawerItemSx(theme, nested)`** et **`getTopNavButtonSx(theme, isActive)`** composent le `SxProps` à partir de ces objets + `alpha(theme.palette.*, …)` pour les champs « alpha » numériques.

### Styles à retirer

- Constantes numériques dupliquées entre `navigationStyles.ts` et la fabrique (une seule source : **tokens**).
- Harmoniser avec `MuiListItemButton` dans `theme.ts` : **une** source de vérité (soit override MUI étendu, soit tokens + `getDrawerItemSx` uniquement).

### Risques

- États **selected** / **hover** / focus clavier.
- Contraste en mode sombre.
- **Règle explicite d’exécution :** **le lot 2 est autorisé à compléter les parties navigation restantes dans les `MainLayout*`, sans re-traiter le shell déjà migré au lot 1.**

### Ordre recommandé

1. Refactor **`navigationStyles.ts`** pour lire `theme.custom.nav`.
2. Ajuster **`SidebarItems`** si des `sx` inline doublonnent.
3. Repasser les **`MainLayout*`** pour retirer les derniers styles de nav en dur.

---

## Lot 3 — Surfaces communes

Statut : À faire

### Fichiers concernés

- `src/components/PageTemplate.tsx`
- `src/components/PageWrapper.tsx`
- `src/components/PageSection.tsx`
- `src/components/dashboard/StatCard.tsx`
- `src/components/dashboard/ChartCard.tsx`

### Tokens à brancher

| Composant | Chemins `theme.custom` |
|-----------|-------------------------|
| En-tête de page | `surface.pageHeader.outer.*`, `surface.pageHeader.inner.*` (dont `boxShadow` déjà calculée dans la fabrique) |
| Cartes génériques | `surface.elevated.{ boxShadowRest, boxShadowHover }`, `surface.muted.background.{ light, dark }` |
| Tuiles KPI | `kpi.cardBackground.rest.*`, `kpi.elevation.{ rest, hover }.*`, `kpi.highlight.{ outlineWidthPx, outlineStyle }` |

### Styles à retirer

- `headerInnerSurfaceSx` / ombres inline dans `PageTemplate` une fois branché sur `surface.pageHeader.inner`.
- Variables locales dans `StatCard` (`statBoxBg`, `statShadow`, etc.) → `theme.custom.kpi`.

### Risques

- Impact large sur toutes les pages utilisant `PageTemplate`.

### Ordre recommandé

1. **`StatCard`** (réutilisé partout).
2. **`PageTemplate`** puis **`PageWrapper`** / **`PageSection`**.

---

## Lot 4 — Formulaires

Statut : À faire

### Fichiers concernés (échantillon)

- `src/components/forms/FormSectionCard.tsx`
- `src/pages/partenaires/PartenaireCandidatForm.tsx`
- `src/pages/centres/CentreDetailPage.tsx`
- Formulaires à fort `sx` : `FormationForm`, `PrepaForm`, etc.

### Tokens à brancher

- `form.section.{ paperBackground, accentHeaderBackground }.{ light, dark }`
- `form.divider.{ dashedColor.{ light, dark }, dashedWidth }`
- Réutiliser `surface.muted` si même intention qu’un fond discret.

### Styles à retirer

- `#fafafa`, `#ddd`, en-têtes bleu Material au profit des chemins ci-dessus.

### Ordre recommandé

1. **`FormSectionCard`**.  
2. Un formulaire pilote, puis déclinaison.

---

## Lot 5 — Tables

Statut : À faire

### Fichiers concernés (exemples)

- `src/pages/declic/ObjectifDeclicTable.tsx`
- `src/pages/prospection/ProspectionTable.tsx`
- `src/pages/formations/FormationTable.tsx`
- `src/pages/prepa/PrepaTableAteliers.tsx`, `PrepaTableIC.tsx`
- `src/components/ResponsiveTableTemplate.tsx`

### Tokens à brancher

- `table.header.{ background, borderBottom }.{ light, dark }`
- `table.row.{ stripedEven, hover, archived }`
- `table.cell.borderBottom.{ light, dark }`

Cohérence avec **`MuiTableHead` / `MuiTableRow` / `MuiTableCell`** du thème : éviter double application (priorité au thème global **ou** aux tokens dans les `sx` des tables métier, pas les deux).

### Ordre recommandé

1. **`ResponsiveTableTemplate`**.  
2. Tables métier par ordre de visibilité.

---

## Lot 6 — Cards, widgets & modales

Statut : À faire

### Fichiers concernés

- `src/pages/widgets/overviewDashboard/*.tsx`
- `src/pages/widgets/groupeddashboard/*.tsx`
- `src/pages/widgets/saturationdashboard/*.tsx`
- `src/pages/widgets/commentsDahboard/*.tsx`
- Modales : `*DetailModal.tsx`, `FormationDetailModal.tsx`, etc.

### Tokens à brancher

| Besoin | Chemins `theme.custom` |
|--------|-------------------------|
| Séries / axes Recharts | `chart.series.ordered`, `chart.axis.stroke.*`, `chart.grid.stroke.*`, `chart.tooltip.*` |
| KPI | `kpi.*` (aligné lot 3) |
| En-têtes / scrims modales | `overlay.scrim.*`, `overlay.modalSectionTitle.*` |
| Couleurs sélectionnables métier | `dataviz.statut.pickableHex` (déjà alimenté par `STATUT_COLORS`) |

### Styles à retirer

- `stroke` / `fill` en hex dispersés sur Recharts.
- Scrim / titres de section dupliquant `overlay.*`.

### Ordre recommandé

1. Un **widget pilote** (overview).  
2. Déclinaison par dossier widget.  
3. **Modales** en dernier.

---

## Lot 7 (optionnel) — Éditeur & styled-components

Statut : À faire

### Fichiers concernés

- `src/utils/registerQuillFormats.ts` — aligner les presets sur `theme.custom.editor.quill.*` si unification souhaitée.
- `src/components/filters/FiltresUsersPanel.tsx` — `styled-components` + fallbacks hex : bridge vers MUI / tokens ou retrait progressif.

---

## Synthèse des risques transverses

| Risque | Mitigation |
|--------|------------|
| Imports | Conserver `getTheme` / `theme.ts` comme façade ; ne pas importer les `.ts` internes du dossier `tokens/` depuis les pages sauf exception documentée |
| Dark mode | Valider chaque lot en **light** et **dark** |
| Double style | Après migration : retirer soit l’override `Mui*`, soit le `sx` redondant |
| Typage `custom` | Dans le code migré, **`useTheme<AppTheme>()`** ; un garde `?.` n’est utile que hors `ThemeProvider` ou cas de test isolés |

---

## Check-list avant clôture globale

- [x] Jetons `theme.custom` définis et typés (`appCustomTokens.types` + `createAppCustomTokens`) ; **`AppTheme`** + convention **`useTheme<AppTheme>()`** documentée (`_tokens.md`, `_design-system.md`).
- [ ] Layouts : shell + footer consomment `custom.layout` / `custom.footer` sans littéraux équivalents.
- [ ] Navigation : `navigationStyles` + sidebars basés sur `custom.nav.drawerItem` / `custom.nav.topButton`.
- [ ] `PageTemplate` / `StatCard` sur `custom.surface` / `custom.kpi`.
- [ ] Tables alignées sur `custom.table` + cohérence `MuiTable*`.
- [ ] Widgets Recharts sur `custom.chart` ; statuts sélecteurs sur `custom.dataviz.statut` (ou dépréciation documentée de `constants/colors.ts` en import direct dans les pages).
- [ ] Quill / styled-components traités (lot 7) si objectif « zéro hex hors thème ».

---

*Dernière mise à jour : tokens (`src/theme/tokens/`), convention `AppTheme` / `useTheme<AppTheme>()`, docs `_tokens.md` et `_design-system.md`.*
