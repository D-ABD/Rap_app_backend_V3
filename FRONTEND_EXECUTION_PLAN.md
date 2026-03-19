# Frontend Execution Plan

Date: 2026-03-19

## But

Traduire le guide d'integration front en plan d'execution concret pour un front React / Expo.

Ce document repond a trois questions:
- par quoi commencer
- dans quel ordre construire les ecrans
- quoi repousser volontairement pour garder un demarrage propre

## Principe Directeur

Le backend est stabilise.

Le front doit donc avancer:
- par verticales fonctionnelles utiles
- avec un client API unique
- sans reouvrir de dette backend

## Socle Technique A Construire En Premier

Avant tout ecran metier, il faut livrer:

### 1. Client API

Fonctions attendues:
- base URL centralisee
- ajout automatique du bearer token
- refresh token automatique
- parsing du format `success / message / data / errors`
- gestion des blobs pour exports et downloads

### 2. Gestion De Session

Composants attendus:
- ecran login
- bootstrap utilisateur courant
- stockage local du JWT
- garde de routes / ecrans selon etat de session

### 3. Primitives UI

Composants attendus:
- liste paginee
- filtre simple
- formulaire avec erreurs par champ
- loader
- empty state
- toast ou feedback d'action

## Sprint 1 - Auth Et Bootstrap

### Objectif

Pouvoir ouvrir l'application, se connecter et afficher un shell de navigation fiable.

### Endpoints

- `POST /api/token/`
- `POST /api/token/refresh/`
- `GET /api/me/`
- `GET /api/roles/`

### Ecrans

- login
- splash / bootstrap
- profil courant simple
- shell navigation selon role

### Definition of done

- login fonctionnel
- refresh token fonctionnel
- utilisateur courant charge au demarrage
- role disponible partout dans l'app

## Sprint 2 - Referentiels Et Filtres

### Objectif

Poser les sources de donnees communes reutilisees par les formulaires et les listes.

### Endpoints

- `GET /api/centres/liste-simple/`
- `GET /api/formations/liste-simple/`
- `GET /api/statuts/choices/`
- `GET /api/typeoffres/choices/`
- `GET /api/evenements/choices/`
- `GET /api/partenaires/choices/`

### Livrables

- hooks de referentiels
- cache simple des choices
- composants select / multi-select

### Definition of done

- les formulaires futurs n'ont plus a recoder leurs sources de choix

## Sprint 3 - Formations

### Objectif

Livrer la premiere verticale metier staff avec liste, detail et filtres.

### Endpoints

- `GET /api/formations/`
- `GET /api/formations/{id}/`
- `GET /api/formations/filtres/`
- `GET /api/formations/liste-simple/`

### Ecrans

- liste formations
- detail formation
- panneau de filtres

### Pourquoi commencer ici

- domaine lisible
- utile a presque tout le reste
- bon terrain pour valider pagination + filtres + detail

## Sprint 4 - Candidats

### Objectif

Livrer la seconde verticale metier prioritaire, avec actions staff.

### Endpoints

- `GET /api/candidats/`
- `GET /api/candidats/{id}/`
- `GET /api/candidats/meta/`
- `POST /api/candidats/{id}/creer-compte/`
- `POST /api/candidats/{id}/valider-demande-compte/`
- `POST /api/candidats/{id}/refuser-demande-compte/`

### Ecrans

- liste candidats
- detail candidat
- bloc actions compte

### Attention

Les actions compte doivent afficher:
- confirmation
- erreurs metier lisibles
- rechargement propre du detail apres action

## Sprint 5 - Prospections

### Objectif

Livrer la verticale commerciale principale.

### Endpoints

- `GET /api/prospections/`
- `GET /api/prospections/{id}/`
- `GET /api/prospections/filtres/`
- `GET /api/prospections/choices/`
- `POST /api/prospections/`
- `PUT/PATCH /api/prospections/{id}/`
- `POST /api/prospections/{id}/changer-statut/`
- `POST /api/prospections/{id}/archiver/`
- `POST /api/prospections/{id}/desarchiver/`

### Ecrans

- liste prospections
- detail prospection
- creation / edition
- changement de statut

### Definition of done

- parcours principal prospection utilisable par staff
- filtres avances consommes proprement

## Sprint 6 - Partenaires

### Objectif

Connecter l'annuaire et les fiches partenaires.

### Endpoints

- `GET /api/partenaires/`
- `GET /api/partenaires/{id}/`
- `GET /api/partenaires/filter-options/`
- `GET /api/partenaires/choices/`
- `GET /api/partenaires/{id}/with-relations/`

### Ecrans

- liste partenaires
- detail enrichi partenaire
- filtres annuaire

## Sprint 7 - Appairages

### Objectif

Livrer le coeur du suivi placement.

### Endpoints

- `GET /api/appairages/`
- `GET /api/appairages/{id}/`
- `GET /api/appairages/meta/`
- `GET /api/appairages/{id}/commentaires/`
- `POST /api/appairages/{id}/commentaires/`
- `POST /api/appairages/{id}/archiver/`
- `POST /api/appairages/{id}/desarchiver/`

### Ecrans

- liste appairages
- detail appairage
- fil de commentaires

## Sprint 8 - Documents Et CV

### Objectif

Brancher les usages documentaires.

### Endpoints

- `GET /api/cvtheque/`
- `GET /api/cvtheque/{id}/download/`
- `GET /api/cvtheque/{id}/preview/`
- `GET /api/documents/`
- `GET /api/documents/par-formation/`
- `GET /api/documents/{id}/download/`

### Ecrans

- liste CV
- preview / download
- liste documents formation

## Sprint 9 - Modules Specifiques

### Objectif

Traiter ensuite seulement les modules plus specialises.

### Modules

- `prepa`
- `declic`
- `ateliers-tre`
- stats dediees

### Raison du report

- plus specialises
- moins critiques pour le premier front utilisable
- dependants d'un socle deja stable

## Ce Qu'Il Faut Reporter Volontairement

Ne pas mettre dans les premiers sprints:

- exports binaires complexes
- dashboards de stats complets
- parcours admin tres secondaires
- modules rares
- refonte visuelle lourde trop tot

## Checklist Par Sprint

Pour chaque sprint:

1. verifier les endpoints cibles
2. brancher les types de reponse
3. gerer les erreurs standard
4. couvrir les cas vides
5. verifier les roles visibles
6. tester la pagination si liste
7. tester mobile si Expo

## Risques A Eviter

- commencer par les stats au lieu des parcours metier
- consommer l'API sans client central
- gerer les erreurs au cas par cas sans convention unique
- attaquer trop de modules en parallele

## Ordre Recommande Resume

1. auth
2. referentiels
3. formations
4. candidats
5. prospections
6. partenaires
7. appairages
8. documents / cv
9. modules specialises

## Resultat Attendu

Si cet ordre est respecte:

- le front devient vite demonstrable
- les risques de blocage diminuent
- les modules les plus utiles sont livres en premier
- le backend stabilise reste consomme de facon coherente
