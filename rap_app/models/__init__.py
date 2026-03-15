# models/__init__.py

"""
Agrégation des modèles métier de l'application rap_app.

Fournit le point d'entrée unique rap_app.models vers les entités métier (candidats, formations,
centres, partenaires, prospection, appairage, VAE, etc.) et assure l'import des sous-modules pour
l'enregistrement des signaux Django au démarrage. Les modèles sont définis dans les sous-modules
spécialisés (un fichier par domaine métier).
"""

# Modèles principaux
from .base import BaseModel
from .centres import Centre
from .statut import Statut
from .types_offre import TypeOffre
from .formations import Formation, FormationManager, HistoriqueFormation
from .commentaires import Commentaire
from .evenements import Evenement
from .documents import Document
from .partenaires import Partenaire
from .rapports import Rapport
from .prospection import Prospection, HistoriqueProspection
from .vae import   VAE, HistoriqueStatutVAE
from .jury import SuiviJury
from .logs import LogUtilisateur
from .custom_user import CustomUser
from .models_test import DummyModel
from .candidat import Candidat
from .appairage import Appairage, HistoriqueAppairage
from .atelier_tre import AtelierTRE
from .commentaires_appairage import CommentaireAppairage
# Modèle de contrat CERFA (snapshot administratif pour génération de PDF)
from .cerfa_contrats import CerfaContrat

__all__ = ['CustomUser']

default_app_config = "rap_app.apps.RapAppConfig"


# Import des sous-modules contenant des signaux (nécessaire pour leur enregistrement).
from . import (
    centres,
    commentaires,
    documents,
    evenements,
    formations,
    logs,
    partenaires,
    prepa,
    prospection,
    rapports,
    statut,
    types_offre,
    custom_user,
    jury,
    candidat,
    appairage,
    atelier_tre,
    commentaires_appairage,
    cerfa_contrats,
    declic,
)
