# RAP_APP — Guide pour changer le look sans changer les fonctionnalites

Ce document explique **quels fichiers modifier** si tu veux refaire l'apparence de l'application **sans toucher a la logique metier**.

Objectif :

- changer le theme visuel
- moderniser l'interface
- modifier la mise en page
- harmoniser les composants
- sans changer :
  - les routes
  - les endpoints API
  - les hooks metier
  - les permissions
  - les payloads
  - les comportements CRUD

## 1. Principe general

Si tu veux changer seulement le look :

- touche d'abord le **theme**
- puis les **layouts**
- puis les **shells de page**
- puis les **composants UI partages**
- puis seulement les **pages specifiques**

En revanche, evite autant que possible de toucher :

- `src/api/`
- `src/hooks/`
- `src/routes/`
- les fonctions `onSubmit`, `mutations`, `fetch`, `axios`
- les view models et types metier sensibles

## 2. Ordre conseille pour un refactor visuel

Ordre le plus sur :

1. `theme.ts`
2. layouts (`src/layout/`)
3. shell de page (`PageTemplate`, `PageWrapper`, `PageSection`)
4. composants transverses UI (`src/components/ui/`, `forms/`, `filters/`, `tables/`, `dashboard/`)
5. ecrans specifiques si un module a un rendu special

## 3. Les fichiers a modifier en priorite

### 3.1 Theme global

Fichier principal :

- [frontend_rap_app/src/theme.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/theme.ts)

Tu peux y changer :

- palette globale
- couleurs principales / secondaires
- fonds
- ombres
- arrondis
- typo
- breakpoints
- styles MUI globaux

Si tu veux un nouveau look global, c'est **le premier fichier** a modifier.

Exemples de changements adaptes ici :

- passer d'un look violet/cyan a un look sable/bleu nuit
- adoucir ou renforcer les ombres
- changer les rayons de bordure
- modifier la personnalite de la typographie

### 3.2 Layouts et navigation

Fichiers principaux :

- [frontend_rap_app/src/layout/MainLayout.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayout.tsx)
- [frontend_rap_app/src/layout/MainLayoutCandidat.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutCandidat.tsx)
- [frontend_rap_app/src/layout/MainLayoutPrepa.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutPrepa.tsx)
- [frontend_rap_app/src/layout/MainLayoutDeclic.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutDeclic.tsx)
- [frontend_rap_app/src/layout/navigationStyles.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/navigationStyles.ts)
- [frontend_rap_app/src/components/layout/AppBreadcrumbs.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/layout/AppBreadcrumbs.tsx)
- [frontend_rap_app/src/layout/footer.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/footer.tsx)

Tu peux y changer :

- largeur et style de sidebar
- header / topbar
- etat actif des liens
- espaces globaux
- presentation des breadcrumbs
- pied de page

Si tu veux que "l'app ait une autre allure" des l'arrivee, c'est la **deuxieme couche** a toucher.

### 3.3 Shell de page

Fichiers principaux :

- [frontend_rap_app/src/components/PageTemplate.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageTemplate.tsx)
- [frontend_rap_app/src/components/PageWrapper.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageWrapper.tsx)
- [frontend_rap_app/src/components/PageSection.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageSection.tsx)
- [frontend_rap_app/src/components/BackNavButton.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/BackNavButton.tsx)

Tu peux y changer :

- structure des en-tetes de page
- hero headers
- marges / espacements
- largeur du contenu
- rendu des blocs de contenu
- bouton retour

Si tu modifies bien ces fichiers, beaucoup de pages changeront de style **sans toucher une page metier une par une**.

### 3.4 Etats UI partages

Fichiers principaux :

- [frontend_rap_app/src/components/ui/LoadingState.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/LoadingState.tsx)
- [frontend_rap_app/src/components/ui/ErrorState.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/ErrorState.tsx)
- [frontend_rap_app/src/components/ui/EmptyState.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/EmptyState.tsx)
- [frontend_rap_app/src/components/ui/TableSkeleton.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/TableSkeleton.tsx)
- [frontend_rap_app/src/components/ui/StatCardSkeleton.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/StatCardSkeleton.tsx)
- [frontend_rap_app/src/components/ui/ConfirmDialog.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/ConfirmDialog.tsx)

Tu peux y changer :

- rendu des loaders
- rendu des erreurs
- rendu des etats vides
- apparence des confirmations

Ces fichiers donnent beaucoup de coherence percue si tu veux une UI plus propre.

### 3.5 Formulaires

Fichiers principaux :

- [frontend_rap_app/src/components/forms/FormSectionCard.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/FormSectionCard.tsx)
- [frontend_rap_app/src/components/forms/FormActionsBar.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/FormActionsBar.tsx)
- [frontend_rap_app/src/components/forms/RichHtmlEditorField.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/RichHtmlEditorField.tsx)

Champs mutualises :

- [frontend_rap_app/src/components/forms/fields/AppTextField.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/fields/AppTextField.tsx)
- [frontend_rap_app/src/components/forms/fields/AppSelectField.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/fields/AppSelectField.tsx)
- [frontend_rap_app/src/components/forms/fields/AppDateField.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/fields/AppDateField.tsx)
- [frontend_rap_app/src/components/forms/fields/AppNumberField.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/fields/AppNumberField.tsx)
- [frontend_rap_app/src/components/forms/fields/AppCheckboxField.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/fields/AppCheckboxField.tsx)
- [frontend_rap_app/src/components/forms/fields/AppReadonlyField.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/fields/AppReadonlyField.tsx)
- [frontend_rap_app/src/components/forms/fields/EntityPickerField.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/fields/EntityPickerField.tsx)

Tu peux y changer :

- style de champ
- densite
- sections de formulaire
- presentation des actions
- rendu editeur riche

Important :

- si tu restyles ces composants, beaucoup de formulaires changeront sans toucher leur logique

### 3.6 Filtres, listes et tables

Fichiers principaux :

- [frontend_rap_app/src/components/filters/FilterTemplate.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/filters/FilterTemplate.tsx)
- [frontend_rap_app/src/components/filters/EntityToolbar.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/filters/EntityToolbar.tsx)
- [frontend_rap_app/src/components/filters/PageSizeSelect.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/filters/PageSizeSelect.tsx)
- [frontend_rap_app/src/components/ResponsiveTableTemplate.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ResponsiveTableTemplate.tsx)
- [frontend_rap_app/src/components/tables/ListPaginationBar.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/tables/ListPaginationBar.tsx)
- [frontend_rap_app/src/components/tables/SelectionToolbar.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/tables/SelectionToolbar.tsx)
- [frontend_rap_app/src/components/ui/InlineStatusBadge.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/InlineStatusBadge.tsx)

Tu peux y changer :

- rendu des filtres
- disposition toolbar / recherche
- rendu tableau / cartes mobile
- pagination
- badge de statut

Si ton objectif est "refaire le look des listes", c'est **ici** qu'il faut travailler.

### 3.7 Dashboards et cartes

Fichiers principaux :

- [frontend_rap_app/src/components/dashboard/DashboardGrid.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/dashboard/DashboardGrid.tsx)
- [frontend_rap_app/src/components/dashboard/StatCard.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/dashboard/StatCard.tsx)
- [frontend_rap_app/src/components/dashboard/ChartCard.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/dashboard/ChartCard.tsx)

Tu peux y changer :

- style KPI
- style cartes graphiques
- grilles dashboard
- hiérarchie visuelle

### 3.8 Dialogs et modales

Fichiers principaux :

- [frontend_rap_app/src/components/layout/DetailViewLayout.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/layout/DetailViewLayout.tsx)
- [frontend_rap_app/src/components/ui/DetailSection.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/DetailSection.tsx)
- [frontend_rap_app/src/components/ui/DetailField.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/DetailField.tsx)
- [frontend_rap_app/src/components/dialogs/EntityPickerDialog.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/dialogs/EntityPickerDialog.tsx)

Et plusieurs modales de `src/components/modals/` et `src/pages/**/**DetailModal.tsx`.

Tu peux y changer :

- look des modales
- style detail
- paddings / titres / actions

## 4. Les fichiers a modifier seulement si tu veux un look specifique sur un module

Si tu veux refaire l'apparence d'un module particulier sans toucher tout le reste, vise d'abord :

- `src/pages/<module>/*Page.tsx`
- `src/pages/<module>/*Table.tsx`
- `src/pages/<module>/*Form.tsx`
- `src/pages/<module>/*DetailModal.tsx`

Exemples :

- Formations : [frontend_rap_app/src/pages/formations/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/formations)
- Prospection : [frontend_rap_app/src/pages/prospection/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection)
- Candidats : [frontend_rap_app/src/pages/candidats/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/candidats)
- Prepa : [frontend_rap_app/src/pages/prepa/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa)
- Declic : [frontend_rap_app/src/pages/declic/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/declic)

## 5. Les fichiers a eviter si tu veux seulement changer le look

Ne touche pas en premier a :

- [frontend_rap_app/src/api/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/api)
- [frontend_rap_app/src/hooks/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/hooks)
- [frontend_rap_app/src/routes/AppRoute.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/routes/AppRoute.tsx)
- [frontend_rap_app/src/utils/roleGroups.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/utils/roleGroups.ts)
- les fichiers `*CreatePage.tsx`, `*EditPage.tsx`, `*Page.tsx` si tu peux obtenir le changement via un composant partagé plus haut

Et surtout, evite de modifier :

- la logique `axios`
- les `mutations`
- les `fetch`
- les `onSubmit`
- les `permissions`
- les `Navigate`
- les filtres de requete API

## 6. Strategie la plus efficace pour refaire le look

### Option A — refonte globale douce

Modifier dans cet ordre :

1. [theme.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/theme.ts)
2. [PageTemplate.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageTemplate.tsx)
3. [PageWrapper.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageWrapper.tsx)
4. layouts dans `src/layout/`
5. composants de formulaire et tables

Effet :

- gros changement visuel
- risque fonctionnel faible

### Option B — refonte module par module

Ordre conseille :

1. choisir un module pilote
2. modifier ses composants visuels de page/table/form
3. generaliser ensuite vers les composants partages si le rendu est bon

Effet :

- plus prudent
- meilleur controle

## 7. Carte rapide par objectif

Si tu veux...

### Changer les couleurs / typo / ombres

Modifier :

- [theme.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/theme.ts)

### Changer l'apparence des pages

Modifier :

- [PageTemplate.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageTemplate.tsx)
- [PageWrapper.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageWrapper.tsx)
- [PageSection.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageSection.tsx)

### Changer sidebar / topbar / navigation

Modifier :

- fichiers de [src/layout/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout)
- [navigationStyles.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/navigationStyles.ts)

### Changer les formulaires

Modifier :

- `components/forms/`
- `components/forms/fields/`

### Changer les listes et tableaux

Modifier :

- [ResponsiveTableTemplate.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ResponsiveTableTemplate.tsx)
- `components/filters/`
- `components/tables/`

### Changer les dashboards

Modifier :

- `components/dashboard/`

### Changer les modales detail / dialogs

Modifier :

- `components/layout/DetailViewLayout.tsx`
- `components/ui/DetailSection.tsx`
- `components/dialogs/`
- `components/modals/`

## 8. Regle pratique pour ne pas casser l'app

Avant de modifier un fichier, pose-toi la question :

> Est-ce que ce fichier controle le rendu, ou est-ce qu'il controle le comportement ?

Si la reponse est :

- `rendu` -> tu peux probablement le modifier
- `comportement metier / permissions / API / navigation` -> prudence

## 9. Fichiers les plus rentables a toucher en premier

Si tu veux le maximum d'effet pour le minimum de risque, commence par :

1. [frontend_rap_app/src/theme.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/theme.ts)
2. [frontend_rap_app/src/components/PageTemplate.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageTemplate.tsx)
3. [frontend_rap_app/src/components/PageWrapper.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageWrapper.tsx)
4. [frontend_rap_app/src/layout/navigationStyles.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/navigationStyles.ts)
5. [frontend_rap_app/src/components/forms/FormSectionCard.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/FormSectionCard.tsx)
6. [frontend_rap_app/src/components/ResponsiveTableTemplate.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ResponsiveTableTemplate.tsx)
7. [frontend_rap_app/src/components/dashboard/StatCard.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/dashboard/StatCard.tsx)

## 10. Resume

Pour changer le look sans changer les fonctionnalites :

- commence par le **theme**
- puis les **layouts**
- puis les **shells de page**
- puis les **composants partages**
- touche les **pages metier** seulement si necessaire
- evite `api`, `hooks`, `routes`, `permissions`, `submit`, `axios`

Si tu respectes cette logique, tu peux refaire l'apparence de l'application avec un risque fonctionnel faible.

