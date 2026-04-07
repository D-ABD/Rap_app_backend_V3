"""Routes ``/api/import-export/<resource>/…`` (Lot 1)."""

from django.urls import path

from .import_job_views import ImportJobViewSet
from .views import Lot1ImportExportViewSet

urlpatterns = [
    path(
        "jobs/export-pdf/",
        ImportJobViewSet.as_view({"get": "export_pdf"}),
        name="import-export-job-export-pdf",
    ),
    path(
        "jobs/export-csv/",
        ImportJobViewSet.as_view({"get": "export_csv"}),
        name="import-export-job-export-csv",
    ),
    path(
        "jobs/export-xlsx/",
        ImportJobViewSet.as_view({"get": "export_xlsx"}),
        name="import-export-job-export-xlsx",
    ),
    path(
        "jobs/",
        ImportJobViewSet.as_view({"get": "list"}),
        name="import-export-job-list",
    ),
    path(
        "jobs/<int:pk>/",
        ImportJobViewSet.as_view({"get": "retrieve"}),
        name="import-export-job-detail",
    ),
    path(
        "<slug:resource>/import-template/",
        Lot1ImportExportViewSet.as_view({"get": "import_template"}),
        name="import-export-lot1-import-template",
    ),
    path(
        "<slug:resource>/export-xlsx/",
        Lot1ImportExportViewSet.as_view({"get": "export_xlsx"}),
        name="import-export-lot1-export-xlsx",
    ),
    path(
        "<slug:resource>/import-xlsx/",
        Lot1ImportExportViewSet.as_view({"post": "import_xlsx"}),
        name="import-export-lot1-import-xlsx",
    ),
]
