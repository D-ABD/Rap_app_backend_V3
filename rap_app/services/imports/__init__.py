"""
Services d'import et d'export Excel symétriques (Lots 1–4).

Expose les constantes de schéma et les gestionnaires Excel par ressource.
"""

from .handlers_lot1 import CentreExcelHandler, StatutExcelHandler, TypeOffreExcelHandler
from .handlers_lot2 import PartenaireExcelHandler
from .handlers_lot3 import DocumentExcelHandler, FormationExcelHandler
from .handlers_lot4 import CandidatExcelHandler, CVThequeExcelHandler
from .schemas import (
    CENTRE_COLUMNS,
    CVTHEQUE_COLUMNS,
    DOCUMENT_COLUMNS,
    FORMATION_COLUMNS,
    PARTENAIRE_COLUMNS,
    RESOURCE_CANDIDAT,
    RESOURCE_CENTRE,
    RESOURCE_CVTHEQUE,
    RESOURCE_DOCUMENT,
    RESOURCE_FORMATION,
    RESOURCE_PARTENAIRE,
    RESOURCE_STATUT,
    RESOURCE_TYPE_OFFRE,
    SCHEMA_VERSION_LOT1,
    STATUT_COLUMNS,
    TYPE_OFFRE_COLUMNS,
)

__all__ = [
    "CENTRE_COLUMNS",
    "CVTHEQUE_COLUMNS",
    "DOCUMENT_COLUMNS",
    "FORMATION_COLUMNS",
    "PARTENAIRE_COLUMNS",
    "RESOURCE_CANDIDAT",
    "RESOURCE_CENTRE",
    "RESOURCE_CVTHEQUE",
    "RESOURCE_DOCUMENT",
    "RESOURCE_FORMATION",
    "RESOURCE_PARTENAIRE",
    "RESOURCE_STATUT",
    "RESOURCE_TYPE_OFFRE",
    "SCHEMA_VERSION_LOT1",
    "STATUT_COLUMNS",
    "TYPE_OFFRE_COLUMNS",
    "CandidatExcelHandler",
    "CentreExcelHandler",
    "CVThequeExcelHandler",
    "DocumentExcelHandler",
    "FormationExcelHandler",
    "PartenaireExcelHandler",
    "StatutExcelHandler",
    "TypeOffreExcelHandler",
]
