"""Tests relatifs au viewset CVThèque (filtres liste)."""

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.cvtheque import CVTheque
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre
from rap_app.tests.factories import UserFactory
from rap_app.tests.test_utils import AuthenticatedTestCase


class CVThequeViewSetFilterTests(AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.centre = Centre.objects.create(nom="CVThèqueFilterCentre", created_by=self.user)
        self.type_offre = TypeOffre.objects.create(nom="crif", created_by=self.user)
        self.statut = Statut.objects.create(nom="non_defini", couleur="#000000", created_by=self.user)
        self.formation = Formation.objects.create(
            nom="F CV filter",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            created_by=self.user,
        )
        self.c1 = Candidat.objects.create(
            nom="A",
            prenom="One",
            email="one.cvfilter@example.com",
            formation=self.formation,
            created_by=self.user,
        )
        self.c2 = Candidat.objects.create(
            nom="B",
            prenom="Two",
            email="two.cvfilter@example.com",
            formation=self.formation,
            created_by=self.user,
        )
        f1 = SimpleUploadedFile("c1.pdf", b"%PDF-1.4 a", content_type="application/pdf")
        f2 = SimpleUploadedFile("c2.pdf", b"%PDF-1.4 b", content_type="application/pdf")
        self.cv1 = CVTheque.objects.create(
            candidat=self.c1,
            document_type="CV",
            fichier=f1,
            titre="CV candidat 1",
            created_by=self.user,
        )
        self.cv2 = CVTheque.objects.create(
            candidat=self.c2,
            document_type="CV",
            fichier=f2,
            titre="CV candidat 2",
            created_by=self.user,
        )
        self.addCleanup(self.cv1.fichier.close)
        self.addCleanup(self.cv2.fichier.close)

    def test_list_cvtheque_filtered_by_candidat_query_param(self):
        url = reverse("cvtheque-list")
        all_resp = self.client.get(url)
        self.assertEqual(all_resp.status_code, status.HTTP_200_OK)
        payload = all_resp.data.get("data", all_resp.data)
        self.assertIsInstance(payload, dict)
        self.assertIn("results", payload)
        all_ids = [item["id"] for item in payload["results"]]
        self.assertIn(self.cv1.id, all_ids)
        self.assertIn(self.cv2.id, all_ids)

        filtered = self.client.get(url, {"candidat": self.c1.id})
        self.assertEqual(filtered.status_code, status.HTTP_200_OK)
        fp = filtered.data.get("data", filtered.data)
        filtered_ids = [item["id"] for item in fp["results"]]
        self.assertIn(self.cv1.id, filtered_ids)
        self.assertNotIn(self.cv2.id, filtered_ids)
