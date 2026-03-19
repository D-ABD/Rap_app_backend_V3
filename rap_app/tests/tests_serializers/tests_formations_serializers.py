# tests/test_formation_serializers.py

import tempfile
from datetime import date

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse

from rap_app.api.serializers.formations_serializers import (
    CommentaireSerializer,
    DocumentSerializer,
    EvenementSerializer,
    FormationCreateSerializer,
    FormationDetailSerializer,
    FormationUpdateSerializer,
)
from rap_app.models.centres import Centre
from rap_app.models.commentaires import Commentaire
from rap_app.models.documents import Document
from rap_app.models.evenements import Evenement
from rap_app.models.formations import Formation
from rap_app.models.partenaires import Partenaire
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre

User = get_user_model()


class FormationSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="commenter", email="commenter@example.com", password="pass")
        self.centre = Centre.objects.create(nom="Test Centre")
        self.type_offre = TypeOffre.objects.create(nom="crif")
        self.statut = Statut.objects.create(nom="formation_en_cours", couleur="#123456")

        self.formation = Formation.objects.create(
            nom="Test Formation",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=date(2025, 5, 1),
            end_date=date(2025, 6, 1),
            created_by=self.user,
        )

    def test_serialization(self):
        serializer = FormationDetailSerializer(instance=self.formation, context={"request": None})
        data = serializer.data
        self.assertIn("nom", data)
        self.assertEqual(data["nom"], "Test Formation")
        self.assertEqual(data["candidats_list_url"], f"{reverse('candidat-list')}?formation={self.formation.id}")

    def test_creation_invalid_date(self):
        payload = {
            "nom": "Invalid Formation",
            "centre_id": self.centre.pk,
            "type_offre_id": self.type_offre.pk,
            "statut_id": self.statut.pk,
            "start_date": "2025-06-01",
            "end_date": "2025-05-01",
        }
        serializer = FormationCreateSerializer(data=payload, context={"request": self._fake_request()})
        self.assertFalse(serializer.is_valid())
        self.assertIn("start_date", serializer.errors)

    def test_update_serializer_accepts_partial_payload_without_required_refs(self):
        payload = {
            "nom": "Formation renommée",
            "end_date": "2025-06-15",
        }
        serializer = FormationUpdateSerializer(
            instance=self.formation,
            data=payload,
            partial=True,
            context={"request": self._fake_request()},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_update_serializer_persists_partial_changes(self):
        payload = {"nom": "Formation MAJ"}
        serializer = FormationUpdateSerializer(
            instance=self.formation,
            data=payload,
            partial=True,
            context={"request": self._fake_request()},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated = serializer.save()
        self.assertEqual(updated.nom, "Formation MAJ")
        self.assertEqual(updated.centre_id, self.centre.id)

    def _fake_request(self):
        class FakeRequest:
            user = self.user

        return FakeRequest()


class CommentaireSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="test@example.com", password="pass")
        self.formation = Formation.objects.create(
            nom="Formation",
            centre=Centre.objects.create(nom="X"),
            type_offre=TypeOffre.objects.create(nom="crif"),
            statut=Statut.objects.create(nom="formation_en_cours", couleur="#123456"),
            created_by=self.user,
        )
        self.comment = Commentaire.objects.create(
            formation=self.formation, contenu="Test Comment", saturation=80, created_by=self.user
        )

    def test_comment_serializer(self):
        serializer = CommentaireSerializer(instance=self.comment)
        self.assertEqual(serializer.data["contenu"], "Test Comment")


class DocumentSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="test@example.com", password="pass")
        self.formation = Formation.objects.create(
            nom="Formation Doc",
            centre=Centre.objects.create(nom="X"),
            type_offre=TypeOffre.objects.create(nom="crif"),
            statut=Statut.objects.create(nom="formation_en_cours", couleur="#123456"),
            created_by=self.user,
        )
        self.document = Document.objects.create(
            formation=self.formation,
            fichier=SimpleUploadedFile("test.pdf", b"dummy content"),
            nom_fichier="Test PDF",
            type_document="pdf",
            created_by=self.user,
        )

    def test_document_serializer(self):
        serializer = DocumentSerializer(instance=self.document)
        self.assertEqual(serializer.data["nom_fichier"], "Test PDF")


class EvenementSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="test@example.com", password="pass")
        self.formation = Formation.objects.create(
            nom="Formation Event",
            centre=Centre.objects.create(nom="X"),
            type_offre=TypeOffre.objects.create(nom="crif"),
            statut=Statut.objects.create(nom="formation_en_cours", couleur="#123456"),
            created_by=self.user,
        )
        self.evenement = Evenement.objects.create(
            formation=self.formation, type_evenement="forum", event_date=date.today(), created_by=self.user
        )

    def test_evenement_serializer(self):
        serializer = EvenementSerializer(instance=self.evenement)
        self.assertEqual(serializer.data["type_evenement"], "forum")
