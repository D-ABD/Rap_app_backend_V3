"""Modèle principal des partenaires."""

import logging

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import Count, Q
from django.urls import reverse
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from .base import BaseModel
from .cerfa_codes import (
    CerfaEmployeurSpecifiqueCode,
    CerfaMaitreNiveauDiplomeCode,
    CerfaTypeEmployeurCode,
)

logger = logging.getLogger("application.partenaires")

# Validators

phone_regex = RegexValidator(
    regex=r"^(0[1-9]\d{8})$|^(?:\+33|0033)[1-9]\d{8}$", message=_("Entrez un numéro de téléphone français valide.")
)

zip_code_regex = RegexValidator(regex=r"^[0-9]{5}$", message=_("Le code postal doit être composé de 5 chiffres."))

url_regex = RegexValidator(regex=r"^(http|https)://", message=_("L'URL doit commencer par http:// ou https://"))


class PartenaireManager(models.Manager):
    """
    Manager custom pour Partenaire.
    """

    def entreprises(self):
        """
        Retourne les partenaires de type entreprise.
        """
        return self.filter(type=Partenaire.TYPE_ENTREPRISE)

    def institutionnels(self):
        """
        Retourne les partenaires institutionnels.
        """
        return self.filter(type=Partenaire.TYPE_INSTITUTIONNEL)

    def personnes(self):
        """
        Retourne les partenaires de type personne physique.
        """
        return self.filter(type=Partenaire.TYPE_PERSONNE)

    def avec_contact(self):
        """
        Retourne les partenaires ayant au moins un champ de contact non vide.
        """
        return self.filter(
            Q(contact_nom__isnull=False) | Q(contact_email__isnull=False) | Q(contact_telephone__isnull=False)
        ).exclude(Q(contact_nom__exact="") & Q(contact_email__exact="") & Q(contact_telephone__exact=""))

    def par_secteur(self, secteur):
        """
        Filtre les partenaires par secteur d'activité (case-insensitive).
        """
        return self.filter(secteur_activite__icontains=secteur)

    def recherche(self, query):
        """
        Recherche multi-champs insensible à la casse.
        """
        if not query:
            return self.all()
        return self.filter(
            Q(nom__icontains=query)
            | Q(secteur_activite__icontains=query)
            | Q(contact_nom__icontains=query)
            | Q(description__icontains=query)
            | Q(city__icontains=query)
        )

    def avec_statistiques(self):
        """
        Annoter chaque partenaire avec nb_prospections et nb_formations.
        """
        return self.annotate(
            nb_prospections=Count("prospections", distinct=True),
            nb_formations=(
                Count("appairages__formation", filter=Q(appairages__formation__isnull=False), distinct=True)
                + Count("prospections__formation", filter=Q(prospections__formation__isnull=False), distinct=True)
            ),
        )


class Partenaire(BaseModel):
    """
    Modele representant un partenaire externe.

    Pour l'alimentation du CERFA, les champs de reference a liste fermee sont
    portes par des champs `_code`. Les cas plus atypiques ou hors nomenclature
    restent saisissables au niveau du contrat CERFA lui-meme.
    """

    TYPE_ENTREPRISE = "entreprise"
    TYPE_INSTITUTIONNEL = "partenaire"
    TYPE_PERSONNE = "personne"

    NOM_MAX_LENGTH = 255
    SECTEUR_MAX_LENGTH = 255
    STREET_MAX_LENGTH = 200
    ZIP_CODE_LENGTH = 5
    CITY_MAX_LENGTH = 100
    COUNTRY_MAX_LENGTH = 100
    CONTACT_NOM_MAX_LENGTH = 255
    CONTACT_POSTE_MAX_LENGTH = 255
    CONTACT_TEL_MAX_LENGTH = 20
    ACTION_MAX_LENGTH = 50
    SLUG_MAX_LENGTH = 255

    TYPE_CHOICES = [
        (TYPE_ENTREPRISE, _("Entreprise")),
        (TYPE_INSTITUTIONNEL, _("Partenaire institutionnel")),
        (TYPE_PERSONNE, _("Personne physique")),
    ]

    CHOICES_TYPE_OF_ACTION = [
        ("recrutement_emploi", _("Recrutement - Emploi")),
        ("recrutement_stage", _("Recrutement - Stage")),
        ("recrutement_apprentissage", _("Recrutement - Apprentissage")),
        ("presentation_metier_entreprise", _("Présentation métier/entreprise")),
        ("visite_entreprise", _("Visite d'entreprise")),
        ("coaching", _("Coaching")),
        ("partenariat", _("Partenariat")),
        ("autre", _("Autre")),
        ("non_definie", _("Non définie")),
    ]

    default_centre = models.ForeignKey(
        "rap_app.Centre",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="partenaires_default",
        verbose_name="Centre par défaut",
    )

    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=TYPE_INSTITUTIONNEL,
        verbose_name=_("Type de partenaire"),
        help_text=_("Définit s'il s'agit d'une entreprise, d'un partenaire ou d'une personne physique"),
        db_index=True,
    )

    nom = models.CharField(
        max_length=NOM_MAX_LENGTH, unique=True, verbose_name=_("Nom"), help_text=_("Nom complet de l'entité")
    )

    secteur_activite = models.CharField(
        max_length=SECTEUR_MAX_LENGTH,
        blank=True,
        null=True,
        verbose_name=_("Secteur d'activité"),
        help_text=_("Domaine d'activité principal"),
    )

    street_number = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name=_("Numéro de rue"),
        help_text=_("Numéro dans la voie (ex: 12B)"),
    )

    street_name = models.CharField(
        max_length=STREET_MAX_LENGTH, blank=True, null=True, verbose_name=_("Adresse"), help_text=_("Nom de la rue")
    )

    street_complement = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name=_("Complément d'adresse"),
        help_text=_("Bâtiment, étage, entrée, etc."),
    )

    zip_code = models.CharField(
        max_length=ZIP_CODE_LENGTH,
        blank=True,
        null=True,
        validators=[zip_code_regex],
        verbose_name=_("Code postal"),
        help_text=_("Code postal à 5 chiffres"),
    )

    city = models.CharField(
        max_length=CITY_MAX_LENGTH, blank=True, null=True, verbose_name=_("Ville"), help_text=_("Ville")
    )

    country = models.CharField(
        max_length=COUNTRY_MAX_LENGTH,
        blank=True,
        null=True,
        default="France",
        verbose_name=_("Pays"),
        help_text=_("Pays (France par défaut)"),
    )

    contact_nom = models.CharField(
        max_length=CONTACT_NOM_MAX_LENGTH,
        blank=True,
        null=True,
        verbose_name=_("Nom du contact"),
        help_text=_("Nom et prénom du contact principal"),
    )

    contact_poste = models.CharField(
        max_length=CONTACT_POSTE_MAX_LENGTH,
        blank=True,
        null=True,
        verbose_name=_("Poste du contact"),
        help_text=_("Fonction occupée par le contact"),
    )

    contact_telephone = models.CharField(
        max_length=CONTACT_TEL_MAX_LENGTH,
        blank=True,
        null=True,
        validators=[phone_regex],
        verbose_name=_("Téléphone"),
        help_text=_("Numéro de téléphone au format français"),
    )

    contact_email = models.EmailField(
        blank=True, null=True, verbose_name=_("Email"), help_text=_("Adresse email du contact")
    )

    website = models.URLField(
        blank=True,
        null=True,
        validators=[url_regex],
        verbose_name=_("Site web"),
        help_text=_("Site web officiel (http:// ou https://)"),
    )

    social_network_url = models.URLField(
        blank=True, null=True, verbose_name=_("Réseau social"), help_text=_("URL d'un profil LinkedIn, Twitter, etc.")
    )

    actions = models.CharField(
        max_length=ACTION_MAX_LENGTH,
        blank=True,
        null=True,
        choices=CHOICES_TYPE_OF_ACTION,
        verbose_name=_("Type d'action"),
        help_text=_("Catégorie principale d'interaction avec ce partenaire"),
    )

    action_description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Description de l'action"),
        help_text=_("Détails sur les actions menées ou envisagées"),
    )

    description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Description générale"),
        help_text=_("Informations générales sur le partenaire"),
    )

    siret = models.CharField(
        max_length=14,
        blank=True,
        null=True,
        verbose_name=_("SIRET"),
        help_text=_("Numéro SIRET (14 chiffres)"),
        validators=[RegexValidator(r"^\d{14}$", _("Le SIRET doit comporter 14 chiffres."))],
    )

    type_employeur_code = models.CharField(
        max_length=2,
        blank=True,
        null=True,
        choices=CerfaTypeEmployeurCode.choices,
        verbose_name=_("Type d'employeur CERFA"),
        help_text=_("Code CERFA complet du type d'employeur."),
    )
    employeur_specifique_code = models.CharField(
        max_length=1,
        blank=True,
        null=True,
        choices=CerfaEmployeurSpecifiqueCode.choices,
        verbose_name=_("Employeur specifique CERFA"),
        help_text=_("Code CERFA de l'employeur specifique."),
    )

    code_ape = models.CharField(
        max_length=50, blank=True, null=True, verbose_name=_("Code APE"), help_text=_("Code APE de l'entreprise")
    )

    effectif_total = models.PositiveIntegerField(
        blank=True, null=True, verbose_name=_("Effectif total"), help_text=_("Nombre total de salariés")
    )

    idcc = models.CharField(
        max_length=50, blank=True, null=True, verbose_name=_("IDCC"), help_text=_("Code convention collective")
    )

    assurance_chomage_speciale = models.BooleanField(
        default=False,
        verbose_name=_("Assurance chômage spéciale"),
        help_text=_("Cochez si l'employeur est soumis à un régime particulier (souvent public)"),
    )

    telephone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        validators=[phone_regex],
        verbose_name=_("Téléphone général"),
        help_text=_("Numéro de téléphone principal de l'entreprise"),
    )

    email = models.EmailField(
        blank=True, null=True, verbose_name=_("Email général"), help_text=_("Adresse email principale de l'entreprise")
    )

    maitre1_nom_naissance = models.CharField(
        max_length=150, blank=True, null=True, verbose_name=_("Maître d’apprentissage n°1 - Nom de naissance")
    )

    maitre1_prenom = models.CharField(
        max_length=150, blank=True, null=True, verbose_name=_("Maître d’apprentissage n°1 - Prénom")
    )

    maitre1_date_naissance = models.DateField(
        blank=True, null=True, verbose_name=_("Maître d’apprentissage n°1 - Date de naissance")
    )

    maitre1_courriel = models.EmailField(blank=True, null=True, verbose_name=_("Maître d’apprentissage n°1 - Courriel"))

    maitre1_emploi_occupe = models.CharField(
        max_length=255, blank=True, null=True, verbose_name=_("Maître d’apprentissage n°1 - Emploi occupé")
    )

    maitre1_diplome_titre = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name=_("Maître d’apprentissage n°1 - Diplôme ou titre le plus élevé obtenu"),
    )

    maitre1_niveau_diplome_code = models.CharField(
        max_length=1,
        blank=True,
        null=True,
        choices=CerfaMaitreNiveauDiplomeCode.choices,
        verbose_name=_("Maître d’apprentissage n°1 - Niveau CERFA"),
        help_text=_("Code CERFA du niveau de diplome du maitre d'apprentissage n°1."),
    )

    maitre2_nom_naissance = models.CharField(
        max_length=150, blank=True, null=True, verbose_name=_("Maître d’apprentissage n°2 - Nom de naissance")
    )

    maitre2_prenom = models.CharField(
        max_length=150, blank=True, null=True, verbose_name=_("Maître d’apprentissage n°2 - Prénom")
    )

    maitre2_date_naissance = models.DateField(
        blank=True, null=True, verbose_name=_("Maître d’apprentissage n°2 - Date de naissance")
    )

    maitre2_courriel = models.EmailField(blank=True, null=True, verbose_name=_("Maître d’apprentissage n°2 - Courriel"))

    maitre2_emploi_occupe = models.CharField(
        max_length=255, blank=True, null=True, verbose_name=_("Maître d’apprentissage n°2 - Emploi occupé")
    )

    maitre2_diplome_titre = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name=_("Maître d’apprentissage n°2 - Diplôme ou titre le plus élevé obtenu"),
    )

    maitre2_niveau_diplome_code = models.CharField(
        max_length=1,
        blank=True,
        null=True,
        choices=CerfaMaitreNiveauDiplomeCode.choices,
        verbose_name=_("Maître d’apprentissage n°2 - Niveau CERFA"),
        help_text=_("Code CERFA du niveau de diplome du maitre d'apprentissage n°2."),
    )

    slug = models.SlugField(
        max_length=SLUG_MAX_LENGTH,
        unique=True,
        blank=True,
        null=True,
        verbose_name=_("Slug"),
        help_text=_("Identifiant URL unique généré automatiquement à partir du nom"),
    )

    objects = models.Manager()
    custom = PartenaireManager()

    class Meta:
        verbose_name = _("Partenaire")
        verbose_name_plural = _("Partenaires")
        ordering = ["nom"]
        indexes = [
            models.Index(fields=["nom"], name="partenaire_nom_idx"),
            models.Index(fields=["secteur_activite"], name="partenaire_secteur_idx"),
            models.Index(fields=["slug"], name="partenaire_slug_idx"),
            models.Index(fields=["zip_code"], name="partenaire_cp_idx"),
            models.Index(fields=["type"], name="partenaire_type_idx"),
            models.Index(fields=["actions"], name="partenaire_actions_idx"),
        ]
        constraints = [models.CheckConstraint(check=~Q(nom=""), name="partenaire_nom_not_empty")]

    def __str__(self) -> str:
        """
        Affichage textuel du partenaire.
        """
        return f"{self.nom} ({self.get_type_display()})"

    def __repr__(self) -> str:
        """
        Représentation technique du partenaire.
        """
        return f"<Partenaire(id={self.pk}, nom='{self.nom}', type='{self.type}')>"

    @classmethod
    def get_secteurs_list(cls):
        """
        Retourne la liste triée des secteurs d'activité non vides.
        """
        return list(
            cls.objects.filter(secteur_activite__isnull=False)
            .exclude(secteur_activite="")
            .values_list("secteur_activite", flat=True)
            .distinct()
            .order_by("secteur_activite")
        )

    def clean(self):
        """
        Validation métier basique avant sauvegarde.
        """
        super().clean()

        if not self.nom or not self.nom.strip():
            raise ValidationError({"nom": _("Le nom du partenaire est obligatoire.")})

        if self.zip_code and not self.city:
            raise ValidationError({"city": _("La ville doit être renseignée si le code postal est fourni.")})

        if self.website and not (self.website.startswith("http://") or self.website.startswith("https://")):
            raise ValidationError({"website": _("L'URL doit commencer par http:// ou https://")})

        if self.social_network_url and not (
            self.social_network_url.startswith("http://") or self.social_network_url.startswith("https://")
        ):
            raise ValidationError({"social_network_url": _("L'URL doit commencer par http:// ou https://")})

    def save(self, *args, **kwargs):
        """
        Surcharge save pour normalisation et unicité métier.
        """
        user = kwargs.pop("user", None)
        is_new = self.pk is None

        if self.nom:
            self.nom = self.nom.strip()
            self.nom = " ".join(self.nom.split())
            self.nom = self.nom.title()

        existing = None
        if is_new and self.nom:
            try:
                existing = Partenaire.objects.get(nom__iexact=self.nom)
            except Partenaire.DoesNotExist:
                existing = None
            if existing:
                logger.info(f"Réutilisation du partenaire existant : {existing.nom} (ID: {existing.pk})")
                self._was_reused = True
                self.pk = existing.pk
                self.slug = existing.slug
                is_new = False

        if not self.slug:
            base_slug = slugify(self.nom)
            slug = base_slug
            counter = 1
            while Partenaire.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug

        if self.contact_email:
            self.contact_email = self.contact_email.lower().strip()

        if self.website and not self.website.startswith(("http://", "https://")):
            self.website = f"https://{self.website}"

        if self.social_network_url and not self.social_network_url.startswith(("http://", "https://")):
            self.social_network_url = f"https://{self.social_network_url}"

        if user:
            self._user = user

        self.full_clean()
        super().save(*args, **kwargs)

        logger.info(f"{'Création' if is_new else 'Mise à jour'} du partenaire : {self.nom} (ID: {self.pk})")

    def _formations_qs(self):
        """
        QuerySet des formations liées par appairage ou prospection.
        """
        from .formations import Formation

        return Formation.objects.filter(Q(appairages__partenaire=self) | Q(prospections__partenaire=self)).distinct()

    def get_formations_info(self, with_list: bool = False) -> dict:
        """
        Retourne un dict avec le nombre de formations liées, et éventuellement la liste.
        """
        qs = self._formations_qs().order_by("-start_date")
        info = {"count": qs.count()}
        if with_list:
            info["formations"] = list(qs)
        return info

    @property
    def nb_formations(self) -> int:
        """
        Nombre de formations distinctes liées à ce partenaire.
        """
        return self._formations_qs().count()

    def get_delete_url(self) -> str:
        """
        URL nommée Django pour la suppression du partenaire.
        """
        return reverse("partenaire-delete", kwargs={"pk": self.pk})

    def get_full_address(self) -> str:
        """
        Chaîne représentant l'adresse complète du partenaire.
        """
        parts = [
            f"{self.street_number or ''} {self.street_name or ''}".strip(),
            self.street_complement,
            f"{self.zip_code or ''} {self.city or ''}".strip(),
            self.country,
        ]
        return ", ".join(filter(None, parts)) or _("Adresse non spécifiée")

    @property
    def default_centre_nom(self) -> str:
        """
        Nom du centre par défaut associé, ou chaîne vide.
        """
        return getattr(self.default_centre, "nom", "") or ""

    @property
    def full_address(self) -> str:
        """
        Alias pour get_full_address.
        """
        return self.get_full_address()

    def get_contact_info(self) -> str:
        """
        Chaine textuelle des informations de contact disponibles.
        """
        parts = [
            self.contact_nom,
            f"({self.contact_poste})" if self.contact_poste else None,
            self.contact_email,
            self.contact_telephone,
        ]
        return " - ".join(filter(None, parts)) or _("Aucun contact")

    @property
    def contact_info(self) -> str:
        """
        Alias pour get_contact_info.
        """
        return self.get_contact_info()

    def has_contact_info(self) -> bool:
        """
        True si au moins une info de contact est renseignée.
        """
        return any([self.contact_nom, self.contact_telephone, self.contact_email])

    @property
    def has_contact(self) -> bool:
        """
        Alias booléen pour has_contact_info.
        """
        return self.has_contact_info()

    @property
    def has_web_presence(self) -> bool:
        """
        True si au moins un site web ou réseau social est renseigné.
        """
        return bool(self.website or self.social_network_url)

    @property
    def has_address(self) -> bool:
        """
        True si au moins une info d'adresse est présente.
        """
        return any([self.street_name, self.zip_code, self.city])

    def get_prospections_info(self, with_list: bool = False) -> dict:
        """
        Statistiques simples sur les prospections rattachées.
        """
        queryset = self.prospections.all().order_by("-date_prospection")
        info = {"count": queryset.count()}
        if with_list:
            info["prospections"] = queryset
        return info

    @property
    def nb_appairages(self) -> int:
        """
        Nombre d'appairages associés.
        """
        return self.appairages.count()

    @property
    def nb_prospections(self) -> int:
        """
        Nombre de prospections réalisées.
        """
        return self.prospections.count()
