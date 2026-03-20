from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rap_app", "0012_alter_candidat_demande_compte_statut"),
    ]

    operations = [
        migrations.AddField(
            model_name="candidat",
            name="parcours_phase",
            field=models.CharField(
                blank=True,
                choices=[
                    ("postulant", "Candidat postulant"),
                    ("inscrit_valide", "Inscrit validé"),
                    ("stagiaire_en_formation", "Stagiaire / en cours de formation"),
                    ("sorti", "Sorti de formation"),
                    ("abandon", "Abandon"),
                ],
                db_index=True,
                help_text="Nouvelle phase métier cible. Ajoutée en compatibilité sans remplacer immédiatement le statut legacy.",
                max_length=32,
                null=True,
                verbose_name="Phase de parcours",
            ),
        ),
        migrations.AddField(
            model_name="candidat",
            name="date_entree_formation_effective",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Date d'entrée en formation effective"),
        ),
        migrations.AddField(
            model_name="candidat",
            name="date_sortie_formation",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Date de sortie de formation"),
        ),
        migrations.AddField(
            model_name="candidat",
            name="date_validation_inscription",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Date de validation d'inscription"),
        ),
    ]
