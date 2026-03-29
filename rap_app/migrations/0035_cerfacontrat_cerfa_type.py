from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0034_cerfacontrat_created_by_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="cerfacontrat",
            name="cerfa_type",
            field=models.CharField(
                choices=[
                    ("apprentissage", "Contrat apprentissage"),
                    ("professionnalisation", "Contrat de professionnalisation"),
                ],
                default="apprentissage",
                help_text="Nature du contrat CERFA : apprentissage ou professionnalisation.",
                max_length=24,
            ),
        ),
    ]
