from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0032_cerfacontrat_pieces_justificatives_ok"),
    ]

    operations = [
        migrations.AlterField(
            model_name="cerfacontrat",
            name="pieces_justificatives_ok",
            field=models.BooleanField(
                default=True,
                help_text="Indique que l'employeur atteste disposer de l'ensemble des pieces justificatives necessaires au depot du contrat.",
            ),
        ),
    ]
