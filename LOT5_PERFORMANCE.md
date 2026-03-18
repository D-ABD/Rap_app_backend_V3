# LOT5_PERFORMANCE

## Objectif

Réduire les coûts évidents de sérialisation et fiabiliser les filtres ORM sans changer le contrat API.

## Changements

- `CandidatListSerializer` réutilise désormais les `appairages` préchargés pour construire `last_appairage`.
- `AppairageLiteSerializer`, `AppairageSerializer` et `AppairageListSerializer` réutilisent désormais les `commentaires` préchargés, ou l'annotation `last_commentaire` quand elle existe déjà.
- `FormationViewSet.get_queryset()` annote explicitement `places_disponibles` pour que `?places_disponibles=true` reste un vrai filtre ORM.
- `BaseModel.get_changed_fields()` accepte maintenant un sous-ensemble de champs, ce qui évite de recharger inutilement tout le modèle lors des `save(update_fields=[...])`.

## Garanties recherchées

- mêmes payloads JSON qu'avant ;
- mêmes droits d'accès ;
- moins de requêtes parasites lors des listes candidats et appairages ;
- filtre formations plus prédictible côté base.

## Tests ajoutés

- sérialisation candidat avec `appairages/commentaires` préchargés sans requête additionnelle ;
- sérialisation appairage avec `commentaires` préchargés sans requête additionnelle ;
- filtre API `formations?places_disponibles=true` sur annotation ORM réelle.
