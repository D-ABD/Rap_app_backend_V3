# Tests corrigés pour correspondre aux ViewSets nettoyés et à la pagination enrichie
"""Tests relatifs a prospection viewsets."""
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


def _mark_rgpd_ok(user: CustomUser) -> None:
    """Déverrouille l'API pr les tests côté rôle candidat (gate RGPD en prod)."""
    user.consent_rgpd = True
    user.consent_date = timezone.now()
    user.save(update_fields=["consent_rgpd", "consent_date"])


class ProspectionViewSetTestCase(AuthenticatedTestCase):
    """Cas de test pour Prospection View Set Test Case."""
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

    def test_delete_prospection_archive_logiquement(self):
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
        prospection.refresh_from_db()
        self.assertEqual(prospection.activite, Prospection.ACTIVITE_ARCHIVEE)

    def test_delete_prospection_archive_and_hides_from_default_list(self):
        url = reverse("prospection-detail", args=[self.prospection.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        list_response = self.client.get(self.list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        data = list_response.data.get("data", {}).get("results", [])
        ids = [p.get("id") for p in data if isinstance(p, dict)]
        self.assertNotIn(self.prospection.id, ids)

    def test_list_prospections_can_include_archived_items(self):
        self.prospection.archiver(user=self.user)

        response = self.client.get(self.list_url, {"avec_archivees": "true"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data.get("data", {}).get("results", [])
        ids = [p.get("id") for p in data if isinstance(p, dict)]
        self.assertIn(self.prospection.id, ids)

    def test_list_prospections_can_show_archived_only(self):
        self.prospection.archiver(user=self.user)

        active = Prospection.objects.create(
            partenaire=self.partenaire,
            formation=self.formation,
            date_prospection=timezone.now(),
            type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
            motif=ProspectionChoices.MOTIF_PARTENARIAT,
            statut=ProspectionChoices.STATUT_EN_COURS,
            objectif=ProspectionChoices.OBJECTIF_PRESENTATION,
            commentaire="Active item",
            created_by=self.user,
        )

        response = self.client.get(self.list_url, {"activite": Prospection.ACTIVITE_ARCHIVEE})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data.get("data", {}).get("results", [])
        ids = [p.get("id") for p in data if isinstance(p, dict)]
        self.assertIn(self.prospection.id, ids)
        self.assertNotIn(active.id, ids)

    def test_archiver_puis_desarchiver_prospection(self):
        archive_response = self.client.post(reverse("prospection-archiver", args=[self.prospection.id]))
        self.assertEqual(archive_response.status_code, status.HTTP_200_OK)

        self.prospection.refresh_from_db()
        self.assertEqual(self.prospection.activite, Prospection.ACTIVITE_ARCHIVEE)

        restore_response = self.client.post(reverse("prospection-desarchiver", args=[self.prospection.id]))
        self.assertEqual(restore_response.status_code, status.HTTP_200_OK)

        self.prospection.refresh_from_db()
        self.assertEqual(self.prospection.activite, Prospection.ACTIVITE_ACTIVE)

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
    """Teste que Candidate create prospection infers owner formation and centre."""
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
    _mark_rgpd_ok(candidate_user)

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


@pytest.mark.django_db
def test_candidate_cannot_change_prospection_owner_or_formation_on_update():
    """Teste que Candidate cannot change prospection owner or formation on update."""
    client = APIClient()

    centre = Centre.objects.create(nom="Centre Candidate Update", code_postal="75888")
    statut = Statut.objects.create(nom="non_defini", couleur="#000000")
    type_offre = TypeOffre.objects.create(nom="poec", couleur="#FF0000")
    formation_a = Formation.objects.create(
        nom="Formation Candidate Update A",
        centre=centre,
        statut=statut,
        type_offre=type_offre,
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timedelta(days=5),
    )
    formation_b = Formation.objects.create(
        nom="Formation Candidate Update B",
        centre=centre,
        statut=statut,
        type_offre=type_offre,
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timedelta(days=7),
    )
    partenaire = Partenaire.objects.create(nom="Partenaire Candidate Update", type="entreprise")

    candidate_user = CustomUser.objects.create_user_with_role(
        email="candidate-update@example.com",
        username="candidate_update",
        password="password123",
        role=CustomUser.ROLE_CANDIDAT,
    )
    other_user = CustomUser.objects.create_user_with_role(
        email="other-owner@example.com",
        username="other_owner",
        password="password123",
        role=CustomUser.ROLE_STAFF,
    )
    Candidat.objects.create(
        nom="Candidate",
        prenom="Update",
        email="candidate-update@example.com",
        formation=formation_a,
        compte_utilisateur=candidate_user,
    )
    _mark_rgpd_ok(candidate_user)

    prospection = Prospection.objects.create(
        partenaire=partenaire,
        formation=formation_a,
        centre=centre,
        owner=candidate_user,
        created_by=candidate_user,
        date_prospection=timezone.now(),
        type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
        motif=ProspectionChoices.MOTIF_PARTENARIAT,
        statut=ProspectionChoices.STATUT_EN_COURS,
        objectif=ProspectionChoices.OBJECTIF_PRESENTATION,
        commentaire="Prospection candidat",
    )

    client.force_authenticate(user=candidate_user)

    response = client.patch(
        reverse("prospection-detail", args=[prospection.id]),
        data={"owner": other_user.id, "formation": formation_b.id},
        format="json",
    )

    assert response.status_code == 403
    prospection.refresh_from_db()
    assert prospection.owner_id == candidate_user.id
    assert prospection.formation_id == formation_a.id


@pytest.mark.django_db
def test_staff_create_prospection_with_candidate_owner_uses_owner_formation():
    """Teste que Staff create prospection with candidate owner uses owner formation."""
    client = APIClient()

    centre_a = Centre.objects.create(nom="Centre Staff Owner A", code_postal="75111")
    centre_b = Centre.objects.create(nom="Centre Staff Owner B", code_postal="75222")
    statut = Statut.objects.create(nom="non_defini", couleur="#000000")
    type_offre = TypeOffre.objects.create(nom="poec", couleur="#FF0000")
    formation_owner = Formation.objects.create(
        nom="Formation Owner",
        centre=centre_a,
        statut=statut,
        type_offre=type_offre,
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timedelta(days=5),
    )
    formation_payload = Formation.objects.create(
        nom="Formation Payload",
        centre=centre_b,
        statut=statut,
        type_offre=type_offre,
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timedelta(days=6),
    )
    partenaire = Partenaire.objects.create(nom="Partenaire Staff Owner", type="entreprise")

    staff = CustomUser.objects.create_user_with_role(
        email="staff-owner@example.com",
        username="staff_owner",
        password="password123",
        role=CustomUser.ROLE_ADMIN,
    )
    candidate_user = CustomUser.objects.create_user_with_role(
        email="candidate-owner@example.com",
        username="candidate_owner",
        password="password123",
        role=CustomUser.ROLE_CANDIDAT,
    )
    Candidat.objects.create(
        nom="Candidate",
        prenom="Owner",
        email="candidate-owner@example.com",
        formation=formation_owner,
        compte_utilisateur=candidate_user,
    )
    _mark_rgpd_ok(candidate_user)

    client.force_authenticate(user=staff)

    response = client.post(
        reverse("prospection-list"),
        data={
            "owner": candidate_user.id,
            "formation": formation_payload.id,
            "partenaire": partenaire.id,
            "date_prospection": timezone.now().isoformat(),
            "type_prospection": ProspectionChoices.TYPE_PREMIER_CONTACT,
            "motif": ProspectionChoices.MOTIF_PARTENARIAT,
            "statut": ProspectionChoices.STATUT_EN_COURS,
            "objectif": ProspectionChoices.OBJECTIF_PRESENTATION,
            "commentaire": "Prospection staff avec owner candidat",
        },
        format="json",
    )

    assert response.status_code == 201
    prospection_id = response.data["data"]["id"]
    prospection = Prospection.objects.get(pk=prospection_id)

    assert prospection.owner_id == candidate_user.id
    assert prospection.formation_id == formation_owner.id
    assert prospection.centre_id == centre_a.id


@pytest.mark.django_db
def test_commercial_can_list_and_create_prospection_in_scope():
    """Teste que Commercial can list and create prospection in scope."""
    client = APIClient()

    centre = Centre.objects.create(nom="Centre Commercial", code_postal="92000")
    statut = Statut.objects.create(nom="non_defini", couleur="#000000")
    type_offre = TypeOffre.objects.create(nom="poec", couleur="#FF0000")
    formation = Formation.objects.create(
        nom="Formation Commerciale",
        centre=centre,
        statut=statut,
        type_offre=type_offre,
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timedelta(days=5),
    )
    commercial = UserFactory(role=CustomUser.ROLE_COMMERCIAL)
    commercial.centres.add(centre)
    partenaire = Partenaire.objects.create(
        nom="Partenaire Commercial",
        type="entreprise",
        default_centre=centre,
        created_by=commercial,
    )
    Prospection.objects.create(
        partenaire=partenaire,
        formation=formation,
        date_prospection=timezone.now(),
        type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
        motif=ProspectionChoices.MOTIF_PARTENARIAT,
        statut=ProspectionChoices.STATUT_EN_COURS,
        objectif=ProspectionChoices.OBJECTIF_PRESENTATION,
        commentaire="Visible",
        created_by=commercial,
        owner=commercial,
        centre_id=centre.id,
    )

    client.force_authenticate(user=commercial)

    list_response = client.get(reverse("prospection-list"))
    assert list_response.status_code == 200
    assert list_response.data["data"]["count"] == 1

    create_response = client.post(
        reverse("prospection-list"),
        data={
            "partenaire": partenaire.id,
            "formation": formation.id,
            "date_prospection": timezone.now().isoformat(),
            "type_prospection": ProspectionChoices.TYPE_PREMIER_CONTACT,
            "motif": ProspectionChoices.MOTIF_PARTENARIAT,
            "statut": ProspectionChoices.STATUT_A_FAIRE,
            "objectif": ProspectionChoices.OBJECTIF_PRESENTATION,
            "commentaire": "Création commercial",
        },
        format="json",
    )
    assert create_response.status_code == 201


@pytest.mark.django_db
def test_charge_recrutement_cannot_create_prospection_outside_centre_scope():
    """Teste que Charge recrutement cannot create prospection outside centre scope."""
    client = APIClient()

    centre_a = Centre.objects.create(nom="Centre A", code_postal="92100")
    centre_b = Centre.objects.create(nom="Centre B", code_postal="92200")
    statut = Statut.objects.create(nom="non_defini", couleur="#000000")
    type_offre = TypeOffre.objects.create(nom="poec", couleur="#FF0000")
    formation_b = Formation.objects.create(
        nom="Formation Hors Scope",
        centre=centre_b,
        statut=statut,
        type_offre=type_offre,
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timedelta(days=5),
    )
    partenaire = Partenaire.objects.create(
        nom="Partenaire Hors Scope Prospection",
        type="entreprise",
        default_centre=centre_b,
    )
    user = UserFactory(role=CustomUser.ROLE_CHARGE_RECRUTEMENT)
    user.centres.add(centre_a)

    client.force_authenticate(user=user)

    response = client.post(
        reverse("prospection-list"),
        data={
            "partenaire": partenaire.id,
            "formation": formation_b.id,
            "date_prospection": timezone.now().isoformat(),
            "type_prospection": ProspectionChoices.TYPE_PREMIER_CONTACT,
            "motif": ProspectionChoices.MOTIF_PARTENARIAT,
            "statut": ProspectionChoices.STATUT_A_FAIRE,
            "objectif": ProspectionChoices.OBJECTIF_PRESENTATION,
            "commentaire": "Création hors scope",
        },
        format="json",
    )
    assert response.status_code == 403

# HistoriqueProspection n'est plus exposé comme endpoint API list/detail.
# Les anciens tests API associés ont été retirés de la suite active pour éviter
# des skips permanents ; la couverture utile passe désormais par les tests
# modèle/service autour de Prospection et de son historique.
