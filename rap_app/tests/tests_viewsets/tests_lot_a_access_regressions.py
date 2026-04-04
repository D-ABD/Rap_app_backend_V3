from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from ...models.appairage import Appairage, AppairageStatut
from ...models.atelier_tre import AtelierTRE
from ...models.candidat import Candidat
from ...models.centres import Centre
from ...models.commentaires_appairage import CommentaireAppairage
from ...models.custom_user import CustomUser
from ...models.declic import Declic, ObjectifDeclic, ParticipantDeclic
from ...models.evenements import Evenement
from ...models.formations import Formation
from ...models.partenaires import Partenaire
from ...models.prepa import ObjectifPrepa, Prepa, StagiairePrepa
from ...models.prospection import Prospection
from ...models.prospection_choices import ProspectionChoices
from ...models.prospection_comments import ProspectionComment
from ...models.statut import Statut
from ...models.types_offre import TypeOffre
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class LotAAccessRegressionsTestCase(AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.admin = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.admin)

        self.centre_a = Centre.objects.create(nom="Centre A", code_postal="59000")
        self.centre_b = Centre.objects.create(nom="Centre B", code_postal="75000")

        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI, couleur="#000000")
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.POEC, couleur="#FF0000")

        today = timezone.now().date()
        self.formation_a = Formation.objects.create(
            nom="Formation A",
            centre=self.centre_a,
            statut=self.statut,
            type_offre=self.type_offre,
            num_offre="A-001",
            start_date=today,
            end_date=today + timedelta(days=30),
            created_by=self.admin,
        )
        self.formation_b = Formation.objects.create(
            nom="Formation B",
            centre=self.centre_b,
            statut=self.statut,
            type_offre=self.type_offre,
            num_offre="B-001",
            start_date=today,
            end_date=today + timedelta(days=30),
            created_by=self.admin,
        )

        self.owner_a = UserFactory(role=CustomUser.ROLE_STAGIAIRE)
        self.owner_b = UserFactory(role=CustomUser.ROLE_STAGIAIRE)

        self.partenaire_a = Partenaire.objects.create(nom="Partenaire A", default_centre=self.centre_a)
        self.partenaire_b = Partenaire.objects.create(nom="Partenaire B", default_centre=self.centre_b)

        self.prospection_a = Prospection.objects.create(
            owner=self.owner_a,
            centre=self.centre_a,
            formation=self.formation_a,
            partenaire=self.partenaire_a,
            motif=ProspectionChoices.MOTIF_AUTRE,
            objectif=ProspectionChoices.OBJECTIF_PRISE_CONTACT,
            type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
            created_by=self.admin,
        )
        self.prospection_b = Prospection.objects.create(
            owner=self.owner_b,
            centre=self.centre_b,
            formation=self.formation_b,
            partenaire=self.partenaire_b,
            motif=ProspectionChoices.MOTIF_AUTRE,
            objectif=ProspectionChoices.OBJECTIF_PRISE_CONTACT,
            type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
            created_by=self.admin,
        )

        ProspectionComment.objects.create(
            prospection=self.prospection_a,
            body="Commentaire visible",
            created_by=self.admin,
        )
        ProspectionComment.objects.create(
            prospection=self.prospection_b,
            body="Commentaire cache",
            created_by=self.admin,
        )

        self.candidat_a = Candidat.objects.create(
            nom="Durand",
            prenom="Alice",
            formation=self.formation_a,
            created_by=self.admin,
        )
        self.appairage_a = Appairage.objects.create(
            candidat=self.candidat_a,
            partenaire=self.partenaire_a,
            formation=self.formation_a,
            statut=AppairageStatut.TRANSMIS,
            created_by=self.admin,
        )
        CommentaireAppairage.objects.create(
            appairage=self.appairage_a,
            body="Commentaire appairage visible",
            created_by=self.admin,
        )

        self.prepa_2025_a = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=today.replace(year=2025),
            centre=self.centre_a,
            nb_inscrits_prepa=10,
            nb_presents_prepa=7,
            created_by=self.admin,
        )
        self.prepa_2025_b = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=today.replace(year=2025),
            centre=self.centre_b,
            nb_inscrits_prepa=12,
            nb_presents_prepa=9,
            created_by=self.admin,
        )
        ObjectifPrepa.objects.create(centre=self.centre_a, annee=2025, valeur_objectif=20, created_by=self.admin)
        ObjectifPrepa.objects.create(centre=self.centre_b, annee=2025, valeur_objectif=40, created_by=self.admin)

        self.declic_2025_a = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=today.replace(year=2025),
            centre=self.centre_a,
            nb_inscrits_declic=10,
            nb_presents_declic=6,
            created_by=self.admin,
        )
        self.declic_2025_b = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=today.replace(year=2025),
            centre=self.centre_b,
            nb_inscrits_declic=10,
            nb_presents_declic=8,
            created_by=self.admin,
        )
        ObjectifDeclic.objects.create(centre=self.centre_a, annee=2025, valeur_objectif=15, created_by=self.admin)
        ObjectifDeclic.objects.create(centre=self.centre_b, annee=2025, valeur_objectif=30, created_by=self.admin)
        self.stagiaire_prepa_a = StagiairePrepa.objects.create(
            nom="Martin",
            prenom="Alice",
            centre=self.centre_a,
            prepa_origine=self.prepa_2025_a,
            created_by=self.admin,
        )
        self.stagiaire_prepa_b = StagiairePrepa.objects.create(
            nom="Bernard",
            prenom="Leo",
            centre=self.centre_b,
            prepa_origine=self.prepa_2025_b,
            created_by=self.admin,
        )
        self.participant_declic_a = ParticipantDeclic.objects.create(
            nom="Durand",
            prenom="Ines",
            centre=self.centre_a,
            declic_origine=self.declic_2025_a,
            created_by=self.admin,
        )
        self.participant_declic_b = ParticipantDeclic.objects.create(
            nom="Petit",
            prenom="Noah",
            centre=self.centre_b,
            declic_origine=self.declic_2025_b,
            created_by=self.admin,
        )
        self.atelier_a = AtelierTRE.objects.create(
            type_atelier=AtelierTRE.TypeAtelier.ATELIER_1,
            date_atelier=timezone.now(),
            centre=self.centre_a,
            created_by=self.admin,
        )
        self.atelier_b = AtelierTRE.objects.create(
            type_atelier=AtelierTRE.TypeAtelier.ATELIER_1,
            date_atelier=timezone.now(),
            centre=self.centre_b,
            created_by=self.admin,
        )
        self.evenement_a = Evenement.objects.create(
            formation=self.formation_a,
            type_evenement=Evenement.TypeEvenement.FORUM,
            event_date=today,
            created_by=self.admin,
        )
        self.evenement_b = Evenement.objects.create(
            formation=self.formation_b,
            type_evenement=Evenement.TypeEvenement.FORUM,
            event_date=today,
            created_by=self.admin,
        )

    def test_staff_without_centres_cannot_list_appairage_commentaires(self):
        staff = UserFactory(role=CustomUser.ROLE_STAFF)
        self.client.force_authenticate(user=staff)

        response = self.client.get(reverse("appairage-commentaire-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data.get("data", response.data)
        if isinstance(payload, dict) and "count" in payload:
            self.assertEqual(payload["count"], 0)
        elif isinstance(payload, dict) and "results" in payload:
            self.assertEqual(len(payload["results"]), 0)
        else:
            self.assertEqual(len(payload), 0)

    def test_staff_read_filter_options_on_prospection_comments_is_scoped(self):
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        staff_read.centres.add(self.centre_a)
        self.client.force_authenticate(user=staff_read)

        response = self.client.get(reverse("prospection-comment-filter-options"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Filtres commentaires de prospection récupérés avec succès.")
        self.assertEqual(response.data["data"]["centres"], [{"value": "Centre A", "label": "Centre A"}])
        self.assertEqual(response.data["data"]["formations"], [{"value": "Formation A", "label": "Formation A"}])
        self.assertEqual(response.data["data"]["partenaires"], [{"value": "Partenaire A", "label": "Partenaire A"}])

    def test_prepa_staff_cannot_create_prepa_outside_scope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.post(
            reverse("prepa-list"),
            {
                "type_prepa": Prepa.TypePrepa.ATELIER1,
                "date_prepa": "2025-05-10",
                "centre_id": self.centre_b.id,
                "nb_inscrits_prepa": 8,
                "nb_presents_prepa": 6,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Prepa.objects.filter(centre=self.centre_b, date_prepa="2025-05-10").exists())

    def test_commercial_cannot_access_prepa_module(self):
        commercial = UserFactory(role=CustomUser.ROLE_COMMERCIAL)
        commercial.centres.add(self.centre_a)
        self.client.force_authenticate(user=commercial)

        response = self.client.get(reverse("prepa-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_prepa_create_uses_success_envelope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.post(
            reverse("prepa-list"),
            {
                "type_prepa": Prepa.TypePrepa.ATELIER1,
                "date_prepa": "2025-05-11",
                "centre": self.centre_a.id,
                "nb_inscrits_prepa": 9,
                "nb_presents_prepa": 6,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Prépa créée avec succès.")
        self.assertEqual(response.data["data"]["centre"], self.centre_a.id)

    def test_prepa_retrieve_uses_success_envelope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.get(reverse("prepa-detail", args=[self.prepa_2025_a.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Prépa récupérée avec succès.")
        self.assertEqual(response.data["data"]["id"], self.prepa_2025_a.id)

    def test_prepa_patch_uses_success_envelope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.patch(
            reverse("prepa-detail", args=[self.prepa_2025_a.id]),
            {"nb_presents_prepa": 8},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Prépa mise à jour avec succès.")
        self.assertEqual(response.data["data"]["nb_presents_prepa"], 8)

    def test_staff_cannot_create_atelier_tre_outside_scope(self):
        staff = UserFactory(role=CustomUser.ROLE_STAFF)
        staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=staff)

        response = self.client.post(
            reverse("ateliers-tre-list"),
            {
                "type_atelier": AtelierTRE.TypeAtelier.ATELIER_1,
                "date_atelier": "2025-05-10T09:00:00Z",
                "centre": self.centre_b.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(AtelierTRE.objects.filter(centre=self.centre_b).exists())

    def test_prepa_stats_centres_are_scoped(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.get(reverse("prepa-stats-centres") + "?annee=2025")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"], {"Centre A": 7})

    def test_prepa_stats_can_expand_to_department_scope(self):
        centre_same_dept = Centre.objects.create(nom="Centre A2", code_postal="59100")
        Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=self.prepa_2025_a.date_prepa,
            centre=centre_same_dept,
            nb_inscrits_prepa=5,
            nb_presents_prepa=4,
            created_by=self.admin,
        )

        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.get(reverse("prepa-stats-centres") + "?annee=2025&scope=departement")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"], {"Centre A": 7, "Centre A2": 4})

    def test_prepa_delete_archives_instance(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.delete(reverse("prepa-detail", args=[self.prepa_2025_a.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.prepa_2025_a.refresh_from_db()
        self.assertFalse(self.prepa_2025_a.is_active)

    def test_prepa_list_excludes_archived_sessions(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        self.prepa_2025_a.is_active = False
        self.prepa_2025_a.save(update_fields=["is_active"])

        response = self.client.get(reverse("prepa-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]["results"]
        returned_ids = [item["id"] for item in results]
        self.assertNotIn(self.prepa_2025_a.id, returned_ids)

    def test_stagiaire_prepa_delete_archives_instance(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.delete(reverse("stagiaire-prepa-detail", args=[self.stagiaire_prepa_a.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.stagiaire_prepa_a.refresh_from_db()
        self.assertFalse(self.stagiaire_prepa_a.is_active)

    def test_stagiaire_prepa_create_uses_success_envelope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.post(
            reverse("stagiaire-prepa-list"),
            {
                "nom": "Lemoine",
                "prenom": "Sarah",
                "centre": self.centre_a.id,
                "prepa_origine": self.prepa_2025_a.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Stagiaire Prépa créé avec succès.")
        self.assertEqual(response.data["data"]["centre"], self.centre_a.id)

    def test_prepa_staff_cannot_create_stagiaire_with_out_of_scope_prepa_origine(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.post(
            reverse("stagiaire-prepa-list"),
            {
                "nom": "Lemoine",
                "prenom": "Sarah",
                "centre_id": self.centre_a.id,
                "prepa_origine_id": self.prepa_2025_b.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_commercial_cannot_access_stagiaire_prepa_module(self):
        commercial = UserFactory(role=CustomUser.ROLE_COMMERCIAL)
        commercial.centres.add(self.centre_a)
        self.client.force_authenticate(user=commercial)

        response = self.client.get(reverse("stagiaire-prepa-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_stagiaire_prepa_retrieve_uses_success_envelope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.get(reverse("stagiaire-prepa-detail", args=[self.stagiaire_prepa_a.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Stagiaire Prépa récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], self.stagiaire_prepa_a.id)

    def test_stagiaire_prepa_patch_uses_success_envelope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.patch(
            reverse("stagiaire-prepa-detail", args=[self.stagiaire_prepa_a.id]),
            {"telephone": "0612345678"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Stagiaire Prépa mis à jour avec succès.")
        self.assertEqual(response.data["data"]["telephone"], "0612345678")

    def test_stagiaire_prepa_list_excludes_archived_instances(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        self.stagiaire_prepa_a.is_active = False
        self.stagiaire_prepa_a.save(update_fields=["is_active"])

        response = self.client.get(reverse("stagiaire-prepa-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        returned_ids = [item["id"] for item in results]
        self.assertNotIn(self.stagiaire_prepa_a.id, returned_ids)

    def test_stagiaire_prepa_meta_uses_success_envelope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.get(reverse("stagiaire-prepa-meta"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Métadonnées stagiaires Prépa récupérées avec succès.")
        self.assertIn("centres", response.data["data"])
        self.assertIn("annees", response.data["data"])

    def test_prepa_staff_cannot_create_objectif_outside_scope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.post(
            reverse("objectif-prepa-list"),
            {"centre_id": self.centre_b.id, "annee": 2026, "valeur_objectif": 25},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(ObjectifPrepa.objects.filter(centre=self.centre_b, annee=2026).exists())

    def test_declic_staff_cannot_create_declic_outside_scope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.post(
            reverse("declic-list"),
            {
                "type_declic": Declic.TypeDeclic.ATELIER1,
                "date_declic": "2025-05-10",
                "centre_id": self.centre_b.id,
                "nb_inscrits_declic": 8,
                "nb_presents_declic": 6,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Declic.objects.filter(centre=self.centre_b, date_declic="2025-05-10").exists())

    def test_charge_recrutement_cannot_access_declic_module(self):
        charge = UserFactory(role=CustomUser.ROLE_CHARGE_RECRUTEMENT)
        charge.centres.add(self.centre_a)
        self.client.force_authenticate(user=charge)

        response = self.client.get(reverse("declic-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_cannot_create_evenement_outside_scope(self):
        staff = UserFactory(role=CustomUser.ROLE_STAFF)
        staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=staff)

        response = self.client.post(
            reverse("evenement-list"),
            {
                "formation_id": self.formation_b.id,
                "type_evenement": "forum",
                "event_date": "2025-05-10",
                "lieu": "Centre B",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_delete_atelier_tre_archives_instance(self):
        staff = UserFactory(role=CustomUser.ROLE_STAFF)
        staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=staff)

        response = self.client.delete(reverse("ateliers-tre-detail", args=[self.atelier_a.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.atelier_a.refresh_from_db()
        self.assertFalse(self.atelier_a.is_active)

    def test_staff_list_atelier_tre_excludes_archived_instances(self):
        staff = UserFactory(role=CustomUser.ROLE_STAFF)
        staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=staff)

        self.atelier_a.is_active = False
        self.atelier_a.save(update_fields=["is_active"])

        response = self.client.get(reverse("ateliers-tre-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data.get("data", response.data)
        results = payload["results"] if isinstance(payload, dict) else payload
        returned_ids = [item["id"] for item in results]
        self.assertNotIn(self.atelier_a.id, returned_ids)

    def test_staff_delete_evenement_archives_instance(self):
        staff = UserFactory(role=CustomUser.ROLE_STAFF)
        staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=staff)

        response = self.client.delete(reverse("evenement-detail", args=[self.evenement_a.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.evenement_a.refresh_from_db()
        self.assertFalse(self.evenement_a.is_active)

    def test_staff_list_evenements_excludes_archived_instances(self):
        staff = UserFactory(role=CustomUser.ROLE_STAFF)
        staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=staff)

        self.evenement_a.is_active = False
        self.evenement_a.save(update_fields=["is_active"])

        response = self.client.get(reverse("evenement-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data.get("data", response.data)
        results = payload["results"] if isinstance(payload, dict) and "results" in payload else payload
        returned_ids = [item["id"] for item in results]
        self.assertNotIn(self.evenement_a.id, returned_ids)

    def test_declic_stats_centres_are_scoped(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.get(reverse("declic-stats-centres") + "?annee=2025")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"], {"Centre A": 6})

    def test_declic_stats_can_expand_to_department_scope(self):
        centre_same_dept = Centre.objects.create(nom="Centre A2", code_postal="59100")
        Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=self.declic_2025_a.date_declic,
            centre=centre_same_dept,
            nb_inscrits_declic=5,
            nb_presents_declic=4,
            created_by=self.admin,
        )

        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.get(reverse("declic-stats-centres") + "?annee=2025&scope=departement")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"], {"Centre A": 6, "Centre A2": 4})

    def test_declic_delete_archives_instance(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.delete(reverse("declic-detail", args=[self.declic_2025_a.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.declic_2025_a.refresh_from_db()
        self.assertFalse(self.declic_2025_a.is_active)

    def test_declic_create_uses_success_envelope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.post(
            reverse("declic-list"),
            {
                "type_declic": Declic.TypeDeclic.ATELIER1,
                "date_declic": "2025-05-11",
                "centre": self.centre_a.id,
                "nb_inscrits_declic": 9,
                "nb_presents_declic": 5,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Déclic créée avec succès.")
        self.assertEqual(response.data["data"]["centre"], self.centre_a.id)

    def test_declic_retrieve_uses_success_envelope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.get(reverse("declic-detail", args=[self.declic_2025_a.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Déclic récupérée avec succès.")
        self.assertEqual(response.data["data"]["id"], self.declic_2025_a.id)

    def test_declic_patch_uses_success_envelope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.patch(
            reverse("declic-detail", args=[self.declic_2025_a.id]),
            {"nb_presents_declic": 7},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Déclic mise à jour avec succès.")
        self.assertEqual(response.data["data"]["nb_presents_declic"], 7)

    def test_declic_list_excludes_archived_sessions(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        self.declic_2025_a.is_active = False
        self.declic_2025_a.save(update_fields=["is_active"])

        response = self.client.get(reverse("declic-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]["results"]
        returned_ids = [item["id"] for item in results]
        self.assertNotIn(self.declic_2025_a.id, returned_ids)

    def test_participant_declic_delete_archives_instance(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.delete(reverse("participant-declic-detail", args=[self.participant_declic_a.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.participant_declic_a.refresh_from_db()
        self.assertFalse(self.participant_declic_a.is_active)

    def test_participant_declic_create_uses_success_envelope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.post(
            reverse("participant-declic-list"),
            {
                "nom": "Roux",
                "prenom": "Mila",
                "centre": self.centre_a.id,
                "declic_origine": self.declic_2025_a.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Participant Déclic créé avec succès.")
        self.assertEqual(response.data["data"]["centre"], self.centre_a.id)

    def test_declic_staff_cannot_create_participant_with_out_of_scope_declic_origine(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.post(
            reverse("participant-declic-list"),
            {
                "nom": "Roux",
                "prenom": "Mila",
                "centre_id": self.centre_a.id,
                "declic_origine_id": self.declic_2025_b.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_charge_recrutement_cannot_access_participant_declic_module(self):
        charge = UserFactory(role=CustomUser.ROLE_CHARGE_RECRUTEMENT)
        charge.centres.add(self.centre_a)
        self.client.force_authenticate(user=charge)

        response = self.client.get(reverse("participant-declic-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_participant_declic_retrieve_uses_success_envelope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.get(reverse("participant-declic-detail", args=[self.participant_declic_a.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Participant Déclic récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], self.participant_declic_a.id)

    def test_participant_declic_patch_uses_success_envelope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.patch(
            reverse("participant-declic-detail", args=[self.participant_declic_a.id]),
            {"telephone": "0698765432"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Participant Déclic mis à jour avec succès.")
        self.assertEqual(response.data["data"]["telephone"], "0698765432")

    def test_participant_declic_list_excludes_archived_instances(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        self.participant_declic_a.is_active = False
        self.participant_declic_a.save(update_fields=["is_active"])

        response = self.client.get(reverse("participant-declic-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        returned_ids = [item["id"] for item in results]
        self.assertNotIn(self.participant_declic_a.id, returned_ids)

    def test_participant_declic_meta_uses_success_envelope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.get(reverse("participant-declic-meta"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Métadonnées participants Déclic récupérées avec succès.")
        self.assertIn("centres", response.data["data"])
        self.assertIn("annees", response.data["data"])

    def test_prepa_filters_uses_success_envelope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.get(reverse("prepa-filters"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("annees", response.data["data"])
        self.assertIn("centres", response.data["data"])

    def test_prepa_objectifs_list_uses_success_envelope(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.get(reverse("objectif-prepa-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIsInstance(response.data["data"], dict)
        self.assertIn("results", response.data["data"])

    def test_commercial_cannot_access_prepa_objectifs_module(self):
        commercial = UserFactory(role=CustomUser.ROLE_COMMERCIAL)
        commercial.centres.add(self.centre_a)
        self.client.force_authenticate(user=commercial)

        response = self.client.get(reverse("objectif-prepa-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_prepa_objectif_delete_archives_instance(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        objectif = ObjectifPrepa.objects.get(centre=self.centre_a, annee=2025)
        response = self.client.delete(reverse("objectif-prepa-detail", args=[objectif.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        objectif.refresh_from_db()
        self.assertFalse(objectif.is_active)

    def test_prepa_objectifs_list_excludes_archived_instances(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=prepa_staff)

        objectif = ObjectifPrepa.objects.get(centre=self.centre_a, annee=2025)
        objectif.is_active = False
        objectif.save(update_fields=["is_active"])

        response = self.client.get(reverse("objectif-prepa-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]["results"]
        returned_ids = [item["id"] for item in results]
        self.assertNotIn(objectif.id, returned_ids)

    def test_declic_filters_uses_success_envelope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.get(reverse("declic-filters"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("annees", response.data["data"])
        self.assertIn("centres", response.data["data"])

    def test_declic_objectif_retrieve_uses_success_envelope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        objectif = ObjectifDeclic.objects.get(centre=self.centre_a, annee=2025)
        response = self.client.get(reverse("objectifs-declic-detail", args=[objectif.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["id"], objectif.id)

    def test_charge_recrutement_cannot_access_declic_objectifs_module(self):
        charge = UserFactory(role=CustomUser.ROLE_CHARGE_RECRUTEMENT)
        charge.centres.add(self.centre_a)
        self.client.force_authenticate(user=charge)

        response = self.client.get(reverse("objectifs-declic-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_declic_objectif_delete_archives_instance(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        objectif = ObjectifDeclic.objects.get(centre=self.centre_a, annee=2025)
        response = self.client.delete(reverse("objectifs-declic-detail", args=[objectif.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        objectif.refresh_from_db()
        self.assertFalse(objectif.is_active)

    def test_declic_objectifs_list_excludes_archived_instances(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        objectif = ObjectifDeclic.objects.get(centre=self.centre_a, annee=2025)
        objectif.is_active = False
        objectif.save(update_fields=["is_active"])

        response = self.client.get(reverse("objectifs-declic-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]["results"]
        returned_ids = [item["id"] for item in results]
        self.assertNotIn(objectif.id, returned_ids)

    def test_declic_staff_cannot_create_objectif_outside_scope(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(self.centre_a)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.post(
            reverse("objectifs-declic-list"),
            {"centre_id": self.centre_b.id, "annee": 2026, "valeur_objectif": 25},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(ObjectifDeclic.objects.filter(centre=self.centre_b, annee=2026).exists())
