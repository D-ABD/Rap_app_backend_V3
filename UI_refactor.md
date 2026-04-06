# UI Refactor Plan

## Objectif

Créer une base de composants UI réutilisables pour :

- standardiser l'interface
- réduire les duplications
- accélérer les futures évolutions

## Contraintes à respecter

- ne pas casser l'existant
- ne pas supprimer ni modifier les champs métier
- ne pas altérer les flux de données
- ne pas modifier les appels API
- conserver un comportement fonctionnel strictement identique
- garantir une UI responsive sur mobile, tablette et desktop
- moderniser les composants visuels sans casser l'application
- améliorer l'expérience utilisateur sans changer les règles métier
- rendre l'interface plus claire, plus agréable et plus cohérente visuellement
- tout ce qui est exposé aujourd'hui doit rester exposé
- aucune information actuellement visible ne doit être retirée
- aucune page existante ne doit perdre du contenu, des champs, des colonnes ou des actions
- la refactorisation doit uniquement améliorer, jamais réduire

La stratégie proposée ci-dessous est donc une refactorisation par composition, extraction et enveloppes UI, sans changement du contrat métier.

## Principe d'architecture non négociable

Les composants mutualisés doivent rester :

- présentatifs
- compositionnels
- faiblement couplés au domaine métier

Ils ne doivent pas embarquer :

- de logique API métier
- de règles de permissions métier
- de transformations métier spécifiques
- de mapping métier implicite

Ils reçoivent des props, affichent, structurent et déclenchent des callbacks.
Rien de plus.

Pourquoi c'est important :

- sinon les composants centraux comme `AppDataTable`, `FormPageShell` ou `EntityToolbar` deviennent trop intelligents
- ils deviennent difficiles à maintenir
- ils deviennent risqués à faire évoluer globalement

---

## État d'avancement (avril 2026)

Document de suivi opérationnel : [`UI_refactor_execution_plan.md`](UI_refactor_execution_plan.md) (section **1.b État d'avancement**).

**Réalisé dans le code :**

- **Lots 0 à 3** du plan d'exécution : briques `components/ui/*` (confirmations, états vides / chargement / erreur, squelettes), évolution de `PageTemplate` et `PageWrapper`, navigation (fil d'Ariane partagé, styles communs, harmonisation des quatre layouts staff / candidat / prépa / déclic).
- **Migration étendue du shell** : la plupart des pages sous `pages/` importent désormais `PageTemplate` et/ou `PageWrapper` (listes, création, édition, dashboards, accueil), au-delà des seuls pilotes Documents et TypeOffres.
- **Thème** : `theme.ts` enrichi (palette étendue, composants MUI par défaut, ombres, breakpoints) — point central pour une évolution visuelle cohérente.
- **Stabilité** : `useSidebarItems` mémorisé (`useMemo`) et garde sur la mise à jour de `submenuOpen` dans `MainLayout.tsx` pour supprimer la boucle de rendu infinie liée au menu latéral.

**Pas encore réalisé** (par rapport aux lots 4 à 10 du plan d'exécution) :

- Pas de briques dédiées `DetailSection` / `DetailField` / `DetailViewLayout` pour les modales détail.
- Pas de refonte « dashboards » au sens `DashboardGrid` / `StatCard` / `ChartCard` dédiés (hors squelette déjà livré au lot 1).
- Pas de couche générique filtres / toolbar / pagination / tables / champs formulaire / pickers comme décrit dans les lots 6 à 9 ; formulaires lourds (`ProspectionForm`, `CandidatForm`, `CerfaForm`, etc.) non migrés vers des abstractions nouvelles.

**Adoption des états UI** : les six briques `components/ui/*` existent ; en pratique (vérification code), seuls `LoadingState` et `ErrorState` sont importés par des pages (`DocumentsEditPage`, `TypeOffresCreatePage`). `EmptyState`, `ConfirmDialog`, `TableSkeleton` et `StatCardSkeleton` ne sont pas encore branchés dans l’app — à prévoir pour les lots suivants.

---

## 1. Analyse globale du frontend

## Périmètre analysé

Frontend principal : `frontend_rap_app/src`

Zones observées en priorité :

- `pages/*`
- `components/*`
- `layout/*`
- `hooks/*`

## Constat global

Le frontend a déjà commencé une mutualisation, mais elle reste incomplète.

Briques déjà présentes :

- `components/PageWrapper.tsx`
- `components/PageTemplate.tsx`
- `components/ResponsiveTableTemplate.tsx`
- `components/filters/FilterTemplate.tsx`
- `components/forms/RichHtmlEditorField.tsx`
- plusieurs modales de sélection dans `components/modals/*`

Le problème principal n'est pas l'absence totale de composants communs, mais leur adoption partielle. Beaucoup de modules réécrivent encore localement :

- la même structure de page CRUD
- la même logique liste + filtres + pagination + sélection
- les mêmes sections de formulaires
- les mêmes modales de détail
- les mêmes modales de sélection
- les mêmes dialogues d'export

## Enjeu UX complémentaire

La refactorisation ne doit pas seulement mutualiser le code.

Elle doit aussi permettre :

- une meilleure lisibilité des écrans
- des actions plus évidentes
- des formulaires moins fatigants visuellement
- une navigation plus fluide
- une cohérence de spacing, de hiérarchie visuelle et d'états interactifs
- une expérience plus moderne, plus rassurante et plus agréable

Le bon objectif est donc :

- factoriser l'UI
- améliorer les composants
- garder exactement le même comportement métier
- garder exactement le même périmètre d'information affichée
- conserver tout l'existant visible, même si la présentation est modernisée

## Principe de conservation absolue de l'existant exposé

Règle non négociable :

- tout ce qui est exposé à ce jour doit rester exposé

Cela implique :

- les tables gardent tous les champs actuellement affichés
- les formulaires gardent tous les champs actuels
- les pages gardent leurs sections actuelles
- les écrans détail gardent toutes les informations visibles aujourd'hui
- les actions visibles aujourd'hui restent disponibles
- les parcours existants restent accessibles

Ce qui peut changer :

- l'organisation visuelle
- le composant utilisé pour afficher l'information
- le style
- le responsive
- l'ergonomie

Ce qui ne doit pas changer :

- la présence de l'information
- la présence des champs
- la présence des colonnes
- la présence des actions
- la couverture fonctionnelle déjà visible

## Principe d'architecture : pas de logique métier dans les composants UI

Règle absolue :

- aucun composant UI réutilisable ne doit contenir de logique métier

Cela concerne notamment :

- `AppDataTable`
- `FormSectionCard`
- `FormStepper`
- `EntityToolbar`
- `FilterPanelShell`
- `ConfirmDialog`
- `EmptyState`
- `StatCard`
- composants charts
- layouts
- pickers génériques

Les composants UI peuvent gérer :

- le rendu
- la mise en page
- les états visuels
- les interactions génériques
- l'accessibilité
- les variantes responsive

Les composants UI ne doivent pas gérer :

- les règles métier
- les permissions métier
- les décisions métier
- les transformations métier de payload
- les conditions métier spécifiques à une entité
- les appels API métier
- la construction de payloads métier
- les choix de workflow métier

La logique métier doit rester dans :

- les pages
- les hooks métier
- les services
- les adaptateurs spécifiques

Exemple correct :

- `FormSectionCard` affiche un groupe de champs
- `AppDataTable` affiche des colonnes reçues en props
- `ConfirmDialog` affiche une confirmation

Exemple incorrect :

- `AppDataTable` décide quelles colonnes montrer selon un statut métier
- `FormStepper` décide quelles étapes cacher selon une règle métier spécifique
- `ConfirmDialog` sait qu'un candidat ne peut pas être supprimé dans tel cas
- `EntityToolbar` décide quels filtres afficher selon une règle métier codée en dur

## Principe de séparation : UI générique vs adaptateurs métier

Pour éviter les composants trop abstraits ou trop couplés, la refactorisation doit suivre une séparation explicite en deux couches.

### Couche 1 : composants UI génériques

Exemples :

- `EntityPickerDialog`
- `AppTextField`
- `FormSectionCard`
- `AppDataTable`
- `ConfirmDialog`
- `EmptyState`
- `StatCard`

Rôle :

- afficher
- structurer
- styliser
- exposer des points d'extension via les props

### Couche 2 : adaptateurs métier

Exemples :

- `ProspectionPartnerPicker`
- `CandidatFormationPicker`
- `AppairageStatusBadge`
- `ProspectionExportAction`
- `FormationListColumns`

Rôle :

- brancher la donnée métier sur les composants génériques
- faire les mappings métier explicites
- encapsuler les variations spécifiques à une entité

Bénéfices :

- la couche générique reste propre
- les variations métier restent localisées
- on évite les props monstrueuses qui tentent de couvrir tous les cas métier possibles

Règle pratique :

- si un composant commence à connaître trop de cas métier, il faut introduire un adaptateur métier au lieu d'ajouter de nouvelles branches dans le composant UI

## Compatibilité progressive

Les nouveaux composants doivent pouvoir coexister avec les anciens pendant toute la durée de la migration.

Cela implique :

- pas de migration big bang
- pas de dépendance qui force à convertir toutes les pages d'un coup
- compatibilité avec les pages encore non migrées
- possibilité d'adopter les briques progressivement

Objectif :

- sécuriser la transition
- permettre une migration page par page
- garder l'application utilisable à tout moment

## Patterns répétés identifiés

### A. Structure de pages CRUD très répétée

Très fréquent :

- `List page` avec :
  - `PageTemplate`
  - bouton afficher/masquer filtres
  - compteur de filtres actifs
  - export
  - sélection multiple
  - pagination
  - table métier
- `Create page` avec :
  - `PageTemplate`
  - un seul formulaire métier
- `Edit page` avec :
  - `PageTemplate`
  - chargement
  - gestion erreur/not found
  - formulaire métier

Exemples :

- `pages/formations/FormationsPage.tsx`
- `pages/prospection/ProspectionPage.tsx`
- `pages/partenaires/PartenairesPage.tsx`
- `pages/appairage/AppairagesPage.tsx`
- `pages/candidats/candidatsPage.tsx`
- `pages/Documents/DocumentsPage.tsx`
- `pages/ateliers/AteliersTrePage.tsx`
- `pages/evenements/EvenementsPage.tsx`

Le projet contient environ 88 pages qui utilisent `PageTemplate`, ce qui confirme un fort potentiel d'uniformisation.

En pratique, cela signifie aussi qu'une amélioration du shell de page pourrait avoir un effet immédiat et global sur l'expérience utilisateur.

### B. Répétition forte sur les pages listes

Les écrans listes répètent souvent :

- `showFilters`
- `activeFiltersCount`
- `usePagination`
- `selectedIds`
- `selectAll / clearSelection`
- pagination MUI
- bouton refresh
- actions d'archivage/suppression

Le pattern est visible notamment dans :

- `pages/formations/FormationsPage.tsx`
- `pages/prospection/ProspectionPage.tsx`
- `pages/partenaires/PartenairesPage.tsx`
- `pages/appairage/AppairagesPage.tsx`
- `pages/candidats/candidatsPage.tsx`
- `pages/prepa/PrepaPagesAteliers.tsx`

### C. Tables métier proches mais peu factorisées

Seulement une petite partie des tables repose sur `ResponsiveTableTemplate`.

Utilisé notamment par :

- `pages/formations/FormationTable.tsx`
- `pages/prospection/ProspectionTable.tsx`
- `pages/partenaires/PartenaireTable.tsx`
- `pages/prospection/prospectioncomments/ProspectionCommentTable.tsx`

Mais beaucoup d'autres tables gardent une implémentation spécifique complète.

Opportunité :

- extraire un niveau de table générique plus riche
- laisser chaque module ne définir que ses colonnes et actions
- améliorer le rendu mobile avec des cartes plus lisibles
- mieux hiérarchiser les actions et états de ligne

Contrainte absolue :

- les tables refactorisées doivent conserver toutes les colonnes et informations actuellement exposées
- aucune colonne métier visible aujourd'hui ne doit être supprimée
- les améliorations de layout ne doivent jamais masquer durablement une information métier existante

### D. Filtres déjà factorisés mais encore dispersés

Bonne base existante avec :

- `components/filters/FilterTemplate.tsx`

Adopté par plusieurs panneaux :

- `FiltresCandidatsPanel`
- `FiltresProspectionsPanel`
- `FiltresFormationsPanel`
- `FiltresPartenairesPanel`
- `FiltresCerfaPanel`
- `DocumentsFiltresPanel`

Mais les pages listes réimplémentent encore autour :

- bouton toggle
- compteur de filtres actifs
- persist localStorage
- reset/refresh
- mise en page toolbar

Opportunité UX :

- rendre les filtres plus lisibles
- mieux signaler les filtres actifs
- améliorer le rendu responsive des panneaux de filtres

### E. Formulaires avec sous-composants locaux redondants

Plusieurs formulaires redéfinissent localement les mêmes briques :

- `Section`
- `Input`
- wrappers `Paper + Divider + Grid`
- gestion homogène `errors`, `generalError`, `loading`

Exemples :

- `pages/formations/FormationForm.tsx`
- `pages/prospection/ProspectionForm.tsx`
- `pages/partenaires/PartenaireForm.tsx`
- `pages/partenaires/PartenaireCandidatForm.tsx`
- `pages/prepa/PrepaForm.tsx`
- `pages/declic/DeclicForm.tsx`
- `pages/evenements/EvenementForm.tsx`
- `pages/rapports/RapportForm.tsx`

Opportunité UX :

- meilleure hiérarchie entre sections
- labels, aides et erreurs plus cohérents
- largeur de champs plus stable
- meilleure lecture mobile

Contrainte absolue :

- tous les champs actuels doivent rester présents
- aucune donnée saisissable aujourd'hui ne doit disparaître
- un découpage en sections ou en étapes ne doit jamais retirer un champ

### F. Modales de détail dupliquées

Beaucoup de `DetailModal` reconstruisent les mêmes primitives :

- `Dialog`
- `Section`
- `Field`
- `fmt / nn / yn`
- boutons d'actions rapides
- gestion loading/error

Exemples :

- `pages/prospection/ProspectionDetailModal.tsx`
- `pages/formations/FormationDetailModal.tsx`
- `pages/formations/FormationDetailPage.tsx`
- `pages/partenaires/PartenaireDetailModal.tsx`
- `pages/partenaires/PartenaireCandidatDetailModal.tsx`
- `pages/ateliers/AtelierTREDetailModal.tsx`
- `pages/declic/DeclicDetailModal.tsx`
- `pages/evenements/EvenementDetailModal.tsx`

Opportunité UX :

- standardiser l'affichage des informations
- rendre les détails plus scannables
- améliorer les actions rapides
- mieux gérer les petits écrans

Contrainte absolue :

- toutes les informations déjà visibles dans les vues détail doivent rester visibles
- la refactorisation peut réorganiser, mais pas réduire

### G. Modales de sélection très proches

Les composants suivants partagent presque la même structure :

- `components/modals/FormationSelectModal.tsx`
- `components/modals/PartenairesSelectModal.tsx`
- `components/modals/CandidatsSelectModal.tsx`
- `components/modals/CentresSelectModal.tsx`
- `components/modals/UsersSelectModal.tsx`
- `components/modals/ProspectionSelectModal.tsx`
- `components/modals/CerfaSelectModal.tsx`

Pattern répété :

- `Dialog`
- `TextField` de recherche
- fetch à l'ouverture
- `List/ListItemButton`
- sélection simple ou multiple
- état vide / loading

### H. Boutons d'export très dupliqués

Forte duplication entre :

- `components/export_buttons/ExportButtonFormation.tsx`
- `components/export_buttons/ExportButtonProspection.tsx`
- `components/export_buttons/ExportButtonAppairage.tsx`
- `components/export_buttons/ExportButtonCandidat.tsx`
- `components/export_buttons/ExportButtonCommentaires.tsx`
- `components/export_buttons/ExportButtonDeclic.tsx`
- `components/export_buttons/ExportButtonPrepa.tsx`
- etc.

Répétitions principales :

- `getFilenameFromDisposition`
- `getErrorMessage`
- modal d'export
- création du blob
- téléchargement
- gestion `selectedIds`

### I. Layouts multiples avec beaucoup de recopie

Les layouts suivants ont une base très proche :

- `layout/MainLayout.tsx`
- `layout/MainLayoutCandidat.tsx`
- `layout/MainLayoutPrepa.tsx`
- `layout/MainLayoutDeclic.tsx`

Éléments répétés :

- AppBar
- Drawer
- zone user menu
- theme switch
- breadcrumbs
- footer
- contenu principal

Le vrai différenciateur est surtout :

- le jeu de menus
- le titre / branding
- quelques variations responsive

Cela ouvre la voie à un socle layout commun capable d'améliorer globalement :

- la cohérence visuelle
- la lisibilité des menus
- la qualité du responsive
- la perception de modernité de l'application

---

## 1 bis. Exigences UI / UX à intégrer dans la refactorisation

## Responsive obligatoire

Tout nouveau composant mutualisé devra fonctionner correctement sur :

- mobile
- tablette
- desktop

Points d'attention :

- aucune toolbar ne doit devenir inutilisable sur petit écran
- les tables doivent avoir un fallback lisible en cartes ou lignes empilées
- les formulaires doivent éviter les champs écrasés ou les colonnes illisibles
- les modales doivent rester exploitables sur écran réduit
- les actions principales doivent rester visibles et faciles à atteindre

## Modernisation visuelle attendue

Sans changer le métier, les composants centraux doivent progressivement apporter :

- une meilleure hiérarchie typographique
- des espacements cohérents
- des surfaces plus propres
- des sections plus lisibles
- des boutons plus clairs dans leur priorité
- des états hover/focus/disabled/loading plus propres
- des messages vides / erreurs / chargement plus soignés

## Couche thème / design tokens

La mutualisation des composants ne suffit pas si les styles restent dispersés.

Il faut centraliser au maximum :

- `spacing`
- `border radius`
- `shadows`
- `typographic scale`
- couleurs de statuts
- couleurs d'alertes
- tailles des champs
- densité des tables
- styles des états `hover / focus / disabled`

Principe :

- les composants centraux doivent consommer le thème
- ils ne doivent pas encoder localement des styles métier dispersés
- si nécessaire, ajouter quelques tokens maison orientés UI

Exemples de tokens utiles :

- `uiTokens.form.sectionGap`
- `uiTokens.table.density`
- `uiTokens.card.radius`
- `uiTokens.emptyState.iconSize`

Objectif :

- éviter de simplement déplacer la dispersion
- permettre des évolutions globales vraiment centralisées

## Expérience utilisateur friendly

Le rendu cible doit être :

- plus simple à comprendre
- plus confortable à utiliser
- plus rassurant sur les actions importantes
- plus fluide dans les parcours CRUD
- plus agréable visuellement, sans surdesign

En particulier :

- les actions principales doivent être évidentes
- les actions destructives doivent être mieux encadrées
- les filtres doivent être faciles à ouvrir, comprendre et réinitialiser
- les formulaires doivent réduire la charge cognitive
- les pages listes doivent être rapidement scannables
- les modales doivent être sobres, utiles et non oppressantes
- les formulaires longs doivent être découpés pour éviter de surcharger l'écran
- les états vides doivent être pédagogiques et engageants
- les retours de succès et d'erreur doivent être immédiats et cohérents
- les chargements doivent être plus élégants que de simples spinners
- la navigation doit toujours indiquer clairement où se trouve l'utilisateur

---

## 2. Composants réutilisables à créer ou factoriser

## A. Formulaires

### 1. `FormPageShell`

Rôle :

- standardiser les pages create/edit
- centraliser titre, back, loading, not found, erreur générale
- fournir une structure responsive et visuellement cohérente

Props attendues :

- `title`
- `subtitle?`
- `onBack?`
- `loading?`
- `error?`
- `notFound?`
- `children`
- `actions?`

Exemple d'usage :

```tsx
<FormPageShell title="Modifier la formation" loading={loading} error={error} onBack={() => navigate(-1)}>
  <FormationForm ... />
</FormPageShell>
```

### 2. `EntityFormLayout`

Rôle :

- fournir le squelette standard d'un formulaire métier
- zone erreur globale + contenu + footer d'actions
- permettre une présentation moderne, lisible et progressive des formulaires

Props attendues :

- `generalError?`
- `loading?`
- `children`
- `actions`

Exemple :

```tsx
<EntityFormLayout generalError={generalError} loading={loading} actions={<FormActions ... />}>
  {sections}
</EntityFormLayout>
```

### 3. `FormSectionCard`

Rôle :

- remplacer les multiples composants locaux `Section`
- uniformiser `Paper + titre + icône + divider + grid`
- améliorer la lisibilité et la respiration visuelle du formulaire

Exigence visuelle complémentaire :

- regrouper les champs par thématiques dans des `Card` MUI avec élévation légère
- chaque section doit représenter un bloc métier clair
- la composition doit aider à aérer l'écran et à rendre le formulaire plus moderne

Props attendues :

- `title`
- `icon?`
- `children`
- `columns?`

Exemple :

```tsx
<FormSectionCard title="Informations générales" icon={<BusinessIcon />}>
  ...
</FormSectionCard>
```

### 4. `FormFieldGrid`

Rôle :

- standardiser la grille des champs

Props attendues :

- `children`
- `spacing?`
- `defaultItemProps?`

### 5. Champs partagés

Créer sous `components/forms/fields` :

- `AppTextField`
- `AppSelectField`
- `AppDateField`
- `AppCheckboxField`
- `AppNumberField`
- `AppReadonlyField`
- `EntityPickerField`

Rôle :

- standardiser style, erreurs, `fullWidth`, `size`, `helperText`, `name`, `value`
- améliorer la cohérence des états focus, erreur, aide et désactivation

Exigence explicite :

- refondre les formulaires migrés avec des `MUI TextField` en variante `outlined`
- conserver strictement les noms de champs, les valeurs, les validations et les handlers existants

Props attendues :

- `label`
- `name`
- `value`
- `onChange`
- `error?`
- `helperText?`
- `required?`
- `disabled?`

Pour `EntityPickerField` :

- `label`
- `valueLabel`
- `onOpenPicker`
- `onClear?`
- `disabled?`

Cas d'usage immédiats :

- `ProspectionForm` pour partenaire / formation / owner
- `CandidatForm` pour formation / utilisateur
- formulaires Prépa / Déclic / Appairage

Améliorations UI recommandées :

- hauteur de champ homogène
- helper text mieux aligné
- labels stables
- meilleure lisibilité des champs désactivés
- meilleur comportement sur écrans étroits
- rendu visuel moderne basé sur des champs `outlined`

### 6. `FormActionsBar`

Rôle :

- standardiser les boutons annuler / enregistrer / actions secondaires

Props attendues :

- `onCancel?`
- `submitLabel`
- `submitting?`
- `children?`

### 7. `FormStepper`

Rôle :

- introduire un formulaire par étapes pour les formulaires volumineux
- éviter de surcharger l'écran
- rendre la progression plus lisible et plus confortable

Props attendues :

- `steps`
- `activeStep`
- `onStepChange`
- `allowStepClick?`
- `children`
- `actions`

Exemple :

```tsx
<FormStepper
  steps={["Identité", "Coordonnées", "Informations métier", "Validation"]}
  activeStep={activeStep}
  onStepChange={setActiveStep}
>
  {stepContent}
</FormStepper>
```

### 8. `GenericEntityForm`

Bonus pertinent, mais à introduire seulement pour les formulaires simples.

Rôle :

- décrire un formulaire à partir d'une config

À cibler d'abord sur :

- Statuts
- TypesOffres
- Centres
- Rapports simples

À éviter dans un premier temps pour :

- `CandidatForm`
- `CerfaForm`
- `ProspectionForm`
- formulaires Prépa complexes

Règle explicite :

- le projet doit privilégier des composants de formulaire réutilisables plutôt qu'un moteur de formulaire trop générique

Autrement dit :

- mutualiser les briques
- pas forcément tout décrire par configuration

Pourquoi :

- un `GenericEntityForm` devient vite trop abstrait
- trop limité dans les cas réels
- ou au contraire trop complexe à maintenir

---

## B. Tables / listes

### 1. `EntityListPage`

Rôle :

- encapsuler le pattern complet page liste
- fournir une expérience de liste homogène et responsive

Contrainte :

- ne jamais réduire le nombre de données affichées par la page
- la mutualisation doit conserver les colonnes, filtres, actions et états existants

Responsabilités :

- header
- actions toolbar
- panneau filtres
- zone sélection
- table
- pagination
- états vides / loading / erreur

Props attendues :

- `title`
- `actions`
- `filters`
- `showFilters`
- `onToggleFilters`
- `activeFiltersCount`
- `loading`
- `error`
- `empty`
- `table`
- `pagination`
- `selectionBar?`

### 2. `EntityToolbar`

Rôle :

- standardiser la barre d'actions en haut des listes
- mieux organiser les actions selon leur priorité
- passer proprement en stack sur mobile

Props attendues :

- `search?`
- `onSearchChange?`
- `showFilters`
- `onToggleFilters`
- `activeFiltersCount`
- `leftActions?`
- `rightActions?`

### 3. `FilterPanelShell`

Rôle :

- entourer `FilterTemplate`
- gérer affichage, persist éventuelle, reset, refresh

Props attendues :

- `open`
- `children`
- `storageKey?`
- `count?`

### 4. `SelectionToolbar`

Rôle :

- uniformiser sélection multiple

Props attendues :

- `selectedCount`
- `onSelectAll`
- `onClearSelection`
- `actions?`

### 5. `AppDataTable`

Rôle :

- faire évoluer `ResponsiveTableTemplate` en vraie brique centrale

Contrainte absolue :

- `AppDataTable` doit être capable de reprendre 100% des colonnes actuellement affichées
- la refactorisation ne doit pas être utilisée pour simplifier le contenu métier visible

Props attendues :

- `columns`
- `rows`
- `getRowId`
- `loading?`
- `emptyMessage?`
- `onRowClick?`
- `actions?`
- `selection?`
- `mobileCardTitle?`
- `rowSx?`
- `stickyEnabled?`
- `onToggleSticky?`

Améliorations UX attendues :

- meilleure densité visuelle
- colonnes plus cohérentes
- états vides plus propres
- meilleure lecture des actions
- cartes mobiles plus modernes et plus lisibles
- possibilité de figer simultanément l'en-tête et la première colonne pour améliorer la lecture des grands tableaux

Exigence spécifique importante pour les tables :

- ajouter un `Switch` piloté par un `useState`
- ce switch active ou désactive le `position: sticky`
- l'activation doit s'appliquer simultanément :
  - à la ligne d'en-tête avec `top: 0`
  - à la première colonne avec `left: 0`
- le choix utilisateur doit être mémorisé dans le `localStorage`

Comportement attendu :

- si le switch est actif :
  - l'en-tête reste visible au scroll vertical
  - la première colonne reste visible au scroll horizontal
- si le switch est inactif :
  - le tableau revient à un comportement standard

Recommandation d'implémentation :

- gérer un état du type `const [stickyEnabled, setStickyEnabled] = useState(...)`
- initialiser cet état depuis `localStorage`
- persister chaque changement dans `localStorage`
- brancher cet état dans le composant central de table, pas dans chaque page métier
- prévoir une clé stable du type `ui.table.sticky.enabled`

Exemple de comportement cible :

```tsx
const [stickyEnabled, setStickyEnabled] = useState<boolean>(() => {
  return localStorage.getItem("ui.table.sticky.enabled") === "1";
});

useEffect(() => {
  localStorage.setItem("ui.table.sticky.enabled", stickyEnabled ? "1" : "0");
}, [stickyEnabled]);
```

Puis :

```tsx
<Switch
  checked={stickyEnabled}
  onChange={(_, checked) => setStickyEnabled(checked)}
/>
```

Et dans la table :

- header sticky si `stickyEnabled === true`
- première colonne sticky si `stickyEnabled === true`

Note de séquencement importante :

- `AppDataTable` doit arriver après la standardisation de :
  - la toolbar
  - les filtres
  - la pagination
  - la sélection

Pourquoi :

- la table centrale est l'un des composants les plus délicats de toute la refactorisation
- elle concentre sticky header, sticky first column, sélection, rendu mobile, row actions, row click, densité, états vides, loading et accessibilité

Discipline recommandée :

- d'abord stabiliser les briques périphériques
- ensuite seulement centraliser la table

### 6. `ListPaginationBar`

Rôle :

- standardiser `pageSize + pagination + count`

Props attendues :

- `page`
- `totalPages`
- `pageSize`
- `onPageChange`
- `onPageSizeChange`
- `count?`

### 7. `ColumnFactory` ou helpers de colonnes

Rôle :

- éviter de répéter formatteurs date / badge / archive / actions

Helpers proposés :

- `buildDateColumn`
- `buildStatusColumn`
- `buildBooleanColumn`
- `buildLinkColumn`
- `buildActionsColumn`

---

## C. Layout

### 1. `CrudPageLayout`

Rôle :

- standardiser `Create / Edit / Detail / List`
- assurer une cohérence visuelle globale
- améliorer la sensation de produit fini

Contrainte :

- les layouts doivent encapsuler les pages, pas réduire leur contenu fonctionnel

Sous-variants :

- `ListPageLayout`
- `CreatePageLayout`
- `EditPageLayout`
- `DetailPageLayout`

### 2. `PageHeader`

Rôle :

- extraire du `PageTemplate` le header réellement réutilisable

Props attendues :

- `title`
- `subtitle?`
- `backButton?`
- `onBack?`
- `refreshButton?`
- `onRefresh?`
- `actions?`
- `headerExtra?`

### 3. `SectionCard`

Rôle :

- brique commune pour formulaires, détails, dashboards simples

### 4. `DetailViewLayout`

Rôle :

- standardiser les vues détail et modales détail

Props attendues :

- `title`
- `loading`
- `error`
- `sections`
- `quickActions?`
- `footerActions?`

### 5. `AppShell`

Rôle :

- unifier les 4 layouts principaux sans perdre les menus spécifiques

Idée :

- un seul composant socle
- une config de navigation par rôle / contexte

Améliorations UX attendues :

- navigation plus claire
- meilleure cohérence du header
- drawer plus propre sur mobile
- breadcrumbs plus lisibles
- indication claire de la page active dans le menu latéral

Props attendues :

- `brandTitle`
- `menuItems`
- `showBreadcrumbs`
- `userMenu`
- `children`

---

## D. UI globale

### 1. `AppButton`

Rôle :

- standardiser variantes, tailles, icônes, états chargement

Objectif UX :

- des boutons plus modernes
- des priorités visuelles plus nettes
- une meilleure cohérence dans toute l'application

Variantes utiles :

- `primary`
- `secondary`
- `danger`
- `ghost`
- `filterToggle`

### 2. `ConfirmDialog`

Rôle :

- remplacer les multiples `Dialog` de confirmation

Props attendues :

- `open`
- `title`
- `message`
- `confirmLabel`
- `cancelLabel`
- `onConfirm`
- `onClose`
- `loading?`
- `severity?`

### 3. `ExportDialog`

Rôle :

- centraliser la modal d'export

Props attendues :

- `open`
- `entityLabel`
- `formats`
- `selectedCount`
- `includeArchived?`
- `onConfirm`
- `onClose`
- `loading`

### 4. `DetailField`

Rôle :

- remplacer les multiples composants `Field`

Props attendues :

- `label`
- `value`
- `span?`

### 5. `DetailSection`

Rôle :

- remplacer les multiples composants `Section` dans les modales détail

### 6. `EmptyState`

Rôle :

- standardiser les états vides des pages de liste
- afficher une illustration MUI, un texte explicatif et une action claire

Props attendues :

- `icon`
- `title`
- `description`
- `actionLabel?`
- `onAction?`

Exigence explicite :

- créer des composants `EmptyState` avec une illustration via `MUI icons`
- ajouter un texte explicatif
- prévoir un bouton d'action primaire
- pour chaque page de liste, le CTA doit pouvoir être contextualisé
- exemple demandé : `Créer mon premier contrat`

### 7. `AppSnackbarProvider`

Rôle :

- centraliser les notifications globales de succès et d'erreur
- uniformiser les retours après soumission ou suppression

Exigence explicite :

- implémenter un `SnackbarProvider` global
- ou utiliser `notistack`
- afficher des alertes de succès en vert
- afficher des alertes d'erreur en rouge
- brancher ce mécanisme après chaque soumission de formulaire et après chaque suppression

### 8. `TableSkeleton`

Rôle :

- afficher un squelette qui imite la structure des tables pendant le chargement API

Props attendues :

- `rows?`
- `columns?`
- `showHeader?`

### 9. `StatCardSkeleton`

Rôle :

- afficher un squelette qui imite la structure des cards de statistiques

Props attendues :

- `count?`

Exigence explicite :

- générer des composants `Skeleton` qui imitent la structure réelle :
  - des tables
  - des cards de stats
- ces composants doivent être affichés pendant le temps de réponse de l'API Django

### 10. `AppBreadcrumbs`

Rôle :

- afficher un breadcrumb dynamique en haut de chaque page
- améliorer la compréhension de la navigation

Props attendues :

- `items`
- `currentLabel?`
- `showHome?`

Exigence explicite :

- ajouter un composant `Breadcrumbs` dynamique en haut de chaque page
- s'assurer que le menu latéral (`Drawer`) indique clairement la page active
- prévoir un styling d'active link stable et lisible

### 11. `EntityPickerDialog`

Rôle :

- socle commun des modales de sélection

Props attendues :

- `open`
- `title`
- `searchPlaceholder`
- `loading`
- `items`
- `onSearch`
- `renderItem`
- `onSelect`
- `multiple?`
- `selectedIds?`

### 12. `InlineStatusBadge`

Rôle :

- centraliser les badges de statut / archive / activité

Le projet a déjà `EtatBadge.tsx`, à repositionner comme brique centrale.

Amélioration visuelle attendue :

- badges plus homogènes
- meilleure lisibilité couleur/contraste
- meilleure compréhension rapide des états

---

## E. Dashboard / statistiques

### 1. `DashboardGrid`

Rôle :

- structurer les dashboards avec une `Grid` MUI responsive
- organiser proprement les KPI, graphiques et blocs d'analyse

Props attendues :

- `children`
- `spacing?`
- `columns?`

Exigence :

- les dashboards statistiques doivent être construits avec une `Grid` MUI
- le layout doit rester lisible sur mobile, tablette et desktop

### 2. `StatCard`

Rôle :

- créer une carte statistique réutilisable
- afficher une valeur, une icône et un indicateur de progression

Props attendues :

- `title`
- `value`
- `icon`
- `progress?`
- `progressLabel?`
- `colorKey?`
- `subtitle?`
- `trend?`

### 3. `ChartCard`

Rôle :

- standardiser le conteneur visuel d'un graphique
- fournir titre, padding, hauteur et structure cohérents

Props attendues :

- `title`
- `subtitle?`
- `children`
- `actions?`

### 4. `DashboardBarChart`

Rôle :

- encapsuler un graphique `Recharts` en barres réutilisable

Props attendues :

- `data`
- `xKey`
- `bars`
- `title?`
- `height?`
- `emptyMessage?`

### 5. `DashboardPieChart`

Rôle :

- encapsuler un graphique `Recharts` en camembert réutilisable

Props attendues :

- `data`
- `nameKey`
- `valueKey`
- `title?`
- `height?`
- `emptyMessage?`

Exigence explicite :

- générer les dashboards de statistiques avec une `Grid` MUI
- créer un composant `StatCard` réutilisable avec icône et indicateur de progression
- intégrer des graphiques `Recharts` en barres et en camembert
- styliser ces graphiques avec les couleurs du thème central

Règle importante :

- ne pas coder les couleurs directement dans chaque dashboard
- utiliser les couleurs exposées par la couche thème de l'application
- si un `theme.ts` est créé ou utilisé, les composants dashboard doivent consommer ses tokens
- sinon, ils doivent lire les couleurs depuis la source de thème déjà utilisée par l'application

Objectif UX :

- dashboards plus lisibles
- meilleure hiérarchie visuelle des KPI
- rendu plus moderne, plus agréable et plus cohérent

---

## 3. Architecture cible proposée

```txt
frontend_rap_app/src/
  components/
    dashboard/
      ChartCard.tsx
      DashboardBarChart.tsx
      DashboardGrid.tsx
      DashboardPieChart.tsx
      StatCard.tsx
    forms/
      fields/
        AppTextField.tsx
        AppSelectField.tsx
        AppDateField.tsx
        AppCheckboxField.tsx
        AppNumberField.tsx
        AppReadonlyField.tsx
        EntityPickerField.tsx
      FormActionsBar.tsx
      FormFieldGrid.tsx
      EntityFormLayout.tsx
      FormPageShell.tsx
      FormSectionCard.tsx
      FormStepper.tsx
      GenericEntityForm.tsx
      RichHtmlEditorField.tsx
    tables/
      AppDataTable.tsx
      ListPaginationBar.tsx
      SelectionToolbar.tsx
      columnFactories.tsx
    filters/
      FilterTemplate.tsx
      FilterPanelShell.tsx
      EntityToolbar.tsx
    layout/
      AppShell.tsx
      CrudPageLayout.tsx
      EntityListPage.tsx
      DetailViewLayout.tsx
      ListPageLayout.tsx
      PageHeader.tsx
      PageSection.tsx
      PageTemplate.tsx
      PageWrapper.tsx
      SectionCard.tsx
    ui/
      AppBreadcrumbs.tsx
      AppButton.tsx
      AppSnackbarProvider.tsx
      ConfirmDialog.tsx
      DetailField.tsx
      DetailSection.tsx
      EmptyState.tsx
      ErrorState.tsx
      LoadingState.tsx
      StatCardSkeleton.tsx
      TableSkeleton.tsx
      ExportDialog.tsx
      InlineStatusBadge.tsx
    dialogs/
      EntityPickerDialog.tsx
      PostCreateChoiceDialog.tsx
  hooks/
    ui/
      useFilterPanelState.ts
      useListSelection.ts
      useEntityListPage.ts
```

## Répartition de responsabilité

### `components/forms`

Contient uniquement des briques UI et structurelles. Aucun appel API direct.

### `components/tables`

Contient les composants purement visuels des listes.

### `components/layout`

Contient les wrappers de page et les shells transverses.

Hiérarchie recommandée :

- `CrudPageLayout` = shell générique haut niveau
- `ListPageLayout` = variante structurelle orientée page liste
- `EntityListPage` = assemblage orienté cas d'usage métier pour une page liste complète

### `components/ui`

Contient les primitives globales.

Y placer aussi :

- `AppSnackbarProvider`
- `AppBreadcrumbs`
- `TableSkeleton`
- `StatCardSkeleton`

### `components/dialogs`

Contient toutes les modales génériques.

### `hooks/ui`

Contient la logique transverse de comportement d'interface :

- affichage des filtres
- persistance localStorage
- sélection multiple
- configuration pagination/toolbar
- intégration des notifications globales si nécessaire

### `hooks/ui/useEntityListPage.ts`

Rôle recommandé :

- centraliser la logique transverse d'une page liste complète
- agréger de manière légère :
  - état d'affichage des filtres
  - sélection multiple
  - pagination
  - états `loading / error / empty`

Important :

- ce hook reste UI
- il ne doit pas contenir de logique métier spécifique à une entité
- il ne remplace pas les hooks métier existants

### `adapters/` ou adaptateurs au niveau module

À introduire lorsque nécessaire pour brancher la couche générique sur le domaine métier.

Exemples :

- adaptateurs de colonnes
- adaptateurs de pickers métier
- adaptateurs d'actions d'export
- adaptateurs de badges d'état

---

## 4. Exemples d'usage des composants cibles

## Exemple 1 : formulaire standardisé

```tsx
<FormPageShell title="Nouvelle prospection" onBack={() => navigate(-1)}>
  <EntityFormLayout
    generalError={generalError}
    loading={loading}
    actions={
      <FormActionsBar
        submitLabel="Enregistrer"
        submitting={loading}
        onCancel={() => navigate(-1)}
      />
    }
  >
    <FormStepper
      steps={["Informations générales", "Suivi", "Validation"]}
      activeStep={activeStep}
      onStepChange={setActiveStep}
    >
      <FormSectionCard title="Prospection" icon={<AssignmentIcon />}>
        <EntityPickerField label="Partenaire" valueLabel={partenaireNom} onOpenPicker={openPartnerModal} />
        <AppDateField label="Date" name="date_prospection" value={form.date_prospection} onChange={handleChange} />
        <AppSelectField label="Statut" name="statut" value={form.statut} onChange={handleSelectChange} options={...} />
      </FormSectionCard>
    </FormStepper>
  </EntityFormLayout>
</FormPageShell>
```

## Exemple 2 : table générique

```tsx
<EntityListPage
  title="Formations"
  actions={<FormationExportButton selectedIds={selectedIds} />}
  filters={
    <FilterPanelShell open={showFilters} count={activeFiltersCount}>
      <FiltresFormationsPanel ... />
    </FilterPanelShell>
  }
  table={
    <AppDataTable
      columns={columns}
      rows={formations}
      getRowId={(row) => row.id}
      onRowClick={(row) => navigate(`/formations/${row.id}/edit`)}
      selection={{ selectedIds, onToggle: toggleSelect }}
    />
  }
  pagination={
    <ListPaginationBar
      page={page}
      totalPages={totalPages}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      count={count}
    />
  }
/>
```

## Exemple 3 : modale de sélection générique

```tsx
<EntityPickerDialog
  open={show}
  title="Sélectionner une formation"
  searchPlaceholder="Rechercher une formation"
  items={formations}
  loading={loading}
  onSearch={setSearch}
  onSelect={handleSelect}
  renderItem={(item) => (
    <>
      <strong>{item.nom}</strong>
      <span>{item.centre?.nom}</span>
    </>
  )}
/>
```

## Exemple 4 : dashboard standardisé

```tsx
<DashboardGrid spacing={2}>
  <StatCard
    title="Candidats"
    value={128}
    icon={<GroupIcon />}
    progress={72}
    progressLabel="72% de l'objectif"
    colorKey="primary"
  />

  <ChartCard title="Répartition par statut">
    <DashboardPieChart data={pieData} nameKey="name" valueKey="value" />
  </ChartCard>

  <ChartCard title="Évolution mensuelle">
    <DashboardBarChart
      data={barData}
      xKey="month"
      bars={[{ dataKey: "count", colorKey: "primary" }]}
    />
  </ChartCard>
</DashboardGrid>
```

## Exemple 5 : état vide standardisé

```tsx
<EmptyState
  icon={<DescriptionIcon fontSize="large" />}
  title="Aucun contrat pour le moment"
  description="Commence par créer ton premier contrat pour alimenter cette liste."
  actionLabel="Créer mon premier contrat"
  onAction={() => navigate("/contrats/create")}
/>
```

---

## 5. Stratégie de migration sans risque

## Principe directeur

Ne jamais réécrire brutalement une page complète.

Méthode recommandée :

1. introduire une brique générique
2. l'utiliser d'abord comme simple wrapper visuel
3. conserver les props, hooks, handlers et appels API existants
4. migrer page par page
5. comparer avant/après visuellement et fonctionnellement

Le mot-clé est :

- amélioration visuelle par couches

Pas :

- redesign brutal
- suppression de contenu
- simplification fonctionnelle

## Ordre recommandé

### Phase 1. Briques les moins risquées

Créer sans brancher immédiatement partout :

- `ConfirmDialog`
- `FormSectionCard`
- `DetailSection`
- `DetailField`
- `FormActionsBar`
- `ListPaginationBar`
- `SelectionToolbar`
- `ExportDialog`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `StatCard`
- `ChartCard`
- `TableSkeleton`
- `StatCardSkeleton`
- `AppSnackbarProvider`

Pourquoi :

- faible impact métier
- pas de dépendance API
- facilement testables
- impact UX immédiat

### Phase 2. Uniformiser les shells de page

Créer :

- `FormPageShell`
- `EntityListPage`
- `DetailViewLayout`

Migrer d'abord les écrans les plus simples :

- `DocumentsCreatePage`
- `DocumentsEditPage`
- `TypeOffresCreatePage`
- `TypeOffresEditPage`
- `StatutsCreatePage`
- `StatutsEditPage`
- `UsersCreatePage`
- `UsersEditPage`

Pourquoi :

- ces pages ont un flux UI plus simple
- elles permettent de valider les shells sans toucher aux formulaires complexes
- elles permettent aussi de valider le responsive et la modernisation visuelle

Inclure aussi :

- `AppBreadcrumbs`
- active link styling du `Drawer`

### Phase 3. Factoriser les dialogues d'export

Créer :

- `ExportDialog`
- utilitaire commun `downloadExportFile`

Migrer ensuite :

- exports Formations
- Prospections
- Appairages
- Candidats
- Déclic
- Prépa

Important :

- conserver les endpoints actuels
- conserver la logique `selectedIds`
- conserver les paramètres d'URL et filtres actuels

### Phase 4. Factoriser les modales de sélection

Créer :

- `EntityPickerDialog`

Migrer progressivement :

- `CentresSelectModal`
- `UsersSelectModal`
- `FormationSelectModal`
- `PartenairesSelectModal`

Laisser pour plus tard :

- `CandidatsSelectModal`

Pourquoi :

- plus complexe
- mode simple et multiple
- création inline
- filtres plus riches

### Phase 5. Factoriser les modales détail

Créer :

- `DetailViewLayout`
- `DetailSection`
- `DetailField`

Commencer par :

- `EvenementDetailModal`
- `AtelierTREDetailModal`
- `RapportDetailModal`

Puis migrer :

- `PartenaireDetailModal`
- `ProspectionDetailModal`
- `FormationDetailModal`

Attention :

- `FormationDetailModal` et `FormationDetailPage` semblent très proches et peuvent être rationalisés ensemble
- toute action irréversible doit passer par une `Dialog` de confirmation MUI

### Phase 5 bis. Standardiser les dashboards statistiques

Créer :

- `DashboardGrid`
- `StatCard`
- `ChartCard`
- `DashboardBarChart`
- `DashboardPieChart`

Migrer ensuite :

- `pages/DashboardPage.tsx`
- `pages/DashboardCandidatPage.tsx`
- `pages/DashboardPrepaPage.tsx`
- `pages/DashboardDeclicPage.tsx`
- composants sous `pages/widgets/*`

Exigences :

- utiliser `Grid` MUI
- cartes KPI réutilisables
- graphiques `Recharts` harmonisés
- couleurs issues du thème central

### Phase 6. Factoriser les listes

Créer :

- `EntityToolbar`
- `FilterPanelShell`
- `SelectionToolbar`
- `AppDataTable`
- `useListSelection`
- `useFilterPanelState`

Migrer d'abord :

- `TypeOffresPage`
- `EvenementsPage`
- `RapportsPage`

Objectif UX pendant cette phase :

- rendre toutes les barres d'action plus lisibles
- clarifier le responsive des listes
- uniformiser les états vides / loading / erreur

Puis :

- `FormationsPage`
- `PartenairesPage`
- `AppairagesPage`
- `ProspectionPage`
- `CandidatsPage`

### Phase 7. Factoriser les formulaires

Commencer par les formulaires simples :

- `RapportForm`
- `EvenementForm`
- `TypeOffres` si un form dédié est créé
- `Statuts`
- `CentreForm`

Ensuite les formulaires moyens :

- `PartenaireForm`
- `AppairageForm`
- `DeclicForm`
- `ObjectifDeclicForm`
- `ObjectifPrepaForm`

Derniers à migrer :

- `ProspectionForm`
- `CandidatForm`
- `CerfaForm`
- formulaires Prépa avec logique imbriquée

Exigences de refonte pour les formulaires migrés :

- utiliser des `MUI TextField` en variante `outlined`
- regrouper les champs par thématiques dans des `Cards` avec élévation
- utiliser un `Stepper` pour les formulaires longs afin de ne pas surcharger l'écran

Application recommandée du `Stepper` :

- prioritaire pour `CandidatForm`
- pertinent pour `CerfaForm`
- pertinent pour `PrepaForm`, `PrepaFormIC` et `PrepaFormAteliers`
- à évaluer pour `ProspectionForm` selon la lisibilité finale

Application non prioritaire du `Stepper` :

- documents
- rapports simples
- statuts
- types d'offres
- centres

## Fichiers à modifier en priorité

### Base UI

- `components/PageTemplate.tsx`
- `components/ResponsiveTableTemplate.tsx`
- `components/filters/FilterTemplate.tsx`

### Nouveaux composants

- `components/forms/*`
- `components/tables/*`
- `components/ui/*`
- `components/dialogs/*`

### Hooks UI

- `hooks/usePagination.ts`
- nouveau `hooks/ui/useListSelection.ts`
- nouveau `hooks/ui/useFilterPanelState.ts`
- nouveau `hooks/ui/useEntityListPage.ts`

## Règles de migration pour éviter toute casse

### Règle 1

Ne pas toucher au shape des données transmises aux formulaires.

### Règle 2

Ne pas déplacer la logique de soumission API dans les composants UI génériques.

Les composants génériques doivent recevoir :

- `values`
- `errors`
- `loading`
- `onChange`
- `onSubmit`

Mais ne jamais connaître :

- les endpoints
- les transformations métier
- les permissions métier

### Règle 2 bis

Ne jamais profiter d'une refactorisation UI pour supprimer un champ, une colonne, une action ou une section.

La règle est :

- même périmètre visible
- meilleure présentation

### Règle 3

Conserver les handlers existants au début.

Exemple :

- garder `handleSubmit` dans `ProspectionForm`
- remplacer uniquement la structure visuelle interne par des composants communs

### Règle 4

Créer des composants adaptateurs avant de fusionner.

Exemple :

- `ProspectionPartnerPickerField`
- `FormationPickerField`

Puis seulement après, remonter vers un `EntityPickerField` totalement générique si les usages convergent vraiment.

### Règle 5

Tester chaque migration sur 4 états minimum :

- loading
- données normales
- erreur
- état vide

Et sur 3 tailles d'écran minimum :

- mobile
- tablette
- desktop

Pour les formulaires migrés, vérifier aussi :

- lisibilité des champs `outlined`
- cohérence des sections en `Card`
- fluidité du parcours par étapes si `Stepper`
- conservation intégrale des données entre étapes

Pour les listes et dashboards, vérifier aussi :

- affichage correct des `EmptyState`
- affichage correct des `Skeleton`
- affichage correct des notifications de succès/erreur
- breadcrumbs cohérents
- page active clairement visible dans le `Drawer`

### Règle 6

Pour les pages listes, comparer systématiquement :

- pagination
- sélection multiple
- archivage
- filtres
- export
- navigation ligne
- rendu mobile
- clarté visuelle des actions
- lisibilité des filtres
- comportement du mode sticky de l'en-tête et de la première colonne
- présence de toutes les colonnes métier visibles avant refactor

### Règle 7

Toute amélioration visuelle doit rester découplée du métier.

Donc :

- les changements de style vont dans les composants centraux
- les règles métier restent dans les pages, hooks et formulaires métier

### Règle 8

Améliorer sans surprendre l'utilisateur.

Cela implique :

- garder les emplacements logiques des actions
- conserver les labels métier
- éviter les changements brusques de navigation
- améliorer progressivement les composants existants

### Règle 8 bis

Tout écran refactorisé doit être comparé à l'écran précédent avec cette question simple :

- est-ce qu'une information, un champ, une colonne ou une action visible avant a disparu ?

Si la réponse est oui :

- la refactorisation n'est pas acceptable en l'état

### Règle 9

Toute action irréversible doit passer par une confirmation explicite.

Exemples :

- suppression d'un candidat
- suppression d'un contrat
- toute suppression définitive

### Règle 10

Chaque intervention doit rester limitée au périmètre demandé.

Interdit pendant une migration UI :

- refactor métier opportuniste
- renommage massif non nécessaire
- déplacement large de fichiers sans valeur immédiate
- fusion de responsabilités non demandée
- changement de type ou de contrat de données
- nettoyage arbitraire de code métier existant

Objectif :

- éviter le syndrome "j'en profite pour refaire autre chose"
- garder des migrations lisibles, testables et sûres

## Stratégie de validation de migration

Pour chaque composant central ou page migrée, vérifier :

- rendu visuel avant/après
- comportement fonctionnel inchangé
- compatibilité mobile / tablette / desktop
- conservation des handlers existants
- conservation des données soumises
- conservation des query params
- conservation des permissions visibles
- conservation des exports et sélections

## Checklist standard de migration d'une page

- mêmes champs affichés
- mêmes valeurs initiales
- mêmes validations
- mêmes erreurs backend affichées
- même payload envoyé
- mêmes actions disponibles
- même navigation
- même comportement loading / error / empty
- responsive validé
- aucun contenu visible supprimé

## Définition de terminé pour une migration

Une page ou un composant est considéré comme correctement migré uniquement si :

- aucune donnée visible avant migration n'a disparu
- aucun champ métier n'a disparu
- aucune action utilisateur n'a disparu
- aucun endpoint / API n'a été modifié
- le comportement fonctionnel reste identique
- le responsive mobile / tablette / desktop est validé
- les états `loading / error / empty` sont couverts
- les composants génériques restent sans logique métier spécifique
- la page migrée dépend bien des nouveaux composants centraux prévus

---

## 6. Endroits sensibles et risques

## Risques élevés

### 1. `CandidatForm`

Pourquoi sensible :

- très volumineux
- plusieurs sections déjà découplées
- logique riche de permissions
- modales liées
- gestion manuelle de l'état avec `ref`

Risque :

- régression sur des champs métier nombreux
- perte de synchro entre sections
- perte d'état ou de validation si le `Stepper` est mal branché

### 2. `CerfaForm`

Pourquoi sensible :

- très métier
- beaucoup de champs réglementaires
- risques de mapping silencieux
- risque élevé si le découpage par étapes est mal conçu

### 3. `ProspectionForm`

Pourquoi sensible :

- logique métier embarquée
- interactions entre `statut`, `relance_prevue`, owner candidat
- modales partenaire / formation / candidat
- éditeur riche
- attention à la réorganisation visuelle en cards ou en étapes

### 4. Pages listes complexes

Particulièrement :

- `candidatsPage.tsx`
- `ProspectionPage.tsx`
- `PartenairesPage.tsx`
- `FormationsPage.tsx`

Pourquoi sensibles :

- archivage
- sélection multiple
- export
- filtres avancés
- variations selon rôle

### 5. `CandidatsSelectModal`

Pourquoi sensible :

- sélection simple et multiple
- filtrage avancé
- création potentielle inline
- logique de normalisation plus lourde que les autres pickers

## Risques moyens

### Layouts

Les 4 layouts peuvent être unifiés, mais trop tôt cela peut casser :

- navigation
- responsive
- rôle utilisateur
- breadcrumbs

De plus, une modernisation visuelle trop rapide du shell global pourrait donner l'impression d'un changement fonctionnel alors que ce n'est pas le cas.

### Exports

La factorisation est rentable, mais il faut préserver :

- endpoint exact
- méthode GET ou POST selon cas
- paramètres d'URL
- nom de fichier

## Dépendances fortes à respecter

- hooks métier actuels
- types métier dans `src/types/*`
- comportements conditionnés par rôle
- flux routeur et query params
- états locaux persistés en `localStorage`

---

## 7. Priorisation concrète par gains

## Gain fort / risque faible

- `ConfirmDialog`
- `ExportDialog`
- `DetailField`
- `DetailSection`
- `FormSectionCard`
- `FormActionsBar`
- `SelectionToolbar`
- `ListPaginationBar`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- amélioration de `PageHeader`
- amélioration responsive de `PageTemplate`
- `StatCard`
- `ChartCard`
- `AppSnackbarProvider`
- `TableSkeleton`
- `StatCardSkeleton`
- `AppBreadcrumbs`

## Gain fort / risque moyen

- `EntityPickerDialog`
- `EntityListPage`
- `EntityToolbar`
- `AppDataTable`
- `FormStepper`
- migration des formulaires vers `outlined + cards`
- adaptateurs métier bien séparés des composants UI

## Gain fort / risque élevé

- `GenericEntityForm`
- unification forte des formulaires complexes
- fusion complète des layouts principaux

---

## 8. Bonus

## A. Proposition de composant `GenericForm`

À réserver aux entités simples.

### Signature cible

```tsx
type GenericFormField = {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "checkbox";
  required?: boolean;
  options?: Array<{ value: string | number; label: string }>;
  grid?: { xs?: number; sm?: number; md?: number };
};
```

Usage cible :

```tsx
<GenericEntityForm
  values={values}
  errors={errors}
  fields={fields}
  onChange={handleChange}
  onSubmit={handleSubmit}
/>
```

Entités candidates :

- Statuts
- TypesOffres
- Centres

## B. Proposition de composant `GenericTable`

### Signature cible

```tsx
<AppDataTable
  columns={columns}
  rows={rows}
  getRowId={(row) => row.id}
  loading={loading}
  selection={{ selectedIds, onToggle }}
  onRowClick={handleRowClick}
/>
```

Très adapté pour :

- type offres
- users
- rapports
- événements
- objectifs Déclic / Prépa

À condition d'intégrer nativement :

- un bon rendu mobile
- une barre d'actions claire
- une densité visuelle agréable

## C. Exemple conceptuel de layout page standardisé

`StandardCrudPage` est ici un exemple conceptuel pour illustrer l'assemblage cible.

Ce n'est pas forcément un composant supplémentaire à implémenter tel quel si `CrudPageLayout` et `EntityListPage` couvrent déjà correctement le besoin.

### Exemple `StandardCrudPage`

```tsx
<StandardCrudPage
  title="Partenaires"
  toolbar={<EntityToolbar ... />}
  filters={<FilterPanelShell ... />}
  content={<AppDataTable ... />}
  footer={<ListPaginationBar ... />}
/>
```

Ce layout permettrait à terme de modifier l'UI globale depuis quelques composants centraux seulement :

- `PageHeader`
- `SectionCard`
- `AppButton`
- `AppDataTable`
- `FilterPanelShell`
- `FormSectionCard`
- `ConfirmDialog`

---

## 9. Recommandation finale

La meilleure trajectoire n'est pas une "refonte" mais une extraction progressive des briques transverses déjà visibles dans le code.

### Ordre recommandé final

1. standardiser `dialogs + actions + sections + champs détail`
2. standardiser `pagination + sélection + toolbar + filtres`
3. standardiser les `pages CRUD` simples
4. factoriser les `exports`
5. factoriser les `pickers`
6. factoriser les `detail modals`
7. seulement ensuite factoriser les formulaires métier complexes

En parallèle, à chaque étape :

- améliorer le responsive
- moderniser légèrement les composants centraux
- renforcer la cohérence visuelle
- améliorer le confort d'usage

### Résultat visé

À terme, pour modifier l'UI globale de l'application, il deviendrait possible d'intervenir principalement sur :

- `components/layout/PageHeader.tsx`
- `components/forms/FormSectionCard.tsx`
- `components/tables/AppDataTable.tsx`
- `components/filters/FilterPanelShell.tsx`
- `components/ui/AppButton.tsx`
- `components/ui/ConfirmDialog.tsx`
- `components/dialogs/EntityPickerDialog.tsx`

Sans toucher aux champs métier, aux hooks métier, aux endpoints ni aux flux de données.

Et avec un bénéfice direct :

- une application plus moderne
- une interface plus responsive
- une expérience utilisateur plus friendly
- un rendu plus agréable visuellement
- une maintenance UI beaucoup plus rapide

---

## 10. Matrice de migration concrète

## Lecture de la matrice

- `Composant cible` : composant générique à créer ou renforcer
- `Pages à migrer` : écrans précis à brancher dessus
- `Risque` : faible, moyen ou élevé
- `Gain UX` : faible, moyen, fort ou très fort
- `Impact global` : indique si modifier ce composant changera ensuite plusieurs pages d'un coup

## Matrice prioritaire

| Composant cible | Pages à migrer en priorité | Risque | Gain UX | Impact global |
|---|---|---:|---:|---|
| `PageHeader` | `pages/formations/FormationsPage.tsx`, `pages/prospection/ProspectionPage.tsx`, `pages/partenaires/PartenairesPage.tsx`, `pages/appairage/AppairagesPage.tsx`, `pages/candidats/candidatsPage.tsx`, `pages/Documents/DocumentsPage.tsx`, `pages/evenements/EvenementsPage.tsx`, `pages/ateliers/AteliersTrePage.tsx` | Faible | Fort | Très fort |
| `FormPageShell` | `pages/Documents/DocumentsCreatePage.tsx`, `pages/Documents/DocumentsEditPage.tsx`, `pages/typeOffres/TypeOffresCreatePage.tsx`, `pages/typeOffres/TypeOffresEditPage.tsx`, `pages/statuts/StatutsCreatePage.tsx`, `pages/statuts/StatutsEditPage.tsx`, `pages/users/UsersCreatePage.tsx`, `pages/users/UsersEditPage.tsx` | Faible | Fort | Fort |
| `FormSectionCard` | `pages/formations/FormationForm.tsx`, `pages/prospection/ProspectionForm.tsx`, `pages/partenaires/PartenaireForm.tsx`, `pages/partenaires/PartenaireCandidatForm.tsx`, `pages/prepa/PrepaForm.tsx`, `pages/declic/DeclicForm.tsx`, `pages/evenements/EvenementForm.tsx`, `pages/rapports/RapportForm.tsx` | Moyen | Très fort | Très fort |
| `FormActionsBar` | tous les formulaires create/edit ci-dessus | Faible | Fort | Fort |
| `AppTextField / AppSelectField / AppDateField / AppCheckboxField / AppNumberField` | `pages/formations/FormationForm.tsx`, `pages/partenaires/PartenaireForm.tsx`, `pages/partenaires/PartenaireCandidatForm.tsx`, `pages/evenements/EvenementForm.tsx`, `pages/rapports/RapportForm.tsx`, puis `pages/prospection/ProspectionForm.tsx` | Moyen | Très fort | Très fort |
| `FormStepper` | `pages/candidats/CandidatForm.tsx`, `pages/cerfa/CerfaForm.tsx`, `pages/prepa/PrepaForm.tsx`, `pages/prepa/PrepaFormIC.tsx`, `pages/prepa/PrepaFormAteliers.tsx`, éventuellement `pages/prospection/ProspectionForm.tsx` | Élevé | Très fort | Fort |
| `EntityToolbar` | `pages/formations/FormationsPage.tsx`, `pages/prospection/ProspectionPage.tsx`, `pages/partenaires/PartenairesPage.tsx`, `pages/appairage/AppairagesPage.tsx`, `pages/candidats/candidatsPage.tsx`, `pages/Documents/DocumentsPage.tsx`, `pages/cvtheque/cvthequePage.tsx`, `pages/cvtheque/cvthequeCandidatPage.tsx` | Moyen | Très fort | Très fort |
| `FilterPanelShell` | `pages/formations/FormationsPage.tsx`, `pages/prospection/ProspectionPage.tsx`, `pages/partenaires/PartenairesPage.tsx`, `pages/appairage/AppairagesPage.tsx`, `pages/candidats/candidatsPage.tsx`, `pages/Documents/DocumentsPage.tsx`, `pages/ateliers/AteliersTrePage.tsx`, `pages/prepa/PrepaPagesAteliers.tsx` | Faible | Fort | Très fort |
| `SelectionToolbar` | `pages/formations/FormationsPage.tsx`, `pages/partenaires/PartenairesPage.tsx`, `pages/appairage/AppairagesPage.tsx`, `pages/candidats/candidatsPage.tsx`, `pages/typeOffres/TypeOffresPage.tsx`, `pages/ateliers/AteliersTrePage.tsx` | Faible | Fort | Fort |
| `ListPaginationBar` | `pages/formations/FormationsPage.tsx`, `pages/prospection/ProspectionPage.tsx`, `pages/partenaires/PartenairesPage.tsx`, `pages/appairage/AppairagesPage.tsx`, `pages/candidats/candidatsPage.tsx`, `pages/Documents/DocumentsPage.tsx`, `pages/evenements/EvenementsPage.tsx`, `pages/rapports/RapportsPage.tsx`, `pages/typeOffres/TypeOffresPage.tsx` | Faible | Fort | Très fort |
| `AppDataTable` | `pages/formations/FormationTable.tsx`, `pages/prospection/ProspectionTable.tsx`, `pages/partenaires/PartenaireTable.tsx`, `pages/candidats/CandidatsTable.tsx`, `pages/evenements/EvenementTable.tsx`, `pages/rapports/RapportTable.tsx`, `pages/Documents/DocumentsTable.tsx`, `pages/typeOffres/TypeOffresPage.tsx` | Moyen | Très fort | Très fort |
| `DetailSection + DetailField` | `pages/prospection/ProspectionDetailModal.tsx`, `pages/formations/FormationDetailModal.tsx`, `pages/formations/FormationDetailPage.tsx`, `pages/partenaires/PartenaireDetailModal.tsx`, `pages/partenaires/PartenaireCandidatDetailModal.tsx`, `pages/ateliers/AtelierTREDetailModal.tsx`, `pages/evenements/EvenementDetailModal.tsx`, `pages/rapports/RapportDetailModal.tsx` | Faible | Très fort | Très fort |
| `DetailViewLayout` | mêmes pages détail que ci-dessus | Moyen | Fort | Fort |
| `ConfirmDialog` | `pages/formations/FormationsPage.tsx`, `pages/prospection/ProspectionPage.tsx`, `pages/partenaires/PartenairesPage.tsx`, `pages/appairage/AppairagesPage.tsx`, `pages/candidats/candidatsPage.tsx`, `pages/typeOffres/TypeOffresPage.tsx`, `pages/Documents/DocumentsPage.tsx` | Faible | Moyen | Fort |
| `ExportDialog` + utilitaires export communs | `components/export_buttons/ExportButtonFormation.tsx`, `components/export_buttons/ExportButtonProspection.tsx`, `components/export_buttons/ExportButtonAppairage.tsx`, `components/export_buttons/ExportButtonCandidat.tsx`, `components/export_buttons/ExportButtonCommentaires.tsx`, `components/export_buttons/ExportButtonDeclic.tsx`, `components/export_buttons/ExportButtonPrepa.tsx`, `components/export_buttons/ExportButtonPartenaires.tsx` | Moyen | Fort | Très fort |
| `EntityPickerDialog` | `components/modals/CentresSelectModal.tsx`, `components/modals/UsersSelectModal.tsx`, `components/modals/FormationSelectModal.tsx`, `components/modals/PartenairesSelectModal.tsx`, puis `components/modals/ProspectionSelectModal.tsx`, `components/modals/CerfaSelectModal.tsx` | Moyen | Très fort | Très fort |
| `EntityPickerField` | `pages/prospection/ProspectionForm.tsx`, `pages/candidats/CandidatForm.tsx`, `pages/appairage/AppairageForm.tsx`, `pages/prepa/StagiairesPrepaForm.tsx` | Moyen | Fort | Fort |
| `EmptyState / LoadingState / ErrorState` | `pages/Documents/DocumentsEditPage.tsx`, `pages/formations/FormationsEditPage.tsx`, `pages/prospection/ProspectionEditPage.tsx`, `pages/partenaires/PartenairesEditPage.tsx`, `pages/declic/DeclicEditPage.tsx`, `pages/prepa/ObjectifPrepaEditPage.tsx`, `pages/declic/ObjectifDeclicEditPage.tsx` | Faible | Fort | Fort |
| `EmptyState` illustré avec CTA contextualisé | `pages/formations/FormationsPage.tsx`, `pages/prospection/ProspectionPage.tsx`, `pages/partenaires/PartenairesPage.tsx`, `pages/appairage/AppairagesPage.tsx`, `pages/Documents/DocumentsPage.tsx`, `pages/candidats/candidatsPage.tsx`, `pages/evenements/EvenementsPage.tsx` | Faible | Très fort | Fort |
| `AppSnackbarProvider` | provider global + toutes les pages create/edit/delete utilisant aujourd'hui `toast` ou équivalent | Moyen | Très fort | Très fort |
| `TableSkeleton + StatCardSkeleton` | pages listes, dashboards et composants `pages/widgets/*` | Faible | Fort | Très fort |
| `AppBreadcrumbs + Active Link styling` | `layout/MainLayout.tsx`, `layout/MainLayoutCandidat.tsx`, `layout/MainLayoutPrepa.tsx`, `layout/MainLayoutDeclic.tsx`, plus toutes les pages affichant un header | Moyen | Fort | Très fort |
| `StatCard + ChartCard + DashboardBarChart + DashboardPieChart + DashboardGrid` | `pages/DashboardPage.tsx`, `pages/DashboardCandidatPage.tsx`, `pages/DashboardPrepaPage.tsx`, `pages/DashboardDeclicPage.tsx`, `pages/widgets/**/*` | Moyen | Très fort | Très fort |
| `AppShell` | `layout/MainLayout.tsx`, `layout/MainLayoutCandidat.tsx`, `layout/MainLayoutPrepa.tsx`, `layout/MainLayoutDeclic.tsx` | Élevé | Très fort | Très fort |

## Matrice secondaire

| Composant cible | Pages à migrer ensuite | Risque | Gain UX | Impact global |
|---|---|---:|---:|---|
| `GenericEntityForm` | `pages/centres/CentreForm.tsx`, futurs formulaires simples `statuts` / `typeOffres`, éventuellement `pages/rapports/RapportForm.tsx` | Moyen | Moyen | Fort |
| `InlineStatusBadge` | `pages/formations/FormationTable.tsx`, `pages/prospection/ProspectionTable.tsx`, `pages/partenaires/PartenaireTable.tsx`, `pages/candidats/CandidatsTable.tsx`, `pages/evenements/EvenementTable.tsx`, `pages/Documents/DocumentsTable.tsx` | Faible | Fort | Très fort |
| `SectionCard` | dashboards, pages de synthèse, détails métier hors formulaires | Faible | Moyen | Fort |
| `CrudPageLayout` | tous les écrans list/create/edit/detail une fois les premiers composants en place | Moyen | Très fort | Très fort |

## Matrice des zones sensibles à migrer en dernier

| Zone sensible | Fichiers | Pourquoi en dernier | Risque | Gain UX |
|---|---|---|---:|---:|
| `CandidatForm` | `pages/candidats/CandidatForm.tsx`, `pages/candidats/FormSections/*` | très gros formulaire, logique riche, permissions et sections nombreuses | Élevé | Très fort |
| `CerfaForm` | `pages/cerfa/CerfaForm.tsx` | forte densité métier et réglementaire | Élevé | Fort |
| `ProspectionForm` | `pages/prospection/ProspectionForm.tsx` | logique de statut, relance, owner, pickers multiples, éditeur riche | Élevé | Très fort |
| `CandidatsSelectModal` | `components/modals/CandidatsSelectModal.tsx` | sélection multiple, normalisation riche, création inline | Élevé | Fort |
| layouts globaux | `layout/MainLayout*.tsx` | impact navigation, responsive, perception globale | Élevé | Très fort |

## Ordre d'exécution concret recommandé

**Note (avril 2026)** : la numérotation des « lots » dans cette section est la **vision cible** historique du document ; elle ne correspond pas mot pour mot aux **Lots 0–10** de [`UI_refactor_execution_plan.md`](UI_refactor_execution_plan.md). Pour l’état réel : section **« État d'avancement (avril 2026) »** ci-dessus et **§ 1.b** du plan d’exécution. En résumé : `ConfirmDialog`, `EmptyState` / `LoadingState` / `ErrorState`, squelettes, `PageTemplate` / `PageWrapper` (migration large), `AppBreadcrumbs`, styles de navigation et `theme.ts` sont **en place** ; les composants **non** introduits à ce jour incluent notamment `PageHeader`, `FormPageShell`, `FilterPanelShell`, `EntityToolbar`, `DetailSection` / `DetailField`, `DashboardGrid`, `AppTextField`, `AppDataTable`, `CrudPageLayout`, `AppShell`, etc.

### Lot 1

- `PageHeader`
- `FormPageShell`
- `FormActionsBar`
- `ConfirmDialog`
- `EmptyState / LoadingState / ErrorState`
- `AppSnackbarProvider`
- `TableSkeleton`
- `StatCardSkeleton`
- `AppBreadcrumbs`
- active link styling du `Drawer`

### Lot 2

- `FilterPanelShell`
- `EntityToolbar`
- `SelectionToolbar`
- `ListPaginationBar`
- amélioration de `PageTemplate`

### Lot 3

- `DetailSection`
- `DetailField`
- `DetailViewLayout`

### Lot 3 bis

- `DashboardGrid`
- `StatCard`
- `ChartCard`
- `DashboardBarChart`
- `DashboardPieChart`
- harmonisation des couleurs de graphiques avec le thème central

### Lot 4

- `ExportDialog`
- utilitaires export communs

### Lot 5

- `AppTextField`
- `AppSelectField`
- `AppDateField`
- `AppCheckboxField`
- `FormSectionCard`
- normalisation visuelle en `outlined`
- sections thématiques en `Card` avec élévation

### Lot 6

- `EntityPickerDialog`
- `EntityPickerField`

### Lot 7

- `AppDataTable`
- `InlineStatusBadge`

### Lot 8

- `CrudPageLayout`
- `AppShell`

### Lot 9

- migration progressive des formulaires complexes :
  - `ProspectionForm`
  - `CandidatForm`
  - `CerfaForm`

Avec, quand pertinent :

- découpage par étapes via `FormStepper`
- conservation stricte de l'état et des validations

## Effet attendu après migration

Quand cette matrice aura été réellement appliquée, les changements visuels globaux pourront être faits en intervenant surtout sur les composants centraux.

Exemples :

- modifier `PageHeader` changera l'apparence de nombreuses pages listes et formulaires
- modifier `FormSectionCard` changera la majorité des formulaires
- modifier les champs partagés `outlined` changera visuellement la majorité des formulaires migrés
- modifier `FormStepper` changera l'expérience des formulaires longs migrés
- modifier `AppDataTable` changera plusieurs listes métier
- modifier `AppDataTable` permettra aussi de faire évoluer globalement le comportement sticky de l'en-tête et de la première colonne
- modifier `DetailSection` et `DetailField` changera plusieurs modales détail
- modifier `EntityToolbar` changera plusieurs pages de listing
- modifier `ExportDialog` changera tous les exports
- modifier `StatCard` changera tous les KPI dashboards migrés
- modifier `DashboardBarChart` et `DashboardPieChart` changera tous les graphiques migrés
- modifier `EmptyState` changera l'expérience des états vides sur plusieurs listes
- modifier `AppSnackbarProvider` changera tous les messages de succès/erreur
- modifier `AppBreadcrumbs` et l'active link styling changera la perception globale de navigation

## Important : réponse réaliste à l'objectif final

Oui, mais seulement après migration effective des pages vers ces composants centraux.

Autrement dit :

- tant qu'une page garde son implémentation locale, modifier le composant central ne changera pas cette page
- une fois qu'une page est branchée sur le composant mutualisé, toute amélioration du composant bénéficiera à cette page

Donc l'objectif réaliste est :

1. créer les bons composants centraux
2. migrer progressivement les pages vers eux
3. ensuite, oui, modifier quelques composants suffira pour faire évoluer une grande partie de l'UI

## Vision cible

À la fin de la migration, les modifications globales se feront principalement dans :

- `components/layout/PageHeader.tsx`
- `components/forms/FormSectionCard.tsx`
- `components/forms/fields/*`
- `components/forms/FormStepper.tsx`
- `components/tables/AppDataTable.tsx`
- `components/filters/EntityToolbar.tsx`
- `components/filters/FilterPanelShell.tsx`
- `components/ui/AppButton.tsx`
- `components/ui/ConfirmDialog.tsx`
- `components/ui/DetailField.tsx`
- `components/ui/DetailSection.tsx`
- `components/dialogs/EntityPickerDialog.tsx`
- `components/ui/ExportDialog.tsx`
- `components/dashboard/StatCard.tsx`
- `components/dashboard/DashboardBarChart.tsx`
- `components/dashboard/DashboardPieChart.tsx`
- `components/dashboard/ChartCard.tsx`
- `components/ui/EmptyState.tsx`
- `components/ui/AppSnackbarProvider.tsx`
- `components/ui/TableSkeleton.tsx`
- `components/ui/StatCardSkeleton.tsx`
- `components/ui/AppBreadcrumbs.tsx`
