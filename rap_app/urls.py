"""
Définit les routes principales de l'application.
"""

from .views import home_views

from django.urls import path

urlpatterns = [
    # Accueil du site
    path('', home_views.home, name='home'),
]
