from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rap_app", "0020_stagiaireprepa"),
    ]

    operations = [
        migrations.AddField(
            model_name="prepa",
            name="formateur_animateur",
            field=models.CharField(
                blank=True,
                help_text="Nom de la personne qui anime la séance ou l'atelier.",
                max_length=255,
                null=True,
                verbose_name="Formateur / animateur",
            ),
        ),
    ]
