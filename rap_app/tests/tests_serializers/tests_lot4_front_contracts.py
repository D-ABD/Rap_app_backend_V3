"""Tests relatifs a lot4 front contracts."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from rap_app.api.serializers.appairage_serializers import AppairageCreateUpdateSerializer
from rap_app.api.serializers.candidat_serializers import CandidatCreateUpdateSerializer
from rap_app.api.serializers.prospection_serializers import ProspectionWriteSerializer
from rap_app.models.appairage import Appairage, AppairageStatut
from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.partenaires import Partenaire
from rap_app.models.prospection import Prospection, ProspectionChoices
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre


class _MockRequest:
    """Double de requete utilise par les tests de contrat front."""
    def __init__(self, user):
        self.user = user


class Lot4FrontContractSerializerTests(TestCase):
    """Cas de test pour Lot4 Front Contract Serializer Tests."""
    def setUp(self):
        self.user = CustomUser.objects.create_user_with_role(
            email="lot4@example.com",
            username="lot4_user",
            password="password123",
            role=CustomUser.ROLE_STAFF,
        )
        self.centre = Centre.objects.create(nom="Centre Lot4", code_postal="75000")
        self.user.centres.add(self.centre)
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI)
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Lot4",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today,
            end_date=today + timedelta(days=30),
        )
        self.partenaire = Partenaire.objects.create(nom="Partenaire Lot4")
        self.candidat = Candidat.objects.create(
            nom="Dupont",
            prenom="Jeanne",
            email="jeanne.lot4@example.com",
            formation=self.formation,
            created_by=self.user,
        )

    def test_candidat_write_serializer_accepts_partial_payload(self):
        serializer = CandidatCreateUpdateSerializer(
            instance=self.candidat,
            data={"telephone": "0612345678"},
            partial=True,
            context={"request": _MockRequest(self.user)},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_prospection_write_serializer_accepts_partial_payload(self):
        prospection = Prospection.objects.create(
            partenaire=self.partenaire,
            formation=self.formation,
            date_prospection=timezone.now(),
            type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
            motif=ProspectionChoices.MOTIF_PARTENARIAT,
            statut=ProspectionChoices.STATUT_EN_COURS,
            objectif=ProspectionChoices.OBJECTIF_PRESENTATION,
            commentaire="Initial",
            created_by=self.user,
            owner=self.user,
        )
        serializer = ProspectionWriteSerializer(
            instance=prospection,
            data={"commentaire": "Mise à jour"},
            partial=True,
            context={"request": _MockRequest(self.user)},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_appairage_write_serializer_accepts_partial_payload(self):
        appairage = Appairage.objects.create(
            candidat=self.candidat,
            partenaire=self.partenaire,
            formation=self.formation,
            statut=AppairageStatut.TRANSMIS,
            created_by=self.user,
            updated_by=self.user,
        )
        serializer = AppairageCreateUpdateSerializer(
            instance=appairage,
            data={"retour_partenaire": "En attente de réponse"},
            partial=True,
            context={"request": _MockRequest(self.user)},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
