
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

- La **migration principale** des consommations design system est réalisée sur les périmètres couverts par les lots 1 à 7.
- Il subsiste des **écarts résiduels** identifiés et cadrés dans le **lot 8** :
  composants encore partiellement hardcodés, styles locaux non tokenisés, usages encore centrés sur `theme.palette` sans centralisation `theme.custom.*`, et homogénéisation incomplète de `useTheme<AppTheme>()`.
- La liste du **lot 8** constitue une **base de travail fiable pour la consolidation**, mais doit être lue comme un périmètre d’audit priorisé, pas comme une vérité absolue ligne par ligne sans revalidation locale.
- **Refactor modulaire** `palette.ts` / `components.ts` extraits de `theme.ts` : hors périmètre des lots UI ; peut suivre une fois la consolidation du lot 8 stabilisée.

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

Statut : Terminé le 12 avril 2026

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

### Réalisé

- `src/layout/navigationStyles.ts`
- `src/layout/MainLayout.tsx`
- `src/layout/MainLayoutPrepa.tsx`
- `src/layout/MainLayoutDeclic.tsx`
- `src/layout/MainLayoutCandidat.tsx`

### Note d'exécution

- `src/layout/SidebarItems.tsx` a été relu dans le cadre du lot.
- Aucun remplacement n'y était nécessaire pour `theme.custom.nav.*` sans élargir le périmètre ni forcer un changement artificiel.

---

## Lot 3 — Surfaces communes

Statut : Terminé le 12 avril 2026

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

### Réalisé

- `src/components/PageTemplate.tsx`
- `src/components/PageWrapper.tsx`
- `src/components/PageSection.tsx`
- `src/components/dashboard/StatCard.tsx`
- `src/components/dashboard/ChartCard.tsx`

---

## Lot 4 — Formulaires

Statut : Terminé le 12 avril 2026

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

### Réalisé

- `src/components/forms/FormSectionCard.tsx`
- `src/pages/partenaires/PartenaireCandidatForm.tsx`
- `src/pages/centres/CentreDetailPage.tsx`
- `src/pages/formations/FormationForm.tsx`
- `src/pages/prepa/PrepaForm.tsx`

---

## Lot 5 — Tables

Statut : Terminé le 12 avril 2026

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

### Réalisé

- `src/components/ResponsiveTableTemplate.tsx`
- `src/pages/declic/ObjectifDeclicTable.tsx`
- `src/pages/prospection/ProspectionTable.tsx`
- `src/pages/prepa/PrepaTableAteliers.tsx`
- `src/pages/prepa/PrepaTableIC.tsx`

### Note d'exécution

- `src/pages/formations/FormationTable.tsx` a été relu dans le cadre du lot.
- Le composant hérite désormais du socle table migré via `ResponsiveTableTemplate`.
- Aucun patch local supplémentaire n'était nécessaire sur ce fichier sans élargir artificiellement le périmètre vers des couleurs métier hors `theme.custom.table.*`.

---

## Lot 6 — Cards, widgets & modales

Statut : Terminé le 12 avril 2026

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

### Réalisé

- `src/pages/widgets/overviewDashboard/AppairageOverviewWidget.tsx`
- `src/pages/widgets/overviewDashboard/FormationPlacesWidget.tsx`
- `src/pages/widgets/overviewDashboard/FormationOverviewDashboard.tsx`
- `src/pages/widgets/overviewDashboard/FormationOverviewWidget.tsx`
- `src/pages/widgets/overviewDashboard/FormationFinanceursOverviewWidget.tsx`
- `src/pages/widgets/overviewDashboard/ProspectionOverviewWidget.tsx`
- `src/pages/widgets/overviewDashboard/EvenementOverviewWidget.tsx`
- `src/pages/appairage/AppairageDetailModal.tsx`
- `src/pages/cerfa/CerfaDetailModal.tsx`
- `src/pages/candidats/CandidatDetailModal.tsx`
- `src/pages/partenaires/PartenaireDetailModal.tsx`
- `src/pages/partenaires/PartenaireCandidatDetailModal.tsx`
- `src/pages/prepa/ObjectifsPrepaDetailModal.tsx`
- `src/pages/declic/ObjectifsDeclicDetailModal.tsx`
- `src/pages/prospection/ProspectionDetailModal.tsx`
- `src/pages/prepa/PrepaDetailModal.tsx`
- `src/pages/declic/DeclicDetailModal.tsx`
- `src/pages/formations/FormationDetailModal.tsx`
- `src/pages/declic/ParticipantsDeclicDetailModal.tsx`
- `src/pages/prepa/StagiairesPrepaDetailModal.tsx`
- `src/pages/logs/LogDetailModal.tsx`

### Note d'exécution

- La passe actuelle a branché les tokens `chart.*` sur les widgets Recharts les plus centraux du dossier `overviewDashboard`.
- La passe actuelle a branché les tokens `overlay.*` sur les modales de détail qui dupliquaient directement des surfaces `DialogTitle` / `DialogActions` / sections internes.
- Les fichiers de `groupeddashboard` et `commentsDahboard` ont été relus dans le cadre du lot :
  ils relèvent surtout de tables, de KPI métier ou de `Tooltip` MUI, sans duplication directe de `chart.*` ou `overlay.*` à corriger dans le fichier.
- Les modales déjà basées sur des shells partagés comme `DetailViewLayout` ont été relues :
  aucun patch local supplémentaire n'était nécessaire sans élargir artificiellement le périmètre vers les composants partagés.

---

## Lot 7 (optionnel) — Éditeur & styled-components

Statut : Terminé le 12 avril 2026

### Fichiers concernés

- `src/utils/registerQuillFormats.ts` — aligner les presets sur `theme.custom.editor.quill.*` si unification souhaitée.
- `src/components/filters/FiltresUsersPanel.tsx` — `styled-components` + fallbacks hex : bridge vers MUI / tokens ou retrait progressif.

### Réalisé

- `src/utils/registerQuillFormats.ts`
- `src/components/filters/FiltresUsersPanel.tsx`

### Note d'exécution

- `src/utils/registerQuillFormats.ts` a été aligné sur les entrées canoniques déjà définies dans `theme.custom.editor.quill.*`, tout en conservant les autres couleurs utiles au preset pour éviter une régression d'usage.
- `src/components/filters/FiltresUsersPanel.tsx` n'utilise plus de fallbacks hex dans ses `styled-components` pour les zones ciblées par le lot.

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
- [x] Layouts : shell + footer consomment `custom.layout` / `custom.footer` dans le périmètre du lot 1.
- [x] Navigation : `navigationStyles` + layouts alignés sur `custom.nav.drawerItem` / `custom.nav.topButton` dans le périmètre du lot 2.
- [x] `PageTemplate` / `StatCard` alignés sur `custom.surface` / `custom.kpi` (lot 3).
- [x] Tables alignées sur `custom.table` + cohérence `MuiTable*`.
- [x] Widgets Recharts alignés sur `custom.chart` et modales sur `custom.overlay` (lot 6).
- [x] Quill / styled-components traités (lot 7) si objectif « zéro hex hors thème ».
- [x] Lot 8 — audit & consolidation : overview/stats, formulaires typés, tables métier, pages liste (`useTheme<AppTheme>()`), documenté dans cette section.

---

*Dernière mise à jour : Lot 8 clôturé (12 avril 2026) ; tokens (`src/theme/tokens/`), convention `AppTheme` / `useTheme<AppTheme>()`, docs `_tokens.md` et `_design-system.md`.*

---

## Lot 8 — Audit & consolidation design system

Statut : Terminé le 12 avril 2026

### Objectif

Vérifier la conformité complète du frontend avec `theme.ts` et `theme.custom.*`.

### Constats (post-lot 8)

- [x] Hex et rgba « critiques » retirés sur le périmètre Lot 8 (overview candidats, stats, tables formation/prospection) — où un équivalent `theme.custom.*` ou `theme.palette.*` existait.
- [x] Styles `sx` migrés vers tokens (`kpi`, `surface`, `chart`, `status.prospection`, `table`) lorsque applicable.
- [x] Pages liste (Lot 8.5) : `useTheme<AppTheme>()` uniformisé.
- [ ] Hex résiduels possibles hors périmètre Lot 8 (ex. autres widgets, `FormationOverviewWidget` avec `fill` Recharts).
- [ ] Couleurs métier dynamiques (`type_offre.couleur`, `statut.couleur`) : conservées ; seuls les fallbacks utilisent la palette.

### Fichiers concernés

- `src/components/EtatBadge.tsx`
- `src/components/forms/RichHtmlEditorField.tsx`
- `src/components/modals/CandidatsSelectModal.tsx`
- `src/components/modals/CerfaSelectModal.tsx`
- `src/components/modals/FormationCommentsModal.tsx`
- `src/components/modals/FormationSelectModal.tsx`
- `src/components/modals/PartenairesSelectModal.tsx`
- `src/components/modals/UsersSelectModal.tsx`
- `src/pages/widgets/groupeddashboard/AppairageGroupedTableWidget.tsx`
- `src/pages/widgets/groupeddashboard/AteliersTREGroupedWidget.tsx`
- `src/pages/widgets/groupeddashboard/CandidatGroupedTableWidget.tsx`
- `src/pages/widgets/groupeddashboard/DeclicGroupedWidget.tsx`
- `src/pages/widgets/groupeddashboard/EvenementGroupedWidget.tsx`
- `src/pages/widgets/groupeddashboard/FormationGroupedWidget.tsx`
- `src/pages/widgets/groupeddashboard/PrepaGroupedWidget.tsx`
- `src/pages/widgets/groupeddashboard/ProspectionGroupedWidget.tsx`
- `src/pages/widgets/overviewDashboard/CandidatContratOverviewWidget.tsx`
- `src/pages/widgets/overviewDashboard/CandidatOverviewWidget.tsx`
- `src/pages/widgets/overviewDashboard/CandidatsOverviewDashboard.tsx`
- `src/pages/widgets/overviewDashboard/FormationStatsSummary.tsx`
- `src/pages/prepa/PrepaStatsSummary.tsx`
- `src/pages/prepa/PrepaStatsOperations.tsx`
- `src/pages/declic/DeclicStatsSummary.tsx`
- `src/pages/declic/DéclicStatsOperations.tsx`
- `src/pages/prepa/ObjectifPrepaTable.tsx`
- `src/pages/declic/DeclicTable.tsx`
- `src/pages/partenaires/PartenaireForm.tsx`
- `src/pages/prospection/ProspectionForm.tsx`
- `src/pages/prospection/ProspectionTable.tsx`
- `src/pages/formations/FormationTable.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/partenaires/PartenairesPage.tsx`
- `src/pages/partenaires/PartenairesCandidatPage.tsx`
- `src/pages/formations/FormationsPage.tsx`
- `src/pages/commentaires/CommentairesPage.tsx`
- `src/pages/Documents/DocumentsPage.tsx`
- `src/pages/Documents/DocumentsTable.tsx`
- `src/pages/cvtheque/cvthequeTable.tsx`
- `src/pages/cvtheque/cvthequeTableCandidat.tsx`
- `src/pages/appairage/AppairagesPage.tsx`
- `src/pages/centres/CentresPage.tsx`
- `src/pages/candidats/candidatsPage.tsx`
- `src/pages/statuts/StatutsPage.tsx`
- `src/pages/typeOffres/TypeOffresPage.tsx`
- `src/pages/users/UsersPage.tsx`

### Actions à mener

- Remplacer toutes les couleurs hardcodées
- Migrer les styles vers `theme.custom.*`
- Recentrer les composants déjà thémés via `theme.palette` vers des sources de vérité `theme.custom.*` quand un token existe
- Supprimer les duplications
- Uniformiser `useTheme<AppTheme>()`

### Risques

- Régression visuelle mineure
- incohérence temporaire si migration partielle

### Priorité

P1 — consolidation finale avant stabilisation design system

### Réalisé (passe finale Lot 8 — 12 avril 2026)

**Fichiers modifiés (cette exécution)**

- `src/pages/widgets/overviewDashboard/CandidatsOverviewDashboard.tsx` — pie statuts : couleurs via `theme.palette.*` (mapping sémantique) ; bar contrats : `theme.custom.chart.series.ordered` ; grille Recharts : `theme.custom.chart.grid.stroke.*`
- `src/pages/widgets/overviewDashboard/CandidatOverviewWidget.tsx` — idem pie (palette sémantique)
- `src/pages/widgets/overviewDashboard/CandidatContratOverviewWidget.tsx` — séries bar : `chart.series.ordered` ; grille chart
- `src/pages/widgets/overviewDashboard/FormationStatsSummary.tsx` — fond carte / tuiles : `surface.muted`, `kpi.*`, `surface.elevated` ; alpha via `alpha()` ; `useTheme<AppTheme>()`
- `src/pages/prepa/PrepaStatsSummary.tsx`, `PrepaStatsOperations.tsx` — KPI / ombres / survol : `theme.custom.kpi.*`, `surface.elevated` ; selects : `alpha(common.white,0.06)`
- `src/pages/declic/DeclicStatsSummary.tsx`, `src/pages/declic/DéclicStatsOperations.tsx` — idem pattern kpi / surface
- `src/pages/partenaires/PartenaireForm.tsx` — callbacks `sx` : paramètre MUI `Theme` + accès `theme.custom.form.*` via `(theme as AppTheme).custom` (compatibilité typage MUI)
- `src/pages/prospection/ProspectionForm.tsx` — idem `FormSectionCard` backgrounds
- `src/pages/prospection/ProspectionTable.tsx` — chip activité : `theme.custom.status.prospection.*` ; ligne archivée : `theme.custom.table.row.archived.*` ; commentaire : `palette.action.hover` ; placeholder candidat : `text.disabled`
- `src/pages/formations/FormationTable.tsx` — barres progression / couleurs seuils : `palette` ; fond piste : `grey[200|800]` ; chips activité / fallbacks type & statut : `palette` (couleurs API conservées si présentes)
- **Lot 8.5** — `useTheme<AppTheme>()` : `HomePage.tsx`, `DashboardPage.tsx`, `PartenairesPage.tsx`, `PartenairesCandidatPage.tsx`, `FormationsPage.tsx`, `CommentairesPage.tsx`, `DocumentsPage.tsx`, `DocumentsTable.tsx`, `cvtheque/cvthequeTable.tsx`, `cvtheque/cvthequeTableCandidat.tsx`, `AppairagesPage.tsx`, `CentresPage.tsx`, `candidats/candidatsPage.tsx`, `StatutsPage.tsx`, `TypeOffresPage.tsx`, `UsersPage.tsx`

**Correction technique hors liste Lot 8 (compilation)**

- `src/pages/cvtheque/cvthequePage.tsx` — import manquant `Box` (usage JSX existant) pour `tsc` vert.

**Fichiers du périmètre Lot 8 relus sans changement nécessaire (déjà conformes ou sans hex/token cible)**

- `src/components/EtatBadge.tsx`, `RichHtmlEditorField.tsx`
- Modales `CandidatsSelectModal`, `CerfaSelectModal`, `FormationCommentsModal`, `FormationSelectModal`, `PartenairesSelectModal`, `UsersSelectModal`
- Widgets `groupeddashboard/*`, `ObjectifPrepaTable.tsx`, `DeclicTable.tsx`

**Catégories de corrections**

- Suppression de hex / rgba hardcodés au profit de `theme.custom.kpi`, `surface`, `chart`, `status.prospection`, `table` ou `theme.palette` / `alpha()`
- Uniformisation `useTheme<AppTheme>()` sur les pages liste
- Compatibilité TS sur callbacks `sx` : `Theme` en paramètre + cast `(theme as AppTheme)` pour `theme.custom` dans les formulaires

### Styles locaux restants (volontaires)

- Couleurs **API** (`couleur` sur type d’offre / statut formation) : inchangées ; texte contraste via `palette.common.white`.
- **Recharts** hors fichiers modifiés : certains widgets peuvent encore avoir des `fill` ou strokes isolés hors périmètre.
- **Dépendance technique** : `cvthequePage` — seul ajout `Box` pour build ; pas de refonte design.

### Risques résiduels

- Légère variation de teinte sur graphiques overview contrats (passage de hex métier à `chart.series.ordered` piloté par la palette MUI).
- `ProspectionTable` / `FormationTable` : comportement visuel conservé ; chips prospection alignés sur tokens `status` du thème (proches des anciens styles Material).

### Sous-lots Lot 8 (état final)

- **8.1** groupeddashboard : inchangé (déjà traité en amont).
- **8.2** overview + stats : **Terminé le 12 avril 2026** (fichiers listés ci-dessus).
- **8.3** forms : **Terminé le 12 avril 2026** (`PartenaireForm`, `ProspectionForm` ; autres déjà OK).
- **8.4** tables : **Terminé le 12 avril 2026** (`ProspectionTable`, `FormationTable` ; autres déjà OK).
- **8.5** typage `useTheme` : **Terminé le 12 avril 2026** (pages liste Lot 8).

### Découpage d’exécution recommandé

#### Lot 8.1 — Widgets `groupeddashboard`

Statut : Terminé le 12 avril 2026

**Périmètre**

- `src/pages/widgets/groupeddashboard/AppairageGroupedTableWidget.tsx`
- `src/pages/widgets/groupeddashboard/AteliersTREGroupedWidget.tsx`
- `src/pages/widgets/groupeddashboard/CandidatGroupedTableWidget.tsx`
- `src/pages/widgets/groupeddashboard/DeclicGroupedWidget.tsx`
- `src/pages/widgets/groupeddashboard/EvenementGroupedWidget.tsx`
- `src/pages/widgets/groupeddashboard/FormationGroupedWidget.tsx`
- `src/pages/widgets/groupeddashboard/PrepaGroupedWidget.tsx`
- `src/pages/widgets/groupeddashboard/ProspectionGroupedWidget.tsx`

**Objectif**

- Supprimer les hex et styles inline de tableaux groupés
- Aligner les fonds de structure sur `theme.custom.table.*`
- Isoler clairement les couleurs métier restantes

#### Lot 8.2 — Overview + stats summary

Statut : Terminé le 12 avril 2026

**Périmètre**

- `src/pages/widgets/overviewDashboard/CandidatContratOverviewWidget.tsx`
- `src/pages/widgets/overviewDashboard/CandidatOverviewWidget.tsx`
- `src/pages/widgets/overviewDashboard/CandidatsOverviewDashboard.tsx`
- `src/pages/widgets/overviewDashboard/FormationStatsSummary.tsx`
- `src/pages/prepa/PrepaStatsSummary.tsx`
- `src/pages/prepa/PrepaStatsOperations.tsx`
- `src/pages/declic/DeclicStatsSummary.tsx`
- `src/pages/declic/DéclicStatsOperations.tsx`

**Objectif**

- Remplacer les palettes hardcodées des widgets overview
- Recentrer les cartes KPI sur `theme.custom.kpi.*`
- Uniformiser les surfaces via `theme.custom.surface.*`

#### Lot 8.3 — Forms legacy

Statut : Terminé le 12 avril 2026

**Périmètre**

- `src/pages/partenaires/PartenaireForm.tsx`
- `src/pages/prospection/ProspectionForm.tsx`
- `src/components/forms/RichHtmlEditorField.tsx`
- `src/components/EtatBadge.tsx`

**Objectif**

- Retirer les surcharges locales résiduelles
- Revenir aux sources de vérité `theme.custom.form.*`
- Éliminer les couleurs hardcodées encore présentes dans les composants de formulaire associés

#### Lot 8.4 — Tables restantes

Statut : Terminé le 12 avril 2026

**Périmètre**

- `src/pages/prepa/ObjectifPrepaTable.tsx`
- `src/pages/declic/DeclicTable.tsx`
- `src/pages/prospection/ProspectionTable.tsx`
- `src/pages/formations/FormationTable.tsx`

**Objectif**

- Finir l’alignement sur `theme.custom.table.*`
- Réduire les doubles sources de vérité entre tables métier et socle commun
- Laisser explicitement à part les couleurs métier qui doivent rester dynamiques

#### Lot 8.5 — Typage `useTheme`

Statut : Terminé le 12 avril 2026

**Périmètre**

- `src/pages/HomePage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/partenaires/PartenairesPage.tsx`
- `src/pages/partenaires/PartenairesCandidatPage.tsx`
- `src/pages/formations/FormationsPage.tsx`
- `src/pages/commentaires/CommentairesPage.tsx`
- `src/pages/Documents/DocumentsPage.tsx`
- `src/pages/Documents/DocumentsTable.tsx`
- `src/pages/cvtheque/cvthequeTable.tsx`
- `src/pages/cvtheque/cvthequeTableCandidat.tsx`
- `src/pages/appairage/AppairagesPage.tsx`
- `src/pages/centres/CentresPage.tsx`
- `src/pages/candidats/candidatsPage.tsx`
- `src/pages/statuts/StatutsPage.tsx`
- `src/pages/typeOffres/TypeOffresPage.tsx`
- `src/pages/users/UsersPage.tsx`

**Objectif**

- Uniformiser `useTheme<AppTheme>()`
- Éliminer les écarts de typage qui fragilisent la lecture future de `theme.custom.*`
- Traiter ce sous-lot comme une homogénéisation DX sûre, sans changement visuel attendu
