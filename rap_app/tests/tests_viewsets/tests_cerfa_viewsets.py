from django.urls import reverse
from rest_framework import status

from ...models.candidat import Candidat
from ...models.centres import Centre
from ...models.cerfa_contrats import CerfaContrat
from ...models.custom_user import CustomUser
from ...models.formations import Formation
from ...models.statut import Statut
from ...models.types_offre import TypeOffre
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class CerfaContratViewSetTestCase(AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.list_url = reverse("cerfa-contrat-list")
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI, couleur="#111111")

    def test_delete_cerfa_archives_instance(self):
        contrat = CerfaContrat.objects.create(
            apprenti_nom_naissance="Durand",
            apprenti_prenom="Alice",
            employeur_nom="Entreprise Test",
        )

        response = self.client.delete(reverse("cerfa-contrat-detail", args=[contrat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contrat.refresh_from_db()
        self.assertFalse(contrat.is_active)

    def test_list_excludes_archived_cerfa(self):
        archived = CerfaContrat.objects.create(
            apprenti_nom_naissance="Archive",
            apprenti_prenom="Cerfa",
            employeur_nom="Entreprise Archive",
            is_active=False,
        )
        visible = CerfaContrat.objects.create(
            apprenti_nom_naissance="Visible",
            apprenti_prenom="Cerfa",
            employeur_nom="Entreprise Visible",
        )

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data", response.data)
        results = data.get("results", [])
        returned_ids = [item["id"] for item in results]
        self.assertIn(visible.id, returned_ids)
        self.assertNotIn(archived.id, returned_ids)

    def test_commercial_list_is_scoped_to_assigned_centres(self):
        centre_visible = Centre.objects.create(nom="Centre Visible", code_postal="92000")
        centre_cache = Centre.objects.create(nom="Centre Cache", code_postal="78000")

        formation_visible = Formation.objects.create(
            nom="Formation Visible",
            centre=centre_visible,
            type_offre=self.type_offre,
            statut=self.statut,
        )
        formation_cache = Formation.objects.create(
            nom="Formation Cachee",
            centre=centre_cache,
            type_offre=self.type_offre,
            statut=self.statut,
        )

        CerfaContrat.objects.create(
            apprenti_nom_naissance="Visible",
            apprenti_prenom="Alice",
            employeur_nom="Entreprise Visible",
            formation=formation_visible,
        )
        hidden = CerfaContrat.objects.create(
            apprenti_nom_naissance="Cache",
            apprenti_prenom="Bob",
            employeur_nom="Entreprise Cachee",
            formation=formation_cache,
        )

        commercial = UserFactory(role=CustomUser.ROLE_COMMERCIAL)
        commercial.centres.add(centre_visible)
        self.client.force_authenticate(user=commercial)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data.get("data", response.data)
        returned_ids = [item["id"] for item in data.get("results", [])]
        self.assertNotIn(hidden.id, returned_ids)

    def test_charge_recrutement_cannot_create_cerfa_outside_scope(self):
        centre_autorise = Centre.objects.create(nom="Centre Autorise", code_postal="92000")
        centre_hors_scope = Centre.objects.create(nom="Centre Hors Scope", code_postal="78000")
        formation = Formation.objects.create(
            nom="Formation Hors Scope",
            centre=centre_hors_scope,
            type_offre=self.type_offre,
            statut=self.statut,
        )
        candidat = Candidat.objects.create(
            nom="Durand",
            prenom="Lea",
            formation=formation,
        )

        charge = UserFactory(role=CustomUser.ROLE_CHARGE_RECRUTEMENT)
        charge.centres.add(centre_autorise)
        self.client.force_authenticate(user=charge)

        response = self.client.post(
            self.list_url,
            {
                "candidat": candidat.id,
                "formation": formation.id,
                "apprenti_nom_naissance": "Durand",
                "apprenti_prenom": "Lea",
                "employeur_nom": "Entreprise Hors Scope",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
