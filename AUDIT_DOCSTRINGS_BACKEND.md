# Audit Docstrings Backend

Date d'audit : 2026-04-04

## Objectif

Vérifier que la documentation embarquée du backend reste cohérente avec le
code réellement exécuté, en donnant une priorité aux zones qui peuvent induire
un développeur en erreur :

- rôles et scope
- archivage / désarchivage / suppression définitive
- stats sensibles
- signals et effets automatiques

## Périmètre audité

- `rap_app`
- `rap_app_project`

Le dépôt contient au total `327` fichiers Python sous `rap_app`. L'audit
présent ici cible la qualité et la cohérence documentaire du backend, pas
seulement la présence brute d'une docstring.

## Méthode

1. Scan AST des modules/classes/fonctions pour repérer les absences de
   docstrings.
2. Relecture ciblée des zones les plus risquées ou récemment modifiées.
3. Correction immédiate des docstrings jugées incohérentes avec le code.
4. Traçabilité des points encore à enrichir.

## Résultat honnête

Le constat final sur le périmètre choisi est désormais bon.

Constat final :
- `rap_app/api/viewsets` est fermé au scan AST sur les docstrings de module,
  classes et fonctions de premier niveau ;
- `rap_app/api/serializers` est fermé au scan AST sur ce même périmètre ;
- `rap_app/services` est fermé au scan AST sur ce même périmètre ;
- `rap_app/models` est fermé au scan AST sur ce même périmètre ;
- `rap_app/signals` est fermé au scan AST sur ce même périmètre ;
- la compilation Python sur `api / services / models / signals` est verte.

Constat complémentaire sur le reste du projet Python :
- `rap_app/admin`
- `rap_app/utils`
- `rap_app/views`
- `rap_app/tests`
- `rap_app/apps.py`
- `rap_app/middleware.py`
- `rap_app/spectacular_hooks.py`
- `rap_app/management`
- `rap_app/forms`
- `rap_app/templatetags`
- `rap_app/__init__.py`
- `rap_app/static`
- `rap_app_project`

sont eux aussi fermés au scan AST sur les docstrings de module, classes et
fonctions de premier niveau, avec compilation Python verte sur ce périmètre.

Donc :
- cohérence documentaire critique : renforcée ;
- couverture structurelle sur `rap_app / rap_app_project` : atteinte ;
- les éventuelles améliorations restantes relèvent désormais du style ou d'une
  relecture sémantique plus fine, pas d'un manque structurel de docstrings.

## Fichiers relus et corrigés dans cette passe

- `rap_app/api/permissions.py`
- `rap_app/api/mixins.py`
- `rap_app/api/viewsets/temporaire_viewset.py`
- `rap_app/api/serializers/user_profil_serializers.py`
- `rap_app/api/viewsets/stats_viewsets/formation_stats_viewsets.py`
- `rap_app/signals/candidats_signals.py`
- `rap_app/signals/formations_signals.py`
- `rap_app/signals/partenaires_signals.py`
- `rap_app/signals/prospections_signals.py`
- `rap_app/signals/types_offres_signals.py`

## Lots désormais fermés

### `rap_app/api/viewsets`

Le lot a été repris systématiquement :
- docstrings de module ajoutées ou réalignées ;
- docstrings de classes manquantes ajoutées ;
- docstrings de helpers de premier niveau ajoutées sur les zones stats /
  validation ;
- vérification AST finale : `TOTAL 0` anomalie sur le périmètre `viewsets`.

### `rap_app/api/serializers`

Le lot a également été repris systématiquement :
- docstrings de module ajoutées sur tous les serializers signalés ;
- docstrings des helpers métier/techniques ajoutées ;
- docstring de `CerfaContratSerializer` ajoutée ;
- vérification AST finale : `TOTAL 0` anomalie sur le périmètre `serializers`.

### `rap_app/services`

Le lot a été repris systématiquement :
- docstrings de module ajoutées sur les services métier ;
- docstrings des helpers de suspension de sync, mapping CERFA et builders
  ajoutées ;
- vérification AST finale : `TOTAL 0` anomalie sur le périmètre `services`.

### `rap_app/models`

Le lot a été repris systématiquement :
- docstrings de module ajoutées sur les principaux fichiers modèle ;
- docstrings ajoutées sur les nomenclatures CERFA `TextChoices` ;
- docstrings ajoutées sur les helpers de `cerfa_contrats.py` ;
- vérification AST finale : `TOTAL 0` anomalie sur le périmètre `models`.

### `rap_app/signals`

Le lot est désormais fermé au scan AST, y compris `signals/__init__.py`.

### Reste du projet Python

Le périmètre suivant a été repris et fermé au scan AST :
- `rap_app/admin`
- `rap_app/utils`
- `rap_app/views`
- `rap_app/tests`
- `rap_app/apps.py`
- `rap_app/middleware.py`
- `rap_app/spectacular_hooks.py`
- `rap_app/management`
- `rap_app/forms`
- `rap_app/templatetags`
- `rap_app_project`

Ce point permet de considérer que le backend/projet Python utile est maintenant
couverte structurellement en docstrings.

## Corrections de cohérence apportées

### Rôles / permissions

- Clarification du fait que `IsStaffOrAbove` inclut désormais
  `commercial` et `charge_recrutement`.
- Clarification du caractère historique de certaines permissions et mixins
  encore centrés sur `staff` / `staff_read`.
- Correction de la doc de `CanAccessCandidatObject`, qui s'applique en
  pratique à toute la famille `staff_like` interne, pas seulement à
  `staff` / `staff_read`.

### Endpoint technique interne

- `test_token_view` documente maintenant explicitement les rôles internes
  réellement autorisés.

### Sérialisation utilisateur

- Le contrat de `CustomUserSerializer` a été réécrit pour décrire le vrai
  comportement :
  - centres affectables seulement par admin/superadmin
  - restrictions réelles de changement de rôle
  - distinction lecture enrichie / écriture

### Stats formations

- La doc des calculs `inscrits saisis`, `inscrits GESPERS` et
  `écart inscrits` a été renforcée dans
  `formation_stats_viewsets.py`.
- Le but est qu'un futur mainteneur comprenne que :
  - `total_inscrits_saisis` = saisie brute formation
  - `total_inscrits` exposé ensuite = total recalculé GESPERS
  - `ecart_inscrits_vs_gespers` = saisie brute - recalcul GESPERS

### Signals

- Ajout d'un cadrage de module sur les signaux candidats, partenaires,
  prospections et types d'offres.
- Clarification du fait que certains signaux candidats sont volontairement
  conservés en mode `audit-only` et que la vraie logique métier est déplacée
  vers les services.

## Points déjà jugés cohérents

- `rap_app/api/roles.py`
- les docstrings de rôles/scope modifiées pendant le chantier précédent
- les garde-fous spécialisés `prepa` / `declic`
- la règle métier actuelle :
  - CRUD opérationnel par centres attribués
  - stats potentiellement élargies au département sur des vues dédiées

## Points restant à enrichir

### Priorité haute

- relecture sémantique fine des docstrings longues les plus sensibles si l'on
  veut aller au-delà du scan structurel ;
- homogénéisation éventuelle du style rédactionnel sur tout le backend.

### Priorité moyenne

- harmonisation de style documentaire sur les anciens fichiers

### Priorité basse

- ajout systématique de docstrings sur tous les helpers purement techniques
  très locaux quand leur nom reste déjà auto-explicite

## Résumé du scan AST

Le scan AST a d'abord servi d'inventaire de rattrapage.

Après correction :
- le périmètre `rap_app / rap_app_project` audité est à `TOTAL 0` ;
- ce résultat concerne les docstrings de module, classes de premier niveau et
  fonctions de premier niveau ;
- ce résultat ne vaut pas, à lui seul, validation sémantique absolue de chaque
  phrase, mais il ferme bien le chantier structurel.

## Conclusion

Le backend et le projet Python associé sont maintenant bien documentés sur le
périmètre audité et ce périmètre est fermé au scan structurel.

Formulation honnête :
- cohérence critique des docstrings : oui
- scan AST `module / classes / fonctions de premier niveau` sur
  `api / services / models / signals` : `TOTAL 0`
- scan AST sur le reste du projet Python (`admin / utils / views / tests /
  middleware / apps / management / forms / templatetags / rap_app_project`) :
  `TOTAL 0`
- vérification sémantique absolue ligne par ligne de chaque docstring : jamais
  garantie à 100 %, mais les zones les plus risquées ont été relues et corrigées

## Suite recommandée

Si l'objectif devient un backend encore plus exemplaire côté documentation, la
prochaine étape n'est plus une campagne de rattrapage structurel, mais plutôt :

1. relire les docstrings les plus longues et les simplifier si besoin
2. harmoniser le ton et le niveau de détail
3. compléter éventuellement par une doc d'architecture transversale hors code
