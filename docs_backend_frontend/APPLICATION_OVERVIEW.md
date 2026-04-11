# RAP_APP — Vue d'ensemble de l'application

Document d'orientation fonctionnelle pour comprendre rapidement l'application :

- a quoi elle sert
- quels sont ses grands modules
- quels profils utilisent quoi
- comment les modules se relient entre eux
- quels sont les principaux flux utilisateur

Ce document explique le produit.  
Pour le deploiement et l'exploitation, voir :

- [DEPLOY](../deploy/DEPLOY.md)
- [VPS Deploy Report](../deploy/VPS_DEPLOY_REPORT.md)
- [Commandes Deploy](../deploy/commandes_deploy.md)

## 1. Objectif general

RAP_APP est une application web de gestion interne qui centralise plusieurs briques de suivi :

- candidats
- formations
- prospections
- partenaires
- commentaires
- appairages
- documents
- evenements
- rapports
- CVTheque
- modules specialises `Prepa` et `Declic`
- administration des utilisateurs, statuts, centres et types d'offre

L'application melange donc :

- du CRUD metier classique
- du suivi relationnel entre entites
- des commentaires et journaux
- des imports / exports
- des tableaux de bord et statistiques
- des workflows differencies selon le role de l'utilisateur

## 2. Architecture fonctionnelle

Vue simplifiee :

```text
Utilisateurs / Roles
    -> Dashboards
    -> Modules metier

Modules metier centraux
    -> Candidats
    -> Formations
    -> Partenaires
    -> Prospections
    -> Commentaires
    -> Appairages
    -> Documents
    -> Rapports
    -> Evenements
    -> CVTheque

Modules specialises
    -> Prepa
    -> Declic

Services transverses
    -> Logs
    -> Import / Export Excel
    -> Recherche
    -> Statistiques
    -> Auth / Profil / Roles
```

## 3. Profils et layouts

L'application adapte ses ecrans selon le role.

Principaux layouts front :

- `MainLayout` : staff coeur de metier
- `MainLayoutCandidat` : utilisateur type candidat
- `MainLayoutPrepa` : staff / parcours Prepa
- `MainLayoutDeclic` : staff / parcours Declic

Grandes familles de roles detectees dans le code :

- staff coeur
- admin / superuser
- candidats ou profils proches
- staff `Prepa`
- staff `Declic`

Effet concret :

- le dashboard d'arrivee change selon le role
- la navigation laterale change selon le role
- certaines routes sont interdites ou masquees selon le role

## 4. Points d'entree importants

Routes web principales :

- `/login`
- `/register`
- `/`
- `/dashboard`
- `/dashboard/candidat`
- `/dashboard/prepa`
- `/dashboard/declic`
- `/admin`
- `/health`

API principales :

- `/api/`
- `/api/token/`
- `/api/token/refresh/`
- `/api/me/`
- `/api/roles/`
- `/api/search/`
- `/api/import-export/`
- `/api/docs/`

## 5. Modules metier

### 5.1 Candidats

But :

- creer et suivre les fiches candidats
- stocker les informations personnelles et contractuelles
- servir de pivot avec d'autres modules

Liens principaux :

- un candidat peut etre lie a des prospections
- un candidat peut etre lie a des formations
- un candidat peut etre visible dans la CVTheque
- un candidat peut etre concerne par des commentaires
- un candidat peut etre rattache a un compte utilisateur

Pages front principales :

- `candidatsPage`
- `candidatsCreatePage`
- `candidatsEditPage`

API :

- `/api/candidats/`

### 5.2 Formations

But :

- gerer les formations et leurs informations detaillees
- rattacher documents et commentaires
- servir de point d'ancrage pour plusieurs workflows

Liens principaux :

- commentaires de formation
- documents associes
- appairages
- prospections
- rapports

Pages front principales :

- `FormationsPage`
- `FormationsCreatePage`
- `FormationsEditPage`
- `FormationDetailPage`
- `FormationsCommentairesPage`

API :

- `/api/formations/`

### 5.3 Partenaires

But :

- gerer les structures partenaires
- distinguer certains parcours staff / candidat

Pages front principales :

- `PartenairesPage`
- `PartenairesCreatePage`
- `PartenairesEditPage`
- `PartenairesCandidatPage`

API :

- `/api/partenaires/`

### 5.4 Prospections

But :

- suivre les actions de prospection
- lier partenaires, candidats, formations et commentaires

Liens principaux :

- partenaires
- candidats
- formations
- commentaires de prospection

Pages front principales :

- `ProspectionPage`
- `ProspectionCreatePage`
- `ProspectionEditPage`
- `ProspectionPageCandidat`
- `ProspectionEditCandidatPage`

API :

- `/api/prospections/`
- `/api/prospection-comments/`
- `/api/prospection-commentaires/`

### 5.5 Commentaires

But :

- centraliser des commentaires metier sur plusieurs objets
- proposer un editeur riche HTML sur certains flux

Pages front principales :

- `CommentairesPage`
- `CommentairesCreatePage`
- `CommentairesEditPage`
- `CommentairesCreateFromFormationPage`

API :

- `/api/commentaires/`

### 5.6 Appairages

But :

- gerer les mises en relation entre entites
- suivre aussi les commentaires d'appairage

Pages front principales :

- `AppairagesPage`
- `AppairagesCreatePage`
- `AppairagesEditPage`
- `AppairageCommentPage`
- `AppairageDetailPage`

API :

- `/api/appairages/`
- `/api/appairage-commentaires/`

### 5.7 Documents

But :

- gerer des documents metier associes au reste de l'application

Pages front principales :

- `DocumentsPage`
- `DocumentsCreatePage`
- `DocumentsEditPage`

API :

- `/api/documents/`

### 5.8 Rapports

But :

- creer et suivre des rapports
- exposer des choix et des exports associes

Pages front principales :

- `RapportsPage`
- `RapportsCreatePage`
- `RapportsEditPage`

API :

- `/api/rapports/`
- `/api/rapports/choices/`

### 5.9 Evenements

But :

- gerer les evenements et leur suivi

Pages front principales :

- `EvenementsPage`
- `EvenementsCreatePage`
- `EvenementsEditPage`

API :

- `/api/evenements/`

### 5.10 CVTheque

But :

- exposer une base de CV / profils consultables
- distinguer vues staff et candidat

Pages front principales :

- `cvthequePage`
- `cvthequeEditPage`
- `cvthequeCandidatPage`
- `cvthequeCandidatEditPage`

API :

- `/api/cvtheque/`

### 5.11 Cerfa

But :

- gerer les contrats / ecrans Cerfa

Pages front principales :

- `CerfaPage`
- `CerfaEditPage`

API :

- `/api/cerfa-contrats/`

### 5.12 Prepa

But :

- gerer un parcours / module metier distinct avec ses propres pages, objectifs et stagiaires

Sous-modules visibles dans le front :

- seances `Prepa`
- objectifs `Prepa`
- stagiaires `Prepa`
- variantes / pages specialisees `IC` et `Ateliers`

Pages front principales :

- `PrepaPages`
- `PrepaCreatePage`
- `PrepaEditPage`
- `ObjectifPrepaPage`
- `StagiairesPrepaPage`

API :

- `/api/prepa/`
- `/api/prepa-objectifs/`
- `/api/stagiaires-prepa/`
- `/api/prepa-stats/`

### 5.13 Declic

But :

- gerer un second parcours specialise avec participants, objectifs et dashboard dedie

Pages front principales :

- `DeclicPages`
- `DeclicCreatePage`
- `DeclicEditPage`
- `ParticipantsDeclicPage`
- `ObjectifDeclicPage`

API :

- `/api/declic/`
- `/api/participants-declic/`
- `/api/objectifs-declic/`
- `/api/declic-stats/`

### 5.14 Parametrage et administration

Modules support :

- centres
- statuts
- types d'offre
- utilisateurs
- mon profil
- logs

Pages front principales :

- `CentresPage`
- `StatutsPage`
- `TypeOffresPage`
- `UsersPage`
- `MonProfil`
- `LogsPage`
- `ParametresPage`

API :

- `/api/centres/`
- `/api/statuts/`
- `/api/typeoffres/`
- `/api/users/`
- `/api/logs/`
- `/api/logs/choices/`

## 6. Modules transverses

### 6.1 Authentification et profil

Fonctions principales :

- connexion via email / mot de passe
- emission de tokens JWT
- refresh token
- endpoint profil utilisateur courant
- demande de creation de compte pour un candidat

Routes / endpoints :

- `/login`
- `/register`
- `/api/token/`
- `/api/token/refresh/`
- `/api/me/`
- `/api/me/demande-compte/`

### 6.2 Dashboards et statistiques

L'application contient plusieurs dashboards :

- dashboard staff
- dashboard candidat
- dashboard Prepa
- dashboard Declic

Et plusieurs endpoints de stats :

- formations
- evenements
- prospections
- candidats
- partenaires
- ateliers TRE
- appairages
- commentaires

### 6.3 Recherche

Endpoint :

- `/api/search/`

But :

- centraliser certaines recherches rapides ou globales

### 6.4 Import / export Excel

But :

- importer des donnees Excel
- exporter des donnees
- telecharger des modeles d'import
- suivre les jobs / historiques d'import

Routes principales :

- `/api/import-export/`
- page front `ImportExportJobsPage`

### 6.5 Logs

But :

- garder une trace d'actions utilisateur ou techniques
- aider au diagnostic fonctionnel

Pages / endpoints :

- `LogsPage`
- `/api/logs/`
- `/api/logs/choices/`

## 7. Liens fonctionnels entre modules

Relations metier importantes :

- `Candidats` <-> `Prospections`
- `Candidats` <-> `Formations`
- `Formations` <-> `Commentaires`
- `Formations` <-> `Documents`
- `Prospections` <-> `Partenaires`
- `Prospections` <-> `Commentaires`
- `Appairages` <-> `Commentaires d'appairage`
- `Prepa` <-> `Stagiaires`
- `Declic` <-> `Participants`
- `Utilisateurs` <-> `Roles` <-> `Layouts` front

En pratique, l'app fonctionne comme un systeme de suivi relationnel :

- une meme personne ou structure peut apparaitre dans plusieurs modules
- les modules sont autonomes en surface
- mais les liens entre eux sont essentiels pour l'usage quotidien

## 8. Fonctionnement global cote utilisateur

Flux type :

1. l'utilisateur se connecte
2. il est redirige selon son role vers le bon dashboard
3. il navigue dans un layout adapte a son profil
4. il consulte, cree, modifie ou archive des entites metier
5. il ajoute des commentaires, des documents ou des liaisons entre entites
6. il peut utiliser les imports / exports et consulter les statistiques selon ses droits

## 9. Fonctionnement global cote technique

Vue simplifiee :

```text
Frontend React
    -> Axios / JWT
    -> API Django REST
    -> Services metier
    -> Modeles Django
    -> PostgreSQL
```

En production :

```text
Navigateur
    -> Nginx
    -> Front build statique
    -> proxy /api vers Gunicorn
    -> Django
    -> PostgreSQL
```

## 10. Ce qu'il faut retenir

RAP_APP n'est pas une simple application CRUD unique.  
C'est une plateforme metier modulaire avec :

- plusieurs domaines fonctionnels
- plusieurs profils utilisateurs
- des dashboards differencies
- un noyau de donnees reliees entre elles
- des fonctions de supervision, logs, import/export et reporting

Pour s'y retrouver vite :

- commencer par les dashboards et les layouts
- puis regarder les modules centraux : `Candidats`, `Formations`, `Prospections`, `Partenaires`
- ensuite seulement explorer `Prepa`, `Declic`, `CVTheque`, `Rapports`, `Logs`, `Import/Export`

