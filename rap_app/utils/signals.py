"""Helpers transverses pour sécuriser l'exécution des signaux Django."""

from contextlib import contextmanager
from typing import Any, Generator


@contextmanager
def signal_processing(instance: Any, flag_name: str = "_signal_processing") -> Generator[bool, None, None]:
    """Context manager pour éviter les récursions de signaux.

    Utiliser dans un signal autour de la logique principale :

        with signal_processing(instance) as can_run:
            if not can_run:
                return
            ... logique ...

    Le flag est toujours supprimé dans le `finally`, même en cas d'exception.
    """

    if getattr(instance, flag_name, False):
        yield False
        return

    setattr(instance, flag_name, True)
    try:
        yield True
    finally:
        try:
            delattr(instance, flag_name)
        except AttributeError:
            pass
