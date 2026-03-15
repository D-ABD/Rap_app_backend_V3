"""
Tests des modèles VAE et SuiviJury.

Les dates de test sont dynamiques pour respecter la validation full_clean() du modèle
HistoriqueStatutVAE : date_changement_effectif ne peut être ni dans le futur ni
antérieure à la date de création de la VAE liée.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from ...models.centres import Centre
from ...models.jury import SuiviJury
from ...models.vae import VAE, HistoriqueStatutVAE
from .setup_base_tests import BaseModelTestSetupMixin


class SuiviJuryModelTest(BaseModelTestSetupMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.centre = self.create_instance(Centre, nom="Centre Test")
        self.suivi = SuiviJury.objects.create(
            centre=self.centre, annee=2025, mois=5, objectif_jury=10, jurys_realises=7, created_by=self.user
        )

    def test_str_and_repr(self):
        self.assertIn("Jurys", str(self.suivi))
        self.assertIn("periode=", repr(self.suivi))

    def test_calculs_pourcentage_et_ecart(self):
        self.assertEqual(self.suivi.pourcentage_atteinte, Decimal("70.00"))
        self.assertEqual(self.suivi.ecart(), -3)

    def test_to_serializable_dict(self):
        data = self.suivi.to_serializable_dict()
        self.assertEqual(data["jurys_realises"], 7)
        self.assertEqual(data["objectif_jury"], 10)

    def test_to_csv_row(self):
        row = self.suivi.to_csv_row()
        self.assertEqual(row[6], 7)  # jurys_realises


class VAEModelTest(BaseModelTestSetupMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.centre = self.create_instance(Centre, nom="Centre Test")
        self.vae = VAE.objects.create(centre=self.centre, statut="jury", commentaire="Test", created_by=self.user)

    def test_reference_auto_generee(self):
        self.assertTrue(self.vae.reference.startswith("VAE-"))

    def test_is_en_cours_et_terminee(self):
        self.assertTrue(self.vae.is_en_cours())
        self.vae.statut = "terminee"
        self.vae.save()
        self.assertTrue(self.vae.is_terminee())

    def test_duree_jours_et_duree_statut(self):
        self.assertGreaterEqual(self.vae.duree_jours, 0)
        self.assertEqual(self.vae.duree_statut_actuel(), self.vae.duree_jours)

    def changer_statut(self, nouveau_statut, date_effet=None, commentaire="", user=None):
        """
        📝 Change le statut de manière contrôlée avec historique
        """
        if nouveau_statut not in dict(self.STATUT_CHOICES):
            raise ValidationError(f"Statut invalide: {nouveau_statut}")

        date_effet = date_effet or timezone.now().date()

        # ✅ Désactiver le signal (via attribut temporaire)
        self._skip_historique_signal = True
        self.statut = nouveau_statut
        self.save(user=user)
        del self._skip_historique_signal  # Supprimer après sauvegarde

        # ✅ Création manuelle unique de l'historique
        HistoriqueStatutVAE.objects.create(
            vae=self, statut=nouveau_statut, date_changement_effectif=date_effet, commentaire=commentaire
        )

    def test_changer_statut_invalide(self):
        with self.assertRaises(ValidationError):
            self.vae.changer_statut("invalide")

    def test_to_serializable_dict(self):
        data = self.vae.to_serializable_dict()
        self.assertEqual(data["statut"], self.vae.statut)

    def test_to_csv_row(self):
        row = self.vae.to_csv_row()
        self.assertIn("VAE", row[1])
        self.assertIn(self.centre.nom, row[2])


class HistoriqueStatutVAEModelTest(BaseModelTestSetupMixin, TestCase):
    """
    Tests du modèle HistoriqueStatutVAE.

    Les données de test utilisent une date valide (égale à la date de création de la VAE)
    pour respecter les contraintes d'intégrité chronologique du modèle : full_clean()
    interdit les dates futures et les dates antérieures à la création de la VAE liée.
    """

    def setUp(self):
        super().setUp()
        self.centre = self.create_instance(Centre, nom="Centre Test")
        self.vae = VAE.objects.create(centre=self.centre, statut="dossier", created_by=self.user)
        # Date valide : >= date de création de la VAE et <= aujourd'hui (contraintes du modèle)
        date_effet = self.vae.created_at.date()
        self.hist = HistoriqueStatutVAE.objects.create(
            vae=self.vae,
            statut="dossier",
            date_changement_effectif=date_effet,
            commentaire="Initialisation",
            created_by=self.user,
        )

    def test_str_and_repr(self):
        """Vérifie __str__ et __repr__ de l'historique."""
        self.assertIn("le", str(self.hist))
        self.assertIn("statut", repr(self.hist))

    def test_clean_date_future(self):
        """Vérifie que full_clean() lève ValidationError pour une date future (contrainte métier)."""
        self.hist.date_changement_effectif = timezone.now().date() + timedelta(days=1)
        with self.assertRaises(ValidationError):
            self.hist.full_clean()

    def test_clean_date_avant_vae(self):
        """Vérifie que full_clean() lève ValidationError si la date est antérieure à la création de la VAE."""
        self.hist.date_changement_effectif = self.vae.created_at.date() - timedelta(days=1)
        with self.assertRaises(ValidationError):
            self.hist.full_clean()

    def test_to_serializable_dict(self):
        """Vérifie la sérialisation de l'historique pour l'API."""
        data = self.hist.to_serializable_dict()
        self.assertEqual(data["statut"], "dossier")
        self.assertEqual(data["vae_id"], self.vae.id)
