"""Configuration Django de l'application `rap_app`."""

from django.apps import AppConfig


class RapAppConfig(AppConfig):
    """Configuration principale de l'application métier `rap_app`."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "rap_app"

    def ready(self):
        """Charge les modules de signaux encore actifs au démarrage de Django."""
        import rap_app.signals.appairage_signals
        import rap_app.signals.candidats_signals
        import rap_app.signals.centres_signals
        import rap_app.signals.commentaire_signals
        import rap_app.signals.documents_signals
        import rap_app.signals.evenements_signals
        import rap_app.signals.formation_candidats_signals
        import rap_app.signals.formations_signals
        import rap_app.signals.logs_signals
        import rap_app.signals.partenaires_signals
        import rap_app.signals.plan_action_signals
        import rap_app.signals.prospections_signals
        import rap_app.signals.rapports_signals
        import rap_app.signals.types_offres_signals
