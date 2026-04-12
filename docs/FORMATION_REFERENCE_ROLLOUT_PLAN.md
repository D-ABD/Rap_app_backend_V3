# RAP App — Plan de standardisation UI a partir de la page Formations

Statut : archive

Ce document conserve l'historique du chantier precedent centre sur les pages liste.
Le plan actif de reference est maintenant :
- [frontend_rap_app/src/theme/_migration-plan.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/theme/_migration-plan.md)

Objectif :

- prendre [FormationsPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/formations/FormationsPage.tsx) comme reference visuelle
- appliquer ce meme langage UI aux autres pages liste metier
- conserver strictement la logique existante
- ne pas casser les droits, les appels API, les filtres ni les comportements CRUD

## Reference a reproduire

La page Formations devient le modele pour les pages liste.

Les points a reproduire :

- header de page compact
- fil d'ariane discret et peu encombrant
- recherche placee dans la barre de pilotage de page
- actions principales visibles
- actions secondaires / techniques regroupees dans un menu
- plus d'espace donne au tableau ou au contenu principal
- hierarchie simple :
  - navigation de page
  - pilotage de la liste
  - contenu

## Regles strictes

Pendant cette standardisation, on ne touche pas :

- aux hooks metier
- aux appels API
- aux routes
- aux permissions
- aux types
- aux handlers fonctionnels
- aux payloads
- aux conditions de rendu metier

On ne change que :

- la disposition
- la compacite
- la hierarchie visuelle
- le regroupement des boutons
- la place accordee au contenu

## Pattern cible pour chaque page liste

Pour chaque page cible, on vise :

1. supprimer le gros titre si le fil d'ariane suffit
2. regrouper dans le meme encadre compact :
   - retour
   - refresh si present
   - recherche
   - boutons de pilotage principaux
3. laisser visibles seulement les actions frequentes
4. deplacer les actions plus rares dans un sous-menu `Options` ou `Import / Export`
5. reduire la hauteur du haut de page
6. favoriser la place du tableau, de la liste ou des cartes

## Lots de travail

### Lot 1 — Pages liste CRUD les plus proches de Formations

Objectif :

- appliquer rapidement le pattern sur les pages qui ont deja une structure de liste comparable

Etat :

- termine le 12 avril 2026

Pages cibles :

- [CommentairesPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/commentaires/CommentairesPage.tsx)
- [DocumentsPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/Documents/DocumentsPage.tsx)
- [ProspectionPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionPage.tsx)
- [ProspectionCommentPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/prospectioncomments/ProspectionCommentPage.tsx)
- [PartenairesPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/partenaires/PartenairesPage.tsx)
- [CerfaPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/cerfa/CerfaPage.tsx)
- [AppairagesPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/appairage/AppairagesPage.tsx)
- [AppairageCommentPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/appairage/appairage_comments/AppairageCommentPage.tsx)
- [candidatsPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/candidats/candidatsPage.tsx)
- [AteliersTrePage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/ateliers/AteliersTrePage.tsx)
- [cvthequePage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/cvtheque/cvthequePage.tsx)

Ce qu'on fait sur ce lot :

- recherche dans `headerExtra` ou zone equivalente
- regroupement des actions secondaires
- suppression du gros titre si redondant
- compactage du haut de page

Commit conseille :

```bash
git add -A
git commit -m "UI standardization lot 1: align core list pages with formations reference"
```

### Lot 2 — Variantes candidat des pages liste

Objectif :

- appliquer le meme standard aux variantes candidat sans casser leur navigation propre

Etat :

- termine le 12 avril 2026

Pages cibles :

- [ProspectionPageCandidat.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionPageCandidat.tsx)
- [PartenairesCandidatPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/partenaires/PartenairesCandidatPage.tsx)
- [cvthequeCandidatPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/cvtheque/cvthequeCandidatPage.tsx)

Ce qu'on fait sur ce lot :

- meme compacite
- meme priorite au contenu
- meme logique d'actions visibles / menu secondaire

Commit conseille :

```bash
git add -A
git commit -m "UI standardization lot 2: align candidate list pages with formations reference"
```

### Lot 3 — Pages liste specialisees Prepa

Objectif :

- adapter le pattern a des ecrans plus metier sans perdre les specificites Prepa

Etat :

- termine le 12 avril 2026

Pages cibles :

- [PrepaPagesIC.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaPagesIC.tsx)
- [PrepaPagesAteliers.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaPagesAteliers.tsx)
- [StagiairesPrepaPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/StagiairesPrepaPage.tsx)
- [ObjectifPrepaPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/ObjectifPrepaPage.tsx)

Ce qu'on fait sur ce lot :

- compactage du haut de page
- regroupement des actions metier secondaires
- mise en avant du tableau principal

Commit conseille :

```bash
git add -A
git commit -m "UI standardization lot 3: align prepa list pages with formations reference"
```

### Lot 4 — Pages liste specialisees Declic

Objectif :

- appliquer le meme langage a Declic avec un minimum de differences

Etat :

- termine le 12 avril 2026

Pages cibles :

- [DeclicPages.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/declic/DeclicPages.tsx)
- [ParticipantsDeclicPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/declic/ParticipantsDeclicPage.tsx)
- [ObjectifDeclicPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/declic/ObjectifDeclicPage.tsx)

Ce qu'on fait sur ce lot :

- meme structure compacte
- meme regroupement des options
- meme priorite au tableau

Commit conseille :

```bash
git add -A
git commit -m "UI standardization lot 4: align declic list pages with formations reference"
```

## Methode d'execution

Pour chaque page :

1. identifier la recherche
2. identifier les boutons principaux
3. identifier les boutons secondaires
4. remonter la recherche dans le header
5. garder seulement les actions essentielles visibles
6. basculer les actions secondaires dans un menu
7. verifier que la table gagne de la place

## Check visuel a faire apres chaque page

- le contenu principal apparait plus vite
- la recherche est visible sans descendre dans la page
- les actions principales sont claires
- les actions secondaires restent accessibles
- aucun bouton n'a disparu a cause du layout
- mobile acceptable
- dark mode lisible

## Definition de termine

Une page est consideree alignee sur la reference Formations quand :

- elle utilise un header compact
- la recherche est dans le pilotage de page
- les actions sont hierarchisees
- le contenu prend visiblement plus de place
- aucun comportement n'a ete modifie

## Ordre recommande de demarrage

Demarrage conseille :

1. [CommentairesPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/commentaires/CommentairesPage.tsx)
2. [DocumentsPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/Documents/DocumentsPage.tsx)
3. [ProspectionPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionPage.tsx)

Pourquoi :

- ces pages sont les plus proches de la structure de Formations
- elles donnent un maximum d'effet visuel avec un risque faible
- elles permettent de stabiliser le pattern avant de passer a Prepa et Declic

## Avancement reel au 12 avril 2026

Lots termines :

- lot 1
- lot 2
- lot 3
- lot 4

Pages deja alignees sur la reference Formations :

- [FormationsPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/formations/FormationsPage.tsx)
- [CommentairesPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/commentaires/CommentairesPage.tsx)
- [DocumentsPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/Documents/DocumentsPage.tsx)
- [ProspectionPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionPage.tsx)
- [ProspectionCommentPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/prospectioncomments/ProspectionCommentPage.tsx)
- [PartenairesPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/partenaires/PartenairesPage.tsx)
- [CerfaPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/cerfa/CerfaPage.tsx)
- [AppairagesPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/appairage/AppairagesPage.tsx)
- [AppairageCommentPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/appairage/appairage_comments/AppairageCommentPage.tsx)
- [candidatsPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/candidats/candidatsPage.tsx)
- [AteliersTrePage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/ateliers/AteliersTrePage.tsx)
- [cvthequePage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/cvtheque/cvthequePage.tsx)
- [ProspectionPageCandidat.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionPageCandidat.tsx)
- [PartenairesCandidatPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/partenaires/PartenairesCandidatPage.tsx)
- [cvthequeCandidatPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/cvtheque/cvthequeCandidatPage.tsx)
- [PrepaPagesIC.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaPagesIC.tsx)
- [PrepaPagesAteliers.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaPagesAteliers.tsx)
- [StagiairesPrepaPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/StagiairesPrepaPage.tsx)
- [ObjectifPrepaPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/ObjectifPrepaPage.tsx)
- [DeclicPages.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/declic/DeclicPages.tsx)
- [ParticipantsDeclicPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/declic/ParticipantsDeclicPage.tsx)
- [ObjectifDeclicPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/declic/ObjectifDeclicPage.tsx)

Suite logique :

- le plan actuel pages liste est termine








git add .
git commit -m "UI pass Uniformisation des pages 1 "
git push origin main
