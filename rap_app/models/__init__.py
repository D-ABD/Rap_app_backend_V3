# models/__init__.py

"""
Agrégation des modèles métier de l'application rap_app.

Fournit le point d'entrée unique rap_app.models vers les entités métier (candidats, formations,
centres, partenaires, prospection, appairage, VAE, etc.) et assure l'import des sous-modules pour
l'enregistrement des signaux Django au démarrage. Les modèles sont définis dans les sous-modules
spécialisés (un fichier par domaine métier).
"""

from .appairage import Appairage, HistoriqueAppairage
from .atelier_tre import AtelierTRE

# Modèles principaux
from .base import BaseModel
from .candidat import Candidat
from .centres import Centre

# Modèle de contrat CERFA (snapshot administratif pour génération de PDF)
from .cerfa_contrats import CerfaContrat
from .commentaires import Commentaire
from .commentaires_appairage import CommentaireAppairage
from .custom_user import CustomUser
from .documents import Document
from .evenements import Evenement
from .formations import Formation, FormationManager, HistoriqueFormation
from .jury import SuiviJury
from .logs import LogUtilisateur
from .models_test import DummyModel
from .partenaires import Partenaire
from .prospection import HistoriqueProspection, Prospection
from .rapports import Rapport
from .statut import Statut
from .types_offre import TypeOffre
from .vae import VAE, HistoriqueStatutVAE

__all__ = ["CustomUser"]


# Import des sous-modules contenant des signaux (nécessaire pour leur enregistrement).
from . import (
    appairage,
    atelier_tre,
    candidat,
    centres,
    cerfa_contrats,
    commentaires,
    commentaires_appairage,
    custom_user,
    declic,
    documents,
    evenements,
    formations,
    jury,
    logs,
    partenaires,
    prepa,
    prospection,
    rapports,
    statut,
    types_offre,
)
