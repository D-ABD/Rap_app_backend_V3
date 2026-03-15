# rap_app/tests/conftest.py
"""
Configuration pytest partagée pour les tests Rap App.

- Isolation par transaction : les tests qui héritent de django.test.TestCase
  ou APITestCase s'exécutent chacun dans une transaction Django ; à la fin du test,
  Django fait un ROLLBACK automatique. La base revient à l'état initial sans
  nettoyage manuel.

- Signaux de log : désactivés pendant pytest (voir logs_signals.skip_logging et
  PYTEST_CURRENT_TEST). Aucune écriture dans LogUtilisateur pendant les tests.

- PostgreSQL : la fermeture systématique de la connexion après chaque test a été retirée
  (elle provoquait InterfaceError: connection already closed au setUp du test suivant).
  En cas de InvalidCursorName en CI, privilégier --create-db ou une DB isolée par run.

- Factories : UserFactory et LogUtilisateurFactory sont disponibles
  (voir rap_app/tests/factories.py). Import : from rap_app.tests.factories import UserFactory, LogUtilisateurFactory
"""

import pytest


@pytest.fixture
def user_factory():
    """Expose UserFactory pour les tests qui préfèrent une fixture."""
    from .factories import UserFactory

    return UserFactory


@pytest.fixture
def log_factory():
    """Expose LogUtilisateurFactory pour les tests."""
    from .factories import LogUtilisateurFactory

    return LogUtilisateurFactory


def pytest_configure(config):
    """Marque optionnel pour les tests qui nécessitent la DB."""
    config.addinivalue_line(
        "markers",
        "django_db: mark test to use Django database (transaction rollback after test)",
    )
