from io import BytesIO

from django.db.models import Q
from django.http import HttpResponse
from django.utils.timezone import localdate
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ...models.centres import Centre
from ...models.prepa import Prepa, StagiairePrepa
from ..permissions import IsPrepaStaffOrAbove
from ..roles import is_admin_like, is_candidate, is_prepa_staff, is_staff_or_staffread
from ..serializers.prepa_serializers import StagiairePrepaSerializer


class StagiairePrepaViewSet(viewsets.ModelViewSet):
    """
    CRUD et exports du suivi nominatif des stagiaires Prépa.
    """

    serializer_class = StagiairePrepaSerializer
    permission_classes = [IsPrepaStaffOrAbove]
    queryset = StagiairePrepa.objects.select_related("centre", "prepa_origine", "prepa_origine__centre").all()

    def _admin_like(self, user) -> bool:
        return is_admin_like(user)

    def _accessible_centre_ids(self, user):
        if self._admin_like(user):
            return None
        if is_prepa_staff(user) or is_staff_or_staffread(user):
            centres = getattr(user, "centres", None)
            if not centres or not centres.exists():
                return []
            return list(centres.values_list("id", flat=True))
        return []

    def _scope_qs(self, qs):
        user = self.request.user
        if not user.is_authenticated or is_candidate(user):
            return qs.none()

        centre_ids = self._accessible_centre_ids(user)
        if centre_ids is None:
            return qs
        if not centre_ids:
            return qs.none()

        model = getattr(qs, "model", None)
        if model and getattr(model._meta, "model_name", "") == "centre":
            return qs.filter(id__in=centre_ids)

        field_names = [f.name for f in model._meta.get_fields()] if model else []
        if "centre_id" in field_names or "centre" in field_names:
            return qs.filter(centre_id__in=centre_ids)

        return qs.none()

    def get_queryset(self):
        qs = self._scope_qs(
            StagiairePrepa.objects.select_related("centre", "prepa_origine", "prepa_origine__centre")
        )
        params = self.request.query_params

        search = params.get("search")
        centre = params.get("centre")
        statut = params.get("statut_parcours")
        prepa_origine = params.get("prepa_origine")
        annee = params.get("annee")
        type_atelier = params.get("type_atelier")
        ordering = params.get("ordering") or "nom"

        if search:
            qs = qs.filter(
                Q(nom__icontains=search)
                | Q(prenom__icontains=search)
                | Q(telephone__icontains=search)
                | Q(email__icontains=search)
                | Q(centre__nom__icontains=search)
            )
        if centre:
            qs = qs.filter(centre_id=centre)
        if statut:
            qs = qs.filter(statut_parcours=statut)
        if prepa_origine:
            qs = qs.filter(prepa_origine_id=prepa_origine)
        if annee:
            qs = qs.filter(Q(date_entree_parcours__year=annee) | Q(prepa_origine__date_prepa__year=annee))
        if type_atelier:
            flag_field = StagiairePrepa.atelier_flag_map().get(type_atelier, (None, None))[0]
            if flag_field:
                qs = qs.filter(**{flag_field: True})

        if ordering in {
            "nom",
            "-nom",
            "prenom",
            "-prenom",
            "date_entree_parcours",
            "-date_entree_parcours",
            "date_sortie_parcours",
            "-date_sortie_parcours",
            "updated_at",
            "-updated_at",
        }:
            qs = qs.order_by(ordering, "prenom", "id")
        else:
            qs = qs.order_by("nom", "prenom", "id")

        return qs

    @action(detail=False, methods=["get"], url_path="meta")
    def meta(self, request):
        centres = self._scope_qs(Centre.objects.all()).order_by("nom")
        annees = (
            self.get_queryset()
            .order_by()
            .values_list("date_entree_parcours__year", flat=True)
            .distinct()
        )
        annees = sorted([a for a in annees if a], reverse=True)
        prepas_origine = (
            self._scope_qs(Prepa.objects.select_related("centre").all())
            .order_by("-date_prepa", "-id")[:200]
        )

        return Response(
            {
                "centres": [
                    {"id": c.id, "nom": c.nom, "departement": c.departement, "code_postal": c.code_postal}
                    for c in centres
                ],
                "statut_parcours": [
                    {"value": value, "label": label} for value, label in StagiairePrepa.StatutParcours.choices
                ],
                "type_atelier": [
                    {"value": value, "label": label}
                    for value, label in Prepa.TypePrepa.choices
                    if value.startswith("atelier") or value == Prepa.TypePrepa.AUTRE
                ],
                "prepas_origine": [
                    {
                        "id": p.id,
                        "label": f"{p.get_type_prepa_display()} du {p.date_prepa:%d/%m/%Y}"
                        + (f" - {p.centre.nom}" if p.centre else ""),
                    }
                    for p in prepas_origine
                ],
                "annees": annees or [localdate().year],
            }
        )

    def _filtered_export_qs(self, request):
        qs = self.filter_queryset(self.get_queryset())
        if request.method.lower() == "post":
            ids = request.data.get("ids") or []
            if ids:
                qs = qs.filter(id__in=ids)
        return qs

    @action(detail=False, methods=["get", "post"], url_path="export-xlsx")
    def export_xlsx(self, request):
        qs = self._filtered_export_qs(request)

        wb = Workbook()
        ws = wb.active
        ws.title = "Stagiaires Prepa"
        ws.append(
            [
                "Nom",
                "Prénom",
                "Téléphone",
                "Email",
                "Centre",
                "Prépa d'origine",
                "Statut",
                "Ateliers réalisés",
                "Dernier atelier",
                "Date d'entrée",
                "Date de sortie",
                "Motif abandon",
            ]
        )

        for obj in qs:
            ws.append(
                [
                    obj.nom,
                    obj.prenom,
                    obj.telephone or "",
                    obj.email or "",
                    getattr(obj.centre, "nom", ""),
                    str(obj.prepa_origine) if obj.prepa_origine else "",
                    obj.get_statut_parcours_display(),
                    ", ".join(obj.ateliers_realises_labels),
                    obj.dernier_atelier_label or "",
                    obj.date_entree_parcours.strftime("%d/%m/%Y") if obj.date_entree_parcours else "",
                    obj.date_sortie_parcours.strftime("%d/%m/%Y") if obj.date_sortie_parcours else "",
                    obj.motif_abandon or "",
                ]
            )

        self._style_sheet(ws)
        return self._xlsx_response(wb, "stagiaires_prepa.xlsx")

    @action(detail=False, methods=["get", "post"], url_path="export-emargement-xlsx")
    def export_emargement_xlsx(self, request):
        qs = self._filtered_export_qs(request)
        wb = Workbook()
        ws = wb.active
        ws.title = "Emargement Prepa"

        title = "Feuille d'émargement - Stagiaires Prépa"
        type_atelier = request.query_params.get("type_atelier")
        if type_atelier:
            try:
                title = f"{title} - {Prepa.TypePrepa(type_atelier).label}"
            except ValueError:
                pass

        ws.merge_cells("A1:H1")
        ws["A1"] = title
        ws["A1"].font = Font(bold=True, size=14)
        ws["A1"].alignment = Alignment(horizontal="center")
        ws.append([])
        ws.append(["Nom", "Prénom", "Centre", "Statut", "Téléphone", "Email", "Présence", "Signature"])

        for obj in qs:
            ws.append(
                [
                    obj.nom,
                    obj.prenom,
                    getattr(obj.centre, "nom", ""),
                    obj.get_statut_parcours_display(),
                    obj.telephone or "",
                    obj.email or "",
                    "",
                    "",
                ]
            )

        self._style_sheet(ws, header_row=3)
        return self._xlsx_response(wb, "stagiaires_prepa_emargement.xlsx")

    def _style_sheet(self, ws, header_row=1):
        fill = PatternFill("solid", fgColor="DCE6F1")
        border = Border(
            left=Side(style="thin", color="CCCCCC"),
            right=Side(style="thin", color="CCCCCC"),
            top=Side(style="thin", color="CCCCCC"),
            bottom=Side(style="thin", color="CCCCCC"),
        )

        for cell in ws[header_row]:
            cell.font = Font(bold=True, color="002060")
            cell.fill = fill
            cell.alignment = Alignment(horizontal="center")
            cell.border = border

        for row in ws.iter_rows(min_row=header_row + 1):
            for cell in row:
                cell.border = border
                cell.alignment = Alignment(vertical="top")

        for col in ws.columns:
            if not col:
                continue
            letter = get_column_letter(col[0].column)
            max_len = max((len(str(c.value)) for c in col if c.value), default=10)
            ws.column_dimensions[letter].width = min(max_len + 2, 40)

    def _xlsx_response(self, wb, filename):
        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)
        response = HttpResponse(
            buf.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
