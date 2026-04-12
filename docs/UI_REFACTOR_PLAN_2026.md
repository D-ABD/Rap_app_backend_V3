# RAP App — Plan de refonte UI MUI Dashboard 2026

Objectif :

- donner a l'application un look **MUI dashboard puissant 2026**
- obtenir une app plus premium, plus nette, plus moderne
- conserver **strictement** les fonctionnalites existantes
- eviter les regressions metier pendant la refonte

Contraintes :

- ne pas changer les routes
- ne pas changer les endpoints API
- ne pas changer les hooks metier
- ne pas changer les permissions
- ne pas changer les payloads
- ne pas casser les formulaires CRUD

Philosophie de travail :

- on modifie d'abord le **socle visuel**
- ensuite les **layouts**
- ensuite les **composants partages**
- ensuite seulement les **ecrans metier visibles**
- on fait des **commits frequents** et lisibles

## Vision cible

Nous voulons une app qui ressemble a un template admin MUI haut de gamme :

- surfaces propres et coherentes
- dark mode lisible et elegant
- sidebar premium
- topbar sobre et nette
- cartes et tableaux plus modernes
- formulaires plus haut de gamme
- modales plus soignees
- dashboards avec meilleure hierarchie visuelle

Le rendu vise :

- plus "dashboard SaaS / admin premium"
- moins "MUI brut / assemblage progressif"
- plus de cohesion entre modules

## Regles de securite pendant la refonte

Avant chaque passe :

1. verifier que le projet compile
2. faire un commit de sauvegarde
3. modifier uniquement la couche concernee
4. retester 3 ecrans pilotes

Ecrans pilotes a verifier apres chaque passe :

- un dashboard
- une liste/tableau
- un formulaire
- une modale de selection

Commande de verification type :

```bash
cd frontend_rap_app
npm run type-check
npm run lint
npm run build
```

## Strategie git

On ne fait pas une seule grosse modification.

On travaille par passes.

Avant chaque grosse passe :

```bash
git add -A
git commit -m "Savepoint before UI pass X"
```

Apres chaque passe validee :

```bash
git add -A
git commit -m "UI pass X: <resume court>"
```

## Etat reel du chantier au 2026-04-12

Ce qui est deja fait :

- la direction cible "MUI dashboard 2026" est definie
- [theme.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/theme.ts) a deja ete retouche comme base de travail
- [index.css](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/index.css) a ete nettoye pour mieux suivre le theme MUI
- [tsconfig.json](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/tsconfig.json) a ete assaini pour eviter que les fichiers de backup polluent le projet
- un inventaire des couleurs codees en dur existe dans [HARDCODED_FRONT_COLORS.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/docs/HARDCODED_FRONT_COLORS.md)
- la prod et les roles ont ete stabilises avant de reprendre la refonte UI
- [AppBreadcrumbs.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/layout/AppBreadcrumbs.tsx) a recu une premiere refonte visuelle premium, compatible light/dark et responsive
- [footer.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/footer.tsx) a deja une base premium coherente avec le theme
- [MainLayout.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayout.tsx) a ete retravaille pour donner au shell principal un rendu plus premium, avec topbar plus marquee, drawer plus soigne et meilleure integration light/dark
- [MainLayoutPrepa.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutPrepa.tsx) a ete aligne sur le nouveau niveau visuel du shell principal
- [MainLayoutDeclic.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutDeclic.tsx) est maintenant harmonise avec les autres layouts specialises
- [MainLayoutCandidat.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutCandidat.tsx) a recu une harmonisation legere pour mieux coller au standard visuel des autres shells

Ce qui a ete tente puis annule :

- une passe globale sur les layouts/navigation a ete testee puis revert, car trop large et trop surprenante a valider en une fois

Decision de travail retenue :

- reprendre la refonte **fichier par fichier**
- privilegier des changements plus petits, plus lisibles et plus faciles a annuler
- garder le plan par passes comme vision d'ensemble, mais executer concretement avec des modifications ciblees

## Plan de refonte

### Passe 1 — Socle visuel global

But :

- poser une direction visuelle forte
- stabiliser le dark mode
- aligner le CSS global avec MUI

Fichiers cibles :

- [theme.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/theme.ts)
- [index.css](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/index.css)
- [tsconfig.json](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/tsconfig.json) si necessaire pour garder une base propre

Ce qu'on travaille :

- palette light / dark
- typo
- ombres
- rayons
- fonds globaux
- cohérence theme/CSS

Commit conseille :

```bash
git add -A
git commit -m "UI pass 1: establish 2026 dashboard theme foundation"
```

Statut actuel :

- base posee, mais pas terminee
- [theme.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/theme.ts) sert deja de terrain d'experimentation
- [index.css](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/index.css) a deja ete corrige pour mieux suivre le theme
- [tsconfig.json](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/tsconfig.json) est propre et ne doit plus bloquer la refonte
- il reste a finaliser la palette, la typo, les ombres, les surfaces light/dark et la coherence fine du dark mode

### Passe 2 — Layouts et navigation

But :

- changer la perception globale de l'app des l'arrivee
- rendre sidebar, topbar, breadcrumbs et footer vraiment premium

Fichiers cibles :

- [MainLayout.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayout.tsx)
- [MainLayoutPrepa.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutPrepa.tsx)
- [MainLayoutDeclic.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutDeclic.tsx)
- [MainLayoutCandidat.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutCandidat.tsx)
- [navigationStyles.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/navigationStyles.ts)
- [AppBreadcrumbs.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/layout/AppBreadcrumbs.tsx)
- [footer.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/footer.tsx)

Ce qu'on travaille :

- fond principal
- navigation laterale
- style des liens actifs
- topbar
- breadcrumbs
- footer

Commit conseille :

```bash
git add -A
git commit -m "UI pass 2: redesign layouts and navigation surfaces"
```

Statut actuel :

- non demarree en version definitive
- une tentative large a ete annulee
- cette passe sera reprise **fichier par fichier**
- elle est maintenant **commencee proprement**
- ordre concret recommande :
  - [AppBreadcrumbs.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/layout/AppBreadcrumbs.tsx) : fait
  - [footer.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/footer.tsx) : base deja en place, a retoucher seulement si besoin apres le layout principal
  - [MainLayout.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayout.tsx) : bien avance
  - [MainLayoutPrepa.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutPrepa.tsx) : bien avance
  - [MainLayoutDeclic.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutDeclic.tsx) : bien avance
  - [MainLayoutCandidat.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutCandidat.tsx) : bien avance
  - la passe 2 est maintenant bien engagee sur tous les layouts principaux

### Passe 3 — Shells de page et composants partages

But :

- donner une structure plus premium aux pages
- harmoniser les conteneurs et les surfaces les plus frequentes

Fichiers cibles :

- [PageTemplate.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageTemplate.tsx)
- [PageWrapper.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageWrapper.tsx)
- [PageSection.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/PageSection.tsx)
- [BackNavButton.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/BackNavButton.tsx)
- [ResponsiveTableTemplate.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ResponsiveTableTemplate.tsx)
- [FormSectionCard.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/FormSectionCard.tsx)
- [FormActionsBar.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/FormActionsBar.tsx)

Ce qu'on travaille :

- hero headers
- espacement
- largeur des contenus
- cartes de section
- actions de formulaire
- template de tableau responsive

Commit conseille :

```bash
git add -A
git commit -m "UI pass 3: refine shared page shells and surfaces"
```

Statut actuel :

- pas commencee
- a lancer seulement apres validation de la passe 2

### Passe 4 — Etats UI et modales

But :

- soigner les moments de travail quotidiens
- rendre les modales, details et etats d'interface plus propres

Fichiers cibles :

- [LoadingState.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/LoadingState.tsx)
- [ErrorState.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/ErrorState.tsx)
- [EmptyState.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/EmptyState.tsx)
- [ConfirmDialog.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/ConfirmDialog.tsx)
- `src/components/modals/`
- `src/components/dialogs/`
- [DetailViewLayout.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/layout/DetailViewLayout.tsx)
- [DetailSection.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/DetailSection.tsx)
- [DetailField.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/ui/DetailField.tsx)

Ce qu'on travaille :

- loaders
- erreurs
- etats vides
- dialogues de confirmation
- modales de selection
- pages detail

Commit conseille :

```bash
git add -A
git commit -m "UI pass 4: polish dialogs modals and interface states"
```

Statut actuel :

- pas commencee
- depend aussi de l'inventaire [HARDCODED_FRONT_COLORS.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/docs/HARDCODED_FRONT_COLORS.md)

### Passe 5 — Formulaires premium

But :

- rendre les formulaires plus modernes sans changer leur logique
- corriger les fonds blancs figes en dark mode

Fichiers cibles :

- [RichHtmlEditorField.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/forms/RichHtmlEditorField.tsx)
- `src/components/forms/fields/`
- formulaires metier les plus visibles

Priorites connues :

- commentaires
- prospection
- formations
- partenaires
- prepa

Commit conseille :

```bash
git add -A
git commit -m "UI pass 5: upgrade forms and dark mode form surfaces"
```

Statut actuel :

- pas commencee
- priorite forte apres layouts, car plusieurs formulaires gardent encore des surfaces claires trop figees

### Passe 6 — Tables metier et listes

But :

- retirer les couleurs dures les plus genantes
- rendre les tableaux plus premium et plus lisibles

Fichiers cibles prioritaires :

- tableaux `Prepa`
- tableaux `Declic`
- [FormationTable.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/formations/FormationTable.tsx)
- [ProspectionTable.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionTable.tsx)

Reference de travail :

- [HARDCODED_FRONT_COLORS.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/docs/HARDCODED_FRONT_COLORS.md)

Commit conseille :

```bash
git add -A
git commit -m "UI pass 6: normalize table colors and list components"
```

Statut actuel :

- pas commencee
- plusieurs tableaux Prepa / Declic / Prospection restent des zones a forte valeur visuelle

### Passe 7 — Dashboards et widgets

But :

- amener la partie analytics au niveau du reste
- centraliser les couleurs de graphes

Fichiers cibles :

- dashboards grouped
- dashboards overview
- cartes KPI
- composants dashboard partages

Ce qu'on travaille :

- palette charts
- cards KPI
- hierarchie visuelle
- lisibilite dark mode

Commit conseille :

```bash
git add -A
git commit -m "UI pass 7: elevate dashboard widgets and chart system"
```

Statut actuel :

- pas commencee
- a faire une fois les surfaces, listes et formulaires stabilises

### Passe 8 — Finition et coherence

But :

- retirer les incoherences residuelles
- verifier le rendu cross-module
- finaliser l'impression "app premium"

Checklist :

- dark mode coherent
- light mode coherent
- une liste OK
- un formulaire OK
- une modale OK
- un dashboard OK
- mobile acceptable
- pas de regression visuelle evidente

Commit conseille :

```bash
git add -A
git commit -m "UI pass 8: final polish for MUI dashboard 2026 look"
```

Statut actuel :

- pas commencee
- reservee a la fin pour lisser les incoherences residuelles

## Commits de sauvegarde intermediaires

Si une passe devient trop grosse, on coupe.

Exemples de commits intermediaires utiles :

```bash
git add -A
git commit -m "Savepoint before breadcrumbs and footer cleanup"

git add -A
git commit -m "Savepoint before form surface refactor"

git add -A
git commit -m "Savepoint before prepa and declic tables cleanup"
```

## Ce qu'on ne doit pas toucher

Pendant cette refonte, on evite autant que possible :

- `src/api/`
- `src/hooks/`
- `src/routes/`
- logique `axios`
- `onSubmit`
- `mutations`
- filtres d'API
- permissions
- navigation metier

## Ordre reel conseille a partir de maintenant

Comme le socle est deja entame, l'ordre concret suivant est :

1. finir proprement la Passe 1
2. Passe 2 — layouts et navigation, fichier par fichier
3. Passe 5 — formulaires premium
4. Passe 4 — modales et etats UI
5. Passe 6 — tables metier
6. Passe 7 — dashboards
7. Passe 8 — finition

## Premiere sequence de travail recommandee

Sequence immediate :

1. sauvegarde git
2. finaliser [theme.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/theme.ts)
3. verifier le rendu global light/dark
4. [AppBreadcrumbs.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components/layout/AppBreadcrumbs.tsx) : fait
5. [footer.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/footer.tsx) : deja sur une base acceptable
6. [MainLayout.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayout.tsx) : bien avance
7. [MainLayoutPrepa.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutPrepa.tsx) : bien avance
8. attaquer [MainLayoutDeclic.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout/MainLayoutDeclic.tsx)
9. verification visuelle
10. commit

Commandes :

```bash
git add -A
git commit -m "Savepoint before finalizing UI pass 1"
```

Puis, apres finalisation de la passe 1 :

```bash
git add -A
git commit -m "UI pass 1: establish 2026 dashboard theme foundation"
```

Puis, avant d'attaquer la navigation :

```bash
git add -A
git commit -m "Savepoint before UI pass 2 file-by-file"
```

Puis, apres les premiers fichiers valides de la passe 2 :

```bash
git add -A
git commit -m "UI pass 2: refine breadcrumbs footer and main layout"
```

## Resume

But final :

- une app belle
- une app coherente
- une app plus premium
- une app qui ressemble a un vrai dashboard MUI 2026
- sans casser le code metier

Regle d'or :

- une couche a la fois
- des commits frequents
- des verifications courtes mais regulieres
