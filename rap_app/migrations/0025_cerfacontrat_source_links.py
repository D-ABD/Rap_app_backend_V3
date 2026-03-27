from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("rap_app", "0024_rename_rap_app_par_declic__8ff40b_idx_rap_app_par_declic__b476e4_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="cerfacontrat",
            name="candidat",
            field=models.ForeignKey(
                blank=True,
                help_text="Candidat source utilise pour pre-remplir le CERFA.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cerfa_contrats",
                to="rap_app.candidat",
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="employeur",
            field=models.ForeignKey(
                blank=True,
                help_text="Partenaire source utilise pour pre-remplir le CERFA.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cerfa_contrats",
                to="rap_app.partenaire",
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="formation",
            field=models.ForeignKey(
                blank=True,
                help_text="Formation source utilisee pour pre-remplir le CERFA.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cerfa_contrats",
                to="rap_app.formation",
            ),
        ),
    ]
