"""Sérialiseurs des commentaires de prospection."""

import bleach
from bleach.css_sanitizer import CSSSanitizer
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema_field, extend_schema_serializer
from rest_framework import serializers

from ...models.prospection import Prospection
from ...models.prospection_comments import ProspectionComment

ALLOWED_TAGS = ["a", "b", "i", "strong", "em", "u", "strike", "span", "p", "br", "ul", "ol", "li"]
ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "target", "rel"],
    "span": ["style"],
}
css_sanitizer = CSSSanitizer(
    allowed_css_properties=[
        "color",
        "background-color",
        "font-weight",
        "font-style",
        "text-decoration",
    ]
)


class ProspectionCommentSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour ProspectionComment : prospection_id (write_only), prospection (read_only), champs enrichis (partenaire_nom, formation_nom, prospection_text, etc.), body, is_internal, statut_commentaire. validate : utilisateur authentifié ; si is_candidat_or_stagiaire, contraintes (propriétaire, pas interne, statut actif, pas de changement de prospection). validate_body : nettoyage HTML (bleach). update : repasse body par validate_body, sauvegarde avec update_fields.
    """

    prospection_id = serializers.PrimaryKeyRelatedField(
        source="prospection",
        queryset=Prospection.objects.all(),
        write_only=True,
    )
    prospection = serializers.IntegerField(source="prospection_id", read_only=True)

    est_archive = serializers.SerializerMethodField(read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    partenaire_nom = serializers.SerializerMethodField(read_only=True)
    formation_nom = serializers.SerializerMethodField(read_only=True)
    prospection_text = serializers.SerializerMethodField(read_only=True)

    prospection_owner = serializers.IntegerField(source="prospection.owner_id", read_only=True)
    prospection_owner_username = serializers.CharField(source="prospection.owner.username", read_only=True)
    prospection_partenaire = serializers.IntegerField(source="prospection.partenaire_id", read_only=True)

    statut_commentaire_display = serializers.CharField(source="get_statut_commentaire_display", read_only=True)

    class Meta:
        model = ProspectionComment
        fields = [
            "id",
            "prospection_id",
            "prospection",
            "prospection_owner",
            "prospection_owner_username",
            "prospection_partenaire",
            "partenaire_nom",
            "formation_nom",
            "prospection_text",
            "body",
            "is_internal",
            "statut_commentaire",
            "statut_commentaire_display",
            "est_archive",
            "created_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by_username",
            "prospection",
            "prospection_owner",
            "prospection_owner_username",
            "prospection_partenaire",
            "partenaire_nom",
            "formation_nom",
            "prospection_text",
            "statut_commentaire_display",
            "est_archive",
        ]

    @extend_schema_field(str)
    def get_est_archive(self, obj: ProspectionComment) -> bool:
        """Retourne obj.est_archive."""
        return obj.est_archive

    def _safe_label(self, obj, candidates):
        """Retourne le premier attribut non vide parmi candidates sur obj, ou None."""
        for name in candidates:
            if hasattr(obj, name):
                val = getattr(obj, name)
                if isinstance(val, str) and val.strip():
                    return val
        return None

    @extend_schema_field(str)
    def get_partenaire_nom(self, obj: ProspectionComment):
        """Premier libellé non vide parmi nom, name, libelle, label, titre, intitule sur obj.prospection.partenaire."""
        partenaire = getattr(obj.prospection, "partenaire", None)
        if not partenaire:
            return None
        return self._safe_label(partenaire, ["nom", "name", "libelle", "label", "titre", "intitule"])

    @extend_schema_field(str)
    def get_formation_nom(self, obj: ProspectionComment):
        """Premier libellé non vide parmi nom, intitule, titre, name, libelle, label sur obj.prospection.formation."""
        formation = getattr(obj.prospection, "formation", None)
        if not formation:
            return None
        return self._safe_label(formation, ["nom", "intitule", "titre", "name", "libelle", "label"])

    @extend_schema_field(str)
    def get_prospection_text(self, obj: ProspectionComment) -> str:
        """Chaîne 'partenaire_nom • formation_nom' si possible, sinon '#prospection_id'."""
        partner = self.get_partenaire_nom(obj)
        formation = self.get_formation_nom(obj)
        parts = [p for p in (partner, formation) if p]
        return " • ".join(parts) if parts else f"#{obj.prospection_id}"

    def validate(self, attrs):
        """Exige utilisateur authentifié ; si is_candidat_or_stagiaire, applique les règles (propriétaire, pas interne, statut actif, pas de changement de prospection)."""
        request = self.context.get("request")
        user = getattr(request, "user", None)

        prospection = attrs.get("prospection") or getattr(self.instance, "prospection", None)
        is_internal = attrs.get("is_internal", getattr(self.instance, "is_internal", False))
        statut_commentaire = attrs.get("statut_commentaire", getattr(self.instance, "statut_commentaire", "actif"))

        if not user or not user.is_authenticated:
            raise serializers.ValidationError(_("Authentification requise."))

        if hasattr(user, "is_candidat_or_stagiaire") and user.is_candidat_or_stagiaire():
            if prospection is None or prospection.owner_id != user.id:
                raise serializers.ValidationError(_("Vous ne pouvez commenter que vos propres prospections."))
            if is_internal:
                raise serializers.ValidationError(_("Un candidat ne peut pas créer un commentaire interne."))
            if statut_commentaire != "actif":
                raise serializers.ValidationError(_("Un candidat ne peut pas archiver un commentaire."))
            if self.instance is not None and "prospection" in attrs and prospection.id != self.instance.prospection_id:
                raise serializers.ValidationError(_("Vous ne pouvez pas changer la prospection d'un commentaire."))

        return attrs

    def validate_body(self, value: str) -> str:
        """Nettoie le HTML (balises et attributs autorisés) avec bleach puis linkify."""
        cleaned = bleach.clean(
            value or "",
            tags=ALLOWED_TAGS,
            attributes=ALLOWED_ATTRIBUTES,
            css_sanitizer=css_sanitizer,
            strip=True,
            strip_comments=True,
        )
        return bleach.linkify(cleaned)

    def update(self, instance: ProspectionComment, validated_data):
        """Met à jour body via validate_body puis applique les autres champs ; save(update_fields=['body', 'updated_at'])."""
        contenu = validated_data.get("body", instance.body)
        instance.body = self.validate_body(contenu)
        for attr, value in validated_data.items():
            if attr != "body":
                setattr(instance, attr, value)
        instance.save(update_fields=["body", "updated_at"])
        return instance
