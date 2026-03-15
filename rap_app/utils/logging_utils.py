# utils/logging_utils.py
import sys

from django.apps import apps


def skip_logging_during_migration() -> bool:
    """
    Détermine s'il faut ignorer certaines opérations de logging lors des phases de migration Django.

    Fonctionnalité :
        Retourne True si l'application Django n'est pas encore prête (apps.ready == False)
        ou si l'exécution courante correspond à une commande 'migrate' ou 'makemigrations'.
        Utile pour conditionner des opérations de logging ou de monitoring
        afin d'éviter qu'elles soient déclenchées lors des opérations de migration
        (où l'état du modèle peut être imprévisible ou incomplet).

    Contrat technique :
        Aucun argument attendu.
        Retour : bool (True si l'on est en contexte de migration ou d'initialisation, False sinon)

    Exemple :
        >>> skip_logging_during_migration()
        False
        # (si l'app Django est prête et qu'aucune migration n'est en cours)

        # Cas lors de l'exécution d'une migration Django :
        $ python manage.py migrate
        # => skip_logging_during_migration() retournera True

    Limites et dépendances :
        - Dépend du framework Django ; attend la présence de django.apps.
        - Repose sur la convention d'appel des commandes via sys.argv pour détecter les migrations.
        - Cette fonction ne doit pas être utilisée hors contexte Django.
        - Si appelée très tôt dans le cycle (avant configuration complète d'apps),
          la détection peut ne pas être fiable selon les systèmes de lancement.

        - Spécifier précisément le comportement attendu si 'apps.ready' n'est pas initialisé
          (non couvert hors projet Django).
    """
    return not apps.ready or "migrate" in sys.argv or "makemigrations" in sys.argv
