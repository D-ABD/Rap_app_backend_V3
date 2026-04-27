"""Tests relatifs aux sérialiseurs Prépa Compétences."""

from django.test import TestCase
from django.utils import timezone

from rap_app.api.serializers.prepa_serializers import StagiairePrepaSerializer
from rap_app.models.centres import Centre
from rap_app.models.prepa import Prepa, StagiairePrepa
from rap_app.tests.factories import UserFactory


class StagiairePrepaSerializerTests(TestCase):
    """Valide les enrichissements additifs du sérialiseur StagiairePrepa."""

    def setUp(self):
        self.user = UserFactory()
        self.centre = Centre.objects.create(nom="Centre Lille", code_postal="59000", created_by=self.user)
        self.autre_centre = Centre.objects.create(nom="Centre Amiens", code_postal="80000", created_by=self.user)
        self.prepa = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.INFO_COLLECTIVE,
            date_prepa=timezone.localdate(),
            centre=self.centre,
            created_by=self.user,
        )

    def test_serializer_exposes_calculated_parcours_fields(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.prepa,
            nom="Martin",
            prenom="Lina",
            atelier_1_realise=True,
            date_atelier_1=timezone.localdate(),
            prochain_atelier_prevu=Prepa.TypePrepa.ATELIER3,
            statut_positionnement=StagiairePrepa.StatutPositionnement.POSITIONNE,
            created_by=self.user,
        )

        data = StagiairePrepaSerializer(instance=stagiaire).data

        self.assertEqual(data["statut_parcours_calcule"], StagiairePrepa.StatutParcours.EN_PARCOURS)
        self.assertEqual(data["prochain_atelier_attendu"], Prepa.TypePrepa.ATELIER3)
        self.assertEqual(data["prochain_atelier_attendu_display"], "Atelier 3")
        self.assertEqual(data["statut_positionnement_display"], "Positionné")

    def test_serializer_requires_afpa_target_fields_when_oriented_afpa(self):
        serializer = StagiairePrepaSerializer(
            data={
                "centre_id": self.centre.id,
                "nom": "Bernard",
                "prenom": "Noah",
                "orientation_finale": StagiairePrepa.OrientationFinale.AFPA,
                "date_orientation": "2026-04-20",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("centre_afpa_cible_id", serializer.errors)
        self.assertIn("formation_afpa_cible", serializer.errors)

    def test_serializer_accepts_complete_afpa_orientation_payload(self):
        serializer = StagiairePrepaSerializer(
            data={
                "centre_id": self.centre.id,
                "nom": "Bernard",
                "prenom": "Noah",
                "orientation_finale": StagiairePrepa.OrientationFinale.AUTRE_CENTRE_AFPA,
                "centre_afpa_cible_id": self.autre_centre.id,
                "formation_afpa_cible": "Titre professionnel RH",
                "date_orientation": "2026-04-20",
                "entree_formation_confirmee": True,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
