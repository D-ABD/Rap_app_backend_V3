# rap_app/models/custom_user.py

import logging
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.functional import cached_property
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.contrib.auth.base_user import BaseUserManager
from django.utils import timezone

logger = logging.getLogger("rap_app.customuser")


class CustomUserManager(BaseUserManager):
    """Manager applicatif pour la création et le filtrage des ``CustomUser``.

    Ce manager centralise les règles de création d'utilisateur afin de garder
    une cohérence entre le ``role`` métier et les flags Django
    (``is_staff`` / ``is_superuser``).
    """

    @property
    def has_valid_consent(self):
        """Toujours False pour le manager."""
        return False

    def create_user(self, email, username=None, password=None, **extra_fields):
        """
        Crée un utilisateur avec email et mot de passe.
        """
        if not email:
            raise ValueError("L'adresse email est obligatoire.")
        email = self.normalize_email(email)
        if username is None:
            username = email.split("@")[0]

        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username=None, password=None, **extra_fields):
        """
        Crée un superutilisateur.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", CustomUser.ROLE_SUPERADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Le superutilisateur doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Le superutilisateur doit avoir is_superuser=True.")

        return self.create_user(email, username, password, **extra_fields)

    def active(self):
        """Retourne les utilisateurs actifs."""
        return self.filter(is_active=True)

    def by_role(self, role):
        """
        Filtre les utilisateurs par rôle.
        """
        if isinstance(role, (list, tuple, set)):
            roles = [str(r).lower().strip() for r in role]
            return self.filter(role__in=roles)
        return self.filter(role=str(role).lower().strip())

    def admins(self):
        """Retourne les utilisateurs admin et superadmin."""
        return self.filter(role__in=[CustomUser.ROLE_ADMIN, CustomUser.ROLE_SUPERADMIN])

    def create_user_with_role(self, email, username, password, role=None, **extra_fields):
        """
        Crée un utilisateur en positionnant le rôle.
        """
        if not email:
            raise ValueError("L'adresse email est obligatoire.")

        if role and not any(role == r[0] for r in CustomUser.ROLE_CHOICES):
            raise ValueError(f"Rôle invalide : {role}")

        extra_fields.setdefault(
            "is_staff",
            role in [
                CustomUser.ROLE_ADMIN,
                CustomUser.ROLE_SUPERADMIN,
                CustomUser.ROLE_STAFF,
                CustomUser.ROLE_STAFF_READ,
                CustomUser.ROLE_PREPA_STAFF,
                CustomUser.ROLE_DECLIC_STAFF,
            ],
        )
        extra_fields.setdefault("is_superuser", role == CustomUser.ROLE_SUPERADMIN)

        if role:
            extra_fields["role"] = role

        return self.create_user(email, username, password, **extra_fields)


class CustomUser(AbstractUser):
    """Modèle utilisateur étendu pour la plateforme RAP.

    Responsabilités principales :
    - porter les rôles métier (admin, staff, candidats, etc.) ;
    - normaliser les données sensibles (email, téléphone, rôle) ;
    - synchroniser les flags Django techniques avec le rôle métier ;
    - exposer des helpers d'accès (rôles, centres, export sérialisé).
    """

    consent_rgpd = models.BooleanField(default=False)
    consent_date = models.DateTimeField(null=True, blank=True)

    ROLE_SUPERADMIN = "superadmin"
    ROLE_ADMIN = "admin"
    ROLE_STAGIAIRE = "stagiaire"
    ROLE_STAFF = "staff"
    ROLE_STAFF_READ = "staff_read"
    ROLE_PREPA_STAFF = "prepa_staff"
    ROLE_DECLIC_STAFF = "declic_staff"
    ROLE_CANDIDAT = "candidat"
    ROLE_CANDIDAT_USER = "candidatuser"
    ROLE_TEST = "test"

    ROLE_CHOICES = [
        (ROLE_SUPERADMIN, "Super administrateur"),
        (ROLE_ADMIN, "Administrateur"),
        (ROLE_STAFF, "Membre du staff"),
        (ROLE_STAFF_READ, "Staff lecture seule"),
        (ROLE_PREPA_STAFF, "Staff PrépaComp"),
        (ROLE_DECLIC_STAFF, "Staff Déclic"),
        (ROLE_STAGIAIRE, "Stagiaire"),
        (ROLE_CANDIDAT, "Candidat"),
        (ROLE_CANDIDAT_USER, "Candidat validé"),
        (ROLE_TEST, "Test"),
    ]

    STAFF_ROLES = {
        ROLE_SUPERADMIN,
        ROLE_ADMIN,
        ROLE_STAFF,
        ROLE_STAFF_READ,
        ROLE_PREPA_STAFF,
        ROLE_DECLIC_STAFF,
    }
    CANDIDATE_ROLES = {ROLE_STAGIAIRE, ROLE_CANDIDAT, ROLE_CANDIDAT_USER}

    email = models.EmailField(
        unique=True,
        verbose_name="Adresse email",
        help_text="Adresse utilisée pour la connexion.",
        error_messages={"unique": "Un utilisateur avec cette adresse email existe déjà."},
    )
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True, verbose_name="Avatar")
    bio = models.TextField(blank=True, verbose_name="Biographie")
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_STAGIAIRE,
        db_index=True,
        verbose_name="Rôle",
    )
    centres = models.ManyToManyField(
        "Centre",
        related_name="users",
        blank=True,
        verbose_name="Centres autorisés",
        help_text="Limite la visibilité des données pour ce membre du staff.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]
    objects = CustomUserManager()

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ["-date_joined"]
        indexes = [
            models.Index(fields=["role"], name="customuser_role_idx"),
            models.Index(fields=["email"], name="customuser_email_idx"),
            models.Index(fields=["is_active"], name="customuser_active_idx"),
        ]

    def clean(self):
        """
        Valide les champs personnalisés (téléphone, email, rôle).
        """
        super().clean()
        if self.phone:
            phone_cleaned = self.phone.replace("+", "").replace(" ", "").replace("-", "")
            if not phone_cleaned.isdigit():
                raise ValidationError(
                    {"phone": "Le numéro de téléphone ne doit contenir que des chiffres, espaces ou '+'."}
                )
        if self.role:
            self.role = self.role.lower().strip()
        if self.role == self.ROLE_SUPERADMIN and not self.is_superuser:
            raise ValidationError({"role": "Seul un superuser peut avoir le rôle 'Super administrateur'."})
        if self.email:
            self.email = self.email.lower().strip()

    def save(self, *args, _skip_candidate_sync: bool = False, **kwargs):
        """Persiste l'utilisateur en appliquant les invariants métier.

        Invariants garantis avant sauvegarde :
        - normalisation de ``email``, ``role`` et ``phone`` ;
        - initialisation de ``consent_date`` lors du premier consentement RGPD ;
        - synchronisation *déterministe* ``role`` -> ``is_staff`` / ``is_superuser``.

        Contrat de synchronisation des flags :
        - ``superadmin`` => ``is_superuser=True`` et ``is_staff=True`` ;
        - ``admin`` => ``is_staff=True`` et ``is_superuser=False`` ;
        - rôles staff métier (``staff``, ``staff_read``, ``prepa_staff``, ``declic_staff``)
          => ``is_staff=True`` et ``is_superuser=False`` ;
        - rôles candidats / test => ``is_staff=False`` et ``is_superuser=False``.

        Le paramètre privé ``_skip_candidate_sync`` est propagé temporairement pour
        permettre aux couches appelantes (ex. admin) de neutraliser une synchro
        via signaux lorsque nécessaire.
        """
        is_new = self.pk is None

        self._skip_candidate_sync = _skip_candidate_sync

        if self.consent_rgpd and not self.consent_date:
            self.consent_date = timezone.now()

        if self.email:
            self.email = self.email.strip().lower()
        if self.role:
            self.role = self.role.strip().lower()
        if self.phone:
            self.phone = " ".join(self.phone.split())

        if self.role == self.ROLE_SUPERADMIN:
            self.is_superuser = True
            self.is_staff = True
        elif self.role == self.ROLE_ADMIN:
            self.is_superuser = False
            self.is_staff = True
        elif self.role in {
            self.ROLE_STAFF,
            self.ROLE_STAFF_READ,
            self.ROLE_PREPA_STAFF,
            self.ROLE_DECLIC_STAFF,
        }:
            self.is_superuser = False
            self.is_staff = True
        elif self.role in self.CANDIDATE_ROLES or self.role == self.ROLE_TEST:
            self.is_superuser = False
            self.is_staff = False
        else:
            self.is_superuser = False
            self.is_staff = False

        try:
            self.full_clean()
        except ValidationError as e:
            logger.error(f"Erreur de validation pour {self.email}: {e}")
            raise

        kwargs.pop("_skip_candidate_sync", None)

        super().save(*args, **kwargs)

        if hasattr(self, "_skip_candidate_sync"):
            delattr(self, "_skip_candidate_sync")

        action = "créé" if is_new else "mis à jour"
        logger.info(f"✅ Utilisateur {action} : {self.email} (rôle : {self.get_role_display()})")


    def __str__(self):
        """Retourne le username ou l'email."""
        return self.username or self.email

    def __repr__(self):
        """Représentation technique."""
        return f"<CustomUser id={self.pk} role='{self.role}'>"

    def get_full_name(self):
        """Retourne le nom complet ou username/email."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.username or self.email

    @property
    def full_name(self):
        """Retourne le nom complet (property)."""
        return self.get_full_name()

    def avatar_url(self):
        """Retourne l'URL de l'avatar, ou une image par défaut."""
        return self.avatar.url if self.avatar and hasattr(self.avatar, "url") else "/static/images/default_avatar.png"

    def is_superadmin(self):
        """Retourne True si l'utilisateur est superadmin ou superuser."""
        return self.role == self.ROLE_SUPERADMIN or self.is_superuser

    def is_admin(self):
        """Retourne True si admin ou superadmin."""
        return self.role == self.ROLE_ADMIN or self.is_superadmin()

    def is_staff_role(self):
        """Retourne True si rôle staff."""
        return self.role == self.ROLE_STAFF

    def is_staff_read(self):
        """Retourne True si rôle staff_read."""
        return self.role == self.ROLE_STAFF_READ

    def is_declic_staff(self):
        """Retourne True si rôle declic_staff."""
        return self.role == self.ROLE_DECLIC_STAFF

    def is_prepa_staff(self):
        """Retourne True si rôle prepa_staff."""
        return self.role == self.ROLE_PREPA_STAFF

    def is_candidat(self):
        """Retourne True si rôle candidat."""
        return self.role == self.ROLE_CANDIDAT

    def is_candidatuser(self):
        """Retourne True si rôle candidat validé."""
        return self.role == self.ROLE_CANDIDAT_USER

    def is_stagiaire(self):
        """Retourne True si rôle stagiaire."""
        return self.role == self.ROLE_STAGIAIRE

    def is_candidat_or_stagiaire(self):
        """Retourne True si rôle stagiaire, candidat ou candidat validé."""
        return self.role in self.CANDIDATE_ROLES

    def has_role(self, *roles):
        """Retourne True si le rôle actuel est dans la liste donnée."""
        return self.role in roles

    def get_centre_ids(self):
        """
        Retourne la liste des IDs des centres rattachés à l'utilisateur.
        """
        return list(self.centres.values_list("id", flat=True))

    @property
    def staff_centre_ids(self):
        """
        Retourne la liste des IDs de centres accessibles selon le rôle.
        """
        if self.role in {
            self.ROLE_SUPERADMIN,
            self.ROLE_ADMIN,
            self.ROLE_STAFF,
            self.ROLE_STAFF_READ,
            self.ROLE_PREPA_STAFF,
            self.ROLE_DECLIC_STAFF,
        }:
            return list(self.centres.values_list("id", flat=True))
        return []

    @property
    def centre(self):
        """
        Retourne le premier centre de l'utilisateur, ou un centre associé via candidat_associe.
        """
        try:
            valeur_centre = next(iter(self.centres.all()), None)
            if valeur_centre:
                return valeur_centre
            if hasattr(self, "candidat_associe"):
                formation = getattr(self.candidat_associe, "formation", None)
                if formation and hasattr(formation, "centre"):
                    return formation.centre
        except Exception:
            return None
        return None

    def has_centre_access(self, centre_id):
        """Indique si l'utilisateur peut accéder à un centre.

        Règles :
        - admin/superadmin : accès global ;
        - rôles staff métier : accès limité à la M2M ``centres`` ;
        - autres rôles : pas d'accès.

        Cette méthode se base sur ``role`` (source de vérité métier) plutôt que
        sur le seul flag technique ``is_staff``.
        """
        if self.is_superuser or self.is_admin():
            return True
        if self.role in self.STAFF_ROLES:
            return self.centres.filter(id=centre_id).exists()
        return False

    def has_module_perms(self, app_label):
        """
        Retourne True si l'utilisateur a accès au module Django admin.
        """
        return self.role in {self.ROLE_ADMIN, self.ROLE_SUPERADMIN}

    def has_perm(self, perm, obj=None):
        """
        Retourne True pour toutes les permissions si admin ou superadmin.
        """
        if self.is_superuser or self.role == self.ROLE_SUPERADMIN:
            return True
        if self.role == self.ROLE_ADMIN:
            return True
        return False

    # ============================================================
    # Sérialisation (compatibilité viewsets / exports)
    # ============================================================
    def to_serializable_dict(self, exclude=None, include_sensitive=False):
        """
        Fournit une version dict du CustomUser, sérialisable pour des APIs, exports, etc.
        Rôle :
            - Exporte toutes les colonnes du modèle, sauf exclusions (ex: mot de passe jamais exporté).
        Spécificités :
            - Sérialise proprement les champs Date/Heure, Fichiers, ForeignKeys.
            - Sérialise les ManyToMany comme liste de tuples (id, str(obj)).
        Sécurité :
            - Par défaut n'inclue jamais le hash du mot de passe.
        """
        exclude = list(exclude or [])
        exclude.append("password")  # jamais exposer le hash
        data = {}
        for field in self._meta.fields:
            name = field.name
            if name in exclude:
                continue
            value = getattr(self, name, None)
            if hasattr(value, "isoformat"):
                data[name] = value.isoformat() if value else None
            elif isinstance(field, (models.FileField, models.ImageField)):
                if value and value.name:
                    try:
                        data[name] = value.url
                    except Exception:
                        data[name] = None
                else:
                    data[name] = None
            elif isinstance(value, models.Model):
                data[name] = {"id": value.pk, "str": str(value)} if value else None
            else:
                data[name] = value
        for field in self._meta.many_to_many:
            if field.name in exclude:
                continue
            data[field.name] = [{"id": obj.pk, "str": str(obj)} for obj in getattr(self, field.name).all()]
        return data

    @classmethod
    def get_role_choices_display(cls):
        """
        Fournit sous forme de dict {value: label} la correspondance des rôles métier pour usage API/exports.
        Rôle :
            - Exposure technique standardisée pour front/API (par exemple, endpoint /roles/).
        """
        return dict(cls.ROLE_CHOICES)

    @classmethod
    def get_csv_fields(cls):
        """
        Retourne la liste technique d'attributs exportés lors d'un export CSV utilisateur.
        Rôle :
            - Permet l'extraction/synchronisation simplifiée côté back ou batch.
        """
        return ["id", "email", "username", "first_name", "last_name", "role", "is_active", "date_joined"]

    @classmethod
    def get_csv_headers(cls):
        """
        Liste humanisée des entêtes à afficher pour un export CSV alignée sur get_csv_fields().
        Rôle :
            - Assure un export lisible et conforme RGPD (en masquant les champs sensibles par défaut).
        """
        return ["ID", "Email", "Nom d'utilisateur", "Prénom", "Nom", "Rôle", "Actif", "Date d'inscription"]

    def to_csv_row(self):
        """
        Fournit une liste dans le bon ordre pour écrire une ligne CSV, aligné avec get_csv_fields().
        Rôle :
            - Utilisé dans l'export batch, reporting, synchronisation.
        Effets de bord :
            - Aucun ; pure transformation/projection.
        """
        return [
            self.pk,
            self.email or "",
            self.username or "",
            self.first_name or "",
            self.last_name or "",
            self.role or "",
            self.is_active,
            self.date_joined.strftime("%Y-%m-%d %H:%M") if self.date_joined else "",
        ]