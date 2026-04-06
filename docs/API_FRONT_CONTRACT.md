# Contrat API Front

Ce document fixe les conventions de consommation front de l'API RAP_APP.

## Enveloppes JSON

- Réponse métier standard:
  - `WrappedResponse<T>`
  - forme: `{ success, message, data }`

- Réponse paginée standard:
  - `WrappedResponse<PaginatedResponse<T>>`
  - forme: `{ success, message, data: { count, next, previous, results } }`

## Dates et heures

- `date`:
  - chaîne ISO `YYYY-MM-DD`

- `date-time`:
  - chaîne ISO 8601

- Les formats d'affichage `dd/mm/YYYY` ou `dd/mm/YYYY HH:MM` sont des formats de présentation uniquement.
- Ils ne doivent pas être utilisés comme contrat d'entrée ou de sortie API sauf mention explicite d'un champ purement décoratif.

## Nullabilité et optionnalité

- `required`:
  - champ obligatoire dans la requête ou dans l'objet documenté

- `optional`:
  - champ pouvant être absent

- `nullable`:
  - champ pouvant être présent avec la valeur `null`

- `optional` et `nullable` ne sont pas équivalents et doivent être interprétés séparément côté front.

## Enums

- Le front doit consommer en priorité les valeurs stables exposées par l'API.
- Les labels sont destinés à l'affichage.
- Quand un endpoint retourne `{ value, label }`, `value` est la clé contractuelle.

## Exports

- PDF:
  - `application/pdf`

- XLSX:
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

- CSV:
  - `text/csv`

## Booléens métier

- Un booléen métier doit être lu selon sa définition métier documentée.
- `false` ne signifie pas toujours "non" au sens métier; cela peut aussi signifier "pas encore traité", "non actif" ou "non applicable" selon la ressource.

## Paramètres de filtre

- Les suffixes `__in` représentent un filtrage multi-valeurs.
- Les paramètres `by` et `grouped` portent une logique de dashboard et doivent être lus comme des sélecteurs de dimension métier.
- Les paramètres `date_min`, `date_max`, `date_from`, `date_to` utilisent des chaînes ISO au format `YYYY-MM-DD`.
