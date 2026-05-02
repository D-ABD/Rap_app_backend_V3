"""Tests relatifs aux sérialiseurs Prépa Compétences."""

from datetime import date

from django.test import TestCase
from django.utils import timezone

from rap_app.api.serializers.prepa_serializers import PrepaSerializer, StagiairePrepaSerializer
from rap_app.models.centres import Centre
from rap_app.models.prepa import (
    ObjectifPrepa,
    Prepa,
    PrepaPresenceStatut,
    PrepaStagiaireParticipation,
    StagiairePrepa,
)
from rap_app.tests.factories import UserFactory


class StagiairePrepaSerializerTests(TestCase):
    """Valide les enrichissements additifs du sérialiseur StagiairePrepa."""

    def setUp(self):
        self.user = UserFactory()
        self.centre = Centre.objects.create(nom="Centre Lille", code_postal="59000", created_by=self.user)
        self.autre_centre = Centre.objects.create(nom="Centre Amiens", code_postal="80000", created_by=self.user)
        self.prepa = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.INFO_COLLECTIVE,
            date_prepa=timezone.localdate(),
            centre=self.centre,
            created_by=self.user,
        )

    def test_serializer_exposes_calculated_parcours_fields(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.prepa,
            nom="Martin",
            prenom="Lina",
            atelier_1_realise=True,
            date_atelier_1=timezone.localdate(),
            prochain_atelier_prevu=Prepa.TypePrepa.ATELIER3,
            statut_positionnement=StagiairePrepa.StatutPositionnement.POSITIONNE,
            created_by=self.user,
        )

        data = StagiairePrepaSerializer(instance=stagiaire).data

        self.assertEqual(data["statut_parcours_calcule"], StagiairePrepa.StatutParcours.EN_PARCOURS)
        self.assertEqual(data["prochain_atelier_attendu"], Prepa.TypePrepa.ATELIER3)
        self.assertEqual(data["prochain_atelier_attendu_display"], "Atelier 3")
        self.assertEqual(data["statut_positionnement_display"], "Positionné")
        self.assertEqual(str(data["date_ic"]), str(self.prepa.date_prepa))

    def test_serializer_exposes_current_workshop_when_en_parcours(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.prepa,
            nom="Martin",
            prenom="Lina",
            atelier_1_realise=True,
            date_atelier_1=timezone.localdate(),
            created_by=self.user,
        )
        atelier_3 = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER3,
            date_prepa=timezone.localdate(),
            date_debut_atelier=timezone.localdate(),
            centre=self.centre,
            created_by=self.user,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=atelier_3,
            stagiaire_prepa=stagiaire,
            statut=PrepaPresenceStatut.INSCRIT,
            created_by=self.user,
        )

        data = StagiairePrepaSerializer(instance=stagiaire).data

        self.assertEqual(data["atelier_en_cours"], Prepa.TypePrepa.ATELIER3)
        self.assertEqual(data["atelier_en_cours_display"], "Atelier 3")

    def test_serializer_exposes_liberating_last_participation_status(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.prepa,
            nom="Martin",
            prenom="Lina",
            atelier_1_realise=True,
            date_atelier_1=timezone.localdate(),
            created_by=self.user,
        )
        atelier_2 = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER2,
            date_prepa=timezone.localdate(),
            date_debut_atelier=timezone.localdate(),
            centre=self.centre,
            created_by=self.user,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=atelier_2,
            stagiaire_prepa=stagiaire,
            statut=PrepaPresenceStatut.A_REPOSITIONNER,
            created_by=self.user,
        )

        data = StagiairePrepaSerializer(instance=stagiaire).data

        self.assertEqual(data["dernier_statut_participation"], PrepaPresenceStatut.A_REPOSITIONNER)
        self.assertEqual(data["dernier_statut_participation_display"], "À repositionner")
        self.assertTrue(data["dernier_statut_participation_liberant"])

    def test_serializer_exposes_waiting_flags_for_parcours_pilotage(self):
        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            prepa_origine=self.prepa,
            nom="Bernard",
            prenom="Noah",
            created_by=self.user,
        )

        data = StagiairePrepaSerializer(instance=stagiaire).data

        self.assertTrue(data["est_en_attente_entree"])
        self.assertTrue(data["est_a_integrer_atelier_1"])
        self.assertFalse(data["est_en_attente_prochain_atelier"])

    def test_serializer_requires_afpa_target_fields_when_oriented_afpa(self):
        serializer = StagiairePrepaSerializer(
            data={
                "centre_id": self.centre.id,
                "nom": "Bernard",
                "prenom": "Noah",
                "orientation_finale": StagiairePrepa.OrientationFinale.AFPA,
                "date_bilan": "2026-04-20",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("centre_afpa_cible_texte", serializer.errors)
        self.assertIn("formation_afpa_cible", serializer.errors)

    def test_serializer_accepts_complete_afpa_orientation_payload(self):
        serializer = StagiairePrepaSerializer(
            data={
                "centre_id": self.centre.id,
                "nom": "Bernard",
                "prenom": "Noah",
                "orientation_finale": StagiairePrepa.OrientationFinale.AUTRE_CENTRE_AFPA,
                "centre_afpa_cible_texte": "AFPA Meudon",
                "formation_afpa_cible": "Titre professionnel RH",
                "date_bilan": "2026-04-20",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_serializer_rejects_probable_duplicate_in_same_centre(self):
        StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Bernard",
            prenom="Noah",
            email="noah@example.com",
            created_by=self.user,
        )

        serializer = StagiairePrepaSerializer(
            data={
                "centre_id": self.centre.id,
                "nom": "Bernard",
                "prenom": "Noah",
                "email": "noah@example.com",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)


class PrepaSerializerParticipationTests(TestCase):
    """Valide le pilotage atelier via participation nominative + complément manuel."""

    def setUp(self):
        self.user = UserFactory()
        self.centre = Centre.objects.create(nom="Centre Roubaix", code_postal="59100", created_by=self.user)
        self.stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Durand",
            prenom="Nina",
            created_by=self.user,
        )

    def _mark_at1_done(self):
        self.stagiaire.atelier_1_realise = True
        self.stagiaire.date_atelier_1 = date(2026, 4, 20)
        self.stagiaire.save(update_fields=["atelier_1_realise", "date_atelier_1"])

    def test_serializer_creates_participation_and_syncs_totals(self):
        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.ATELIER1,
                "date_prepa": "2026-04-27",
                "date_debut_atelier": "2026-04-27",
                "date_fin_atelier": "2026-04-27",
                "centre_id": self.centre.id,
                "nb_inscrits_prepa_hors_liste": 2,
                "nb_absents_prepa_hors_liste": 1,
                "participations_prepa": [
                    {
                        "stagiaire_prepa_id": self.stagiaire.id,
                        "statut": PrepaPresenceStatut.PRESENT,
                    }
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()

        self.assertEqual(instance.nb_inscrits_prepa, 3)
        self.assertEqual(instance.nb_presents_prepa, 1)
        self.assertEqual(instance.nb_absents_prepa, 1)
        self.assertEqual(instance.nb_inscrits_prepa_nominatifs, 1)
        self.assertEqual(instance.nb_presents_prepa_nominatifs, 1)

        participation = PrepaStagiaireParticipation.objects.get(prepa=instance, stagiaire_prepa=self.stagiaire)
        self.assertEqual(participation.statut, PrepaPresenceStatut.PRESENT)

        self.stagiaire.refresh_from_db()
        self.assertTrue(self.stagiaire.atelier_1_realise)
        self.assertEqual(str(self.stagiaire.date_atelier_1), "2026-04-27")

    def test_serializer_rejects_end_date_before_start_date(self):
        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.ATELIER2,
                "date_prepa": "2026-04-27",
                "date_debut_atelier": "2026-04-28",
                "date_fin_atelier": "2026-04-27",
                "centre_id": self.centre.id,
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("date_fin_atelier", serializer.errors)

    def test_serializer_allows_stagiaire_already_registered_on_other_active_atelier(self):
        self._mark_at1_done()
        autre_atelier = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER2,
            date_prepa=timezone.localdate(),
            date_debut_atelier=timezone.localdate(),
            centre=self.centre,
            created_by=self.user,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=autre_atelier,
            stagiaire_prepa=self.stagiaire,
            statut=PrepaPresenceStatut.INSCRIT,
            created_by=self.user,
        )

        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.ATELIER3,
                "date_prepa": "2026-04-27",
                "date_debut_atelier": "2026-04-27",
                "date_fin_atelier": "2026-04-27",
                "centre_id": self.centre.id,
                "participations_prepa": [
                    {
                        "stagiaire_prepa_id": self.stagiaire.id,
                        "statut": PrepaPresenceStatut.INSCRIT,
                    }
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_serializer_allows_stagiaire_absent_on_other_active_atelier(self):
        self._mark_at1_done()
        autre_atelier = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER2,
            date_prepa=timezone.localdate(),
            date_debut_atelier=timezone.localdate(),
            centre=self.centre,
            created_by=self.user,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=autre_atelier,
            stagiaire_prepa=self.stagiaire,
            statut=PrepaPresenceStatut.ABSENT,
            created_by=self.user,
        )

        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.ATELIER3,
                "date_prepa": "2026-04-27",
                "date_debut_atelier": "2026-04-27",
                "date_fin_atelier": "2026-04-27",
                "centre_id": self.centre.id,
                "participations_prepa": [
                    {
                        "stagiaire_prepa_id": self.stagiaire.id,
                        "statut": PrepaPresenceStatut.INSCRIT,
                    }
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_serializer_allows_stagiaire_on_new_atelier_when_previous_is_termine(self):
        self._mark_at1_done()
        autre_atelier = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER2,
            date_prepa=timezone.localdate(),
            date_debut_atelier=timezone.localdate(),
            centre=self.centre,
            created_by=self.user,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=autre_atelier,
            stagiaire_prepa=self.stagiaire,
            statut=PrepaPresenceStatut.TERMINE,
            created_by=self.user,
        )

        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.ATELIER3,
                "date_prepa": "2026-04-27",
                "date_debut_atelier": "2026-04-27",
                "date_fin_atelier": "2026-04-27",
                "centre_id": self.centre.id,
                "participations_prepa": [
                    {
                        "stagiaire_prepa_id": self.stagiaire.id,
                        "statut": PrepaPresenceStatut.INSCRIT,
                    }
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_serializer_allows_stagiaire_on_new_atelier_when_previous_is_a_repositionner(self):
        self._mark_at1_done()
        autre_atelier = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER2,
            date_prepa=timezone.localdate(),
            date_debut_atelier=timezone.localdate(),
            centre=self.centre,
            created_by=self.user,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=autre_atelier,
            stagiaire_prepa=self.stagiaire,
            statut=PrepaPresenceStatut.A_REPOSITIONNER,
            created_by=self.user,
        )

        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.ATELIER3,
                "date_prepa": "2026-04-27",
                "date_debut_atelier": "2026-04-27",
                "date_fin_atelier": "2026-04-27",
                "centre_id": self.centre.id,
                "participations_prepa": [
                    {
                        "stagiaire_prepa_id": self.stagiaire.id,
                        "statut": PrepaPresenceStatut.INSCRIT,
                    }
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_termine_counts_as_present_and_marks_workshop_done(self):
        self._mark_at1_done()
        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.ATELIER2,
                "date_prepa": "2026-04-27",
                "date_debut_atelier": "2026-04-27",
                "date_fin_atelier": "2026-04-27",
                "centre_id": self.centre.id,
                "participations_prepa": [
                    {
                        "stagiaire_prepa_id": self.stagiaire.id,
                        "statut": PrepaPresenceStatut.TERMINE,
                    }
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()

        self.assertEqual(instance.nb_inscrits_prepa, 1)
        self.assertEqual(instance.nb_presents_prepa, 1)
        self.assertEqual(instance.nb_absents_prepa, 0)
        self.assertEqual(instance.nb_presents_prepa_nominatifs, 1)

        participation = PrepaStagiaireParticipation.objects.get(prepa=instance, stagiaire_prepa=self.stagiaire)
        self.assertEqual(participation.statut, PrepaPresenceStatut.PRESENT)

        self.stagiaire.refresh_from_db()
        self.assertTrue(self.stagiaire.atelier_2_realise)
        self.assertEqual(str(self.stagiaire.date_atelier_2), "2026-04-27")

    def test_inscrit_counts_as_absent_for_operational_totals(self):
        self._mark_at1_done()
        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.ATELIER2,
                "date_prepa": "2026-04-27",
                "date_debut_atelier": "2026-04-27",
                "date_fin_atelier": "2026-04-27",
                "centre_id": self.centre.id,
                "participations_prepa": [
                    {
                        "stagiaire_prepa_id": self.stagiaire.id,
                        "statut": PrepaPresenceStatut.INSCRIT,
                    }
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()

        self.assertEqual(instance.nb_inscrits_prepa, 1)
        self.assertEqual(instance.nb_presents_prepa, 0)
        self.assertEqual(instance.nb_absents_prepa, 1)
        self.assertEqual(instance.nb_absents_prepa_nominatifs, 1)

    def test_a_repositionner_counts_as_absent_and_does_not_mark_workshop_done(self):
        self._mark_at1_done()
        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.ATELIER2,
                "date_prepa": "2026-04-27",
                "date_debut_atelier": "2026-04-27",
                "date_fin_atelier": "2026-04-27",
                "centre_id": self.centre.id,
                "participations_prepa": [
                    {
                        "stagiaire_prepa_id": self.stagiaire.id,
                        "statut": PrepaPresenceStatut.A_REPOSITIONNER,
                    }
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()

        self.assertEqual(instance.nb_inscrits_prepa, 1)
        self.assertEqual(instance.nb_presents_prepa, 0)
        self.assertEqual(instance.nb_absents_prepa, 1)
        self.assertEqual(instance.nb_absents_prepa_nominatifs, 1)

        self.stagiaire.refresh_from_db()
        self.assertFalse(self.stagiaire.atelier_2_realise)
        self.assertIsNone(self.stagiaire.date_atelier_2)

    def test_serializer_reuses_existing_stagiaire_instead_of_creating_duplicate(self):
        self._mark_at1_done()
        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.ATELIER2,
                "date_prepa": "2026-04-27",
                "date_debut_atelier": "2026-04-27",
                "date_fin_atelier": "2026-04-27",
                "centre_id": self.centre.id,
                "participations_prepa": [
                    {
                        "nom": "Durand",
                        "prenom": "Nina",
                        "statut": PrepaPresenceStatut.INSCRIT,
                    }
                ],
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_serializer_rejects_same_stagiaire_twice_in_same_atelier_payload(self):
        self._mark_at1_done()
        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.ATELIER2,
                "date_prepa": "2026-04-27",
                "date_debut_atelier": "2026-04-27",
                "date_fin_atelier": "2026-04-27",
                "centre_id": self.centre.id,
                "participations_prepa": [
                    {
                        "stagiaire_prepa_id": self.stagiaire.id,
                        "statut": PrepaPresenceStatut.INSCRIT,
                    },
                    {
                        "stagiaire_prepa_id": self.stagiaire.id,
                        "statut": PrepaPresenceStatut.PRESENT,
                    },
                ],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("participations_prepa", serializer.errors)

    def test_serializer_rejects_non_at1_participation_without_at1(self):
        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.ATELIER2,
                "date_prepa": "2026-04-27",
                "date_debut_atelier": "2026-04-27",
                "date_fin_atelier": "2026-04-27",
                "centre_id": self.centre.id,
                "participations_prepa": [
                    {
                        "stagiaire_prepa_id": self.stagiaire.id,
                        "statut": PrepaPresenceStatut.INSCRIT,
                    }
                ],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("participations_prepa", serializer.errors)
        self.assertIn("Atelier 1", serializer.errors["participations_prepa"][0])

    def test_serializer_update_resets_totals_when_all_participations_are_removed(self):
        atelier = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER2,
            date_prepa=date(2026, 4, 27),
            date_debut_atelier=date(2026, 4, 27),
            date_fin_atelier=date(2026, 4, 27),
            centre=self.centre,
            nb_inscrits_prepa_hors_liste=1,
            nb_presents_prepa_hors_liste=1,
            created_by=self.user,
        )
        PrepaStagiaireParticipation.objects.create(
            prepa=atelier,
            stagiaire_prepa=self.stagiaire,
            statut=PrepaPresenceStatut.PRESENT,
            created_by=self.user,
        )
        atelier.save(user=self.user)

        serializer = PrepaSerializer(
            instance=atelier,
            data={
                "type_prepa": Prepa.TypePrepa.ATELIER2,
                "date_prepa": "2026-04-27",
                "date_debut_atelier": "2026-04-27",
                "date_fin_atelier": "2026-04-27",
                "centre_id": self.centre.id,
                "nb_inscrits_prepa_hors_liste": 0,
                "nb_presents_prepa_hors_liste": 0,
                "nb_absents_prepa_hors_liste": 0,
                "participations_prepa": [],
            },
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated = serializer.save()

        self.assertEqual(updated.nb_inscrits_prepa, 0)
        self.assertEqual(updated.nb_presents_prepa, 0)
        self.assertEqual(updated.nb_absents_prepa, 0)
        self.assertEqual(updated.participations_stagiaires_prepa.count(), 0)

    def test_information_collective_rejects_nominative_participations(self):
        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.INFO_COLLECTIVE,
                "date_prepa": "2026-04-27",
                "centre_id": self.centre.id,
                "nombre_places_ouvertes": 12,
                "nombre_prescriptions": 10,
                "nb_presents_info": 8,
                "participations_prepa": [
                    {
                        "stagiaire_prepa_id": self.stagiaire.id,
                        "statut": PrepaPresenceStatut.PRESENT,
                    }
                ],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("participations_prepa", serializer.errors)

    def test_information_collective_rejects_nominative_stagiaires(self):
        serializer = PrepaSerializer(
            data={
                "type_prepa": Prepa.TypePrepa.INFO_COLLECTIVE,
                "date_prepa": "2026-04-27",
                "centre_id": self.centre.id,
                "nombre_places_ouvertes": 12,
                "nombre_prescriptions": 10,
                "nb_presents_info": 8,
                "stagiaires_prepa": [
                    {
                        "nom": "Durand",
                        "prenom": "Nina",
                    }
                ],
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("stagiaires_prepa", serializer.errors)


class ObjectifPrepaMetricsTests(TestCase):
    """Valide la séparation adhésions / engagés / réels sur les objectifs Prépa."""

    def setUp(self):
        self.user = UserFactory()
        self.centre = Centre.objects.create(nom="Centre Tourcoing", code_postal="59200", created_by=self.user)
        self.objectif = ObjectifPrepa.objects.create(
            centre=self.centre,
            annee=2026,
            valeur_objectif=10,
            created_by=self.user,
        )
        Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.INFO_COLLECTIVE,
            date_prepa=date(2026, 1, 15),
            centre=self.centre,
            nombre_places_ouvertes=12,
            nombre_prescriptions=9,
            nb_presents_info=8,
            nb_adhesions=4,
            created_by=self.user,
        )
        Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=date(2026, 2, 1),
            centre=self.centre,
            nb_inscrits_prepa=7,
            nb_presents_prepa=5,
            nb_absents_prepa=2,
            created_by=self.user,
        )
        Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER2,
            date_prepa=date(2026, 2, 8),
            centre=self.centre,
            nb_inscrits_prepa=6,
            nb_presents_prepa=4,
            nb_absents_prepa=2,
            created_by=self.user,
        )
        Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER6,
            date_prepa=date(2026, 3, 1),
            centre=self.centre,
            nb_inscrits_prepa=3,
            nb_presents_prepa=3,
            nb_absents_prepa=0,
            created_by=self.user,
        )

    def test_objectif_exposes_split_metrics_on_atelier_1(self):
        self.assertEqual(self.objectif.data_prepa["atelier1_inscrits"], 7)
        self.assertEqual(self.objectif.data_prepa["atelier1_presents"], 5)
        self.assertEqual(self.objectif.data_prepa["adhesions"], 4)
        self.assertEqual(self.objectif.taux_atteinte_inscrits, 70.0)
        self.assertEqual(self.objectif.taux_atteinte_presents, 50.0)
        self.assertEqual(self.objectif.reste_a_faire_inscrits, 3)
        self.assertEqual(self.objectif.reste_a_faire_presents, 5)

    def test_synthese_globale_keeps_adhesions_separate_from_real(self):
        data = self.objectif.synthese_globale()

        self.assertEqual(data["engages_atelier_1"], 7)
        self.assertEqual(data["realise"], 5)
        self.assertEqual(data["adhesions"], 4)
        self.assertEqual(data["taux_atteinte_inscrits"], 70.0)
        self.assertEqual(data["taux_atteinte_presents"], 50.0)
