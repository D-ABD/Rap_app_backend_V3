from datetime import timedelta

from django.test import RequestFactory, TestCase
from django.utils import timezone

from rap_app.api.serializers.candidat_serializers import (
    CandidatCreateUpdateSerializer,
    CandidatListSerializer,
    CandidatSerializer,
)
from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre


class CandidatSerializerTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = CustomUser.objects.create_user_with_role(
            email="admin.candidat.serializer@example.com",
            username="admin_candidat_serializer",
            password="Password123!",
            role=CustomUser.ROLE_ADMIN,
        )
        self.centre = Centre.objects.create(nom="Centre Candidat Serializer", code_postal="75010")
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut_formation = Statut.objects.create(nom=Statut.NON_DEFINI, couleur="#111111")

        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Candidat Serializer",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut_formation,
            start_date=today - timedelta(days=2),
            end_date=today + timedelta(days=20),
            created_by=self.user,
        )
        self.compte = CustomUser.objects.create_user_with_role(
            email="stagiaire.candidat.serializer@example.com",
            username="stagiaire_candidat_serializer",
            password="Password123!",
            role=CustomUser.ROLE_STAGIAIRE,
        )
        self.candidat = Candidat.objects.create(
            nom="Dupont",
            prenom="Jeanne",
            email="jeanne.serializer@example.com",
            formation=self.formation,
            statut=Candidat.StatutCandidat.EN_FORMATION,
            admissible=True,
            parcours_phase=Candidat.ParcoursPhase.INSCRIT_VALIDE,
            compte_utilisateur=self.compte,
            created_by=self.user,
            updated_by=self.user,
        )

    def _request(self):
        request = self.factory.get("/api/candidats/")
        request.user = self.user
        return request

    def test_detail_serializer_exposes_phase_fields_in_read_only(self):
        serializer = CandidatSerializer(instance=self.candidat, context={"request": self._request()})
        data = serializer.data

        self.assertEqual(data["parcours_phase"], Candidat.ParcoursPhase.INSCRIT_VALIDE)
        self.assertEqual(data["parcours_phase_display"], "Inscrit validé")
        self.assertEqual(data["parcours_phase_calculee"], Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION)
        self.assertTrue(data["is_inscrit_valide"])
        self.assertTrue(data["is_en_formation_now"])
        self.assertTrue(data["is_stagiaire_role_aligned"])
        self.assertTrue(data["has_compte_utilisateur"])

    def test_list_serializer_exposes_phase_fields_in_read_only(self):
        serializer = CandidatListSerializer(instance=self.candidat, context={"request": self._request()})
        data = serializer.data

        self.assertEqual(data["parcours_phase"], Candidat.ParcoursPhase.INSCRIT_VALIDE)
        self.assertEqual(data["parcours_phase_calculee"], Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION)
        self.assertTrue(data["is_inscrit_valide"])
        self.assertTrue(data["is_en_formation_now"])
        self.assertTrue(data["has_compte_utilisateur"])

    def test_create_update_serializer_rejects_manual_phase_fields(self):
        serializer = CandidatCreateUpdateSerializer(
            instance=self.candidat,
            data={
                "parcours_phase": Candidat.ParcoursPhase.ABANDON,
                "date_validation_inscription": timezone.now().isoformat(),
            },
            partial=True,
            context={"request": self._request()},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated = serializer.save()
        updated.refresh_from_db()

        self.assertEqual(updated.parcours_phase, Candidat.ParcoursPhase.INSCRIT_VALIDE)
        self.assertIsNone(updated.date_validation_inscription)
