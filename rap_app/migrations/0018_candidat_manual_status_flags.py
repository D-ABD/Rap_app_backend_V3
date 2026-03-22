from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rap_app", "0017_alter_candidat_rgpd_creation_source_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="candidat",
            name="en_accompagnement_tre",
            field=models.BooleanField(
                default=False,
                help_text="Flag manuel cumulable indiquant qu'un accompagnement TRE est en cours.",
                verbose_name="En accompagnement TRE",
            ),
        ),
        migrations.AddField(
            model_name="candidat",
            name="en_appairage",
            field=models.BooleanField(
                default=False,
                help_text="Flag manuel cumulable indiquant qu'un travail d'appairage est en cours.",
                verbose_name="En appairage",
            ),
        ),
    ]
