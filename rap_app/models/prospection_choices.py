from django.utils.translation import gettext_lazy as _


class ProspectionChoices:
    """
    Choix possibles pour les statuts, objectifs, motifs, moyens de contact et types de prospection.
    """

    # Statuts
    STATUT_A_FAIRE = "a_faire"  # À faire
    STATUT_EN_COURS = "en_cours"  # En cours
    STATUT_A_RELANCER = "a_relancer"  # À relancer
    STATUT_ACCEPTEE = "acceptee"  # Acceptée
    STATUT_REFUSEE = "refusee"  # Refusée
    STATUT_ANNULEE = "annulee"  # Annulée
    STATUT_NON_RENSEIGNE = "non_renseigne"  # Non renseigné

    PROSPECTION_STATUS_CHOICES = [
        (STATUT_A_FAIRE, _("À faire")),
        (STATUT_EN_COURS, _("En cours")),
        (STATUT_A_RELANCER, _("À relancer")),
        (STATUT_ACCEPTEE, _("Acceptée")),
        (STATUT_REFUSEE, _("Refusée")),
        (STATUT_ANNULEE, _("Annulée")),
        (STATUT_NON_RENSEIGNE, _("Non renseigné")),
    ]

    # Objectifs
    OBJECTIF_PRISE_CONTACT = "prise_contact"  # Prise de contact
    OBJECTIF_RENDEZ_VOUS = "rendez_vous"  # Obtenir un rendez-vous
    OBJECTIF_PRESENTATION = "presentation_offre"  # Présentation d'une offre
    OBJECTIF_CONTRAT = "contrat"  # Signer un contrat
    OBJECTIF_PARTENARIAT = "partenariat"  # Établir un partenariat
    OBJECTIF_AUTRE = "autre"  # Autre

    PROSPECTION_OBJECTIF_CHOICES = [
        (OBJECTIF_PRISE_CONTACT, _("Prise de contact")),
        (OBJECTIF_RENDEZ_VOUS, _("Obtenir un rendez-vous")),
        (OBJECTIF_PRESENTATION, _("Présentation d'une offre")),
        (OBJECTIF_CONTRAT, _("Signer un contrat")),
        (OBJECTIF_PARTENARIAT, _("Établir un partenariat")),
        (OBJECTIF_AUTRE, _("Autre")),
    ]

    # Motifs
    MOTIF_POEI = "POEI"  # POEI
    MOTIF_APPRENTISSAGE = "apprentissage"  # Apprentissage
    MOTIF_VAE = "VAE"  # VAE
    MOTIF_PARTENARIAT = "partenariat"  # Partenariat
    MOTIF_AUTRE = "autre"  # Autre

    PROSPECTION_MOTIF_CHOICES = [
        (MOTIF_POEI, _("POEI")),
        (MOTIF_APPRENTISSAGE, _("Apprentissage")),
        (MOTIF_VAE, _("VAE")),
        (MOTIF_PARTENARIAT, _("Établir un partenariat")),
        (MOTIF_AUTRE, _("Autre")),
    ]

    # Moyens de contact
    MOYEN_EMAIL = "email"  # Email
    MOYEN_TELEPHONE = "telephone"  # Téléphone
    MOYEN_VISITE = "visite"  # Visite
    MOYEN_RESEAUX = "reseaux"  # Réseaux sociaux

    MOYEN_CONTACT_CHOICES = [
        (MOYEN_EMAIL, _("Email")),
        (MOYEN_TELEPHONE, _("Téléphone")),
        (MOYEN_VISITE, _("Visite")),
        (MOYEN_RESEAUX, _("Réseaux sociaux")),
    ]

    # Types de prospection
    TYPE_NOUVEAU_PROSPECT = "nouveau_prospect"  # Nouveau prospect
    TYPE_PREMIER_CONTACT = "premier_contact"  # Premier contact
    TYPE_RELANCE = "relance"  # Relance
    TYPE_REPRISE_CONTACT = "reprise_contact"  # Reprise de contact
    TYPE_SUIVI = "suivi"  # Suivi en cours
    TYPE_RAPPEL_PROGRAMME = "rappel_programme"  # Rappel programmé
    TYPE_FIDELISATION = "fidelisation"  # Fidélisation
    TYPE_AUTRE = "autre"  # Autre

    TYPE_PROSPECTION_CHOICES = [
        (TYPE_NOUVEAU_PROSPECT, _("Nouveau prospect")),
        (TYPE_PREMIER_CONTACT, _("Premier contact")),
        (TYPE_RELANCE, _("Relance")),
        (TYPE_REPRISE_CONTACT, _("Reprise de contact")),
        (TYPE_SUIVI, _("Suivi en cours")),
        (TYPE_RAPPEL_PROGRAMME, _("Rappel programmé")),
        (TYPE_FIDELISATION, _("Fidélisation")),
        (TYPE_AUTRE, _("Autre")),
    ]

    @classmethod
    def get_statut_labels(cls):
        """Retourne un dictionnaire {valeur : libellé} pour les statuts."""
        return dict(cls.PROSPECTION_STATUS_CHOICES)

    @classmethod
    def get_objectifs_labels(cls):
        """Retourne un dictionnaire {valeur : libellé} pour les objectifs."""
        return dict(cls.PROSPECTION_OBJECTIF_CHOICES)

    @classmethod
    def get_statut_choices(cls):
        """Retourne les statuts au format [{value, label}]."""
        return [{"value": val, "label": label} for val, label in cls.PROSPECTION_STATUS_CHOICES]

    @classmethod
    def get_objectif_choices(cls):
        """Retourne les objectifs au format [{value, label}]."""
        return [{"value": val, "label": label} for val, label in cls.PROSPECTION_OBJECTIF_CHOICES]

    @classmethod
    def get_motif_choices(cls):
        """Retourne les motifs au format [{value, label}]."""
        return [{"value": val, "label": label} for val, label in cls.PROSPECTION_MOTIF_CHOICES]

    @classmethod
    def get_type_choices(cls):
        """Retourne les types de prospection au format [{value, label}]."""
        return [{"value": val, "label": label} for val, label in cls.TYPE_PROSPECTION_CHOICES]

    @classmethod
    def get_moyen_contact_choices(cls):
        """Retourne les moyens de contact au format [{value, label}]."""
        return [{"value": val, "label": label} for val, label in cls.MOYEN_CONTACT_CHOICES]
