from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("rap_app", "0021_prepa_formateur_animateur"),
    ]

    operations = [
        migrations.CreateModel(
            name="ParticipantDeclic",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("nom", models.CharField(max_length=120, verbose_name="Nom")),
                ("prenom", models.CharField(max_length=120, verbose_name="Prénom")),
                ("telephone", models.CharField(blank=True, max_length=30, null=True, verbose_name="Téléphone")),
                ("email", models.EmailField(blank=True, max_length=254, null=True, verbose_name="Email")),
                ("present", models.BooleanField(default=True, verbose_name="Présent")),
                ("commentaire_presence", models.TextField(blank=True, null=True, verbose_name="Commentaire de présence")),
                (
                    "centre",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="participants_declic",
                        to="rap_app.centre",
                        verbose_name="Centre",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="participantdeclic_creations",
                        to="rap_app.customuser",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="participantdeclic_updates",
                        to="rap_app.customuser",
                    ),
                ),
                (
                    "declic_origine",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="participants_declic",
                        to="rap_app.declic",
                        verbose_name="Séance Déclic d'origine",
                    ),
                ),
            ],
            options={
                "verbose_name": "Participant Déclic",
                "verbose_name_plural": "Participants Déclic",
                "ordering": ["-declic_origine__date_declic", "nom", "prenom", "-id"],
            },
        ),
        migrations.AddIndex(
            model_name="participantdeclic",
            index=models.Index(fields=["declic_origine"], name="rap_app_par_declic__8ff40b_idx"),
        ),
        migrations.AddIndex(
            model_name="participantdeclic",
            index=models.Index(fields=["centre"], name="rap_app_par_centre__2d4a48_idx"),
        ),
        migrations.AddIndex(
            model_name="participantdeclic",
            index=models.Index(fields=["present"], name="rap_app_par_present_3dc0e7_idx"),
        ),
        migrations.AddIndex(
            model_name="participantdeclic",
            index=models.Index(fields=["nom", "prenom"], name="rap_app_par_nom_8661eb_idx"),
        ),
    ]
