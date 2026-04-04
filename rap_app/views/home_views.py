"""Vues Django historiques liees a home."""
from django.shortcuts import render


def home(request):
    """Affiche la page d accueil historique."""
    return render(request, "home.html")
