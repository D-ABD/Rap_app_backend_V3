"""Tests ciblés sur les calculs du dashboard Prépa."""

from datetime import date

from django.urls import reverse

from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ...models.prepa import ObjectifPrepa, Prepa, PrepaPresenceStatut, PrepaStagiaireParticipation, StagiairePrepa
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class PrepaStatsViewSetTests(AuthenticatedTestCase):
    """Vérifie les calculs engagement/réel/adhésion du dashboard Prépa."""

    def setUp(self):
        super().setUp()
        self.admin = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.admin)

        self.centre = Centre.objects.create(nom="Centre Lens", code_postal="62300", created_by=self.admin)
        ObjectifPrepa.objects.create(
            centre=self.centre,
            annee=2026,
            valeur_objectif=10,
            created_by=self.admin,
        )

        Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.INFO_COLLECTIVE,
            date_prepa=date(2026, 1, 10),
            centre=self.centre,
            nombre_places_ouvertes=12,
            nombre_prescriptions=9,
            nb_presents_info=8,
            nb_absents_info=1,
            nb_adhesions=4,
            created_by=self.admin,
        )
        Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=date(2026, 2, 3),
            centre=self.centre,
            nb_inscrits_prepa=7,
            nb_presents_prepa=5,
            nb_absents_prepa=2,
            created_by=self.admin,
        )
        Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER2,
            date_prepa=date(2026, 2, 17),
            centre=self.centre,
            nb_inscrits_prepa=6,
            nb_presents_prepa=4,
            nb_absents_prepa=2,
            created_by=self.admin,
        )
        Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER6,
            date_prepa=date(2026, 3, 10),
            centre=self.centre,
            nb_inscrits_prepa=3,
            nb_presents_prepa=3,
            nb_absents_prepa=0,
            created_by=self.admin,
        )

    def test_resume_uses_atelier_1_for_objectif_and_keeps_adhesions_separate(self):
        response = self.client.get(reverse("prepa-stats-resume") + "?annee=2026")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["objectif_total"], 10)
        self.assertEqual(response.data["atelier1_inscrits"], 7)
        self.assertEqual(response.data["atelier1_presents"], 5)
        self.assertEqual(response.data["realise_total"], 5)
        self.assertEqual(response.data["nb_adhesions"], 4)
        self.assertEqual(response.data["taux_atteinte_objectif_inscrits"], 70.0)
        self.assertEqual(response.data["taux_atteinte_objectif_presents"], 50.0)
        self.assertEqual(response.data["taux_retention_global"], 60.0)

    def test_grouped_retention_is_based_on_atelier_1_and_atelier_6(self):
        response = self.client.get(reverse("prepa-stats-grouped") + "?annee=2026&by=centre")

        self.assertEqual(response.status_code, 200)
        row = response.data["results"][0]
        self.assertEqual(row["atelier1_inscrits"], 7)
        self.assertEqual(row["atelier1_presents"], 5)
        self.assertEqual(row["atelier6_presents"], 3)
        self.assertEqual(row["taux_retention"], 60.0)

    def test_synthese_exposes_clear_objectif_aliases_for_inscrits_and_presents(self):
        response = self.client.get(reverse("prepa-stats-synthese") + "?annee=2026")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["engages_total"], 7)
        self.assertEqual(response.data["realise_total"], 5)
        self.assertEqual(response.data["atelier1_inscrits"], 7)
        self.assertEqual(response.data["atelier1_presents"], 5)
        self.assertEqual(response.data["objectif_sur_inscrits"], 7)
        self.assertEqual(response.data["objectif_sur_presents"], 5)
        self.assertEqual(response.data["taux_atteinte_inscrits"], 70.0)
        self.assertEqual(response.data["taux_atteinte_presents"], 50.0)
        self.assertEqual(response.data["reste_a_faire_inscrits"], 3)
        self.assertEqual(response.data["reste_a_faire_presents"], 5)

    def test_stagiaires_prepa_can_be_filtered_by_atelier_participation(self):
        atelier_2 = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER2,
            date_prepa=date(2026, 4, 1),
            centre=self.centre,
            nb_inscrits_prepa=1,
            nb_presents_prepa=1,
            created_by=self.admin,
        )
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Martin",
            prenom="Lina",
            created_by=self.admin,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=atelier_2,
            stagiaire_prepa=stagiaire,
            statut=PrepaPresenceStatut.PRESENT,
            created_by=self.admin,
        )

        response = self.client.get("/api/stagiaires-prepa/?prepa_participation=%s" % atelier_2.id)

        self.assertEqual(response.status_code, 200)
        payload = response.data.get("data", response.data)
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["nom"], "Martin")

    def test_stagiaires_prepa_can_be_filtered_by_atelier_en_cours(self):
        atelier_2 = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER2,
            date_prepa=date(2026, 4, 10),
            centre=self.centre,
            nb_inscrits_prepa=1,
            nb_presents_prepa=0,
            nb_absents_prepa=1,
            created_by=self.admin,
        )
        actif = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Actif",
            prenom="Lina",
            atelier_1_realise=True,
            date_entree_parcours=date(2026, 4, 1),
            created_by=self.admin,
        )
        autre = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Libre",
            prenom="Noah",
            atelier_1_realise=True,
            date_entree_parcours=date(2026, 4, 1),
            created_by=self.admin,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=atelier_2,
            stagiaire_prepa=actif,
            statut=PrepaPresenceStatut.INSCRIT,
            created_by=self.admin,
        )

        response = self.client.get("/api/stagiaires-prepa/?atelier_en_cours=atelier_2")

        self.assertEqual(response.status_code, 200)
        payload = response.data.get("data", response.data)
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["nom"], "Actif")
        self.assertNotEqual(payload["results"][0]["nom"], "Libre")

    def test_stagiaires_prepa_can_be_filtered_by_pilotage_a_reprogrammer(self):
        atelier_3 = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER3,
            date_prepa=date(2026, 4, 12),
            centre=self.centre,
            created_by=self.admin,
        )
        a_reprogrammer = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Reprog",
            prenom="Mia",
            atelier_1_realise=True,
            date_entree_parcours=date(2026, 4, 1),
            created_by=self.admin,
        )
        normal = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Normal",
            prenom="Leo",
            atelier_1_realise=True,
            date_entree_parcours=date(2026, 4, 1),
            created_by=self.admin,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=atelier_3,
            stagiaire_prepa=a_reprogrammer,
            statut=PrepaPresenceStatut.A_REPOSITIONNER,
            created_by=self.admin,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=atelier_3,
            stagiaire_prepa=normal,
            statut=PrepaPresenceStatut.TERMINE,
            created_by=self.admin,
        )

        response = self.client.get("/api/stagiaires-prepa/?pilotage=a_reprogrammer")

        self.assertEqual(response.status_code, 200)
        payload = response.data.get("data", response.data)
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["nom"], "Reprog")

    def test_stagiaires_prepa_can_be_filtered_by_date_ic_range(self):
        ic_early = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.INFO_COLLECTIVE,
            date_prepa=date(2026, 1, 15),
            centre=self.centre,
            created_by=self.admin,
        )
        ic_late = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.INFO_COLLECTIVE,
            date_prepa=date(2026, 3, 20),
            centre=self.centre,
            created_by=self.admin,
        )
        StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=ic_early,
            nom="Janvier",
            prenom="Eva",
            created_by=self.admin,
        )
        StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=ic_late,
            nom="Mars",
            prenom="Tom",
            created_by=self.admin,
        )

        response = self.client.get("/api/stagiaires-prepa/?date_ic_min=2026-03-01&date_ic_max=2026-03-31")

        self.assertEqual(response.status_code, 200)
        payload = response.data.get("data", response.data)
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["nom"], "Mars")

    def test_stagiaires_prepa_can_be_filtered_by_prochain_atelier_attendu(self):
        attendu = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Suivant",
            prenom="Ines",
            atelier_1_realise=True,
            date_entree_parcours=date(2026, 4, 1),
            prochain_atelier_prevu=Prepa.TypePrepa.ATELIER3,
            created_by=self.admin,
        )
        autre = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Autre",
            prenom="Malo",
            atelier_1_realise=True,
            date_entree_parcours=date(2026, 4, 1),
            prochain_atelier_prevu=Prepa.TypePrepa.ATELIER2,
            created_by=self.admin,
        )

        response = self.client.get("/api/stagiaires-prepa/?prochain_atelier_attendu=atelier_3")

        self.assertEqual(response.status_code, 200)
        payload = response.data.get("data", response.data)
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["nom"], attendu.nom)
        self.assertNotEqual(payload["results"][0]["nom"], autre.nom)

    def test_stagiaires_prepa_can_be_filtered_by_prochain_etape_alias(self):
        attendu = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Alias",
            prenom="Lea",
            atelier_1_realise=True,
            date_entree_parcours=date(2026, 4, 1),
            prochain_atelier_prevu=Prepa.TypePrepa.ATELIER4,
            created_by=self.admin,
        )
        autre = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Autre",
            prenom="Noe",
            atelier_1_realise=True,
            date_entree_parcours=date(2026, 4, 1),
            prochain_atelier_prevu=Prepa.TypePrepa.ATELIER2,
            created_by=self.admin,
        )

        response = self.client.get("/api/stagiaires-prepa/?prochain_etape=atelier_4")

        self.assertEqual(response.status_code, 200)
        payload = response.data.get("data", response.data)
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["nom"], attendu.nom)
        self.assertNotEqual(payload["results"][0]["nom"], autre.nom)

    def test_stagiaires_prepa_prochain_atelier_6_excludes_parcours_termines(self):
        attendu = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Encore",
            prenom="Actif",
            atelier_1_realise=True,
            date_entree_parcours=date(2026, 4, 1),
            created_by=self.admin,
        )
        termine = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Deja",
            prenom="Termine",
            atelier_1_realise=True,
            atelier_6_realise=True,
            date_atelier_6=date(2026, 4, 20),
            date_sortie_parcours=date(2026, 4, 20),
            created_by=self.admin,
        )

        response = self.client.get("/api/stagiaires-prepa/?prochain_atelier_attendu=atelier_6")

        self.assertEqual(response.status_code, 200)
        payload = response.data.get("data", response.data)
        noms = {item["nom"] for item in payload["results"]}
        self.assertIn(attendu.nom, noms)
        self.assertNotIn(termine.nom, noms)

    def test_stagiaires_prepa_prochain_etape_bilan_returns_attente_bilan(self):
        attendu_bilan = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Bilan",
            prenom="Nina",
            created_by=self.admin,
        )
        at1 = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=date(2026, 4, 1),
            centre=self.centre,
            created_by=self.admin,
        )
        at6 = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER6,
            date_prepa=date(2026, 4, 20),
            centre=self.centre,
            created_by=self.admin,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=at1,
            stagiaire_prepa=attendu_bilan,
            statut=PrepaPresenceStatut.PRESENT,
            created_by=self.admin,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=at6,
            stagiaire_prepa=attendu_bilan,
            statut=PrepaPresenceStatut.PRESENT,
            created_by=self.admin,
        )
        autre = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Suite",
            prenom="Luca",
            atelier_1_realise=True,
            date_entree_parcours=date(2026, 4, 1),
            prochain_atelier_prevu=Prepa.TypePrepa.ATELIER3,
            created_by=self.admin,
        )

        response = self.client.get("/api/stagiaires-prepa/?prochain_etape=bilan")

        self.assertEqual(response.status_code, 200)
        payload = response.data.get("data", response.data)
        noms = {item["nom"] for item in payload["results"]}
        self.assertIn(attendu_bilan.nom, noms)
        self.assertNotIn(autre.nom, noms)
