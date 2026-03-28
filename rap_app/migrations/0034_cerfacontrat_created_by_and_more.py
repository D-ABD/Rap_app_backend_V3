from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0033_alter_cerfacontrat_pieces_justificatives_ok"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="cerfacontrat",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                editable=False,
                help_text="Utilisateur ayant cree le CERFA.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="created_cerfacontrat_set",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="cerfacontrat",
            name="updated_by",
            field=models.ForeignKey(
                blank=True,
                help_text="Utilisateur ayant modifie le CERFA en dernier.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="updated_cerfacontrat_set",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
