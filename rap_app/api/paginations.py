# rap_app/api/paginations.py

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class RapAppPagination(PageNumberPagination):
    """
    Pagination pour l'API RAP avec structure de réponse personnalisée.
    """
    page_size = 10  # Taille de page par défaut
    page_size_query_param = 'page_size'  # Modification dynamique par query param
    max_page_size = 100  # Taille maximale autorisée

    def get_paginated_response(self, data):
        """
        Retourne la réponse paginée selon le format attendu par le front.
        """
        return Response({
            "success": True,
            "message": "Liste paginée des résultats.",
            "data": {
                "count": getattr(self.page.paginator, "count", 0),
                "page": getattr(self.page, "number", 1),
                "page_size": self.get_page_size(self.request),
                "total_pages": getattr(self.page.paginator, "num_pages", 1),
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        })

