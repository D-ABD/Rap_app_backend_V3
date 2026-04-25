# Plan de route opérationnel UI / Thème — basé sur le `src` réel
## But
Permettre à une IA ou à un développeur de refactorer l’UI vers un standard SaaS Premium MUI, sans casser la prod, en faisant consommer le thème au maximum par les composants parents et les pages.

---

# 1. Règles de travail

## Règles absolues
1. Ne pas modifier la logique métier.
2. Ne pas modifier les appels API.
3. Ne pas modifier les `useEffect`, hooks métier, ni la gestion d’état.
4. Ne jamais renommer ni supprimer des props existantes sur les composants partagés.
5. Toute évolution visuelle globale doit d’abord être pensée dans :
   - `src/theme/tokens/appCustomTokens.types.ts`
   - `src/theme/tokens/createAppCustomTokens.ts`
   - `src/theme.ts`
6. Les pages doivent devenir des compositions de composants, pas des lieux de décision visuelle.
7. Toute nouvelle variation de densité doit rester compatible avec :
   - `density?: "default" | "compact"`
8. Toute nouvelle décision visuelle premium récurrente doit être tokenisée avant d’être dupliquée dans plusieurs composants.
9. La propagation de la densité doit être cohérente sur toute la chaîne de rendu : parent → composant structurel → composant métier.
10. Les effets de glassmorphism, blur, alpha et backdrop doivent être centralisés dans le thème.

## Définition de terminé
Le chantier est terminé si :
- les décisions visuelles structurelles sont centralisées dans le thème ;
- les composants parents consomment ces tokens ;
- les pages contiennent très peu de `sx` structurels locaux ;
- une modification de rendu globale peut être faite sans repasser page par page.

---

# 2. Inventaire des composants et zones prioritaires

## 2.1 Composants socles détectés
À traiter en priorité car ils structurent toute l’application :

- `src/components/PageWrapper.tsx`
- `src/components/PageTemplate.tsx`
- `src/components/PageSection.tsx`
- `src/components/ResponsiveTableTemplate.tsx`
- `src/components/SearchInput.tsx`
- `src/components/EtatBadge.tsx`
- `src/components/forms/FormSectionCard.tsx`
- `src/components/dashboard/ChartCard.tsx`
- `src/components/dashboard/StatCard.tsx`

## 2.2 Fichiers thème détectés
- `src/theme.ts`
- `src/theme/tokens/appCustomTokens.types.ts`
- `src/theme/tokens/createAppCustomTokens.ts`

## 2.3 Layouts principaux
- `src/layout/MainLayout.tsx`
- `src/layout/MainLayoutCandidat.tsx`
- `src/layout/MainLayoutDeclic.tsx`
- `src/layout/MainLayoutPrepa.tsx`
- `src/layout/navigationStyles.ts`

## 2.4 Dialogs / UI transverses
- `src/components/ui/ConfirmDialog.tsx`
- `src/components/ui/DetailField.tsx`
- `src/components/ui/DetailSection.tsx`
- `src/components/dialogs/EntityPickerDialog.tsx`
- `src/components/modals/*.tsx`

---

# 3. Principes d’exécution validés
 
## 3.1 Hiérarchie d’arbitrage
Toujours appliquer cette hiérarchie :
1. Besoin global ou récurrent → **modifier les tokens**
2. Besoin partagé → **modifier le composant partagé**
3. Besoin spécifique métier → **modifier la page localement**, le plus légèrement possible

## 3.2 Méthode d’exécution
Ne jamais traiter un lot entier d’un seul coup.

Méthode recommandée :
1. choisir une **page témoin**
2. appliquer le lot ou la méthode sur cette page
3. valider visuellement et fonctionnellement
4. corriger si nécessaire
5. répliquer au reste du groupe

Exemple :
- page témoin du lot 6 : `FormationsPage.tsx`

## 3.3 Règle sur la densité
### Court terme
La densité doit être propagée explicitement.

Exemple attendu :
- `PageTemplate` reçoit `density`
- `PageTemplate` le transmet à :
  - `PageSection`
  - `ResponsiveTableTemplate`
  - autres composants structurels concernés

### Moyen terme
Un `DensityContext` léger peut être envisagé **uniquement si** :
- la profondeur de transmission devient trop importante ;
- le prop drilling devient répétitif ;
- la maintenance devient moins lisible.

Le `DensityContext` n’est **pas une obligation immédiate**.

## 3.4 Règle stricte pour les modales
Interdiction d’utiliser un `Paper` structurel à l’intérieur d’un `DialogContent` déjà stylisé par le thème, sauf justification fonctionnelle explicite et validation visuelle.

Objectif :
- éviter double bordure
- éviter double shadow
- éviter double radius
- éviter perte d’espace utile
- éviter l’effet “boîte dans la boîte”

## 3.5 Règle sur le glassmorphism
Tous les effets suivants doivent être centralisés dans le thème :
- `backdropFilter`
- `alpha()`
- surfaces glass
- intensité de blur
- variations light / dark

## 3.6 Stratégie de test obligatoire
Avant chaque lot :
- prendre une capture d’écran **ou** un snapshot DOM

Pages témoins minimales à conserver :
- 1 page liste
- 1 page formulaire
- 1 modale
- 1 dashboard

Objectifs :
- vérifier les contrastes
- vérifier la densité réelle
- vérifier les bordures / radius
- éviter les régressions visuelles
- vérifier sticky / hover / interactions

---

# 4. Lots de travail

---

# LOT 0 — Audit technique et garde-fous
## Priorité
**P0**

## Objectif
Préparer le chantier et figer la stratégie avant modifications massives.

## À faire
1. Vérifier que tous les composants socles sont couverts par des tests visuels ou au moins une checklist manuelle.
2. Identifier les pages les plus utilisées en production.
3. Figer un ordre d’exécution strict : thème → composants socles → pages.
4. Définir les pages témoins de référence pour les snapshots :
   - 1 liste
   - 1 formulaire
   - 1 modale
   - 1 dashboard

## Fichiers à inspecter
- `src/theme.ts`
- `src/theme/tokens/appCustomTokens.types.ts`
- `src/theme/tokens/createAppCustomTokens.ts`
- `src/components/PageWrapper.tsx`
- `src/components/PageTemplate.tsx`
- `src/components/PageSection.tsx`
- `src/components/ResponsiveTableTemplate.tsx`

## Dépendances
Aucune.

## Validation
- Le périmètre est clair.
- Les fichiers socles sont identifiés.
- L’ordre de refactor est validé.
- Les pages témoins sont choisies.

---

# LOT 1 — Extension du design system / tokens
## Priorité
**P0**

## Objectif
Faire du thème la source unique des décisions visuelles structurelles.

## Fichiers à modifier
- `src/theme/tokens/appCustomTokens.types.ts`
- `src/theme/tokens/createAppCustomTokens.ts`

## À ajouter

### A. Tokens page wrapper
Créer :
- `page.wrapper`

Y mettre :
- `paddingY.default`
- `paddingY.compact`
- `paddingX.default`
- `paddingX.fullWidth`
- `overlay.background.light`
- `overlay.background.dark`
- `overlay.borderRadius`

### B. Tokens page section
Créer :
- `page.section.default`
- `page.section.compact`

Y mettre :
- `padding`
- `marginBottom`
- `borderRadius`
- `overflow`
- `overlayAlpha.light`
- `overlayAlpha.dark`
- `overlayStop`
- `boxShadowRest`
- `boxShadowHover`

### C. Tokens page template
Créer :
- `page.template`

Sous-branches :
- `header.controls`
- `header.hero`
- `header.title`
- `header.subtitle`
- `header.actions`
- `centered`

### D. Tokens table avancés
Étendre :
- `table`

Sous-branches :
- `container`
- `actionsColumn`
- `sticky`
- `mobileCard`

### E. Tokens recherche
Créer :
- `input.search`

### F. Tokens badges
Créer :
- `badge.etat`

### G. Tokens dashboard
Créer :
- `dashboard.statCard`
- `dashboard.chartCard`

### H. Tokens formulaires
Créer :
- `form.sectionCard`
- `form.inlineBlock`
- `form.helperArea`

### I. Tokens dialogs
Créer :
- `dialog.surface`
- `dialog.title`
- `dialog.content`
- `dialog.actions`
- `dialog.section`

### J. Tokens glass / blur / shell
Ajouter :
- `layout.shell.backdropBlur`
- `layout.appBar.backdropBlur`
- `surface.glass.blur`
- `surface.glass.background.light`
- `surface.glass.background.dark`

Objectif :
- éviter les `backdropFilter` hardcodés
- garantir cohérence light/dark
- piloter facilement les effets premium

## Dépendances
Doit être terminé avant les lots 2 à 8.

## Validation
- Les types couvrent les vrais besoins des composants existants.
- `createAppCustomTokens.ts` fournit des valeurs cohérentes utilisables immédiatement.
- Les effets de blur / glass ne sont plus décidés localement dans les composants.

---

# LOT 2 — Brancher et renforcer `theme.ts`
## Priorité
**P0**

## Objectif
Faire porter au thème MUI un maximum de styles transverses.

## Fichier à modifier
- `src/theme.ts`

## À faire
1. Vérifier / enrichir :
   - `MuiPaper`
   - `MuiCard`
   - `MuiCardHeader`
   - `MuiCardContent`
2. Vérifier / enrichir :
   - `MuiTextField`
   - `MuiOutlinedInput`
   - `MuiInputLabel`
   - `MuiFormHelperText`
3. Ajouter / enrichir :
   - `MuiDialog`
   - `MuiDialogTitle`
   - `MuiDialogContent`
   - `MuiDialogActions`
4. Ajouter / enrichir :
   - `MuiChip`
5. Vérifier la cohérence des tables :
   - `MuiTableContainer`
   - `MuiTableHead`
   - `MuiTableRow`
   - `MuiTableCell`
6. Brancher proprement les futurs tokens de blur / glass / shell si nécessaire.

## Dépendances
Dépend du lot 1.

## Validation
- Les composants MUI de base ont déjà un rendu premium avant `sx` local.
- Les composants partagés peuvent supprimer une partie de leurs styles locaux.

---

# LOT 3 — Refactor des composants parents de layout
## Priorité
**P0**

## Objectif
Faire porter au thème toute la structure premium principale.

## Fichiers à modifier
- `src/components/PageWrapper.tsx`
- `src/components/PageTemplate.tsx`
- `src/components/PageSection.tsx`

## À faire

### 3.1 `PageWrapper.tsx`
- Remplacer les paddings/overlay/radius locaux par `theme.custom.page.wrapper`.
- Garder les props actuelles.
- Ne pas casser `maxWidth`, `fullWidth`, `density`.

### 3.2 `PageSection.tsx`
- Brancher padding, margin-bottom, radius, overflow, overlay sur `theme.custom.page.section`.
- Éviter les effets qui coupent visuellement le contenu.
- Favoriser l’occupation maximale de l’espace disponible.

### 3.3 `PageTemplate.tsx`
- Brancher controls/header hero/title/subtitle/actions/centered sur `theme.custom.page.template`.
- Passer `density={density}` aux enfants structurels comme `PageSection`.
- S’assurer que la densité est bien propagée à toute la chaîne de rendu.
- Ne pas introduire de `DensityContext` tant que la propagation explicite reste simple et lisible.

## Dépendances
Dépend des lots 1 et 2.

## Validation
- Les layouts parents ne contiennent plus de styles structurels majeurs codés localement.
- Une modification du thème impacte plusieurs pages immédiatement.
- La densité est cohérente entre parent et enfants structurels.

---

# LOT 4 — Refactor des composants structurels réutilisables
## Priorité
**P1**

## Objectif
Uniformiser les composants intermédiaires utilisés par les pages.

## Fichiers à modifier
- `src/components/SearchInput.tsx`
- `src/components/EtatBadge.tsx`
- `src/components/forms/FormSectionCard.tsx`
- `src/components/dashboard/ChartCard.tsx`
- `src/components/dashboard/StatCard.tsx`

## À faire

### 4.1 `SearchInput.tsx`
- Consommer `theme.custom.input.search`.
- Sortir du composant :
  - largeur
  - focus ring
  - placeholder opacity
  - breakpoints locaux si possible

### 4.2 `EtatBadge.tsx`
- Consommer `theme.custom.badge.etat`.
- Supprimer les mappings visuels locaux quand possible.

### 4.3 `FormSectionCard.tsx`
- Consommer `theme.custom.form.sectionCard`.
- Uniformiser les espacements de titres, contenus et aides.

### 4.4 `ChartCard.tsx` et `StatCard.tsx`
- Consommer `theme.custom.dashboard.chartCard` et `statCard`.
- Uniformiser padding, radius, gap, hover, minHeight.

## Dépendances
Dépend des lots 1 et 2.

## Validation
- Ces composants n’inventent plus leur propre langage visuel.
- Les pages n’ont plus besoin de compenser leur rendu via du `sx` lourd.

---

# LOT 5 — Normalisation des tables
## Priorité
**P1**

## Objectif
Faire de `ResponsiveTableTemplate` la référence unique pour les tableaux métier.

## Fichier à modifier
- `src/components/ResponsiveTableTemplate.tsx`

## À faire
1. Faire consommer totalement :
   - `theme.custom.table.header`
   - `theme.custom.table.row`
   - `theme.custom.table.cell`
   - `theme.custom.table.densities`
   - `theme.custom.table.container`
   - `theme.custom.table.actionsColumn`
   - `theme.custom.table.sticky`
   - `theme.custom.table.mobileCard`
2. Sortir du composant :
   - largeur colonne actions
   - sticky shadow
   - maxHeight
   - radius carte mobile
   - padding mobile
3. Garder le `TableContainer` neutre si la table est déjà dans une section parent.
4. Préparer les futurs besoins sans casser l’API :
   - empty state
   - loading state
   - selected row
   - metadata secondaire

## Fichiers métier dépendants directement
Les tables métier détectées qui reposent déjà sur ce composant :

- `src/pages/appairage/AppairageTable.tsx`
- `src/pages/cerfa/CerfaTable.tsx`
- `src/pages/evenements/EvenementTable.tsx`
- `src/pages/formations/FormationTable.tsx`
- `src/pages/partenaires/PartenaireTable.tsx`
- `src/pages/prospection/ProspectionTable.tsx`
- `src/pages/prospection/prospectioncomments/ProspectionCommentTable.tsx`
- `src/pages/rapports/RapportTable.tsx`

## Dépendances
Dépend du lot 1 et idéalement du lot 2.

## Validation
- Toutes les tables métier héritent du même standard premium.
- Les futures modifs de densité ou de radius ne demandent plus de rééditer chaque table métier.

---

# LOT 6 — Normalisation des layouts de pages listes
## Priorité
**P1**

## Objectif
Alléger les pages listes pour qu’elles soient surtout des compositions de :
- `PageTemplate`
- `SearchInput`
- panneaux de filtres
- `ResponsiveTableTemplate`
- composants de pagination / toolbar

## Pages détectées utilisant `PageTemplate`
Fort impact. À traiter en priorité après les composants socles :

### Groupe A — pages listes principales
- `src/pages/formations/FormationsPage.tsx`
- `src/pages/prospection/ProspectionPage.tsx`
- `src/pages/prospection/ProspectionPageCandidat.tsx`
- `src/pages/appairage/AppairagesPage.tsx`
- `src/pages/candidats/candidatsPage.tsx`
- `src/pages/cvtheque/cvthequePage.tsx`
- `src/pages/cvtheque/cvthequeCandidatPage.tsx`
- `src/pages/partenaires/PartenairesPage.tsx`
- `src/pages/partenaires/PartenairesCandidatPage.tsx`
- `src/pages/cerfa/CerfaPage.tsx`
- `src/pages/evenements/EvenementsPage.tsx`
- `src/pages/rapports/RapportsPage.tsx`
- `src/pages/logs/LogsPage.tsx`
- `src/pages/Documents/DocumentsPage.tsx`

### Groupe B — pages listes secondaires
- `src/pages/ateliers/AteliersTrePage.tsx`
- `src/pages/declic/DeclicPages.tsx`
- `src/pages/declic/ObjectifDeclicPage.tsx`
- `src/pages/declic/ParticipantsDeclicPage.tsx`
- `src/pages/prepa/PrepaPages.tsx`
- `src/pages/prepa/PrepaPagesAteliers.tsx`
- `src/pages/prepa/PrepaPagesIC.tsx`
- `src/pages/prepa/ObjectifPrepaPage.tsx`
- `src/pages/prepa/StagiairesPrepaPage.tsx`
- `src/pages/statuts/StatutsPage.tsx`
- `src/pages/typeOffres/TypeOffresPage.tsx`
- `src/pages/users/UsersPage.tsx`

## Pages détectées utilisant `SearchInput`
À relire après refactor du composant :
- `src/pages/appairage/AppairagesPage.tsx`
- `src/pages/appairage/appairage_comments/AppairageCommentPage.tsx`
- `src/pages/ateliers/AteliersTrePage.tsx`
- `src/pages/candidats/candidatsPage.tsx`
- `src/pages/cerfa/CerfaPage.tsx`
- `src/pages/cvtheque/cvthequeCandidatPage.tsx`
- `src/pages/cvtheque/cvthequePage.tsx`
- `src/pages/declic/DeclicPages.tsx`
- `src/pages/declic/ObjectifDeclicPage.tsx`
- `src/pages/declic/ParticipantsDeclicPage.tsx`
- `src/pages/partenaires/PartenairesCandidatPage.tsx`
- `src/pages/partenaires/PartenairesPage.tsx`
- `src/pages/prepa/ObjectifPrepaPage.tsx`
- `src/pages/prepa/PrepaPagesAteliers.tsx`
- `src/pages/prepa/PrepaPagesIC.tsx`
- `src/pages/prepa/StagiairesPrepaPage.tsx`
- `src/pages/prospection/ProspectionPage.tsx`
- `src/pages/prospection/ProspectionPageCandidat.tsx`

## À faire
Pour chaque page :
1. supprimer les paddings/radius/gaps structurels redondants ;
2. utiliser au maximum les props de `PageTemplate` ;
3. éviter les wrappers visuels ad hoc ;
4. remplacer les blocs de mise en page par les composants socles existants.

## Dépendances
Dépend des lots 3, 4 et 5.

## Validation
- Les pages listes n’inventent presque plus de structure visuelle locale.
- Les modifications globales se répercutent bien.
- La méthode page témoin → validation → réplication est respectée.

---

# LOT 7 — Normalisation des formulaires
## Priorité
**P1**

## Objectif
Éviter que chaque page formulaire reconstruise sa propre UI.

## Fichiers à traiter en priorité
### Formulaires directement détectés
- `src/pages/centres/CentreForm.tsx`
- `src/pages/evenements/EvenementForm.tsx`
- `src/pages/prospection/ProspectionForm.tsx`
- `src/pages/rapports/RapportForm.tsx`

### Formulaires très probables à auditer ensuite
- `src/pages/formations/FormationForm.tsx`
- `src/pages/candidats/CandidatForm.tsx`
- `src/pages/commentaires/CommentaireForm.tsx`
- `src/pages/cvtheque/cvthequeForm.tsx`
- `src/pages/cvtheque/cvthequeFormCandidat.tsx`
- `src/pages/declic/DeclicForm.tsx`
- `src/pages/declic/ObjectifDeclicForm.tsx`
- `src/pages/declic/ParticipantsDeclicForm.tsx`
- `src/pages/prepa/PrepaForm*.tsx`
- `src/pages/prepa/StagiairesPrepaForm.tsx`
- `src/pages/partenaires/PartenaireForm*.tsx`
- `src/pages/Documents/DocumentForm.tsx`
- `src/pages/ateliers/AteliersTREForm.tsx`
- `src/pages/cerfa/CerfaForm.tsx`

## À faire
1. Remplacer les `Paper` locaux structurels par `FormSectionCard` ou équivalent.
2. Brancher les titres, helper texts, paddings et sections sur `theme.custom.form.*`.
3. Uniformiser les zones d’actions via `FormActionsBar` si possible.

## Dépendances
Dépend du lot 4.

## Validation
- Les formulaires partagent tous la même structure visuelle.
- Les sections de formulaire se modifient via le thème et non page par page.

---

# LOT 8 — Normalisation des dialogs et vues détail
## Priorité
**P1**

## Objectif
Créer un système cohérent pour les modales et vues de détail.

## Fichiers à traiter en priorité

### UI et dialogs transverses
- `src/components/ui/ConfirmDialog.tsx`
- `src/components/ui/DetailField.tsx`
- `src/components/ui/DetailSection.tsx`
- `src/components/dialogs/EntityPickerDialog.tsx`

### Modales partagées
- `src/components/modals/AppairageCommentsModal.tsx`
- `src/components/modals/CandidatsSelectModal.tsx`
- `src/components/modals/CentresSelectModal.tsx`
- `src/components/modals/CerfaSelectModal.tsx`
- `src/components/modals/FormationCommentsModal.tsx`
- `src/components/modals/FormationSelectModal.tsx`
- `src/components/modals/PartenairesSelectModal.tsx`
- `src/components/modals/PostCreateChoiceModal.tsx`
- `src/components/modals/ProspectionCommentsModal.tsx`
- `src/components/modals/ProspectionSelectModal.tsx`
- `src/components/modals/UsersSelectModal.tsx`

### Pages détail / modales métier
- `src/pages/appairage/AppairageDetailModal.tsx`
- `src/pages/ateliers/AtelierTREDetailModal.tsx`
- `src/pages/candidats/CandidatDetailModal.tsx`
- `src/pages/cerfa/CerfaDetailModal.tsx`
- `src/pages/declic/DeclicDetailModal.tsx`
- `src/pages/declic/ObjectifsDeclicDetailModal.tsx`
- `src/pages/declic/ParticipantsDeclicDetailModal.tsx`
- `src/pages/evenements/EvenementDetailModal.tsx`
- `src/pages/formations/FormationDetailModal.tsx`
- `src/pages/logs/LogDetailModal.tsx`
- `src/pages/partenaires/PartenaireDetailModal.tsx`
- `src/pages/partenaires/PartenaireCandidatDetailModal.tsx`
- et les équivalents similaires dans `prepa`, `prospection`, `rapports`, etc.

## À faire
1. Créer une convention unique pilotée par `theme.custom.dialog`.
2. Uniformiser title/content/actions/sections.
3. Réduire les `Paper` et `Box` structurels locaux dans les modales.
4. Interdire les doubles surfaces structurelles dans `DialogContent` déjà stylé.

## Dépendances
Dépend des lots 1 et 2.

## Validation
- Les modales ont toutes la même hiérarchie et le même rythme visuel.
- Le thème contrôle leur surface, padding, radius et sections.
- Aucune modale ne présente de double bordure ou double ombre inutile.

---

# LOT 9 — Normalisation des dashboards et widgets
## Priorité
**P2**

## Objectif
Uniformiser les pages dashboard et leurs briques.

## Fichiers à traiter
- `src/components/dashboard/ChartCard.tsx`
- `src/components/dashboard/StatCard.tsx`
- `src/components/dashboard/DashboardGrid.tsx`
- `src/components/dashboard/DashboardTemplateSaturation.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/DashboardCandidatPage.tsx`
- `src/pages/DashboardDeclicPage.tsx`
- `src/pages/DashboardPrepaPage.tsx`

## À faire
1. Brancher cartes et métriques sur `theme.custom.dashboard.*`.
2. Réduire les styles locaux de cartes et d’espacements.
3. Prévoir que la densité puisse aussi s’appliquer aux dashboards.

## Dépendances
Dépend du lot 4.

## Validation
- Les dashboards réutilisent les mêmes briques premium.
- Les modifs de padding/radius/gap se font via les tokens.

---

# LOT 10 — Layout shell global
## Priorité
**P2**

## Objectif
Rendre les layouts principaux entièrement pilotés par le thème.

## Fichiers à traiter
- `src/layout/MainLayout.tsx`
- `src/layout/MainLayoutCandidat.tsx`
- `src/layout/MainLayoutDeclic.tsx`
- `src/layout/MainLayoutPrepa.tsx`
- `src/layout/navigationStyles.ts`
- `src/layout/footer.tsx`

## À faire
1. Extraire dans le thème les dernières valeurs de shell encore locales :
   - paddings
   - max widths
   - tailles logo
   - espacements drawer/app bar
   - backdrop blur
2. Consolider `navigationStyles.ts` avec les nouveaux tokens de shell si nécessaire.

## Dépendances
Dépend du lot 1 et du lot 2.

## Validation
- Le shell global peut changer de densité/style sans toucher tous les layouts manuellement.
- Le blur et les surfaces glass sont pilotés depuis le thème.

---

# LOT 11 — Nettoyage page par page
## Priorité
**P2**

## Objectif
Supprimer progressivement les styles structurels redondants dans les pages métier.

## Méthode
Pour chaque page :
1. identifier les styles structurels locaux ;
2. remplacer par les composants socles ou leurs props ;
3. supprimer le style devenu redondant ;
4. vérifier visuellement la page.

## Pages à traiter après les lots socles
Commencer par :
- `src/pages/formations/*`
- `src/pages/prospection/*`
- `src/pages/appairage/*`
- `src/pages/candidats/*`
- `src/pages/cvtheque/*`
- `src/pages/partenaires/*`
- `src/pages/prepa/*`
- `src/pages/declic/*`

## Dépendances
Dépend des lots 3 à 10.

## Validation
- Les pages deviennent fines.
- Les changements visuels se pilotent via thème + composants partagés.

---

# LOT 12 — Validation et documentation
## Priorité
**P0** en fin de chantier

## Objectif
Sécuriser les futures évolutions, pour un dev ou une IA.

## À faire
1. Vérifier visuellement :
   - desktop
   - laptop
   - tablette
   - mobile
   - light mode
   - dark mode
   - density default
   - density compact
2. Vérifier fonctionnellement :
   - navigation
   - hover
   - click row
   - sticky columns
   - dialogs
   - formulaires
3. Créer une documentation de contribution :
   - quand modifier le thème ;
   - quand modifier un composant partagé ;
   - quand modifier une page ;
   - comment ajouter un token ;
   - comment brancher un nouveau composant sur `theme.custom`.

## Livrables
- documentation contribution UI
- checklist QA visuelle
- checklist non-régression

## Validation
- Les snapshots avant/après sont comparables.
- Les familles d’écrans critiques sont couvertes.
- Le plan est exploitable par une IA ou un développeur sans nouvel audit global.

---

# 5. Ordre recommandé d’exécution

## Phase A — fondations
1. Lot 0
2. Lot 1
3. Lot 2

## Phase B — composants socles
4. Lot 3
5. Lot 4
6. Lot 5

## Phase C — écrans
7. Lot 6
8. Lot 7
9. Lot 8
10. Lot 9
11. Lot 10
12. Lot 11

## Phase D — sécurisation
13. Lot 12

---

# 6. Dépendances critiques

## Dépendances fortes
- **Lot 1** doit être fait avant 2, 3, 4, 5, 7, 8, 9, 10.
- **Lot 3** doit être fait avant le nettoyage massif des pages listes.
- **Lot 4** doit être fait avant le nettoyage massif des formulaires et dashboards.
- **Lot 5** doit être fait avant les corrections des tables métier.
- **Lot 8** doit être fait avant l’harmonisation finale des modales métier.

## Risques si l’ordre n’est pas respecté
- duplication des styles locaux ;
- refactor à refaire plusieurs fois ;
- pages corrigées avant stabilisation des composants socles ;
- incohérences visuelles entre familles d’écrans.

---

# 7. Checklist exécutable ultra concrète

## Étape 1
Modifier :
- `src/theme/tokens/appCustomTokens.types.ts`

## Étape 2
Modifier :
- `src/theme/tokens/createAppCustomTokens.ts`

## Étape 3
Modifier :
- `src/theme.ts`

## Étape 4
Refactorer :
- `src/components/PageWrapper.tsx`

## Étape 5
Refactorer :
- `src/components/PageSection.tsx`

## Étape 6
Refactorer :
- `src/components/PageTemplate.tsx`

## Étape 7
Refactorer :
- `src/components/SearchInput.tsx`

## Étape 8
Refactorer :
- `src/components/EtatBadge.tsx`

## Étape 9
Refactorer :
- `src/components/forms/FormSectionCard.tsx`

## Étape 10
Refactorer :
- `src/components/dashboard/ChartCard.tsx`
- `src/components/dashboard/StatCard.tsx`

## Étape 11
Refactorer :
- `src/components/ResponsiveTableTemplate.tsx`

## Étape 12
Relire / ajuster toutes les tables métier listées au lot 5.

## Étape 13
Relire / ajuster toutes les pages listes listées au lot 6.

## Étape 14
Relire / ajuster tous les formulaires listés au lot 7.

## Étape 15
Relire / ajuster tous les dialogs et modales listés au lot 8.

## Étape 16
Relire / ajuster dashboards et layouts.

## Étape 17
Documenter la méthode de contribution UI.

---

# 8. Arbitrage final à appliquer en continu

## Toujours suivre cette hiérarchie
1. Si le besoin est global ou récurrent → modifier les tokens.
2. Si le besoin est partagé → modifier le composant partagé.
3. Si le besoin est spécifique métier → modifier la page localement, le plus légèrement possible.

## Interdits
- Ajouter des styles structurels lourds directement dans une page sans raison.
- Réinventer un wrapper visuel alors qu’un composant socle existe déjà.
- Ajouter un nouveau pattern UI sans d’abord regarder si le thème peut le porter.
- Ajouter un `Paper` structurel dans une modale déjà stylée sans justification explicite.
- Multiplier les `backdropFilter` et effets glass localement hors thème.

---

# 9. Résultat attendu
À la fin du chantier :
- les composants parents consomment le thème au maximum ;
- les pages sont simples à maintenir ;
- les futures refontes sont rapides ;
- une IA ou un développeur peut intervenir sans repartir d’un audit complet ;
- le rendu reste dense, premium, propre, cohérent et sûr pour la prod.
