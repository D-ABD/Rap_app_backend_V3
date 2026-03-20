from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("rap_app", "0015_candidat_rgpd_tracking_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="candidat",
            name="rgpd_consent_obtained",
            field=models.BooleanField(
                default=False,
                help_text="À utiliser quand la base légale principale retenue est le consentement.",
                verbose_name="Consentement RGPD obtenu",
            ),
        ),
        migrations.AddField(
            model_name="candidat",
            name="rgpd_consent_obtained_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Consentement RGPD obtenu le"),
        ),
        migrations.AddField(
            model_name="candidat",
            name="rgpd_consent_recorded_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="consentements_rgpd_candidat_enregistres",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Consentement RGPD enregistré par",
            ),
        ),
    ]
