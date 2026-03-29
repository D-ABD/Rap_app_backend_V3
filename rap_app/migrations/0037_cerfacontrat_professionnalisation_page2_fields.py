from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0036_cerfacontrat_professionnalisation_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="cerfacontrat",
            name="classification_emploi",
            field=models.CharField(
                blank=True,
                help_text="Classification de l'emploi dans la convention collective pour le CERFA professionnalisation.",
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="classification_niveau",
            field=models.CharField(
                blank=True,
                help_text="Niveau de classification pour le CERFA professionnalisation.",
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="coefficient_hierarchique",
            field=models.CharField(
                blank=True,
                help_text="Coefficient hierarchique pour le CERFA professionnalisation.",
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="duree_periode_essai_jours",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Duree de la periode d'essai en jours pour le CERFA professionnalisation.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="emploi_occupe_pendant_contrat",
            field=models.CharField(
                blank=True,
                help_text="Emploi occupe pendant le contrat (intitule precis), utile pour le CERFA professionnalisation.",
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="formation_heures_enseignements",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Duree des enseignements generaux, professionnels et technologiques en heures.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="nombre_organismes_formation",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Nombre d'organismes de formation intervenant dans le contrat de professionnalisation.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="organisme_declaration_activite",
            field=models.CharField(
                blank=True,
                help_text="Numero de declaration d'activite de l'organisme de formation principal.",
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="organisation_formation",
            field=models.CharField(
                blank=True,
                help_text="Organisation de la formation pour le CERFA professionnalisation.",
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="specialite_formation",
            field=models.CharField(
                blank=True,
                help_text="Specialite de formation pour le CERFA professionnalisation.",
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="type_qualification_visee",
            field=models.CharField(
                blank=True,
                help_text="Type de qualification visee pour le CERFA professionnalisation.",
                max_length=255,
                null=True,
            ),
        ),
    ]
