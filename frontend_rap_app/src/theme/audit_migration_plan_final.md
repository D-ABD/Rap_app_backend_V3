## Audit final — conformité design system

### 🔴 Non conforme critique — couleurs hardcodées

**`src/pages/widgets/groupeddashboard/AteliersTREGroupedWidget.tsx`**  
Zone : ligne 194  
Problème : table HTML avec multiples `style={{ background: "#..." }}` (`#e3f2fd`, `#f5f5f5`, `#c8e6c9`, `#ffcdd2`, `#ffe0b2`, `#e0e0e0`, `#bbdefb`).  
Suggestion : migrer vers `theme.custom.table.*` pour les fonds de structure, et `theme.palette.*` ou `theme.custom.dataviz.*` pour les cellules sémantiques.

**`src/pages/widgets/groupeddashboard/PrepaGroupedWidget.tsx`**  
Zone : ligne 200  
Problème : même pattern de table groupée avec plusieurs hex en inline.  
Suggestion : même stratégie que ci-dessus, avec séparation stricte structure table / couleurs métier.

**`src/pages/widgets/groupeddashboard/DeclicGroupedWidget.tsx`**  
Zone : ligne 196  
Problème : fonds hardcodés dans `<tr>` / `<td>`.  
Suggestion : `theme.custom.table.*` + palette métier.

**`src/pages/widgets/overviewDashboard/CandidatsOverviewDashboard.tsx`**  
Zone : ligne 39  
Problème : plusieurs constantes `STATUS_COLOR_HEX` / `CONTRAT_COLORS` en hex.  
Suggestion : brancher sur `theme.custom.chart.series.ordered` et, si besoin métier, documenter un mapping dédié basé sur `theme.palette` ou `theme.custom.dataviz`.

**`src/pages/widgets/overviewDashboard/CandidatOverviewWidget.tsx`**  
Zone : ligne 33  
Problème : palette de statuts codée en hex.  
Suggestion : remplacer par source centralisée issue du thème ou de `theme.custom.dataviz`.

**`src/pages/widgets/overviewDashboard/CandidatContratOverviewWidget.tsx`**  
Zone : ligne 44  
Problème : palette de contrat codée en hex.  
Suggestion : même correction que ci-dessus.

**`src/pages/partenaires/PartenaireForm.tsx`**  
Zone : ligne 402  
Problème : encore beaucoup de `#fafafa`, `#ddd`, `rgba(25,118,210,0.08)` sur les accordéons malgré le lot formulaires.  
Suggestion : `theme.custom.form.section.*` et `theme.custom.form.divider.*`.

**`src/pages/prospection/ProspectionForm.tsx`**  
Zone : ligne 260  
Problème : sections `FormSectionCard` avec `background: "#fafafa"` local.  
Suggestion : laisser le composant porter `theme.custom.form.section.paperBackground.*` sans surcharge locale.

**`src/pages/prepa/ObjectifPrepaTable.tsx`**  
Zone : ligne 46  
Problème : table encore en dur (`boxShadow`, `#f4f6f8`, `#e0e0e0`, `#f5faff`, `#fff`, `#fafbfc`).  
Suggestion : aligner complètement sur `theme.custom.table.*` et `theme.custom.surface.elevated.*`.

**`src/pages/declic/DeclicTable.tsx`**  
Zone : ligne 413  
Problème : table mixte avec `#fff`, `#f4f6f8`, `#ddd`.  
Suggestion : `theme.custom.table.*`.

**`src/components/modals/UsersSelectModal.tsx`**  
Zone : ligne 178  
Problème : spans et chips avec hex (`#6b7280`, `#eef2ff`, `#3730a3`).  
Suggestion : `theme.palette.text.secondary`, `theme.palette.primary.*` ou futur token de modal/select.

**`src/components/modals/CandidatsSelectModal.tsx`**  
Zone : ligne 516  
Problème : `#eee`, `#f9fafb`, `#f3f4f6`, `#6b7280`, `#ccc`.  
Suggestion : `theme.palette.divider`, `theme.palette.background.*`, `theme.palette.text.secondary`.

### 🟠 Non conforme modéré — styles locaux non tokenisés mais migrables

**`src/pages/widgets/overviewDashboard/FormationStatsSummary.tsx`**  
Zone : ligne 50  
Problème : `useTheme()` non typé + gradients, `rgba`, `boxShadow` locaux qui dupliquent le lot 3 (`cardBg`, `statBoxBg`, `statShadow`).  
Suggestion : `useTheme<AppTheme>()`, puis réutiliser `theme.custom.surface.*` et `theme.custom.kpi.*`.

**`src/pages/prepa/PrepaStatsSummary.tsx`**  
Zone : ligne 38  
Problème : même duplication KPI/surfaces via `rgba` / `boxShadow`.  
Suggestion : réutiliser `theme.custom.kpi.*`.

**`src/pages/prepa/PrepaStatsOperations.tsx`**  
Zone : ligne 38  
Problème : même pattern non tokenisé.  
Suggestion : `theme.custom.kpi.*`.

**`src/pages/declic/DeclicStatsSummary.tsx`**  
Zone : ligne 38  
Problème : même duplication KPI.  
Suggestion : `theme.custom.kpi.*`.

**`src/pages/declic/DéclicStatsOperations.tsx`**  
Zone : ligne 48  
Problème : mêmes `rgba` / `boxShadow` / `useTheme()` non typé.  
Suggestion : `useTheme<AppTheme>()` + `theme.custom.kpi.*`.

**`src/components/EtatBadge.tsx`**  
Zone : ligne 52  
Problème : `customSx` avec `#343a40`, `orange`, `white`.  
Suggestion : normaliser via `theme.palette.grey[900]`, `theme.palette.warning.main`, `theme.palette.common.white`, ou mieux via un mapping thème.

**`src/components/modals/PartenairesSelectModal.tsx`**  
Zone : ligne 302  
Problème : `border: "1px dashed #ccc"`.  
Suggestion : `theme.custom.form.divider.dashedColor.*` ou `theme.palette.divider`.

**`src/components/modals/CerfaSelectModal.tsx`**  
Zone : ligne 184  
Problème : `#eee` et `#ccc` encore présents.  
Suggestion : `theme.palette.divider`.

**`src/components/modals/FormationCommentsModal.tsx`**  
Zone : ligne 241  
Problème : `border: "1px solid #ccc"`.  
Suggestion : `theme.palette.divider`.

**`src/components/modals/FormationSelectModal.tsx`**  
Zone : ligne 170  
Problème : fallback `#dbeafe` / `#1e40af`.  
Suggestion : `theme.palette.primary.light` / `theme.palette.primary.dark` quand la couleur métier est absente.

**`src/components/forms/RichHtmlEditorField.tsx`**  
Zone : ligne 65  
Problème : `backgroundColor: "#fff"` en dur.  
Suggestion : `theme.palette.background.paper`.

**`src/pages/prepa/StagiairesPrepaForm.tsx`**  
Zone : ligne 225  
Problème : `bgcolor: "#fafafa"`.  
Suggestion : `theme.custom.form.section.paperBackground.*`.

**`src/pages/appairage/AppairageDetailModal.tsx`**  
Zone : ligne 271  
Problème : `#fafafa`, `#ddd`, `#777` encore présents malgré la migration overlay.  
Suggestion : `theme.custom.overlay.*` pour les surfaces et `theme.palette.text.secondary` pour les textes secondaires.

**`src/pages/prepa/PrepaDetailModal.tsx`**  
Zone : ligne 114  
Problème : fond `#fafafa`.  
Suggestion : `theme.custom.overlay.modalSectionTitle.*` ou `theme.custom.surface.muted.*` selon l’intention.

**`src/pages/declic/DeclicDetailModal.tsx`**  
Zone : ligne 118  
Problème : fond `#fafafa`.  
Suggestion : même correction que ci-dessus.

**`src/pages/prospection/ProspectionTable.tsx`**  
Zone : ligne 190  
Problème : chip activité encore en `#e0e0e0`, `#555`, `green`, `#9ccc65`.  
Suggestion : `theme.custom.table.row.archived.*` pour l’archive et `theme.palette.success.*` pour l’état actif.

**`src/pages/formations/FormationTable.tsx`**  
Zone : ligne 167  
Problème : couleurs d’activité, statut, type offre, progression encore hardcodées.  
Suggestion : palette métier centralisée ou `theme.custom.dataviz.*` si ce domaine devient stable.

**`src/pages/typeOffres/TypeOffresPage.tsx`**  
Zone : ligne 293  
Problème : fallback `#6c757d`.  
Suggestion : `theme.palette.neutral.main` ou `theme.palette.grey[600]`.

**`src/pages/statuts/StatutsCreatePage.tsx`**  
Zone : ligne 34  
Problème : fallback couleur et preview non rattachés au thème.  
Suggestion : thème neutre comme fallback, tout en gardant la logique métier de couleur personnalisable.

**`src/pages/statuts/StatutsEditPage.tsx`**  
Zone : ligne 191  
Problème : `3px solid black` / `1px solid #ccc`.  
Suggestion : `theme.palette.common.black` et `theme.palette.divider`, voire token de sélection si besoin.

### 🔵 Partiellement conforme — via `theme.palette`, mais pas encore centralisé via `theme.custom.*`

**`src/pages/widgets/groupeddashboard/AppairageGroupedTableWidget.tsx`**  
Zone : lignes 140+  
Problème : usage de `theme.palette.grey[...]` et couleurs locales de regroupement, ce qui crée une double source de vérité avec `theme.custom.table.*`.  
Suggestion : recentrer la structure visuelle sur `theme.custom.table.*`.

**`src/pages/widgets/groupeddashboard/CandidatGroupedTableWidget.tsx`**  
Zone : lignes 102+  
Problème : usage de `theme.palette.grey[...]` et couleurs locales de regroupement.  
Suggestion : même recentrage sur `theme.custom.table.*`.

**`src/pages/prospection/ProspectionForm.tsx`**  
Zone : ligne 260  
Problème : duplication entre le lot 4 déjà migré et des surcharges locales encore présentes.  
Suggestion : consolidation finale pour supprimer les surcharges résiduelles.

**`src/pages/partenaires/PartenaireForm.tsx`**  
Zone : ligne 411  
Problème : le composant utilise déjà le thème, mais conserve des surcharges locales qui doublonnent les tokens du lot 4.  
Suggestion : retirer les surcharges et laisser `theme.custom.form.*` porter la source de vérité.

**`src/pages/declic/DeclicTable.tsx`**  
Zone : ligne 239  
Problème : `grey.50` encore utilisé côté table au lieu de `theme.custom.table.row.*`.  
Suggestion : aligner complètement le zébrage.

**`src/pages/candidats/CandidatsTable.tsx`**  
Zone : ligne 423  
Problème : `grey.50`, `grey.100` encore utilisés côté table.  
Suggestion : aligner complètement les zébrages et lignes totals sur `theme.custom.table.*`.

### 🟡 Amélioration recommandée — typage et uniformisation

**`src/pages/HomePage.tsx`**  
Zone : ligne 13  
Problème : `useTheme()` non typé.  
Suggestion : `useTheme<AppTheme>()`.

**`src/pages/DashboardPage.tsx`**  
Zone : ligne 63  
Problème : `useTheme()` non typé.  
Suggestion : `useTheme<AppTheme>()`.

**`src/pages/partenaires/PartenairesPage.tsx`, `src/pages/partenaires/PartenairesCandidatPage.tsx`, `src/pages/formations/FormationsPage.tsx`, `src/pages/commentaires/CommentairesPage.tsx`, `src/pages/Documents/DocumentsPage.tsx`, `src/pages/Documents/DocumentsTable.tsx`, `src/pages/cvtheque/cvthequeTable.tsx`, `src/pages/cvtheque/cvthequeTableCandidat.tsx`, `src/pages/appairage/AppairagesPage.tsx`, `src/pages/centres/CentresPage.tsx`, `src/pages/candidats/candidatsPage.tsx`, `src/pages/statuts/StatutsPage.tsx`, `src/pages/typeOffres/TypeOffresPage.tsx`, `src/pages/users/UsersPage.tsx`**  
Problème : `useTheme()` non typé, même quand `theme.custom` n’est pas encore lu.  
Suggestion : uniformiser en `useTheme<AppTheme>()` pour éviter les écarts futurs.

## Synthèse globale

- **Conformité estimée** : environ `78%`
- **Zones les plus propres** :
  - `src/layout/MainLayout.tsx`, `src/layout/MainLayoutPrepa.tsx`, `src/layout/MainLayoutDeclic.tsx`, `src/layout/MainLayoutCandidat.tsx`
  - `src/layout/footer.tsx`
  - `src/components/PageTemplate.tsx`, `src/components/PageSection.tsx`, `src/components/PageWrapper.tsx`
  - `src/components/ResponsiveTableTemplate.tsx`
  - la plupart des `DetailModal` migrées sur `overlay.*`
- **Zones les plus problématiques** :
  - `src/pages/widgets/groupeddashboard/*`
  - widgets overview candidats / stats summary legacy
  - formulaires legacy encore surchargés localement
  - modales de sélection (`*SelectModal`)
  - tables non repassées après le socle commun
  - usage non uniforme de `useTheme<AppTheme>()`

## Conclusion

La migration est globalement bonne et exploitable, mais elle n’est pas encore totalement consolidée.

Point clé de lecture :
- `critique` = à traiter en premier
- pas `catastrophique`

Le `Lot 8` ajouté dans `_migration-plan.md` est cohérent avec cet audit et peut maintenant être exécuté par sous-lots sûrs.
