from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0051_cerfacontrat_nature_contrat"),
    ]

    operations = [
        migrations.AddField(
            model_name="cerfacontrat",
            name="is_active",
            field=models.BooleanField(
                db_index=True,
                default=True,
                help_text="Indique si le contrat CERFA est actif ou archive logiquement.",
            ),
        ),
    ]
