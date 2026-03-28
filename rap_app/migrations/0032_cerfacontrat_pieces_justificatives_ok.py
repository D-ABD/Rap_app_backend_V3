from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0031_remove_candidat_situation_actuelle"),
    ]

    operations = [
        migrations.AddField(
            model_name="cerfacontrat",
            name="pieces_justificatives_ok",
            field=models.BooleanField(
                default=False,
                help_text="Indique que l'employeur atteste disposer de l'ensemble des pieces justificatives necessaires au depot du contrat.",
            ),
        ),
    ]
