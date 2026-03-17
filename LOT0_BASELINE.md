# LOT0_BASELINE

## Objet

Livrable du `Lot 0` du plan d'execution : inventaire initial du backend avant harmonisation du contrat API.

Ce document sert de base de travail pour le `Lot 1 - Contrat API et erreurs`.

## Contexte de confiance

- La suite locale annonce `361 passed, 6 skipped`.
- Le projet expose une API DRF large, avec un melange de CRUD, d'actions custom metier, d'endpoints stats et d'APIViews hors router.
- Le schema OpenAPI n'est pas aujourd'hui une source de verite fiable : sa generation echoue.

## Surface API exposee

### Endpoints hors router

Prefixe commun : `/api/`

- `POST /register/`
- `POST /token/`
- `POST /token/refresh/`
- `GET /test-token/`
- `GET /search/`
- `GET|PATCH /me/`
- `GET /roles/`
- `POST /me/demande-compte/`

### Resources router principales

Prefixe commun : `/api/`

- `health`
- `users`
- `centres`
- `statuts`
- `typeoffres`
- `formations`
- `documents`
- `evenements`
- `commentaires`
- `candidats`
- `appairages`
- `appairage-commentaires`
- `ateliers-tre`
- `partenaires`
- `prospections`
- `prospection-comments`
- `prospection-commentaires`
- `prepa`
- `prepa-objectifs`
- `prepa-stats`
- `declic`
- `objectifs-declic`
- `declic-stats`
- `cvtheque`
- `logs`
- `rapports`
- `formation-stats`
- `prospection-stats`
- `candidat-stats`
- `partenaire-stats`
- `ateliertre-stats`
- `appairage-stats`
- `commentaire-stats`
- `prospection-comment-stats`
- `appairage-commentaire-stats`

## Actions custom detectees

Les actions ci-dessous constituent la principale zone de risque contractuel pour le front, car elles sortent du CRUD standard.

### Formations

- `/formations/filtres/`
- `/formations/{id}/documents/`
- `/formations/{id}/candidats/`
- `/formations/{id}/commentaires/`
- `/formations/{id}/evenements/`
- `/formations/{id}/appairages/`
- `/formations/{id}/duplicate/`
- `/formations/{id}/close/`
- `/formations/{id}/add_commentaire/`
- `/formations/{id}/remove_commentaire/`
- `/formations/liste-simple/`
- `/formations/{id}/archiver/`
- `/formations/{id}/desarchiver/`
- `/formations/archivees/`
- `/formations/export-xlsx/`

### Candidats

- `/candidats/{id}/creer-compte/`
- `/candidats/{id}/valider-demande-compte/`
- `/candidats/{id}/refuser-demande-compte/`
- `/candidats/meta/`
- `/candidats/export-xlsx/`

### Prospections

- `/prospections/filtres/`
- `/prospections/{id}/archiver/`
- `/prospections/{id}/desarchiver/`
- `/prospections/{id}/changer-statut/`
- `/prospections/choices/`
- `/prospections/export-xlsx/`

### Prospection comments

- `/prospection-comments/filter-options/`
- `/prospection-comments/{id}/archiver/`
- `/prospection-comments/{id}/desarchiver/`
- `/prospection-comments/export-xlsx/`
- `/prospection-comments/export-pdf/`

Alias du meme ViewSet :
- `/prospection-commentaires/...`

### Appairages

- `/appairages/meta/`
- `/appairages/{id}/commentaires/`
- `/appairages/{id}/archiver/`
- `/appairages/{id}/desarchiver/`
- `/appairages/export-xlsx/`

### Appairage commentaires

- `/appairage-commentaires/{id}/archiver/`
- `/appairage-commentaires/{id}/desarchiver/`
- `/appairage-commentaires/export-xlsx/`
- `/appairage-commentaires/export-pdf/`

### Documents

- `/documents/par-formation/`
- `/documents/export-csv/`
- `/documents/types/`
- `/documents/filtres/`
- `/documents/{id}/download/`

### Commentaires

- `/commentaires/filter-options/`
- `/commentaires/saturation-stats/`
- `/commentaires/meta/`
- `/commentaires/{id}/archiver/`
- `/commentaires/{id}/desarchiver/`
- `/commentaires/export/`

### Partenaires

- `/partenaires/choices/`
- `/partenaires/filter-options/`
- `/partenaires/{id}/with-relations/`
- `/partenaires/export-xlsx/`

### Users

- `/users/{id}/delete-account/`
- `/users/deactivate/`
- `/users/{id}/reactivate/`
- `/users/me/`
- `/users/roles/`
- `/users/liste-simple/`
- `/users/filtres/`

### CVTheque

- `/cvtheque/{id}/download/`
- `/cvtheque/{id}/preview/`

### Centres

- `/centres/liste-simple/`

### Statuts et types d'offre

- `/statuts/choices/`
- `/typeoffres/choices/`

### Evenements

- `/evenements/export-csv/`
- `/evenements/stats-par-type/`
- un `GET` custom supplementaire sans `url_path` explicite est present dans le viewset

### Atelier TRE

- `/ateliers-tre/meta/`
- `/ateliers-tre/{id}/add-candidats/`
- `/ateliers-tre/{id}/remove-candidats/`
- `/ateliers-tre/{id}/set-presences/`
- `/ateliers-tre/{id}/mark-present/`
- `/ateliers-tre/{id}/mark-absent/`
- `/ateliers-tre/export-xlsx/`

### Prepa

- `/prepa/filters/`
- `/prepa/meta/`
- `/prepa/stats-centres/`
- `/prepa/stats-departements/`
- `/prepa/reste-a-faire-total/`
- `/prepa/export-xlsx/`

### Prepa objectifs

- `/prepa-objectifs/filters/`
- `/prepa-objectifs/synthese/`
- `/prepa-objectifs/export-xlsx/`

### Declic

- `/declic/filters/`
- `/declic/stats-centres/`
- `/declic/stats-departements/`
- `/declic/export-xlsx/`

### Objectifs declic

- `/objectifs-declic/filters/`
- `/objectifs-declic/synthese/`
- `/objectifs-declic/export-xlsx/`

### Endpoints stats

Ils sont nombreux et majoritairement hors contrat CRUD standard. Ils exposent notamment :

- `grouped`
- `tops`
- `latest`
- `filter-options`
- `filters`
- `synthese`
- `resume`
- `export-xlsx`

Ressources concernees :
- `formation-stats`
- `prospection-stats`
- `candidat-stats`
- `partenaire-stats`
- `ateliertre-stats`
- `appairage-stats`
- `commentaire-stats`
- `prospection-comment-stats`
- `appairage-commentaire-stats`
- `prepa-stats`
- `declic-stats`

## Endpoints deja identifies comme heterogenes

Ces endpoints sont la cible immediate du `Lot 1`.

- `documents.list`
- `documents.filtres`
- `formations.filtres`
- `candidats.meta`
- `prospections.filtres`
- `cvtheque.list`
- `register`

## Tableau de priorisation front

### Priorite P1 front

Endpoints a stabiliser en premier pour rendre le backend consommable cote React/Expo :

- `formations`
- `candidats`
- `prospections`
- `appairages`
- `documents`
- `users`
- `cvtheque`
- `me`
- `token`
- `register`

### Priorite P2 front

- `partenaires`
- `commentaires`
- `evenements`
- `centres`
- `statuts`
- `typeoffres`

### Priorite P3 front

- `prepa`
- `declic`
- endpoints `stats`
- exports `xlsx/csv/pdf`

## Couverture de tests visible par domaine

### Candidats

Tests presents :
- `tests_models/tests_candidat_accounts.py`
- `tests_viewsets/tests_candidat_accounts_viewset.py`
- `tests_signals/test_candidats_signals.py`
- `tests_services/test_candidate_account_service.py`

Lecture :
- bonne couverture du flux compte candidat
- pas de fichier de tests dedie a la ressource candidat generaliste hors comptes

### Formations

Tests presents :
- `tests_models/tests_formations.py`
- `tests_api/test_formation_security.py`
- `tests_serializers/tests_formations_serializers.py`

Lecture :
- couverture modele et serializer visible
- peu de tests viewset explicites dedies au contrat des actions custom de `formations`

### Prospections

Tests presents :
- `tests_models/tests_prospection.py`
- `tests_serializers/tests_prospection_serializers.py`
- `tests_viewsets/tests_prospection_viewsets.py`
- `tests_services/test_prospection_ownership_service.py`

Lecture :
- c'est un des domaines les mieux couverts fonctionnellement
- la resource reste prioritaire car elle porte un risque de scoping detail/liste

### Appairages

Tests presents :
- `tests_api/test_appairage_security.py`

Lecture :
- la couverture visible du domaine `appairage` est faible dans les noms de fichiers
- point d'attention fort avant toute refonte du chemin d'ecriture

### Documents

Tests presents :
- `tests_models/tests_documents.py`
- `tests_serializers/tests_documents_serializers.py`
- `tests_viewsets/tests_documents_viewsets.py`

Lecture :
- bonne base pour attaquer le contrat API et le telechargement

### Users / auth

Tests presents :
- `tests_models/tests_user.py`
- `tests_serializers/tests_login_logout_serializers.py`
- `tests_serializers/tests_user_profile_serializers.py`
- `tests_viewsets/tests_login_logout_viewset.py`
- `tests_viewsets/tests_user_profile_viewsets.py`

Lecture :
- bonne base auth/profil
- a completer si le contrat `register`, `me`, `roles` ou `delete-account` change

### CVTheque

Tests visibles dedies :
- aucun fichier explicitement nomme `cvtheque`

Lecture :
- zone a risque
- necessite des tests de contrat et de permissions avant toute harmonisation

## Skips explicites detectes

### Skip 1

Fichier :
- `rap_app/tests/tests_viewsets/tests_partenaires_viewsets.py`

Test saute :
- `test_non_owner_non_staff_cannot_update_partenaire`

Cause documentee :
- le comportement actuel autorise encore un `PATCH` partenaire dans un cas qui devrait etre refuse pour un non-proprietaire non-staff

Lecture :
- skip legitime mais il masque probablement un trou de permission reel
- a traiter pendant le `Lot 2`

### Skip 2

Fichier :
- `rap_app/tests/tests_viewsets/tests_prospection_viewsets.py`

Classe sautee :
- `HistoriqueProspectionViewSetTestCase`

Cause documentee :
- `HistoriqueProspection` n'est pas expose en API list/detail

Lecture :
- skip coherent si l'endpoint n'existe pas
- verifier que ce code mort ou non expose est bien assume comme tel

## Gestion d'erreurs actuelle

Le handler global `rap_app/api/exception_handler.py` normalise deja une partie de l'API au format :

- `success`
- `message`
- `data`
- `errors` optionnel

Lecture :
- le socle existe deja
- l'heterogeneite actuelle vient surtout des viewsets/actions qui contournent ou surchargent le contrat

## Schema OpenAPI : etat reel

### Commande tentee

```bash
./env/bin/python manage.py spectacular --file /tmp/rap_app_schema.yaml
```

### Resultat

La generation echoue.

### Erreurs bloquantes observees

- `HealthViewSet` : serializer impossible a deduire
- `DemandeCompteCandidatView` : serializer impossible a deduire
- crash final drf-spectacular :
  `AttributeError: 'dict' object has no attribute 'request_only'`

### Warnings schema notables

- nombreux `SerializerMethodField` sans type hint exploitable
- collisions de noms de composants :
  `CandidatMini`
  `CentreLight`
- schema potentiellement faux pour `CVTheque` et `Declic`

### Lecture

- le schema OpenAPI n'est pas aujourd'hui une source de verite fiable pour le front
- avant de brancher proprement React/Expo, il faut corriger la generation du schema en plus d'unifier les payloads
- ce point devient un objectif concret du `Lot 1` puis du `Lot 4`

## Livrables du Lot 0 atteints

### Tableau minimal "endpoint -> permissions -> format"

Le tableau complet fin doit etre enrichi pendant le `Lot 1`, mais la base de triage est la suivante :

| Domaine | Surface | Niveau de risque | Probleme principal |
|---|---|---:|---|
| Formations | CRUD + nombreuses actions custom | Eleve | contrat heterogene + actions custom nombreuses |
| Candidats | CRUD + compte + meta + export | Eleve | meta heterogene + chemin d'ecriture sensible |
| Prospections | CRUD + filtres + statut + export | Eleve | scoping detail/liste + contrat custom |
| Appairages | CRUD + commentaires + archive + export | Eleve | couverture visible faible + logique metier sensible |
| Documents | CRUD + download + filtres + export | Moyen/eleve | contrat list/filtres a harmoniser |
| Users/Auth | register + token + profil + actions custom | Eleve | reponses heterogenes + endpoints doublons |
| CVTheque | liste + detail + preview/download | Eleve | contrat heterogene + schema faux + zone peu testee |
| Partenaires | CRUD + choices/filter/export | Moyen | permission skippee a clarifier |
| Stats | nombreuses actions custom | Moyen | hors CRUD, schema et contrat a verifier plus tard |

### Liste des actions custom a risque

Actions a traiter avant branchement front large :

- toutes les actions `meta`
- toutes les actions `filtres` ou `filter-options`
- toutes les actions `choices`
- `cvtheque.preview`
- `cvtheque.download`
- `documents.download`
- `prospections.changer-statut`
- `candidats.creer-compte`
- `candidats.valider-demande-compte`
- toutes les actions d'export

## Point de depart concret du Lot 1

Ordre de travail recommande pour la premiere branche `stabilize/api-contract` :

1. Fixer la convention de succes et d'erreur cible
2. Couvrir par tests de contrat :
   `register`,
   `documents.list`,
   `documents.filtres`,
   `formations.filtres`,
   `candidats.meta`,
   `prospections.filtres`,
   `cvtheque.list`
3. Harmoniser ces endpoints un par un
4. Relancer la suite complete
5. Corriger la generation OpenAPI jusqu'a obtention d'un schema exploitable

## Documentation a maintenir en parallele

Des qu'un endpoint change de contrat ou qu'un serializer devient la source de verite :

- mettre a jour la documentation technique
- mettre a jour le schema OpenAPI si possible
- mettre a jour les docstrings ou commentaires devenus faux
- conserver l'alignement entre code, tests et documentation avant merge
