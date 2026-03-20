from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("rap_app", "0014_alter_candidat_demande_compte_statut"),
    ]

    operations = [
        migrations.AddField(
            model_name="candidat",
            name="rgpd_creation_source",
            field=models.CharField(
                blank=True,
                choices=[
                    ("manual_admin", "Cr\xe9ation manuelle staff/admin"),
                    ("self_service", "Cr\xe9ation par la personne concern\xe9e"),
                    ("import", "Import"),
                ],
                max_length=32,
                null=True,
                verbose_name="Origine RGPD de cr\xe9ation",
            ),
        ),
        migrations.AddField(
            model_name="candidat",
            name="rgpd_data_reviewed_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Revue de minimisation RGPD le"),
        ),
        migrations.AddField(
            model_name="candidat",
            name="rgpd_data_reviewed_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="revues_rgpd_candidat_effectuees",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Revue de minimisation RGPD par",
            ),
        ),
        migrations.AddField(
            model_name="candidat",
            name="rgpd_legal_basis",
            field=models.CharField(
                blank=True,
                choices=[
                    ("consentement", "Consentement"),
                    ("mesures_precontractuelles", "Mesures pr\xe9contractuelles"),
                    ("interet_legitime", "Int\xe9r\xeat l\xe9gitime"),
                    ("obligation_legale", "Obligation l\xe9gale"),
                    ("mission_interet_public", "Mission d'int\xe9r\xeat public"),
                    ("interets_vitaux", "Int\xe9r\xeats vitaux"),
                ],
                max_length=40,
                null=True,
                verbose_name="Base l\xe9gale RGPD",
            ),
        ),
        migrations.AddField(
            model_name="candidat",
            name="rgpd_notice_sent_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Notification RGPD envoy\xe9e le"),
        ),
        migrations.AddField(
            model_name="candidat",
            name="rgpd_notice_sent_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="notifications_rgpd_candidat_envoyees",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Notification RGPD envoy\xe9e par",
            ),
        ),
        migrations.AddField(
            model_name="candidat",
            name="rgpd_notice_status",
            field=models.CharField(
                blank=True,
                choices=[
                    ("non_requise", "Notification non requise"),
                    ("a_notifier", "Notification \xe0 envoyer"),
                    ("notifiee", "Notification envoy\xe9e"),
                ],
                max_length=20,
                null=True,
                verbose_name="Statut de notification RGPD",
            ),
        ),
    ]
