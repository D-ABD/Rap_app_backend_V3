# REFACTOR_PLAN

## Objectif

Ce plan d’action opérationnel vise à rendre le backend Django plus stable, plus prévisible et plus simple à faire consommer par un front React/Expo.

Les priorités sont :
- standardiser le contrat API
- centraliser le scoping sécurité
- sortir les effets de bord métier critiques des signaux
- réduire la dette technique sans casser les flux existants

---

## 1. Architecture cible

### Vue d’ensemble

Architecture visée :

```text
Routes API
  -> BaseApiViewSet / ApiResponseMixin
    -> ScopedModelViewSet
      -> ViewSet métier
        -> Service métier
          -> Modèles
          -> Services d’audit / historique
```

### Rôle des briques

`ApiResponseMixin`
- responsabilité : uniformiser les réponses JSON
- impose le contrat `{success, message, data}`
- retire la logique HTTP des serializers

`BaseApiViewSet`
- responsabilité : fournir des helpers de réponse et des hooks communs
- centralise les réponses `list`, `retrieve`, `create`, `update`, `destroy`

`ScopedModelViewSet`
- responsabilité : centraliser la visibilité par rôle et par centre
- évite le scoping manuel recopié dans les viewsets

`Services métier`
- responsabilité : porter les workflows à effets de bord
- remplacent progressivement les signaux les plus risqués
- encapsulent les transactions et l’ordre des écritures

`Services transverses`
- audit/logs
- historique
- policy de visibilité
- éventuellement notification/export

### Cible par couche

`serializers`
- ne font que validation et sérialisation
- ne construisent jamais la réponse HTTP finale

`viewsets`
- ne contiennent plus que :
  - orchestration HTTP
  - sélection du serializer
  - appel de service
  - permissions déclaratives

`models`
- gardent :
  - invariants locaux
  - contraintes de cohérence intrinsèques
- perdent progressivement :
  - workflows multi-modèles
  - effets de bord transverses

`signals`
- à terme réservés aux hooks simples et non critiques
- ne doivent plus porter les synchronisations métier sensibles

---

## 2. Standardisation API (P0)

### État d’avancement

Statut : `en cours`

Implémenté :
- `ApiResponseMixin` ajouté dans [`rap_app/api/mixins.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/mixins.py)
- `BaseApiViewSet` créé dans [`rap_app/api/viewsets/base.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/base.py)
- `exception_handler` global créé dans [`rap_app/api/exception_handler.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/exception_handler.py)
- branchement DRF effectué dans [`rap_app_project/settings.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app_project/settings.py)
- endpoint pilote `formations` migré
- endpoint pilote `documents` migré
- endpoint pilote `users` migré
- enveloppe HTTP retirée de `FormationDetailSerializer`
- premiers tests de contrat API ajoutés

Validé localement :
- compilation Python ciblée OK sur les fichiers refactorés

Non validé automatiquement dans cette session :
- exécution `pytest` impossible dans l’environnement courant
- blocage constaté : `python3 -m pytest` échoue car le module `pytest` n’est pas installé

Reste à clôturer pour terminer réellement la Phase 1 :
- exécuter les tests ciblés dans un environnement où `pytest` est disponible
- corriger les éventuelles divergences de contrat sur les endpoints pilotes si des tests existants exposent encore des écarts
- décider si le `DELETE` de `documents` doit rester en `200` avec payload ou revenir à `204` sans body dans la convention finale

### Problème à corriger

Le contrat JSON varie selon les endpoints :
- parfois enveloppé
- parfois brut
- parfois enveloppé dans le serializer lui-même

Cela complique fortement le frontend, les tests API et l’évolution du backend.

### Architecture cible

Créer une base commune pour toutes les réponses HTTP.

### Pseudo-code : `ApiResponseMixin`

```python
from rest_framework import status
from rest_framework.response import Response


class ApiResponseMixin:
    default_success_message = "Operation reussie."
    default_error_message = "Une erreur est survenue."

    def success_response(self, data=None, message=None, status_code=status.HTTP_200_OK):
        return Response(
            {
                "success": True,
                "message": message or self.default_success_message,
                "data": data,
            },
            status=status_code,
        )

    def error_response(self, message=None, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
        payload = {
            "success": False,
            "message": message or self.default_error_message,
            "data": None,
        }
        if errors is not None:
            payload["errors"] = errors
        return Response(payload, status=status_code)
```

### Pseudo-code : `BaseApiViewSet`

```python
from rest_framework import status
from rest_framework.viewsets import ModelViewSet


class BaseApiViewSet(ApiResponseMixin, ModelViewSet):
    list_message = "Liste recuperee avec succes."
    retrieve_message = "Element recupere avec succes."
    create_message = "Element cree avec succes."
    update_message = "Element mis a jour avec succes."
    destroy_message = "Element supprime avec succes."

    def render_list(self, serializer):
        return self.success_response(serializer.data, self.list_message)

    def render_retrieve(self, serializer):
        return self.success_response(serializer.data, self.retrieve_message)

    def render_create(self, serializer):
        return self.success_response(
            serializer.data,
            self.create_message,
            status_code=status.HTTP_201_CREATED,
        )

    def render_update(self, serializer):
        return self.success_response(serializer.data, self.update_message)

    def render_destroy(self):
        return self.success_response(None, self.destroy_message)
```

### Règles de migration

À imposer dès le début :
- un serializer ne retourne jamais `{success, message, data}`
- les serializers restent purement DRF
- les viewsets construisent les réponses HTTP
- les erreurs DRF doivent être harmonisées via un `exception_handler` global

### Implémentation retenue

Décisions effectivement prises pendant la Phase 1 :
- typage explicite des méthodes du mixin de réponse
- `ValidationError` DRF normalisée dans une enveloppe globale
- conservation du format `errors` sous forme de mapping champ -> liste d’erreurs quand la structure source le permet
- déplacement strict de l’enveloppe HTTP hors de `FormationDetailSerializer`, sans suppression des champs métier

### Exception handler recommandé

Objectif :
- normaliser 400, 403, 404, 500
- éviter des formats différents selon la provenance de l’erreur

Format cible :

```json
{
  "success": false,
  "message": "Validation error.",
  "data": null,
  "errors": {
    "field": ["..."]
  }
}
```

---

## 3. Sécurité & Scoping (P1)

### État d’avancement

Statut : `en cours`

Implémenté :
- `ScopedModelViewSet` créé dans [`rap_app/api/viewsets/scoped_viewset.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/scoped_viewset.py)
- stratégie `deny by default` appliquée :
  - utilisateur non authentifié => `qs.none()`
  - mode `centre` sans centre visible => `qs.none()`
  - mode inconnu ou mal configuré => `qs.none()`
- migration du scoping centre sur :
  - [`rap_app/api/viewsets/formations_viewsets.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/formations_viewsets.py)
  - [`rap_app/api/viewsets/documents_viewsets.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/documents_viewsets.py)
  - [`rap_app/api/viewsets/candidat_viewsets.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/candidat_viewsets.py)
  - [`rap_app/api/viewsets/appairage_viewsets.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/appairage_viewsets.py)
- test isolé ajouté pour vérifier la construction du `Q` en mode `centre` :
  - [`rap_app/tests/tests_api/test_scoped_viewset.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/tests/tests_api/test_scoped_viewset.py)
- test de non-régression ajouté sur le périmètre documents :
  - [`rap_app/tests/tests_viewsets/tests_documents_viewsets.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/tests/tests_viewsets/tests_documents_viewsets.py)

Décision prise :
- `ProspectionViewSet` n’a pas été basculé intégralement vers la classe parente à ce stade
- le filtre spécifique fondé sur `Exists(ProspectionComment...)` reste pour l’instant dans le viewset
- objectif : ne pas réduire la visibilité métier réelle ni introduire de fuite silencieuse

Validé localement :
- compilation Python ciblée OK sur les fichiers migrés

Non validé automatiquement dans cette session :
- `python3 manage.py test ...` échoue car `django` n’est pas installé dans l’interpréteur disponible

Reste à clôturer pour terminer réellement la Phase 2 :
- exécuter les tests de sécurité dans un environnement Django opérationnel
- migrer prudemment `ProspectionViewSet` avec une approche hybride :
  - `ScopedModelViewSet` pour le scope réutilisable
  - filtre `Exists(...)` conservé localement
- traiter ensuite `CVTheque`, `partenaires` et les endpoints stats qui ont encore des logiques de visibilité spécifiques

### Problème à corriger

Le périmètre d’accès est recodé dans de nombreux viewsets, sous des variantes proches :
- `_scope_qs_to_user_centres`
- `_restrict_to_user_centres`
- `_staff_centre_ids`
- `_assert_staff_can_use_formation`

Cette duplication augmente fortement le risque d’incohérence de sécurité.

### Architecture cible

Créer une base commune de scoping et une policy explicite.

### Pseudo-code : `ScopedModelViewSet`

```python
from django.db.models import Q


class ScopedModelViewSet(BaseApiViewSet):
    scope_mode = "none"
    centre_lookup_paths = ()
    owner_lookup_paths = ()

    def get_base_queryset(self):
        return super().get_queryset()

    def get_user_centre_ids(self):
        user = self.request.user
        if is_admin_like(user):
            return None
        return staff_centre_ids(user) or []

    def apply_centre_scope(self, qs):
        centre_ids = self.get_user_centre_ids()

        if centre_ids is None:
            return qs
        if not centre_ids:
            return qs.none()

        query = Q()
        for path in self.centre_lookup_paths:
            query |= Q(**{f"{path}__in": centre_ids})
        return qs.filter(query).distinct()

    def apply_owner_scope(self, qs):
        user = self.request.user
        query = Q()
        for path in self.owner_lookup_paths:
            query |= Q(**{path: user})
        return qs.filter(query).distinct()

    def scope_queryset(self, qs):
        user = self.request.user

        if not getattr(user, "is_authenticated", False):
            return qs.none()

        if self.scope_mode == "none":
            return qs
        if self.scope_mode == "centre":
            return self.apply_centre_scope(qs)
        if self.scope_mode == "owner":
            return self.apply_owner_scope(qs)
        if self.scope_mode == "centre_or_owner":
            centre_q = Q()
            owner_q = Q()

            if self.centre_lookup_paths:
                centre_ids = self.get_user_centre_ids()
                if centre_ids is None:
                    return qs
                for path in self.centre_lookup_paths:
                    centre_q |= Q(**{f"{path}__in": centre_ids})

            for path in self.owner_lookup_paths:
                owner_q |= Q(**{path: user})

            combined_q = centre_q | owner_q
            if not combined_q:
                return qs.none()
            return qs.filter(combined_q).distinct()

        return qs.none()

    def get_queryset(self):
        return self.scope_queryset(self.get_base_queryset())
```

### Variante plus robuste

La meilleure version à moyen terme est une policy dédiée plutôt qu’un simple `scope_mode`.

Exemple :

```python
class VisibilityPolicy:
    def filter_queryset(self, user, qs, resource_name):
        ...
```

Puis :

```python
class ScopedModelViewSet(BaseApiViewSet):
    visibility_policy = DefaultVisibilityPolicy()
    resource_name = None

    def get_queryset(self):
        qs = self.get_base_queryset()
        return self.visibility_policy.filter_queryset(self.request.user, qs, self.resource_name)
```

### Mapping cible par ressource

`FormationViewSet`
- scope principal : `centre`
- lookup : `centre_id`

`CandidatViewSet`
- scope principal : `centre`
- lookup : `formation__centre_id`

`DocumentViewSet`
- scope principal : `centre`
- lookup : `formation__centre_id`

`AppairageViewSet`
- scope principal : `centre`
- lookups :
  - `formation__centre_id`
  - `candidat__formation__centre_id`

`ProspectionViewSet`
- scope principal : `centre_or_owner`
- lookups :
  - `formation__centre_id`
  - `centre_id`
  - `owner`
  - `created_by`

`CVThequeViewSet`
- scope principal : `centre` pour staff
- scope principal : `owner` côté candidat
- probablement besoin d’une policy spécifique

---

## 4. Encapsulation métier (P1)

### État d’avancement

Statut : `en cours`

Implémenté :
- service de synchronisation placement appairage -> candidat :
  - [`rap_app/services/placement_services.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/services/placement_services.py)
- service de gestion des comptes candidats :
  - [`rap_app/services/candidate_account_service.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/services/candidate_account_service.py)
- service de résolution owner/formation/centre des prospections :
  - [`rap_app/services/prospection_ownership_service.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/services/prospection_ownership_service.py)

Branches API déjà migrées :
- [`rap_app/api/viewsets/appairage_viewsets.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/appairage_viewsets.py)
  - appel explicite à `AppairagePlacementService.sync_after_save()`
- [`rap_app/api/viewsets/candidat_viewsets.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/candidat_viewsets.py)
  - `creer_compte` branché sur `CandidateAccountService.promote_to_stagiaire()`
  - `valider_demande_compte` branché sur `CandidateAccountService.provision_candidate_account()`
- [`rap_app/api/viewsets/prospection_viewsets.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api/viewsets/prospection_viewsets.py)
  - `perform_create` et `perform_update` branchés sur `ProspectionOwnershipService.resolve_and_sync_ownership()`

Garde-fous temporaires en place :
- différé du sync placement implicite :
  - [`rap_app/signals/appairage_signals.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/signals/appairage_signals.py)
  - [`rap_app/models/appairage.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/models/appairage.py)
- différé du sync user <-> candidat :
  - [`rap_app/signals/candidats_signals.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/signals/candidats_signals.py)
- différé du sync owner -> formation prospection :
  - [`rap_app/signals/candidats_signals.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/signals/candidats_signals.py)

Comportements désormais sécurisés côté API :
- la synchronisation du placement candidat ne dépend plus uniquement du signal
- la liaison `CustomUser <-> Candidat` ne peut plus écraser silencieusement une relation existante
- une collision d’email avec un autre candidat réel est refusée explicitement
- un candidat qui crée sa propre prospection n’a plus besoin d’envoyer `formation` ni `centre_id`
- `owner`, `formation` et `centre_id` sont résolus côté backend via service

Tests ajoutés :
- [`rap_app/tests/tests_services/test_placement_services.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/tests/tests_services/test_placement_services.py)
- [`rap_app/tests/tests_services/test_candidate_account_service.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/tests/tests_services/test_candidate_account_service.py)
- [`rap_app/tests/tests_services/test_prospection_ownership_service.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/tests/tests_services/test_prospection_ownership_service.py)
- extension des tests viewsets :
  - [`rap_app/tests/tests_viewsets/tests_candidat_accounts_viewset.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/tests/tests_viewsets/tests_candidat_accounts_viewset.py)
  - [`rap_app/tests/tests_viewsets/tests_prospection_viewsets.py`](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/tests/tests_viewsets/tests_prospection_viewsets.py)

Validé localement :
- compilation Python ciblée OK sur les services, signaux, modèles, viewsets et tests touchés

Non validé automatiquement dans cette session :
- l’exécution `python3 manage.py test ...` reste bloquée car `django` n’est pas installé dans l’interpréteur disponible

Reste à clôturer pour terminer réellement la Phase 3 :
- exécuter les tests Django dans un environnement outillé
- confirmer qu’aucune duplication fonctionnelle résiduelle ne subsiste entre :
  - services
  - serializers prospection
  - méthodes modèle héritées
  - signaux de sécurité temporaires
- décider si certaines logiques encore présentes dans les serializers/modèles doivent être supprimées maintenant que les services sont en place
- lancer la prochaine extraction métier :
  - `FormationMetricsService`

### Objectif

Sortir les effets de bord les plus sensibles des signaux et les transformer en appels explicites, transactionnels et testables.

### Les 3 signaux à traiter en priorité

#### 1. `appairage_signals.py`

Pourquoi il est risqué :
- synchronisation bidirectionnelle `Appairage -> Candidat`
- interaction avec `Appairage.save()`
- impact direct sur le placement candidat
- logique métier critique dispersée

Service cible :
- `AppairagePlacementService`

Responsabilités cibles :
- synchroniser le snapshot placement candidat
- créer l’historique de placement
- recalculer les statuts dépendants

#### 2. `candidats_signals.py`

Pourquoi il est risqué :
- synchronise `CustomUser <-> Candidat`
- touche à l’identité et au provisioning utilisateur
- comporte déjà un garde anti-récursion
- impacte aussi `Prospection`

Services cibles :
- `CandidateAccountService`
- `ProspectionOwnershipService`

Responsabilités cibles :
- lier un user à un candidat explicitement
- créer/réconcilier un candidat depuis un user quand l’action le demande
- synchroniser la formation d’une prospection depuis son owner dans un flux métier assumé

#### 3. `commentaire_signals.py` ou `evenements_signals.py`

Pourquoi ils sont risqués :
- mettent à jour des stats ou historiques de `Formation`
- effet de bord non visible depuis les endpoints métier
- risque de recalcul implicite à chaque modification

Service cible :
- `FormationMetricsService`

Responsabilités cibles :
- recalculer les métriques de formation
- historiser les événements métier liés à une formation
- fournir un point d’appel clair pour `commentaire`, `evenement`, `document`

---

## 5. Exemple de service remplaçant un signal critique

### Exemple : `AppairagePlacementService`

```python
from django.db import transaction


class AppairagePlacementService:
    @classmethod
    @transaction.atomic
    def sync_after_save(cls, appairage, actor=None):
        candidat = appairage.candidat

        snapshot = cls.build_snapshot_from_appairage(appairage)
        cls.apply_snapshot_to_candidat(candidat, snapshot, actor=actor)
        cls.create_history_if_needed(candidat, appairage, actor=actor)

    @classmethod
    def build_snapshot_from_appairage(cls, appairage):
        return {
            "entreprise_placement": appairage.partenaire,
            "date_placement": appairage.date_appairage.date() if appairage.date_appairage else None,
            "resultat_placement": cls.map_statut_to_resultat(appairage.statut),
        }

    @classmethod
    def apply_snapshot_to_candidat(cls, candidat, snapshot, actor=None):
        dirty = False
        for field, value in snapshot.items():
            if getattr(candidat, field) != value:
                setattr(candidat, field, value)
                dirty = True

        if dirty:
            candidat.save(user=actor)

    @classmethod
    def create_history_if_needed(cls, candidat, appairage, actor=None):
        HistoriquePlacementService.record_from_appairage(
            candidat=candidat,
            appairage=appairage,
            actor=actor,
        )
```

### Usage cible dans un service d’orchestration

```python
class AppairageService:
    @classmethod
    @transaction.atomic
    def create_appairage(cls, payload, actor):
        appairage = Appairage.objects.create(**payload, created_by=actor, updated_by=actor)
        AppairagePlacementService.sync_after_save(appairage, actor=actor)
        AuditLogService.log_create(appairage, actor)
        return appairage
```

### Bénéfices

- ordre d’exécution explicite
- meilleure testabilité
- comportement visible depuis le flux métier
- moins de récursions implicites

---

## 6. Ordre des tâches recommandé

### Phase 1 — Stabiliser le contrat API

Objectif :
- figer le format de réponse avant de déplacer la logique interne

Tâches :
1. créer `ApiResponseMixin`
2. créer `BaseApiViewSet`
3. ajouter un `exception_handler` global
4. migrer 3 endpoints pilotes :
   - `formations`
   - `documents`
   - `users`
5. supprimer l’enveloppe HTTP des serializers concernés
6. écrire les tests de contrat JSON

Pourquoi commencer par là :
- le frontend dépend immédiatement de cette stabilité
- cela ne modifie pas encore la logique métier profonde

État :
- infrastructure commune créée
- 3 endpoints pilotes refactorés
- tests ajoutés/ajustés
- validation `pytest` encore à exécuter dans un environnement outillé

### Phase 2 — Factoriser le scoping sécurité

Objectif :
- fiabiliser la sécurité avant les gros déplacements métier

Tâches :
1. créer `ScopedModelViewSet`
2. définir la convention de scope par ressource
3. migrer d’abord les viewsets simples :
   - `centres`
   - `documents`
   - `types_offre`
   - `rapports`
4. migrer ensuite :
   - `formations`
   - `candidats`
   - `appairages`
   - `prospections`
5. traiter séparément `CVTheque` et les endpoints stats

Pourquoi en deuxième :
- le scoping est critique pour la sécurité
- mais moins dangereux à déplacer une fois le contrat API stabilisé

État :
- `ScopedModelViewSet` créé
- scoping centre déjà migré sur `documents`, `formations`, `candidats`, `appairages`
- `prospections` volontairement laissé en mode hybride en attente
- validation runtime encore bloquée par l’absence de Django dans l’environnement courant

### Phase 3 — Introduire les services sans supprimer les signaux

Objectif :
- préparer la migration métier sans régression brutale

Tâches :
1. créer les services cibles
2. faire appeler les services depuis les viewsets ou flows métier
3. conserver temporairement les signaux en place
4. comparer le comportement réel via tests

Pourquoi cette phase tampon :
- elle permet d’introduire les services sans casser immédiatement la prod

État :
- `AppairagePlacementService` implémenté et branché sur l’API
- `CandidateAccountService` implémenté et branché sur les actions comptes candidats
- `ProspectionOwnershipService` implémenté et branché sur create/update prospections
- garde-fous `defer_...` ajoutés pour laisser les signaux comme filet de sécurité hors API
- validation runtime encore bloquée par l’absence de Django dans l’environnement courant

### Phase 4 — Désactiver progressivement les signaux critiques

Ordre recommandé :
1. `appairage_signals.py`
2. `candidats_signals.py`
3. `commentaire_signals.py` / `evenements_signals.py`

Méthode :
- désactiver un signal à la fois
- couvrir le service équivalent par tests
- valider les régressions avant la phase suivante

### Phase 5 — Nettoyage de dette

Tâches :
- supprimer les helpers de scope redondants
- supprimer les classes dupliquées comme `RoleChoicesView`
- corriger les imports fragiles
- supprimer les branchements fantômes comme `document_created`
- réaligner docstrings et documentation

---

## 7. Plan de migration par priorité

### P0 — critique

- créer `ApiResponseMixin`
- créer `BaseApiViewSet`
- retirer toute logique HTTP des serializers
- harmoniser le format des erreurs
- corriger le cas `formations` en premier

### P1 — important

- créer `ScopedModelViewSet`
- migrer les viewsets de périmètre simple
- introduire `AppairagePlacementService`
- introduire `CandidateAccountService`
- introduire `FormationMetricsService`
- commencer l’extinction progressive des signaux critiques

### P2 — amélioration technique

- optimiser les serializers sujets au N+1
- revoir la couche audit/logs
- sortir progressivement les règles métier multi-modèles des modèles eux-mêmes

### P3 — confort / maintenance

- rationaliser les noms de routes et champs
- nettoyer les duplications mineures
- renforcer la lisibilité et la documentation interne

---

## 8. Garde-fous pour minimiser les régressions

### Règles de conduite

- ne pas refactorer API et logique métier profonde dans le même commit
- ne pas supprimer un signal avant que son service équivalent soit en place et testé
- ne pas modifier plusieurs politiques de sécurité simultanément
- privilégier une migration ressource par ressource

### Stratégie de validation

Pour chaque ressource migrée :
- tests contrat JSON
- tests permissions
- tests périmètre centre
- tests cas métier critiques

### Domaine pilote recommandé

Ordre conseillé :
1. `documents`
2. `formations`
3. `users`
4. `appairages`
5. `candidats`
6. `prospections`

Pourquoi :
- `documents` est simple pour valider la base commune
- `formations` est le meilleur cas P0
- `appairages` et `candidats` sont les plus sensibles métier

---

## 9. Résultat attendu

À l’issue du plan :
- le frontend React/Expo consomme un contrat JSON stable
- le scoping par rôle et centre est lisible et centralisé
- les workflows critiques ne dépendent plus de signaux implicites
- les viewsets sont plus fins et plus homogènes
- le backend devient plus testable, plus prévisible et moins coûteux à maintenir

---

## 10. Synthèse exécutive

Le bon ordre de refactorisation est :

1. standardiser l’API
2. centraliser la sécurité/scoping
3. introduire les services métier
4. éteindre progressivement les signaux critiques
5. nettoyer la dette restante

Le point clé de stabilité est simple :
- commencer par rendre les échanges HTTP prévisibles
- finir par les effets de bord cachés

Si cette direction te convient, la prochaine étape utile est de transformer ce plan en backlog d’implémentation concret, lot par lot, avec fichiers cibles, risques et critères d’acceptation.
