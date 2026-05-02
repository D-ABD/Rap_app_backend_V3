"""Tests du service métier parcours Prépa."""

from datetime import date

from django.test import TestCase
from django.utils import timezone

from rap_app.models.centres import Centre
from rap_app.models.prepa import IssueBilanPrepa, Prepa, PrepaPresenceStatut, PrepaStagiaireParticipation, StagiairePrepa
from rap_app.services.prepa_parcours import (
    StatutParcoursCourant,
    compute_date_entree_calculee,
    compute_date_fin_calculee,
    compute_derniere_etape,
    compute_statut_parcours_courant,
    has_at1_present_ever,
)
from rap_app.tests.factories import UserFactory


class PrepaParcoursServiceTests(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.centre = Centre.objects.create(nom="Centre Test", code_postal="59000", created_by=self.user)
        self.ic = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.INFO_COLLECTIVE,
            date_prepa=timezone.localdate(),
            centre=self.centre,
            nombre_places_ouvertes=10,
            created_by=self.user,
        )

    def _mk_atelier(self, type_prepa, d=None):
        d = d or timezone.localdate()
        return Prepa.objects.create(
            type_prepa=type_prepa,
            date_prepa=d,
            date_debut_atelier=d,
            date_fin_atelier=d,
            centre=self.centre,
            created_by=self.user,
        )

    def test_inscrit_ne_fait_pas_demarrer_le_parcours(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.ic,
            nom="X",
            prenom="Y",
            created_by=self.user,
        )
        at1 = self._mk_atelier(Prepa.TypePrepa.ATELIER1)
        PrepaStagiaireParticipation.objects.create(
            prepa=at1,
            stagiaire_prepa=stagiaire,
            statut=PrepaPresenceStatut.INSCRIT,
            created_by=self.user,
        )
        self.assertEqual(compute_statut_parcours_courant(stagiaire), StatutParcoursCourant.EN_ATTENTE_DEMARRAGE)
        self.assertFalse(has_at1_present_ever(stagiaire))

    def test_present_at1_demarre_puis_attente_suite(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.ic,
            nom="X",
            prenom="Y",
            created_by=self.user,
        )
        at1 = self._mk_atelier(Prepa.TypePrepa.ATELIER1)
        PrepaStagiaireParticipation.objects.create(
            prepa=at1,
            stagiaire_prepa=stagiaire,
            statut=PrepaPresenceStatut.PRESENT,
            created_by=self.user,
        )
        self.assertEqual(compute_statut_parcours_courant(stagiaire), StatutParcoursCourant.EN_ATTENTE_SUITE)

    def test_absent_puis_present_at1(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.ic,
            nom="X",
            prenom="Y",
            created_by=self.user,
        )
        at1a = self._mk_atelier(Prepa.TypePrepa.ATELIER1, d=date(2026, 1, 10))
        at1b = self._mk_atelier(Prepa.TypePrepa.ATELIER1, d=date(2026, 2, 10))
        PrepaStagiaireParticipation.objects.create(
            prepa=at1a, stagiaire_prepa=stagiaire, statut=PrepaPresenceStatut.ABSENT, created_by=self.user
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=at1b, stagiaire_prepa=stagiaire, statut=PrepaPresenceStatut.PRESENT, created_by=self.user
        )
        self.assertEqual(compute_statut_parcours_courant(stagiaire), StatutParcoursCourant.EN_ATTENTE_SUITE)

    def test_present_at6_attente_bilan(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.ic,
            nom="X",
            prenom="Y",
            created_by=self.user,
        )
        at1 = self._mk_atelier(Prepa.TypePrepa.ATELIER1)
        at6 = self._mk_atelier(Prepa.TypePrepa.ATELIER6)
        PrepaStagiaireParticipation.objects.create(
            prepa=at1, stagiaire_prepa=stagiaire, statut=PrepaPresenceStatut.PRESENT, created_by=self.user
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=at6, stagiaire_prepa=stagiaire, statut=PrepaPresenceStatut.PRESENT, created_by=self.user
        )
        self.assertEqual(compute_statut_parcours_courant(stagiaire), StatutParcoursCourant.EN_ATTENTE_BILAN)

    def test_abandon_sans_issue_attente_bilan(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.ic,
            nom="X",
            prenom="Y",
            statut_parcours=StagiairePrepa.StatutParcours.ABANDON,
            motif_abandon="perso",
            created_by=self.user,
        )
        at1 = self._mk_atelier(Prepa.TypePrepa.ATELIER1)
        PrepaStagiaireParticipation.objects.create(
            prepa=at1, stagiaire_prepa=stagiaire, statut=PrepaPresenceStatut.PRESENT, created_by=self.user
        )
        self.assertEqual(compute_statut_parcours_courant(stagiaire), StatutParcoursCourant.EN_ATTENTE_BILAN)

    def test_issue_bilan_termine(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.ic,
            nom="X",
            prenom="Y",
            issue_bilan=IssueBilanPrepa.ORIENTE_AFPA,
            date_bilan=timezone.localdate(),
            created_by=self.user,
        )
        self.assertEqual(compute_statut_parcours_courant(stagiaire), StatutParcoursCourant.TERMINE)

    def test_date_entree_calculee_correspond_au_premier_at1_present(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.ic,
            nom="X",
            prenom="Y",
            created_by=self.user,
        )
        at1_absent = self._mk_atelier(Prepa.TypePrepa.ATELIER1, d=date(2026, 1, 10))
        at1_present = self._mk_atelier(Prepa.TypePrepa.ATELIER1, d=date(2026, 2, 10))
        PrepaStagiaireParticipation.objects.create(
            prepa=at1_absent,
            stagiaire_prepa=stagiaire,
            statut=PrepaPresenceStatut.ABSENT,
            created_by=self.user,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=at1_present,
            stagiaire_prepa=stagiaire,
            statut=PrepaPresenceStatut.PRESENT,
            created_by=self.user,
        )

        self.assertEqual(compute_date_entree_calculee(stagiaire), "2026-02-10")

    def test_date_fin_calculee_correspond_a_la_date_du_bilan(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.ic,
            nom="X",
            prenom="Y",
            date_bilan=date(2026, 4, 30),
            issue_bilan=IssueBilanPrepa.ORIENTE_AFPA,
            created_by=self.user,
        )

        self.assertEqual(compute_date_fin_calculee(stagiaire), "2026-04-30")

    def test_derniere_etape_retourne_at1_en_attente_si_aucune_presence(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.ic,
            nom="X",
            prenom="Y",
            created_by=self.user,
        )

        self.assertEqual(
            compute_derniere_etape(stagiaire),
            {"value": Prepa.TypePrepa.ATELIER1, "label": "En attente de AT1", "date": None},
        )

    def test_derniere_etape_retourne_bilan_si_bilan_renseigne(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.ic,
            nom="X",
            prenom="Y",
            date_bilan=date(2026, 5, 1),
            issue_bilan=IssueBilanPrepa.AUTRE_SORTIE,
            created_by=self.user,
        )

        self.assertEqual(
            compute_derniere_etape(stagiaire),
            {"value": "bilan", "label": "Bilan", "date": "2026-05-01"},
        )
