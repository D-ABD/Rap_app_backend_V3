# tests/test_partenaire_viewsets.py

"""Tests relatifs a partenaires viewsets."""
import unittest

from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from ...models.candidat import Candidat
from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ...models.formations import Formation
from ...models.logs import LogUtilisateur
from ...models.partenaires import Partenaire
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class PartenaireViewSetTestCase(AuthenticatedTestCase):
    """Cas de test pour Partenaire View Set Test Case."""
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.centre = Centre.objects.create(nom="Centre Test", code_postal="75000")
        self.client.force_authenticate(user=self.user)
        self.list_url = reverse("partenaire-list")
        self.valid_data = {
            "nom": "ACME Corp",
            "type": "entreprise",
            "secteur_activite": "Informatique",
            "zip_code": "75001",
            "city": "Paris",
            "contact_nom": "Jean Dupont",
            "contact_email": "jean.dupont@acme.fr",
            "contact_telephone": "0601020303",
            "website": "https://acme.fr",
        }
        self.valid_data["default_centre_id"] = self.centre.id

    def test_create_partenaire(self):
        response = self.client.post(self.list_url, self.valid_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Partenaire créé avec succès.")
        self.assertEqual(response.data["data"]["nom"].lower(), self.valid_data["nom"].lower())

        partenaire_id = response.data["data"]["id"]
        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(Partenaire),
            object_id=partenaire_id,
            action__icontains="création",
            created_by=self.user,
        )
        self.assertTrue(log.exists(), "Log de création manquant.")

    def test_list_partenaires(self):
        Partenaire.objects.create(**self.valid_data, created_by=self.user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertGreaterEqual(len(response.data["data"]["results"]), 1)

    def test_retrieve_partenaire(self):
        partenaire = Partenaire.objects.create(**self.valid_data, created_by=self.user)
        url = reverse("partenaire-detail", args=[partenaire.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Partenaire récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], partenaire.id)

    def test_update_partenaire(self):
        partenaire = Partenaire.objects.create(**self.valid_data, created_by=self.user)
        url = reverse("partenaire-detail", args=[partenaire.id])
        patch = {"city": "Lyon"}
        response = self.client.patch(url, patch)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Partenaire mis à jour avec succès.")
        self.assertEqual(response.data["data"]["city"], "Lyon")

        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(Partenaire),
            object_id=partenaire.id,
            action__icontains="modification",
            created_by=self.user,
        )
        self.assertTrue(log.exists(), "Log de modification manquant.")

    def test_delete_partenaire(self):
        partenaire = Partenaire.objects.create(**self.valid_data, created_by=self.user)
        url = reverse("partenaire-detail", args=[partenaire.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Partenaire archivé avec succès.")

        partenaire.refresh_from_db()
        self.assertFalse(partenaire.is_active)

        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(Partenaire),
            object_id=partenaire.id,
            action__icontains="suppression",
            created_by=self.user,
        )
        self.assertTrue(log.exists(), "Log de suppression manquant.")

    def test_list_can_include_archived_partenaire(self):
        archived = Partenaire.objects.create(
            nom="ACME Archive",
            type="entreprise",
            default_centre=self.centre,
            is_active=False,
            created_by=self.user,
        )

        response = self.client.get(self.list_url, {"avec_archivees": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [item["id"] for item in response.data["data"]["results"]]
        self.assertIn(archived.id, returned_ids)

    def test_desarchiver_partenaire(self):
        partenaire = Partenaire.objects.create(**self.valid_data, is_active=False, created_by=self.user)

        response = self.client.post(reverse("partenaire-desarchiver", args=[partenaire.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Partenaire désarchivé avec succès.")

        partenaire.refresh_from_db()
        self.assertTrue(partenaire.is_active)

    def test_non_owner_non_staff_cannot_update_partenaire(self):
        """
        ❌ Un utilisateur non staff et non propriétaire ne doit pas pouvoir modifier (403 ou 404).
        """
        partenaire = Partenaire.objects.create(**self.valid_data, created_by=self.user)

        autre_user = CustomUser.objects.create_user(
            email="nonstaff@example.com", username="other", password="OtherPass123", role="stagiaire", is_staff=False
        )
        refresh = RefreshToken.for_user(autre_user)
        # Le setUp force déjà un admin sur le client ; on le retire avant de tester le JWT réel.
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

        url = reverse("partenaire-detail", args=[partenaire.id])
        response = self.client.patch(url, {"city": "Lyon"})

        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND),
            "Un non-propriétaire non-staff ne doit pas pouvoir modifier ce partenaire (403 ou 404).",
        )

    def test_non_owner_can_update_if_last_updated_by_them_doublon_reuse(self):
        """
        Après réutilisation d’une fiche (doublon), le candidat est updated_by : PATCH autorisé.
        """
        reuser = CustomUser.objects.create_user(
            email="reuser@example.com", username="reuser", password="ReuserPass123", role="stagiaire", is_staff=False
        )
        partenaire = Partenaire.objects.create(**self.valid_data, created_by=self.user, updated_by=reuser)

        refresh = RefreshToken.for_user(reuser)
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

        url = reverse("partenaire-detail", args=[partenaire.id])
        response = self.client.patch(url, {"city": "Bordeaux"})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["city"], "Bordeaux")

    def test_owner_can_update_partenaire(self):
        """
        ✅ Le propriétaire peut modifier son partenaire
        """
        partenaire = Partenaire.objects.create(**self.valid_data, created_by=self.user)

        url = reverse("partenaire-detail", args=[partenaire.id])
        response = self.client.patch(url, {"city": "Lyon"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["city"], "Lyon")

    def test_stagiaire_cannot_create_partenaire(self):
        """Sans formation / centre (user.centre vide) : 403, inchangé."""
        self.client.force_authenticate(user=UserFactory(role=CustomUser.ROLE_STAGIAIRE))

        response = self.client.post(self.list_url, self.valid_data)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_stagiaire_with_formation_can_create_partenaire(self):
        """Stagiaire rattaché à une formation (user.centre via candidat) : création autorisée."""
        formation = Formation.objects.create(
            nom="Formation partenaire création",
            centre=self.centre,
            prevus_crif=5,
            prevus_mp=5,
        )
        stagiaire = UserFactory(
            role=CustomUser.ROLE_STAGIAIRE,
            email="stagiaire_avec_formation@example.com",
            username="stagiaire_avec_formation",
        )
        Candidat.objects.create(
            nom="Pro",
            prenom="Fesseur",
            email=stagiaire.email,
            formation=formation,
            compte_utilisateur=stagiaire,
            created_by=self.user,
            updated_by=self.user,
        )
        self.client.force_authenticate(user=stagiaire)

        response = self.client.post(self.list_url, self.valid_data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["default_centre"]["id"], self.centre.id)

    def test_stagiaire_sees_partenaire_in_list_after_duplicate_reuse(self):
        """
        Réutilisation d’un partenaire existant : updated_by doit être le candidat
        (requête DRF, pas seulement le thread local) pour qu’il apparaisse en liste.
        """
        formation = Formation.objects.create(
            nom="Formation doublon visibilité",
            centre=self.centre,
            prevus_crif=5,
            prevus_mp=5,
        )
        stagiaire = UserFactory(
            role=CustomUser.ROLE_STAGIAIRE,
            email="stagiaire_doublon_liste@example.com",
            username="stagiaire_doublon_liste",
        )
        Candidat.objects.create(
            nom="Test",
            prenom="Visibilite",
            email=stagiaire.email,
            formation=formation,
            compte_utilisateur=stagiaire,
            created_by=self.user,
            updated_by=self.user,
        )
        data_dup = {**self.valid_data, "nom": "Bureau Reuse Visibilite"}
        existing = Partenaire.objects.create(**data_dup, created_by=self.user)

        self.client.force_authenticate(user=stagiaire)
        payload = {**self.valid_data, "nom": "bureau reuse visibilite"}
        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["data"]["id"], existing.id)

        existing.refresh_from_db()
        self.assertEqual(existing.updated_by_id, stagiaire.id)

        list_resp = self.client.get(self.list_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        returned_ids = [item["id"] for item in list_resp.data["data"]["results"]]
        self.assertIn(existing.id, returned_ids)

    def test_deuxieme_stagiaire_voit_aussi_fiche_saisi_par_un_autre(self):
        """
        Même fiche (doublon) : plusieurs saisi_par → chaque candidat la voit en liste.
        """
        formation = Formation.objects.create(
            nom="Formation multi saisi",
            centre=self.centre,
            prevus_crif=5,
            prevus_mp=5,
        )
        s1 = UserFactory(
            role=CustomUser.ROLE_STAGIAIRE,
            email="multi_s1@example.com",
            username="multi_s1",
        )
        s2 = UserFactory(
            role=CustomUser.ROLE_STAGIAIRE,
            email="multi_s2@example.com",
            username="multi_s2",
        )
        for u in (s1, s2):
            Candidat.objects.create(
                nom="M",
                prenom=u.username,
                email=u.email,
                formation=formation,
                compte_utilisateur=u,
                created_by=self.user,
                updated_by=self.user,
            )
        data_shared = {**self.valid_data, "nom": "Entreprise Multi Saisi SA"}
        existing = Partenaire.objects.create(**data_shared, created_by=self.user)

        payload = {**self.valid_data, "nom": "entreprise multi saisi sa"}
        self.client.force_authenticate(user=s1)
        r1 = self.client.post(self.list_url, payload)
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED, r1.data)
        self.assertEqual(r1.data["data"]["id"], existing.id)

        self.client.force_authenticate(user=s2)
        r2 = self.client.post(self.list_url, payload)
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED, r2.data)
        self.assertEqual(r2.data["data"]["id"], existing.id)

        existing.refresh_from_db()
        self.assertTrue(existing.saisi_par.filter(id=s1.id).exists())
        self.assertTrue(existing.saisi_par.filter(id=s2.id).exists())

        for u in (s1, s2):
            self.client.force_authenticate(user=u)
            lr = self.client.get(self.list_url)
            self.assertEqual(lr.status_code, status.HTTP_200_OK)
            ids_ = [item["id"] for item in lr.data["data"]["results"]]
            self.assertIn(existing.id, ids_)

    def test_co_saisi_delete_retire_suelement_son_vue(self):
        """
        Un co-candidat (saisi) qui « supprime » ne désactive pas la fiche globalement :
        les autres saisis la voient encore.
        """
        formation = Formation.objects.create(
            nom="Formation retrait perso",
            centre=self.centre,
            prevus_crif=5,
            prevus_mp=5,
        )
        s1 = UserFactory(
            role=CustomUser.ROLE_STAGIAIRE,
            email="retrait_s1@example.com",
            username="retrait_s1",
        )
        s2 = UserFactory(
            role=CustomUser.ROLE_STAGIAIRE,
            email="retrait_s2@example.com",
            username="retrait_s2",
        )
        for u in (s1, s2):
            Candidat.objects.create(
                nom="R",
                prenom="T",
                email=u.email,
                formation=formation,
                compte_utilisateur=u,
                created_by=self.user,
                updated_by=self.user,
            )
        data_shared = {**self.valid_data, "nom": "Entreprise Retrait Perso SARL"}
        existing = Partenaire.objects.create(**data_shared, created_by=self.user)
        pl = {**self.valid_data, "nom": "entreprise retrait perso sarl"}
        for u in (s1, s2):
            self.client.force_authenticate(user=u)
            r = self.client.post(self.list_url, pl)
            self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)

        url = reverse("partenaire-detail", args=[existing.id])
        self.client.force_authenticate(user=s1)
        del_resp = self.client.delete(url)
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK, del_resp.data)
        self.assertIn("votre liste", del_resp.data["message"].lower())
        self.assertTrue(existing.saisi_par.filter(id=s1.id).exists())
        self.assertTrue(existing.saisi_par.filter(id=s2.id).exists())
        self.assertTrue(Partenaire.objects.get(pk=existing.id).is_active)

        lr1 = self.client.get(self.list_url)
        ids1 = [item["id"] for item in lr1.data["data"]["results"]]
        self.assertNotIn(existing.id, ids1)

        self.client.force_authenticate(user=s2)
        lr2 = self.client.get(self.list_url)
        ids2 = [item["id"] for item in lr2.data["data"]["results"]]
        self.assertIn(existing.id, ids2)

        re_url = reverse("partenaire-reafficher-dans-ma-liste", args=[existing.id])
        self.client.force_authenticate(user=s2)
        re_s2 = self.client.post(re_url)
        self.assertEqual(re_s2.status_code, status.HTTP_200_OK, re_s2.data)
        self.assertIn("déjà", re_s2.data["message"].lower())

        self.client.force_authenticate(user=s1)
        re_self = self.client.post(reverse("partenaire-reafficher-dans-ma-liste", args=[existing.id]))
        self.assertEqual(re_self.status_code, status.HTTP_200_OK, re_self.data)
        lr1b = self.client.get(self.list_url)
        self.assertIn(existing.id, [item["id"] for item in lr1b.data["data"]["results"]])

    def test_staff_read_cannot_create_partenaire(self):
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        staff_read.centres.add(self.centre)
        self.client.force_authenticate(user=staff_read)

        response = self.client.post(self.list_url, self.valid_data)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_read_can_read_but_cannot_update_partenaire(self):
        partenaire = Partenaire.objects.create(**self.valid_data, created_by=self.user)
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        staff_read.centres.add(self.centre)
        self.client.force_authenticate(user=staff_read)

        detail_url = reverse("partenaire-detail", args=[partenaire.id])

        response_get = self.client.get(detail_url)
        self.assertEqual(response_get.status_code, status.HTTP_200_OK)

        response_patch = self.client.patch(detail_url, {"city": "Lyon"})
        self.assertEqual(response_patch.status_code, status.HTTP_403_FORBIDDEN)

    def test_commercial_can_create_partenaire_in_centre_scope(self):
        commercial = UserFactory(role=CustomUser.ROLE_COMMERCIAL)
        commercial.centres.add(self.centre)
        self.client.force_authenticate(user=commercial)

        response = self.client.post(self.list_url, self.valid_data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["default_centre"]["id"], self.centre.id)

    def test_charge_recrutement_can_see_in_scope_but_not_outside_scope(self):
        partenaire_visible = Partenaire.objects.create(**self.valid_data, created_by=self.user)

        autre_centre = Centre.objects.create(nom="Autre Centre", code_postal="78000")
        partenaire_cache = Partenaire.objects.create(
            nom="Partenaire Hors Scope",
            type="entreprise",
            default_centre=autre_centre,
            created_by=self.user,
        )

        charge = UserFactory(role=CustomUser.ROLE_CHARGE_RECRUTEMENT)
        charge.centres.add(self.centre)
        self.client.force_authenticate(user=charge)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        returned_ids = [item["id"] for item in response.data["data"]["results"]]
        self.assertIn(partenaire_visible.id, returned_ids)
        self.assertNotIn(partenaire_cache.id, returned_ids)
