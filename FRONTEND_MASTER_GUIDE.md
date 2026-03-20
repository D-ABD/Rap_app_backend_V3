# Frontend Master Guide

Date: 2026-03-20

## But

Centraliser dans un seul document :

- le guide d'integration front/backend
- le plan d'execution par sprint
- la matrice de roles
- la checklist ecran par ecran

Ce document devient la reference unique pour brancher le front React / Expo sur le backend.

Regle de lecture :

- le code backend reste la source de verite
- ce document ne doit lister que des routes, roles et contrats vraiment exposes par le code actuel
- quand deux endpoints font doublon, le document le signale explicitement

## 1. Vision D'Ensemble

Le backend est stabilise.

Le front doit maintenant avancer :

- avec un client API unique
- par verticales fonctionnelles
- en respectant les roles et permissions deja portes par le backend
- en migrant progressivement du legacy `statut` vers `parcours_phase`

## 2. Base Technique

### Base API

- base URL API : `/api/`
- authentification principale : JWT
- pagination standard : `RapAppPagination`
- format d'erreur standard : `api_exception_handler`

### Convention JSON Standard

#### Succes simple

```json
{
  "success": true,
  "message": "Operation reussie.",
  "data": {}
}
```

#### Succes pagine

```json
{
  "success": true,
  "message": "Liste paginee des resultats.",
  "data": {
    "count": 0,
    "page": 1,
    "page_size": 10,
    "total_pages": 1,
    "next": null,
    "previous": null,
    "results": []
  }
}
```

#### Erreur de validation

```json
{
  "success": false,
  "message": "Erreur de validation.",
  "data": null,
  "errors": {
    "field": ["message"]
  }
}
```

#### Erreur standard

```json
{
  "success": false,
  "message": "Message d'erreur.",
  "data": null
}
```

### Exceptions Au Format JSON Standard

Ces endpoints ne renvoient pas l'enveloppe JSON standard :

- exports `csv`
- exports `xlsx`
- exports `pdf`
- downloads de fichiers
- previews binaires

Le front doit les traiter comme :

- `blob`
- `arrayBuffer`
- ou ouverture navigateur / lecteur natif selon le cas

## 3. Authentification Et Session

### Endpoints

- `POST /api/token/`
- `POST /api/token/refresh/`
- `POST /api/register/`
- `GET /api/me/`
- `GET /api/roles/`
- `GET /api/users/me/`
- `GET /api/users/roles/`
- `POST /api/me/demande-compte/`

Notes code :

- `GET /api/me/` et `GET /api/users/me/` coexistent
- `GET /api/roles/` et `GET /api/users/roles/` coexistent
- pour un front neuf, `me` / `roles` sont les chemins les plus simples a utiliser

### Strategie Front Recommandee

1. stocker `access` et `refresh`
2. envoyer `Authorization: Bearer <access>`
3. intercepter `401`
4. tenter `POST /api/token/refresh/`
5. si refresh echoue, vider la session et revenir a l'ecran login

## 4. Client API A Construire En Premier

Avant les ecrans metier, livrer :

### Client API

- base URL centralisee
- ajout automatique du bearer token
- refresh token automatique
- parsing du format `success / message / data / errors`
- gestion des blobs pour exports et downloads

### Gestion De Session

- ecran login
- bootstrap utilisateur courant
- stockage local du JWT
- garde de routes / ecrans selon etat de session

### Primitives UI

- liste paginee
- filtre simple
- formulaire avec erreurs par champ
- loader
- empty state
- toast ou feedback d'action

## 5. Matrice Des Roles

Le backend reste la source de verite.

Le front doit :

- masquer ce qui est clairement interdit
- passer en lecture seule quand necessaire
- afficher les erreurs serveur si une action reste refusee

### Roles Consideres

- `admin`
- `superadmin`
- `staff`
- `staff_read`
- `candidat`
- `candidatuser`
- `stagiaire`
- `prepa_staff`
- `declic_staff`

### Admin / Superadmin

Niveau :

- acces global
- lecture et ecriture larges

UI :

- afficher tous les modules
- afficher toutes les actions CRUD
- afficher les actions d'administration

### Staff

Niveau :

- lecture et ecriture sur son perimetre
- scope centre applique cote backend

UI :

- afficher les modules metier staff
- afficher les boutons create / edit / status / archive si l'ecran le permet
- ne pas promettre un acces hors perimetre centre

### Staff Read

Niveau :

- lecture seule sur les modules staff
- pas d'ecriture

UI :

- afficher les ecrans de consultation
- masquer ou desactiver :
  - create
  - edit
  - archive
  - delete
  - changements de statut
  - actions metier d'ecriture

### Candidat / Candidatuser / Stagiaire

Niveau :

- acces limite a ses propres ressources ou a des ressources explicitement exposees

UI :

- experience centree sur :
  - profil
  - ses prospections autorisees
  - son dossier selon les endpoints disponibles
- masquer les modules staff

### Prepa Staff

Niveau :

- acces specialise au domaine `prepa`

UI :

- afficher les ecrans `prepa`
- ne pas exposer automatiquement tous les modules staff generaux sans validation metier

### Declic Staff

Niveau :

- acces specialise au domaine `declic`

UI :

- afficher les ecrans `declic`
- ne pas exposer automatiquement tous les modules staff generaux sans validation metier

## 6. Matrice Par Domaine

### Session / Profil

Endpoints :

- `/api/me/`
- `/api/roles/`
- `/api/users/me/`

Acces :

- tous les utilisateurs authentifies

### Formations

Endpoints :

- `/api/formations/`
- `/api/formations/{id}/`
- `/api/formations/filtres/`

Acces :

- `admin`, `superadmin`, `staff`, `staff_read`

### Candidats

Endpoints :

- `/api/candidats/`
- `/api/candidats/{id}/`
- `/api/candidats/meta/`

Acces :

- principalement `admin`, `superadmin`, `staff`, `staff_read`

### Prospections

Endpoints :

- `/api/prospections/`
- `/api/prospections/{id}/`
- `/api/prospections/filtres/`
- `/api/prospections/choices/`

Acces :

- `admin`, `superadmin`, `staff`, `staff_read`
- `candidat`, `candidatuser`, `stagiaire` avec restrictions metier

Attention :

- ne jamais proposer a `candidat` / `candidatuser` / `stagiaire` de changer `owner`
- ne jamais proposer a `candidat` / `candidatuser` / `stagiaire` de changer `formation`

### Partenaires

Endpoints :

- `/api/partenaires/`
- `/api/partenaires/{id}/`
- `/api/partenaires/filter-options/`
- `/api/partenaires/{id}/with-relations/`

Acces :

- experience principale reservee aux profils staff
- `staff_read` en lecture seule

### Appairages

Endpoints :

- `/api/appairages/`
- `/api/appairages/{id}/`
- `/api/appairages/meta/`
- `/api/appairages/{id}/commentaires/`

Acces :

- `admin`, `superadmin`, `staff`, `staff_read`

### Documents Et CV

Endpoints :

- `/api/documents/`
- `/api/cvtheque/`
- downloads / previews associes

Acces :

- depend du scope et des permissions metier

### Modules Specifiques

#### Prepa

- `/api/prepa/`
- `/api/prepa-objectifs/`
- `/api/prepa-stats/`

#### Declic

- `/api/declic/`
- `/api/objectifs-declic/`
- `/api/declic-stats/`

## 7. Endpoints Prioritaires Par Domaine

### Referentiels UI

- `GET /api/centres/liste-simple/`
- `GET /api/formations/liste-simple/`
- `GET /api/statuts/choices/`
- `GET /api/typeoffres/choices/`
- `GET /api/evenements/choices/`
- `GET /api/partenaires/choices/`

### Formations

- `GET /api/formations/`
- `GET /api/formations/{id}/`
- `GET /api/formations/filtres/`
- `GET /api/formations/liste-simple/`
- `POST /api/formations/{id}/archiver/`
- `POST /api/formations/{id}/desarchiver/`

### Candidats

- `GET /api/candidats/`
- `GET /api/candidats/{id}/`
- `GET /api/candidats/meta/`
- `POST /api/candidats/{id}/creer-compte/`
- `POST /api/candidats/{id}/validate-inscription/`
- `POST /api/candidats/{id}/start-formation/`
- `POST /api/candidats/{id}/complete-formation/`
- `POST /api/candidats/{id}/abandon/`
- `POST /api/candidats/{id}/valider-demande-compte/`
- `POST /api/candidats/{id}/refuser-demande-compte/`

### Prospections

- `GET /api/prospections/`
- `GET /api/prospections/{id}/`
- `GET /api/prospections/filtres/`
- `GET /api/prospections/choices/`
- `GET /api/prospection-comments/`
- `GET /api/prospection-commentaires/`
- `POST /api/prospections/`
- `PUT/PATCH /api/prospections/{id}/`
- `POST /api/prospections/{id}/changer-statut/`
- `POST /api/prospections/{id}/archiver/`
- `POST /api/prospections/{id}/desarchiver/`

### Partenaires

- `GET /api/partenaires/`
- `GET /api/partenaires/{id}/`
- `GET /api/partenaires/filter-options/`
- `GET /api/partenaires/choices/`
- `GET /api/partenaires/{id}/with-relations/`

### Appairages

- `GET /api/appairages/`
- `GET /api/appairages/{id}/`
- `GET /api/appairages/meta/`
- `GET /api/appairages/{id}/commentaires/`
- `POST /api/appairages/{id}/commentaires/`
- `POST /api/appairages/{id}/archiver/`
- `POST /api/appairages/{id}/desarchiver/`

### Candidats Bulk

- `POST /api/candidats/bulk/validate-inscription/`
- `POST /api/candidats/bulk/start-formation/`
- `POST /api/candidats/bulk/abandon/`
- `POST /api/candidats/bulk/assign-atelier-tre/`

### CV Et Documents

- `GET /api/cvtheque/`
- `GET /api/cvtheque/{id}/download/`
- `GET /api/cvtheque/{id}/preview/`
- `GET /api/documents/`
- `GET /api/documents/par-formation/`
- `GET /api/documents/{id}/download/`

## 8. Migration Statut Vers Parcours Phase

Le backend expose maintenant deux niveaux de lecture pour les candidats :

- `statut`
  - champ legacy encore supporte
  - ne doit plus etre considere comme la future source de verite
- `parcours_phase`
  - nouvelle phase persistée
- `parcours_phase_calculee`
  - lecture dérivée du backend

### Regles Front

1. ne pas supprimer immédiatement l'usage de `statut`
2. commencer à lire `parcours_phase` si présent
3. utiliser `parcours_phase_choices` depuis `GET /api/candidats/meta/`
4. filtrer les listes avec `parcours_phase=value` ou `parcoursPhase=value`
5. préférer les endpoints de transition plutôt qu'une édition directe

### Meta Candidats A Exploiter

Le endpoint `GET /api/candidats/meta/` expose :

- `phase_contract`
- `phase_filter_aliases`
- `phase_ordering_fields`
- `phase_transition_actions`
- `phase_read_only_fields`
- `parcours_phase_choices`
- infos RGPD utiles

### Champs Utiles Sur Le Detail Candidat

- `parcours_phase`
- `parcours_phase_display`
- `parcours_phase_calculee`
- `is_inscrit_valide`
- `is_en_formation_now`
- `is_stagiaire_role_aligned`
- `has_compte_utilisateur`

## 9. Plan D'Execution Recommande

### Sprint 1 - Auth Et Bootstrap

Objectif :

- login fonctionnel
- refresh token fonctionnel
- utilisateur courant charge au demarrage
- role disponible partout dans l'app

Ecrans :

- login
- splash / bootstrap
- profil courant simple
- shell navigation selon role

### Sprint 2 - Referentiels Et Filtres

Livrables :

- hooks de referentiels
- cache simple des choices
- composants select / multi-select

### Sprint 3 - Formations

Ecrans :

- liste formations
- detail formation
- panneau de filtres

### Sprint 4 - Candidats

Ecrans :

- liste candidats
- detail candidat
- bloc actions compte
- actions de transition de phase

### Sprint 5 - Prospections

Ecrans :

- liste prospections
- detail prospection
- creation / edition
- changement de statut

### Sprint 6 - Partenaires

Ecrans :

- liste partenaires
- detail enrichi partenaire
- filtres annuaire

### Sprint 7 - Appairages

Ecrans :

- liste appairages
- detail appairage
- fil de commentaires

### Sprint 8 - Documents Et CV

Ecrans :

- liste CV
- preview / download
- liste documents formation

### Sprint 9 - Modules Specifiques

Modules :

- `prepa`
- `declic`
- `atelier TRE`
- stats
- exports

## 10. Checklist Ecran Par Ecran

## Regle Generale

Pour chaque ecran :

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
- presence de `parcours_phase_choices`
- presence de `phase_contract` et `phase_transition_actions`
- presence de `phase_filter_aliases` et `phase_ordering_fields`
- acces `staff_read`

## 6. Detail Candidat

### Endpoints

- `GET /api/candidats/{id}/`
- `POST /api/candidats/{id}/creer-compte/`
- `POST /api/candidats/{id}/validate-inscription/`
- `POST /api/candidats/{id}/start-formation/`
- `POST /api/candidats/{id}/complete-formation/`
- `POST /api/candidats/{id}/abandon/`
- `POST /api/candidats/{id}/valider-demande-compte/`
- `POST /api/candidats/{id}/refuser-demande-compte/`

### Etats UI

- detail charge
- actions staff visibles
- actions masquees pour lecture seule
- coexistence `statut` / `parcours_phase`

### Cas a tester

- creer compte reussi
- validation inscription reussie
- entree en formation enregistree
- sortie de formation enregistree
- abandon enregistre
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
- refus ecriture `candidat` / `candidatuser` / `stagiaire` sur champs interdits

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

## 11. Cas D'Erreur A Mutualiser

Le front doit avoir des handlers communs pour :

- `401`
- `403`
- `404`
- `400` avec `errors`
- erreur reseau
- timeout

## 12. Checklist Finale Avant Livraison D'Un Ecran

- l'appel API marche
- le parsing de `data` est correct
- le role courant est respecte
- le mode lecture seule est gere
- l'etat vide est propre
- les erreurs sont affichables
- la pagination est correcte si presente

## 13. Recommandation Finale

Le meilleur ordre de demarrage reste :

1. auth + bootstrap session
2. referentiels partages
3. formations
4. candidats
5. prospections

Puis :

- partenaires
- appairages
- documents / CV
- modules specialises
