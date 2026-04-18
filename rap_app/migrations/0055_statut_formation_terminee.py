# Données : statut « formation terminée » (slug formation_terminee).

from django.db import migrations


def forwards(apps, schema_editor):
    Statut = apps.get_model("rap_app", "Statut")
    if Statut.objects.filter(nom="formation_terminee").exists():
        return
    Statut.objects.create(
        nom="formation_terminee",
        couleur="#546E7A",
        is_active=True,
    )


def backwards(apps, schema_editor):
    Statut = apps.get_model("rap_app", "Statut")
    Statut.objects.filter(nom="formation_terminee").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("rap_app", "0054_alter_customuser_role_alter_suivijury_annee_and_more"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
