"""
Définit les routes principales de l'application.
"""

from django.urls import path

from .views import home_views

urlpatterns = [
    # Accueil du site
    path("", home_views.home, name="home"),
]
