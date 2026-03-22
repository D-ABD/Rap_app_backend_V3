from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre


class CandidatePhaseStatsTests(APITestCase):
    def setUp(self):
        self.staff = CustomUser.objects.create_user_with_role(
            email="stats.phase.staff@example.com",
            username="stats_phase_staff",
            password="Password123!",
            role=CustomUser.ROLE_STAFF,
        )
        self.client.force_authenticate(user=self.staff)

        self.centre = Centre.objects.create(
            nom="Centre Stats Phase",
            code_postal="75011",
            created_by=self.staff,
        )
        self.staff.centres.add(self.centre)

        self.type_offre = TypeOffre.objects.create(
            nom=TypeOffre.CRIF,
            created_by=self.staff,
        )
        self.statut_formation = Statut.objects.create(
            nom=Statut.NON_DEFINI,
            couleur="#000000",
            created_by=self.staff,
        )
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Stats Phase",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut_formation,
            start_date=today - timedelta(days=3),
            end_date=today + timedelta(days=20),
            prevus_crif=10,
            prevus_mp=0,
            created_by=self.staff,
        )

        Candidat.objects.create(
            nom="Inscrit",
            prenom="Valide",
            email="inscrit.stats@example.com",
            formation=self.formation,
            parcours_phase=Candidat.ParcoursPhase.INSCRIT_VALIDE,
            inscrit_gespers=True,
            statut=Candidat.StatutCandidat.AUTRE,
            created_by=self.staff,
            updated_by=self.staff,
        )
        Candidat.objects.create(
            nom="Stagiaire",
            prenom="Phase",
            email="stagiaire.phase@example.com",
            formation=self.formation,
            parcours_phase=Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
            statut=Candidat.StatutCandidat.AUTRE,
            created_by=self.staff,
            updated_by=self.staff,
        )
        Candidat.objects.create(
            nom="Legacy",
            prenom="Formation",
            email="legacy.formation@example.com",
            formation=self.formation,
            parcours_phase=Candidat.ParcoursPhase.POSTULANT,
            statut=Candidat.StatutCandidat.EN_FORMATION,
            created_by=self.staff,
            updated_by=self.staff,
        )
        Candidat.objects.create(
            nom="Refuse",
            prenom="Entretien",
            email="refuse.stats@example.com",
            formation=self.formation,
            entretien_done=True,
            admissible=False,
            statut=Candidat.StatutCandidat.AUTRE,
            created_by=self.staff,
            updated_by=self.staff,
        )
        Candidat.objects.create(
            nom="Sortie",
            prenom="Formation",
            email="sortie.stats@example.com",
            formation=self.formation,
            parcours_phase=Candidat.ParcoursPhase.SORTI,
            statut=Candidat.StatutCandidat.EN_FORMATION,
            created_by=self.staff,
            updated_by=self.staff,
        )
        Candidat.objects.create(
            nom="Appairage",
            prenom="Manuel",
            email="appairage.stats@example.com",
            formation=self.formation,
            admissible=True,
            statut=Candidat.StatutCandidat.EN_APPAIRAGE,
            created_by=self.staff,
            updated_by=self.staff,
        )

    def test_candidat_stats_uses_phase_kpis_without_breaking_legacy_en_formation(self):
        response = self.client.get(reverse("candidat-stats-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["kpis"]["inscrits_valides"], 1)
        self.assertEqual(response.data["kpis"]["inscrits_gespers"], 1)
        self.assertEqual(response.data["kpis"]["stagiaires_en_formation"], 1)
        self.assertEqual(response.data["kpis"]["non_admissibles"], 0)
        self.assertEqual(response.data["kpis"]["en_appairage"], 1)
        self.assertEqual(response.data["kpis"]["en_formation"], 2)

        repartition = {
            item["parcours_phase"]: item["count"] for item in response.data["repartition"]["par_parcours_phase"]
        }
        self.assertEqual(repartition[Candidat.ParcoursPhase.INSCRIT_VALIDE], 1)
        self.assertEqual(repartition[Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION], 1)
        self.assertEqual(repartition[Candidat.ParcoursPhase.SORTI], 1)
        statut_metier = {
            item["statut_metier"]: item["count"] for item in response.data["repartition"]["par_statut_metier"]
        }
        self.assertEqual(statut_metier[Candidat.StatutMetier.INSCRIT_GESPERS], 1)
        self.assertEqual(statut_metier[Candidat.StatutMetier.EN_APPAIRAGE], 1)
        self.assertEqual(statut_metier[Candidat.StatutMetier.SORTIE_FORMATION], 1)

    def test_candidat_stats_grouped_accepts_parcours_phase_dimension(self):
        response = self.client.get(reverse("candidat-stats-grouped"), {"by": "parcours_phase"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        by_key = {row["group_key"]: row for row in response.data["results"]}
        self.assertEqual(by_key[Candidat.ParcoursPhase.INSCRIT_VALIDE]["inscrits_valides"], 1)
        self.assertEqual(
            by_key[Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION]["stagiaires_en_formation"],
            1,
        )

    def test_candidat_stats_grouped_accepts_statut_metier_dimension(self):
        response = self.client.get(reverse("candidat-stats-grouped"), {"by": "statut_metier"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        by_key = {row["group_key"]: row for row in response.data["results"]}
        self.assertEqual(by_key[Candidat.StatutMetier.INSCRIT_GESPERS]["inscrits_gespers"], 1)
        self.assertEqual(by_key[Candidat.StatutMetier.EN_APPAIRAGE]["en_appairage"], 1)
        self.assertEqual(by_key[Candidat.StatutMetier.SORTIE_FORMATION]["en_formation"], 1)

    def test_formation_stats_exposes_phase_based_candidate_kpis(self):
        response = self.client.get(reverse("formation-stats-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        candidats = response.data["kpis"]["candidats"]
        self.assertEqual(candidats["nb_inscrits_valides"], 1)
        self.assertEqual(candidats["nb_inscrits_gespers"], 1)
        self.assertEqual(candidats["nb_stagiaires_en_formation"], 1)
        self.assertEqual(candidats["nb_candidats_non_admissibles"], 0)
        self.assertEqual(candidats["nb_en_appairage"], 1)
        self.assertEqual(candidats["nb_entrees_formation"], 2)

    def test_formation_stats_grouped_invalid_by_uses_standard_error_envelope(self):
        response = self.client.get(reverse("formation-stats-grouped"), {"by": "invalide"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Paramètre 'by' invalide.")
        self.assertIsNone(response.data["data"])
