from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0052_cerfacontrat_is_active"),
    ]

    operations = [
        migrations.CreateModel(
            name="ImportJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("resource", models.CharField(db_index=True, help_text="Identifiant canonique (ex. centre, formation) — aligné sur la feuille Meta.", max_length=64)),
                ("url_resource", models.CharField(blank=True, help_text="Segment d’URL ``/api/import-export/<slug>/…``.", max_length=64)),
                ("dry_run", models.BooleanField(default=False)),
                ("status", models.CharField(choices=[("success", "Succès"), ("error", "Erreur")], db_index=True, max_length=16)),
                ("original_filename", models.CharField(blank=True, max_length=255)),
                ("http_status", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("summary", models.JSONField(blank=True, null=True)),
                ("error_payload", models.JSONField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="excel_import_jobs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Import Excel (trace)",
                "verbose_name_plural": "Imports Excel (traces)",
                "ordering": ("-created_at",),
            },
        ),
    ]
