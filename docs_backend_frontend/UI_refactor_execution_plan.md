# UI Refactor Execution Plan

## 0. Plan d'execution 2026

Ce plan est la feuille de route active a suivre maintenant.

Objectif principal :

- transformer RAP App en **belle application MUI Dashboard 2026**
- renforcer la qualite visuelle
- conserver le code metier intact
- avancer par couches, sans casse fonctionnelle

Regle d'or :

- on ne refait pas l'application
- on refond l'habillage et l'experience visuelle
- on garde les routes, l'API, les hooks et les comportements CRUD

### Vision cible

Le rendu vise :

- une interface premium
- une navigation plus elegante
- un dark mode propre et lisible
- des cards, tableaux et formulaires plus modernes
- une coherence visuelle proche des meilleurs templates admin MUI recents

### Methode de travail

A chaque etape :

1. faire un savepoint git
2. modifier uniquement la couche concernee
3. verifier visuellement 3 ou 4 ecrans pilotes
4. lancer les checks frontend
5. commit si la passe est stable

Checks a lancer :

```bash
cd frontend_rap_app
npm run type-check
npm run lint
npm run build
```

Commandes de sauvegarde standard :

```bash
git add -A
git commit -m "Savepoint before UI pass X"
```

### Etape 1 — Stabiliser le socle visuel

But :

- verrouiller la base du design system
- fiabiliser le light/dark mode
- supprimer les conflits entre MUI et le CSS global

Fichiers cibles :

- `frontend_rap_app/src/theme.ts`
- `frontend_rap_app/src/index.css`
- `frontend_rap_app/tsconfig.json`

Livrables attendus :

- palette claire et sombre stable
- typographie cohérente
- surfaces globales cohérentes
- CSS global minimal et compatible MUI

Commit de fin d'etape :

```bash
git add -A
git commit -m "UI pass 1: establish 2026 dashboard theme foundation"
```

Statut :

- deja entame

### Etape 2 — Refaire les layouts et la navigation

But :

- changer la perception globale de l'app des la premiere seconde
- rendre sidebar, topbar, breadcrumbs et footer plus premium

Fichiers cibles :

- `frontend_rap_app/src/layout/MainLayout.tsx`
- `frontend_rap_app/src/layout/MainLayoutPrepa.tsx`
- `frontend_rap_app/src/layout/MainLayoutDeclic.tsx`
- `frontend_rap_app/src/layout/MainLayoutCandidat.tsx`
- `frontend_rap_app/src/layout/navigationStyles.ts`
- `frontend_rap_app/src/components/layout/AppBreadcrumbs.tsx`
- `frontend_rap_app/src/layout/footer.tsx`

Livrables attendus :

- fond principal coherent
- sidebar plus MUI dashboard premium
- topbar lisible
- breadcrumbs elegant
- footer aligne sur le theme

Commit de fin d'etape :

```bash
git add -A
git commit -m "UI pass 2: redesign layouts and navigation surfaces"
```

### Etape 3 — Refaire les shells de page

But :

- harmoniser les pages sans toucher les pages metier une par une
- donner une structure plus premium aux ecrans

Fichiers cibles :

- `frontend_rap_app/src/components/PageTemplate.tsx`
- `frontend_rap_app/src/components/PageWrapper.tsx`
- `frontend_rap_app/src/components/PageSection.tsx`
- `frontend_rap_app/src/components/BackNavButton.tsx`

Livrables attendus :

- headers de page plus haut de gamme
- sections mieux espacees
- largeur de contenu plus propre
- navigation retour plus elegante

Commit de fin d'etape :

```bash
git add -A
git commit -m "UI pass 3: refine shared page shells"
```

### Etape 4 — Moderniser formulaires et surfaces de contenu

But :

- rendre les formulaires et cartes de section plus premium
- eliminer les fonds blancs fixes qui cassent le dark mode

Fichiers cibles :

- `frontend_rap_app/src/components/forms/FormSectionCard.tsx`
- `frontend_rap_app/src/components/forms/FormActionsBar.tsx`
- `frontend_rap_app/src/components/forms/RichHtmlEditorField.tsx`
- `frontend_rap_app/src/components/forms/fields/*`

Puis :

- formulaires metier les plus visibles

Commit de fin d'etape :

```bash
git add -A
git commit -m "UI pass 4: upgrade form surfaces and dark mode consistency"
```

### Etape 5 — Nettoyer modales, dialogues et etats UI

But :

- rendre les interactions quotidiennes plus propres
- uniformiser modales, loaders, erreurs, etats vides

Fichiers cibles :

- `frontend_rap_app/src/components/ui/*`
- `frontend_rap_app/src/components/dialogs/*`
- `frontend_rap_app/src/components/modals/*`
- `frontend_rap_app/src/components/layout/DetailViewLayout.tsx`
- `frontend_rap_app/src/components/ui/DetailSection.tsx`
- `frontend_rap_app/src/components/ui/DetailField.tsx`

Commit de fin d'etape :

```bash
git add -A
git commit -m "UI pass 5: polish dialogs modals and interface states"
```

### Etape 6 — Refaire les tableaux et listes metier

But :

- normaliser les couleurs
- rendre les tables plus propres et plus lisibles
- corriger les zones les plus fragiles en dark mode

Reference de travail :

- `docs/HARDCODED_FRONT_COLORS.md`

Fichiers cibles prioritaires :

- tables `Prepa`
- tables `Declic`
- `FormationTable.tsx`
- `ProspectionTable.tsx`
- composants de filtre / toolbar / pagination si necessaire

Commit de fin d'etape :

```bash
git add -A
git commit -m "UI pass 6: normalize table colors and list components"
```

### Etape 7 — Elever les dashboards

But :

- amener la partie analytics au niveau du reste de l'app
- unifier les cartes KPI et les palettes de graphes

Fichiers cibles :

- composants dashboard partages
- dashboards overview
- dashboards grouped
- widgets KPI / charts

Commit de fin d'etape :

```bash
git add -A
git commit -m "UI pass 7: elevate dashboard widgets and chart system"
```

### Etape 8 — Finition generale

But :

- supprimer les incoherences residuelles
- verifier la coherence globale
- finaliser l'effet "dashboard 2026"

Checklist :

- dark mode OK
- light mode OK
- dashboard OK
- liste OK
- formulaire OK
- modale OK
- mobile acceptable
- aucune regression fonctionnelle visible

Commit de fin d'etape :

```bash
git add -A
git commit -m "UI pass 8: final polish for MUI dashboard 2026 look"
```

### Savepoints recommandes

Si une etape grossit trop, on coupe avec un commit intermediaire :

```bash
git add -A
git commit -m "Savepoint before layouts cleanup"

git add -A
git commit -m "Savepoint before forms cleanup"

git add -A
git commit -m "Savepoint before prepa and declic tables cleanup"
```

### Ordre concret recommande maintenant

Ordre reel a partir d'aujourd'hui :

1. Etape 2 — layouts et navigation
2. Etape 4 — formulaires et surfaces
3. Etape 5 — modales et etats UI
4. Etape 6 — tables et listes
5. Etape 7 — dashboards
6. Etape 8 — finition

### Definition de "termine"

Le chantier sera considere comme termine quand :

- l'app a un look premium coherent
- le dark mode est propre
- les couleurs dures les plus visibles ont disparu
- les pages principales ont une signature MUI admin claire
- le code metier n'a pas ete casse

---

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

Derniere mise a jour : 2026-04-06 (Lots 0–10 termines ; lots 11–15 ajoutes comme suite du plan).

### Verification independante (code actuel)

Cette section a ete confrontee au depot : `frontend_rap_app/src`.

| Affirmation du plan | Verif code |
|---------------------|------------|
| 6 fichiers `components/ui/*` (Lot 1) | OK — tous presents |
| **Les 6 briques Lot 1 importees au moins une fois hors de leur module** | OK — voir tableau « Adoption Lot 1 » ci-dessous |
| `theme.ts` avec `tertiary` / `neutral` / `gradients` | OK |
| `AppBreadcrumbs` + `navigationStyles` dans les 4 layouts | OK |
| `useMemo` dans `useSidebarItems` + garde `setSubmenuOpen` | OK |
| Briques Lot 4 (`DetailSection`, `DetailField`, `DetailViewLayout`) | OK — présentes ; modales pilotes migrées (voir § Lot 4) |
| `DashboardGrid` / `StatCard` / `ChartCard` (Lot 5) | OK — presents (voir § Lot 5) |
| `EntityToolbar` / `ListPaginationBar` / `SelectionToolbar` / `PageSizeSelect` (Lot 6) | OK — presents (voir § Lot 6) |
| `InlineStatusBadge` / `columnFactories` + evolution `ResponsiveTableTemplate` (Lot 7) | OK — presents (voir § Lot 7) |
| Briques `App*` / `FormSectionCard` / `FormActionsBar` (Lot 8) | OK — presents (voir § Lot 8) |
| `EntityPickerDialog` / `EntityPickerField` (Lot 9) | OK — presents (voir § Lot 9) |
| Formulaires complexes migres (Lot 10) | OK — `ProspectionForm`, `CerfaForm`, sections candidat, `PrepaForm` / `PrepaFormIC` / `PrepaFormAteliers` ; `FormSectionCard` titre `ReactNode` (voir § Lot 10) |
| **Pages avec `PageTemplate` / `PageWrapper`** | La majorite des ecrans route liste / CRUD les utilisent. **Ecrans route sans** ce shell (hors composants) : `About`, `auth/LoginPage`, `auth/RegisterPage`, `ForbiddenPage`, `NotFoundPage`, `PolitiqueConfidentialite`, `centres/CentreDetailPage`, `cvtheque/cvthequeEditPage`, `cvtheque/cvthequeCandidatEditPage`, `users/MonProfil` — souvent volontaire (auth / pages statiques / profil) ou reste a aligner |

La formule « la majorite des ecrans sous `pages/` » reste **acceptable** pour les **pages metier liste / formulaire / dashboard** referencees dans les routes principales ; elle ne s’applique pas a l’ensemble des 225 fichiers (beaucoup sont des sous-composants).

### Lots formalises (plan sections 5.x)

| Lot | Statut |
|-----|--------|
| `Lot 0` | Termine |
| `Lot 1` | **Termine** (composants + adoption minimale sur ecrans pilotes — voir § 1.b) |
| `Lot 2` | Termine (voir extension ci-dessous) |
| `Lot 3` | Termine (voir correctif stabilite ci-dessous) |
| `Lot 4` | **Termine** — `DetailSection`, `DetailField`, `DetailViewLayout` + migration des modales pilotes |
| `Lot 5` | **Termine** — `StatCard`, `ChartCard`, `DashboardGrid`, adoption sur dashboards pilotes et widgets (voir § Lot 5) |
| `Lot 6` | **Termine** — `FilterTemplate` evolue, `EntityToolbar`, `PageSizeSelect`, `ListPaginationBar`, `SelectionToolbar`, pages pilotes (voir § Lot 6) |
| `Lot 7` | **Termine** — `InlineStatusBadge`, `columnFactories`, `ResponsiveTableTemplate` evolue, tables pilotes (voir § Lot 7) |
| `Lot 8` | **Termine** — champs formulaire mutualises, `FormSectionCard`, `FormActionsBar`, formulaires pilotes (voir § Lot 8) |
| `Lot 9` | **Termine** — `EntityPickerDialog`, `EntityPickerField`, modales pilotes refactorisees (voir § Lot 9) |
| `Lot 10` | **Termine** — formulaires sensibles (voir § Lot 10) |
| `Lot 11` | Non demarre — modales detail (voir § Lot 11) |
| `Lot 12` | Non demarre — prepa et formulaires residuels (voir § Lot 12) |
| `Lot 13` | Non demarre — etats UI etendus (Lot 1 generalise) (voir § Lot 13) |
| `Lot 14` | Non demarre — shell sur routes restantes (voir § Lot 14) |
| `Lot 15` | Non demarre — table de donnees generique (optionnel) (voir § Lot 15) |

### Elements livres dans le `Lot 1`

- `frontend_rap_app/src/components/ui/ConfirmDialog.tsx`
- `frontend_rap_app/src/components/ui/EmptyState.tsx`
- `frontend_rap_app/src/components/ui/LoadingState.tsx`
- `frontend_rap_app/src/components/ui/ErrorState.tsx`
- `frontend_rap_app/src/components/ui/TableSkeleton.tsx`
- `frontend_rap_app/src/components/ui/StatCardSkeleton.tsx`

Verification : lint cible des nouveaux fichiers OK.

**Adoption Lot 1 dans l’app (2026-04-06) — les six briques sont utilisees** :

| Composant | Pages / ecrans concernes |
|-----------|-------------------------|
| `LoadingState` | `TypeOffresCreatePage`, `DocumentsEditPage`, `TypeOffresPage`, `StatutsPage`, `FormationsPage` (liste + panneau filtres en `inline`) |
| `ErrorState` | `DocumentsEditPage`, `CerfaPage` (avec reessai via `refetch`) |
| `EmptyState` | `EvenementsPage`, `TypeOffresPage`, `StatutsPage`, `FormationsPage`, `CerfaPage` |
| `TableSkeleton` | `EvenementsPage`, `CerfaPage` |
| `ConfirmDialog` | `EvenementsPage`, `TypeOffresPage`, `StatutsPage`, `CerfaPage`, `FormationsPage` (archivage + suppression definitive formations) |
| `StatCardSkeleton` | Widget [`FormationStatsSummary`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/overviewDashboard/FormationStatsSummary.tsx) (dashboard staff) ; [`DeclicStatsSummary`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/declic/DeclicStatsSummary.tsx), [`PrepaStatsSummary`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaStatsSummary.tsx), [`PrepaStatsOperations`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaStatsOperations.tsx) (chargement KPI) |

**Périmètre** : Lot 1 est **clos** au sens « briques livrées et réellement branchées ». La **généralisation** à toutes les listes / modales reste une **suite d’amélioration continue** (hors critère de clôture du lot).

Aucun changement de route, d’endpoint ni de logique metier : remplacement presentatif des spinners / textes vides / `Dialog` MUI locaux par les briques du Lot 1.

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

### Elements livres dans le `Lot 4` (details simples)

Fichiers crees :

- [`frontend_rap_app/src/components/ui/DetailField.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/DetailField.tsx) — paire libelle / valeur + helper `formatDetailScalar`
- [`frontend_rap_app/src/components/ui/DetailSection.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/DetailSection.tsx) — bloc titre + separateur + grille optionnelle
- [`frontend_rap_app/src/components/layout/DetailViewLayout.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/layout/DetailViewLayout.tsx) — coque `Dialog` (titre, contenu, actions)

Modales migrees (memes informations et actions qu’avant, logique metier inchangee) :

- [`EvenementDetailModal.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/evenements/EvenementDetailModal.tsx)
- [`RapportDetailModal.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/rapports/RapportDetailModal.tsx)
- [`AtelierTREDetailModal.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/ateliers/AtelierTREDetailModal.tsx) — chargement via `LoadingState` (Lot 1)

`ConfirmDialog` (Lot 1) deja disponible pour les flux de confirmation ailleurs ; non requis sur ces trois modales (pas de dialogue de confirmation interne).

### Elements livres dans le `Lot 5` (dashboards / cartes analytiques)

Fichiers crees :

- [`frontend_rap_app/src/components/dashboard/DashboardGrid.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/dashboard/DashboardGrid.tsx) — grille `Grid container` avec espacement par defaut
- [`frontend_rap_app/src/components/dashboard/StatCard.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/dashboard/StatCard.tsx) — tuile KPI (valeur, libelle, helper, couleur, clic optionnel)
- [`frontend_rap_app/src/components/dashboard/ChartCard.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/dashboard/ChartCard.tsx) — carte graphique / bloc avec titre, actions, etats chargement / erreur

Refactor presentatif (memes donnees et hooks qu’avant) :

- [`DashboardTemplateSaturation.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/dashboard/DashboardTemplateSaturation.tsx) — s’appuie sur `ChartCard`
- [`FormationStatsSummary.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/widgets/overviewDashboard/FormationStatsSummary.tsx) — KPI via `StatCard` ; chargement via `StatCardSkeleton` (Lot 1)
- [`DeclicStatsSummary.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/declic/DeclicStatsSummary.tsx), [`PrepaStatsSummary.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaStatsSummary.tsx), [`PrepaStatsOperations.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaStatsOperations.tsx) — squelettes `StatCardSkeleton` pour le chargement
- [`DashboardPage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/DashboardPage.tsx), [`DashboardCandidatPage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/DashboardCandidatPage.tsx) — mise en page via `DashboardGrid` (le widget candidat `ProspectionCommentStatsDashboard` est dans un `Grid item` `xs={12}` pour corriger la grille)

Aucun deplacement de logique metier dans les composants dashboard ; endpoints et hooks inchanges.

Verification : `npx tsc --noEmit` OK sur le frontend.

### Elements livres dans le `Lot 6` (filtres, toolbar, pagination)

Fichiers crees :

- [`frontend_rap_app/src/components/filters/EntityToolbar.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/filters/EntityToolbar.tsx) — `Stack` responsive pour la ligne d’actions des listes
- [`frontend_rap_app/src/components/filters/PageSizeSelect.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/filters/PageSizeSelect.tsx) — select « taille de page » (5 / 10 / 20 par defaut)
- [`frontend_rap_app/src/components/tables/ListPaginationBar.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/tables/ListPaginationBar.tsx) — texte de synthese + `Pagination` MUI
- [`frontend_rap_app/src/components/tables/SelectionToolbar.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/tables/SelectionToolbar.tsx) — slot actions + tout selectionner / annuler lorsque `count > 0`

Evolution de [`FilterTemplate.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/filters/FilterTemplate.tsx) : props optionnelles `title` et `sx` sur le conteneur.

Pages pilotes migrees (memes filtres, pagination, selection, endpoints) :

- [`TypeOffresPage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/typeOffres/TypeOffresPage.tsx) — recherche via `FilterTemplate` ; barre d’actions `EntityToolbar` + `PageSizeSelect` + `SelectionToolbar` pour la selection multiple
- [`EvenementsPage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/evenements/EvenementsPage.tsx) — filtres via `FilterTemplate` (`cols={4}`, titre « Filtres ») ; `ListPaginationBar` en pied de page
- [`RapportsPage.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/rapports/RapportsPage.tsx) — recherche + reinitialiser via `FilterTemplate` ; actions export / creation dans `EntityToolbar`

Verification : `npx tsc --noEmit` OK.

### Elements livres dans le `Lot 7` (tables centralisees)

Fichiers crees :

- [`frontend_rap_app/src/components/ui/InlineStatusBadge.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/InlineStatusBadge.tsx) — pastille de statut inline (base `Chip` MUI)
- [`frontend_rap_app/src/components/tables/columnFactories.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/tables/columnFactories.tsx) — helpers `colText` / `colCustom` pour `TableColumn<T>`

Evolution de [`ResponsiveTableTemplate.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ResponsiveTableTemplate.tsx) :

- `tableContainerComponent` optionnel (ex. `Paper` pour le conteneur MUI)
- `containerSx` pour styles additionnels sur le `TableContainer`
- `actionsAlign` pour l’alignement de la colonne Actions (desktop)
- `stopPropagation` sur la zone actions (desktop + mobile) pour eviter le declenchement du `onRowClick` lors d’un clic sur les boutons

Tables pilotes :

- [`EvenementTable.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/evenements/EvenementTable.tsx) — colonnes via `colText` / `colCustom`, statut avec `InlineStatusBadge`
- [`RapportTable.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/rapports/RapportTable.tsx) — migration vers `ResponsiveTableTemplate` (memes colonnes, vue mobile cartes, `tableContainerComponent={Paper}`, `actionsAlign="right"`)

Les autres tables (`FormationTable`, `ProspectionTable`, etc.) restent sur `ResponsiveTableTemplate` sans changement obligatoire dans ce lot.

Verification : `npx tsc --noEmit` OK.

### Elements livres dans le `Lot 8` (formulaires simples et moyens)

Fichiers crees dans [`frontend_rap_app/src/components/forms/fields/`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/fields/) :

- `AppTextField.tsx` — `TextField` `outlined` / `small` / `fullWidth` par defaut
- `AppSelectField.tsx` — `FormControl` + `InputLabel` + `Select` + `FormHelperText` optionnel
- `AppDateField.tsx` — `type="date"`, libelle retracte
- `AppCheckboxField.tsx` — `FormControlLabel` + `Checkbox`
- `AppNumberField.tsx` — `type="number"`
- `AppReadonlyField.tsx` — `InputProps.readOnly`

Fichiers crees :

- [`frontend_rap_app/src/components/forms/FormSectionCard.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/FormSectionCard.tsx) — carte `outlined` avec titre (sections de formulaire)
- [`frontend_rap_app/src/components/forms/FormActionsBar.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/FormActionsBar.tsx) — rangée d’actions responsive

Formulaires pilotes migres (memes champs, validations, payloads ; presentation harmonisee) :

- [`RapportForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/rapports/RapportForm.tsx) — `FormSectionCard`, `AppTextField` / `AppSelectField` / `AppDateField`, `AppReadonlyField` pour le bloc d’information, `FormActionsBar`
- [`EvenementForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/evenements/EvenementForm.tsx) — `FormSectionCard`, `AppSelectField`, `AppDateField`, `AppTextField`, `AppNumberField`, `FormActionsBar` (ordre des boutons mobile conserve)
- [`CentreForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/centres/CentreForm.tsx) — deux `FormSectionCard`, `AppTextField`, `AppCheckboxField`, `FormActionsBar` (remplace l’ancien `Paper` unique)

Verification : `npx tsc --noEmit` OK.

### Elements livres dans le `Lot 9` (pickers et adaptateurs metier)

Fichiers crees :

- [`frontend_rap_app/src/components/dialogs/EntityPickerDialog.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/dialogs/EntityPickerDialog.tsx) — coque `Dialog` (titre, recherche optionnelle, chargement / erreur / vide, actions)
- [`frontend_rap_app/src/components/forms/fields/EntityPickerField.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/fields/EntityPickerField.tsx) — champ lecture seule + bouton pour ouvrir la modale

Modales pilotes refactorisees (logique API et types inchanges, rendu aligne sur `EntityPickerDialog`) :

- [`CentresSelectModal.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/modals/CentresSelectModal.tsx) — recherche affichee apres chargement (`showSearchWhenLoading={false}`)
- [`UsersSelectModal.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/modals/UsersSelectModal.tsx)
- [`FormationSelectModal.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/modals/FormationSelectModal.tsx)

Adoption `EntityPickerField` : [`CommentaireForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/commentaires/CommentaireForm.tsx) (selection de formation a la place du bouton + texte seuls).

`CandidatsSelectModal` : conserve sa logique ; adoption large reportee au Lot 10 (`ProspectionForm`).

Verification : `npx tsc --noEmit` OK.

### Elements livres dans le `Lot 10` (formulaires complexes et zones sensibles)

Evolution transverse :

- [`FormSectionCard.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/FormSectionCard.tsx) — prop `title` accepte un `ReactNode` (texte ou titre avec icone), compatibilite ascendante avec les titres chaine.

Formulaires migres (memes champs, payloads, modales et logique ; presentation harmonisee avec les briques Lots 8–9) :

- [`ProspectionForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionForm.tsx) — `FormSectionCard`, `AppDateField`, `AppSelectField`, `EntityPickerField` (partenaire / formation / candidat), `FormActionsBar`
- [`CerfaForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/cerfa/CerfaForm.tsx) — remplacement des `TextField` MUI par `AppTextField` (comportement et `DatePicker` inchanges)
- Sections sous [`FormSections/`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/candidats/FormSections/) — `AppTextField` a la place de `TextField` (`SectionIdentite`, `SectionInfosContrat`, `SectionFormation`, `SectionRepresentant`, `SectionAssignations`, `SectionNotes`)
- [`PrepaForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaForm.tsx), [`PrepaFormIC.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaFormIC.tsx), [`PrepaFormAteliers.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaFormAteliers.tsx) — `AppTextField`

`CandidatForm.tsx` (orchestration uniquement) : sans changement structurel ; les champs sont dans les sections ci-dessus.

Hors perimetre volontaire dans ce lot : autres ecrans prepa (`StagiairesPrepaForm`, `PrepaInvitesSection`, etc.), generalisation supplementaire sur d’autres formulaires.

Verification : `npx tsc --noEmit` OK.

### Prochaine etape recommandee

- Enchainer sur le **`Lot 11`** (modales detail), puis selon priorite **`Lot 12`** a **`Lot 15`** (voir **§ 6** et sections detaillees **§ Lot 11** a **§ Lot 15**).

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

- termine le 2026-04-05 — composants crees sans modifier les providers globaux ni les layouts
- **cloture adoption** le 2026-04-06 : les **6** briques sont branches sur au moins un ecran ou widget (voir **§ 1.b** tableau « Adoption Lot 1 dans l’app »)
- condition pour enchaîner sur le Lot 2 (déjà réalisé) : OK ; **prochain lot logique** : Lot 4 (details) ou generalisation continue

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

- termine le 2026-04-06
- fichiers `DetailField`, `DetailSection`, `DetailViewLayout` livres et branches sur `EvenementDetailModal`, `RapportDetailModal`, `AtelierTREDetailModal`
- aucune regression fonctionnelle visee : champs, liens, export, edition, JSON technique conserves

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

- termine le 2026-04-06
- `DashboardGrid`, `StatCard`, `ChartCard` livres et branches sur les pilotes (`DashboardPage`, `DashboardCandidatPage`) et widgets listes ci-dessus (§ 1.b)
- `StatCardSkeleton` (Lot 1) reutilise de facon coherente sur les chargements KPI Declic / Prepa
- aucune regression fonctionnelle visee : widgets et hooks inchanges

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

- termine le 2026-04-06
- `EntityToolbar`, `PageSizeSelect`, `ListPaginationBar`, `SelectionToolbar` livres ; `FilterTemplate` enrichi (`title`, `sx`)
- pages pilotes `TypeOffresPage`, `EvenementsPage`, `RapportsPage` migrees sans changement de comportement fonctionnel (memes parametres API, memes actions)
- `ResponsiveTableTemplate` non modifie (conforme au perimetre Lot 6)

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

- termine le 2026-04-06
- `InlineStatusBadge`, `columnFactories` livres ; `ResponsiveTableTemplate` enrichi (conteneur, `containerSx`, alignement actions, isolation des clics actions)
- `EvenementTable` et `RapportTable` migrees comme pilotes ; colonnes et actions conservees, responsive et sticky preserves

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

- termine le 2026-04-06
- famille `AppTextField` / `AppSelectField` / `AppDateField` / `AppCheckboxField` / `AppNumberField` / `AppReadonlyField` livree ; `FormSectionCard` et `FormActionsBar` livres
- formulaires pilotes `RapportForm`, `EvenementForm`, `CentreForm` migres (voir § 1.b)

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

- termine le 2026-04-06
- `EntityPickerDialog` et `EntityPickerField` livres ; trois modales pilotes refactorisees ; `EntityPickerField` utilise sur `CommentaireForm`
- aucune logique metier deplacee dans les briques generiques (fetch, mapping, filtres restent dans les modales)

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

- termine le 2026-04-06 — `ProspectionForm`, `CerfaForm`, sections `FormSections` du candidat, `PrepaForm` / `PrepaFormIC` / `PrepaFormAteliers` migres ; `FormSectionCard` avec titre `ReactNode` ; verification `npx tsc --noEmit` OK

---

## Lot 11. Modales detail (generalisation)

### Objectif

Etendre l’usage de `DetailSection`, `DetailField`, `DetailViewLayout` aux modales de detail qui ne les utilisent pas encore, sans changer les donnees affichees ni les actions.

### Fichiers typiques a traiter (prioriser selon usage)

- modales detail metier : ex. `FormationDetailModal`, `ProspectionDetailModal`, et autres `*DetailModal` sous `components/` ou `pages/`

### Fichiers a ne pas toucher sans necessite

- hooks de chargement, mapping API, routes

### Criteres d'acceptation

- meme informations et actions qu’avant migration
- pas de logique metier dans les briques `Detail*`

### Statut

- non demarre — lots **11** a **15** formalisent la suite du plan apres cloture des lots **0** a **10**

---

## Lot 12. Prepa et formulaires residuels

### Objectif

Aligner les ecrans prepa / formulaires encore en `TextField` MUI ou patterns anciens sur `AppTextField` et briques Lots 8–9 la ou c’est pertinent, comme pour le Lot 10.

### Fichiers indicatifs

- [`PrepaInvitesSection.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaInvitesSection.tsx)
- [`StagiairesPrepaForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/StagiairesPrepaForm.tsx), [`ObjectifPrepaForm.tsx`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/ObjectifPrepaForm.tsx)
- autres formulaires sous `pages/prepa/` ou modules voisins identifies au fil de l’audit

### Criteres d'acceptation

- memes champs, payloads, endpoints ; `npx tsc --noEmit` OK

### Statut

- non demarre

---

## Lot 13. Etats UI etendus (generalisation du Lot 1)

### Objectif

Ou `LoadingState` / `EmptyState` / `ErrorState` / `TableSkeleton` / `ConfirmDialog` ne sont pas encore utilises, les adopter sur les listes, panneaux et modales restants — sans obligation de couverture a 100 % en une seule PR.

### Perimetre

- ecrans encore avec spinners ou textes vides ad hoc
- listes sans squelette de chargement coherent

### Criteres d'acceptation

- comportement fonctionnel identique ; pas de regression responsive

### Statut

- non demarre

---

## Lot 14. Shell de page sur routes restantes

### Objectif

Evaluer et, le cas echeant, envelopper `PageTemplate` / `PageWrapper` les routes qui n’en ont pas encore (hors pages volontairement hors shell : auth, statiques, erreurs).

### Fichiers deja identifies (indicatif, § 1.b)

- `About`, `LoginPage`, `RegisterPage`, `ForbiddenPage`, `NotFoundPage`, `PolitiqueConfidentialite`, `CentreDetailPage`, pages CVThèque edition, `MonProfil`, etc.

### Attention

- certaines pages peuvent rester sans shell par choix produit (auth, plein ecran) : le lot consiste a **trancher** et documenter, pas a forcer une uniformite absolue.

### Statut

- non demarre

---

## Lot 15. Table de donnees generique (`AppDataTable` ou equivalent)

### Objectif

Eventuellement introduire une couche de table reutilisable (tri, pagination, colonnes, accessibilite) **si** le besoin produit le justifie — le plan initial ne l’impose pas ; `ResponsiveTableTemplate` reste la base actuelle.

### Criteres d'acceptation

- ne pas dupliquer `ResponsiveTableTemplate` sans strategie de migration
- composant presentatif ; logique metier hors du composant generique

### Statut

- non demarre — **optionnel** ; peut rester en attente indefinie

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
12. `Lot 11` modales detail (generalisation)
13. `Lot 12` prepa et formulaires residuels
14. `Lot 13` etats UI etendus (Lot 1 generalise)
15. `Lot 14` shell sur routes restantes (au cas par cas)
16. `Lot 15` table generique (optionnel)

Pourquoi cet ordre :

- il part du code reel au lieu du plan theorique
- il consolide d'abord les abstractions deja en place
- il evite la duplication de shells, filtres et tables
- il garde les zones les plus sensibles pour la fin
- les lots **11** a **14** poursuivent l’harmonisation sans bloquer la livraison des lots **0** a **10** ; le lot **15** est reserve a un besoin structurel futur

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
- les lots **0** a **10** sont **realises** dans cette version du plan ; les lots **11** a **15** formalisent la **suite** (modales detail, prepa residuel, etats UI etendus, shell residuel, table generique optionnelle)
- la priorite conseillee : **`Lot 11`**, puis **`Lot 12`**, selon besoin **`Lot 13`** et **`Lot 14`** ; **`Lot 15`** seulement si un besoin produit clair
- continuer a faire evoluer `PageTemplate` / l'existant plutot qu'introduire une deuxieme famille de shells concurrente
