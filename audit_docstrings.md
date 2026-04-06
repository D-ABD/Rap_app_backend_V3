# Audit Docstrings API

## 1. Audit structure

### P0

- Faux contrat de réponse sur les suppressions logiques:
  - `/centres/{id}/`
  - `/formations/{id}/`
  - `/participants-declic/{id}/`
  - `/prospections/{id}/`
  - `/stagiaires-prepa/{id}/`
  - `/users/{id}/`
  - `/users/delete-account/`
  - Problème constaté: schéma avec `No response body` alors que le backend renvoie un JSON métier.

- Faux contrat de réponse sur les endpoints stats:
  - `/appairage-commentaire-stats/`
  - `/appairage-commentaire-stats/grouped/`
  - `/appairage-commentaire-stats/latest/`
  - `/commentaire-stats/`
  - `/commentaire-stats/grouped/`
  - `/commentaire-stats/latest/`
  - `/commentaire-stats/tops/`
  - `/prospection-comment-stats/grouped/`
  - `/prospection-comment-stats/latest/`
  - `/candidat-stats/grouped/`
  - `/formation-stats/grouped/`
  - `/prepa-stats/grouped/`
  - `/declic-stats/grouped/`
  - `/appairage-stats/grouped/`
  - `/evenement-stats/grouped/`
  - `/partenaire-stats/grouped/`
  - `/ateliertre-stats/grouped/`
  - Problème constaté: `No response body` ou absence de contenu JSON explicite.

- Exports mal typés ou partiellement typés:
  - `/commentaires/export/`
  - `/appairage-commentaires/export-pdf/`
  - `/appairage-commentaires/export-xlsx/`
  - `/prospection-commentaires/export-pdf/`
  - `/prospection-commentaires/export-xlsx/`
  - `/appairages/export-xlsx/`
  - `/candidats/export-xlsx/`
  - et plusieurs `export-xlsx`, `export-pdf`, `export-csv` du projet
  - Problème constaté: réponse décrite comme JSON générique ou description seule, sans media type binaire stable.

### P1

- Absence de source de vérité front transverse:
  - types TypeScript attendus non explicités globalement
  - champs obligatoires vs optionnels non stabilisés dans la doc
  - formats date hétérogènes ou implicites
  - enums métier parfois lisibles en backend mais pas normalisés comme contrat front
  - Problème constaté: la doc décrit l’API, mais pas encore la manière fiable de la consommer côté React/TypeScript, génération de hooks ou outils IA.

- Répétition de la doc globale du ViewSet dans les opérations:
  - `/appairage-commentaires/`
  - `/prospection-commentaires/`
  - `/commentaires/`
  - `/candidats/`
  - `/appairages/`
  - Problème constaté: les opérations `create`, `update`, `partial_update` et certaines actions custom réinjectent la doc de classe au lieu d’expliquer l’action.

- Actions custom insuffisamment différenciées:
  - `/candidats/{id}/creer-compte/`
  - `/candidats/{id}/validate-inscription/`
  - `/candidats/{id}/set-admissible/`
  - `/candidats/{id}/clear-admissible/`
  - `/candidats/{id}/set-gespers/`
  - `/candidats/{id}/clear-gespers/`
  - `/candidats/{id}/set-accompagnement/`
  - `/candidats/{id}/clear-accompagnement/`
  - `/candidats/{id}/set-appairage/`
  - `/candidats/{id}/clear-appairage/`
  - `/candidats/{id}/start-formation/`
  - `/candidats/{id}/cancel-start-formation/`
  - `/candidats/{id}/complete-formation/`
  - `/candidats/{id}/abandon/`
  - `/candidats/{id}/valider-demande-compte/`
  - `/candidats/{id}/refuser-demande-compte/`
  - `/appairages/{id}/commentaires/`
  - `/commentaires/{id}/archiver/`
  - `/commentaires/{id}/desarchiver/`
  - `/prospection-commentaires/{id}/archiver/`
  - `/prospection-commentaires/{id}/desarchiver/`
  - `/appairage-commentaires/{id}/archiver/`
  - `/appairage-commentaires/{id}/desarchiver/`

- Paramètres trop génériques:
  - `date_min`, `date_max`, `date_from`, `date_to`
  - `statut`
  - `centre`, `departement`
  - `est_archive`, `avec_archivees`, `include_archived`
  - `by`
  - tous les paramètres `__in`
  - Problème constaté: descriptions génériques injectées par hook, peu exploitables pour le front et pour l’IA.

### P2

- Style documentaire hétérogène:
  - résumés avec emoji sur certains modules et style sobre sur d’autres
  - descriptions parfois techniques, parfois métier, parfois vides

- Doc globale utile mais mal placée:
  - `CommentaireAppairageViewSet`
  - `ProspectionCommentViewSet`
  - `CandidatViewSet`
  - `AppairageViewSet`
  - Problème constaté: les règles de périmètre et de permissions sont pertinentes au niveau classe, mais elles se retrouvaient dupliquées ou implicites au niveau endpoint.

## 2. Stratégie de correction

- Conserver la doc métier globale dans les docstrings de `ViewSet`.
- Déplacer la doc d’usage endpoint par endpoint dans `extend_schema`.
- Normaliser les enveloppes JSON `{success, message, data}` via des helpers OpenAPI réutilisables.
- Corriger globalement les réponses de fichiers et les faux `No response body` dans `rap_app/spectacular_hooks.py` sans toucher à la logique métier.
- Introduire une couche "contrat front" explicite dans la documentation:
  - conventions globales de format
  - conventions d’enveloppe
  - conventions date/heure
  - conventions booléens métier
  - conventions enums
  - conventions champs optionnels/nullables
- Documenter finement les actions custom les plus sensibles pour le front:
  - commentaires de formation
  - commentaires de prospection
  - commentaires d’appairage
  - appairages
  - candidats

## 2 bis. Section critique manquante pour l’objectif front

### Pourquoi c’est critique

L’objectif final n’est pas seulement d’avoir une OpenAPI valide.

Il faut une documentation assez stable pour:

- générer des hooks front
- générer des types TypeScript fiables
- brancher des composants React sans relecture du code backend
- permettre à des outils IA de raisonner sur le contrat sans ambiguïté

### Ce qui manque encore aujourd’hui

- mapping front global absent
- conventions de typage non centralisées
- règles de nullabilité non explicites
- format des dates pas encore posé comme règle générale
- enums métier pas encore normalisés comme contrat front transverse

### Source de vérité front à poser explicitement

La documentation doit désormais porter deux niveaux de vérité:

1. vérité backend:
   - comportement réel
   - permissions
   - scoping
   - logique métier

2. vérité front:
   - forme JSON à consommer
   - type TS attendu
   - champ requis / optionnel / nullable
   - format exact des dates
   - media types d’export
   - valeurs d’enum stables

### Conventions front recommandées

- Enveloppe standard JSON:
  - `WrappedResponse<T>` pour les endpoints métier JSON
  - `PaginatedResponse<T>` dans `data` quand l’endpoint est paginé
  - Référence front existante: [frontend_rap_app/src/types/api.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/types/api.ts)

- Exports:
  - `pdf` => `application/pdf`
  - `xlsx` => `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - Référence front existante: [frontend_rap_app/src/types/export.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/types/export.ts)

- Dates:
  - `date` métier => chaîne ISO `YYYY-MM-DD`
  - `datetime` => chaîne ISO 8601
  - interdire une convention implicite type `dd/mm/YYYY` en entrée/sortie API
  - si un endpoint renvoie un libellé formaté pour affichage, le marquer comme champ de présentation et non comme champ contractuel

- Champs:
  - `required` = champ obligatoire à l’écriture
  - `optional` = champ absent possible
  - `nullable` = champ présent mais valeur `null` autorisée
  - la doc doit distinguer clairement `optionnel` et `nullable`

- Enums:
  - exposer des valeurs stables, pas seulement des labels humains
  - documenter quand le front consomme la `value`, le `label`, ou les deux
  - éviter les enums implicites disséminés dans les descriptions libres

- Booléens métier:
  - documenter le sens métier exact
  - éviter les booléens ambigus sans phrase d’usage
  - expliciter si `false` signifie “non”, “inconnu”, “non encore traité” ou “désactivé”

- Filtres:
  - `__in` = liste CSV ou liste répétée, à stabiliser explicitement
  - `by` et `grouped` = documenter les valeurs autorisées comme un enum métier de dashboard
  - `date_min/date_max` et `date_from/date_to` = distinguer borne métier et borne technique

### Conséquence méthodologique

Pour fermer la mission à 100 %, il faudra compléter la doc avec une section transversale de conventions front, puis l’appliquer endpoint par endpoint sur les ressources prioritaires.

### Priorité de mise en œuvre

- P0 front:
  - enveloppes JSON
  - formats date/datetime
  - media types d’export
  - nullabilité/réquis obligatoire

- P1 front:
  - enums normalisés
  - paramètres de filtre compatibles génération de hooks
  - actions custom avec payload/réponse typés

- P2 front:
  - exemples TS/React
  - conventions de nommage générateur

## 3. Fichiers corrigés

- `rap_app/api/openapi_docs.py`
- `rap_app/api/viewsets/appairage_commentaires_viewset.py`
- `rap_app/api/viewsets/commentaires_viewsets.py`
- `rap_app/api/viewsets/prospection_comment_viewsets.py`
- `rap_app/api/viewsets/appairage_viewsets.py`
- `rap_app/api/viewsets/candidat_viewsets.py`
- `rap_app/spectacular_hooks.py`

## 4. Vérification rapide

- Générer le schéma:
  - `env/bin/python manage.py spectacular --file /tmp/rap_schema_after.yaml`
- Vérifier l’absence de faux corps de réponse:
  - `rg "No response body" /tmp/rap_schema_after.yaml`
- Vérifier les media types d’export:
  - `rg "application/pdf|application/vnd.openxmlformats-officedocument.spreadsheetml.sheet|text/csv" /tmp/rap_schema_after.yaml`
