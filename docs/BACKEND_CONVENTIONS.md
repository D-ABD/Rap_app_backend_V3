# BACKEND_CONVENTIONS

## Objectif

Figer les conventions backend qui servent de référence durable pour le front,
les futures corrections et les revues de code.

## Contrat de succès

Convention cible pour les endpoints API métier :

```json
{
  "success": true,
  "message": "Message lisible court",
  "data": {}
}
```

Principes :
- `success` vaut toujours `true` sur un succès HTTP.
- `message` reste court, stable et lisible côté UI ou logs.
- `data` contient le payload utile.
- pour les listes paginées, `data` contient l'objet de pagination DRF (`count`, `next`, `previous`, `results`).
- pour une suppression logique ou une action sans payload, `data` peut valoir `null`.

Exceptions assumées :
- les réponses binaires ou fichiers (`download`, exports, previews) ne sont pas enveloppées ;
- certains endpoints d'auth JWT exposent un payload standard SimpleJWT en succès (`access`, `refresh`) pour rester compatibles avec les clients.

## Contrat d'erreur

Convention cible pour les erreurs API :

```json
{
  "success": false,
  "message": "Erreur de validation.",
  "data": null,
  "errors": {
    "field_name": ["message d'erreur"]
  }
}
```

Principes :
- `success` vaut toujours `false`.
- `message` porte le résumé principal.
- `data` vaut `null`.
- `errors` est présent pour les erreurs de validation structurées.
- une erreur non-field est rangée dans `errors.non_field_errors`.

Cas particulier :
- pour certaines erreurs simples non structurées (`401`, `403`, `404`), `errors` peut être absent et le message suffit.

## Scoping

Convention de visibilité :
- la liste, le détail et les actions custom d'une même ressource doivent partager le même périmètre métier ;
- le scoping principal passe par le queryset ;
- les permissions objet viennent en second rideau, pas comme unique garde-fou ;
- le scope par centre est la convention par défaut pour les rôles staff/staff_read ;
- un objet hors périmètre doit idéalement être invisible au même titre en `list`, `retrieve` et action custom.

## Services

Convention de responsabilité :
- les services portent les écritures métier critiques et transactionnelles ;
- un viewset appelle un service quand une action a des effets de bord métier non triviaux ;
- un modèle peut garder des validations locales et invariants simples, mais ne doit pas devenir un orchestrateur transverse.

Services de référence déjà stabilisés :
- `CandidateAccountService`
- `AppairagePlacementService`
- `ProspectionOwnershipService`

## Signaux

Convention de rôle résiduel :
- les signaux servent à l'observation, à la journalisation ou à des réactions locales simples ;
- ils ne doivent plus constituer le chemin métier principal quand un service explicite existe déjà ;
- les signaux encore présents en mode observation doivent le dire clairement dans leur docstring.

## Compatibilité

Convention de compatibilité transitoire :
- pas de renommage massif de champs sans stratégie de compatibilité ;
- un alias ou une tolérance d'entrée doit être explicitement marqué comme rétro-compatible ;
- tout comportement de compatibilité encore utile doit être documenté dans le code ou ici.

## Modules dormants ou périphériques

Modules présents mais non structurants pour le runtime API principal :
- `VAE`
- `SuiviJury`
- certaines vues HTML/templates historiques
- scripts de debug/export non branchés au front

Ils ne doivent pas dicter les conventions de l'API principale tant qu'ils ne sont pas réintégrés explicitement.
