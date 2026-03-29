from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0037_cerfacontrat_professionnalisation_page2_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="cerfacontrat",
            name="opco_adherent_numero",
            field=models.CharField(
                blank=True,
                help_text="Numero d'adherent employeur a l'OPCO, s'il existe, pour le CERFA professionnalisation.",
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="opco_nom",
            field=models.CharField(
                blank=True,
                help_text="Nom de l'OPCO auquel est adresse le dossier complet pour le CERFA professionnalisation.",
                max_length=255,
                null=True,
            ),
        ),
    ]
