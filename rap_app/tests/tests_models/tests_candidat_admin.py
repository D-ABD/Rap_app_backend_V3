from datetime import timedelta
from unittest.mock import Mock

from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, TestCase
from django.utils import timezone

from rap_app.admin.candidat_admin import CandidatAdmin
from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre


class CandidatAdminLifecycleActionsTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.site = AdminSite()
        self.admin = CandidatAdmin(Candidat, self.site)
        self.admin.message_user = Mock()

        self.actor = CustomUser.objects.create_user_with_role(
            email="admin.candidat.lifecycle@example.com",
            username="admin_candidat_lifecycle",
            password="password123",
            role=CustomUser.ROLE_ADMIN,
        )
        self.centre = Centre.objects.create(nom="Centre Admin Lifecycle", code_postal="75041")
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI, couleur="#123456")
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Admin Lifecycle",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today - timedelta(days=1),
            end_date=today + timedelta(days=15),
            created_by=self.actor,
        )

    def _request(self):
        request = self.factory.post("/admin/rap_app/candidat/")
        request.user = self.actor
        return request

    def test_admin_action_statut_formation_uses_lifecycle_transition(self):
        compte = CustomUser.objects.create_user_with_role(
            email="admin.action.start@example.com",
            username="admin_action_start",
            password="password123",
            role=CustomUser.ROLE_CANDIDAT,
        )
        candidat = Candidat.objects.create(
            nom="Admin",
            prenom="Start",
            email="admin.action.start@example.com",
            formation=self.formation,
            admissible=True,
            compte_utilisateur=compte,
            created_by=self.actor,
            updated_by=self.actor,
        )

        self.admin.act_statut_formation(self._request(), Candidat.objects.filter(pk=candidat.pk))

        candidat.refresh_from_db()
        compte.refresh_from_db()
        self.assertEqual(candidat.parcours_phase, Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION)
        self.assertIsNotNone(candidat.date_entree_formation_effective)
        self.assertEqual(compte.role, CustomUser.ROLE_STAGIAIRE)

    def test_admin_action_statut_abandon_keeps_legacy_status_compatible(self):
        candidat = Candidat.objects.create(
            nom="Admin",
            prenom="Abandon",
            email="admin.action.abandon@example.com",
            formation=self.formation,
            statut=Candidat.StatutCandidat.EN_FORMATION,
            created_by=self.actor,
            updated_by=self.actor,
        )

        self.admin.act_statut_abandon(self._request(), Candidat.objects.filter(pk=candidat.pk))

        candidat.refresh_from_db()
        self.assertEqual(candidat.parcours_phase, Candidat.ParcoursPhase.ABANDON)
        self.assertEqual(candidat.statut, Candidat.StatutCandidat.ABANDON)
        self.assertIsNotNone(candidat.date_sortie_formation)

    def test_admin_declares_phase_and_legacy_status_as_read_only(self):
        readonly = self.admin.get_readonly_fields(self._request())

        self.assertIn("statut", readonly)
        self.assertIn("parcours_phase", readonly)
        self.assertIn("date_validation_inscription", readonly)
        self.assertIn("date_entree_formation_effective", readonly)
        self.assertIn("date_sortie_formation", readonly)

    def test_admin_no_longer_exposes_direct_legacy_status_bulk_action(self):
        self.assertNotIn("act_statut_appairage", self.admin.actions)

    def test_admin_requires_rgpd_legal_basis_on_create_form(self):
        form = self.admin.get_form(self._request(), obj=None)
        self.assertTrue(form.base_fields["rgpd_legal_basis"].required)

    def test_admin_save_model_applies_rgpd_defaults_for_manual_creation(self):
        candidat = Candidat(
            nom="Admin",
            prenom="Rgpd",
            email="admin.rgpd@example.com",
            formation=self.formation,
            rgpd_legal_basis=Candidat.RgpdLegalBasis.INTERET_LEGITIME,
        )

        form = Mock()
        form.changed_data = []
        self.admin.save_model(self._request(), candidat, form, change=False)

        candidat.refresh_from_db()
        self.assertEqual(candidat.rgpd_creation_source, Candidat.RgpdCreationSource.MANUAL_ADMIN)
        self.assertEqual(candidat.rgpd_notice_status, Candidat.RgpdNoticeStatus.A_NOTIFIER)
        self.assertEqual(candidat.rgpd_data_reviewed_by, self.actor)
        self.assertIsNotNone(candidat.rgpd_data_reviewed_at)
