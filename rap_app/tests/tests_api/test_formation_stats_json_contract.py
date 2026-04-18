"""Contrat JSON et sémantique — migration inscrits V3 (Lots 1–5, 10).

Couverture Annexe A :
  A1–A3 : FormationStatsLot4SemanticTests (total_inscrits = saisie, écart)
  A4–A5 : FormationListDetailContractTests (saisie fields, GESPERS control)
  A6    : FormationStatsLot4SemanticTests (taux avec places > 0)
  A7–A9 : FormationStatsTopsLot5Tests (CRIF, classement saisie)
  A12   : FormationStatsJsonContractTests (structure JSON complète)
"""

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre


class FormationStatsJsonContractTests(APITestCase):
    """Garde-fous structurels GET /api/formation-stats/* (staff)."""

    def setUp(self):
        self.staff = CustomUser.objects.create_user_with_role(
            email="formation.stats.contract@example.com",
            username="formation_stats_contract",
            password="Password123!",
            role=CustomUser.ROLE_STAFF,
        )
        self.client.force_authenticate(user=self.staff)
        self.centre = Centre.objects.create(
            nom="Centre Contract FS",
            code_postal="75011",
            created_by=self.staff,
        )
        self.staff.centres.add(self.centre)
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF, created_by=self.staff)
        self.statut = Statut.objects.create(
            nom=Statut.NON_DEFINI,
            couleur="#000000",
            created_by=self.staff,
        )
        today = timezone.localdate()
        Formation.objects.create(
            nom="Formation Contract FS",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today - timedelta(days=1),
            end_date=today + timedelta(days=20),
            prevus_crif=5,
            prevus_mp=5,
            inscrits_crif=1,
            inscrits_mp=0,
            created_by=self.staff,
        )

    def test_formation_stats_list_top_level_contract(self):
        response = self.client.get(reverse("formation-stats-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("kpis", response.data)
        self.assertIn("filters_echo", response.data)
        kpis = response.data["kpis"]
        self.assertIsInstance(kpis, dict)

        for key in (
            "total_inscrits",
            "total_inscrits_saisis",
            "taux_saturation",
            "taux_transformation",
            "ecart_inscrits_vs_gespers",
            "repartition_financeur",
            "entrees_formation",
            "presents_en_formation",
            "candidats",
            "appairages",
        ):
            self.assertIn(key, kpis, msg=f"kpis manque la clé {key!r}")

        self.assertIsInstance(kpis["taux_saturation"], (int, float))
        self.assertIsInstance(kpis["taux_transformation"], (int, float))
        self.assertIsInstance(kpis["repartition_financeur"], dict)
        self.assertIsInstance(kpis["candidats"], dict)
        self.assertIsInstance(kpis["appairages"], dict)

        for key in (
            "inscrits_source_reference",
            "nombre_candidats_saisi",
            "inscrits_gespers_crif",
            "inscrits_gespers_mp",
            "total_inscrits_gespers",
            "ecart_inscrits",
            "taux_saturation_reference",
            "taux_saturation_gespers",
            "taux_transformation_reference",
            "taux_transformation_gespers",
        ):
            self.assertIn(key, kpis, msg=f"kpis manque la clé Lot 2 {key!r}")
        self.assertEqual(kpis["inscrits_source_reference"], "saisie")
        self.assertIsInstance(kpis["nombre_candidats_saisi"], int)
        for key in (
            "inscrits_gespers_crif",
            "inscrits_gespers_mp",
            "total_inscrits_gespers",
            "ecart_inscrits",
        ):
            self.assertIsInstance(kpis[key], int)
        for key in (
            "taux_saturation_reference",
            "taux_saturation_gespers",
            "taux_transformation_reference",
            "taux_transformation_gespers",
        ):
            self.assertIsInstance(kpis[key], (int, float))

        cand = kpis["candidats"]
        for key in ("nb_candidats", "nb_inscrits_gespers", "ecart_inscrits_vs_gespers"):
            self.assertIn(key, cand, msg=f"candidats manque {key!r}")

    def test_formation_stats_grouped_contract(self):
        response = self.client.get(reverse("formation-stats-grouped"), {"by": "departement"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("group_by", response.data)
        self.assertIn("results", response.data)
        self.assertIsInstance(response.data["results"], list)
        if response.data["results"]:
            row = response.data["results"][0]
            for key in (
                "total_inscrits",
                "total_inscrits_saisis",
                "nb_inscrits_gespers",
                "ecart_inscrits_vs_gespers",
                "taux_saturation",
                "taux_transformation",
                "nombre_candidats_saisi",
                "inscrits_gespers_crif",
                "inscrits_gespers_mp",
                "inscrits_source_reference",
                "total_inscrits_gespers",
                "ecart_inscrits",
                "taux_saturation_reference",
                "taux_saturation_gespers",
                "taux_transformation_reference",
                "taux_transformation_gespers",
                "entrees_formation",
                "presents_en_formation",
            ):
                self.assertIn(key, row, msg=f"ligne groupée manque {key!r}")

    def test_formation_stats_tops_contract(self):
        response = self.client.get(reverse("formation-stats-tops"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ("a_recruter", "top_saturees", "en_tension"):
            self.assertIn(key, response.data)
            self.assertIsInstance(response.data[key], list)

    def test_formation_stats_filter_options_contract(self):
        response = self.client.get(reverse("formation-stats-filter-options"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ("centresById", "typeOffreById", "statutById", "departements"):
            self.assertIn(key, response.data)


class FormationStatsLot4SemanticTests(APITestCase):
    """Lot 4 — total_inscrits = saisie, taux basés sur saisie, GESPERS en contrôle."""

    def setUp(self):
        self.staff = CustomUser.objects.create_user_with_role(
            email="lot4.semantic@example.com",
            username="lot4_semantic",
            password="Password123!",
            role=CustomUser.ROLE_STAFF,
        )
        self.client.force_authenticate(user=self.staff)
        self.centre = Centre.objects.create(
            nom="Centre Lot4",
            code_postal="75013",
            created_by=self.staff,
        )
        self.staff.centres.add(self.centre)
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF, created_by=self.staff)
        self.statut = Statut.objects.create(
            nom=Statut.NON_DEFINI,
            couleur="#000000",
            created_by=self.staff,
        )
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Lot4 Semantic",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today - timedelta(days=1),
            end_date=today + timedelta(days=20),
            prevus_crif=10,
            prevus_mp=5,
            inscrits_crif=4,
            inscrits_mp=3,
            nombre_candidats=12,
            created_by=self.staff,
        )

    def test_list_total_inscrits_equals_saisie(self):
        """total_inscrits doit refléter la saisie (inscrits_crif + inscrits_mp), pas GESPERS."""
        response = self.client.get(reverse("formation-stats-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        kpis = response.data["kpis"]
        self.assertEqual(kpis["total_inscrits"], kpis["total_inscrits_saisis"])
        self.assertEqual(kpis["total_inscrits"], 7)

    def test_list_total_inscrits_gespers_separate(self):
        """total_inscrits_gespers doit être le contrôle GESPERS, distinct de total_inscrits."""
        response = self.client.get(reverse("formation-stats-list"))
        kpis = response.data["kpis"]
        self.assertIn("total_inscrits_gespers", kpis)
        self.assertIsInstance(kpis["total_inscrits_gespers"], int)
        self.assertEqual(kpis["total_inscrits_gespers"], 0)

    def test_list_taux_saturation_saisie_based(self):
        """taux_saturation par défaut = saisie / places (pas GESPERS)."""
        response = self.client.get(reverse("formation-stats-list"))
        kpis = response.data["kpis"]
        expected = round(7.0 * 100.0 / 15.0, 2)
        self.assertAlmostEqual(kpis["taux_saturation"], expected, places=2)
        self.assertEqual(kpis["taux_saturation"], kpis["taux_saturation_reference"])

    def test_list_taux_gespers_available(self):
        """Les variantes GESPERS restent disponibles pour le contrôle."""
        response = self.client.get(reverse("formation-stats-list"))
        kpis = response.data["kpis"]
        self.assertIn("taux_saturation_gespers", kpis)
        self.assertIn("taux_transformation_gespers", kpis)
        self.assertIsInstance(kpis["taux_saturation_gespers"], (int, float))
        self.assertIsInstance(kpis["taux_transformation_gespers"], (int, float))

    def test_list_repartition_financeur_coherence(self):
        """repartition_financeur doit être cohérent avec total_inscrits (saisie)."""
        response = self.client.get(reverse("formation-stats-list"))
        kpis = response.data["kpis"]
        rep = kpis["repartition_financeur"]
        self.assertEqual(rep["crif"] + rep["mp"], kpis["total_inscrits"])

    def test_grouped_total_inscrits_saisie(self):
        """grouped: total_inscrits = saisie, total_inscrits_gespers = contrôle."""
        response = self.client.get(reverse("formation-stats-grouped"), {"by": "departement"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data["results"]) > 0)
        row = response.data["results"][0]
        self.assertEqual(row["total_inscrits"], row["total_inscrits_saisis"])
        self.assertIn("total_inscrits_gespers", row)

    def test_grouped_taux_saisie_based(self):
        """grouped: taux_saturation et taux_transformation basés sur saisie."""
        response = self.client.get(reverse("formation-stats-grouped"), {"by": "departement"})
        row = response.data["results"][0]
        self.assertEqual(row["taux_saturation"], row["taux_saturation_reference"])


class FormationStatsTopsLot5Tests(APITestCase):
    """Lot 5 — tops aligné avec saisie post-Lot 4."""

    def setUp(self):
        self.staff = CustomUser.objects.create_user_with_role(
            email="lot5.tops@example.com",
            username="lot5_tops",
            password="Password123!",
            role=CustomUser.ROLE_STAFF,
        )
        self.client.force_authenticate(user=self.staff)
        self.centre = Centre.objects.create(
            nom="Centre Lot5",
            code_postal="75014",
            created_by=self.staff,
        )
        self.staff.centres.add(self.centre)
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF, created_by=self.staff)
        self.statut = Statut.objects.create(
            nom=Statut.NON_DEFINI,
            couleur="#000000",
            created_by=self.staff,
        )
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Lot5 Saturée",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today - timedelta(days=1),
            end_date=today + timedelta(days=20),
            prevus_crif=5,
            prevus_mp=5,
            inscrits_crif=5,
            inscrits_mp=4,
            created_by=self.staff,
        )

    def test_tops_saturees_uses_saisie(self):
        """Une formation à 90% saisie doit apparaître dans top_saturees."""
        response = self.client.get(reverse("formation-stats-tops"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        saturees = response.data["top_saturees"]
        ids = [r["id"] for r in saturees]
        self.assertIn(self.formation.pk, ids)
        row = next(r for r in saturees if r["id"] == self.formation.pk)
        self.assertAlmostEqual(row["taux"], 90.0, places=1)

    def test_tops_places_disponibles_saisie(self):
        """places_disponibles = places - inscrits saisis."""
        response = self.client.get(reverse("formation-stats-tops"))
        saturees = response.data["top_saturees"]
        row = next((r for r in saturees if r["id"] == self.formation.pk), None)
        self.assertIsNotNone(row)
        self.assertEqual(row["places_disponibles"], 1)

    def test_tops_a_recruter_coherence(self):
        """a_recruter contient les formations avec places disponibles > 0."""
        response = self.client.get(reverse("formation-stats-tops"))
        a_recruter = response.data["a_recruter"]
        for row in a_recruter:
            self.assertGreater(row["places_disponibles"], 0)


class FormationListDetailContractTests(APITestCase):
    """Lot 3 — contrat JSON liste/détail formations (saisie = source, GESPERS = contrôle)."""

    def setUp(self):
        self.staff = CustomUser.objects.create_user_with_role(
            email="formation.list.contract@example.com",
            username="formation_list_contract",
            password="Password123!",
            role=CustomUser.ROLE_STAFF,
        )
        self.client.force_authenticate(user=self.staff)
        self.centre = Centre.objects.create(
            nom="Centre List Contract",
            code_postal="75012",
            created_by=self.staff,
        )
        self.staff.centres.add(self.centre)
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF, created_by=self.staff)
        self.statut = Statut.objects.create(
            nom=Statut.NON_DEFINI,
            couleur="#000000",
            created_by=self.staff,
        )
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation List Contract",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today - timedelta(days=1),
            end_date=today + timedelta(days=20),
            prevus_crif=10,
            prevus_mp=5,
            inscrits_crif=3,
            inscrits_mp=2,
            nombre_candidats=8,
            created_by=self.staff,
        )

    def _get_list_results(self):
        response = self.client.get(reverse("formation-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data
        if "data" in payload and isinstance(payload["data"], dict):
            results = payload["data"].get("results", [])
        else:
            results = payload.get("results", [])
        return results

    def _get_detail_data(self):
        response = self.client.get(reverse("formation-detail", args=[self.formation.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data
        return payload.get("data", payload)

    def test_formation_list_saisie_fields(self):
        results = self._get_list_results()
        self.assertTrue(len(results) > 0, "Aucune formation dans la liste")
        row = results[0]
        self.assertEqual(row["inscrits_crif"], 3)
        self.assertEqual(row["inscrits_mp"], 2)
        self.assertEqual(row["inscrits_total"], 5)
        self.assertEqual(row["nombre_candidats"], 8)

    def test_formation_list_gespers_control_fields(self):
        results = self._get_list_results()
        self.assertTrue(len(results) > 0)
        row = results[0]
        for key in (
            "inscrits_crif_gespers",
            "inscrits_mp_gespers",
            "total_inscrits_gespers",
            "nombre_candidats_calc",
            "taux_saturation_gespers",
            "ecart_inscrits",
        ):
            self.assertIn(key, row, msg=f"liste formation manque clé contrôle {key!r}")
            self.assertIsInstance(row[key], (int, float))

    def test_formation_detail_saisie_fields(self):
        data = self._get_detail_data()
        self.assertEqual(data["inscrits_crif"], 3)
        self.assertEqual(data["inscrits_mp"], 2)
        self.assertEqual(data["nombre_candidats"], 8)

    def test_formation_detail_gespers_control_fields(self):
        data = self._get_detail_data()
        for key in (
            "inscrits_crif_gespers",
            "inscrits_mp_gespers",
            "total_inscrits_gespers",
            "nombre_candidats_calc",
            "taux_saturation_gespers",
            "ecart_inscrits",
        ):
            self.assertIn(key, data, msg=f"détail formation manque clé contrôle {key!r}")
            self.assertIsInstance(data[key], (int, float))

    def test_formation_list_ecart_coherence(self):
        results = self._get_list_results()
        self.assertTrue(len(results) > 0)
        row = results[0]
        expected_ecart = row["inscrits_total"] - row["total_inscrits_gespers"]
        self.assertEqual(row["ecart_inscrits"], expected_ecart)
