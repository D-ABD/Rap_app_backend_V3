import logging
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .base import BaseModel
from .appairage import Appairage

logger = logging.getLogger(__name__)


# ============================================================
# 🔍 QuerySet & Manager personnalisés
# ============================================================

class CommentaireAppairageQuerySet(models.QuerySet):
    """
    QuerySet personnalisé pour les commentaires d’appairage.

    Rôle :
        Fournit des méthodes prêtes à l'emploi pour filtrer selon le statut logique des commentaires (actif/archivé).
        Centralise la logique de partitionnement des commentaires rattachés métier pour garantir l'homogénéité de la récupération en base.

    Notes sur la logique :
        - Les méthodes renvoient des QuerySets filtrés sur le champ 'statut_commentaire'.
        - Purement en lecture, sans effet de bord sur la base.
    """

    def actifs(self):
        """
        Rôle :
            Récupère l'ensemble des commentaires d'appairage considérés comme actifs (non archivés).
        
        Logique métier :
            - Filtre selon CommentaireAppairage.STATUT_ACTIF.
            - Utile pour afficher uniquement les discussions ouvertes ou non archivées.
        
        Effets de bord :
            - Aucun. Strictement en lecture.
        """
        return self.filter(statut_commentaire=CommentaireAppairage.STATUT_ACTIF)

    def archives(self):
        """
        Rôle :
            Récupère l'ensemble des commentaires d'appairage archivés.

        Logique métier :
            - Filtre selon CommentaireAppairage.STATUT_ARCHIVE.
            - Utile pour accès historique ou dossiers classés.

        Effets de bord :
            - Aucun. Strictement en lecture.
        """
        return self.filter(statut_commentaire=CommentaireAppairage.STATUT_ARCHIVE)


class CommentaireAppairageManager(models.Manager.from_queryset(CommentaireAppairageQuerySet)):
    """
    Manager principal pour le modèle CommentaireAppairage.

    Rôle :
        - Propose un point d'entrée unique pour instancier des QuerySets métier avec filtres prédéfinis (actifs, archives).
        - Garantit l'accès rapide aux partitions standard via CommentaireAppairage.objects.actifs() ou .archives().

    Effets de bord :
        - Strictement en lecture ; n'altère aucune donnée.
    """
    pass


# ============================================================
# 💬 Modèle principal
# ============================================================

class CommentaireAppairage(BaseModel):
    """
    Modèle Django CommentaireAppairage

    Rôle métier :
        Gère l'historique des commentaires associés à un appairage (mise en relation entre un candidat et son environnement métier).
        Sert à documenter les retours, échanges, validations ou suivis autour du processus d'appairage.
        Permet de maintenir une traçabilité de l'évolution de la relation via archivage logique, sans suppression physique.

    Points d'attention :
        - Chaque instance stocke un 'snapshot' du statut courant d'appairage lors de la création du commentaire, figeant la situation métier du duo Candidat-Appairage à cet instant.
        - Prise en charge de l'archivage logique via statut_commentaire pour garantir la réversibilité.
        - L'auteur (created_by) et le moment (created_at) sont enregistrés pour traçabilité.
        - Ne modifie jamais l'appairage référencé, la table est strictement fille.

    Table liée :
        - FK vers Appairage (supprime en cascade les commentaires en cas de suppression d'appairage).

    """

    # --- Constantes de statut ---
    STATUT_ACTIF = "actif"
    STATUT_ARCHIVE = "archive"

    STATUT_CHOICES = [
        (STATUT_ACTIF, _("Actif")),
        (STATUT_ARCHIVE, _("Archivé")),
    ]

    # --- Relations & contenu ---
    appairage = models.ForeignKey(
        Appairage,
        on_delete=models.CASCADE,
        related_name="commentaires",
        verbose_name=_("Appairage"),
        # Rôle : chaque commentaire est rattaché à un appairage précis.
        # Effets de bord : cascade la suppression.
    )
    body = models.TextField(
        verbose_name=_("Commentaire"),
        # Rôle : contenu textuel du commentaire.
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="commentaires_appairages",
        verbose_name=_("Auteur"),
        # Rôle : rattacher le commentaire à un utilisateur rédacteur si disponible.
        # Effets de bord : suppression de l'user n'entraîne pas suppression du commentaire, remplace par NULL.
    )

    # 📌 snapshot du statut de l’appairage au moment du commentaire
    statut_snapshot = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name=_("Statut au moment du commentaire"),
        help_text=_("Statut de l’appairage figé au moment où le commentaire a été créé."),
        # Rôle : mémorise la valeur du champ 'statut' de l'appairage lors de la création du commentaire pour traçabilité historique.
        # Aucun recalcul a posteriori ; non synchronisé en cas d'évolution ultérieure de l'appairage.
    )

    # 🗂️ statut logique du commentaire
    statut_commentaire = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default=STATUT_ACTIF,
        db_index=True,
        verbose_name=_("Statut du commentaire"),
        help_text=_("Permet d’archiver ou de restaurer logiquement un commentaire."),
        # Rôle : distingue les commentaires actifs des commentaires archivés sans supprimer la ligne.
        # Sert à filtrer les accès, la visibilité, et le suivi.
    )

    # --- Manager custom ---
    objects = CommentaireAppairageManager()

    class Meta:
        verbose_name = _("Commentaire d’appairage")
        verbose_name_plural = _("Commentaires d’appairages")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["appairage"]),               # Accélère les requêtes par appairage
            models.Index(fields=["created_by"]),              # Accès analytique par auteur/ditribution des utilisateurs
            models.Index(fields=["statut_commentaire"]),      # Filtrage rapide status logique
            models.Index(fields=["created_at"]),              # Accès chronologique performant
        ]

    def __str__(self):
        """
        Rôle :
            Affiche une représentation lisible de l'objet pour debug/admin métier, incluant l'identifiant du commentaire,
            son appairage et l'éventuel auteur.
        Effets de bord :
            - Aucun
        """
        auteur = getattr(self.created_by, "username", "anonyme")
        return f"Commentaire #{self.pk} – appairage #{self.appairage_id} – {auteur}"

    # ============================================================
    # 💾 Sauvegarde & validation
    # ============================================================

    def clean(self):
        """
        Rôle :
            Validation métier au niveau de l'instance avant sauvegarde.
            Interdit de sauvegarder un commentaire vide (body obligatoire après trim).
        Logique :
            - Lance une ValidationError côté Django si le body ne contient aucun caractère non-espace.

        Effets de bord :
            - Aucune modification sur d'autres objets.
        """
        super().clean()
        if not (self.body or "").strip():
            raise ValidationError({"body": _("Le commentaire ne peut pas être vide.")})

    def save(self, *args, user=None, **kwargs):
        """
        Rôle :
            - Capture une photo instantanée (snapshot) du statut de l'appairage lors de la création (premier save sans .pk),
              pour historiser la situation lors du dépôt du commentaire.
            - Affecte created_by à l'utilisateur fourni (param user, uniquement si création),
              met à jour updated_by à l'utilisateur si édition.
            - Valide via .full_clean().
            - Assure la transactionnalité forte.
            - Ajoute un log technique lors de chaque sauvegarde.

        Logique métier :
            - self.statut_snapshot est alimenté une seule fois lors de l'insertion (évite de rendre la propriété dynamique explicitement afin de préserver l’historicité).
            - Si user passé, il sera utilisé pour populater created_by lors d'une création, ou updated_by lors d'une update.
            - Validation métier systématique par .full_clean()

        Effets de bord :
            - N'altère que l'instance courante, n'impacte pas d'autres modèles liés, n'impacte pas Appairage.
            - Peut changer la valeur de .statut_snapshot lors de la création seulement.
            - Peut modifier created_by ou updated_by.
            - Génère une ligne de log technique détaillée à chaque opération.
        """
        self.full_clean()

        if not self.pk and self.appairage:
            self.statut_snapshot = self.appairage.statut  # Snapshot figé à la création, ne sera jamais synchronisé rétroactivement.

        if user and hasattr(user, "pk"):
            if not self.pk and not self.created_by:
                self.created_by = user
            else:
                self.updated_by = user

        with transaction.atomic():
            super().save(*args, **kwargs)

        logger.debug(
            "💬 CommentaireAppairage #%s sauvegardé pour Appairage #%s (user=%s)",
            self.pk,
            self.appairage_id,
            getattr(user, "id", None),
        )

    # ============================================================
    # 🔁 Archivage logique
    # ============================================================

    def archiver(self, save: bool = True):
        """
        Rôle :
            Bascule le commentaire au statut archivé de façon logique.
            Permet de le masquer de l'usage courant tout en préservant l’intégrité historique.

        Logique métier :
            - Modifie uniquement la colonne statut_commentaire pour la passer en STATUT_ARCHIVE.
            - Ne modifie jamais les liens ni d'autres modèles.

        Effets de bord :
            - Modifie uniquement l'instance commentée, sans impact sur Appairage ni sur les User.
            - Si save=True (défaut), persiste la modification en base (update_fields=["statut_commentaire"]).
            - Crée un log métier de l'opération.
        """
        if self.statut_commentaire != self.STATUT_ARCHIVE:
            self.statut_commentaire = self.STATUT_ARCHIVE
            if save:
                self.save(update_fields=["statut_commentaire"])
            logger.info("CommentaireAppairage #%s archivé", self.pk)

    def desarchiver(self, save: bool = True):
        """
        Rôle :
            Restaure le commentaire en le repassant à l'état actif.
            Utilisé pour annuler une opération d'archivage erronée ou retrouver des discussions anciennes.

        Logique métier :
            - Rétablit la valeur de statut_commentaire à STATUT_ACTIF.
            - Purement locale à l'instance.

        Effets de bord :
            - Modifie uniquement l'instance ciblée, jamais l'appairage parent ni l'auteur.
            - Si save=True (défaut), update immédiat column statut_commentaire.
            - Log technique métier.
        """
        if self.statut_commentaire != self.STATUT_ACTIF:
            self.statut_commentaire = self.STATUT_ACTIF
            if save:
                self.save(update_fields=["statut_commentaire"])
            logger.info("CommentaireAppairage #%s désarchivé", self.pk)

    # --- Aliases rétro-compatibles ---
    def archive(self):
        """
        Alias rétro-compatible de archiver().
        Rôle : Appel simplifié pour code métier déjà publié.
        """
        return self.archiver()

    def restore(self):
        """
        Alias rétro-compatible de desarchiver().
        Rôle : Appel simplifié pour code métier déjà publié.
        """
        return self.desarchiver()

    @property
    def est_archive(self) -> bool:
        """
        Rôle :
            Vérifie si le commentaire est actuellement archivé.

        Logique métier :
            - Retourne True lorsque statut_commentaire == STATUT_ARCHIVE pour affichages conditionnels.
        """
        return self.statut_commentaire == self.STATUT_ARCHIVE

    @property
    def activite(self) -> str:
        """
        Rôle :
            Fournit un alias texte pour compatibilité avec certains ViewSets qui attendent 'active' ou 'archivee'.

        Logique métier :
            - Si le commentaire est archivé, retourne 'archivee', sinon 'active'.
        """
        return "archivee" if self.est_archive else "active"

    # ============================================================
    # 🧰 Helpers
    # ============================================================

    def auteur_nom(self):
        """
        Rôle :
            Récupère le nom complet (get_full_name) ou username de l'auteur si connu.
            Permet affichage lisible dans les interfaces, sinon retourne 'Anonyme'.

        Effets de bord :
            - Aucun, uniquement accès lecture.
        """
        if self.created_by:
            return self.created_by.get_full_name() or self.created_by.username
        return "Anonyme"

    def to_serializable_dict(self, include_full_content=True) -> dict:
        """
        Rôle :
            Sérialise l'instance sous forme de dictionnaire Python prêt à être utilisé en API REST ou pour export fonctionnel.

        Logique métier :
            - Limite la longueur du texte body si include_full_content = False.
            - Marque les métadonnées : auteur, statut, dates (formatées pour usage UX).
            - Ajoute flags is_recent et is_edited pour UX avancée.
            - Gère présence/absence des dates pour prévention d'erreur lors de l'affichage.

        Effets de bord :
            - Strictement en lecture.
        """
        now = timezone.now()
        return {
            "id": self.pk,
            "appairage_id": self.appairage_id,
            "body": self.body if include_full_content else (self.body[:120] + "…" if self.body else ""),
            "auteur": self.auteur_nom(),
            "statut_snapshot": self.statut_snapshot,
            "statut_commentaire": self.statut_commentaire,
            "date": self.created_at.strftime("%d/%m/%Y") if self.created_at else None,
            "heure": self.created_at.strftime("%H:%M") if self.created_at else None,
            "is_recent": self.created_at and self.created_at.date() == now.date(),
            "is_edited": self.updated_at and self.updated_at > self.created_at,
            "est_archive": self.est_archive,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }