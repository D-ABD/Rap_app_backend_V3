# REPAIR_PLAN_P0_P3.md

## Objectif

Transformer l’audit technique en plan de réparation exécutable, incrémental et compatible avec une application déjà déployée.

Principes retenus :
- corrections par petits lots
- backward compatible autant que possible
- priorité à la sécurité objet et à la cohérence des règles d’accès
- une correction = une zone fonctionnelle identifiable + tests associés
- aucune refonte large tant que les P0/P1 ne sont pas stabilisés

---

# 1. Ordre d’exécution recommandé

## Lot 1 — Sécurité objet immédiate
1. `rap_app/api/viewsets/appairage_viewsets.py`
2. `rap_app/api/viewsets/formations_viewsets.py`
3. revue rapide des autres actions custom de viewsets utilisant `get_object_or_404(...)` hors `get_queryset()` scoppé

## Lot 2 — Source de vérité des rôles et scopes
4. `rap_app/models/custom_user.py`
5. `rap_app/api/roles.py`
6. `rap_app/api/mixins.py`
7. `rap_app/api/viewsets/user_viewsets.py`
8. `rap_app/api/permissions.py`
9. modules utilisant directement `user.is_staff` comme logique métier

## Lot 3 — Validation / robustesse / couplage
10. `rap_app/models/base.py`
11. `rap_app/models/prospection_comments.py`
12. `rap_app/api/viewsets/prospection_comment_viewsets.py`
13. zones avec `except Exception` et `pass`

## Lot 4 — Clarification des responsabilités et du runtime
14. `rap_app/api/viewsets/export_viewset.py`
15. `rap_app/api/api_urls.py`
16. `rap_app/signals/*.py`
17. modèles riches : `appairage.py`, `formations.py`, `commentaires.py`, `documents.py`

## Lot 5 — Performance, dette, maintenance
18. serializers riches
19. stats viewsets
20. admin et documentation interne
21. couverture de tests manquante

---

# 2. Plan détaillé par priorité

# P0 — critique

## P0.1 — Fermer le bypass de scope centre sur `AppairageViewSet`

### Fichier principal
- `rap_app/api/viewsets/appairage_viewsets.py`

### Problème confirmé
Des actions custom récupèrent l’objet depuis `self.base_queryset` au lieu d’un queryset déjà scoppé par utilisateur/centre.

### Objectif de correction
Faire en sorte que toute lecture/modification d’un `Appairage` passe par le même périmètre que la liste.

### Travaux concrets
- auditer les méthodes :
  - `retrieve`
  - `archiver`
  - `desarchiver`
  - toute autre action custom similaire
- remplacer la récupération d’objet basée sur `self.base_queryset` par une récupération issue :
  - soit de `self.get_queryset()`
  - soit d’une méthode dédiée type `get_scoped_object()`
- vérifier que les objets archivés restent récupérables seulement dans le périmètre centre autorisé
- vérifier que le scope ne saute pas sur les objets archivés

### Risque de régression
- faible à modéré
- principal risque : bloquer à tort un accès auparavant possible mais non autorisé

### Tests à ajouter / adapter
- `rap_app/tests/tests_viewsets/` sur appairage
- cas à couvrir :
  - staff centre A lit un appairage du centre A → 200
  - staff centre A lit un appairage du centre B → 404 ou 403 selon convention choisie
  - staff centre A archive un appairage du centre B → refus
  - admin/superadmin garde l’accès prévu

---

## P0.2 — Fermer le bypass de scope centre sur `FormationViewSet`

### Fichier principal
- `rap_app/api/viewsets/formations_viewsets.py`

### Problème confirmé
`archiver` et `desarchiver` récupèrent une formation sans revalider le scope centre.

### Objectif de correction
Garantir qu’une action d’archivage/restauration respecte le même périmètre centre que le reste du viewset.

### Travaux concrets
- revoir les actions :
  - `archiver`
  - `desarchiver`
- isoler une logique d’accès objet unique pour les formations actives et archivées
- vérifier si la convention attendue est :
  - filtrer d’abord par périmètre utilisateur
  - puis inclure les archivées dans ce périmètre seulement

### Tests à ajouter / adapter
- tests viewset formation :
  - staff de centre autorisé archive/restaure sa formation → OK
  - staff hors centre → refus
  - admin/superadmin → comportement attendu confirmé

---

## P0.3 — Revue transversale des actions custom à risque

### Fichiers à auditer en priorité
- `rap_app/api/viewsets/candidat_viewsets.py`
- `rap_app/api/viewsets/partenaires_viewsets.py`
- `rap_app/api/viewsets/prospection_viewsets.py`
- `rap_app/api/viewsets/prospection_comment_viewsets.py`
- `rap_app/api/viewsets/atelier_tre_viewsets.py`
- `rap_app/api/viewsets/prepa_viewset.py`
- `rap_app/api/viewsets/declic_viewset.py`
- `rap_app/api/viewsets/cvtheque_viewset.py`

### Objectif
Repérer toutes les actions custom qui contournent `get_queryset()` ou la logique de scope centralisée.

### Travaux concrets
- rechercher les patterns suivants :
  - `get_object_or_404(Model.objects...`
  - `self.base_queryset`
  - `Model.objects.get(`
  - `objects.all_including_archived()`
- pour chaque occurrence :
  - vérifier si elle doit être scoppée
  - noter si l’action est globale admin-only ou vraiment centrée utilisateur

### Livrable attendu
- mini-liste de contrôle “actions sûres / actions à corriger” avant fermeture du lot P0

---

## P0.4 — Unifier la source de vérité des rôles staff

### Fichiers principaux
- `rap_app/models/custom_user.py`
- `rap_app/api/roles.py`
- `rap_app/api/mixins.py`
- `rap_app/api/viewsets/user_viewsets.py`
- `rap_app/api/permissions.py`

### Problème confirmé
Le code mélange `role` métier et `is_staff` Django, alors que certains rôles métier staff sont enregistrés avec `is_staff=False`.

### Décision d’architecture à prendre avant correction
Choisir explicitement une règle, par exemple :
- **Option A** : `role` = source de vérité métier, `is_staff` réservé à l’admin Django
- **Option B** : mapping strict entre certains rôles et `is_staff=True`

Vu l’audit, l’option A paraît la plus cohérente, sauf contrainte forte d’admin Django.

### Travaux concrets
- inventorier chaque usage de :
  - `user.is_staff`
  - `is_staff_or_staffread(...)`
  - helpers de `roles.py`
- remplacer les usages métier de `user.is_staff` par des helpers centralisés
- réserver `is_staff` aux besoins Django admin si c’est la convention retenue
- documenter noir sur blanc la convention finale dans le code

### Tests à ajouter / adapter
- tests permissions / rôles :
  - `staff`
  - `staff_read`
  - `prepa_staff`
  - `declic_staff`
  - `admin`
  - `superadmin`
- vérifier :
  - visibilité queryset
  - accès endpoints
  - accès objets par centre
  - accès admin Django si concerné

### Précondition de clôture du P0
Aucun comportement critique ne doit dépendre encore d’un `user.is_staff` ambigu.

---

# P1 — important

## P1.1 — Supprimer la dépendance modèle → API dans `ProspectionComment`

### Fichiers principaux
- `rap_app/models/prospection_comments.py`
- probablement `rap_app/api/roles.py`
- éventuellement créer un helper domaine dédié si nécessaire

### Problème confirmé
Le modèle importe un helper depuis la couche API.

### Objectif
Ramener la logique de décision métier dans une couche neutre.

### Travaux concrets
- identifier l’usage exact du helper importé
- déplacer cette logique vers :
  - soit le modèle lui-même si c’est purement métier
  - soit un helper neutre type `rap_app/roles_helpers.py` ou `rap_app/domain/permissions.py`
- faire dépendre API et modèle du helper neutre, pas l’inverse

### Tests
- tests modèle `ProspectionComment`
- tests viewset/serializer impactés

---

## P1.2 — Uniformiser la stratégie de validation

### Fichiers principaux
- `rap_app/models/base.py`
- modèles qui redéfinissent `save()` ou appellent `full_clean()`

### Objectif
Éviter qu’un modèle valide via `clean()`, un autre via `full_clean()`, et un autre uniquement via contraintes DB.

### Travaux concrets
- inventorier les modèles qui surchargent `save()`
- noter ceux qui appellent :
  - `clean()`
  - `full_clean()`
  - rien
- définir une convention unique par type d’écriture :
  - validation systématique modèle avant save
  - ou validation partagée serializer + modèle pour invariants critiques
- ne pas changer en masse sans tests, car cela peut révéler des erreurs latentes en prod

### Approche recommandée
- commencer par les modèles les plus sensibles :
  - `CustomUser`
  - `Formation`
  - `Prospection`
  - `Candidat`
  - `Appairage`
  - `ProspectionComment`

### Tests
- tests de validation modèle
- tests serializer create/update
- tests de non-régression sur fixtures existantes

---

## P1.3 — Réduire les `except Exception` et `pass` silencieux

### Zones prioritaires
- `rap_app/api/permissions.py`
- `rap_app/api/viewsets/`
- `rap_app/signals/`
- `rap_app/models/`

### Objectif
Rendre les erreurs visibles et éviter les comportements silencieusement incohérents.

### Travaux concrets
- classer chaque `except Exception` en 3 catégories :
  - acceptable temporairement avec log explicite
  - à remplacer par exceptions ciblées
  - inutile / dangereux à supprimer
- remplacer les `pass` silencieux dans les zones métier par :
  - log structuré
  - retour explicite
  - exception métier claire si nécessaire

### Priorité interne
1. permissions
2. signaux
3. écritures métier modèle
4. serializers/viewsets

---

## P1.4 — Statuer sur `ExportViewSet`

### Fichiers concernés
- `rap_app/api/viewsets/export_viewset.py`
- `rap_app/api/api_urls.py`
- templates export manquants

### Problème confirmé
Le viewset existe mais n’est pas routé et référence des templates absents.

### Décision à prendre
- soit le module est obsolète → le sortir du runtime/documentation active
- soit il est attendu → le terminer proprement avant branchement

### Travaux concrets
- vérifier si le frontend ou une doc interne le mentionne
- vérifier si des tests l’exercent
- décider :
  - `retirer` ou `réactiver proprement`

### Important
Ne pas le brancher “juste parce qu’il existe” sans fermer les dépendances manquantes.

---

## P1.5 — Clarifier la frontière modèle / signal / service

### Fichiers prioritaires
- `rap_app/models/appairage.py`
- `rap_app/signals/appairage_signals.py`
- `rap_app/models/formations.py`
- `rap_app/signals/formations_signals.py`
- `rap_app/signals/evenements_signals.py`
- `rap_app/signals/commentaire_signals.py`
- `rap_app/signals/documents_signals.py`

### Objectif
Réduire la difficulté à comprendre les effets de bord d’un `save()` ou `delete()`.

### Travaux concrets
- pour chaque entité critique, établir une fiche courte :
  - ce que fait le modèle directement
  - ce que font les signaux post-save/post-delete
  - ce que font éventuellement les services
- identifier les doublons ou redondances de responsabilité
- préparer ensuite une refactorisation ciblée, mais seulement après stabilisation P0/P1

---

# P2 — amélioration technique

## P2.1 — Réduire les surcoûts de `BaseModel.get_changed_fields()`

### Fichier principal
- `rap_app/models/base.py`

### Problème
Une relecture DB est faite à chaque update pour calculer les champs modifiés.

### Objectif
Réduire le coût structurel sur tous les modèles hérités.

### Travaux concrets
- mesurer les endroits qui dépendent vraiment de cette info
- envisager une stratégie plus ciblée :
  - usage seulement quand nécessaire
  - capture de snapshot initial en mémoire
  - limitation à certains modèles

### Important
À traiter après sécurité et cohérence des permissions.

---

## P2.2 — Optimiser les serializers riches à risque de N+1

### Fichiers prioritaires
- `rap_app/api/serializers/appairage_serializers.py`
- `rap_app/api/serializers/partenaires_serializers.py`
- `rap_app/api/serializers/atelier_tre_serializers.py`
- autres serializers avec méthodes `SerializerMethodField`

### Travaux concrets
- inventorier chaque méthode qui lance une requête par objet
- vérifier si l’info peut être :
  - annotée dans le queryset
  - préfetchée
  - pré-calculée dans le viewset
- auditer aussi les exports et stats qui réutilisent ces serializers

### Tests / vérifications
- tests fonctionnels inchangés
- éventuellement instrumentation simple du nombre de requêtes sur cas critiques

---

## P2.3 — Revoir les recomputes complets en signaux

### Fichiers prioritaires
- `rap_app/signals/evenements_signals.py`
- autres signaux recalculant des compteurs globaux

### Objectif
Limiter les `count()` complets répétés si le volume augmente.

### Travaux concrets
- repérer les recalculs complets systématiques
- distinguer :
  - compteurs rares et acceptables
  - compteurs fréquents qui méritent une autre stratégie

---

## P2.4 — Auditer les viewsets stats

### Dossier
- `rap_app/api/viewsets/stats_viewsets/`

### Objectif
Vérifier simultanément :
- scope centre
- permissions
- coût SQL
- cohérence des agrégations

### Pourquoi en P2
Ces endpoints sont importants mais souvent moins critiques que les CRUD cœur métier côté sécurité objet.

---

# P3 — confort / maintenance

## P3.1 — Nettoyer le code mort et semi-mort

### Zones visées
- `rap_app/api/viewsets/export_viewset.py` si abandonné
- signaux désactivés dans `apps.py`
- modules peu ou pas exposés sans justification claire
- commentaires de chantier devenus obsolètes

---

## P3.2 — Clarifier la documentation interne technique

### Zones visées
- viewsets
- permissions
- rôles
- modèles riches
- signaux

### Objectif
Avoir des docstrings qui décrivent :
- le vrai contrat
- les vraies permissions
- les vrais effets de bord

Pas des descriptions génériques.

---

## P3.3 — Revoir l’admin Django module par module

### Dossier
- `rap_app/admin/`

### Objectif
Vérifier :
- cohérence des querysets admin
- `list_select_related`
- filtres utiles
- champs readonly cohérents
- absence de logique coûteuse en liste

---

## P3.4 — Harmoniser progressivement le style

### Zones visées
- conventions de nommage
- helpers communs
- centralisation des règles répétées

### Important
Seulement après stabilisation fonctionnelle.

---

# 3. Plan fichier par fichier — ordre opérationnel

## Vague A — sécuriser le runtime
1. `rap_app/api/viewsets/appairage_viewsets.py`
2. `rap_app/api/viewsets/formations_viewsets.py`
3. tests viewsets appairage / formations
4. revue grep des actions custom dans tous les autres viewsets

## Vague B — stabiliser la matrice d’autorisation
5. `rap_app/models/custom_user.py`
6. `rap_app/api/roles.py`
7. `rap_app/api/mixins.py`
8. `rap_app/api/viewsets/user_viewsets.py`
9. `rap_app/api/permissions.py`
10. tests permissions + rôles + centres

## Vague C — assainir les dépendances et validations
11. `rap_app/models/prospection_comments.py`
12. helper neutre de rôles si nécessaire
13. `rap_app/models/base.py`
14. modèles avec `save()` custom
15. tests modèles / serializers impactés

## Vague D — robustesse et visibilité des erreurs
16. `rap_app/api/permissions.py`
17. `rap_app/signals/*.py`
18. viewsets critiques
19. remplacement progressif des broad exceptions

## Vague E — architecture d’exécution
20. `rap_app/api/viewsets/export_viewset.py`
21. `rap_app/api/api_urls.py`
22. templates export liés
23. décision conserver / retirer

## Vague F — performance ciblée
24. `rap_app/models/base.py`
25. `rap_app/api/serializers/appairage_serializers.py`
26. `rap_app/api/serializers/partenaires_serializers.py`
27. `rap_app/api/serializers/atelier_tre_serializers.py`
28. `rap_app/api/viewsets/stats_viewsets/*`

---

# 4. Checklist d’exécution par fichier

Pour chaque fichier corrigé, appliquer la même discipline :

1. Lire les imports internes et repérer les dépendances réelles
2. Identifier les endpoints / modèles / signaux impactés
3. Corriger le minimum nécessaire
4. Ajouter ou adapter les tests ciblés
5. Vérifier backward compatibility
6. Vérifier permissions et scope centre
7. Vérifier absence de régression sur archives / rôles / objets liés
8. Documenter très brièvement le contrat réel du fichier

---

# 5. Critères de fin par priorité

## P0 terminé si
- aucun endpoint critique ne contourne le scope centre
- la convention `role` vs `is_staff` est décidée et appliquée dans les zones critiques
- les tests d’accès objet passent pour staff/admin/superadmin

## P1 terminé si
- plus de dépendance modèle → API
- validation modèle clarifiée sur les entités critiques
- broad exceptions les plus dangereuses traitées
- `ExportViewSet` a un statut explicite

## P2 terminé si
- serializers les plus coûteux sont auditables et optimisés
- les signaux les plus chers sont identifiés et rationalisés
- les stats viewsets ont été revus côté scope et coût

## P3 terminé si
- code mort réduit
- documentation interne réalignée sur le code réel
- admin et maintenance rendus plus lisibles

---

# 6. Recommandation pratique

La meilleure suite maintenant est :
1. traiter **P0.1 + P0.2 + P0.3**,
2. enchaîner immédiatement avec **P0.4**,
3. puis ouvrir un chantier **P1 fichier par fichier**.

Le meilleur premier lot concret est donc :
- `appairage_viewsets.py`
- `formations_viewsets.py`
- tests associés
- mini-audit grep des actions custom des autres viewsets

