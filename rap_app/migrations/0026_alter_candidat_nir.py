from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0025_cerfacontrat_source_links"),
    ]

    operations = [
        migrations.AlterField(
            model_name="candidat",
            name="nir",
            field=models.CharField(
                blank=True,
                max_length=32,
                null=True,
                verbose_name="Numéro de sécurité sociale (NIR)",
            ),
        ),
    ]
