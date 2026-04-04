"""Base commune des viewsets DRF du projet."""

from __future__ import annotations

from typing import Any

from rest_framework import status, viewsets
from rest_framework.response import Response

from ..mixins import ApiResponseMixin, HardDeleteArchivedMixin


class BaseApiViewSet(HardDeleteArchivedMixin, ApiResponseMixin, viewsets.ModelViewSet):
    """
    Base commune pour homogénéiser les réponses CRUD des ViewSets DRF.
    """

    hard_delete_enabled: bool = False
    list_message: str = "Liste recuperee avec succes."
    retrieve_message: str = "Element recupere avec succes."
    create_message: str = "Element cree avec succes."
    update_message: str = "Element mis a jour avec succes."
    destroy_message: str = "Element supprime avec succes."

    def paginated_response(self, data: Any, message: str | None = None) -> Response:
        paginator = getattr(self, "paginator", None)
        if paginator is None:
            return self.success_response(data=data, message=message or self.list_message)
        return paginator.get_paginated_response(data)

    def created_response(self, data: Any, message: str | None = None) -> Response:
        return self.success_response(
            data=data,
            message=message or self.create_message,
            status_code=status.HTTP_201_CREATED,
        )
