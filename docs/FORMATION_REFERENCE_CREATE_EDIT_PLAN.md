# RAP App — Plan de standardisation UI Create / Edit

Objectif :

- prolonger la reference `Formations` sur les ecrans `create / edit`
- garder les formulaires metier intacts autant que possible
- harmoniser surtout le shell de page, la hierarchie et la lisibilite

## Regles

On ne touche pas :

- aux hooks
- aux payloads
- aux handlers
- aux appels API
- aux validations metier
- aux routes

On peut ajuster :

- le header de page
- le regroupement des actions
- la largeur utile
- les surfaces visuelles autour des formulaires
- les titres, sous-titres et contextes d'aide

## Pattern cible

Pour chaque page `create / edit` :

1. header compact
2. retour clair
3. titre utile mais non envahissant
4. contexte metier sous forme de sous-titre ou d'encart
5. formulaire dans une surface propre
6. actions secondaires discretes
7. mobile lisible

## Lots

## Avancement au 2026-04-12

- `Lot 1` termine
- `Lot 2` termine
- `Lot 3` a faire

### Lot 1 — Wrappers create / edit les plus proches

Statut :

- termine

Pages cibles :

- [CommentairesCreatePage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/commentaires/CommentairesCreatePage.tsx)
- [CommentairesCreateFromFormationPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/commentaires/CommentairesCreateFromFormationPage.tsx)
- [CommentairesEditPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/commentaires/CommentairesEditPage.tsx)
- [DocumentsCreatePage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/Documents/DocumentsCreatePage.tsx)
- [DocumentsEditPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/Documents/DocumentsEditPage.tsx)
- [PartenairesCreatePage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/partenaires/PartenairesCreatePage.tsx)
- [PartenairesEditPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/partenaires/PartenairesEditPage.tsx)

But :

- harmoniser les wrappers avant de retoucher les gros formulaires

### Lot 2 — Core create / edit metier

Statut :

- termine

Pages cibles :

- [ProspectionCreatePage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionCreatePage.tsx)
- [ProspectionCreatePageCandidat.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionCreatePageCandidat.tsx)
- [ProspectionEditPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionEditPage.tsx)
- [ProspectionEditCandidatPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prospection/ProspectionEditCandidatPage.tsx)
- [candidatsCreatePage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/candidats/candidatsCreatePage.tsx)
- [candidatsEditPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/candidats/candidatsEditPage.tsx)
- [cvthequeCreate.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/cvtheque/cvthequeCreate.tsx)
- [cvthequeEditPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/cvtheque/cvthequeEditPage.tsx)
- [cvthequeCandidatCreate.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/cvtheque/cvthequeCandidatCreate.tsx)
- [cvthequeCandidatEditPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/cvtheque/cvthequeCandidatEditPage.tsx)

### Lot 3 — Create / edit Prepa et Declic

Statut :

- a faire

Pages cibles :

- [PrepaCreatePage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaCreatePage.tsx)
- [PrepaCreatePageIC.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaCreatePageIC.tsx)
- [PrepaCreatePageAteliers.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/PrepaCreatePageAteliers.tsx)
- [ObjectifPrepaEditPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/prepa/ObjectifPrepaEditPage.tsx)
- [CerfaEditPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/cerfa/CerfaEditPage.tsx)
- [AppairagesCreatePage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/appairage/AppairagesCreatePage.tsx)
- [AppairagesEditPage.tsx](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages/appairage/AppairagesEditPage.tsx)

## Definition de termine

Une page `create / edit` est consideree alignee quand :

- le header est compact et clair
- le contexte de la page est comprehensible rapidement
- le formulaire respire mieux
- l'action principale est evidente
- aucun comportement metier n'a change
