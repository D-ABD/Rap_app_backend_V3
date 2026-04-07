"""
Périmètre d’import/export : alignement sur les ViewSets CRUD (§2.9.1).

La source de vérité pour le queryset exporté est le même couple
``get_queryset`` + ``filter_queryset`` que pour la liste REST.
"""

from __future__ import annotations

from typing import Union

from rap_app.api.viewsets.candidat_viewsets import CandidatViewSet
from rap_app.api.viewsets.centres_viewsets import CentreViewSet
from rap_app.api.viewsets.cvtheque_viewset import CVThequeViewSet
from rap_app.api.viewsets.documents_viewsets import DocumentViewSet
from rap_app.api.viewsets.formations_viewsets import FormationViewSet
from rap_app.api.viewsets.partenaires_viewsets import PartenaireViewSet
from rap_app.api.viewsets.statut_viewsets import StatutViewSet
from rap_app.api.viewsets.types_offre_viewsets import TypeOffreViewSet
from rap_app.services.imports.handlers_lot1 import CentreExcelHandler, StatutExcelHandler, TypeOffreExcelHandler
from rap_app.services.imports.handlers_lot2 import PartenaireExcelHandler
from rap_app.services.imports.handlers_lot3 import DocumentExcelHandler, FormationExcelHandler
from rap_app.services.imports.handlers_lot4 import CandidatExcelHandler, CVThequeExcelHandler
from rap_app.services.imports.schemas import (
    RESOURCE_CANDIDAT,
    RESOURCE_CENTRE,
    RESOURCE_CVTHEQUE,
    RESOURCE_DOCUMENT,
    RESOURCE_FORMATION,
    RESOURCE_PARTENAIRE,
    RESOURCE_STATUT,
    RESOURCE_TYPE_OFFRE,
)

# Slug URL → identifiant ``resource`` (Meta / JSON)
URL_SLUG_TO_RESOURCE: dict[str, str] = {
    "centre": RESOURCE_CENTRE,
    "type_offre": RESOURCE_TYPE_OFFRE,
    "statut": RESOURCE_STATUT,
    "partenaire": RESOURCE_PARTENAIRE,
    "formation": RESOURCE_FORMATION,
    "document": RESOURCE_DOCUMENT,
    "candidat": RESOURCE_CANDIDAT,
    "cvtheque": RESOURCE_CVTHEQUE,
}

RESOURCE_TO_VIEWSET = {
    RESOURCE_CENTRE: CentreViewSet,
    RESOURCE_TYPE_OFFRE: TypeOffreViewSet,
    RESOURCE_STATUT: StatutViewSet,
    RESOURCE_PARTENAIRE: PartenaireViewSet,
    RESOURCE_FORMATION: FormationViewSet,
    RESOURCE_DOCUMENT: DocumentViewSet,
    RESOURCE_CANDIDAT: CandidatViewSet,
    RESOURCE_CVTHEQUE: CVThequeViewSet,
}

RESOURCE_TO_HANDLER_CLASS = {
    RESOURCE_CENTRE: CentreExcelHandler,
    RESOURCE_TYPE_OFFRE: TypeOffreExcelHandler,
    RESOURCE_STATUT: StatutExcelHandler,
    RESOURCE_PARTENAIRE: PartenaireExcelHandler,
    RESOURCE_FORMATION: FormationExcelHandler,
    RESOURCE_DOCUMENT: DocumentExcelHandler,
    RESOURCE_CANDIDAT: CandidatExcelHandler,
    RESOURCE_CVTHEQUE: CVThequeExcelHandler,
}

DelegateViewSet = Union[
    CentreViewSet,
    TypeOffreViewSet,
    StatutViewSet,
    PartenaireViewSet,
    FormationViewSet,
    DocumentViewSet,
    CandidatViewSet,
    CVThequeViewSet,
]


def resolve_resource(url_slug: str) -> str | None:
    """Retourne l’identifiant ``resource`` ou None si inconnu."""
    return URL_SLUG_TO_RESOURCE.get(url_slug)


def get_delegate_viewset(resource: str, request, *, action_name: str) -> DelegateViewSet:
    """
    Instancie le ViewSet métier correspondant avec ``request`` et ``action``,
    pour réutiliser permissions et queryset sans dupliquer les règles.
    """
    vs_class = RESOURCE_TO_VIEWSET[resource]
    view = vs_class()
    view.request = request
    view.action = action_name
    view.format_kwarg = None
    view.kwargs = {}
    return view


def get_lot1_export_queryset(resource: str, request):
    """
    Queryset exporté : ``filter_queryset(get_queryset())`` du ViewSet CRUD,
    comme pour ``GET …/export-xlsx/`` sur le mixin.
    """
    view = get_delegate_viewset(resource, request, action_name="export_xlsx")
    return view.filter_queryset(view.get_queryset())
