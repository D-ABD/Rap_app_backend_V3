from django.db.models import Q
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ...models.centres import Centre
from ...models.commentaires import Commentaire
from ...models.custom_user import CustomUser
from ...models.formations import Formation
from ...models.partenaires import Partenaire
from ...models.statut import Statut
from ...models.types_offre import TypeOffre
from ..roles import get_staff_centre_ids_cached, is_admin_like, is_staff_or_staffread
from ..serializers.centres_serializers import CentreSerializer
from ..serializers.commentaires_serializers import CommentaireSerializer
from ..serializers.formations_serializers import FormationListSerializer
from ..serializers.login_logout_serializers import UserSerializer
from ..serializers.partenaires_serializers import PartenaireSerializer
from ..serializers.statut_serializers import StatutSerializer
from ..serializers.types_offre_serializers import TypeOffreSerializer
from ..mixins import ApiResponseMixin


class SmallPagination(PageNumberPagination):
    # Pagination limitée à 5 éléments par ressource.
    page_size = 5
    page_query_param = "page"


@extend_schema(
    summary="🔍 Recherche globale",
    description="""
Recherche un mot-clé dans les objets suivants :
- Formations (nom, numéro d’offre), avec filtres (type_offre, centre, statut)
- Commentaires (contenu)
- Centres (nom)
- Utilisateurs (nom, prénom, username)
- Statuts (nom ou description_autre)
- Types d’offre (nom ou autre)
- Partenaires (nom)

La réponse HTTP suit désormais l'enveloppe standard :
- succès : `{success, message, data}`
- erreur de validation : `{success, message, data, errors}`
""",
    parameters=[
        OpenApiParameter(name="q", required=True, type=str, description="Mot-clé à rechercher"),
        OpenApiParameter(name="page", required=False, type=int, description="Pagination indépendante par ressource"),
        OpenApiParameter(
            name="type_offre", required=False, type=int, description="Filtrer les formations par type d'offre"
        ),
        OpenApiParameter(name="statut", required=False, type=int, description="Filtrer les formations par statut"),
        OpenApiParameter(name="centre", required=False, type=int, description="Filtrer les formations par centre"),
    ],
    tags=["Recherche"],
    responses={
        200: OpenApiResponse(
            description="Réponse JSON standard contenant les résultats paginés par ressource.",
            examples=[
                OpenApiExample(
                    "Exemple",
                    value={
                        "success": True,
                        "message": "Résultats de recherche.",
                        "data": {
                            "formations": {"count": 1, "results": [{"id": 1, "nom": "BTS Bio"}]},
                            "commentaires": {"count": 2, "results": [{"id": 7, "contenu": "Bon accueil"}]},
                            "centres": {"count": 1, "results": [{"id": 3, "nom": "Lyon"}]},
                            "utilisateurs": {"count": 1, "results": [{"id": 2, "first_name": "Alice"}]},
                            "types_offre": {"count": 1, "results": [{"id": 5, "nom": "initiale", "autre": ""}]},
                            "statuts": {"count": 1, "results": [{"id": 4, "nom": "pleine", "description_autre": ""}]},
                            "partenaires": {"count": 1, "results": [{"id": 9, "nom": "Mission locale"}]},
                        },
                    },
                    response_only=True,
                )
            ],
        ),
        400: OpenApiResponse(description="Erreur de validation avec enveloppe JSON standard."),
    },
)
class SearchView(ApiResponseMixin, APIView):
    """
    Vue de recherche globale multi-ressources (formations, commentaires,
    centres, utilisateurs, statuts, types d'offre, partenaires) pour
    utilisateurs authentifiés, avec filtrage par rôle et centres.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Exécute une recherche globale sur plusieurs ressources à partir
        du mot-clé q et renvoie, pour chaque ressource, un résultat
        paginé au format DRF standard.
        """
        query = request.query_params.get("q", "").strip()
        if not query:
            return self.error_response(
                message="Erreur de validation.",
                errors={"q": ["Paramètre 'q' requis."]},
                status_code=400,
            )

        # Filtres secondaires sur les formations (dans l’URL)
        user = getattr(request, "user", None)
        is_staff_or_admin = (
            user and getattr(user, "is_authenticated", False) and (is_admin_like(user) or is_staff_or_staffread(user))
        )
        if not is_staff_or_admin:
            response = {}
            for key in (
                "formations",
                "commentaires",
                "centres",
                "utilisateurs",
                "types_offre",
                "statuts",
                "partenaires",
            ):
                response[key] = {"count": 0, "next": None, "previous": None, "results": []}
            return self.success_response(
                data=response,
                message="Résultats de recherche.",
            )

        centre_ids = get_staff_centre_ids_cached(request)
        if centre_ids is not None and len(centre_ids) == 0:
            response = {}
            for key in (
                "formations",
                "commentaires",
                "centres",
                "utilisateurs",
                "types_offre",
                "statuts",
                "partenaires",
            ):
                response[key] = {"count": 0, "next": None, "previous": None, "results": []}
            return self.success_response(
                data=response,
                message="Résultats de recherche.",
            )

        # Filtres secondaires sur les formations (dans l'URL)
        filtre_type = request.query_params.get("type_offre")
        filtre_statut = request.query_params.get("statut")
        filtre_centre = request.query_params.get("centre")

        response = {}

        def paginate_and_serialize(qs, serializer_class):
            # Helper DRY : Applique la pagination et séréalisation pour la ressource cible.
            paginator = SmallPagination()
            page = paginator.paginate_queryset(qs, request)
            return paginator.get_paginated_response(serializer_class(page, many=True).data).data

        # Formations (filtre texte et filtres annexes)
        formations = Formation.objects.filter(Q(nom__icontains=query) | Q(num_offre__icontains=query))
        if centre_ids is not None:
            formations = formations.filter(centre_id__in=centre_ids)
        if filtre_type:
            formations = formations.filter(type_offre_id=filtre_type)
        if filtre_statut:
            formations = formations.filter(statut_id=filtre_statut)
        if filtre_centre:
            formations = formations.filter(centre_id=filtre_centre)
        # P0 N+1 : FormationListSerializer utilise get_centre, get_statut, get_type_offre
        formations = formations.select_related("centre", "type_offre", "statut")
        response["formations"] = paginate_and_serialize(formations, FormationListSerializer)

        # Commentaires (filtre sur contenu), restreints par formation.centre pour le staff
        commentaires_qs = Commentaire.objects.filter(Q(contenu__icontains=query))
        if centre_ids is not None:
            commentaires_qs = commentaires_qs.filter(formation__centre_id__in=centre_ids)
        # P0 N+1 : CommentaireSerializer accède à formation, formation.centre/statut/type_offre, created_by
        commentaires_qs = commentaires_qs.select_related(
            "formation",
            "formation__centre",
            "formation__statut",
            "formation__type_offre",
            "created_by",
        )
        response["commentaires"] = paginate_and_serialize(commentaires_qs, CommentaireSerializer)

        # Centres (filtre sur nom), restreints aux centres autorisés pour le staff
        centres_qs = Centre.objects.filter(Q(nom__icontains=query))
        if centre_ids is not None:
            centres_qs = centres_qs.filter(id__in=centre_ids)
        response["centres"] = paginate_and_serialize(centres_qs, CentreSerializer)

        # Utilisateurs (filtre sur prénom, nom ou username), restreints aux centres autorisés
        utilisateurs_qs = CustomUser.objects.filter(
            Q(first_name__icontains=query) | Q(last_name__icontains=query) | Q(username__icontains=query)
        )
        if centre_ids is not None:
            utilisateurs_qs = utilisateurs_qs.filter(centres__id__in=centre_ids).distinct()
        response["utilisateurs"] = paginate_and_serialize(utilisateurs_qs, UserSerializer)

        # Types d’offre (filtre sur le nom ou le champ "autre")
        response["types_offre"] = paginate_and_serialize(
            TypeOffre.objects.filter(Q(nom__icontains=query) | Q(autre__icontains=query)), TypeOffreSerializer
        )

        # Statuts (filtre sur nom ou description_autre)
        response["statuts"] = paginate_and_serialize(
            Statut.objects.filter(Q(nom__icontains=query) | Q(description_autre__icontains=query)), StatutSerializer
        )

        # Partenaires (filtre sur nom), restreints par default_centre pour le staff
        partenaires_qs = Partenaire.objects.filter(Q(nom__icontains=query))
        if centre_ids is not None:
            partenaires_qs = partenaires_qs.filter(default_centre_id__in=centre_ids)
        response["partenaires"] = paginate_and_serialize(partenaires_qs, PartenaireSerializer)

        return self.success_response(
            data=response,
            message="Résultats de recherche.",
        )
