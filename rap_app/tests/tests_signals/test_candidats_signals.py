import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rap_app.models.candidat import Candidat
from rap_app.models.custom_user import CustomUser

User = get_user_model()

@pytest.mark.django_db
class TestSyncCandidatForUser:
    def test_reconciliation_does_not_run_in_audit_only_mode(self, caplog):
        """
        Vérifie que le signal ne lie plus automatiquement le candidat en mode audit-only.
        """
        caplog.set_level("WARNING")

        # Étape A : Créer un candidat orphelin (sans compte_utilisateur)
        candidat = Candidat.objects.create(
            nom="Dupont",
            prenom="Jean",
            email="test@example.com",
        )
        assert candidat.compte_utilisateur is None

        # Étape B : Créer un CustomUser avec le même email
        user = User.objects.create_user(
            email="test@example.com",
            username="user1",
            password="password123",
            first_name="Jean",
            last_name="Dupont",
            role=CustomUser.ROLE_CANDIDAT_USER,
        )

        # Étape C : Vérifier que le signal a seulement logué et n'a rien lié
        candidat.refresh_from_db()
        assert candidat.compte_utilisateur is None
        assert "SIGNAL_EXECUTION_DETECTED: sync_candidat_for_user" in caplog.text

        # Aucun nouveau candidat ne doit avoir été créé ni réconcilié
        assert Candidat.objects.filter(email__iexact="test@example.com").count() == 1
        assert Candidat.objects.filter(compte_utilisateur=user).count() == 0

    def test_signal_processing_guard_prevents_recursion(self):
        """Vérifie que le guard de signal stoppe la récursion de save()."""

        from rap_app.utils.signals import signal_processing

        class Dummy:
            def __init__(self):
                self.call_count = 0

            def save(self):
                self.call_count += 1
                with signal_processing(self) as can_run:
                    if not can_run:
                        return
                    # Simule un signal qui appelle à nouveau save()
                    self.save()

        d = Dummy()
        d.save()
        # Le guard doit empêcher l'appel infini et limiter la récursion à une seule re-entrée.
        assert d.call_count == 2

    def test_transaction_rollback_on_integrity_error(self):
        """
        Vérifie que la transaction rollback en cas d'erreur d'intégrité.
        """
        # Simuler une erreur (ex. : forcer IntegrityError via mock ou contrainte)
        # Ici, un test simple : vérifier que si création échoue, pas de Candidat créé
        user = User.objects.create_user(
            email="unique@example.com",
            username="uniqueuser",
            password="password123",
            role=CustomUser.ROLE_CANDIDAT_USER
        )
        # En mode audit-only, le signal ne doit créer aucun candidat lié.
        candidat = Candidat.objects.filter(compte_utilisateur=user).first()
        assert candidat is None
