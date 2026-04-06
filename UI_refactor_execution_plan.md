# UI Refactor Execution Plan

## 1. Resume executif

L'objectif n'est pas de refaire le frontend.

L'objectif est de faire evoluer le frontend actuel, progressivement, sans perte fonctionnelle, en s'appuyant d'abord sur les abstractions deja presentes dans le code.

Strategie retenue :

- migration incrementale
- aucun rewrite global
- aucune suppression de contenu visible
- aucune modification des flux API
- aucune logique metier deplacee dans les composants UI
- validation lot par lot avant de continuer

Strategie de base confirmee apres comparaison avec le code existant :

1. partir de l'existant au lieu de creer une deuxieme couche parallele
2. faire evoluer d'abord les composants transverses deja utilises
3. isoler les zones vraiment peu risquees avant les zones mixtes
4. ne centraliser listes et tables qu'apres stabilisation des patterns actuels
5. garder les formulaires simples avant les formulaires sensibles
6. garder les zones complexes et metier-riches pour la fin

Resultat vise :

- une UI plus moderne, plus responsive et plus coherente
- une base de composants centraux fiables
- une migration page par page sans rupture
- aucune concurrence durable entre anciens patterns et nouveaux patterns

---

## 1.b Etat d'avancement

Derniere mise a jour : 2026-04-05 (verification code alignee sur cette date).

### Verification independante (code actuel)

Cette section a ete confrontee au depot : `frontend_rap_app/src`.

| Affirmation du plan | Verif code |
|---------------------|------------|
| 6 fichiers `components/ui/*` (Lot 1) | OK — tous presents |
| `theme.ts` avec `tertiary` / `neutral` / `gradients` | OK |
| `AppBreadcrumbs` + `navigationStyles` dans les 4 layouts | OK |
| `useMemo` dans `useSidebarItems` + garde `setSubmenuOpen` | OK |
| Pas de `DetailSection` / `DetailField` / `DetailViewLayout` | OK — aucune occurrence dans `src` |
| Pas de `DashboardGrid` / `EntityToolbar` dedies (Lots 5–6) | OK — fichiers absents |
| **Adoption Lot 1 sur les pages** | **Partielle au sens strict** : `LoadingState` / `ErrorState` utilises dans **2** pages (`DocumentsEditPage`, `TypeOffresCreatePage`). `EmptyState`, `ConfirmDialog`, `TableSkeleton`, `StatCardSkeleton` **ne sont importes nulle part** hors de leur propre fichier (a brancher ou usage futur) |
| **Pages avec `PageTemplate` / `PageWrapper`** | **96** fichiers `.tsx` sous `pages/` les importent (sur **225** fichiers `.tsx` dans `pages/`). L’ecart correspond surtout aux **composants** (tables, modales, formulaires, widgets), pas aux ecrans route. **Ecrans route sans** ce shell (hors composants) : `About`, `auth/LoginPage`, `auth/RegisterPage`, `ForbiddenPage`, `NotFoundPage`, `PolitiqueConfidentialite`, `centres/CentreDetailPage`, `cvtheque/cvthequeEditPage`, `cvtheque/cvthequeCandidatEditPage`, `users/MonProfil` — souvent volontaire (auth / pages statiques / profil) ou reste a aligner |

La formule « la majorite des ecrans sous `pages/` » reste **acceptable** pour les **pages metier liste / formulaire / dashboard** referencees dans les routes principales ; elle ne s’applique pas a l’ensemble des 225 fichiers (beaucoup sont des sous-composants).

### Lots formalises (plan sections 5.x)

| Lot | Statut |
|-----|--------|
| `Lot 0` | Termine |
| `Lot 1` | Termine |
| `Lot 2` | Termine (voir extension ci-dessous) |
| `Lot 3` | Termine (voir correctif stabilite ci-dessous) |
| `Lot 4` | Non demarre — pas de `DetailSection` / `DetailField` / `DetailViewLayout` dans `components/` |
| `Lots 5` a `10` | Non demarres |

### Elements livres dans le `Lot 1`

- `frontend_rap_app/src/components/ui/ConfirmDialog.tsx`
- `frontend_rap_app/src/components/ui/EmptyState.tsx`
- `frontend_rap_app/src/components/ui/LoadingState.tsx`
- `frontend_rap_app/src/components/ui/ErrorState.tsx`
- `frontend_rap_app/src/components/ui/TableSkeleton.tsx`
- `frontend_rap_app/src/components/ui/StatCardSkeleton.tsx`

Verification : lint cible des nouveaux fichiers OK. **Adoption dans l’app** : au 2026-04-05, seuls `LoadingState` et `ErrorState` sont branches sur des pages (voir tableau « Verification independante »). `EmptyState`, `ConfirmDialog`, `TableSkeleton`, `StatCardSkeleton` sont livres mais **non utilises** hors de leur module.

### Elements livres dans le `Lot 2` (shell de page)

- Evolution de [`frontend_rap_app/src/components/PageTemplate.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageTemplate.tsx)
- Evolution de [`frontend_rap_app/src/components/PageWrapper.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageWrapper.tsx)
- Pages pilotes initiales : `Documents` (create/edit), `TypeOffres` (create/edit)

**Extension realisee apres les pilotes** — la majorite des ecrans sous `frontend_rap_app/src/pages/` utilisent desormais `PageTemplate` et/ou `PageWrapper` (listes, creation, edition, dashboards `DashboardPage` / `DashboardCandidatPage` / `DashboardPrepaPage` / `DashboardDeclicPage`, `HomePage`, et modules parmi : Cerfa, Appairages et commentaires d'appairage, Candidats, Prospection staff et candidat, Partenaires et variantes candidat, Prospection comments, Commentaires, CVThèque staff et candidat, Declic objectifs / pages / participants, Prepa objectifs / pages IC / ateliers / stagiaires, Ateliers TRE, Formations, Rapports, Evenements, Utilisateurs, Statuts, Centres, Parametres, Users, etc.). Les fichiers exacts sont identifiables par import de `PageTemplate` ou `PageWrapper` dans chaque page.

Verification : lint cible du shell et des pages migrees OK.

### Elements livres dans le `Lot 3` (navigation / layouts)

- [`frontend_rap_app/src/components/layout/AppBreadcrumbs.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/layout/AppBreadcrumbs.tsx)
- [`frontend_rap_app/src/layout/navigationStyles.ts`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/navigationStyles.ts)
- Harmonisation de `MainLayout.tsx`, `MainLayoutCandidat.tsx`, `MainLayoutPrepa.tsx`, `MainLayoutDeclic.tsx`

**Correctif stabilite (post Lot 3)** — eviter `Maximum update depth exceeded` sur le menu :

- [`frontend_rap_app/src/layout/SidebarItems.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/SidebarItems.tsx) : resultat de `useSidebarItems()` memoise avec `useMemo` (reference stable si le role ne change pas)
- [`frontend_rap_app/src/layout/MainLayout.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayout.tsx) : `setSubmenuOpen` ne met a jour que si l'etat derive change reellement

Verification : lint cible des layouts OK.

### Theme global

- [`frontend_rap_app/src/theme.ts`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/theme.ts) : palette MUI etendue (`tertiary`, `neutral`, `gradients`), composants par defaut, ombres, breakpoints — fichier central pour la coherence visuelle actuelle.

### Prochaine etape recommandee

- Demarrer `Lot 4` (details simples, `DetailSection` / `DetailField`, pilote modale evenement) **ou** poursuivre l'adoption de `EmptyState` / `LoadingState` / `ErrorState` sur les listes restantes avant d'introduire les briques detail.

---

## 2. Constats sur le code existant

Le plan a ete compare au frontend reel dans `frontend_rap_app/src`.

Constats structurants :

- un shell de page central existe deja via `PageTemplate`
- un wrapper de page existe deja via `PageWrapper`
- une base de filtres mutualisee existe deja via `FilterTemplate`
- une base de table responsive existe deja via `ResponsiveTableTemplate`
- les notifications globales passent deja par `react-toastify` dans `main.tsx`
- les breadcrumbs existent deja dans plusieurs layouts
- les layouts staff, candidat, prepa et declic ont deja des comportements differents

Conclusion :

- il faut faire evoluer les abstractions existantes avant d'en introduire de nouvelles
- il faut eviter de lancer en parallele une deuxieme famille de shells, tables ou filtres
- certains pilotes prevus dans le plan initial etaient plus complexes que leur niveau de risque annonce

---

## 3. Hypotheses et prerequis

## Hypotheses

- le frontend actuel dans `frontend_rap_app/src` reste la source de verite fonctionnelle
- le document [`UI_refactor.md`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/UI_refactor.md) sert de reference d'architecture, mais le code reel prime en cas d'ecart
- les routes, permissions, query params, exports et contrats API actuels doivent rester strictement identiques
- les pages existantes doivent pouvoir coexister avec les nouveaux composants pendant toute la migration
- les abstractions existantes doivent etre consolidees avant creation de nouvelles couches equivalentes

## Prerequis techniques

- theme central deja present dans [`theme.ts`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/theme.ts)
- providers globaux deja en place dans [`main.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/main.tsx)
- layouts et routing deja existants dans [`AppRoute.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/routes/AppRoute.tsx)
- shell de page existant dans [`PageTemplate.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageTemplate.tsx)
- patterns de filtres existants dans [`FilterTemplate.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/filters/FilterTemplate.tsx)
- patterns de table existants dans [`ResponsiveTableTemplate.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ResponsiveTableTemplate.tsx)

## Prerequis organisationnels

- chaque lot doit rester petit et verifiable
- aucune intervention hors perimetre du lot
- comparaison avant/apres obligatoire sur les pages migrees
- si un lot supprime une information visible, le lot est invalide
- le worktree n'est pas propre, donc chaque lot doit limiter sa surface de conflit

---

## 4. Regles de migration

Regles de base :

- faire evoluer l'existant avant de creer un remplacement
- pas de nouvelle abstraction tant que la precedente n'est pas stabilisee
- pas de fusion entre refacto UI et refacto metier
- pas de changement de payload, de route, de parametre de recherche ou d'endpoint
- pas de suppression d'actions visibles
- pas de suppression de colonnes visibles
- pas de suppression de champs visibles

Definition de termine pour un lot :

- meme contenu visible qu'avant
- memes actions disponibles qu'avant
- memes comportements de navigation qu'avant
- memes donnees chargees qu'avant
- responsive valide
- coexistence valide avec les pages non migrees

---

## 5. Plan d'execution detaille par lots

## Lot 0. Preparation et cadrage de securite

### Objectif

Poser les garde-fous d'execution avant toute migration UI.

### Fichiers a creer / modifier

- [`UI_refactor_execution_plan.md`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/UI_refactor_execution_plan.md)

### Criteres d'acceptation

- perimetre et ordre de migration figes
- ecarts entre plan initial et code reel explicites
- definition de termine explicite

### Tests minimaux

- validation documentaire interne

### Condition pour passer au lot suivant

- accord explicite sur le plan d'execution

---

## Lot 1. Fondations UI de coexistence

### Objectif

Introduire les briques presentatives les plus sures, sans remplacer les systemes globaux existants.

### Composants concernes

- `ConfirmDialog`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `TableSkeleton`
- `StatCardSkeleton`

### Fichiers a creer / modifier

Fichiers a creer :

- `frontend_rap_app/src/components/ui/ConfirmDialog.tsx`
- `frontend_rap_app/src/components/ui/EmptyState.tsx`
- `frontend_rap_app/src/components/ui/LoadingState.tsx`
- `frontend_rap_app/src/components/ui/ErrorState.tsx`
- `frontend_rap_app/src/components/ui/TableSkeleton.tsx`
- `frontend_rap_app/src/components/ui/StatCardSkeleton.tsx`

Fichiers a modifier si necessaire :

- [`frontend_rap_app/src/components/PageTemplate.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageTemplate.tsx)

### Fichiers a ne pas toucher

- `main.tsx`
- layouts globaux
- hooks metier
- formulaires metier

### Dependances a verifier

- palette du theme
- conventions visuelles loading / empty / error
- confirmations existantes locales

### Criteres d'acceptation

- composants reutilisables et purement presentatifs
- aucune collision avec `react-toastify`
- aucune collision avec les breadcrumbs existants
- aucun flux metier modifie

### Tests minimaux

- rendu visuel isole
- verification responsive
- verification des couleurs succes / warning / error

### Risques

- multiplier les composants d'etat sans les brancher proprement

### Condition pour passer au lot suivant

- composants d'etat stabilises

### Statut

- termine le 2026-04-05
- composants crees sans modifier les providers globaux ni les layouts
- aucune collision introduite avec `react-toastify` ou les breadcrumbs existants

---

## Lot 2. Evolution du shell de page existant

### Objectif

Faire evoluer `PageTemplate` et `PageWrapper` au lieu de creer une seconde famille de shells concurrente.

### Composants concernes

- `PageTemplate`
- `PageWrapper`
- eventuellement `PageSection`
- eventuellement `BackNavButton`

### Fichiers a creer / modifier

Fichiers a modifier :

- [`frontend_rap_app/src/components/PageTemplate.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageTemplate.tsx)
- [`frontend_rap_app/src/components/PageWrapper.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageWrapper.tsx)
- eventuellement [`frontend_rap_app/src/components/PageSection.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageSection.tsx)

Pages pilotes :

- [`frontend_rap_app/src/pages/Documents/DocumentsCreatePage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/Documents/DocumentsCreatePage.tsx)
- [`frontend_rap_app/src/pages/Documents/DocumentsEditPage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/Documents/DocumentsEditPage.tsx)
- [`frontend_rap_app/src/pages/typeOffres/TypeOffresCreatePage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/typeOffres/TypeOffresCreatePage.tsx)
- [`frontend_rap_app/src/pages/typeOffres/TypeOffresEditPage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/typeOffres/TypeOffresEditPage.tsx)

### Fichiers a ne pas toucher

- logique API des pages pilotes
- formulaires lourds
- layouts multiples

### Dependances a verifier

- comportement du bouton retour
- etats loading / error
- respect des titres et actions existantes
- cas particulier de [`DocumentsEditPage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/Documents/DocumentsEditPage.tsx) avec encart formation

### Criteres d'acceptation

- les pages pilotes utilisent un shell ameliore sans changer de logique
- memes informations et memes actions qu'avant
- aucun nouveau shell parallele obligatoire
- pas de changement de route ni de logique de navigation

### Tests minimaux

- comparaison visuelle avant/apres
- verification mobile / tablette / desktop
- verification du bouton retour
- verification des etats de chargement et erreur

### Risques

- faire porter trop de responsabilites a `PageTemplate`

### Condition pour passer au lot suivant

- `PageTemplate` reste simple, stable et reutilisable

### Statut

- termine le 2026-04-05
- `PageTemplate` et `PageWrapper` evolues sans nouvelle famille de shells
- pages pilotes `Documents` et `TypeOffres` migrees sur le shell ameliore
- etats de chargement et erreur des pilotes harmonises avec les briques du `Lot 1`

---

## Lot 3. Navigation globale et coherence des layouts

### Objectif

Uniformiser uniquement ce qui est vraiment transverse dans les layouts, sans casser leurs specificites par role.

### Composants concernes

- breadcrumbs
- active link styling
- sections communes d'en-tete

### Fichiers a creer / modifier

Fichiers a modifier :

- [`frontend_rap_app/src/layout/MainLayout.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayout.tsx)
- [`frontend_rap_app/src/layout/MainLayoutCandidat.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutCandidat.tsx)
- [`frontend_rap_app/src/layout/MainLayoutPrepa.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutPrepa.tsx)
- [`frontend_rap_app/src/layout/MainLayoutDeclic.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutDeclic.tsx)

### Fichiers a ne pas toucher

- `AppRoute.tsx`
- regles de permissions
- menus metier

### Dependances a verifier

- breadcrumbs deja presents
- liens actifs deja presents selon layout
- differences volontaires staff / candidat / prepa / declic

### Criteres d'acceptation

- lisibilite amelioree sans unifier artificiellement les layouts
- aucune regression de navigation
- aucune regression sur les permissions visibles

### Tests minimaux

- navigation par role
- verification des breadcrumbs
- verification des liens actifs

### Risques

- casser des comportements de role en voulant tout homogeniser

### Condition pour passer au lot suivant

- layouts stables sur tous les profils

### Statut

- termine le 2026-04-05
- breadcrumbs factorises dans une brique partagee
- styles d'etat actif harmonises entre layouts
- layout candidat aligne sur les autres pour la lisibilite de navigation
- aucune permission ni structure metier de menu modifiee

---

## Lot 4. Details simples, confirmations et feedbacks

### Objectif

Standardiser les vues detail et confirmations sur des cas reellement peu risques.

### Composants concernes

- `DetailSection`
- `DetailField`
- `DetailViewLayout`
- `ConfirmDialog`

### Fichiers a creer / modifier

Fichiers a creer :

- `frontend_rap_app/src/components/ui/DetailSection.tsx`
- `frontend_rap_app/src/components/ui/DetailField.tsx`
- `frontend_rap_app/src/components/layout/DetailViewLayout.tsx`

Pilote initial :

- [`frontend_rap_app/src/pages/evenements/EvenementDetailModal.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/evenements/EvenementDetailModal.tsx)

Pilotes a ne traiter qu'apres validation du premier :

- [`frontend_rap_app/src/pages/rapports/RapportDetailModal.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/rapports/RapportDetailModal.tsx)
- [`frontend_rap_app/src/pages/ateliers/AtelierTREDetailModal.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/ateliers/AtelierTREDetailModal.tsx)

### Fichiers a ne pas toucher au debut

- `FormationDetailModal`
- `ProspectionDetailModal`
- `RapportDetailModal` avant validation du pilote
- `AtelierTREDetailModal` avant validation du pilote

### Dependances a verifier

- mapping des champs detail existants
- confirmations existantes de suppression / archivage
- interaction avec les toasts existants

### Criteres d'acceptation

- 100 pour cent des infos visibles conservees sur le pilote
- confirmations plus lisibles sans changer le flux
- aucune perte d'information ni d'action

### Tests minimaux

- ouverture / fermeture modale
- verification de tous les champs
- verification confirmation

### Risques

- sous-estimer la richesse de certaines modales detail

### Condition pour passer au lot suivant

- pilote `EvenementDetailModal` stable

### Statut

- non demarre au 2026-04-05 — aucun fichier `DetailSection.tsx`, `DetailField.tsx`, `DetailViewLayout.tsx` dans `components/` ; modales detail non migrees sur ces briques

---

## Lot 5. Dashboards et cartes analytiques

### Objectif

Introduire des briques dashboard seulement si elles simplifient les pages sans aspirer la logique des widgets existants.

### Composants concernes

- `StatCard`
- `ChartCard`
- `DashboardGrid`
- `StatCardSkeleton`

### Fichiers a creer / modifier

Fichiers a creer si necessaire :

- `frontend_rap_app/src/components/dashboard/DashboardGrid.tsx`
- `frontend_rap_app/src/components/dashboard/StatCard.tsx`
- `frontend_rap_app/src/components/dashboard/ChartCard.tsx`

Pages pilotes :

- [`frontend_rap_app/src/pages/DashboardPage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/DashboardPage.tsx)
- [`frontend_rap_app/src/pages/DashboardCandidatPage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/DashboardCandidatPage.tsx)

### Fichiers a ne pas toucher

- widgets metier au premier passage
- hooks stats
- endpoints stats

### Dependances a verifier

- structure actuelle basee sur composition de widgets
- responsive reel des dashboards
- couleurs du theme

### Criteres d'acceptation

- les pages dashboard gagnent en coherence visuelle
- aucun calcul metier n'est deplace dans les composants dashboard
- les widgets existants continuent de fonctionner tels quels

### Tests minimaux

- rendu mobile / tablette / desktop
- verification affichage KPI

### Risques

- transformer les composants dashboard en couche metier cachee

### Condition pour passer au lot suivant

- dashboards pilotes stables sans refacto transversale des widgets

### Statut

- non demarre au sens strict du lot — `StatCardSkeleton` existe (Lot 1) ; pas de `DashboardGrid.tsx` / `StatCard.tsx` / `ChartCard.tsx` dedies comme decrit ; dashboards existants deja branchés sur `PageTemplate` / `PageWrapper` via migration shell

---

## Lot 6. Filtres, toolbar et pagination a partir de l'existant

### Objectif

Faire evoluer les patterns de listing a partir de `FilterTemplate` et des structures de page existantes.

### Composants concernes

- `FilterTemplate` evolue
- `EntityToolbar`
- `ListPaginationBar`
- `SelectionToolbar`

### Fichiers a creer / modifier

Fichiers a modifier :

- [`frontend_rap_app/src/components/filters/FilterTemplate.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/filters/FilterTemplate.tsx)

Fichiers a creer si justifie :

- `frontend_rap_app/src/components/filters/EntityToolbar.tsx`
- `frontend_rap_app/src/components/tables/ListPaginationBar.tsx`
- `frontend_rap_app/src/components/tables/SelectionToolbar.tsx`

Pages pilotes :

- [`frontend_rap_app/src/pages/typeOffres/TypeOffresPage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/typeOffres/TypeOffresPage.tsx)
- [`frontend_rap_app/src/pages/evenements/EvenementsPage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/evenements/EvenementsPage.tsx)
- [`frontend_rap_app/src/pages/rapports/RapportsPage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/rapports/RapportsPage.tsx)

### Fichiers a ne pas toucher

- `ResponsiveTableTemplate` au debut
- grosses listes complexes
- formulaires

### Dependances a verifier

- filtres inline deja presents dans les pages
- pagination existante
- selection multiple sur `TypeOffresPage`
- blocs overview presents sur `RapportsPage`

### Criteres d'acceptation

- memes filtres, memes actions, meme pagination, meme selection
- zero perte de comportement
- aucune toolbar generique inutilement abstraite

### Tests minimaux

- afficher / masquer filtres si applicable
- page suivante / precedente
- changement de taille de page
- selection multiple
- etats vides / chargement / erreur

### Risques

- creer des composants trop generiques trop tot

### Condition pour passer au lot suivant

- pages pilotes stables avec patterns de filtre et pagination clarifies

### Statut

- non demarre au 2026-04-05 — pas de `EntityToolbar` / `ListPaginationBar` / `SelectionToolbar` generiques comme decrit ; `FilterTemplate` inchangé dans son role central

---

## Lot 7. Tables centralisees a partir de `ResponsiveTableTemplate`

### Objectif

Faire evoluer la couche table existante avant de songer a la remplacer.

### Composants concernes

- `ResponsiveTableTemplate` evolue ou renommage progressif
- helpers de colonnes
- `InlineStatusBadge`

### Fichiers a creer / modifier

Fichiers a modifier :

- [`frontend_rap_app/src/components/ResponsiveTableTemplate.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ResponsiveTableTemplate.tsx)

Fichiers a creer si utile :

- `frontend_rap_app/src/components/tables/columnFactories.tsx`
- `frontend_rap_app/src/components/ui/InlineStatusBadge.tsx`

Tables pilotes :

- [`frontend_rap_app/src/pages/evenements/EvenementTable.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/evenements/EvenementTable.tsx)
- [`frontend_rap_app/src/pages/rapports/RapportTable.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/rapports/RapportTable.tsx)

Table a ne pas prendre au debut :

- `CandidatsTable`
- `ProspectionTable`
- `DocumentsTable`

### Dependances a verifier

- rendu mobile carte deja existant
- sticky columns deja amorcees
- row click
- actions de ligne

### Criteres d'acceptation

- 100 pour cent des colonnes visibles conservees
- meme comportement de clic et d'actions
- rendu mobile lisible
- aucune table monstre creee trop tot

### Tests minimaux

- table desktop
- table mobile
- sticky si active
- hover / row click / actions

### Risques

- remplacer trop vite un composant deja largement utilise

### Condition pour passer au lot suivant

- au moins 2 tables pilotes stables

### Statut

- non demarre au 2026-04-05 — pas de `InlineStatusBadge` ni `columnFactories` ; `ResponsiveTableTemplate` non remplace

---

## Lot 8. Formulaires simples et moyens

### Objectif

Mutualiser les briques de formulaire sur des perimetres peu risques, sans moteur trop generique.

### Composants concernes

- `AppTextField`
- `AppSelectField`
- `AppDateField`
- `AppCheckboxField`
- `AppNumberField`
- `AppReadonlyField`
- `FormSectionCard`
- `FormActionsBar`

### Fichiers a creer / modifier

Fichiers a creer :

- `frontend_rap_app/src/components/forms/fields/AppTextField.tsx`
- `frontend_rap_app/src/components/forms/fields/AppSelectField.tsx`
- `frontend_rap_app/src/components/forms/fields/AppDateField.tsx`
- `frontend_rap_app/src/components/forms/fields/AppCheckboxField.tsx`
- `frontend_rap_app/src/components/forms/fields/AppNumberField.tsx`
- `frontend_rap_app/src/components/forms/fields/AppReadonlyField.tsx`
- `frontend_rap_app/src/components/forms/FormSectionCard.tsx`
- `frontend_rap_app/src/components/forms/FormActionsBar.tsx`

Formulaires pilotes :

- [`frontend_rap_app/src/pages/rapports/RapportForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/rapports/RapportForm.tsx)
- [`frontend_rap_app/src/pages/evenements/EvenementForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/evenements/EvenementForm.tsx)
- [`frontend_rap_app/src/pages/centres/CentreForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/centres/CentreForm.tsx)

Puis seulement apres validation :

- `PartenaireForm`
- `PartenaireCandidatForm`
- `DeclicForm`
- `ObjectifDeclicForm`
- `ObjectifPrepaForm`

### Fichiers a ne pas toucher

- `CandidatForm`
- `CerfaForm`
- `ProspectionForm`
- formulaires prepa complexes

### Criteres d'acceptation

- memes champs
- meme ordre logique
- memes validations
- memes payloads
- presentation plus propre

### Tests minimaux

- create
- edit
- valeurs initiales
- erreurs backend
- responsive

### Risques

- casser le binding `name/value/onChange`

### Condition pour passer au lot suivant

- formulaires pilotes stables

### Statut

- non demarre au 2026-04-05 — pas de famille `AppTextField` / `FormSectionCard` dans `components/forms/fields/` comme decrit

---

## Lot 9. Pickers et adaptateurs metier

### Objectif

Centraliser les patterns de selection sans rendre les composants generiques metier-aware.

### Composants concernes

- `EntityPickerDialog`
- `EntityPickerField`

### Fichiers a creer / modifier

Fichiers a creer :

- `frontend_rap_app/src/components/dialogs/EntityPickerDialog.tsx`
- `frontend_rap_app/src/components/forms/fields/EntityPickerField.tsx`

Pilotes :

- [`frontend_rap_app/src/components/modals/CentresSelectModal.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/modals/CentresSelectModal.tsx)
- [`frontend_rap_app/src/components/modals/UsersSelectModal.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/modals/UsersSelectModal.tsx)
- [`frontend_rap_app/src/components/modals/FormationSelectModal.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/modals/FormationSelectModal.tsx)

### Fichiers a ne pas toucher au debut

- `CandidatsSelectModal`
- formulaires complexes

### Criteres d'acceptation

- modales pilotes factorisees
- aucune logique metier perdue
- aucune universalisation prematuree

### Tests minimaux

- ouverture / fermeture
- recherche
- selection
- etat vide / loading

### Condition pour passer au lot suivant

- au moins 3 pickers stables

### Statut

- non demarre au 2026-04-05 — pas de `EntityPickerDialog` / `EntityPickerField` generiques ; modales existantes dans `components/modals/` inchangées sur ce volet

---

## Lot 10. Formulaires complexes et zones sensibles

### Objectif

Migrer en dernier les zones a plus fort risque, avec toutes les briques deja stabilisees.

### Fichiers a modifier

Priorite :

- [`frontend_rap_app/src/pages/prospection/ProspectionForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionForm.tsx)

Puis :

- [`frontend_rap_app/src/pages/candidats/CandidatForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/candidats/CandidatForm.tsx)
- [`frontend_rap_app/src/pages/cerfa/CerfaForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/cerfa/CerfaForm.tsx)
- formulaires prepa complexes

### Fichiers a ne pas toucher

- hooks metier sous-jacents si non necessaire
- payloads
- endpoints

### Criteres d'acceptation

- tous les champs toujours presents
- comportement identique
- aucune donnee perdue
- aucune logique metier deplacee dans les briques UI

### Tests minimaux

- parcours complet create / edit
- navigation entre sections
- erreur backend
- restauration des valeurs
- responsive

### Risques

- perte d'etat
- validation partielle
- erreur subtile de mapping

### Condition de cloture

- comparaison stricte avec l'existant validee

### Statut

- non demarre au 2026-04-05 — `ProspectionForm`, `CandidatForm`, `CerfaForm` et formulaires prepa complexes non migres vers des briques mutualisees dediees

---

## 6. Ordre exact recommande

1. `Lot 0` preparation
2. `Lot 1` fondations UI de coexistence
3. `Lot 2` evolution du shell de page existant
4. `Lot 3` navigation globale et coherence des layouts
5. `Lot 4` details simples, confirmations et feedbacks
6. `Lot 5` dashboards
7. `Lot 6` filtres, toolbar et pagination
8. `Lot 7` tables centralisees a partir de l'existant
9. `Lot 8` formulaires simples et moyens
10. `Lot 9` pickers et adaptateurs metier
11. `Lot 10` formulaires complexes

Pourquoi cet ordre :

- il part du code reel au lieu du plan theorique
- il consolide d'abord les abstractions deja en place
- il evite la duplication de shells, filtres et tables
- il garde les zones les plus sensibles pour la fin

---

## 7. Criteres de validation par lot

Pour chaque lot :

- aucun champ visible disparu
- aucune colonne visible disparue
- aucune action visible disparue
- aucune section visible disparue
- aucun endpoint modifie
- aucun payload modifie
- aucun comportement fonctionnel modifie
- aucun composant UI avec logique metier specifique
- responsive mobile / tablette / desktop valide
- coexistence avec les pages non migrees validee

---

## 8. Criteres de rollback / arret

Le lot doit etre stoppe ou rollbacke si au moins un de ces cas arrive :

- une information visible avant migration disparait
- un champ metier disparait
- une colonne disparait
- une action utilisateur disparait
- un payload change sans intention explicite
- un endpoint ou une route est impacte
- une page non migree est cassee par effet de bord
- une nouvelle abstraction concurrence l'ancienne sans plan clair de transition
- un composant UI commence a embarquer de la logique metier
- la compatibilite responsive regresse visiblement

Regle :

- en cas de doute, on n'empile pas sur une base fragile
- on corrige le lot courant avant de continuer

---

## 9. Decision de lancement

Le plan peut maintenant etre lance, mais selon cette version recadree.

Decision operationnelle (mise a jour avril 2026) :

- ne pas lancer le plan initial tel quel
- cette version corrigee est **en cours** : `Lots 0` a `3` realises, migration shell etendue, `theme.ts` et stabilite menu en place
- la suite logique est `Lot 4` (details) ou renforcement de l'adoption des etats `EmptyState` / `LoadingState` / `ErrorState` sur les listes
- pour les prochains lots : continuer a faire evoluer `PageTemplate` / l'existant plutot qu'introduire une deuxieme famille de shells concurrente
