from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre
from rap_app.tests.factories import UserFactory


class CandidatWritePathTests(TestCase):
    def setUp(self):
        self.actor = UserFactory(role=CustomUser.ROLE_STAFF)
        self.centre = Centre.objects.create(nom="Centre Candidat Write Path", code_postal="75000")
        self.actor.centres.add(self.centre)
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI)
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Candidat Write Path",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today + timedelta(days=5),
            end_date=today + timedelta(days=30),
        )

    def test_save_refreshes_initial_snapshot_after_update(self):
        candidat = Candidat.objects.create(
            nom="Dupont",
            prenom="Jeanne",
            email="jeanne.snapshot@example.com",
            formation=self.formation,
            created_by=self.actor,
            updated_by=self.actor,
        )

        candidat.nom = "Martin"
        candidat.save(user=self.actor)

        self.assertEqual(candidat._initial["nom"], "Martin")

        candidat.prenom = "Julie"
        candidat.save(user=self.actor)

        self.assertEqual(candidat._initial["prenom"], "Julie")
        self.assertEqual(candidat._initial["nom"], "Martin")

    def test_parcours_phase_calculee_defaults_to_postulant_when_no_reliable_signal(self):
        candidat = Candidat.objects.create(
            nom="Martin",
            prenom="Luc",
            email="luc.phase@example.com",
            created_by=self.actor,
            updated_by=self.actor,
        )

        self.assertEqual(candidat.parcours_phase_calculee, Candidat.ParcoursPhase.POSTULANT)
        self.assertEqual(candidat.statut_metier_calcule, Candidat.StatutMetier.CANDIDAT)
        self.assertFalse(candidat.is_inscrit_valide)
        self.assertFalse(candidat.is_en_formation_now)
        self.assertFalse(candidat.has_compte_utilisateur)

    def test_statut_metier_calcule_detects_non_admissible_after_entretien(self):
        candidat = Candidat.objects.create(
            nom="Refuse",
            prenom="Entretien",
            email="refuse.entretien@example.com",
            entretien_done=True,
            admissible=False,
            created_by=self.actor,
            updated_by=self.actor,
        )

        self.assertEqual(candidat.statut_metier_calcule, Candidat.StatutMetier.NON_ADMISSIBLE)

    def test_statut_metier_calcule_prioritizes_manual_appairage_and_gespers(self):
        candidat = Candidat.objects.create(
            nom="Priorite",
            prenom="Metier",
            email="priorite.metier@example.com",
            formation=self.formation,
            admissible=True,
            statut=Candidat.StatutCandidat.EN_APPAIRAGE,
            created_by=self.actor,
            updated_by=self.actor,
        )

        self.assertEqual(candidat.statut_metier_calcule, Candidat.StatutMetier.EN_APPAIRAGE)

        candidat.inscrit_gespers = True
        candidat.save(user=self.actor, update_fields=["inscrit_gespers"])
        candidat.refresh_from_db()

        self.assertEqual(candidat.statut_metier_calcule, Candidat.StatutMetier.INSCRIT_GESPERS)

    def test_parcours_phase_calculee_detects_active_stagiaire_session(self):
        compte = CustomUser.objects.create_user_with_role(
            email="stagiaire.phase@example.com",
            username="stagiaire_phase",
            password="Password123!",
            role=CustomUser.ROLE_STAGIAIRE,
        )
        candidat = Candidat.objects.create(
            nom="Durand",
            prenom="Alice",
            email="alice.phase@example.com",
            formation=self.formation,
            statut=Candidat.StatutCandidat.EN_FORMATION,
            admissible=True,
            compte_utilisateur=compte,
            created_by=self.actor,
            updated_by=self.actor,
        )

        self.assertEqual(candidat.parcours_phase_calculee, Candidat.ParcoursPhase.INSCRIT_VALIDE)
        self.assertFalse(candidat.is_en_formation_now)

        self.formation.start_date = timezone.localdate() - timedelta(days=1)
        self.formation.end_date = timezone.localdate() + timedelta(days=5)
        self.formation.save()

        candidat.refresh_from_db()
        self.assertEqual(candidat.parcours_phase_calculee, Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION)
        self.assertTrue(candidat.is_inscrit_valide)
        self.assertTrue(candidat.is_en_formation_now)
        self.assertTrue(candidat.is_stagiaire_role_aligned)
