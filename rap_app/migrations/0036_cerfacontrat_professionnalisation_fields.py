from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0035_cerfacontrat_cerfa_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="cerfacontrat",
            name="apprenti_france_travail_duree_mois",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Duree d'inscription a France Travail en mois pour le CERFA professionnalisation.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="apprenti_france_travail_numero",
            field=models.CharField(
                blank=True,
                help_text="Numero d'inscription France Travail pour le CERFA professionnalisation.",
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="apprenti_minimum_social_type",
            field=models.CharField(
                blank=True,
                help_text="Type de minimum social perçu, si beneficiaire, pour le CERFA professionnalisation.",
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="employeur_numero_projet",
            field=models.CharField(
                blank=True,
                help_text="Numero de projet associe au contrat de professionnalisation, si applicable.",
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="employeur_organisme_prevoyance",
            field=models.CharField(
                blank=True,
                help_text="Organisme de prevoyance, le cas echeant, pour le CERFA professionnalisation.",
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="employeur_urssaf_particulier",
            field=models.CharField(
                blank=True,
                help_text="Numero URSSAF du particulier-employeur pour le CERFA professionnalisation.",
                max_length=100,
                null=True,
            ),
        ),
    ]
