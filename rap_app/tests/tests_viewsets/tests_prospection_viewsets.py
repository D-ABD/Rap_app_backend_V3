# Tests corrigés pour correspondre aux ViewSets nettoyés et à la pagination enrichie
import pytest
from datetime import timedelta

from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from ...api.serializers.prospection_serializers import ProspectionSerializer
from ...models.candidat import Candidat
from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ...models.formations import Formation
from ...models.logs import LogUtilisateur
from ...models.partenaires import Partenaire
from ...models.prospection import Prospection, ProspectionChoices
from ...models.statut import Statut
from ...models.types_offre import TypeOffre
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class ProspectionViewSetTestCase(AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.centre = Centre.objects.create(nom="Centre X", code_postal="75000")
        self.statut = Statut.objects.create(nom="non_defini", couleur="#000000")
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

        self.partenaire = Partenaire.objects.create(nom="Partenaire Y", type="entreprise", created_by=self.user)

        self.valid_data = {
            "partenaire": self.partenaire.id,
            "formation": self.formation.id,
            "date_prospection": timezone.now().isoformat(),
            "type_prospection": ProspectionChoices.TYPE_PREMIER_CONTACT,
            "motif": ProspectionChoices.MOTIF_PARTENARIAT,
            "statut": ProspectionChoices.STATUT_A_FAIRE,
            "objectif": ProspectionChoices.OBJECTIF_PRESENTATION,
            "commentaire": "Premier contact",
        }

        self.prospection = Prospection.objects.create(
            partenaire=self.partenaire,
            formation=self.formation,
            date_prospection=timezone.now(),
            type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
            motif=ProspectionChoices.MOTIF_PARTENARIAT,
            statut=ProspectionChoices.STATUT_EN_COURS,
            objectif=ProspectionChoices.OBJECTIF_PRESENTATION,
            commentaire="Initial",
            created_by=self.user,
        )

        self.list_url = reverse("prospection-list")

    def test_create_prospection(self):
        response = self.client.post(self.list_url, self.valid_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        obj_id = response.data.get("id") or response.data.get("data", {}).get("id")
        self.assertIsNotNone(obj_id)

        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(Prospection),
            object_id=obj_id,
            action=LogUtilisateur.ACTION_CREATE,
            created_by=self.user,
        )
        self.assertTrue(log.exists(), "Log de création manquant")

    def test_list_prospections(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        data = response.data.get("data", {}).get("results", [])
        self.assertIsInstance(data, list)

        ids = [p.get("id") for p in data if isinstance(p, dict)]
        self.assertIn(self.prospection.id, ids)

    def test_changer_statut(self):
        url = reverse("prospection-changer-statut", args=[self.prospection.id])
        from datetime import timedelta

        from django.utils import timezone as tz

        payload = {
            "statut": ProspectionChoices.STATUT_A_RELANCER,
            "relance_prevue": (tz.now().date() + timedelta(days=7)).isoformat(),
        }
        response = self.client.post(url, data=payload, format="json")
        self.assertEqual(response.status_code, 200)
        data = response.data.get("data", response.data)
        self.assertEqual(data.get("statut"), ProspectionChoices.STATUT_A_RELANCER)

    def test_delete_prospection_definitive(self):
        prospection = Prospection.objects.create(
            partenaire=self.partenaire,
            formation=self.formation,
            date_prospection=timezone.now(),
            type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
            motif=ProspectionChoices.MOTIF_PARTENARIAT,
            statut=ProspectionChoices.STATUT_EN_COURS,
            objectif=ProspectionChoices.OBJECTIF_PRESENTATION,
            commentaire="Suppression test",
            created_by=self.user,
        )
        url = reverse("prospection-detail", args=[prospection.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Prospection.objects.filter(pk=prospection.id).exists())

    def test_serializer_accepts_null_formation(self):
        data = self.valid_data.copy()
        data["formation"] = None
        serializer = ProspectionSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_serializer_rejects_future_date(self):
        data = self.valid_data.copy()
        data["date_prospection"] = (timezone.now() + timedelta(days=1)).isoformat()
        serializer = ProspectionSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("date_prospection", serializer.errors)

    def test_valid_update(self):
        serializer = ProspectionSerializer(instance=self.prospection, data={"commentaire": "Mise à jour"}, partial=True)
        self.assertTrue(serializer.is_valid())
        updated = serializer.save()
        self.assertEqual(updated.commentaire, "Mise à jour")


@pytest.mark.django_db
def test_candidate_create_prospection_infers_owner_formation_and_centre():
    client = APIClient()

    centre = Centre.objects.create(nom="Centre Candidate Prospection", code_postal="75999")
    statut = Statut.objects.create(nom="non_defini", couleur="#000000")
    type_offre = TypeOffre.objects.create(nom="poec", couleur="#FF0000")
    formation = Formation.objects.create(
        nom="Formation Candidate Prospection",
        centre=centre,
        statut=statut,
        type_offre=type_offre,
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timedelta(days=5),
    )
    partenaire = Partenaire.objects.create(nom="Partenaire Candidate", type="entreprise")

    candidate_user = CustomUser.objects.create_user_with_role(
        email="candidate-prosp@example.com",
        username="candidate_prosp",
        password="password123",
        role=CustomUser.ROLE_CANDIDAT,
    )
    Candidat.objects.create(
        nom="Candidate",
        prenom="Prospection",
        email="candidate-prosp@example.com",
        formation=formation,
        compte_utilisateur=candidate_user,
    )

    client.force_authenticate(user=candidate_user)

    response = client.post(
        reverse("prospection-list"),
        data={
            "partenaire": partenaire.id,
            "date_prospection": timezone.now().isoformat(),
            "type_prospection": ProspectionChoices.TYPE_PREMIER_CONTACT,
            "motif": ProspectionChoices.MOTIF_PARTENARIAT,
            "statut": ProspectionChoices.STATUT_EN_COURS,
            "objectif": ProspectionChoices.OBJECTIF_PRESENTATION,
            "commentaire": "Création candidat sans formation payload",
        },
        format="json",
    )

    assert response.status_code == 201
    prospection_id = response.data["data"]["id"]
    prospection = Prospection.objects.get(pk=prospection_id)

    assert prospection.owner_id == candidate_user.id
    assert prospection.formation_id == formation.id
    assert prospection.centre_id == centre.id

# HistoriqueProspection n'est plus exposé comme endpoint API list/detail.
# Les anciens tests API associés ont été retirés de la suite active pour éviter
# des skips permanents ; la couverture utile passe désormais par les tests
# modèle/service autour de Prospection et de son historique.
