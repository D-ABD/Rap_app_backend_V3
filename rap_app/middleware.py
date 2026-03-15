import threading

_thread_locals = threading.local()


def get_current_user():
    """
    Retourne l'utilisateur stocké dans le thread local pour la requête en cours.
    """
    return getattr(_thread_locals, "user", None)


class CurrentUserMiddleware:
    """
    Middleware Django pour stocker l'utilisateur courant dans un thread local pendant la requête.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = request.user if hasattr(request, "user") else None
        try:
            response = self.get_response(request)
            return response
        finally:
            if hasattr(_thread_locals, "user"):
                del _thread_locals.user
