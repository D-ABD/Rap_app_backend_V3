# Environnement de test Rap App

## Transaction propre par test

Chaque test s’exécute dans une **transaction dédiée**, annulée (rollback) à la fin du test. Aucune donnée créée dans un test ne persiste pour le suivant. C’est le comportement par défaut avec **pytest-django** et les classes héritant de `django.test.TestCase`.

## Factory Boy (User & LogUtilisateur)

- **UserFactory** : génère des `CustomUser` (email séquentiel, rôle par défaut `ROLE_STAGIAIRE`, mot de passe `password123`).
- **LogUtilisateurFactory** : génère des logs « système » (sans objet lié) avec `created_by` optionnel.

### Utilisation

```python
from rap_app.tests.factories import UserFactory, LogUtilisateurFactory

# Utilisateur par défaut (stagiaire)
user = UserFactory()

# Avec rôle
staff = UserFactory(role=CustomUser.ROLE_STAFF, email="staff@example.com")

# Log système
log = LogUtilisateurFactory(created_by=user, action=LogUtilisateur.ACTION_VIEW)

# Log lié à une instance (formation, centre, etc.)
log = LogUtilisateurFactory.for_instance(ma_formation, action=LogUtilisateur.ACTION_UPDATE, created_by=user)
```

## Lancer les tests

```bash
# Tous les tests (sous réserve des imports corrigés)
pytest rap_app/tests

# Avec coverage du package signals/
pytest rap_app/tests --cov=rap_app.signals --cov-report=term-missing
```

## Coverage des fichiers `signals/`

Pour savoir si les tests couvrent bien le code métier des signaux :

```bash
pytest rap_app/tests --cov=rap_app.signals --cov-report=term-missing
```

Le rapport affiche les lignes non couvertes (`Missing`) par fichier dans `rap_app/signals/`.  
Rapport HTML (optionnel) :

```bash
pytest rap_app/tests --cov=rap_app.signals --cov-report=html
# Puis ouvrir htmlcov/index.html
```

**Note :** Certains modules de tests ont des erreurs d’import préexistantes (ex. `vae_jury`, serializers). En les corrigeant, plus de tests s’exécuteront et la couverture des signals pourra augmenter.

---

## Exemple de rapport Coverage (signals/)

Lors d’une exécution type sur un sous-ensemble de tests, le coverage des fichiers `rap_app/signals/` peut ressembler à ceci (à régénérer avec la commande ci‑dessus) :

| Fichier | Couverture | Commentaire |
|---------|------------|-------------|
| `centres_signals.py` | ~86% | Bien couvert |
| `formations_signals.py` | ~68% | Partiel |
| `types_offres_signals.py` | ~65% | Partiel |
| `candidats_signals.py` | ~44% | Beaucoup de branches non couvertes |
| `logs_signals.py` | ~41% | À compléter |
| `evenements_signals.py` | ~39% | À compléter |
| `statut_signals.py` | — | Supprimé (module VAE/Jury désactivé) |
| `documents_signals.py` | ~34% | À compléter |
| `rapports_signals.py` | ~46% | Partiel |
| `partenaires_signals.py`, `prospections_signals.py`, `commentaire_signals.py`, `appairage_signals.py` | ~13–21% | Peu couverts par les tests actuels |

Pour voir les **lignes exactes non couvertes** (Missing), lancer la commande avec `--cov-report=term-missing` et consulter la colonne `Missing` du rapport.
