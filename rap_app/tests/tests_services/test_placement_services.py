from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from rap_app.models.appairage import Appairage, AppairageStatut
from rap_app.models.candidat import Candidat, HistoriquePlacement, ResultatPlacementChoices
from rap_app.models.centres import Centre
from rap_app.models.formations import Formation
from rap_app.models.partenaires import Partenaire
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre
from rap_app.services.placement_services import AppairagePlacementService, defer_appairage_snapshot_sync
from rap_app.tests.factories import UserFactory


class AppairagePlacementServiceTests(TestCase):
    def setUp(self):
        self.actor = UserFactory(role="staff")
        self.centre = Centre.objects.create(nom="Centre Placement")
        self.actor.centres.add(self.centre)
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI)
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Placement",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today + timedelta(days=5),
            end_date=today + timedelta(days=30),
        )
        self.candidat = Candidat.objects.create(
            nom="Dupont",
            prenom="Jeanne",
            formation=self.formation,
        )
        self.partenaire = Partenaire.objects.create(nom="Entreprise Placement")
        with defer_appairage_snapshot_sync():
            self.appairage = Appairage.objects.create(
                candidat=self.candidat,
                partenaire=self.partenaire,
                formation=self.formation,
                statut=AppairageStatut.ACCEPTE,
            )

    def test_sync_after_save_is_idempotent(self):
        first_changes = AppairagePlacementService.sync_after_save(self.appairage, actor=self.actor)
        self.candidat.refresh_from_db()

        self.assertTrue(first_changes["current"])
        self.assertEqual(self.candidat.entreprise_placement, self.partenaire)
        self.assertEqual(self.candidat.resultat_placement, ResultatPlacementChoices.ADMIS)
        self.assertEqual(self.candidat.responsable_placement, self.actor)
        self.assertEqual(self.candidat.statut, Candidat.StatutCandidat.EN_APPAIRAGE)
        self.assertEqual(HistoriquePlacement.objects.filter(candidat=self.candidat).count(), 1)

        second_changes = AppairagePlacementService.sync_after_save(self.appairage, actor=self.actor)
        self.candidat.refresh_from_db()

        self.assertEqual(second_changes["current"], [])
        self.assertEqual(HistoriquePlacement.objects.filter(candidat=self.candidat).count(), 1)
        self.assertTrue(getattr(self.appairage, "_placement_synced_by_service", False))

    def test_appairage_save_uses_created_or_updated_by_as_history_actor(self):
        self.assertEqual(self.appairage.historiques.count(), 1)
        historique = self.appairage.historiques.first()
        self.assertEqual(historique.auteur, self.appairage.created_by)
