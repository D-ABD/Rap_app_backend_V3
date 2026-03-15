# TECHNICAL_AUDIT.md

## Périmètre et méthode

Audit basé sur la lecture du code réel du dépôt Django fourni, avec revue de la structure, des imports internes, des modèles, serializers, viewsets, services, signaux, permissions, rôles, admin, utils, routes et tests présents.

Je n’ai pas modifié le code. Je n’ai pas pris les docstrings comme source de vérité sans comparaison avec l’implémentation.

Limite assumée : cet audit est statique. Je n’ai pas validé chaque comportement par exécution complète de la suite de tests ni par démarrage applicatif avec une base configurée.

---

# 1. Vue globale de l’architecture

## 1.1 Organisation générale

Le backend repose presque entièrement sur une seule app métier dense : `rap_app`.

Cette app concentre :
- le domaine métier principal (`formations`, `prospection`, `candidat`, `appairage`, `prepa`, `declic`, `atelier_tre`, `cvtheque`, `documents`, `logs`)
- l’API DRF (`api/serializers`, `api/viewsets`, `api/permissions`, `api/roles`, `api/mixins`, `api/paginations`)
- l’admin Django
- les signaux
- plusieurs utilitaires transverses

## 1.2 Points forts structurels

- séparation physique réelle entre modèles, serializers, viewsets, signaux et services
- présence de permissions custom et d’une logique de rôles centralisée dans `rap_app/api/roles.py`
- usage significatif de `select_related`, `prefetch_related`, annotations et filtres dédiés sur plusieurs endpoints
- présence d’une base de tests non triviale
- présence d’un `BaseModel` qui homogénéise audit, timestamps et auteurs
- modules stats séparés du CRUD principal

## 1.3 Faiblesses structurelles

- trop forte densité fonctionnelle dans une seule app métier
- couplage transversal important entre couches
- logique métier répartie entre modèles, viewsets, serializers, signaux et helpers, sans frontière toujours stable
- dépendances implicites nombreuses via imports Python
- coexistence de plusieurs conventions de sécurité et de scope centre selon les modules
- plusieurs comportements critiques reposent sur des conventions de rôles non totalement cohérentes avec `CustomUser.is_staff`

## 1.4 Patterns dominants observés

- DRF `ModelViewSet` + actions custom
- permissions custom par rôle
- signaux Django pour logs, historiques et synchronisations de compteurs/snapshots
- méthodes de modèles avec logique métier significative
- exports XLSX/PDF directement dans les viewsets

## 1.5 Conclusion architecture

L’architecture est globalement exploitable, mais elle est devenue **très couplée**. Le projet n’est pas désorganisé, mais il est exposé à des effets de bord parce que :
- la logique métier n’est pas cantonnée à une seule couche
- les signaux font une partie du travail métier
- certains contrôles de périmètre sont refaits manuellement dans plusieurs endpoints
- les conventions de rôles staff ne sont pas uniformément appliquées

---

# 2. Cartographie des dépendances

## 2.1 Modèles centraux

### `Formation`
Utilisé par :
- `formations_serializers.py`
- `formations_viewsets.py`
- `commentaires`, `documents`, `evenements`, `candidat`, `appairage`, `rapports`
- signaux `formations_signals.py`, `evenements_signals.py`, `commentaire_signals.py`, `documents_signals.py`

Rôle :
- nœud central du domaine métier
- porte des agrégats et compteurs consommés par d’autres modules

### `Candidat`
Utilisé par :
- `candidat_serializers.py`
- `candidat_viewsets.py`
- `appairage`, `atelier_tre`, `cvtheque`, `me_viewsets.py`
- `appairage.py` pour la synchronisation de snapshot placement

### `Appairage`
Utilisé par :
- `appairage_serializers.py`
- `appairage_viewsets.py`
- `commentaires_appairage`
- stats `appairages_stats_viewsets.py`
- modèle lui-même contient une logique métier forte de synchronisation du candidat

### `Prospection`
Utilisé par :
- `prospection_serializers.py`
- `prospection_viewsets.py`
- `prospection_comments.py`
- `prospections_signals.py`

### `CustomUser`
Utilisé par :
- auth JWT
- viewsets utilisateur / me
- permissions / rôles / mixins
- rattachement centres
- lien candidat

## 2.2 Services

### `rap_app/services/evenements_export.py`
- dépend de `Evenement`
- appelé depuis `evenements_viewsets.py`

### `rap_app/services/generateur_rapports.py`
- dépend de `Rapport` et `Formation`
- service isolé, mais peu nombreux services au regard du volume total de logique métier

## 2.3 Signaux

Les signaux activés dans `rap_app/apps.py` couvrent plusieurs entités critiques :
- `Formation`
- `Commentaire`
- `Document`
- `Evenement`
- `Prospection`
- `Partenaire`
- `Appairage`
- `Candidat`
- `TypeOffre`
- `LogUtilisateur`

Conséquence : une sauvegarde ou suppression d’objet peut déclencher des écritures secondaires implicites dans d’autres tables.

## 2.4 Dépendances via imports Python particulièrement importantes

### Dépendance inversée problématique
`rap_app/models/prospection_comments.py` importe `rap_app.api.roles.is_staff_or_staffread`.

Conséquence :
- la couche modèle dépend de la couche API
- couplage fragile
- risque accru de cycle conceptuel et de réutilisation difficile du modèle hors DRF

### Dépendances de config
`rap_app_project/settings.py` référence directement :
- `rap_app.api.permissions.IsStaffReadOnly`
- `rap_app.api.paginations.RapAppPagination`
- `rap_app.spectacular_hooks.*`

### Dépendances de bootstrap
`rap_app/apps.py` importe explicitement les modules de signaux au démarrage.

Conséquence :
- forte sensibilité aux effets de bord au boot
- comportement difficile à raisonner sans vision globale des signaux

---

# 3. Incohérences techniques

## CRITIQUE

### 3.1 Bypass du scope centre sur certains endpoints d’appairage

Fichiers concernés :
- `rap_app/api/viewsets/appairage_viewsets.py`

Constat :
- `get_queryset()` applique bien `_scope_qs_to_user_centres()`
- mais `retrieve()`, `archiver()` et `desarchiver()` récupèrent l’objet via `get_object_or_404(self.base_queryset, pk=...)`
- `self.base_queryset` n’est pas filtré par le périmètre utilisateur

Risque :
- un membre du staff peut accéder à un appairage hors de ses centres s’il connaît l’ID
- idem pour l’archivage/désarchivage

Impact : sécurité objet / fuite inter-centres / modification non autorisée.

### 3.2 Bypass du scope centre sur archivage/désarchivage de formation

Fichier concerné :
- `rap_app/api/viewsets/formations_viewsets.py`

Constat :
- `archiver()` et `desarchiver()` utilisent `Formation.objects.all_including_archived()` puis `get_object_or_404(...)`
- aucun contrôle complémentaire de centre n’est appliqué dans ces deux actions
- la permission de classe `IsStaffOrAbove` ne suffit pas à restreindre par centre

Risque :
- un staff multi-centres limité peut archiver/restaurer une formation hors périmètre s’il connaît l’ID

Impact : sécurité objet et intégrité métier.

### 3.3 Incohérence de modèle d’autorisation autour de `is_staff`

Fichiers concernés :
- `rap_app/models/custom_user.py`
- `rap_app/api/mixins.py`
- `rap_app/api/viewsets/user_viewsets.py`

Constat :
- dans `CustomUser.save()`, les rôles métier `staff`, `staff_read`, `prepa_staff`, `declic_staff` sont explicitement enregistrés avec `is_staff = False`
- pourtant plusieurs modules utilisent `user.is_staff` comme critère de scope ou de visibilité
  - `StaffCentresScopeMixin._is_staff_or_read()`
  - `CustomUserViewSet._restrict_users_to_staff_centres()`
  - `CustomUserViewSet.get_user_filtres()`
  - `CustomUser.has_centre_access()`

Conséquence :
- une partie du code s’appuie sur le rôle métier (`role`)
- une autre partie s’appuie sur le flag Django `is_staff`
- ces deux sources de vérité se contredisent

Risque :
- comportements incohérents selon endpoint
- périmètres de visibilité erronés
- bugs difficiles à diagnostiquer pour les rôles staff non admin

## IMPORTANT

### 3.4 Couche modèle dépendante de la couche API

Fichier concerné :
- `rap_app/models/prospection_comments.py`

Constat :
- le modèle importe `..api.roles.is_staff_or_staffread`

Pourquoi c’est important :
- inversion de dépendance
- le domaine métier n’est plus indépendant de l’API
- maintenance plus fragile

### 3.5 Validation globale non homogène

Fichiers concernés :
- `rap_app/models/base.py`
- plusieurs modèles qui surchargent `save()`

Constat :
- `BaseModel.save()` appelle `self.clean()` mais pas `full_clean()`
- certains modèles appellent `full_clean()` eux-mêmes (`CustomUser`, `ProspectionComment`, etc.)
- d’autres s’appuient seulement sur `clean()` ou sur les contraintes BDD

Conséquence :
- stratégie de validation non uniforme
- unicité et validateurs de champs pas toujours déclenchés au même endroit

### 3.6 Signaux très actifs + logique métier dans les modèles = frontière floue

Fichiers concernés :
- `rap_app/signals/*.py`
- `rap_app/models/appairage.py`
- `rap_app/models/commentaires.py`
- `rap_app/models/formations.py`

Constat :
- création d’historiques, mise à jour de compteurs, snapshots candidat, logs et suppressions physiques de fichiers sont répartis entre signaux et méthodes de modèles

Conséquence :
- lecture du seul modèle ne suffit pas pour comprendre l’effet réel d’un save/delete
- forte probabilité d’effets de bord implicites

### 3.7 Code d’export partiellement mort / non branché

Fichier concerné :
- `rap_app/api/viewsets/export_viewset.py`

Constat :
- `ExportViewSet` existe mais n’est pas enregistré dans `rap_app/api/api_urls.py`
- plusieurs templates qu’il référence sont absents du dépôt :
  - `rap_app/templates/exports/appairages_pdf.html`
  - `rap_app/templates/exports/candidats_pdf.html`
  - `rap_app/templates/exports/commentaires_appairages_pdf.html`

Conséquence :
- code probablement obsolète ou incomplet
- risque de confusion documentaire
- risque de rupture immédiate si on tente de le raccorder

### 3.8 Documentation interne parfois désalignée avec la réalité du code

Exemples visibles :
- plusieurs docstrings annoncent un périmètre permissionnel “staff/admin” générique, alors que le détail réel dépend du rôle, du centre et parfois de l’action
- certaines descriptions d’API présentent les formats comme stables alors que le code indique lui-même que certains exports ou réponses ne sont pas des contrats stricts
- des commentaires “P0 N+1” sont présents dans le code d’exécution, ce qui signale un état intermédiaire plutôt qu’une documentation pérenne

## MINEUR

### 3.9 `models/__init__.py` très chargé

Constat :
- importe un grand nombre de sous-modules et fixe aussi `default_app_config`

Impact :
- lisibilité réduite
- démarrage potentiellement plus fragile
- héritage de conventions Django anciennes encore visibles

### 3.10 Mélange de conventions de nommage et de style

Constat :
- mix français/anglais dans noms de champs, méthodes, paramètres et choix métier
- cela reste gérable, mais augmente le coût cognitif sur un projet volumineux

---

# 4. Risques de bugs

## 4.1 Risque élevé lié aux broad exceptions et aux `pass`

Le code contient de nombreux `except Exception` et plusieurs `pass` dans des chemins métier, de permissions, de serializers, de viewsets et de signaux.

Exemples de zones sensibles :
- `rap_app/api/permissions.py`
- `rap_app/api/viewsets/*`
- `rap_app/signals/*`
- `rap_app/models/*`

Risque :
- masquage silencieux d’erreurs réelles
- perte d’information métier
- différences entre comportement attendu et comportement effectif

## 4.2 `BaseModel.get_changed_fields()` force une relecture DB sur chaque update

Fichier concerné :
- `rap_app/models/base.py`

Constat :
- chaque mise à jour relit l’instance en base pour calculer les changements

Risque :
- surcoût systématique
- comportement surprenant dans des transactions complexes
- effets de bord si l’instance a été modifiée en parallèle

## 4.3 Risque de duplication d’écritures secondaires

Exemples :
- `appairage.py` écrit dans `HistoriqueAppairage` et synchronise `Candidat`
- certains signaux créent aussi des historiques ou logs à la création/modification/suppression

Risque :
- doublons de journaux ou historiques
- évolution difficile sans régression croisée

## 4.4 Effets de bord de suppression de fichiers pilotés par signal

Fichier concerné :
- `rap_app/signals/documents_signals.py`

Constat :
- suppression physique du fichier après `post_delete` via `transaction.on_commit`

C’est globalement sain, mais :
- la compréhension complète dépend du signal, pas du modèle
- une suppression hors des chemins habituels doit garder cette hypothèse en tête

## 4.5 Recherche globale très dépendante des conventions de rôles

Fichier concerné :
- `rap_app/api/viewsets/search_viewset.py`

Constat :
- endpoint accessible aux utilisateurs authentifiés
- renvoie volontairement tout vide pour les non staff/admin

Risque :
- comportement surprenant côté produit
- endpoint techniquement ouvert mais fonctionnellement “vide” pour une partie des comptes

---

# 5. Performance

## 5.1 N+1 potentiels dans plusieurs serializers riches

Exemples concrets :
- `rap_app/api/serializers/appairage_serializers.py`
  - `get_est_dernier_appairage()` exécute une requête par objet si le snapshot candidat n’est pas déjà présent
- `rap_app/api/serializers/partenaires_serializers.py`
  - plusieurs `count()`, `distinct().count()`, `values_list()` potentiellement par ligne
- `rap_app/api/serializers/atelier_tre_serializers.py`
  - fallback sur `obj.candidats.count()` et requêtes présence

Impact :
- risque de coût important sur listes paginées, exports, stats ou écrans riches

## 5.2 Requêtes supplémentaires systématiques en update modèle

Fichier concerné :
- `rap_app/models/base.py`

Constat :
- `get_changed_fields()` relit l’objet avant chaque `save()` de mise à jour

Impact :
- coût structurel sur tout modèle héritant de `BaseModel`

## 5.3 Signaux déclenchant des recomputes complets

Exemple :
- `rap_app/signals/evenements_signals.py` recalcule `Evenement.objects.filter(formation=formation).count()` à chaque save/delete d’événement

Impact :
- acceptable à faible volume
- potentiellement coûteux sur charges plus élevées

## 5.4 Préfetch/annotate déjà présents, mais pas homogènes

Le projet montre un vrai effort d’optimisation dans plusieurs viewsets, mais le niveau d’optimisation varie fortement selon les serializers et actions custom.

Conclusion performance :
- pas un backend “naïf”
- mais plusieurs zones riches restent susceptibles de dégrader vite sous charge

---

# 6. Sécurité

## 6.1 Contrôles objet incomplets sur certains endpoints

Déjà détaillé en section 3 :
- `AppairageViewSet.retrieve/archiver/desarchiver`
- `FormationViewSet.archiver/desarchiver`

C’est le principal risque sécurité identifié dans cette lecture.

## 6.2 Modèle de permissions dépendant de conventions hétérogènes

Le projet mélange :
- rôle métier (`role`)
- `is_superuser`
- parfois `is_staff`

Tant que ces trois axes ne sont pas strictement cohérents, il existe un risque de divergence entre :
- ce qu’un utilisateur devrait voir
- ce qu’il peut réellement voir ou modifier sur certains endpoints

## 6.3 Exposition documentaire potentiellement trompeuse

Les docstrings ne sont pas toujours assez précises sur les contrôles objet réels. Le risque n’est pas une faille directe, mais une mauvaise compréhension lors d’une future évolution de sécurité.

## 6.4 Logs : assainissement présent mais non universel

Point positif :
- `LogUtilisateur.sanitize_details()` masque plusieurs champs sensibles

Réserve :
- tout appel métier ne passe pas forcément par un même niveau de standardisation des détails

---

# 7. Dette technique

## 7.1 Code mort ou semi-mort

- `ExportViewSet` non routé
- templates PDF manquants pour ce viewset
- signaux explicitement désactivés dans `apps.py`
- modules présents mais peu ou pas exposés dans l’API active (`vae`, `jury`, etc.)

## 7.2 Dette de couplage

- dépendance modèle → API (`prospection_comments.py`)
- logique de rôles dupliquée entre `CustomUser`, `roles.py`, `permissions.py`, mixins et viewsets

## 7.3 Dette de maintenance des signaux

Le nombre de signaux est suffisamment élevé pour compliquer l’analyse d’impact d’une modification métier.

## 7.4 Dette documentaire

- docstrings parfois trop ambitieuses par rapport au contrat réel
- présence de commentaires de chantier technique dans le code de production
- documentation parfois descriptive mais pas toujours contractuelle

## 7.5 Dette de couverture de tests

Des tests existent, ce qui est un bon point. En revanche, plusieurs zones critiques visibles ne semblent pas couvertes de manière équivalente, notamment à première lecture :
- `appairage_viewsets.py`
- `prospection_comment_viewsets.py`
- `atelier_tre_viewsets.py`
- `search_viewset.py`
- `export_viewset.py`
- plusieurs viewsets stats
- serializers `appairage`, `prospection_comment`, `commentaires_appairage`, `cvtheque`, `atelier_tre`

---

# 8. Roadmap de corrections

## P0 — critique

1. Corriger tous les endpoints qui contournent le scope centre :
   - `appairage_viewsets.py` : `retrieve`, `archiver`, `desarchiver`
   - `formations_viewsets.py` : `archiver`, `desarchiver`

2. Unifier la source de vérité d’autorisation staff :
   - décider clairement si le projet se base sur `role`, `is_staff`, ou un mapping strict entre les deux
   - supprimer les divergences de logique entre `CustomUser`, `roles.py`, `mixins.py` et `user_viewsets.py`

3. Vérifier tout autre endpoint custom utilisant un objet non issu de `get_queryset()` scoppé.

## P1 — important

4. Supprimer la dépendance `models -> api` dans `prospection_comments.py`.

5. Uniformiser la stratégie de validation :
   - clarifier où doit vivre `full_clean()`
   - éviter les écarts selon les modèles

6. Revoir les broad exceptions dans les chemins métier et permissions.

7. Revoir le périmètre réel et l’utilité de `ExportViewSet` :
   - soit le raccorder proprement
   - soit l’écarter du runtime/documentation s’il est obsolète

8. Clarifier les responsabilités entre signaux et logique métier explicite.

## P2 — amélioration technique

9. Réduire les N+1 résiduels dans les serializers riches.

10. Revoir le coût de `BaseModel.get_changed_fields()`.

11. Isoler davantage les règles de scope centre dans un composant unique partagé.

12. Nettoyer les docstrings qui décrivent plus que ce que le code garantit réellement.

## P3 — confort / maintenance

13. Élaguer le code inactif et les imports historiques.

14. Harmoniser le nommage français/anglais là où cela améliore la lisibilité.

15. Revoir `models/__init__.py` et les conventions anciennes encore présentes.

---

# 9. Checklist de tests

## 9.1 Tests sécurité objet

À ajouter ou renforcer en priorité :

- staff A ne peut pas `retrieve` un appairage du centre B
- staff A ne peut pas `archiver` un appairage du centre B
- staff A ne peut pas `desarchiver` un appairage du centre B
- staff A ne peut pas `archiver` une formation du centre B
- staff A ne peut pas `desarchiver` une formation du centre B

## 9.2 Tests rôles / périmètre

- rôle `staff` avec `is_staff=False` conserve bien le comportement attendu partout
- rôle `staff_read` reste strictement en lecture seule
- rôles `prepa_staff` et `declic_staff` sont cohérents sur leurs modules et sur les mixins communs
- `has_centre_access()` reflète réellement le modèle d’autorisation voulu

## 9.3 Tests régression validation

- création/update de modèles héritant de `BaseModel` avec contraintes d’unicité et validateurs de champs
- cohérence entre `clean()` et `full_clean()` selon les modèles

## 9.4 Tests signaux / effets de bord

- création/modification/suppression d’appairage met à jour correctement le snapshot candidat
- suppression de document supprime bien le fichier attendu après commit
- création/suppression d’événement maintient correctement `nombre_evenements`
- création de prospection / changement de statut n’entraîne pas de doublon de log inattendu

## 9.5 Tests performance ciblés

- liste paginée d’appairages avec volume significatif
- liste partenaires avec champs calculés de comptage
- exports XLSX sur appairage / prospection / ateliers
- recherche globale avec plusieurs ressources

## 9.6 Tests de dette technique

- vérifier qu’aucune route ne référence `ExportViewSet` tant que ses templates manquent
- vérifier que les docstrings critiques correspondent bien aux permissions effectives

---

# Synthèse finale

Le backend est **solide sur le fond**, avec une vraie structuration Django/DRF et une base métier déjà riche. En revanche, il présente aujourd’hui trois fragilités majeures :

1. **des contournements ponctuels du scope centre sur certains endpoints custom**
2. **une incohérence importante entre rôle métier et flag Django `is_staff`**
3. **un couplage trop fort entre couches, renforcé par les signaux et quelques dépendances inversées**

Le projet n’a pas besoin d’une refonte totale pour être assaini. En revanche, il a besoin d’un **resserrage ciblé de la sécurité objet, de l’autorisation par rôle et de la lisibilité des responsabilités** avant d’être considéré comme techniquement robuste sur la durée.
