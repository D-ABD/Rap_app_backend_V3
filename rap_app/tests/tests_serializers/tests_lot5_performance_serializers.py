from datetime import timedelta

from django.db.models import Prefetch
from django.test import TestCase
from django.utils import timezone

from rap_app.api.serializers.appairage_serializers import AppairageListSerializer
from rap_app.api.serializers.candidat_serializers import (
    _get_last_prefetched_appairage,
    _get_last_prefetched_commentaire_body,
)
from rap_app.models.appairage import Appairage, AppairageStatut
from rap_app.models.commentaires_appairage import CommentaireAppairage
from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.partenaires import Partenaire
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre


class Lot5PerformanceSerializerTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user_with_role(
            email="lot5@example.com",
            username="lot5_user",
            password="password123",
            role=CustomUser.ROLE_STAFF,
        )
        self.centre = Centre.objects.create(nom="Centre Lot5")
        self.user.centres.add(self.centre)
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI)
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Lot5",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today,
            end_date=today + timedelta(days=30),
            created_by=self.user,
        )
        self.partenaire = Partenaire.objects.create(nom="Partenaire Lot5", created_by=self.user)
        self.candidat = Candidat.objects.create(
            nom="Dupont",
            prenom="Louise",
            formation=self.formation,
            created_by=self.user,
        )
        self.appairage = Appairage.objects.create(
            candidat=self.candidat,
            partenaire=self.partenaire,
            formation=self.formation,
            statut=AppairageStatut.TRANSMIS,
            created_by=self.user,
            updated_by=self.user,
        )
        CommentaireAppairage.objects.create(
            appairage=self.appairage,
            body="Premier commentaire",
            created_by=self.user,
            updated_by=self.user,
        )

    def test_candidat_list_serializer_uses_prefetched_appairages_without_extra_queries(self):
        candidat = (
            Candidat.objects.select_related(
                "formation",
                "formation__centre",
                "formation__type_offre",
                "placement_appairage",
                "placement_appairage__partenaire",
                "placement_appairage__created_by",
            )
            .prefetch_related(
                Prefetch(
                    "appairages",
                    queryset=Appairage.objects.select_related("partenaire", "created_by").prefetch_related(
                        "commentaires",
                        "commentaires__created_by",
                    ),
                )
            )
            .get(pk=self.candidat.pk)
        )

        with self.assertNumQueries(0):
            last_appairage = _get_last_prefetched_appairage(candidat)
            last_commentaire = _get_last_prefetched_commentaire_body(last_appairage)

        self.assertEqual(last_appairage.id, self.appairage.id)
        self.assertEqual(last_commentaire, "Premier commentaire")

    def test_appairage_list_serializer_uses_prefetched_commentaires_without_extra_queries(self):
        appairage = (
            Appairage.objects.select_related(
                "candidat",
                "formation",
                "formation__centre",
                "formation__type_offre",
                "partenaire",
                "created_by",
                "updated_by",
            )
            .prefetch_related("commentaires", "commentaires__created_by")
            .get(pk=self.appairage.pk)
        )
        serializer = AppairageListSerializer(context={"request": None})

        with self.assertNumQueries(0):
            data = serializer.get_last_commentaire(appairage)

        self.assertEqual(data, "Premier commentaire")
