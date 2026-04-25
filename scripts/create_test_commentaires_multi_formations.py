from django.utils import timezone
from django.contrib.auth import get_user_model

from rap_app.models import Formation, Commentaire

User = get_user_model()

# =========================
# PARAMÈTRES
# =========================

FORMATION_IDS = [100, 111, 104]
USER_ID = 400

COMMENTAIRES_PAR_FORMATION = 6

# Tous les commentaires seront créés sur cette date
DATE_REUNION = timezone.localdate()

contenus = [
    "Bonne dynamique générale, les apprenants restent engagés.",
    "Le rythme est parfois soutenu pour certains profils.",
    "Besoin de renforcer l'accompagnement individuel sur les points complexes.",
    "Les exercices pratiques sont appréciés et utiles.",
    "Quelques retards ou absences perturbent légèrement la progression.",
    "Point de vigilance : consolider les acquis avant la prochaine séance.",
]

formations = list(Formation.objects.filter(pk__in=FORMATION_IDS))
user = User.objects.get(pk=USER_ID)

if not formations:
    raise Exception("Aucune formation trouvée avec les IDs fournis.")

created = 0

for formation in formations:
    for i in range(COMMENTAIRES_PAR_FORMATION):
        created_at = timezone.make_aware(
            timezone.datetime(
                DATE_REUNION.year,
                DATE_REUNION.month,
                DATE_REUNION.day,
                9 + i,
                15,
                0,
            )
        )

        commentaire = Commentaire.objects.create(
            formation=formation,
            contenu=f"[TEST RÉUNION HEBDO] {contenus[i % len(contenus)]} Formation : {formation.nom}",
            saturation=45 + (i * 8) % 50,
            created_by=user,
            updated_by=user,
        )

        Commentaire.objects.filter(pk=commentaire.pk).update(
            created_at=created_at,
            updated_at=created_at,
        )

        created += 1

print("✅ Commentaires de réunion hebdo créés")
print(f"Date réunion : {DATE_REUNION}")
print(f"Formations ciblées : {[f.id for f in formations]}")
print(f"Utilisateur : {user.id} / {user.username}")
print(f"Nombre total créé : {created}")
