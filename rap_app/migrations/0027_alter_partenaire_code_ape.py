from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rap_app", "0026_alter_candidat_nir"),
    ]

    operations = [
        migrations.AlterField(
            model_name="partenaire",
            name="code_ape",
            field=models.CharField(
                blank=True,
                help_text="Code APE de l'entreprise",
                max_length=50,
                null=True,
                verbose_name="Code APE",
            ),
        ),
    ]
