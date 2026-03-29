from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0046_alter_cerfacontrat_specialite_formation_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="formation",
            name="heures_enseignements_generaux",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Volume d'heures à reporter dans le CERFA professionnalisation pour les enseignements généraux.",
                null=True,
                verbose_name="Heures d'enseignements généraux",
            ),
        ),
    ]
