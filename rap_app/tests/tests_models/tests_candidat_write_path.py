from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre
from rap_app.tests.factories import UserFactory


class CandidatWritePathTests(TestCase):
    def setUp(self):
        self.actor = UserFactory(role=CustomUser.ROLE_STAFF)
        self.centre = Centre.objects.create(nom="Centre Candidat Write Path", code_postal="75000")
        self.actor.centres.add(self.centre)
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI)
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Candidat Write Path",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today + timedelta(days=5),
            end_date=today + timedelta(days=30),
        )

    def test_save_refreshes_initial_snapshot_after_update(self):
        candidat = Candidat.objects.create(
            nom="Dupont",
            prenom="Jeanne",
            email="jeanne.snapshot@example.com",
            formation=self.formation,
            created_by=self.actor,
            updated_by=self.actor,
        )

        candidat.nom = "Martin"
        candidat.save(user=self.actor)

        self.assertEqual(candidat._initial["nom"], "Martin")

        candidat.prenom = "Julie"
        candidat.save(user=self.actor)

        self.assertEqual(candidat._initial["prenom"], "Julie")
        self.assertEqual(candidat._initial["nom"], "Martin")
