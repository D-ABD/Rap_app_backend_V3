from django.db import migrations, models
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0010_p1_unique_appairage_constraints"),
    ]

    def _get_user_model():
        """
        Helper pour éviter de figer en dur le nom du modèle user
        dans le champ ForeignKey. On utilise settings.AUTH_USER_MODEL.
        """
        return settings.AUTH_USER_MODEL

    operations = [
        migrations.AddField(
            model_name="candidat",
            name="demande_compte_statut",
            field=models.CharField(
                max_length=20,
                choices=[
                    ("aucune", "Aucune demande"),
                    ("en_attente", "Demande en attente"),
                    ("acceptee", "Demande acceptée"),
                    ("refusee", "Demande refusée"),
                ],
                default="aucune",
                verbose_name="Statut de demande de compte",
                help_text="Suivi minimal de la demande de création de compte utilisateur associée au candidat.",
            ),
        ),
        migrations.AddField(
            model_name="candidat",
            name="demande_compte_date",
            field=models.DateTimeField(
                null=True,
                blank=True,
                verbose_name="Date de demande de compte",
                help_text="Horodatage de la dernière demande de création de compte effectuée par le candidat.",
            ),
        ),
        migrations.AddField(
            model_name="candidat",
            name="demande_compte_traitee_par",
            field=models.ForeignKey(
                to=_get_user_model(),
                on_delete=models.SET_NULL,
                null=True,
                blank=True,
                related_name="demandes_compte_traitees",
                verbose_name="Demande de compte traitée par",
                help_text="Utilisateur staff/admin ayant validé ou refusé la demande de compte.",
            ),
        ),
        migrations.AddField(
            model_name="candidat",
            name="demande_compte_traitee_le",
            field=models.DateTimeField(
                null=True,
                blank=True,
                verbose_name="Demande de compte traitée le",
                help_text="Horodatage de la validation ou du refus de la demande de compte.",
            ),
        ),
    ]

