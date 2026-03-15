from django.apps import AppConfig


class RapAppConfig(AppConfig):
    """
    Configuration de l'application 'rap_app'.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rap_app'

    def ready(self):
        """
        Importe les modules de signaux pour enregistrer les receivers de l'application.
        """
        import rap_app.signals.centres_signals
        import rap_app.signals.commentaire_signals
        import rap_app.signals.documents_signals
        import rap_app.signals.evenements_signals
        import rap_app.signals.formations_signals
        import rap_app.signals.rapports_signals
        import rap_app.signals.prospections_signals
        import rap_app.signals.logs_signals
        # import rap_app.signals.statut_signals  # Désactivé
        import rap_app.signals.appairage_signals
        import rap_app.signals.candidats_signals
        import rap_app.signals.partenaires_signals
        import rap_app.signals.types_offres_signals
        # import rap_app.signals.jury_signals  # Désactivé

