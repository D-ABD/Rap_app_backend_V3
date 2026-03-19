from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework import serializers

from ...api.serializers.prospection_serializers import (
    ChangerStatutSerializer,
    ProspectionSerializer,
)
from ...models.centres import Centre
from ...models.candidat import Candidat
from ...models.custom_user import CustomUser
from ...models.formations import Formation
from ...models.partenaires import Partenaire
from ...models.prospection import Prospection, ProspectionChoices
from ...models.statut import Statut
from ...models.types_offre import TypeOffre


class ProspectionSerializerTestCase(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(email="test@example.com", username="testuser", password="testpass")

        centre = Centre.objects.create(nom="Centre Test", code_postal="75000")
        statut = Statut.objects.create(nom="non_defini", couleur="#000000")
        type_offre = TypeOffre.objects.create(nom="poec", couleur="#FF0000")

        self.formation = Formation.objects.create(
            nom="Formation Z",
            centre=centre,
            statut=statut,
            type_offre=type_offre,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=5),
            created_by=self.user,
        )

        self.partenaire = Partenaire.objects.create(nom="Entreprise Y", type="entreprise")

        self.valid_data = {
            "partenaire": self.partenaire.id,
            "formation": self.formation.id,
            "date_prospection": timezone.now().isoformat(),
            "type_prospection": ProspectionChoices.TYPE_PREMIER_CONTACT,
            "motif": ProspectionChoices.MOTIF_PARTENARIAT,
            "statut": ProspectionChoices.STATUT_EN_COURS,
            "objectif": ProspectionChoices.OBJECTIF_PRESENTATION,
            "commentaire": "Test",
        }

    def test_serializer_valid(self):
        serializer = ProspectionSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_accepted_with_objective_valid(self):
        data = self.valid_data.copy()
        data.update(
            {
                "statut": ProspectionChoices.STATUT_ACCEPTEE,
                "objectif": ProspectionChoices.OBJECTIF_PRESENTATION,
                "commentaire": "Contrat signé",
            }
        )
        serializer = ProspectionSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_refused_or_cancelled_requires_comment(self):
        for statut in [ProspectionChoices.STATUT_REFUSEE, ProspectionChoices.STATUT_ANNULEE]:
            data = self.valid_data.copy()
            data.update({"statut": statut, "commentaire": ""})
            serializer = ProspectionSerializer(data=data)
            self.assertFalse(serializer.is_valid())
            self.assertIn("commentaire", serializer.errors)

    def test_output_fields(self):
        prospection = Prospection.objects.create(
            partenaire=self.partenaire,
            formation=self.formation,
            type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
            motif=ProspectionChoices.MOTIF_PARTENARIAT,
            statut=ProspectionChoices.STATUT_EN_COURS,
            objectif=ProspectionChoices.OBJECTIF_PRESENTATION,
            commentaire="Test",
            created_by=self.user,
        )
        serializer = ProspectionSerializer(instance=prospection)
        data = serializer.data

        self.assertIn("is_active", data)
        self.assertIn("relance_necessaire", data)
        self.assertTrue(isinstance(data["is_active"], bool))

    def test_create_instance(self):
        serializer = ProspectionSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid())
        instance = serializer.save(created_by=self.user)
        self.assertIsInstance(instance, Prospection)

    def test_serializer_does_not_override_formation_from_owner_relation(self):
        owner = CustomUser.objects.create_user_with_role(
            email="owner-prosp@example.com",
            username="owner_prosp",
            password="password123",
            role=CustomUser.ROLE_CANDIDAT,
        )
        other_centre = Centre.objects.create(nom="Centre Other", code_postal="69000")
        other_statut = Statut.objects.create(nom="formation_en_cours", couleur="#123456")
        other_type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF, couleur="#00AAFF")
        owner_formation = Formation.objects.create(
            nom="Formation Owner",
            centre=other_centre,
            statut=other_statut,
            type_offre=other_type_offre,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=10),
            created_by=self.user,
        )
        Candidat.objects.create(
            nom="Owner",
            prenom="Candidate",
            email="owner-prosp@example.com",
            formation=owner_formation,
            compte_utilisateur=owner,
            created_by=self.user,
            updated_by=self.user,
        )

        data = self.valid_data.copy()
        data["owner"] = owner.id
        serializer = ProspectionSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save(created_by=self.user)

        self.assertEqual(instance.owner_id, owner.id)
        self.assertEqual(instance.formation_id, self.formation.id)

    def test_invalid_partial_update(self):
        prospection = Prospection.objects.create(
            partenaire=self.partenaire,
            formation=self.formation,
            type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
            motif=ProspectionChoices.MOTIF_PARTENARIAT,
            statut=ProspectionChoices.STATUT_EN_COURS,
            objectif=ProspectionChoices.OBJECTIF_PRESENTATION,
            commentaire="Initial",
            created_by=self.user,
        )
        serializer = ProspectionSerializer(instance=prospection, data={"statut": "invalid_status"}, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn("statut", serializer.errors)


class ChangerStatutSerializerTestCase(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(email="test@example.com", username="testuser", password="testpass")

    def test_valid_status_change(self):
        data = {
            "statut": ProspectionChoices.STATUT_ACCEPTEE,
            "commentaire": "Contrat signé",
            "moyen_contact": ProspectionChoices.MOYEN_EMAIL,
        }
        serializer = ChangerStatutSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_relance_status_with_optional_relance_prevue(self):
        data = {
            "statut": ProspectionChoices.STATUT_A_RELANCER,
            "relance_prevue": timezone.now().date() + timedelta(days=7),
        }
        serializer = ChangerStatutSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(
            serializer.validated_data["relance_prevue"],
            timezone.now().date() + timedelta(days=7),
        )

    def test_invalid_status(self):
        data = {"statut": "invalid_status"}
        serializer = ChangerStatutSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("statut", serializer.errors)
