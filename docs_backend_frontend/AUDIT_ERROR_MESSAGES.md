# Audit clair - Messages d'erreur RAP_APP

Date: 2026-04-26

Statut: audit de cadrage pour améliorer les messages d'erreur sans régression. Ce document est volontairement orienté "quoi faire" et "dans quel ordre".

## 1. Conclusion principale

Oui, il faut d'abord fiabiliser le backend, puis faire correspondre le frontend.

Pourquoi:

- le backend est la source de vérité ;
- si les messages backend restent flous, le frontend ne peut pas être propre ;
- si le frontend corrige avant, on risque de masquer les défauts backend avec des rustines locales ;
- cela crée vite des incohérences entre modules.

L'ordre recommandé est donc:

1. audit et normalisation backend ;
2. alignement frontend sur le contrat backend ;
3. harmonisation UX finale.

## 2. Etat actuel

### Ce qui est déjà bien

- il existe un `exception_handler` global ;
- plusieurs modules backend ont déjà de bons messages métier, surtout `candidat` ;
- certains formulaires frontend récents affichent correctement les erreurs champ par champ ;
- il existe déjà des utilitaires front utiles comme `toApiError`.

### Ce qui pose problème

- trop de messages backend génériques du type `Erreur de validation.` ;
- certains messages backend sont encore techniques ;
- le frontend n'affiche pas toujours le vrai message backend ;
- plusieurs écrans remplacent l'erreur utile par :
  - `Erreur lors de...`
  - `Impossible de...`
  - `Erreur inconnue`
  - `HTTP 404`
- certains composants anciens utilisent encore `alert()`.

## 3. Ce qu'il faut faire

## Phase 1 - Backend d'abord

Objectif: faire du backend une base propre, cohérente et exploitable.

### 3.1 Vérifier tous les points d'émission d'erreur backend

À auditer:

- `models.py`
- `clean()`
- `ValidationError`
- serializers DRF
- `validate()`
- `validate_<field>()`
- viewsets
- `@action`
- `PermissionDenied`
- `NotFound`
- `error_response()`
- `exception_handler.py`

### 3.2 Corriger les messages backend trop génériques

Problème actuel:

- plusieurs endpoints renvoient `Erreur de validation.` comme message principal ;
- ce message est trop faible pour un affichage direct côté frontend.

À faire:

- remplacer ces messages par des formulations contextuelles ;
- garder `errors` pour le détail champ par champ ;
- faire en sorte que `message` soit déjà affichable tel quel.

Exemples cibles:

- `Impossible de créer le compte. Vérifiez les champs signalés puis réessayez.`
- `Impossible d’enregistrer la séance Déclic. Vérifiez les champs signalés.`
- `Le mot-clé de recherche est obligatoire.`

### 3.3 Corriger les messages backend trop techniques

Problème actuel:

- certains messages parlent encore comme du code ou du debug.

Exemples typiques:

- `Modèle 'Centre' introuvable via Formation.centre.`
- `IDs inexistants: [...]`
- `Type de document non reconnu : ...`
- `Statut invalide: ...`

À faire:

- réécrire ces messages en langage utilisateur ;
- réserver le détail technique aux logs si besoin ;
- indiquer quoi faire ensuite quand c'est utile.

### 3.4 Clarifier les messages de permissions

Problème actuel:

- plusieurs refus d'accès restent trop courts:
  - `Accès refusé.`
  - `Authentification requise.`
  - `Centre hors de votre périmètre.`

À faire:

- expliciter la cause ;
- si utile, indiquer l'action suivante ;
- harmoniser les formulations sur les modules les plus utilisés.

Exemple cible:

- `Vous n’avez pas les droits nécessaires pour cette action. Si cela vous semble anormal, contactez un administrateur.`

### 3.5 Stabiliser le contrat d'erreur API

Objectif:

garantir que toutes les erreurs API exposent de manière cohérente:

- `message`
- `errors`
- `error_code` quand utile

À faire:

- vérifier que les endpoints métiers sensibles utilisent bien ce contrat ;
- éviter les réponses ad hoc ou incomplètes ;
- faire du backend un contrat fiable pour le front.

### Resultat attendu de la phase 1

- le backend produit des messages clairs, non techniques et cohérents ;
- les erreurs champ par champ sont bien distinguées du message global ;
- le frontend pourra ensuite se contenter d'afficher correctement ce contrat.

## Phase 2 - Faire correspondre le frontend

Objectif: ne plus perdre les bons messages backend et supprimer les messages pauvres côté UI.

### 3.6 Vérifier les hooks et clients API

À auditer en priorité:

- hooks de chargement
- hooks de formulaires
- hooks de commentaires
- helpers génériques de lecture d'erreur

Problèmes actuels:

- certains hooks transforment l'erreur en `HTTP 404` ;
- d'autres retombent sur `Erreur inconnue` ;
- d'autres ignorent `errors` et `message`.

À faire:

- standardiser l'usage de `toApiError` ;
- faire remonter `message` en priorité ;
- garder un fallback propre seulement si l'API n'a rien fourni.

### 3.7 Supprimer les messages frontend génériques

À corriger:

- `Erreur lors de l'archivage`
- `Erreur lors de l'export`
- `Impossible de charger ...`
- `Erreur inconnue`
- `Réponse invalide`
- `Erreur réseau`

À faire:

- utiliser le vrai message backend quand il existe ;
- garder un fallback contextualisé sinon.

### 3.8 Supprimer les `alert()`

Problème:

- les `alert()` sont incohérents avec le reste de l'application ;
- ils perdent souvent l'information utile venant du backend.

À faire:

- les remplacer par `toast.error(...)` ou `Alert` MUI ;
- afficher le vrai message métier.

### 3.9 Uniformiser les formulaires

Référence cible:

- formulaires qui affichent déjà:
  - une erreur globale utile ;
  - les erreurs champ par champ ;
  - un message cohérent avec l'API.

À faire:

- reprendre ce pattern sur les formulaires plus anciens ;
- éviter qu'un écran affiche juste un toast générique alors que le champ en erreur est connu.

### Resultat attendu de la phase 2

- le frontend reflète fidèlement les erreurs backend ;
- l'utilisateur voit des messages utiles, homogènes et actionnables ;
- les modules anciens rattrapent progressivement le niveau des modules récents.

## Phase 3 - Harmonisation UX finale

Objectif: rendre les messages cohérents dans toute l'application.

### 3.10 Définir une ligne éditoriale simple

Chaque message devrait répondre à au moins deux questions:

1. que s'est-il passé ?
2. que faire ensuite ?

Exemples:

- mauvais: `Erreur de validation.`
- meilleur: `Impossible d’enregistrer la formation. Vérifiez les champs signalés puis réessayez.`

### 3.11 Définir des fallbacks communs

Quand on n'a pas de meilleur message:

- chargement:
  - `Une erreur est survenue lors du chargement. Réessayez.`
- enregistrement:
  - `L’enregistrement a échoué. Vérifiez les informations saisies puis réessayez.`
- réseau:
  - `Le serveur est momentanément inaccessible. Réessayez dans quelques instants.`

### Resultat attendu de la phase 3

- ton uniforme ;
- meilleure lisibilité pour les utilisateurs ;
- dette UX réduite pour les futurs développements.

## 4. Ordre d'execution recommande

### P0 - Critique

1. nettoyer le backend:
   - messages génériques
   - messages techniques
   - contrat API
2. corriger les hooks frontend qui détruisent le message backend
3. supprimer les `alert()` et les messages `HTTP 404`

### P1 - Important

4. harmoniser les formulaires create/edit
5. harmoniser les messages de permissions
6. réduire les toasts génériques

### P2 - Amélioration

7. unifier les fallbacks
8. poser une ligne éditoriale durable

## 5. Ce qu'il ne faut pas faire

- ne pas corriger tout le frontend avant d'avoir clarifié le backend ;
- ne pas multiplier les "traductions" locales différentes d'un même message ;
- ne pas créer de logique métier dans le frontend pour compenser des erreurs backend floues ;
- ne pas lancer un refactor massif si quelques points centraux suffisent à améliorer fortement la situation.

## 6. Definition de fini

Le chantier sera bien engagé quand:

- le backend fournit partout des messages clairs ;
- les erreurs API importantes ont un `message` utile et des `errors` détaillées ;
- le frontend affiche le message backend au lieu d'un placeholder générique ;
- il n'y a plus de `HTTP 404`, `Erreur inconnue`, `Réponse invalide` ou `alert()` sur les parcours principaux ;
- les formulaires critiques affichent correctement les erreurs globales et par champ.

## 7. Resume final

Ce qu'il faut faire est simple dans son principe:

- d'abord rendre le backend propre et cohérent ;
- ensuite brancher correctement le frontend dessus ;
- enfin harmoniser l'expérience utilisateur.

Le vrai risque aujourd'hui n'est pas l'absence totale de messages, mais la perte de qualité entre backend et frontend. C'est donc là qu'il faut concentrer le travail.
