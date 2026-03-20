from django.test import TestCase

from ...api.serializers.commentaires_appairage_serializers import CommentaireAppairageWriteSerializer
from ...models.appairage import Appairage
from ...models.candidat import Candidat
from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ...models.formations import Formation
from ...models.partenaires import Partenaire
from ...models.statut import Statut
from ...models.types_offre import TypeOffre


class CommentaireAppairageWriteSerializerTestCase(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="appairage.comments@example.com",
            username="appairagecomments",
            password="testpass",
            is_staff=True,
        )
        self.centre = Centre.objects.create(nom="Centre Test", code_postal="75000")
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI, couleur="#000000")
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.formation = Formation.objects.create(
            nom="Formation Test",
            centre=self.centre,
            statut=self.statut,
            type_offre=self.type_offre,
            created_by=self.user,
        )
        self.candidat = Candidat.objects.create(
            nom="Durand",
            prenom="Alice",
            formation=self.formation,
            created_by=self.user,
        )
        self.partenaire = Partenaire.objects.create(nom="Entreprise Test", created_by=self.user)
        self.appairage = Appairage.objects.create(
            candidat=self.candidat,
            partenaire=self.partenaire,
            formation=self.formation,
            created_by=self.user,
        )

    def test_write_serializer_keeps_safe_rich_text_and_strips_unsafe_html(self):
        serializer = CommentaireAppairageWriteSerializer(
            data={
                "appairage": self.appairage.id,
                "body": '<p><strong>Bonjour</strong> <script>alert(1)</script><a href="https://example.com">lien</a></p>',
                "statut_commentaire": "actif",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["body"],
            '<p><strong>Bonjour</strong> alert(1)<a href="https://example.com" rel="nofollow">lien</a></p>',
        )

    def test_write_serializer_rejects_effectively_empty_rich_text(self):
        serializer = CommentaireAppairageWriteSerializer(
            data={
                "appairage": self.appairage.id,
                "body": "<p><br></p>",
                "statut_commentaire": "actif",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("body", serializer.errors)
