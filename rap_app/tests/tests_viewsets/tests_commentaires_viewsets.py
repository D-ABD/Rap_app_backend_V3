from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from ...models.centres import Centre
from ...models.commentaires import Commentaire
from ...models.custom_user import CustomUser
from ...models.formations import Formation
from ...models.statut import Statut
from ...models.types_offre import TypeOffre
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class CommentaireViewSetTestCase(AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.centre = Centre.objects.create(nom="Centre Test", code_postal="75001")
        self.statut = Statut.objects.create(nom="non_defini", couleur="#00FF00")
        self.type_offre = TypeOffre.objects.create(nom="poec", couleur="#FF0000")

        self.formation = Formation.objects.create(
            nom="Formation Test",
            centre=self.centre,
            statut=self.statut,
            type_offre=self.type_offre,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=5),
            created_by=self.user,
        )

        self.commentaire = Commentaire.objects.create(
            formation=self.formation, contenu="Contenu de test", saturation=85, created_by=self.user
        )

    def get_data(self, response):
        return response.data.get("data", response.data)

    def test_list_commentaires(self):
        url = reverse("commentaire-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaires récupérés")
        self.assertIn("results", self.get_data(response))

    def test_detail_commentaire(self):
        url = reverse("commentaire-detail", args=[self.commentaire.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.get_data(response)["id"], self.commentaire.id)

    def test_create_commentaire_valide(self):
        url = reverse("commentaire-list")
        payload = {"formation": self.formation.id, "contenu": "Nouveau commentaire", "saturation": 70}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("data", response.data)
        self.assertEqual(self.get_data(response)["saturation"], 70)

    def test_create_commentaire_invalide_contenu(self):
        url = reverse("commentaire-list")
        payload = {"formation": self.formation.id, "contenu": "   ", "saturation": 50}
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("contenu", response.data.get("errors", {}))

    def test_create_commentaire_avec_saturation(self):
        url = reverse("commentaire-list")
        payload = {
            "formation": self.formation.id,
            "contenu": "Contenu correct",
            "saturation": 80,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = self.get_data(response)
        self.assertIn("contenu", data)
        self.assertEqual(data["contenu"], "Contenu correct")

    def test_update_commentaire(self):
        url = reverse("commentaire-detail", args=[self.commentaire.id])
        payload = {"formation": self.formation.id, "contenu": "Contenu modifié", "saturation": 60}
        response = self.client.put(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.get_data(response)["contenu"], "Contenu modifié")

    def test_delete_commentaire_archive_logiquement(self):
        url = reverse("commentaire-detail", args=[self.commentaire.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.commentaire.refresh_from_db()
        self.assertEqual(self.commentaire.statut_commentaire, Commentaire.STATUT_ARCHIVE)

    def test_delete_commentaire_archive_and_hides_from_default_list(self):
        url = reverse("commentaire-detail", args=[self.commentaire.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        list_response = self.client.get(reverse("commentaire-list"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        payload = self.get_data(list_response)
        results = payload.get("results", payload) if isinstance(payload, dict) else payload
        results = results if isinstance(results, list) else [results]
        ids = [item.get("id") for item in results if isinstance(item, dict)]
        self.assertNotIn(self.commentaire.id, ids)

    def test_list_commentaires_can_include_archived_items(self):
        self.commentaire.archiver(user=self.user, save=True)

        response = self.client.get(reverse("commentaire-list"), {"statut": "all"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payload = self.get_data(response)
        results = payload.get("results", payload) if isinstance(payload, dict) else payload
        results = results if isinstance(results, list) else [results]
        ids = [item.get("id") for item in results if isinstance(item, dict)]
        self.assertIn(self.commentaire.id, ids)

    def test_list_commentaires_can_show_archived_only(self):
        self.commentaire.archiver(user=self.user, save=True)

        active_comment = Commentaire.objects.create(
            formation=self.formation,
            contenu="Commentaire actif",
            saturation=70,
            created_by=self.user,
        )

        response = self.client.get(reverse("commentaire-list"), {"statut": "archive"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payload = self.get_data(response)
        results = payload.get("results", payload) if isinstance(payload, dict) else payload
        results = results if isinstance(results, list) else [results]
        ids = [item.get("id") for item in results if isinstance(item, dict)]
        self.assertIn(self.commentaire.id, ids)
        self.assertNotIn(active_comment.id, ids)

    def test_archiver_puis_desarchiver_commentaire(self):
        archive_response = self.client.post(reverse("commentaire-archiver", args=[self.commentaire.id]))
        self.assertEqual(archive_response.status_code, status.HTTP_200_OK)

        self.commentaire.refresh_from_db()
        self.assertEqual(self.commentaire.statut_commentaire, Commentaire.STATUT_ARCHIVE)

        restore_response = self.client.post(reverse("commentaire-desarchiver", args=[self.commentaire.id]))
        self.assertEqual(restore_response.status_code, status.HTTP_200_OK)

        self.commentaire.refresh_from_db()
        self.assertEqual(self.commentaire.statut_commentaire, Commentaire.STATUT_ACTIF)

    def test_filtrage_par_formation(self):
        url = reverse("commentaire-list") + f"?formation_id={self.formation.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = self.get_data(response)
        results = data.get("results", data) if isinstance(data, dict) else data
        if not isinstance(results, list):
            results = [results] if results else []
        for c in results:
            item = c.get("data", c)
            formation_id = item.get("formation_id") or item.get("formation")
            self.assertEqual(formation_id, self.formation.id)

    def test_filtrage_par_recherche(self):
        url = reverse("commentaire-list") + "?search=test"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_data(response)["results"]
        self.assertTrue(any("test" in c["contenu"].lower() for c in results))

    def test_endpoint_saturation_stats(self):
        url = reverse("commentaire-saturation-stats")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stats = self.get_data(response)
        self.assertIn("avg", stats)
        self.assertEqual(stats["count"], 1)

    def test_commercial_can_list_but_cannot_create_commentaire(self):
        commercial = UserFactory(role=CustomUser.ROLE_COMMERCIAL)
        commercial.centres.add(self.centre)
        self.client.force_authenticate(user=commercial)

        list_response = self.client.get(reverse("commentaire-list"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        create_response = self.client.post(
            reverse("commentaire-list"),
            {"formation": self.formation.id, "contenu": "Commentaire commercial", "saturation": 70},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_charge_recrutement_can_create_commentaire_in_scope(self):
        charge = UserFactory(role=CustomUser.ROLE_CHARGE_RECRUTEMENT)
        charge.centres.add(self.centre)
        self.client.force_authenticate(user=charge)

        response = self.client.post(
            reverse("commentaire-list"),
            {"formation": self.formation.id, "contenu": "Commentaire recrutement", "saturation": 75},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
