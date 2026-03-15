import csv

from django.http import HttpResponse

from ..models.evenements import Evenement


def csv_export_evenements(queryset=None):
    """
    Exporte les objets Evenement en CSV sous forme de réponse HTTP.

    - Si queryset est None, exporte tous les événements.
    - Les colonnes du CSV incluent l'identifiant, la formation, le type, la date, le lieu,
      les participants prévus et réels, et le taux de participation.
    """
    if queryset is None:
        queryset = Evenement.objects.all()

    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="evenements.csv"'

    writer = csv.writer(response)
    writer.writerow(
        [
            "ID",
            "Formation",
            "Type",
            "Date",
            "Lieu",
            "Participants prévus",
            "Participants réels",
            "Taux de participation (%)",
        ]
    )

    for event in queryset:
        writer.writerow(
            [
                event.pk,
                event.formation.nom if event.formation else "",
                event.get_type_evenement_display(),
                event.event_date.strftime("%d/%m/%Y") if event.event_date else "",
                event.lieu or "",
                event.participants_prevus or 0,
                event.participants_reels or 0,
                event.get_participation_rate() or "N/A",
            ]
        )

    return response
