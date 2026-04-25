"""
Sérialiseurs **isolés** pour l'endpoint de regroupement journalier des commentaires
(dédié module Plan d'action formation).

Ne remplace ni n'étend ``CommentaireSerializer`` : charge utile allégée pour la
sélection et l'aperçu dans l'écran de synthèse.
"""

from __future__ import annotations

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from ...models.commentaires import Commentaire


class PlanActionCommentaireGroupeItemSerializer(serializers.ModelSerializer):
    """
    Représentation minimale d'un commentaire dans un groupe « par jour ».

    Inclut l'identité de la formation et du centre pour le contexte métier
    sans dupliquer la charge du sérialiseur historique des commentaires.
    """

    formation_id = serializers.IntegerField(source="formation.id", read_only=True)
    formation_nom = serializers.CharField(source="formation.nom", read_only=True, allow_null=True)
    centre_id = serializers.IntegerField(source="formation.centre_id", read_only=True, allow_null=True)
    centre_nom = serializers.CharField(source="formation.centre.nom", read_only=True, allow_null=True)
    auteur = serializers.SerializerMethodField()

    class Meta:
        model = Commentaire
        fields = [
            "id",
            "contenu",
            "created_at",
            "statut_commentaire",
            "saturation",
            "formation_id",
            "formation_nom",
            "centre_id",
            "centre_nom",
            "auteur",
        ]
        read_only_fields = [
            "id",
            "contenu",
            "created_at",
            "statut_commentaire",
            "saturation",
            "formation_id",
            "formation_nom",
            "centre_id",
            "centre_nom",
            "auteur",
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_auteur(self, obj: Commentaire) -> str | None:
        """
        Libellé auteur (nom complet ou identifiant de connexion) pour l'affichage liste.
        """
        user = getattr(obj, "created_by", None)
        if not user:
            return None
        full = user.get_full_name() if hasattr(user, "get_full_name") else ""
        if full and str(full).strip():
            return str(full).strip()
        return getattr(user, "username", None) or str(getattr(user, "id", ""))
