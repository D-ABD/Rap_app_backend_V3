# Generated manually for le module Plan d'action formation (aligné sur makemigrations Django 4.2).

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0057_typeoffre_afc_mp"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlanActionFormation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True,
                        help_text="Date et heure de création de l'enregistrement",
                        verbose_name="Date de création",
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(
                        auto_now=True,
                        help_text="Date et heure de la dernière modification",
                        verbose_name="Date de mise à jour",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        editable=False,
                        help_text="Utilisateur ayant créé l'enregistrement",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_planactionformation_set",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Créé par",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        help_text="Dernier utilisateur ayant modifié l'enregistrement",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="updated_planactionformation_set",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Modifié par",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        default=True,
                        help_text="Indique si l'objet est actif ou archivé",
                        verbose_name="Actif",
                    ),
                ),
                (
                    "titre",
                    models.CharField(
                        help_text="Intitulé court du plan (utilisé aussi comme base du slug).",
                        max_length=255,
                        verbose_name="Titre",
                    ),
                ),
                (
                    "slug",
                    models.SlugField(
                        blank=True,
                        help_text="Identifiant d'URL unique, généré automatiquement à partir du titre et du contexte.",
                        max_length=255,
                        null=True,
                        unique=True,
                        verbose_name="Slug",
                    ),
                ),
                (
                    "date_debut",
                    models.DateField(
                        help_text="Borne basse de la période couverte par le plan (incluse).",
                        verbose_name="Date de début de période",
                    ),
                ),
                (
                    "date_fin",
                    models.DateField(
                        help_text="Borne haute de la période couverte par le plan (incluse).",
                        verbose_name="Date de fin de période",
                    ),
                ),
                (
                    "periode_type",
                    models.CharField(
                        choices=[
                            ("jour", "Journalier"),
                            ("semaine", "Hebdomadaire"),
                            ("mois", "Mensuel"),
                        ],
                        default="semaine",
                        help_text="Échelle métier d'analyse (jour, semaine ou mois).",
                        max_length=20,
                        verbose_name="Type de période",
                    ),
                ),
                (
                    "centre",
                    models.ForeignKey(
                        blank=True,
                        help_text="Périmètre optionnel : centre de formation concerné.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="plans_action_formation",
                        to="rap_app.centre",
                        verbose_name="Centre",
                    ),
                ),
                (
                    "formation",
                    models.ForeignKey(
                        blank=True,
                        help_text="Périmètre optionnel : formation concernée (sinon le contexte est plus large).",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="plans_action_formation",
                        to="rap_app.formation",
                        verbose_name="Formation",
                    ),
                ),
                (
                    "synthese",
                    models.TextField(
                        blank=True,
                        default="",
                        help_text="Synthèse rédigée à partir de la sélection de commentaires.",
                        verbose_name="Synthèse",
                    ),
                ),
                (
                    "resume_points_cles",
                    models.TextField(
                        blank=True,
                        default="",
                        help_text="Vue courte, exploitable en lecture rapide.",
                        verbose_name="Résumé des points clés",
                    ),
                ),
                (
                    "plan_action",
                    models.TextField(
                        blank=True,
                        default="",
                        help_text="Plan d'action rédigé en texte libre (V1).",
                        verbose_name="Plan d'action (texte)",
                    ),
                ),
                (
                    "plan_action_structured",
                    models.JSONField(
                        blank=True,
                        help_text="Données structurées optionnelles pour des évolutions futures (actions, échéances, etc.).",
                        null=True,
                        verbose_name="Plan d'action (structuré)",
                    ),
                ),
                (
                    "statut",
                    models.CharField(
                        choices=[
                            ("brouillon", "Brouillon"),
                            ("valide", "Validé"),
                            ("archive", "Archivé"),
                        ],
                        db_index=True,
                        default="brouillon",
                        help_text="Cycle de vie : brouillon, validé ou archivé.",
                        max_length=20,
                        verbose_name="Statut",
                    ),
                ),
                (
                    "commentaires",
                    models.ManyToManyField(
                        blank=True,
                        help_text="Commentaires de formation explicitement retenus pour ce plan.",
                        related_name="plans_action_formation",
                        to="rap_app.commentaire",
                        verbose_name="Commentaires sources",
                    ),
                ),
                (
                    "nb_commentaires",
                    models.IntegerField(
                        default=0,
                        help_text="Décompte des commentaires liés, synchronisé via la relation M2M (ne pas mettre à jour manuellement).",
                        verbose_name="Nombre de commentaires",
                    ),
                ),
                (
                    "metadata",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Filtres, contexte de génération ou paramètres métier (snapshot souple).",
                        verbose_name="Métadonnées",
                    ),
                ),
            ],
            options={
                "verbose_name": "Plan d'action formation",
                "verbose_name_plural": "Plans d'action formation",
                "ordering": ["-date_debut", "-updated_at"],
            },
        ),
        migrations.AddIndex(
            model_name="planactionformation",
            index=models.Index(fields=["slug"], name="plan_action_slug_idx"),
        ),
        migrations.AddIndex(
            model_name="planactionformation",
            index=models.Index(fields=["date_debut"], name="plan_action_debut_idx"),
        ),
        migrations.AddIndex(
            model_name="planactionformation",
            index=models.Index(fields=["statut"], name="plan_action_statut_idx"),
        ),
        migrations.AddIndex(
            model_name="planactionformation",
            index=models.Index(fields=["centre", "formation"], name="plan_action_scope_idx"),
        ),
    ]
