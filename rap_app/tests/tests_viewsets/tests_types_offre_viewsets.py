# tests/test_typeoffre_viewsets.py

from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework import status

from ...models.custom_user import CustomUser
from ...models.logs import LogUtilisateur
from ...models.types_offre import TypeOffre
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class TypeOffreViewSetTestCase(AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.admin = self.user  # alias pour les tests qui utilisent created_by=self.admin
        self.list_url = reverse("typeoffre-list")

    def test_create_typeoffre_standard(self):
        data = {"nom": "crif", "autre": "", "couleur": "#4e73df"}
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])

        # Vérification du log
        obj_id = response.data["data"]["id"]
        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(TypeOffre),
            object_id=obj_id,
            action__icontains="création",
            created_by=self.admin,
        )
        self.assertTrue(log.exists())

    def test_create_typeoffre_personnalise(self):
        data = {"nom": "autre", "autre": "Formation spéciale", "couleur": "#20c997"}
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["autre"], "Formation spéciale")

    def test_list_typeoffres(self):
        TypeOffre.objects.create(nom="crif", couleur="#4e73df")
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Liste des types d'offres récupérée avec succès.")
        self.assertIn("results", response.data["data"])
        self.assertTrue(response.data["success"])

    def test_retrieve_typeoffre_uses_standard_envelope(self):
        instance = TypeOffre.objects.create(nom="crif", couleur="#4e73df")
        response = self.client.get(reverse("typeoffre-detail", args=[instance.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Type d'offre récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], instance.id)

    def test_update_typeoffre(self):
        instance = TypeOffre.objects.create(nom="crif", couleur="#4e73df")
        url = reverse("typeoffre-detail", args=[instance.id])
        payload = {"nom": "crif", "couleur": "#4e73df"}
        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["couleur"], "#4e73df")

        # Vérification du log
        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(TypeOffre),
            object_id=instance.id,
            action__icontains="modification",
            created_by=self.admin,
        )
        self.assertTrue(log.exists())

    def test_delete_typeoffre(self):
        instance = TypeOffre.objects.create(nom="crif", couleur="#4e73df")
        pk = instance.id
        url = reverse("typeoffre-detail", args=[pk])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        instance.refresh_from_db()
        self.assertFalse(instance.is_active)

    def test_list_excludes_archived_typeoffres(self):
        archived = TypeOffre.objects.create(nom="crif", couleur="#4e73df", is_active=False)
        visible = TypeOffre.objects.create(nom="poec", couleur="#260a5b")

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]["results"]
        returned_ids = [item["id"] for item in results]
        self.assertIn(visible.id, returned_ids)
        self.assertNotIn(archived.id, returned_ids)

    def test_staff_read_cannot_create_typeoffre(self):
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        self.client.force_authenticate(user=staff_read)

        response = self.client.post(self.list_url, {"nom": "crif", "autre": "", "couleur": "#4e73df"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_read_cannot_update_typeoffre(self):
        instance = TypeOffre.objects.create(nom="crif", couleur="#4e73df")
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        self.client.force_authenticate(user=staff_read)

        response = self.client.patch(
            reverse("typeoffre-detail", args=[instance.id]),
            {"couleur": "#000000"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_read_cannot_delete_typeoffre(self):
        instance = TypeOffre.objects.create(nom="crif", couleur="#4e73df")
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        self.client.force_authenticate(user=staff_read)

        response = self.client.delete(reverse("typeoffre-detail", args=[instance.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
