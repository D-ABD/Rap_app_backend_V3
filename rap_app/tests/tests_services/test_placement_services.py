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
        self.assertEqual(self.candidat.placement_appairage, self.appairage)
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

    def test_sync_after_save_clears_previous_candidate_when_appairage_reassigned(self):
        other_candidat = Candidat.objects.create(
            nom="Martin",
            prenom="Luc",
            formation=self.formation,
        )
        other_partenaire = Partenaire.objects.create(nom="Entreprise Placement Reaffectee")
        with defer_appairage_snapshot_sync():
            other_appairage = Appairage.objects.create(
                candidat=other_candidat,
                partenaire=other_partenaire,
                formation=self.formation,
                statut=AppairageStatut.ACCEPTE,
            )

        AppairagePlacementService.sync_after_save(other_appairage, actor=self.actor)
        other_candidat.refresh_from_db()
        self.assertEqual(other_candidat.entreprise_placement, other_partenaire)

        with defer_appairage_snapshot_sync():
            other_appairage.candidat = self.candidat
            other_appairage.save(update_fields=["candidat"])

        changes = AppairagePlacementService.sync_after_save(
            other_appairage,
            actor=self.actor,
            previous_candidat=other_candidat,
        )

        other_candidat.refresh_from_db()
        self.assertTrue(changes["previous"])
        self.assertIsNone(other_candidat.entreprise_placement)
        self.assertIsNone(other_candidat.responsable_placement)
        self.assertIsNone(other_candidat.resultat_placement)
        self.assertIsNone(other_candidat.date_placement)
        self.assertIsNone(other_candidat.placement_appairage)

    def test_sync_after_save_uses_latest_active_appairage_for_snapshot(self):
        older_date = timezone.now() + timedelta(days=1)
        newer_date = timezone.now() + timedelta(days=2)
        old_partenaire = Partenaire.objects.create(nom="Entreprise Placement Ancienne")
        new_partenaire = Partenaire.objects.create(nom="Entreprise Placement Nouvelle")

        with defer_appairage_snapshot_sync():
            old_appairage = Appairage.objects.create(
                candidat=self.candidat,
                partenaire=old_partenaire,
                formation=self.formation,
                statut=AppairageStatut.ACCEPTE,
                date_appairage=older_date,
            )
            new_appairage = Appairage.objects.create(
                candidat=self.candidat,
                partenaire=new_partenaire,
                formation=self.formation,
                statut=AppairageStatut.ACCEPTE,
                date_appairage=newer_date,
            )

        changes = AppairagePlacementService.sync_after_save(old_appairage, actor=self.actor)
        self.candidat.refresh_from_db()

        self.assertTrue(changes["current"])
        self.assertEqual(self.candidat.entreprise_placement, new_partenaire)
        self.assertEqual(self.candidat.placement_appairage, new_appairage)

    def test_sync_candidate_snapshot_clears_candidate_without_active_appairage(self):
        AppairagePlacementService.sync_after_save(self.appairage, actor=self.actor)
        self.candidat.refresh_from_db()
        self.assertEqual(self.candidat.placement_appairage_id, self.appairage.id)

        with defer_appairage_snapshot_sync():
            self.appairage.archiver(user=self.actor)

        changes = AppairagePlacementService.sync_candidate_snapshot(self.candidat, actor=self.actor)
        self.candidat.refresh_from_db()

        self.assertTrue(changes)
        self.assertIsNone(self.candidat.placement_appairage_id)
        self.assertIsNone(self.candidat.entreprise_placement_id)
        self.assertEqual(self.candidat.statut, Candidat.StatutCandidat.AUTRE)

    def test_sync_candidate_snapshot_uses_latest_remaining_active_appairage(self):
        backup_partenaire = Partenaire.objects.create(nom="Entreprise Placement Backup")
        with defer_appairage_snapshot_sync():
            backup_appairage = Appairage.objects.create(
                candidat=self.candidat,
                partenaire=backup_partenaire,
                formation=self.formation,
                statut=AppairageStatut.ACCEPTE,
                date_appairage=timezone.now() + timedelta(days=1),
            )

        AppairagePlacementService.sync_after_save(backup_appairage, actor=self.actor)
        self.candidat.refresh_from_db()
        self.assertEqual(self.candidat.placement_appairage_id, backup_appairage.id)

        with defer_appairage_snapshot_sync():
            backup_appairage.archiver(user=self.actor)

        changes = AppairagePlacementService.sync_candidate_snapshot(self.candidat, actor=self.actor)
        self.candidat.refresh_from_db()

        self.assertTrue(changes)
        self.assertEqual(self.candidat.placement_appairage_id, self.appairage.id)
        self.assertEqual(self.candidat.entreprise_placement_id, self.partenaire.id)
