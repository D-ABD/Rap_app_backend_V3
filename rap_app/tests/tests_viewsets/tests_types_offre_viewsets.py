# tests/test_typeoffre_viewsets.py

from rest_framework import status
from django.urls import reverse
from django.contrib.contenttypes.models import ContentType

from ...models.types_offre import TypeOffre
from ...models.logs import LogUtilisateur
from ..test_utils import AuthenticatedTestCase
from ..factories import UserFactory
from ...models.custom_user import CustomUser


class TypeOffreViewSetTestCase(AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.admin = self.user  # alias pour les tests qui utilisent created_by=self.admin
        self.list_url = reverse("typeoffre-list")

    def test_create_typeoffre_standard(self):
        data = {
            "nom": "crif",
            "autre": "",
            "couleur": "#4e73df"
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])

        # Vérification du log
        obj_id = response.data["data"]["id"]
        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(TypeOffre),
            object_id=obj_id,
            action__icontains="création",
            created_by=self.admin
        )
        self.assertTrue(log.exists())

    def test_create_typeoffre_personnalise(self):
        data = {
            "nom": "autre",
            "autre": "Formation spéciale",
            "couleur": "#20c997"
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["autre"], "Formation spéciale")

    def test_list_typeoffres(self):
        TypeOffre.objects.create(nom="crif", couleur="#4e73df")
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data["data"])
        self.assertTrue(response.data["success"])

    def test_update_typeoffre(self):
        instance = TypeOffre.objects.create(nom="crif", couleur="#4e73df")
        url = reverse("typeoffre-detail", args=[instance.id])
        payload = {
            "nom": "crif",
            "couleur": "#4e73df"
        }
        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["couleur"], "#4e73df")

        # Vérification du log
        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(TypeOffre),
            object_id=instance.id,
            action__icontains="modification",
            created_by=self.admin
        )
        self.assertTrue(log.exists())

    def test_delete_typeoffre(self):
        instance = TypeOffre.objects.create(nom="crif", couleur="#4e73df")
        pk = instance.id
        url = reverse("typeoffre-detail", args=[pk])
        response = self.client.delete(url)
        self.assertIn(response.status_code, (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT))
        self.assertFalse(TypeOffre.objects.filter(pk=pk).exists())
