# Generated manually — évolution Prépa parcours / bilan

from django.db import migrations, models


def backfill_issue_bilan_from_legacy(apps, schema_editor):
    StagiairePrepa = apps.get_model("rap_app", "StagiairePrepa")
    for row in StagiairePrepa.objects.iterator(chunk_size=500):
        if row.issue_bilan:
            continue
        updated = {}
        if row.orientation_finale in ("afpa", "autre_centre_afpa"):
            updated["issue_bilan"] = "oriente_afpa"
            if row.date_orientation:
                updated["date_bilan"] = row.date_orientation
        elif row.orientation_finale == "hors_afpa":
            updated["issue_bilan"] = "autre_sortie"
            if row.date_orientation:
                updated["date_bilan"] = row.date_orientation
        if updated:
            for k, v in updated.items():
                setattr(row, k, v)
            row.save(update_fields=list(updated.keys()))


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0066_alter_prepastagiaireparticipation_statut"),
    ]

    operations = [
        migrations.AddField(
            model_name="stagiaireprepa",
            name="issue_bilan",
            field=models.CharField(
                blank=True,
                choices=[
                    ("oriente_afpa", "Orienté AFPA"),
                    ("abandon", "Abandon"),
                    ("autre_sortie", "Autre sortie"),
                ],
                db_index=True,
                help_text="Sortie formalisée au bilan ; distincte du statut de parcours courant.",
                max_length=24,
                null=True,
                verbose_name="Issue du bilan",
            ),
        ),
        migrations.AddField(
            model_name="stagiaireprepa",
            name="date_bilan",
            field=models.DateField(blank=True, null=True, verbose_name="Date du bilan"),
        ),
        migrations.RunPython(backfill_issue_bilan_from_legacy, migrations.RunPython.noop),
    ]
