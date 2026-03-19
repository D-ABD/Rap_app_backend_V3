# Frontend Screen Checklist

Date: 2026-03-19

## But

Donner une checklist directement exploitable pour brancher le front ecran par ecran.

Chaque bloc repond a:
- quels endpoints appeler
- quels etats UI gerer
- quels cas d'erreur tester

## Regle Generale

Pour chaque ecran:

1. charger les donnees principales
2. gerer loading / empty / error
3. gerer pagination si liste
4. gerer permissions UI selon role
5. tester les erreurs backend standards

## 1. Login

### Endpoints

- `POST /api/token/`

### Etats UI

- loading submit
- erreur identifiants
- succes avec stockage tokens

### Cas a tester

- mauvais email / mot de passe
- token recu et session ouverte
- message d'erreur generique affiche

## 2. Bootstrap Session

### Endpoints

- `GET /api/me/`
- `GET /api/roles/`
- `POST /api/token/refresh/`

### Etats UI

- splash loading
- refresh token reussi
- refresh token echoue

### Cas a tester

- access expire + refresh valide
- access expire + refresh invalide
- role courant bien charge

## 3. Liste Formations

### Endpoints

- `GET /api/formations/`
- `GET /api/formations/filtres/`

### Etats UI

- liste paginee
- filtres ouverts / fermes
- empty state
- lecture seule pour `staff_read`

### Cas a tester

- page suivante
- filtre centre
- filtre statut
- erreur reseau

## 4. Detail Formation

### Endpoints

- `GET /api/formations/{id}/`
- `POST /api/formations/{id}/archiver/`
- `POST /api/formations/{id}/desarchiver/`

### Etats UI

- detail charge
- action archive en cours
- confirmation action

### Cas a tester

- detail accessible
- archive reussie
- archive refusee pour lecture seule

## 5. Liste Candidats

### Endpoints

- `GET /api/candidats/`
- `GET /api/candidats/meta/`

### Etats UI

- liste paginee
- filtres meta
- empty state

### Cas a tester

- pagination
- filtre formation
- filtre centre
- acces `staff_read`

## 6. Detail Candidat

### Endpoints

- `GET /api/candidats/{id}/`
- `POST /api/candidats/{id}/creer-compte/`
- `POST /api/candidats/{id}/valider-demande-compte/`
- `POST /api/candidats/{id}/refuser-demande-compte/`

### Etats UI

- detail charge
- actions staff visibles
- actions masquees pour lecture seule

### Cas a tester

- creer compte reussi
- validation demande reussie
- refus demande reussi
- erreur metier affichee sur action

## 7. Liste Prospections

### Endpoints

- `GET /api/prospections/`
- `GET /api/prospections/filtres/`
- `GET /api/prospections/choices/`

### Etats UI

- liste paginee
- filtres multiples
- tri
- lecture seule pour `staff_read`

### Cas a tester

- filtre partenaire
- filtre formation
- filtre owner
- changement de page

## 8. Detail Prospection

### Endpoints

- `GET /api/prospections/{id}/`
- `PUT/PATCH /api/prospections/{id}/`
- `POST /api/prospections/{id}/changer-statut/`
- `POST /api/prospections/{id}/archiver/`
- `POST /api/prospections/{id}/desarchiver/`

### Etats UI

- detail charge
- edition
- changement statut
- message de succes

### Cas a tester

- update simple
- changement statut
- archive / desarchive
- refus ecriture `staff_read`
- refus ecriture `candidate` sur champs interdits

## 9. Liste Partenaires

### Endpoints

- `GET /api/partenaires/`
- `GET /api/partenaires/filter-options/`

### Etats UI

- liste paginee
- filtres
- empty state

### Cas a tester

- filtre ville
- filtre secteur
- filtre centre

## 10. Detail Partenaire

### Endpoints

- `GET /api/partenaires/{id}/`
- `GET /api/partenaires/{id}/with-relations/`

### Etats UI

- detail standard
- compteurs enrichis

### Cas a tester

- detail enrichi charge
- affichage compteurs
- acces lecture seule

## 11. Liste Appairages

### Endpoints

- `GET /api/appairages/`
- `GET /api/appairages/meta/`

### Etats UI

- liste paginee
- filtres meta

### Cas a tester

- liste chargee
- filtre statut
- filtre formation
- acces `staff_read`

## 12. Detail Appairage

### Endpoints

- `GET /api/appairages/{id}/`
- `GET /api/appairages/{id}/commentaires/`
- `POST /api/appairages/{id}/commentaires/`
- `POST /api/appairages/{id}/archiver/`
- `POST /api/appairages/{id}/desarchiver/`

### Etats UI

- detail charge
- fil de commentaires
- creation commentaire

### Cas a tester

- commentaire cree
- erreur validation commentaire
- archive / desarchive
- lecture seule `staff_read`

## 13. CVTheque

### Endpoints

- `GET /api/cvtheque/`
- `GET /api/cvtheque/{id}/download/`
- `GET /api/cvtheque/{id}/preview/`

### Etats UI

- liste paginee
- action preview
- action download

### Cas a tester

- telechargement ok
- preview ok
- acces refuse hors scope

## 14. Documents

### Endpoints

- `GET /api/documents/`
- `GET /api/documents/par-formation/`
- `GET /api/documents/{id}/download/`

### Etats UI

- liste
- filtre formation
- download

### Cas a tester

- documents par formation
- download
- refus hors scope

## 15. Modules Specifiques

### Prepa

- `GET /api/prepa/`
- `GET /api/prepa/filters/`
- `GET /api/prepa-objectifs/`

### Declic

- `GET /api/declic/`
- `GET /api/declic/filters/`
- `GET /api/objectifs-declic/`

### Atelier TRE

- `GET /api/ateliers-tre/`
- `GET /api/ateliers-tre/meta/`

### Cas a tester

- affichage par role autorise
- lecture seule si besoin
- filtres meta

## Cas D'Erreur A Mutualiser Cote Front

Le front doit avoir des handlers communs pour:

- `401`
- `403`
- `404`
- `400` avec `errors`
- erreur reseau
- timeout

## Checklist Finale Avant Livraison D'Un Ecran

- l'appel API marche
- le parsing de `data` est correct
- le role courant est respecte
- le mode lecture seule est gere
- l'etat vide est propre
- les erreurs sont affichables
- la pagination est correcte si presente
