# Plan complet de correction — RAP_APP backend Django

## Contexte
Ce document transforme les constats d’audit en plan de correction actionnable.
Il ne modifie aucun code.
Il sert de feuille de route de réparation P0 → P3, avec un ordre d’exécution, les dépendances à vérifier, les tests à prévoir, et les fichiers qu’il sera utile de consulter avant certaines corrections.

---

# 1. Stratégie d’exécution recommandée

## Ordre général
1. Sécuriser l’accès objet et le scope centre
2. Rendre cohérente la gestion des rôles et permissions
3. Réduire les incohérences structurelles entre viewsets / serializers / modèles / signaux
4. Traiter les risques de régression
5. Nettoyer la dette technique et les zones mortes
6. Optimiser progressivement les performances

## Règle de conduite
- ne pas lancer de refonte transverse avant d’avoir sécurisé les endpoints sensibles
- corriger d’abord les points où un utilisateur peut accéder à des objets hors périmètre
- tester après chaque lot
- ne pas déplacer de logique métier entre couches sans vérifier :
  - signaux
  - serializers
  - permissions
  - dépendances d’import

---

# 2. Vue d’ensemble des lots

## P0 — critique
- P0.1 Contournement du scope centre dans `appairage_viewsets.py`
- P0.2 Contournement du scope centre dans `formations_viewsets.py`
- P0.3 Incohérence `role` vs `is_staff`
- P0.4 Vérification systématique des actions custom sensibles hors queryset scoppé

## P1 — important
- P1.1 Validation dispersée entre modèles / serializers / viewsets
- P1.2 Couplage fort entre couches
- P1.3 Permissions insuffisamment homogènes selon endpoints
- P1.4 Risques dans certains signaux et effets de bord implicites
- P1.5 Exports et endpoints partiellement incohérents ou peu intégrés
- P1.6 Tests incomplets sur les chemins sensibles

## P2 — amélioration technique
- P2.1 Réduction du code mort et des branches non utilisées
- P2.2 Harmonisation de structure et nommage
- P2.3 Réduction des requêtes coûteuses / N+1
- P2.4 Clarification des responsabilités admin / API / services
- P2.5 Normalisation documentaire interne

## P3 — confort / maintenance
- P3.1 Nettoyage du dépôt
- P3.2 Durcissement des conventions d’équipe
- P3.3 Outillage qualité
- P3.4 Renforcement progressif de la couverture de tests

---

# 3. Fiches de correction — P0

## FICHE P0.1 — Contournement du scope centre dans `appairage_viewsets.py`

### Diagnostic
Certaines actions objet d’appairage chargent l’objet via un queryset non scoppé au périmètre centre.
Risque : un utilisateur staff peut consulter ou modifier un objet hors de son périmètre métier s’il connaît son identifiant.

### Fichiers impactés
- `rap_app/api/viewsets/appairage_viewsets.py`
- impact indirect :
  - `rap_app/api/roles.py`
  - `rap_app/api/permissions.py`
  - `rap_app/api/mixins.py`
  - `rap_app/models/appairage.py`

### Investigation nécessaire
Pour corriger le principe, pas besoin d’autre fichier.
Pour verrouiller la correction finale, il sera utile de voir :
- le fichier de tests API appairage
- `rap_app/api/serializers/appairage_serializers.py`

### Plan de correction
#### Étape A — Modification locale
- identifier toutes les actions objet qui chargent un appairage hors queryset scoppé
- faire en sorte que :
  - `retrieve`
  - `archiver`
  - `desarchiver`
  - et toute autre action custom objet
  utilisent un queryset filtré par périmètre centre
- distinguer si nécessaire :
  - queryset liste
  - queryset détail sécurisé incluant les archivés

#### Étape B — Tests associés
Ajouter des tests API pour :
- retrieve hors centre → `404`
- archiver hors centre → `404`
- desarchiver hors centre → `404`
- retrieve dans le bon centre → `200`
- retrieve admin global → `200`
- interdiction d’écriture pour les rôles lecture seule

#### Étape C — Vérification des effets de bord
- vérifier qu’un appairage archivé reste consultable si c’est le comportement métier attendu
- vérifier qu’admin / superadmin gardent l’accès global
- vérifier qu’aucun signal métier n’est déclenché par un objet chargé hors scope

### Priorité
P0

---

## FICHE P0.2 — Contournement du scope centre dans `formations_viewsets.py`

### Diagnostic
Même famille de problème que pour appairage : certaines actions custom ou récupérations d’objets utilisent un queryset de base sans restriction centre complète.

### Fichiers impactés
- `rap_app/api/viewsets/formations_viewsets.py`
- impact indirect :
  - `rap_app/models/formations.py`
  - `rap_app/api/roles.py`
  - `rap_app/api/permissions.py`
  - `rap_app/utils/filters.py`

### Investigation nécessaire
Avant correction finale, il sera utile de consulter :
- le fichier exact de tests API formation
- le ou les serializers formation utilisés sur les actions custom
- les helpers de filtre associés si l’action réinjecte des IDs liés

### Plan de correction
#### Étape A — Modification locale
- recenser toutes les actions objet formation
- remplacer les chargements d’objet hors scope par un chargement :
  - scoppé par centre
  - cohérent avec les rôles
  - cohérent avec les archives / statuts actifs si applicable

#### Étape B — Tests associés
- accès détail hors centre → `404`
- action custom hors centre → `404`
- accès dans centre autorisé → `200`
- admin global → `200`
- tests de filtre pour éviter les régressions sur listes

#### Étape C — Vérification des effets de bord
- vérifier les dépendances vers commentaires / documents / événements / rapports
- vérifier les accès imbriqués déclenchés depuis la formation
- vérifier les impacts sur les stats et rapports

### Priorité
P0

---

## FICHE P0.3 — Incohérence entre `role` et `is_staff`

### Diagnostic
Le projet semble utiliser à la fois :
- un champ ou une logique métier `role`
- les drapeaux Django standard (`is_staff`, potentiellement `is_superuser`)

Risque :
- divergence de comportement entre admin Django, permissions API, accès lecture/écriture
- comportement imprévisible selon le point d’entrée

### Fichiers impactés
- `rap_app/models/custom_user.py`
- `rap_app/api/roles.py`
- `rap_app/api/permissions.py`
- `rap_app/api/viewsets/user_viewsets.py`
- `rap_app/admin/user_admin.py`
- éventuellement serializers utilisateur

### Investigation nécessaire
Avant de proposer une correction définitive, j’aurai besoin de voir :
- `rap_app/models/custom_user.py`
- `rap_app/api/roles.py`
- `rap_app/api/permissions.py`
- `rap_app/admin/user_admin.py`
- `rap_app/api/serializers/user_profil_serializers.py`

### Plan de correction
#### Étape A — Modification locale
- définir une source de vérité claire :
  - soit `role` pilote les permissions métier et `is_staff` reste technique/admin
  - soit une synchronisation explicite est imposée
- lister tous les endroits où `is_staff` est utilisé
- lister tous les endroits où `role` est utilisé
- décider si :
  - on maintient les deux avec contrat explicite
  - ou on crée une couche d’abstraction unique dans `roles.py`

#### Étape B — Tests associés
- utilisateur staff Django sans rôle métier cohérent
- utilisateur avec rôle admin métier mais sans `is_staff`
- accès admin Django
- accès endpoints DRF lecture/écriture
- création / modification d’utilisateur
- affichage et filtrage admin

#### Étape C — Vérification des effets de bord
- ne pas casser l’accès à l’admin Django
- ne pas casser les migrations implicites ou contraintes existantes
- ne pas modifier silencieusement les comptes existants sans stratégie claire

### Priorité
P0

---

## FICHE P0.4 — Audit et sécurisation systématique des actions custom objet

### Diagnostic
Le problème identifié dans appairage et formation peut exister ailleurs : plusieurs viewsets utilisent des actions custom, souvent plus dangereuses que les CRUD standards.

### Fichiers impactés
Potentiellement :
- `rap_app/api/viewsets/*.py`
- surtout viewsets avec `@action(detail=True, ...)`

### Investigation nécessaire
Pas besoin de fichiers supplémentaires pour lancer l’audit de cette famille.
En revanche, pour correction ciblée, j’aurai besoin des viewsets exacts qui contiennent des actions custom sensibles si tu veux qu’on les traite un par un.

### Plan de correction
#### Étape A — Modification locale
- recenser tous les `@action(detail=True)`
- vérifier si l’objet est chargé via :
  - `self.get_object()`
  - ou un queryset non scoppé
- imposer une convention :
  - toute action objet doit passer par `get_object()` ou un helper sécurisé équivalent

#### Étape B — Tests associés
- pour chaque action sensible :
  - accès hors centre
  - accès lecture seule
  - accès admin
  - cas objet archivé si concerné

#### Étape C — Vérification des effets de bord
- attention aux actions qui doivent voir des objets archivés
- attention aux permissions différentes selon méthode HTTP

### Priorité
P0

---

# 4. Fiches de correction — P1

## FICHE P1.1 — Validation dispersée entre modèles / serializers / viewsets

### Diagnostic
La validation métier semble répartie entre plusieurs couches.
Risque :
- duplication
- oubli sur certains chemins
- comportement différent selon admin / API / script / signal

### Fichiers impactés
- modèles métier centraux
- serializers métier
- viewsets comportant de la validation métier inline

### Investigation nécessaire
Pour traiter correctement ce point, j’aurai besoin, module par module, des triplets :
- modèle
- serializer
- viewset

Priorité de consultation recommandée :
- `formations`
- `prospection`
- `candidat`
- `appairage`

### Plan de correction
#### Étape A — Modification locale
- cartographier où vit chaque validation
- distinguer :
  - validation de forme
  - validation métier unitaire
  - validation transactionnelle multi-objets
- recentrer la validation :
  - serializer pour validation API d’entrée
  - modèle pour invariants métier essentiels
  - service pour orchestration multi-objets
  - viewset pour simple coordination HTTP

#### Étape B — Tests associés
- tests serializer
- tests modèle
- tests API
- tests de non-régression entre admin et API si même règle métier

#### Étape C — Vérification des effets de bord
- ne pas déplacer brutalement une validation sans revoir les signaux
- attention aux imports circulaires si création de services intermédiaires

### Priorité
P1

---

## FICHE P1.2 — Couplage fort entre couches

### Diagnostic
Certaines couches importent des éléments d’une couche supérieure.
Exemple relevé : un modèle importe un helper depuis l’API/roles.
C’est un couplage fragile et atypique.

### Fichiers impactés
- `rap_app/models/prospection_comments.py`
- `rap_app/api/roles.py`
- autres fichiers à confirmer via imports internes

### Investigation nécessaire
Pour cette fiche, le fichier indispensable est :
- `rap_app/models/prospection_comments.py`

Et, pour cadrer le refactor :
- `rap_app/api/roles.py`

### Plan de correction
#### Étape A — Modification locale
- identifier la logique importée depuis l’API
- inverser la dépendance :
  - déplacer la logique commune vers un module métier neutre
  - ou vers un helper de domaine non API
- faire dépendre API et modèle d’un module commun, pas l’inverse

#### Étape B — Tests associés
- tests modèle
- tests permission indirects si le comportement en dépend
- tests import / chargement app si nécessaire

#### Étape C — Vérification des effets de bord
- attention aux imports au chargement de Django
- attention aux signaux activés dans `AppConfig.ready()`

### Priorité
P1

---

## FICHE P1.3 — Permissions hétérogènes selon endpoints

### Diagnostic
Le système de permissions semble riche mais potentiellement hétérogène selon les endpoints, surtout entre CRUD standards et actions custom.

### Fichiers impactés
- `rap_app/api/permissions.py`
- `rap_app/api/roles.py`
- principaux viewsets métier

### Investigation nécessaire
Pour traiter ce point proprement, j’aurai besoin de :
- `rap_app/api/permissions.py`
- un ou deux viewsets représentatifs de chaque famille métier

### Plan de correction
#### Étape A — Modification locale
- dresser une matrice rôle × action × module
- vérifier cohérence entre :
  - list
  - retrieve
  - create
  - update
  - partial_update
  - destroy
  - actions custom
- harmoniser la façon de déclarer `permission_classes`

#### Étape B — Tests associés
- tests permission par rôle
- tests lecture/écriture
- tests hors scope centre
- tests admin global

#### Étape C — Vérification des effets de bord
- éviter de casser les usages réels du front
- vérifier si certaines permissions implicites étaient portées par les filtres de queryset

### Priorité
P1

---

## FICHE P1.4 — Risques liés aux signaux

### Diagnostic
Les signaux sont nombreux.
Risque :
- logique métier implicite difficile à suivre
- doubles effets
- ordre de déclenchement peu visible
- coût performance

### Fichiers impactés
- `rap_app/signals/*.py`
- modèles concernés
- `rap_app/apps.py`

### Investigation nécessaire
Pour ce lot, j’aurai besoin de voir en priorité :
- `rap_app/apps.py`
- les signaux de :
  - formations
  - prospections
  - candidats
  - appairage
  - logs

### Plan de correction
#### Étape A — Modification locale
- classer les signaux en :
  - audit/log
  - synchronisation de données
  - recalcul métier
- identifier ceux qui devraient devenir :
  - services explicites
  - appels transactionnels contrôlés
- limiter les signaux aux comportements réellement transverses

#### Étape B — Tests associés
- création / modification / suppression
- idempotence
- absence de boucle
- cohérence transactionnelle

#### Étape C — Vérification des effets de bord
- très forte attention aux régressions silencieuses
- vérifier les post_save / m2m / save conditionnels

### Priorité
P1

---

## FICHE P1.5 — Exports / services partiellement isolés ou peu raccordés

### Diagnostic
Certains exports et services semblent exister mais leur intégration au reste de l’application n’est pas toujours homogène.

### Fichiers impactés
- `rap_app/services/evenements_export.py`
- `rap_app/services/generateur_rapports.py`
- `rap_app/api/viewsets/export_viewset.py`
- viewsets ou admin appelants

### Investigation nécessaire
Pour finaliser cette fiche, j’aurai besoin de :
- `rap_app/api/viewsets/export_viewset.py`
- `rap_app/services/evenements_export.py`
- `rap_app/services/generateur_rapports.py`

### Plan de correction
#### Étape A — Modification locale
- distinguer :
  - code vivant
  - code plus utilisé
  - code contourné par d’autres chemins
- clarifier le point d’entrée officiel de chaque export

#### Étape B — Tests associés
- test d’appel endpoint
- test format de sortie
- test permission
- test performance minimum sur volume modéré

#### Étape C — Vérification des effets de bord
- attention aux exports déclenchés aussi depuis l’admin
- vérifier la cohérence des noms de fichiers, filtres et colonnes

### Priorité
P1

---

## FICHE P1.6 — Couverture de tests incomplète sur les zones critiques

### Diagnostic
Des tests existent, mais les zones sensibles de sécurité objet et permissions custom doivent être renforcées.

### Fichiers impactés
- `rap_app/tests/`
- surtout tests viewsets et permissions

### Investigation nécessaire
J’aurai besoin des fichiers de tests ciblés pour chaque module corrigé.

### Plan de correction
#### Étape A — Modification locale
- créer une base de cas de test standard par module :
  - admin
  - staff lecture
  - staff écriture
  - hors centre
  - superadmin
  - objet archivé si pertinent

#### Étape B — Tests associés
- suite pytest ou unittest structurée par module
- factorisation des factories et helpers d’authentification

#### Étape C — Vérification des effets de bord
- veiller à ne pas écrire des tests trop couplés à l’implémentation
- tester le comportement métier observable

### Priorité
P1

---

# 5. Fiches de correction — P2

## FICHE P2.1 — Code mort / branches non utilisées

### Diagnostic
Des vues, exports, modèles ou helpers semblent peu ou pas utilisés.

### Fichiers impactés
À confirmer module par module.

### Investigation nécessaire
J’aurai besoin des fichiers candidats au nettoyage quand on attaquera ce lot.

### Plan de correction
- identifier les points d’entrée réels
- confirmer via imports, urls, admin, tests
- marquer ce qui est vivant / dormant / mort
- seulement ensuite nettoyer

### Priorité
P2

---

## FICHE P2.2 — Harmonisation du nommage et de la structure

### Diagnostic
Le projet est riche mais hétérogène dans certains noms de fichiers et patterns.

### Investigation nécessaire
Pas de fichier indispensable immédiatement.
Ce lot se traite après stabilisation P0/P1.

### Plan de correction
- harmoniser suffixes viewset/viewsets/serializers
- uniformiser les conventions de modules
- limiter les patterns exceptionnels

### Priorité
P2

---

## FICHE P2.3 — Optimisations de performance

### Diagnostic
Présence probable de :
- N+1
- annotations coûteuses
- sous-requêtes répétées
- comptages en boucle

### Investigation nécessaire
Pour ce lot, j’aurai besoin des viewsets/listes et serializers lourds, en priorité :
- formations
- prospection
- candidats
- appairage
- stats

### Plan de correction
- profiler les listes critiques
- ajouter `select_related` / `prefetch_related` quand nécessaire
- réduire les calculs Python dépendants de la DB
- vérifier le coût des `Subquery`, `Exists`, `Count`

### Priorité
P2

---

## FICHE P2.4 — Clarification des responsabilités admin / API / services

### Diagnostic
Une partie de la logique métier semble répartie entre admin, API et parfois signaux.

### Investigation nécessaire
À traiter par domaine métier quand les lots P0/P1 seront fermés.

### Plan de correction
- définir ce qui relève de :
  - l’admin
  - l’API
  - la logique métier réutilisable
- extraire progressivement les logiques transverses dans des services

### Priorité
P2

---

## FICHE P2.5 — Documentation technique interne alignée sur le code réel

### Diagnostic
La documentation et les docstrings ne sont utiles que si elles reflètent exactement le comportement courant.

### Investigation nécessaire
À lancer après stabilisation du code.

### Plan de correction
- documenter seulement après correction
- aligner docstrings, commentaires et schémas API
- supprimer historique obsolète et commentaires temporaires

### Priorité
P2

---

# 6. Fiches de correction — P3

## FICHE P3.1 — Nettoyage du dépôt

### Diagnostic
Le dépôt contient aussi des éléments hors runtime.

### Plan de correction
- clarifier ce qui fait partie :
  - du runtime
  - de la doc
  - des sauvegardes
  - des scripts
- sortir ou archiver les éléments non nécessaires au projet applicatif

### Priorité
P3

---

## FICHE P3.2 — Conventions d’équipe

### Plan de correction
- imposer conventions de :
  - permissions
  - viewsets
  - serializers
  - signaux
  - services
- formaliser une mini charte d’architecture

### Priorité
P3

---

## FICHE P3.3 — Outillage qualité

### Plan de correction
- lint
- formatage
- contrôle imports
- tests CI
- couverture minimum

### Priorité
P3

---

## FICHE P3.4 — Renforcement progressif des tests

### Plan de correction
- cibler d’abord les modules sensibles
- créer une base de fixtures/factories propre
- suivre les régressions par domaine métier

### Priorité
P3

---

# 7. Ordre d’exécution concret recommandé

## Lot 1 — sécurité objet
1. `rap_app/api/viewsets/appairage_viewsets.py`
2. tests API appairage
3. `rap_app/api/viewsets/formations_viewsets.py`
4. tests API formations
5. audit express de tous les `@action(detail=True)` du backend

## Lot 2 — cohérence rôles / permissions
6. `rap_app/models/custom_user.py`
7. `rap_app/api/roles.py`
8. `rap_app/api/permissions.py`
9. `rap_app/admin/user_admin.py`
10. tests utilisateurs / rôles / permissions

## Lot 3 — structure métier
11. validation formations
12. validation prospection
13. validation candidat
14. validation appairage
15. revue des signaux liés

## Lot 4 — nettoyage et stabilisation
16. exports
17. code mort
18. optimisation performance
19. documentation
20. conventions qualité

---

# 8. Fichiers dont j’aurai besoin pour aller plus loin

## Indispensables pour sécuriser correctement le Lot 1
- `rap_app/api/viewsets/appairage_viewsets.py`
- fichier de tests API appairage
- `rap_app/api/serializers/appairage_serializers.py`
- `rap_app/api/viewsets/formations_viewsets.py`
- fichier de tests API formations
- serializer(s) formation utilisés par les actions custom

## Indispensables pour le Lot 2 rôles / permissions
- `rap_app/models/custom_user.py`
- `rap_app/api/roles.py`
- `rap_app/api/permissions.py`
- `rap_app/admin/user_admin.py`
- `rap_app/api/serializers/user_profil_serializers.py`

## Très utiles pour traiter P1 validation / structure
- `rap_app/models/formations.py`
- `rap_app/api/serializers/formations_serializers.py`
- `rap_app/models/prospection.py`
- `rap_app/api/serializers/prospection_serializers.py`
- `rap_app/models/candidat.py`
- `rap_app/api/serializers/candidat_serializers.py`
- `rap_app/models/appairage.py`
- `rap_app/signals/appairage_signals.py`
- `rap_app/signals/candidats_signals.py`
- `rap_app/signals/formations_signals.py`
- `rap_app/signals/prospections_signals.py`

## Indispensables pour le lot couplage atypique
- `rap_app/models/prospection_comments.py`
- `rap_app/api/roles.py`

## Utiles pour le lot exports / services
- `rap_app/api/viewsets/export_viewset.py`
- `rap_app/services/evenements_export.py`
- `rap_app/services/generateur_rapports.py`

---

# 9. Recommandation finale

Le meilleur enchaînement est :
- d’abord P0.1 + P0.2
- ensuite P0.3
- puis audit ciblé de toutes les actions custom
- seulement après, on traite la dette structurelle plus large

Tant que la sécurité objet et la cohérence des rôles ne sont pas stabilisées, il ne faut pas lancer de refactorisation large.
