"""Tests relatifs a candidat serializers."""
from datetime import timedelta

from django.test import RequestFactory, TestCase
from django.utils import timezone

from rap_app.api.serializers.candidat_serializers import (
    CandidatCreateUpdateSerializer,
    CandidatListSerializer,
    CandidatQueryParamsSerializer,
    CandidatSerializer,
)
from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre


class CandidatSerializerTest(TestCase):
    """Cas de test pour Candidat Serializer Test."""
    def setUp(self):
        self.factory = RequestFactory()
        self.user = CustomUser.objects.create_user_with_role(
            email="admin.candidat.serializer@example.com",
            username="admin_candidat_serializer",
            password="Password123!",
            role=CustomUser.ROLE_ADMIN,
        )
        self.centre = Centre.objects.create(nom="Centre Candidat Serializer", code_postal="75010")
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut_formation = Statut.objects.create(nom=Statut.NON_DEFINI, couleur="#111111")

        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Candidat Serializer",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut_formation,
            start_date=today - timedelta(days=2),
            end_date=today + timedelta(days=20),
            created_by=self.user,
        )
        self.compte = CustomUser.objects.create_user_with_role(
            email="stagiaire.candidat.serializer@example.com",
            username="stagiaire_candidat_serializer",
            password="Password123!",
            role=CustomUser.ROLE_STAGIAIRE,
        )
        self.candidat = Candidat.objects.create(
            nom="Dupont",
            prenom="Jeanne",
            email="jeanne.serializer@example.com",
            formation=self.formation,
            statut=Candidat.StatutCandidat.EN_FORMATION,
            admissible=True,
            parcours_phase=Candidat.ParcoursPhase.INSCRIT_VALIDE,
            compte_utilisateur=self.compte,
            created_by=self.user,
            updated_by=self.user,
        )

    def _request(self):
        request = self.factory.get("/api/candidats/")
        request.user = self.user
        return request

    def test_detail_serializer_exposes_phase_fields_in_read_only(self):
        serializer = CandidatSerializer(instance=self.candidat, context={"request": self._request()})
        data = serializer.data

        self.assertEqual(data["parcours_phase"], Candidat.ParcoursPhase.INSCRIT_VALIDE)
        self.assertEqual(data["parcours_phase_display"], "Inscrit GESPERS")
        self.assertEqual(data["parcours_phase_calculee"], Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION)
        self.assertEqual(data["statut_metier_calcule"], Candidat.StatutMetier.EN_FORMATION)
        self.assertEqual(data["statut_metier_display"], "En formation")
        self.assertTrue(data["is_inscrit_valide"])
        self.assertTrue(data["is_en_formation_now"])
        self.assertTrue(data["is_stagiaire_role_aligned"])
        self.assertTrue(data["has_compte_utilisateur"])

    def test_list_serializer_exposes_phase_fields_in_read_only(self):
        serializer = CandidatListSerializer(instance=self.candidat, context={"request": self._request()})
        data = serializer.data

        self.assertEqual(data["parcours_phase"], Candidat.ParcoursPhase.INSCRIT_VALIDE)
        self.assertEqual(data["parcours_phase_calculee"], Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION)
        self.assertEqual(data["statut_metier_calcule"], Candidat.StatutMetier.EN_FORMATION)
        self.assertTrue(data["is_inscrit_valide"])
        self.assertTrue(data["is_en_formation_now"])
        self.assertTrue(data["has_compte_utilisateur"])

    def test_create_update_serializer_rejects_manual_phase_fields(self):
        serializer = CandidatCreateUpdateSerializer(
            instance=self.candidat,
            data={
                "statut": Candidat.StatutCandidat.ABANDON,
                "parcours_phase": Candidat.ParcoursPhase.ABANDON,
                "date_validation_inscription": timezone.now().isoformat(),
            },
            partial=True,
            context={"request": self._request()},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated = serializer.save()
        updated.refresh_from_db()

        self.assertEqual(updated.statut, Candidat.StatutCandidat.EN_FORMATION)
        self.assertEqual(updated.parcours_phase, Candidat.ParcoursPhase.INSCRIT_VALIDE)
        self.assertIsNone(updated.date_validation_inscription)

    def test_query_params_serializer_accepts_parcours_phase_labels_and_aliases(self):
        serializer = CandidatQueryParamsSerializer(
            data={
                "parcoursPhase": "Inscrit GESPERS",
                "parcours_phase__in": "En formation,abandon",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["parcours_phase"], Candidat.ParcoursPhase.INSCRIT_VALIDE)
        self.assertEqual(
            serializer.validated_data["parcours_phase__in"],
            [
                Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
                Candidat.ParcoursPhase.ABANDON,
            ],
        )

    def test_create_update_serializer_requires_rgpd_legal_basis_on_manual_create(self):
        serializer = CandidatCreateUpdateSerializer(
            data={
                "nom": "Rgpd",
                "prenom": "Missing",
                "email": "rgpd.missing@example.com",
                "formation": self.formation.id,
            },
            context={"request": self._request()},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("rgpd_legal_basis", serializer.errors)

    def test_create_update_serializer_applies_rgpd_defaults_on_manual_create(self):
        serializer = CandidatCreateUpdateSerializer(
            data={
                "nom": "Rgpd",
                "prenom": "Safe",
                "email": "rgpd.safe@example.com",
                "formation": self.formation.id,
                "rgpd_legal_basis": Candidat.RgpdLegalBasis.INTERET_LEGITIME,
            },
            context={"request": self._request()},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        candidat = serializer.save(created_by=self.user, updated_by=self.user)

        self.assertEqual(candidat.rgpd_creation_source, Candidat.RgpdCreationSource.MANUAL_ADMIN)
        self.assertEqual(candidat.rgpd_notice_status, Candidat.RgpdNoticeStatus.A_NOTIFIER)
        self.assertIsNotNone(candidat.rgpd_data_reviewed_at)
        self.assertEqual(candidat.rgpd_data_reviewed_by, self.user)

    def test_create_update_serializer_tracks_rgpd_consent_when_required(self):
        serializer = CandidatCreateUpdateSerializer(
            data={
                "nom": "Consent",
                "prenom": "Tracked",
                "email": "consent.tracked@example.com",
                "formation": self.formation.id,
                "rgpd_legal_basis": Candidat.RgpdLegalBasis.CONSENTEMENT,
                "rgpd_consent_obtained": True,
            },
            context={"request": self._request()},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        candidat = serializer.save(created_by=self.user, updated_by=self.user)

        self.assertTrue(candidat.rgpd_consent_obtained)
        self.assertIsNotNone(candidat.rgpd_consent_obtained_at)
        self.assertEqual(candidat.rgpd_consent_recorded_by, self.user)

    def test_create_update_serializer_normalizes_safe_text_fields(self):
        serializer = CandidatCreateUpdateSerializer(
            data={
                "nom": "  dUPONT  ",
                "prenom": "  jEAN-pAUL ",
                "email": "  Jp.Dupont@Example.COM ",
                "telephone": "06 12-34.56 78",
                "ville": "  sAINT-denis ",
                "code_postal": " 75 008 ",
                "formation": self.formation.id,
                "rgpd_legal_basis": Candidat.RgpdLegalBasis.INTERET_LEGITIME,
            },
            context={"request": self._request()},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        candidat = serializer.save(created_by=self.user, updated_by=self.user)

        self.assertEqual(candidat.nom, "Dupont")
        self.assertEqual(candidat.prenom, "Jean-Paul")
        self.assertEqual(candidat.email, "jp.dupont@example.com")
        self.assertEqual(candidat.telephone, "0612345678")
        self.assertEqual(candidat.ville, "Saint-Denis")
        self.assertEqual(candidat.code_postal, "75008")

    def test_create_update_serializer_syncs_formation_inscrits_when_gespers_changes(self):
        """Lot 8 — GESPERS seul (candidat POSTULANT) ne modifie plus
        les compteurs inscrits. Le compteur reste à 0."""
        candidat = Candidat.objects.create(
            nom="Counter",
            prenom="Tracked",
            email="counter.tracked@example.com",
            formation=self.formation,
            created_by=self.user,
            updated_by=self.user,
        )

        serializer = CandidatCreateUpdateSerializer(
            instance=candidat,
            data={"inscrit_gespers": True},
            partial=True,
            context={"request": self._request()},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.formation.refresh_from_db()
        self.assertEqual(self.formation.inscrits_crif, 0)

        serializer = CandidatCreateUpdateSerializer(
            instance=candidat,
            data={"inscrit_gespers": False},
            partial=True,
            context={"request": self._request()},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.formation.refresh_from_db()
        self.assertEqual(self.formation.inscrits_crif, 0)

    def test_commercial_can_assign_candidate_to_in_scope_formation(self):
        commercial = CustomUser.objects.create_user_with_role(
            email="commercial.candidat.serializer@example.com",
            username="commercial_candidat_serializer",
            password="Password123!",
            role=CustomUser.ROLE_COMMERCIAL,
        )
        commercial.centres.add(self.centre)

        request = self.factory.patch("/api/candidats/")
        request.user = commercial

        serializer = CandidatCreateUpdateSerializer(
            instance=self.candidat,
            data={"formation": self.formation.id},
            partial=True,
            context={"request": request},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_charge_recrutement_can_see_peut_modifier_on_candidate(self):
        charge = CustomUser.objects.create_user_with_role(
            email="charge.candidat.serializer@example.com",
            username="charge_candidat_serializer",
            password="Password123!",
            role=CustomUser.ROLE_CHARGE_RECRUTEMENT,
        )
        charge.centres.add(self.centre)

        request = self.factory.get("/api/candidats/")
        request.user = charge

        serializer = CandidatListSerializer(instance=self.candidat, context={"request": request})
        self.assertTrue(serializer.data["peut_modifier"])
