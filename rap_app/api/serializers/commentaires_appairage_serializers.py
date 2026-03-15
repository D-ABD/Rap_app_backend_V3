from rest_framework import serializers
from drf_spectacular.utils import extend_schema_serializer, extend_schema_field, OpenApiExample
from django.utils.translation import gettext_lazy as _

from ...models.commentaires_appairage import CommentaireAppairage


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            name="Commentaire appairage (création)",
            value={
                "appairage": 12,
                "body": "Premier échange avec le partenaire.",
            },
            request_only=True,
        ),
        OpenApiExample(
            name="Réponse succès",
            value={
                "id": 42,
                "appairage": 12,
                "appairage_label": "Durand Jean → Formation Y",
                "body": "Premier échange avec le partenaire.",
                "auteur_nom": "Jean Dupont",
                "created_by_username": "jean.dupont",
                "candidat_nom": "Durand",
                "candidat_prenom": "Jean",
                "partenaire_nom": "Entreprise X",
                "formation_nom": "Formation Y",
                "formation_numero_offre": "FO-2025-001",
                "formation_centre": "Centre A",
                "formation_type_offre": "Collective",
                "statut_snapshot": "transmis",
                "statut_commentaire": "actif",
                "statut_commentaire_display": "Actif",
                "est_archive": False,
                "appairage_statut_display": "Transmis",
                "created_at": "2025-09-13T11:20:00Z",
                "updated_at": "2025-09-13T11:20:00Z",
            },
            response_only=True,
        ),
    ]
)
class CommentaireAppairageSerializer(serializers.ModelSerializer):
    """
    Sérialiseur en lecture seule pour les commentaires d'appairage.
    Expose les champs du modèle et les champs calculés (auteur_nom, appairage_label, etc.) via les relations appairage → candidat, partenaire, formation.
    """

    auteur_nom = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    appairage_label = serializers.SerializerMethodField()
    est_archive = serializers.SerializerMethodField(read_only=True)

    candidat_nom = serializers.CharField(source="appairage.candidat.nom", read_only=True)
    candidat_prenom = serializers.CharField(source="appairage.candidat.prenom", read_only=True)
    partenaire_nom = serializers.CharField(source="appairage.partenaire.nom", read_only=True)
    formation_nom = serializers.CharField(source="appairage.formation.nom", read_only=True)
    formation_numero_offre = serializers.CharField(source="appairage.formation.numero_offre", read_only=True)
    formation_centre = serializers.CharField(source="appairage.formation.centre.nom", read_only=True)
    formation_type_offre = serializers.CharField(source="appairage.formation.type_offre.nom", read_only=True)

    appairage_statut_display = serializers.CharField(source="appairage.get_statut_display", read_only=True)

    statut_commentaire_display = serializers.CharField(
        source="get_statut_commentaire_display", read_only=True
    )

    @extend_schema_field(str)
    def get_auteur_nom(self, obj):
        """Retourne le nom complet de l'auteur (created_by) ou 'Anonyme' si absent."""
        u = getattr(obj, "created_by", None)
        if not u:
            return "Anonyme"
        return u.get_full_name() or getattr(u, "username", None) or getattr(u, "email", None)

    @extend_schema_field(str)
    def get_created_by_username(self, obj):
        """Retourne le username du créateur du commentaire."""
        return getattr(getattr(obj, "created_by", None), "username", "—")

    @extend_schema_field(str)
    def get_appairage_label(self, obj):
        """Construit un libellé lisible pour l'appairage (candidat et/ou formation)."""
        cand = getattr(obj.appairage, "candidat", None)
        form = getattr(obj.appairage, "formation", None)
        if cand and form:
            return f"{cand.prenom} {cand.nom} → {form.nom}"
        if cand:
            return f"{cand.prenom} {cand.nom}"
        if form:
            return f"Formation {form.nom}"
        return f"Appairage {obj.appairage_id}"

    @extend_schema_field(str)
    def get_est_archive(self, obj: CommentaireAppairage) -> bool:
        """Retourne la propriété est_archive du modèle."""
        return obj.est_archive

    class Meta:
        model = CommentaireAppairage
        fields = [
            "id",
            "appairage",
            "appairage_label",
            "body",
            "auteur_nom",
            "created_by_username",
            "created_at",
            "updated_at",
            "candidat_nom",
            "candidat_prenom",
            "partenaire_nom",
            "formation_nom",
            "formation_numero_offre",
            "formation_centre",
            "formation_type_offre",
            "statut_snapshot",
            "statut_commentaire",
            "statut_commentaire_display",
            "est_archive",
            "appairage_statut_display",
        ]
        read_only_fields = fields
        ref_name = "CommentaireAppairageNested"


class CommentaireAppairageWriteSerializer(serializers.ModelSerializer):
    """
    Sérialiseur d'écriture pour la création et la mise à jour des commentaires d'appairage.
    Champs acceptés en entrée : appairage, body, statut_commentaire. Pas de validation personnalisée dans ce sérialiseur.
    """

    class Meta:
        model = CommentaireAppairage
        fields = ["appairage", "body", "statut_commentaire"]
