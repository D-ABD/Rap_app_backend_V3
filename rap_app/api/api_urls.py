# rap_app/api/api_urls.py

"""
Déclaration centralisée des routes d'API pour RAP_APP.

- Déclare les routes avec DefaultRouter pour les ViewSet DRF.
- Déclare les endpoints supplémentaires pour l'authentification et des utilitaires via path().
"""

from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .viewsets.appairage_commentaires_viewset import CommentaireAppairageViewSet
from .viewsets.appairage_viewsets import AppairageViewSet
from .viewsets.atelier_tre_viewsets import AtelierTREViewSet
from .viewsets.auth_viewset import EmailTokenObtainPairView
from .viewsets.candidat_viewsets import CandidatViewSet
from .viewsets.centres_viewsets import CentreViewSet
from .viewsets.commentaires_viewsets import CommentaireViewSet

# Imports des ViewSets et vues nécessaires aux routes
from .viewsets.cvtheque_viewset import CVThequeViewSet
from .viewsets.declic_objectifs_viewsets import ObjectifDeclicViewSet
from .viewsets.declic_viewset import DeclicViewSet
from .viewsets.documents_viewsets import DocumentViewSet
from .viewsets.evenements_viewsets import EvenementViewSet
from .viewsets.formations_viewsets import FormationViewSet
from .viewsets.health_viewset import HealthViewSet
from .viewsets.logs_viewsets import LogUtilisateurViewSet
from .viewsets.me_viewsets import DemandeCompteCandidatView, MeAPIView, RoleChoicesView
from .viewsets.partenaires_viewsets import PartenaireViewSet
from .viewsets.prepa_objectifs_viewsets import ObjectifPrepaViewSet
from .viewsets.prepa_viewset import PrepaViewSet
from .viewsets.stagiaires_prepa_viewsets import StagiairePrepaViewSet
from .viewsets.prospection_comment_viewsets import ProspectionCommentViewSet
from .viewsets.prospection_viewsets import ProspectionViewSet
from .viewsets.rapports_viewsets import RapportViewSet
from .viewsets.rapports_viewsets import RapportChoicesView
from .viewsets.search_viewset import SearchView
from .viewsets.stats_viewsets.appairage_comment_stats_viewset import (
    AppairageCommentaireStatsViewSet,
)
from .viewsets.stats_viewsets.appairages_stats_viewsets import AppairageStatsViewSet
from .viewsets.stats_viewsets.atelier_tre_stats_viewset import AtelierTREStatsViewSet
from .viewsets.stats_viewsets.candidats_stats_viewsets import CandidatStatsViewSet
from .viewsets.stats_viewsets.commentaires_stats_viewsets import CommentaireStatsViewSet
from .viewsets.stats_viewsets.declic_stats_viewsets import DeclicStatsViewSet
from .viewsets.stats_viewsets.evenements_stats_viewsets import EvenementStatsViewSet
from .viewsets.stats_viewsets.formation_stats_viewsets import FormationStatsViewSet
from .viewsets.stats_viewsets.partenaires_stats_viewsets import PartenaireStatsViewSet
from .viewsets.stats_viewsets.prepa_stats_viewsets import PrepaStatsViewSet
from .viewsets.stats_viewsets.prospection_comment_stats_viewset import (
    ProspectionCommentStatsViewSet,
)
from .viewsets.stats_viewsets.prospection_stats_viewsets import ProspectionStatsViewSet
from .viewsets.statut_viewsets import StatutViewSet
from .viewsets.temporaire_viewset import test_token_view
from .viewsets.types_offre_viewsets import TypeOffreViewSet
from .viewsets.user_viewsets import CustomUserViewSet, RegisterView

# Initialisation du router DRF
router = DefaultRouter()

router.register(r"health", HealthViewSet, basename="health")
router.register(r"users", CustomUserViewSet, basename="user")
router.register(r"centres", CentreViewSet, basename="centre")
router.register(r"statuts", StatutViewSet, basename="statut")
router.register(r"typeoffres", TypeOffreViewSet, basename="typeoffre")
router.register(r"formations", FormationViewSet, basename="formation")
router.register(r"documents", DocumentViewSet, basename="document")
router.register(r"evenements", EvenementViewSet, basename="evenement")
router.register(r"commentaires", CommentaireViewSet, basename="commentaire")
router.register(r"candidats", CandidatViewSet, basename="candidat")
router.register(r"appairages", AppairageViewSet, basename="appairage")
router.register(r"appairage-commentaires", CommentaireAppairageViewSet, basename="appairage-commentaire")
router.register(r"ateliers-tre", AtelierTREViewSet, basename="ateliers-tre")
router.register(r"partenaires", PartenaireViewSet, basename="partenaire")
router.register(r"prospections", ProspectionViewSet, basename="prospection")

# Deux endpoints pour le même ViewSet afin d'offrir deux chemins différents côté frontend (noms de base différents requis).
router.register(r"prospection-comments", ProspectionCommentViewSet, basename="prospection-comment")
router.register(r"prospection-commentaires", ProspectionCommentViewSet, basename="prospection-commentaires")

# Modules désactivés en commentaire :
# router.register(r"suivis-jury", SuiviJuryViewSet, basename="suivijury")
# router.register(r"vaes", VAEViewSet, basename="vae")
router.register(r"prepa", PrepaViewSet, basename="prepa")
router.register(r"stagiaires-prepa", StagiairePrepaViewSet, basename="stagiaire-prepa")
router.register(r"prepa-objectifs", ObjectifPrepaViewSet, basename="objectif-prepa")
router.register(r"prepa-stats", PrepaStatsViewSet, basename="prepa-stats")
router.register(r"declic", DeclicViewSet, basename="declic")
router.register(r"objectifs-declic", ObjectifDeclicViewSet, basename="objectifs-declic")
router.register(r"declic-stats", DeclicStatsViewSet, basename="declic-stats")
router.register(r"cvtheque", CVThequeViewSet, basename="cvtheque")
router.register(r"logs", LogUtilisateurViewSet, basename="logutilisateur")
router.register(r"rapports", RapportViewSet, basename="rapport")
router.register(r"formation-stats", FormationStatsViewSet, basename="formation-stats")
router.register(r"evenement-stats", EvenementStatsViewSet, basename="evenement-stats")
router.register(r"prospection-stats", ProspectionStatsViewSet, basename="prospection-stats")
router.register(r"candidat-stats", CandidatStatsViewSet, basename="candidat-stats")
router.register(r"partenaire-stats", PartenaireStatsViewSet, basename="partenaire-stats")
router.register(r"ateliertre-stats", AtelierTREStatsViewSet, basename="ateliertre-stats")
router.register(r"appairage-stats", AppairageStatsViewSet, basename="appairage-stats")
router.register(r"commentaire-stats", CommentaireStatsViewSet, basename="commentaire-stats")
router.register(r"prospection-comment-stats", ProspectionCommentStatsViewSet, basename="prospection-comment-stats")
router.register(
    r"appairage-commentaire-stats", AppairageCommentaireStatsViewSet, basename="appairage-commentaire-stats"
)

# Endpoints déclarés explicitement hors router (authentification, utilitaires)
urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("test-token/", test_token_view, name="test_token"),
    path("search/", SearchView.as_view(), name="search"),
    path("me/", MeAPIView.as_view(), name="me"),
    path("roles/", RoleChoicesView.as_view(), name="roles"),
    path("me/demande-compte/", DemandeCompteCandidatView.as_view(), name="demande_compte_candidat"),
    path("rapports/choices/", RapportChoicesView.as_view(), name="rapport-choices"),
]

# Ajout des routes générées par le router DRF
urlpatterns += router.urls
