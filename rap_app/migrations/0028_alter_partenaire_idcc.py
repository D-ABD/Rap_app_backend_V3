from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rap_app", "0027_alter_partenaire_code_ape"),
    ]

    operations = [
        migrations.AlterField(
            model_name="partenaire",
            name="idcc",
            field=models.CharField(
                blank=True,
                help_text="Code convention collective",
                max_length=50,
                null=True,
                verbose_name="IDCC",
            ),
        ),
    ]
