# Frontend Integration Guide

Date: 2026-03-19

## But

Donner au front React / Expo une reference simple et fiable pour consommer le backend sans devoir relire les viewsets.

Ce document se concentre sur:
- les endpoints prioritaires
- les conventions de reponse
- l'authentification
- les cas particuliers a gerer cote client

## Base De Travail

- base URL API: `/api/`
- authentification principale: JWT
- pagination standard: `RapAppPagination`
- format d'erreur standard: `api_exception_handler`

## Convention JSON Standard

### Succes simple

```json
{
  "success": true,
  "message": "Operation reussie.",
  "data": {}
}
```

### Succes pagine

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

### Erreur de validation

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

### Erreur standard

```json
{
  "success": false,
  "message": "Message d'erreur.",
  "data": null
}
```

## Exceptions Au Format JSON Standard

Ces endpoints ne renvoient pas une enveloppe JSON standard:

- exports `csv`
- exports `xlsx`
- exports `pdf`
- downloads de fichiers
- previews binaires

Le front doit les traiter comme:
- `blob`
- `arrayBuffer`
- ou ouverture navigateur / lecteur natif selon le cas

## Authentification

### Endpoints

- `POST /api/token/`
- `POST /api/token/refresh/`
- `POST /api/register/`
- `GET /api/me/`
- `GET /api/roles/`
- `POST /api/me/demande-compte/`

### Strategie front recommandee

1. stocker `access` et `refresh`
2. envoyer `Authorization: Bearer <access>`
3. intercepter `401`
4. tenter `POST /api/token/refresh/`
5. si refresh echoue, vider la session et revenir a l'ecran login

## Endpoints Prioritaires Pour Le Front

## 1. Session Et Profil

- `POST /api/token/`
- `POST /api/token/refresh/`
- `GET /api/me/`
- `GET /api/roles/`
- `GET /api/users/me/`
- `GET /api/users/roles/`

Usage:
- login
- bootstrap de session
- affichage du profil courant
- connaissance du role courant

## 2. Referentiels UI

- `GET /api/centres/liste-simple/`
- `GET /api/formations/liste-simple/`
- `GET /api/statuts/choices/`
- `GET /api/typeoffres/choices/`
- `GET /api/evenements/choices/`
- `GET /api/partenaires/choices/`

Usage:
- selects
- filtres
- formulaires

## 3. Formations

- `GET /api/formations/`
- `GET /api/formations/{id}/`
- `GET /api/formations/filtres/`
- `GET /api/formations/liste-simple/`
- `POST /api/formations/{id}/archiver/`
- `POST /api/formations/{id}/desarchiver/`

Usage:
- liste
- detail
- ecrans de filtre
- changements d'etat

## 4. Candidats

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

Usage:
- liste staff
- detail candidat
- actions metier staff

### Migration Statut Vers Parcours Phase

Le backend expose maintenant deux niveaux de lecture pour les candidats :

- `statut`
  - champ legacy encore supporté
  - ne doit plus être considéré comme la future source de vérité métier
- `parcours_phase`
  - nouvelle phase persistée
- `parcours_phase_calculee`
  - lecture dérivée du backend

Pour le front :

1. ne pas supprimer immédiatement l'usage de `statut`
2. commencer à lire `parcours_phase` si présent
3. utiliser `parcours_phase_choices` depuis `GET /api/candidats/meta/`
4. filtrer les listes avec `parcours_phase=value` ou l'alias `parcoursPhase=value`
5. préférer les nouveaux endpoints de transition plutôt qu'une édition directe

Le endpoint `GET /api/candidats/meta/` expose aussi désormais :

- `phase_contract`
  - rappelle que `statut` reste supporté temporairement
  - indique que `parcours_phase` est le champ recommandé
  - indique que `parcours_phase_calculee` est dérivé
- `phase_filter_aliases`
  - documente les paramètres de filtre supportés pendant la migration
- `phase_ordering_fields`
  - documente les champs de tri sûrs pour les listes candidats
- `phase_transition_actions`
  - liste les actions de transition disponibles côté backend
- `phase_read_only_fields`
  - liste les champs de phase à considérer comme non éditables côté front

Champs utiles désormais disponibles sur le détail candidat :

- `parcours_phase`
- `parcours_phase_display`
- `parcours_phase_calculee`
- `is_inscrit_valide`
- `is_en_formation_now`
- `is_stagiaire_role_aligned`
- `has_compte_utilisateur`

## 5. Prospections

- `GET /api/prospections/`
- `GET /api/prospections/{id}/`
- `GET /api/prospections/filtres/`
- `GET /api/prospections/choices/`
- `POST /api/prospections/`
- `PUT/PATCH /api/prospections/{id}/`
- `POST /api/prospections/{id}/changer-statut/`
- `POST /api/prospections/{id}/archiver/`
- `POST /api/prospections/{id}/desarchiver/`

Usage:
- tunnel commercial
- filtres avances
- tableaux de suivi

## 6. Partenaires

- `GET /api/partenaires/`
- `GET /api/partenaires/{id}/`
- `GET /api/partenaires/filter-options/`
- `GET /api/partenaires/choices/`
- `GET /api/partenaires/{id}/with-relations/`

Usage:
- annuaire
- detail enrichi
- filtres listes

## 7. Appairages

- `GET /api/appairages/`
- `GET /api/appairages/{id}/`
- `GET /api/appairages/meta/`
- `GET /api/appairages/{id}/commentaires/`
- `POST /api/appairages/{id}/commentaires/`
- `POST /api/appairages/{id}/archiver/`
- `POST /api/appairages/{id}/desarchiver/`

Usage:
- placement
- detail + historique de commentaires
- workflow staff

## 8. CVTheque Et Documents

- `GET /api/cvtheque/`
- `GET /api/cvtheque/{id}/download/`
- `GET /api/cvtheque/{id}/preview/`
- `GET /api/documents/`
- `GET /api/documents/par-formation/`
- `GET /api/documents/{id}/download/`

Usage:
- consultation et telechargement
- affichage documentaires lies aux formations et candidats

## 9. Commentaires

- `GET /api/commentaires/`
- `GET /api/commentaires/filter-options/`
- `GET /api/prospection-commentaires/`
- `GET /api/prospection-commentaires/filter-options/`
- `GET /api/appairage-commentaires/`

Usage:
- timelines
- filtres
- suivi staff

## 10. Modules Specifiques

- `GET /api/prepa/`
- `GET /api/prepa/filters/`
- `GET /api/declic/`
- `GET /api/declic/filters/`
- `GET /api/ateliers-tre/`
- `GET /api/ateliers-tre/meta/`

Usage:
- ecrans specialises
- indicateurs ou formulaires par module

## Raccourcis Cote Front

### Avoir un client API unique

Le front devrait avoir:
- un wrapper `apiFetch`
- gestion automatique du token
- parsing uniforme des enveloppes JSON
- gestion dediee des blobs pour exports / downloads

### Regle de parsing

Pour un endpoint JSON:

1. verifier `success`
2. utiliser `data`
3. afficher `message` si utile
4. si `errors` existe, mapper sur les champs du formulaire

### Regle de pagination

Pour une liste:

- lire `data.results`
- lire `data.count`
- lire `data.page`
- lire `data.total_pages`
- lire `data.next` et `data.previous`

## Cas Front A Gerer Explicitement

### Uploads

Pour:
- documents
- cvtheque

Utiliser:
- `multipart/form-data`

### Exports

Pour:
- `export-csv`
- `export-xlsx`
- `export-pdf`

Utiliser:
- requete binaire
- nom de fichier si disponible dans `Content-Disposition`

### Meta / Filters / Choices

Le backend expose plusieurs endpoints utilitaires:

- `meta`
- `filtres`
- `filters`
- `filter-options`
- `choices`
- `liste-simple`

Le front doit les traiter comme des sources de configuration d'ecran, pas comme des ressources CRUD classiques.

## Ordre D'Integration Recommande

1. auth
2. bootstrap session `me` + `roles`
3. referentiels simples
4. formations
5. candidats
6. prospections
7. partenaires
8. appairages
9. cvtheque / documents
10. modules specialises

## Checklist Front Avant Demarrage

- definir le client API central
- definir le stockage du JWT
- definir la logique de refresh token
- definir le parser standard `success/message/data/errors`
- definir le handler binaire pour exports et downloads
- lister les ecrans prioritaires
- connecter d'abord les endpoints `liste + detail + filtres`

## Recommandation Finale

Pour commencer vite et proprement:

- faire un premier sprint front sur:
  - login
  - session
  - formations
  - candidats
  - prospections

Ce trio donne deja:
- navigation
- listes
- filtres
- detail
- vraies actions metier visibles
