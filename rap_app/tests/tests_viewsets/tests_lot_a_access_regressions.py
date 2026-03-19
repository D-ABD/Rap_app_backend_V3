from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from ...models.appairage import Appairage, AppairageStatut
from ...models.atelier_tre import AtelierTRE
from ...models.candidat import Candidat
from ...models.centres import Centre
from ...models.commentaires_appairage import CommentaireAppairage
from ...models.custom_user import CustomUser
from ...models.declic import Declic, ObjectifDeclic
from ...models.formations import Formation
from ...models.partenaires import Partenaire
from ...models.prepa import ObjectifPrepa, Prepa
from ...models.prospection import Prospection
from ...models.prospection_choices import ProspectionChoices
from ...models.prospection_comments import ProspectionComment
from ...models.statut import Statut
from ...models.types_offre import TypeOffre
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class LotAAccessRegressionsTestCase(AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.admin = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.admin)

        self.centre_a = Centre.objects.create(nom="Centre A", code_postal="59000")
        self.centre_b = Centre.objects.create(nom="Centre B", code_postal="75000")

        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI, couleur="#000000")
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.POEC, couleur="#FF0000")

        today = timezone.now().date()
        self.formation_a = Formation.objects.create(
            nom="Formation A",
            centre=self.centre_a,
            statut=self.statut,
            type_offre=self.type_offre,
            num_offre="A-001",
            start_date=today,
            end_date=today + timedelta(days=30),
            created_by=self.admin,
        )
        self.formation_b = Formation.objects.create(
            nom="Formation B",
            centre=self.centre_b,
            statut=self.statut,
            type_offre=self.type_offre,
            num_offre="B-001",
            start_date=today,
            end_date=today + timedelta(days=30),
            created_by=self.admin,
        )

        self.owner_a = UserFactory(role=CustomUser.ROLE_STAGIAIRE)
        self.owner_b = UserFactory(role=CustomUser.ROLE_STAGIAIRE)

        self.partenaire_a = Partenaire.objects.create(nom="Partenaire A", default_centre=self.centre_a)
        self.partenaire_b = Partenaire.objects.create(nom="Partenaire B", default_centre=self.centre_b)

        self.prospection_a = Prospection.objects.create(
            owner=self.owner_a,
            centre=self.centre_a,
            formation=self.formation_a,
            partenaire=self.partenaire_a,
            motif=ProspectionChoices.MOTIF_AUTRE,
            objectif=ProspectionChoices.OBJECTIF_PRISE_CONTACT,
            type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
            created_by=self.admin,
        )
        self.prospection_b = Prospection.objects.create(
            owner=self.owner_b,
            centre=self.centre_b,
            formation=self.formation_b,
            partenaire=self.partenaire_b,
            motif=ProspectionChoices.MOTIF_AUTRE,
            objectif=ProspectionChoices.OBJECTIF_PRISE_CONTACT,
            type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
            created_by=self.admin,
        )

        ProspectionComment.objects.create(
            prospection=self.prospection_a,
            body="Commentaire visible",
            created_by=self.admin,
        )
        ProspectionComment.objects.create(
            prospection=self.prospection_b,
            body="Commentaire cache",
            created_by=self.admin,
        )

        self.candidat_a = Candidat.objects.create(
            nom="Durand",
            prenom="Alice",
            formation=self.formation_a,
            created_by=self.admin,
        )
        self.appairage_a = Appairage.objects.create(
            candidat=self.candidat_a,
            partenaire=self.partenaire_a,
            formation=self.formation_a,
            statut=AppairageStatut.TRANSMIS,
            created_by=self.admin,
        )
        CommentaireAppairage.objects.create(
            appairage=self.appairage_a,
            body="Commentaire appairage visible",
            created_by=self.admin,
        )

        self.prepa_2025_a = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=today.replace(year=2025),
            centre=self.centre_a,
            nb_inscrits_prepa=10,
            nb_presents_prepa=7,
            created_by=self.admin,
        )
        self.prepa_2025_b = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=today.replace(year=2025),
            centre=self.centre_b,
            nb_inscrits_prepa=12,
            nb_presents_prepa=9,
            created_by=self.admin,
        )
        ObjectifPrepa.objects.create(centre=self.centre_a, annee=2025, valeur_objectif=20, created_by=self.admin)
        ObjectifPrepa.objects.create(centre=self.centre_b, annee=2025, valeur_objectif=40, created_by=self.admin)

        self.declic_2025_a = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=today.replace(year=2025),
            centre=self.centre_a,
            nb_inscrits_declic=10,
            nb_presents_declic=6,
            created_by=self.admin,
        )
        self.declic_2025_b = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=today.replace(year=2025),
            centre=self.centre_b,
            nb_inscrits_declic=10,
            nb_presents_declic=8,
            created_by=self.admin,
        )
        ObjectifDeclic.objects.create(centre=self.centre_a, annee=2025, valeur_objectif=15, created_by=self.admin)
        ObjectifDeclic.objects.create(centre=self.centre_b, annee=2025, valeur_objectif=30, created_by=self.admin)

    def test_staff_without_centres_cannot_list_appairage_commentaires(self):
        staff = UserFactory(role=CustomUser.ROLE_STAFF)
        self.client.force_authenticate(user=staff)

        response = self.client.get(reverse("appairage-commentaire-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data.get("data", response.data)
        if isinstance(payload, dict) and "count" in payload:
            self.assertEqual(payload["count"], 0)
        elif isinstance(payload, dict) and "results" in payload:
            self.assertEqual(len(payload["results"]), 0)
        else:
            self.assertEqual(len(payload), 0)

    def test_staff_read_filter_options_on_prospection_comments_is_scoped(self):
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        staff_read.centres.add(self.centre_a)
        self.client.force_authenticate(user=staff_read)

        response = self.client.get(reverse("prospection-comment-filter-options"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["centres"], [{"value": "Centre A", "label": "Centre A"}])
        self.assertEqual(response.data["formations"], [{"value": "Formation A", "label": "Formation A"}])
        self.assertEqual(response.data["partenaires"], [{"value": "Partenaire A", "label": "Partenaire A"}])

    def test_prepa_staff_cannot_create_prepa_outside_scope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.post(
            reverse("prepa-list"),
            {
                "type_prepa": Prepa.TypePrepa.ATELIER1,
                "date_prepa": "2025-05-10",
                "centre_id": self.centre_b.id,
                "nb_inscrits_prepa": 8,
                "nb_presents_prepa": 6,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Prepa.objects.filter(centre=self.centre_b, date_prepa="2025-05-10").exists())

    def test_staff_cannot_create_atelier_tre_outside_scope(self):
        staff = UserFactory(role=CustomUser.ROLE_STAFF)
        staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=staff)

        response = self.client.post(
            reverse("ateliers-tre-list"),
            {
                "type_atelier": AtelierTRE.TypeAtelier.ATELIER_1,
                "date_atelier": "2025-05-10T09:00:00Z",
                "centre": self.centre_b.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(AtelierTRE.objects.filter(centre=self.centre_b).exists())

    def test_prepa_stats_centres_are_scoped(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.get(reverse("prepa-stats-centres") + "?annee=2025")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"], {"Centre A": 7})

    def test_prepa_staff_cannot_create_objectif_outside_scope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.post(
            reverse("objectif-prepa-list"),
            {"centre_id": self.centre_b.id, "annee": 2026, "valeur_objectif": 25},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(ObjectifPrepa.objects.filter(centre=self.centre_b, annee=2026).exists())

    def test_declic_staff_cannot_create_declic_outside_scope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.post(
            reverse("declic-list"),
            {
                "type_declic": Declic.TypeDeclic.ATELIER1,
                "date_declic": "2025-05-10",
                "centre_id": self.centre_b.id,
                "nb_inscrits_declic": 8,
                "nb_presents_declic": 6,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Declic.objects.filter(centre=self.centre_b, date_declic="2025-05-10").exists())

    def test_staff_cannot_create_evenement_outside_scope(self):
        staff = UserFactory(role=CustomUser.ROLE_STAFF)
        staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=staff)

        response = self.client.post(
            reverse("evenement-list"),
            {
                "formation_id": self.formation_b.id,
                "type_evenement": "forum",
                "event_date": "2025-05-10",
                "lieu": "Centre B",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_declic_stats_centres_are_scoped(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.get(reverse("declic-stats-centres") + "?annee=2025")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"], {"Centre A": 6})

    def test_prepa_filters_uses_success_envelope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.get(reverse("prepa-filters"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("annees", response.data["data"])
        self.assertIn("centres", response.data["data"])

    def test_prepa_objectifs_list_uses_success_envelope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.get(reverse("objectif-prepa-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIsInstance(response.data["data"], dict)
        self.assertIn("results", response.data["data"])

    def test_declic_filters_uses_success_envelope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.get(reverse("declic-filters"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("annees", response.data["data"])
        self.assertIn("centres", response.data["data"])

    def test_declic_objectif_retrieve_uses_success_envelope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        objectif = ObjectifDeclic.objects.get(centre=self.centre_a, annee=2025)
        response = self.client.get(reverse("objectifs-declic-detail", args=[objectif.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["id"], objectif.id)

    def test_declic_staff_cannot_create_objectif_outside_scope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.post(
            reverse("objectifs-declic-list"),
            {"centre_id": self.centre_b.id, "annee": 2026, "valeur_objectif": 25},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(ObjectifDeclic.objects.filter(centre=self.centre_b, annee=2026).exists())
