# Frontend — Zones avec couleurs codées en dur

Ce document recense les zones du frontend où des couleurs restent codées en dur au lieu d'utiliser le theme MUI.

Objectif :

- savoir quoi nettoyer pour un vrai dark mode coherent
- savoir quels fichiers toucher pour harmoniser le look
- prioriser les zones les plus visibles avant les zones secondaires

Important :

- les couleurs dans [theme.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/theme.ts) sont normales : elles definissent le design system
- les palettes metier volontaires (charts, badges couleur metier, selecteurs de couleur) ne sont pas toujours des erreurs
- ce fichier liste surtout les endroits qui risquent de casser l'harmonie light/dark

## Priorite 1 — A nettoyer d'abord

Ces fichiers sont les plus visibles et ont un impact direct sur le rendu global.

### Layouts et ecrans racine

- [AuthProvider.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/contexts/AuthProvider.tsx)
  - fond fixe `#f9f9f9` / `#121212`
- [AppBreadcrumbs.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/layout/AppBreadcrumbs.tsx)
  - fond fixe `#fff` / `#1e1e1e`
- [footer.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/footer.tsx)
  - deja mieux branche au theme, mais a garder coherent avec `background.paper`

### Champs riches et formulaires

- [RichHtmlEditorField.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/RichHtmlEditorField.tsx)
  - `backgroundColor: "#fff"`
- [CommentairesEditPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/commentaires/CommentairesEditPage.tsx)
  - `backgroundColor: "#fff"`
- [CommentaireForm.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/commentaires/CommentaireForm.tsx)
  - `backgroundColor: "#fff"`
- [AppairageCommentForm.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/appairage/appairage_comments/AppairageCommentForm.tsx)
  - `backgroundColor: "#fff"`
- [ProspectionCommentForm.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/prospectioncomments/ProspectionCommentForm.tsx)
  - `backgroundColor: "#fff"`

### Modales de selection

- [UsersSelectModal.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/modals/UsersSelectModal.tsx)
  - texte email gris fixe
  - badge `#eef2ff` / `#3730a3`
- [FormationSelectModal.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/modals/FormationSelectModal.tsx)
  - fallback `#dbeafe` / `#1e40af`
- [CandidatsSelectModal.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/modals/CandidatsSelectModal.tsx)
  - bordures `#eee`
  - fonds `#f9fafb`, `#f3f4f6`
  - texte email gris fixe
- [CerfaSelectModal.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/modals/CerfaSelectModal.tsx)
  - bordure `#eee`
  - bloc dashed `#ccc`
- [PartenairesSelectModal.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/modals/PartenairesSelectModal.tsx)
  - bloc dashed `#ccc`
- [FormationCommentsModal.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/modals/FormationCommentsModal.tsx)
  - bordure `#ccc`

## Priorite 2 — Tables et details qui blanchissent en dark mode

Ces fichiers utilisent beaucoup de `#fff`, `#fafafa`, `#f4f6f8`, `#ddd`, donc ils restent trop clairs en mode nuit.

### Tables Declic / Prepa

- [DeclicTable.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/declic/DeclicTable.tsx)
- [ObjectifDeclicTable.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/declic/ObjectifDeclicTable.tsx)
- [PrepaTableIC.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaTableIC.tsx)
- [PrepaTableAteliers.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaTableAteliers.tsx)
- [ObjectifPrepaTable.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/ObjectifPrepaTable.tsx)

Couleurs retrouvees :

- `#fff`
- `#f4f6f8`
- `#fafbfc`
- `#ddd`
- `#e0e0e0`
- `#f5faff`

### Modales detail

- [DeclicDetailModal.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/declic/DeclicDetailModal.tsx)
- [PrepaDetailModal.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaDetailModal.tsx)
- [AppairageDetailModal.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/appairage/AppairageDetailModal.tsx)
- [CentreDetailPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/centres/CentreDetailPage.tsx)

Couleurs retrouvees :

- `#fafafa`
- `#ddd`
- `#777`
- `#e0e0e0`

## Priorite 3 — Formulaires metier avec fonds clairs figes

Ces fichiers ont des fonds type papier fixes qui jurent en dark mode.

- [FormationForm.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/formations/FormationForm.tsx)
- [PartenaireForm.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/partenaires/PartenaireForm.tsx)
- [PartenaireCandidatForm.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/partenaires/PartenaireCandidatForm.tsx)
- [ProspectionForm.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionForm.tsx)
- [ProspectionFormCandidat.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionFormCandidat.tsx)
- [StagiairesPrepaForm.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/StagiairesPrepaForm.tsx)

Couleurs retrouvees :

- `#fafafa`
- `#ddd`

## Priorite 4 — Widgets dashboard et tableaux groupes

Ces fichiers ont souvent des couleurs fixes de cellules ou de graphiques.

### Grouped dashboards

- [FormationGroupedWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/groupeddashboard/FormationGroupedWidget.tsx)
- [AteliersTREGroupedWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/groupeddashboard/AteliersTREGroupedWidget.tsx)
- [EvenementGroupedWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/groupeddashboard/EvenementGroupedWidget.tsx)
- [ProspectionGroupedWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/groupeddashboard/ProspectionGroupedWidget.tsx)
- [PrepaGroupedWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/groupeddashboard/PrepaGroupedWidget.tsx)
- [DeclicGroupedWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/groupeddashboard/DeclicGroupedWidget.tsx)
- [AppairageGroupedTableWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/groupeddashboard/AppairageGroupedTableWidget.tsx)
- [CandidatGroupedTableWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/groupeddashboard/CandidatGroupedTableWidget.tsx)

### Overview dashboards

- [CandidatOverviewWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/overviewDashboard/CandidatOverviewWidget.tsx)
- [CandidatsOverviewDashboard.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/overviewDashboard/CandidatsOverviewDashboard.tsx)
- [FormationOverviewDashboard.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/overviewDashboard/FormationOverviewDashboard.tsx)
- [FormationOverviewWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/overviewDashboard/FormationOverviewWidget.tsx)
- [FormationPlacesWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/overviewDashboard/FormationPlacesWidget.tsx)
- [FormationStatsSummary.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/overviewDashboard/FormationStatsSummary.tsx)
- [FormationFinanceursOverviewWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/overviewDashboard/FormationFinanceursOverviewWidget.tsx)
- [ProspectionOverviewWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/overviewDashboard/ProspectionOverviewWidget.tsx)
- [AppairageOverviewWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/overviewDashboard/AppairageOverviewWidget.tsx)
- [CandidatContratOverviewWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/overviewDashboard/CandidatContratOverviewWidget.tsx)
- [EvenementOverviewWidget.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/overviewDashboard/EvenementOverviewWidget.tsx)

Remarque :

- ces couleurs ne sont pas forcement mauvaises
- elles sont souvent utiles pour les series de graphes
- en revanche, elles devraient idealement venir d'une palette chart centralisee

## Priorite 5 — Badges, statuts et couleurs metier

Ces fichiers ont des couleurs metier ou de fallback.

- [EtatBadge.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/EtatBadge.tsx)
- [TypeOffresPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/typeOffres/TypeOffresPage.tsx)
- [TypeOffresCreatePage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/typeOffres/TypeOffresCreatePage.tsx)
- [TypeOffresEditPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/typeOffres/TypeOffresEditPage.tsx)
- [StatutsCreatePage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/statuts/StatutsCreatePage.tsx)
- [StatutsEditPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/statuts/StatutsEditPage.tsx)
- [FormationTable.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/formations/FormationTable.tsx)
- [ProspectionTable.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionTable.tsx)

Remarque :

- ces couleurs peuvent rester colorees
- mais les contrastes texte/fond devraient utiliser une aide commune plutot que du `#fff`, `black`, `green`, etc.

## Priorite 6 — Fichiers support et techniques

### Fichiers de theme legitimes

- [theme.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/theme.ts)

Ici, les couleurs sont normales : c'est le design system.

### Palettes utilitaires

- [constants/colors.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/constants/colors.ts)
- [registerQuillFormats.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/utils/registerQuillFormats.ts)

Remarque :

- `constants/colors.ts` semble servir de palette metier / contraste
- `registerQuillFormats.ts` contient la palette de l'editeur riche, c'est attendu

### Vestiges a surveiller

- [App.css](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/App.css)
  - contient encore des styles de starter Vite
- [FiltresUsersPanel.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/filters/FiltresUsersPanel.tsx)
  - fallback styled-components avec gris fixes

## Plan conseille

Ordre de nettoyage le plus rentable :

1. layouts racine et breadcrumbs
2. `RichHtmlEditorField` et les formulaires de commentaires
3. modales de selection
4. tables `Declic` / `Prepa`
5. formulaires metier avec `#fafafa`
6. dashboards et graphes
7. palettes metier et badges

## Resume

Aujourd'hui, les zones les plus susceptibles de casser le rendu dark mode sont :

- les wrappers/layouts restant en couleurs fixes
- les editeurs/formulaires en `#fff`
- les modales de selection
- les tables `Declic` / `Prepa`
- les formulaires avec `#fafafa`

Si on veut un vrai refactor visuel propre, il faut remplacer progressivement ces couleurs par :

- `theme.palette.background.default`
- `theme.palette.background.paper`
- `theme.palette.text.primary`
- `theme.palette.text.secondary`
- `theme.palette.divider`
- `alpha(theme.palette.*)`
