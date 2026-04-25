# Plan de mise en oeuvre — Synthèse journalière et plan d'action hebdomadaire des commentaires de formation

**Statut :** cadrage fonctionnel et technique consolidé  
**Objectif principal :** permettre de regrouper les commentaires de formation d'une période donnée afin de produire, éditer et suivre un plan d'action structuré, sans casser l'application existante.  
**Principe directeur :** ajouter une couche de synthèse indépendante au-dessus du module `Commentaire`, sans modifier son fonctionnement.

---

## 1. Objectif métier

Aujourd'hui, les commentaires de formation sont saisis au fil de l'eau, mais ne permettent pas une exploitation synthétique efficace pour le pilotage hebdomadaire.

Le besoin cible est :

- regrouper les commentaires sur une période (`jour` / `semaine`)
- identifier rapidement les points clés
- produire une synthèse éditoriale
- construire un plan d'action associé
- conserver un historique structuré et traçable

On ne remplace pas le module existant, on ajoute une couche de pilotage.

---

## 2. Contrainte absolue : zero regression

Le système actuel doit rester strictement inchangé.

Cela implique :

- ne pas modifier le modèle `Commentaire`
- ne pas modifier les routes existantes
- ne pas modifier les serializers existants de commentaires
- ne pas impacter les pages actuelles (`formations`, `commentaires`)
- ne pas casser les exports existants
- ne pas modifier les usages actuels des utilisateurs
- documenter le code ajouté avec des docstrings cohérentes avec le reste du projet
- respecter le système de thème frontend existant, comme sur les autres pages de l'application

Toute la nouvelle logique doit être isolée.

---

## 3. Choix d'architecture

### 3.1 Nouveau module métier

Créer un module dédié :

- `PlanActionFormation`

Cet objet représente une synthèse structurée basée sur un ensemble de commentaires.

### 3.2 Pourquoi ce choix

- respecte la source de vérité (`Commentaire`)
- évite toute surcharge du modèle existant
- permet une évolution future (`IA`, workflows, reporting)
- minimise le risque de régression

### 3.3 Principe d'isolation

Le module doit être :

- autonome côté backend
- autonome côté frontend
- optionnel dans les parcours utilisateur
- activable progressivement sans migration fonctionnelle forcée

### 3.4 Exigences de qualité de code

Le module doit respecter les conventions déjà en place dans le projet.

Cela implique :

- docstrings backend au même niveau que le reste du code Django
- commentaires et docstrings de serializers, ViewSets, modèles et services dans le style documentaire déjà utilisé
- côté frontend, composants, hooks et pages alignés sur l'organisation existante
- consommation du thème applicatif existant, sans styles isolés qui contourneraient `theme.ts` et les tokens déjà en place

---

## 4. Modèle de données recommandé

### 4.1 Structure principale

```python
class PlanActionFormation(models.Model):
    titre = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True)

    # période
    date_debut = models.DateField()
    date_fin = models.DateField()

    periode_type = models.CharField(
        max_length=20,
        choices=[
            ("jour", "Journalier"),
            ("semaine", "Hebdomadaire"),
            ("mois", "Mensuel"),
        ],
        default="semaine",
    )

    # périmètre métier
    centre = models.ForeignKey(..., null=True, blank=True)
    formation = models.ForeignKey(..., null=True, blank=True)

    # contenu
    synthese = models.TextField(blank=True)
    resume_points_cles = models.TextField(blank=True)
    plan_action = models.TextField(blank=True)
    plan_action_structured = models.JSONField(blank=True, null=True)

    # état
    statut = models.CharField(
        max_length=20,
        choices=[
            ("brouillon", "Brouillon"),
            ("valide", "Validé"),
            ("archive", "Archivé"),
        ],
        default="brouillon",
    )

    # traçabilité
    commentaires = models.ManyToManyField("Commentaire", blank=True)
    nb_commentaires = models.IntegerField(default=0)

    # stockage des filtres utilisés
    metadata = models.JSONField(default=dict, blank=True)

    # audit
    created_by = models.ForeignKey(User, ...)
    updated_by = models.ForeignKey(User, ...)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 4.2 Choix structurants

**ManyToMany vers commentaires** : obligatoire

Permet :

- traçabilité exacte
- cohérence historique
- reproductibilité

**Champ `metadata`** : important

Permet de stocker :

- filtres utilisés
- contexte de génération
- paramètres métier
- horodatage fonctionnel de la sélection

Ce champ évite les incohérences futures si les données changent.

**Champ `slug`** : recommandé dès la V1

Permet :

- URLs plus lisibles
- export plus propre
- identifiant métier plus ergonomique que l'ID technique seul

Recommandation :

- générer automatiquement le `slug` à la création
- conserver l'ID comme clé technique interne

**Champ `plan_action_structured`** : recommandé comme extension discrète

Le champ `plan_action` en `TextField` reste suffisant pour la V1.

Mais il est utile de prévoir dès maintenant un champ optionnel :

- `plan_action_structured = JSONField(blank=True, null=True)`

Ce champ permettra plus tard de stocker proprement :

- actions
- responsables
- échéances
- priorités

Sans casser la V1 ni forcer une modélisation trop lourde trop tôt.

**Champ `nb_commentaires`** : recommandé

Permet :

- affichage rapide
- tri et filtrage
- dashboards futurs
- limitation des calculs répétitifs côté liste

Recommandation :

- alimenter automatiquement ce champ à chaque mise à jour du `ManyToMany`

### 4.3 Améliorations recommandées dès la conception

**Champ recommandé dès la V1 :**

- ajouter un `resume_points_cles` pour une vue courte, lisible et exploitable rapidement

**Champs à garder en backlog pour ne pas surcharger la V1 :**

- `statut_validation`
- `version`
- `is_locked`

**Règle de simplicité V1 :**

- conserver `plan_action` en texte pour la V1, même si `plan_action_structured` existe déjà en appui

---

## 5. Périmètre fonctionnel

### 5.1 V1 cadrée et sécurisée

- filtrer les commentaires par période
- afficher les commentaires regroupés par jour
- créer une synthèse manuelle
- éditer la synthèse
- associer explicitement les commentaires source
- sauvegarder `brouillon` / `validé`
- consulter les plans existants

### 5.2 Hors périmètre V1

- génération automatique (`IA`)
- résumé automatique
- workflows de validation complexes
- modification en masse des commentaires
- automatisation métier

Approche volontairement simple pour sécuriser la livraison.

---

## 6. Permissions à prévoir dès le départ

Définir clairement :

- qui peut créer un plan
- qui peut modifier
- qui peut valider
- qui peut archiver

À implémenter dans les `ViewSets` / permissions `DRF`.

### 6.1 Recommandation simple de départ

- `create` : mêmes rôles que la création de commentaires de formation
- `update` : auteur du plan + profils supérieurs autorisés
- `validate` : staff confirmé / admin-like
- `archive` : admin-like ou rôle métier explicitement autorisé

### 6.2 Règle de visibilité

Le périmètre de consultation doit rester aligné avec le scope existant par centre et par formation, pour éviter toute fuite de visibilité métier.

---

## 7. Stratégie de mise en oeuvre zero risque

### Étape 1 — Modèle et migration

**Objectif :**

- introduire `PlanActionFormation` sans impact

**Actions :**

- création du modèle
- migration base de données
- aucun lien frontend
- docstrings du modèle et des méthodes associées rédigées comme dans les autres modules backend

**Sécurité :**

- aucune régression possible

### Étape 2 — API dédiée

**Objectif :**

- exposer une API isolée

**Actions :**

- serializer read/write
- `ViewSet` dédié
- routes :
  - `/api/plans-action-formation/`
- docstrings sur serializers, méthodes, actions et endpoints comme dans les ViewSets existants

**Filtres minimums :**

- `date_debut`
- `date_fin`
- `centre`
- `formation`
- `statut`
- `auteur`

**Sécurité :**

- aucune dépendance existante

### Étape 3 — Service de récupération des commentaires

**Objectif :**

- préparer la matière première

**Actions :**

- endpoint de lecture uniquement :
  - commentaires filtrés
  - regroupement par jour
- réutiliser la logique de filtrage existante
- documenter clairement le service ou l'endpoint de regroupement pour qu'il reste lisible et maintenable

**Sécurité :**

- aucun changement sur l'API commentaires existante

### Étape 4 — Page frontend dédiée

Créer :

- `/plans-action-formations`
- `/plans-action-formations/create`
- `/plans-action-formations/:id/edit`

**Fonctionnalités :**

- filtres période
- affichage des commentaires groupés
- sélection des commentaires
- éditeur synthèse
- éditeur plan d'action
- compteur de commentaires sélectionnés
- affichage léger du volume total lié au plan
- intégration visuelle via le thème existant comme pour les autres pages

**Important :**

- aucune modification des pages existantes
- pas de styles ad hoc qui cassent la cohérence visuelle du design system existant

### Étape 5 — Point d'entrée non intrusif

Ajouter un bouton secondaire :

- `Construire une synthèse`
- `Préparer le plan d'action`

Depuis :

- page commentaires
- page formations

**Important :**

- ne pas modifier les parcours existants

### Étape 6 — Validation et tests

À tester :

- création de plan
- édition
- sélection de commentaires
- permissions
- affichage
- respect du thème et cohérence visuelle avec les pages existantes
- présence et qualité des docstrings sur le backend ajouté

Et surtout :

- pages commentaires
- pages formations
- modales existantes
- exports

**Critère :**

- zero regression

---

## 8. Parcours utilisateur cible

1. l'utilisateur ouvre le module
2. il sélectionne une période
3. il visualise les commentaires regroupés
4. il sélectionne les plus pertinents
5. il rédige une synthèse
6. il construit un plan d'action
7. il sauvegarde (`brouillon` / `validé`)

### 8.1 Améliorations UX recommandées

Sans alourdir la V1, il serait pertinent de prévoir :

- un compteur de commentaires sélectionnés
- un rappel visuel de la période analysée
- un encart “commentaires non retenus”
- un bouton `dupliquer en nouveau brouillon`
- une alerte si l'utilisateur quitte la page avec des modifications non sauvegardées
- un chargement différé des commentaires liés si le volume devient important

### 8.2 Autosave brouillon

Bonne idée à ajouter en V1.1 ou V1.2 :

- autosave léger sur le statut `brouillon`
- validation explicite pour passer en `validé`

Cela réduit le risque de perte de saisie sans compliquer le workflow métier.

---

## 9. Risques et garde-fous

### Risque 1 — confusion métier

- séparation stricte des objets

### Risque 2 — régression

- isolation totale du module

### Risque 3 — incohérence des données

- `ManyToMany` + `metadata`

### Risque 4 — doublons

- validation métier en `soft warning`, pas en blocage dur dans un premier temps

### Risque 5 — plans trop volumineux ou peu lisibles

- imposer une structure visuelle claire côté UI
- conserver le détail des commentaires en lecture contextuelle
- ne pas chercher à tout condenser dans un seul champ

### Risque 6 — volumétrie du `ManyToMany`

Si un plan référence 50 à 300 commentaires, cela reste raisonnable, mais il faut anticiper les points suivants :

- pagination côté API pour les commentaires liés
- chargement paresseux côté frontend
- ne pas tout rendre d'un coup dans la page d'édition
- distinguer le résumé du plan et le détail des commentaires source

Le `ManyToMany` reste pertinent, mais il ne faut pas supposer un affichage intégral sans coût UX.

### Risque 7 — dérive du périmètre V1

- verrouiller un lot minimal
- repousser automatisation, IA et workflow avancé après la première livraison stabilisée

---

## 10. Règles métier recommandées

### 10.1 Gestion des doublons

Ne pas bloquer brutalement la création de doublons en V1.

Préférer :

- un avertissement si un plan existe déjà sur la même période et le même périmètre
- la possibilité de créer un nouveau brouillon malgré tout

### 10.2 Unicité souple conseillée

Règle métier recommandée :

- un seul plan `validé` par combinaison :
  - `periode_type`
  - `date_debut`
  - `date_fin`
  - `centre`
  - `formation`

Mais :

- plusieurs `brouillons` autorisés

Cette approche protège le métier sans bloquer le travail préparatoire.

### 10.3 Validation de période

Prévoir côté backend :

- `date_fin >= date_debut`
- cohérence entre `periode_type` et les dates
- message clair si la période est incohérente

### 10.4 Gestion du slug

Prévoir une règle simple :

- génération automatique à la création
- stabilité après création, sauf besoin métier explicite

Exemples de base de construction :

- type de période
- date de début
- centre ou formation

Le slug doit rester lisible sans devenir une clé métier rigide.

### 10.5 Mise à jour de `nb_commentaires`

Prévoir une synchronisation automatique :

- à la création
- à l'édition de la sélection des commentaires
- éventuellement en sauvegarde serializer / service métier dédié

L'objectif est d'éviter les écarts entre la relation réelle et le compteur affiché.

---

## 11. Ordre de livraison recommandé

1. modèle + migration
2. API dédiée
3. endpoint de récupération des commentaires
4. page frontend dédiée
5. bouton d'entrée
6. tests

### 11.1 Stratégie de déploiement conseillée

Pour limiter encore le risque :

- livrer backend d'abord
- valider les endpoints
- livrer ensuite l'écran frontend
- ajouter enfin les points d'entrée secondaires

Ainsi, chaque lot reste réversible et testable indépendamment.

### 11.2 Découpage en lots

Le développement doit être découpé en lots courts, testables et réversibles.

#### Lot 0 — Cadrage final et garde-fous

**Objectif :**

- figer le périmètre V1 avant toute implémentation

**Contenu :**

- validation du modèle cible `PlanActionFormation`
- validation des permissions cibles
- validation des champs retenus en V1
- validation du périmètre des routes frontend
- validation du comportement attendu en cas de doublon

**Livrables :**

- plan fonctionnel validé
- règles métier figées
- checklist de non-régression

**Critère de sortie :**

- aucune ambiguïté restante sur la V1

#### Lot 1 — Backend socle du module

**Objectif :**

- créer la base technique du nouveau module sans dépendance frontend

**Contenu :**

- modèle `PlanActionFormation`
- migration base de données
- génération automatique du `slug`
- gestion du champ `nb_commentaires`
- intégration de `resume_points_cles` dans la V1
- docstrings du modèle et des helpers associés

**Livrables :**

- modèle créé
- migration appliquée
- tests unitaires modèle si nécessaire

**Critère de sortie :**

- le nouveau modèle existe sans effet de bord sur les modules actuels

#### Lot 2 — API CRUD dédiée

**Objectif :**

- exposer une API isolée et documentée pour le nouveau module

**Contenu :**

- serializers lecture / écriture
- `ViewSet` dédié
- routes `/api/plans-action-formation/`
- filtres de base
- permissions `DRF`
- docstrings et documentation dans le style existant

**Livrables :**

- endpoints liste / détail / création / modification / archivage
- tests API

**Critère de sortie :**

- l'API du module fonctionne seule, sans toucher à l'API commentaires existante

#### Lot 3 — Endpoint de sélection et regroupement des commentaires

**Objectif :**

- fournir la matière première métier pour construire les plans

**Contenu :**

- endpoint de lecture seule pour récupérer les commentaires filtrés
- regroupement par jour
- pagination si nécessaire
- optimisation de volumétrie
- documentation claire de l'endpoint et de sa réponse

**Livrables :**

- endpoint de regroupement prêt à être consommé par le front
- tests de filtres, pagination et scope

**Critère de sortie :**

- les commentaires sont exploitables pour la synthèse sans modifier le module existant

#### Lot 4 — Frontend liste et consultation

**Objectif :**

- offrir un point de consultation des plans existants

**Contenu :**

- page `/plans-action-formations`
- liste des plans
- filtres principaux
- tri sur les colonnes utiles
- affichage de `nb_commentaires`
- consommation du thème existant

**Livrables :**

- page liste fonctionnelle
- hooks API associés
- UI cohérente avec le design system actuel

**Critère de sortie :**

- un utilisateur peut consulter les plans sans aucun impact sur les pages existantes

#### Lot 5 — Frontend création / édition

**Objectif :**

- permettre la fabrication d'un plan d'action à partir des commentaires

**Contenu :**

- page `/plans-action-formations/create`
- page `/plans-action-formations/:id/edit`
- filtres de période
- regroupement des commentaires
- sélection des commentaires source
- éditeur `synthese`
- éditeur `resume_points_cles`
- éditeur `plan_action`
- compteur de commentaires sélectionnés
- garde-fou contre perte de saisie

**Livrables :**

- écrans de création et d'édition complets
- comportement cohérent avec le thème existant

**Critère de sortie :**

- un utilisateur peut créer et modifier un brouillon de plan sans casser le reste de l'app

#### Lot 6 — Points d'entrée secondaires

**Objectif :**

- rendre le module accessible depuis les écrans existants sans les modifier en profondeur

**Contenu :**

- ajout d'un bouton secondaire depuis la page commentaires
- ajout d'un bouton secondaire depuis la page formations
- navigation contrôlée vers le module

**Livrables :**

- points d'entrée non intrusifs

**Critère de sortie :**

- le nouveau module est accessible, mais les parcours historiques restent inchangés

#### Lot 7 — Validation, non-régression et finition

**Objectif :**

- sécuriser la mise en production

**Contenu :**

- tests backend complémentaires
- tests frontend ciblés
- vérification manuelle des pages existantes
- vérification des modales existantes
- vérification des exports existants
- contrôle du thème et des docstrings

**Livrables :**

- checklist de validation complétée
- correctifs de finition

**Critère de sortie :**

- le module est prêt sans régression visible ni dette documentaire immédiate

---

## 12. Critères d'acceptation

La feature est validée si :

- un utilisateur peut filtrer une période
- il peut visualiser les commentaires
- il peut créer une synthèse
- il peut modifier cette synthèse
- les commentaires restent intacts
- les pages existantes fonctionnent exactement comme avant

### 12.1 Critères complémentaires utiles

- la sélection des commentaires source est conservée à la réouverture
- le scope centre / formation reste respecté
- les plans validés sont lisibles et historisés
- un brouillon peut être repris sans perte de contenu
- le code backend livré est documenté avec des docstrings cohérentes avec le reste de l'application
- le frontend consomme le thème applicatif existant comme les autres pages

---

## 13. Vision future hors V1

- génération automatique IA
- suggestion de plan d'action
- scoring des commentaires
- workflow de validation
- export PDF / reporting

### 13.1 Bonnes idées supplémentaires à garder en backlog

- export PDF du plan d'action validé
- export Word pour diffusion opérationnelle
- tableau de suivi des actions avec responsable et échéance
- champ `priorite` sur chaque action dans une V2 plus structurée
- comparaison entre deux semaines successives
- indicateur “commentaires sans synthèse associée”
- reprise d'un plan précédent comme base d'un nouveau plan
- vues liste triables sur `nb_commentaires`
- URL métier basées sur `slug`

---

## 14. Recommandation finale

La meilleure approche, au regard de la stabilité actuelle de l'application, est :

- de conserver intégralement le module `Commentaire`
- d'ajouter un module autonome `PlanActionFormation`
- de réutiliser les filtres de commentaires existants pour alimenter la synthèse
- de livrer la fonctionnalité en plusieurs étapes indépendantes

Cette stratégie répond au besoin métier tout en respectant la contrainte la plus importante : ne rien casser dans l'application existante.
