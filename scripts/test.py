# -------------------------------------------------------------------
# 🎯 Test des objectifs Déclic (Atelier 1 = référence)
# -------------------------------------------------------------------
import sys, os
import django
from django.utils import timezone

# 🧭 S'assurer que le projet Django est visible par Python
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# ✅ Ton fichier settings est bien : rap_app_project/settings.py
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "rap_app_project.settings")

# 🔧 Initialisation de Django
django.setup()

from rap_app.models.declic import Declic, ObjectifDeclic

ANNEE = timezone.localdate().year  # 🧩 change ici si besoin (ex: 2025)

print("\n═══════════════════════════════════════════════════════════")
print(f"   🎯 TEST DES OBJECTIFS DÉCLIC ({ANNEE})")
print("═══════════════════════════════════════════════════════════\n")

# -------------------------------------------------------------------
# 🌍 Synthèse globale
# -------------------------------------------------------------------
synthese = Declic.synthese_objectifs(annee=ANNEE)
print("📊 Synthèse globale :")
print(f"  - Objectif total : {synthese['objectif_total']}")
print(f"  - Réalisé total (Atelier 1) : {synthese['realise_total']}")
print(f"  - Taux d’atteinte : {synthese['taux_atteinte_total']} %")
print(f"  - Reste à faire total : {synthese['reste_a_faire_total']}\n")

# -------------------------------------------------------------------
# 🏫 Par centre
# -------------------------------------------------------------------
# -------------------------------------------------------------------
# 🏫 Par centre
# -------------------------------------------------------------------
print("🏫 Par centre :")
for centre, reste in synthese["par_centre"].items():
    obj = ObjectifDeclic.objects.filter(centre__nom=centre, annee=ANNEE).first()
    realise = Declic.total_accueillis(annee=ANNEE, centre=obj.centre) if obj else 0
    taux = round((realise / obj.valeur_objectif) * 100, 1) if obj and obj.valeur_objectif else 0

    # 🔹 Nouveau : taux de rétention (Atelier 1 → Atelier 6)
    retention = Declic.taux_retention(obj.centre, ANNEE) if obj else 0

    print(f"  - {centre:<30} | "
          f"Objectif: {obj.valeur_objectif if obj else 0:<5} | "
          f"Réalisé (At1): {realise:<5} | "
          f"Taux: {taux:>5}% | "
          f"Reste: {reste:<5} | "
          f"Rétention: {retention:>5}%")
print()


# -------------------------------------------------------------------
# 🗺️ Par département
# -------------------------------------------------------------------
print("🗺️ Par département :")
for dep, reste in synthese["par_departement"].items():
    realise_dep = Declic.total_accueillis(annee=ANNEE, departement=dep)
    obj_dep = sum(ObjectifDeclic.objects.filter(annee=ANNEE, departement=dep)
                  .values_list("valeur_objectif", flat=True)) or 0
    taux_dep = round((realise_dep / obj_dep) * 100, 1) if obj_dep else 0
    print(f"  - Département {dep:<5} | Objectif: {obj_dep:<5} | "
          f"Réalisé (At1): {realise_dep:<5} | Taux: {taux_dep:>5}% | Reste: {reste}")

print("\n✅ Vérification terminée.\n")
