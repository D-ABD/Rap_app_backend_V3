"""Modèles de test ou d'expérimentation locale."""

from django.db import models

from .base import BaseModel  # Assure-toi que le chemin est correct


class DummyModel(BaseModel):
    """
    Modèle factice utilisé uniquement pour les tests du modèle de base.
    """

    name = models.CharField(max_length=100)  # Libellé de test

    def __str__(self):
        """Affichage : DummyModel #<pk>."""
        return f"DummyModel #{self.pk}"
