from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rap_app", "0067_stagiaireprepa_issue_bilan_date_bilan"),
    ]

    operations = [
        migrations.AddField(
            model_name="stagiaireprepa",
            name="centre_afpa_cible_texte",
            field=models.CharField(
                blank=True,
                max_length=255,
                null=True,
                verbose_name="Centre AFPA cible (texte libre)",
            ),
        ),
    ]
