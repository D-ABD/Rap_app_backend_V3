# Frontend Role Matrix

Date: 2026-03-19

## But

Donner au front une matrice simple:
- role
- niveau d'acces
- ecrans a afficher
- ecrans a masquer
- actions a bloquer en UI

Ce document ne remplace pas les permissions backend.
Il sert a construire une UX coherente avec les regles serveur.

## Roles Consideres

- `admin`
- `superadmin`
- `staff`
- `staff_read`
- `candidate`
- `prepa_staff`
- `declic_staff`

## Regle Front A Retenir

Le backend reste la source de verite.

Le front doit:
- masquer ce qui est clairement interdit
- passer en lecture seule quand necessaire
- afficher les erreurs serveur si une action reste refusee

## Familles De Droits

### Admin / Superadmin

Niveau:
- acces global
- lecture et ecriture larges

UI:
- afficher tous les modules
- afficher toutes les actions CRUD
- afficher les actions d'administration

### Staff

Niveau:
- lecture et ecriture sur son perimetre
- scope centre applique cote backend

UI:
- afficher les modules metier staff
- afficher les boutons create / edit / status / archive si l'ecran le permet
- ne pas promettre un acces hors perimetre centre

### Staff Read

Niveau:
- lecture seule sur les modules staff
- pas d'ecriture

UI:
- afficher les ecrans de consultation
- masquer ou desactiver:
  - create
  - edit
  - archive
  - delete
  - changements de statut
  - actions metier d'ecriture

### Candidate

Niveau:
- acces limite a ses propres ressources ou a des ressources explicitement exposees

UI:
- experience centre sur:
  - profil
  - ses prospections autorisees
  - son dossier selon les endpoints disponibles
- masquer les modules staff

### Prepa Staff

Niveau:
- acces specialise au domaine `prepa`
- pas forcement equivalence totale avec `staff` global

UI:
- afficher les ecrans `prepa`
- ne pas exposer automatiquement tous les modules staff generaux sans confirmation metier

### Declic Staff

Niveau:
- acces specialise au domaine `declic`

UI:
- afficher les ecrans `declic`
- ne pas exposer automatiquement tous les modules staff generaux sans confirmation metier

## Matrice Par Domaine

## 1. Session / Profil

Endpoints:
- `/api/me/`
- `/api/roles/`
- `/api/users/me/`

Acces:
- tous les utilisateurs authentifies

Front:
- toujours afficher

## 2. Formations

Endpoints:
- `/api/formations/`
- `/api/formations/{id}/`
- `/api/formations/filtres/`

Acces:
- `admin`, `superadmin`, `staff`, `staff_read`

Front:
- `admin`, `superadmin`, `staff`: liste + detail + actions si disponibles
- `staff_read`: liste + detail en lecture seule
- `candidate`: masquer par defaut, sauf besoin produit explicite plus tard

## 3. Candidats

Endpoints:
- `/api/candidats/`
- `/api/candidats/{id}/`
- `/api/candidats/meta/`

Acces:
- principalement `admin`, `superadmin`, `staff`, `staff_read`

Front:
- `staff_read`: detail consultatif uniquement
- `staff`: afficher les actions metier autorisees
- `candidate`: ne pas reemployer ces ecrans staff

## 4. Prospections

Endpoints:
- `/api/prospections/`
- `/api/prospections/{id}/`
- `/api/prospections/filtres/`
- `/api/prospections/choices/`

Acces:
- `admin`, `superadmin`, `staff`, `staff_read`
- `candidate` avec restrictions metier

Front:
- `staff`: liste + create + edit + status
- `staff_read`: liste + detail seulement
- `candidate`: experience restreinte a ses prospections visibles

Attention:
- ne jamais proposer au `candidate` de changer `owner`
- ne jamais proposer au `candidate` de changer `formation`

## 5. Partenaires

Endpoints:
- `/api/partenaires/`
- `/api/partenaires/{id}/`
- `/api/partenaires/filter-options/`
- `/api/partenaires/{id}/with-relations/`

Acces:
- `admin`, `superadmin`, `staff`, `staff_read`
- certains cas limites non-staff lies a la creation ou a la propriete existent cote backend

Front recommande:
- experience principale reservee aux profils staff
- `staff_read`: lecture seule
- ne pas construire d'UX grand public sur les cas limites non-staff

## 6. Appairages

Endpoints:
- `/api/appairages/`
- `/api/appairages/{id}/`
- `/api/appairages/meta/`
- `/api/appairages/{id}/commentaires/`

Acces:
- `admin`, `superadmin`, `staff`, `staff_read`

Front:
- `staff`: workflow complet
- `staff_read`: lecture seule
- `candidate`: masquer

## 7. Commentaires Staff

Endpoints:
- `/api/commentaires/`
- `/api/prospection-commentaires/`
- `/api/appairage-commentaires/`

Acces:
- surtout profils staff

Front:
- `staff_read`: consulter
- `staff`: consulter et agir selon endpoint
- `candidate`: seulement si un endpoint candidat est explicitement prevu, sinon masquer

## 8. Documents Et CV

Endpoints:
- `/api/documents/`
- `/api/cvtheque/`
- downloads / previews associes

Acces:
- depend du scope et des permissions metier

Front:
- ne pas exposer sans verifier le role courant
- afficher les telechargements seulement si l'ecran est accessible

## 9. Modules Specifiques

### Prepa

Endpoints:
- `/api/prepa/`
- `/api/prepa-objectifs/`
- `/api/prepa-stats/`

Front:
- afficher pour `prepa_staff`
- afficher aussi si le produit decide d'ouvrir a `admin` / `staff`
- a verifier avec les parcours reels du projet

### Declic

Endpoints:
- `/api/declic/`
- `/api/objectifs-declic/`
- `/api/declic-stats/`

Front:
- afficher pour `declic_staff`
- afficher aussi si le produit decide d'ouvrir a `admin` / `staff`

## Comportements UI Recommandes

## Boutons A Masquer Pour `staff_read`

- creer
- modifier
- supprimer
- archiver
- desarchiver si cela change l'etat
- changer statut
- actions bulk d'ecriture

## Ecrans A Mettre En Lecture Seule

- formations
- candidats
- prospections
- partenaires
- appairages

## Ecrans A Charger Selon Role

### Menu staff

- formations
- candidats
- prospections
- partenaires
- appairages
- documents
- commentaires

### Menu candidate

- profil
- ressources personnelles
- prospections personnelles si produit retenu

### Menu specialise

- `prepa_staff` -> prepa
- `declic_staff` -> declic

## Strategie De Gating Front

Ordre recommande:

1. lire `me`
2. lire le role courant
3. deriver un `uiAccessProfile`
4. construire le menu a partir de ce profil
5. garder le backend comme dernier arbitre

## Profil UI Minimal Recommande

Exemple de flags front utiles:

- `canReadStaffModules`
- `canWriteStaffModules`
- `isReadOnlyStaff`
- `canAccessPrepa`
- `canAccessDeclic`
- `isCandidate`
- `isAdminLike`

## A Ne Pas Faire

- deduire toute la securite uniquement du front
- supposer que `staff` voit tout sans scope
- supposer que `candidate` peut consommer les memes ecrans que `staff`
- ouvrir les modules `prepa` et `declic` sans verification role/parcours

## Resume

Pour le front:
- `admin` et `superadmin` = acces fort
- `staff` = acces metier en ecriture, mais scope
- `staff_read` = lecture seule
- `candidate` = experience restreinte et separee
- `prepa_staff` / `declic_staff` = modules specialises a brancher explicitement
