# Error Handling Front Reuse Plan

Date: 2026-03-21

## But

Mettre en place une gestion des erreurs backend :

- cohérente
- stable
- réutilisable côté front
- sans casser les endpoints existants

L’objectif n’est pas seulement d’avoir des messages lisibles, mais un contrat d’erreur unique que le front peut parser partout de la même manière.

## Constat Actuel

Le code contient déjà une bonne base :

- un handler global DRF :
  - `rap_app/api/exception_handler.py`
- un mixin de réponses standard :
  - `rap_app/api/mixins.py`

Le contrat cible existe donc déjà largement :

```json
{
  "success": false,
  "message": "Erreur de validation.",
  "data": null,
  "errors": {
    "field_name": ["Message lisible"]
  }
}
```

Mais l’application n’est pas encore homogène :

- certains endpoints renvoient encore `{"detail": "..."}`
- certains renvoient `{"error": "..."}`
- certains renvoient `success/message` sans `errors`
- certains endpoints custom utilisent encore des `Response(...)` ad hoc
- plusieurs services/serializers lèvent des erreurs avec des formes différentes

## Objectif Métier Et Front

À la fin du chantier, le front doit pouvoir appliquer une seule stratégie de parsing :

1. lire `success`
2. afficher `message`
3. exploiter `errors` pour les erreurs champ par champ
4. utiliser éventuellement `error_code` pour les comportements UI spécifiques

Le front ne doit plus dépendre de :

- `detail`
- `error`
- variations de structure selon l’endpoint

## Contrat Cible

### Réponse succès JSON

```json
{
  "success": true,
  "message": "Texte réutilisable.",
  "data": {}
}
```

### Réponse erreur validation

```json
{
  "success": false,
  "message": "Erreur de validation.",
  "data": null,
  "errors": {
    "email": ["Adresse email invalide."]
  }
}
```

### Réponse erreur métier globale

```json
{
  "success": false,
  "message": "Action impossible.",
  "data": null,
  "errors": {
    "non_field_errors": ["Le candidat doit être affecté à une formation."]
  }
}
```

### Réponse erreur permission / accès

```json
{
  "success": false,
  "message": "Accès refusé.",
  "data": null
}
```

### Extension recommandée

Ajouter progressivement un champ optionnel :

```json
{
  "success": false,
  "message": "Demande de compte déjà en attente.",
  "data": null,
  "errors": {
    "non_field_errors": ["Demande de compte déjà en attente."]
  },
  "error_code": "candidate_account_request_already_pending"
}
```

Ce champ doit rester optionnel au début pour ne pas casser l’existant.

## Règles À Figera

### Règle 1

Tous les endpoints JSON doivent renvoyer :

- `success`
- `message`
- `data`

### Règle 2

Toutes les erreurs de validation doivent exposer `errors`.

### Règle 3

Les erreurs globales doivent utiliser :

- `errors.non_field_errors`

et non des strings isolées ambiguës.

### Règle 4

`detail` ne doit plus être un contrat front public.

Il peut exister temporairement dans des chemins legacy, mais il doit être progressivement supprimé.

### Règle 5

Les endpoints binaires restent des exceptions légitimes :

- PDF
- XLSX
- CSV
- download / preview

Pour ceux-là, les erreurs JSON doivent tout de même rester homogènes quand l’endpoint ne peut pas produire le fichier.

## Stratégie Sans Casse

Le chantier ne doit pas être fait en big bang.

### Principe

1. corriger d’abord les endpoints les plus utilisés par le front
2. préserver les statuts HTTP existants
3. ne pas changer les payloads de succès déjà consommés si cela n’est pas nécessaire
4. n’ajouter `error_code` qu’en mode additif
5. verrouiller chaque lot par tests ciblés

## Plan D’Exécution

## Lot E1 - Inventaire Et Classification

### But

Lister tous les endpoints JSON qui ne respectent pas encore totalement le contrat cible.

### À faire

- recenser les `Response({"detail": ...})`
- recenser les `Response({"error": ...})`
- recenser les réponses `success/message` sans `errors`
- classer les endpoints :
  - front critique
  - admin/back-office
  - stats
  - exports

### Sortie attendue

Une matrice :

- endpoint
- type d’écart
- risque de casse
- priorité

## Lot E2 - Durcissement Du Handler Global

### But

Faire du handler global la vraie source de vérité des erreurs DRF.

### À faire

- compléter `rap_app/api/exception_handler.py`
- normaliser plus strictement :
  - `ValidationError`
  - `PermissionDenied`
  - `NotFound`
  - `AuthenticationFailed`
  - `NotAuthenticated`
  - erreurs 400 génériques
- garder :
  - `success`
  - `message`
  - `data`
  - `errors` si nécessaire
- préparer le support additif de `error_code`

### Important

Ce lot doit être additif et prudent.

Il ne doit pas casser :

- les réponses enveloppées déjà correctes
- les tests API existants

## Lot E3 - Remplacement Des Réponses Legacy Les Plus Critiques

### But

Supprimer les écarts les plus visibles pour le front.

### Cibles prioritaires

- commentaires prospection
- commentaires appairage
- appairages
- documents
- stats
- actions custom très utilisées

### À faire

Remplacer les `Response(...)` ad hoc par :

- `success_response()`
- `error_response()`
- ou exceptions DRF normalisées

### Règle

Ne pas tout refactorer d’un coup.

Traiter par famille fonctionnelle.

## Lot E4 - Normalisation Des Erreurs Métier Services/Serializers

### But

Faire converger la forme des erreurs remontées par les couches métier.

### À faire

Standardiser progressivement :

- erreurs champ :
  - `{"email": ["..."]}`
- erreurs globales :
  - `{"non_field_errors": ["..."]}`
- éviter :
  - strings simples
  - `{"detail": "..."}`
  - messages mélangés sans structure

### Cibles prioritaires

- `CandidateAccountService`
- `CandidateLifecycleService`
- serializers candidats
- serializers prospections
- serializers appairages

## Lot E5 - Introduction Progressive De Error Codes

### But

Permettre au front d’avoir des comportements robustes sans parser les messages humains.

### Principe

Les messages restent affichables.
Les `error_code` servent à la logique.

### Exemples utiles

- `validation_error`
- `permission_denied`
- `not_found`
- `candidate_account_already_linked`
- `candidate_account_request_already_pending`
- `candidate_requires_formation`
- `out_of_scope_centre`
- `duplicate_appairage`

### Règle

Ne pas imposer `error_code` partout immédiatement.
Le déployer d’abord sur les flux métier les plus importants.

## Lot E6 - Contrat Front Documenté

### But

Faire de la doc un reflet du code réel.

### À mettre à jour

- `FRONTEND_MASTER_GUIDE.md`

### À documenter

- format standard d’erreur
- différence entre `message` et `errors`
- présence optionnelle de `error_code`
- exceptions binaires
- mapping recommandé côté front

## Lot E7 - Dépréciation Finale Des Formes Legacy

### But

Supprimer ce qui reste de :

- `detail`
- `error`
- réponses custom incohérentes

### Précondition

Ce lot ne doit être fait qu’après :

- migration front
- validation QA
- couverture de tests suffisante

## Ordre Recommandé

1. `E1` inventaire
2. `E2` handler global
3. `E3` endpoints front critiques
4. `E4` services et serializers métier
5. `E5` error codes
6. `E6` documentation front
7. `E7` retrait final legacy

## Ce Qui Peut Être Fusionné

Peut être fait ensemble :

- `E2 + E3`
  - si on reste sur les endpoints les plus critiques
- `E4 + E5`
  - si les error codes sont ajoutés là où les messages métier sont déjà retravaillés
- `E6`
  - peut être mis à jour en parallèle après chaque lot significatif

## Ce Qui Ne Doit Pas Être Fusionné

À éviter :

- refactorer tous les viewsets en une seule passe
- introduire `error_code` partout en même temps
- modifier le handler global et tous les tests API dans le même très gros lot
- toucher simultanément :
  - erreurs JSON
  - exports binaires
  - contrats front de succès

## Plan De Tests

## Niveau 1 - Tests Contractuels API

Créer ou compléter des tests du type :

- enveloppe d’erreur standard sur validation
- enveloppe d’erreur standard sur permission
- enveloppe d’erreur standard sur not found
- présence conditionnelle de `errors`
- présence optionnelle de `error_code`

## Niveau 2 - Tests Par Domaine

Couvrir au minimum :

- candidats
- prospections
- appairages
- commentaires
- documents
- stats

## Niveau 3 - Tests De Non Régression Front

Même si le front n’est pas encore codé partout, verrouiller le contrat utile :

- `message` toujours présent
- `errors` toujours exploitable
- plus de dépendance à `detail`

## Risques

### Risque 1

Changer la structure d’erreur d’un endpoint déjà consommé en dur par le front.

### Réponse

Faire une migration additive puis déprécier.

### Risque 2

Casser des tests existants qui vérifient encore `detail`.

### Réponse

Mettre à jour les tests au moment du lot ciblé, pas globalement.

### Risque 3

Uniformiser des endpoints binaires comme s’ils étaient JSON.

### Réponse

Documenter explicitement les exceptions.

## Définition De Fini

Le chantier sera considéré comme terminé quand :

- tous les endpoints JSON front critiques exposent le même contrat d’erreur
- `message` est toujours exploitable
- `errors` est structuré de façon stable
- les erreurs métier majeures ont des `error_code`
- le front n’a plus besoin de parser `detail`
- les formes legacy sont soit supprimées, soit clairement dépréciées

## Recommandation Immédiate

Le meilleur premier lot concret est :

- `E1 + E2 + E3` sur le périmètre front critique

En pratique :

1. inventaire ciblé des réponses legacy
2. correction du handler global
3. correction des endpoints commentaires / appairages / documents / stats prioritaires

Cela donne rapidement une vraie base réutilisable côté front, sans attendre la fin de tout le chantier.
