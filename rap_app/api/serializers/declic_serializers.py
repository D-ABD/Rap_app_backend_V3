"""Sérialiseurs des séances Déclic et de leurs participants."""

from drf_spectacular.utils import extend_schema_field, extend_schema_serializer
from rest_framework import serializers

from ...models.centres import Centre
from ...models.declic import Declic, ParticipantDeclic
from .rich_text_utils import sanitize_rich_text


@extend_schema_serializer(
    examples=[
        {
            "id": 1,
            "nom": "Centre de Lille",
            "departement": "59",
            "code_postal": "59000",
        }
    ]
)
class DeclicCentreLightSerializer(serializers.ModelSerializer):
    """
    Représentation minimale d'un centre (id, nom, departement, code_postal) pour les Déclics.
    Lecture seule.
    """

    class Meta:
        model = Centre
        fields = ["id", "nom", "departement", "code_postal"]


class ParticipantDeclicNestedSerializer(serializers.ModelSerializer):
    """
    Représentation compacte d'un participant lié à une séance Déclic.
    """

    class Meta:
        model = ParticipantDeclic
        fields = [
            "id",
            "nom",
            "prenom",
            "telephone",
            "email",
            "present",
            "commentaire_presence",
        ]
        read_only_fields = ["id"]


class ParticipantDeclicSerializer(serializers.ModelSerializer):
    """
    Sérialiseur complet du suivi nominatif des participants Déclic.
    """

    centre = DeclicCentreLightSerializer(read_only=True)
    centre_id = serializers.PrimaryKeyRelatedField(
        queryset=Centre.objects.all(),
        source="centre",
        write_only=True,
        required=False,
        allow_null=True,
    )
    centre_nom = serializers.CharField(source="centre.nom", read_only=True)
    declic_origine_id = serializers.PrimaryKeyRelatedField(
        queryset=Declic.objects.select_related("centre").all(),
        source="declic_origine",
        write_only=True,
        required=False,
        allow_null=True,
    )
    declic_origine_label = serializers.SerializerMethodField()
    type_declic = serializers.CharField(source="declic_origine.type_declic", read_only=True)
    type_declic_display = serializers.CharField(source="declic_origine.get_type_declic_display", read_only=True)
    date_declic = serializers.DateField(source="declic_origine.date_declic", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = ParticipantDeclic
        fields = [
            "id",
            "is_active",
            "declic_origine_id",
            "declic_origine_label",
            "type_declic",
            "type_declic_display",
            "date_declic",
            "centre",
            "centre_id",
            "centre_nom",
            "nom",
            "prenom",
            "telephone",
            "email",
            "present",
            "commentaire_presence",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "centre_nom",
            "declic_origine_label",
            "type_declic",
            "type_declic_display",
            "date_declic",
        ]

    @extend_schema_field(serializers.CharField())
    def get_declic_origine_label(self, obj) -> str:
        declic = getattr(obj, "declic_origine", None)
        if not declic:
            return ""
        centre_nom = getattr(getattr(declic, "centre", None), "nom", None)
        suffix = f" - {centre_nom}" if centre_nom else ""
        return f"{declic.get_type_declic_display()} du {declic.date_declic:%d/%m/%Y}{suffix}"

    def validate_commentaire_presence(self, value):
        return sanitize_rich_text(value)


class DeclicSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour le modèle Declic (ateliers) : champs du modèle, centre (nested) / centre_id (write_only), champs calculés (taux_presence_atelier, objectif_annuel, taux_atteinte_annuel, reste_a_faire, date_display).
    create/update : passent request.user à save(user=user).
    """

    centre = DeclicCentreLightSerializer(read_only=True)
    centre_id = serializers.PrimaryKeyRelatedField(
        queryset=Centre.objects.all(),
        source="centre",
        write_only=True,
    )
    centre_nom = serializers.CharField(source="centre.nom", read_only=True)
    participants_declic = ParticipantDeclicNestedSerializer(many=True, required=False)

    taux_presence_atelier = serializers.SerializerMethodField()
    objectif_annuel = serializers.SerializerMethodField()
    taux_atteinte_annuel = serializers.SerializerMethodField()
    reste_a_faire = serializers.SerializerMethodField()

    type_declic_display = serializers.CharField(source="get_type_declic_display", read_only=True)

    date_display = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Declic
        fields = [
            "id",
            "type_declic",
            "type_declic_display",
            "date_declic",
            "date_display",
            "is_active",
            "centre",
            "centre_id",
            "centre_nom",
            "participants_declic",
            "nb_inscrits_declic",
            "nb_presents_declic",
            "nb_absents_declic",
            "taux_presence_atelier",
            "objectif_annuel",
            "taux_atteinte_annuel",
            "reste_a_faire",
            "commentaire",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    @extend_schema_field(serializers.CharField())
    def get_date_display(self, obj) -> str:
        """Retourne date_declic au format dd/mm/YYYY."""
        return obj.date_declic.strftime("%d/%m/%Y")

    @extend_schema_field(serializers.FloatField())
    def get_taux_presence_atelier(self, obj) -> float:
        """Taux de présence en % (nb_presents / (nb_presents + nb_absents) * 100), une décimale ; 0 si total nul."""
        total = obj.nb_presents_declic + obj.nb_absents_declic
        return round(obj.nb_presents_declic / total * 100, 1) if total else 0

    @extend_schema_field(serializers.IntegerField())
    def get_objectif_annuel(self, obj) -> int:
        """Retourne la propriété objectif_annuel du modèle."""
        return obj.objectif_annuel

    @extend_schema_field(serializers.FloatField())
    def get_taux_atteinte_annuel(self, obj) -> float:
        """Retourne la propriété taux_atteinte_annuel du modèle."""
        return obj.taux_atteinte_annuel

    @extend_schema_field(serializers.IntegerField())
    def get_reste_a_faire(self, obj) -> int:
        """Retourne la propriété reste_a_faire du modèle."""
        return obj.reste_a_faire

    def create(self, validated_data):
        """Crée une instance Declic et appelle save(user=request.user)."""
        user = self.context.get("request").user
        participants_data = validated_data.pop("participants_declic", [])
        instance = Declic(**validated_data)
        instance.save(user=user)
        self._sync_participants_declic(instance, participants_data, user=user)
        return instance

    def update(self, instance, validated_data):
        """Met à jour l'instance et appelle save(user=request.user)."""
        user = self.context.get("request").user
        participants_data = validated_data.pop("participants_declic", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save(user=user)
        if participants_data is not None:
            self._sync_participants_declic(instance, participants_data, user=user)
        return instance

    def validate(self, attrs):
        attrs = super().validate(attrs)
        participants = attrs.get("participants_declic", None)
        if participants is not None:
            attrs["participants_declic"] = self._normalize_participants(participants)
        return attrs

    def validate_commentaire(self, value):
        return sanitize_rich_text(value)

    def _sync_participants_declic(self, instance: Declic, participants_data, user=None) -> None:
        existing = {participant.id: participant for participant in instance.participants_declic.all()}
        keep_ids = set()

        for participant_data in participants_data or []:
            participant_id = participant_data.pop("id", None)
            if participant_id and participant_id in existing:
                participant = existing[participant_id]
                for field in ["nom", "prenom", "telephone", "email", "present", "commentaire_presence"]:
                    if field in participant_data:
                        setattr(participant, field, participant_data[field])
                participant.save(user=user)
                keep_ids.add(participant.id)
                continue

            participant = ParticipantDeclic(declic_origine=instance, centre=instance.centre, **participant_data)
            participant.save(user=user)
            keep_ids.add(participant.id)

        instance.participants_declic.exclude(id__in=keep_ids).delete()

    def _normalize_participants(self, participants_data):
        normalized = []
        for index, participant in enumerate(participants_data or []):
            nom = (participant.get("nom") or "").strip()
            prenom = (participant.get("prenom") or "").strip()
            telephone = (participant.get("telephone") or "").strip()
            email = (participant.get("email") or "").strip()
            existing_id = participant.get("id")

            if not any([nom, prenom, telephone, email]):
                continue

            if not nom or not prenom:
                raise serializers.ValidationError(
                    {
                        "participants_declic": [
                            f"Ligne participant {index + 1} : le nom et le prénom sont obligatoires."
                        ]
                    }
                )

            normalized.append(
                {
                    **({"id": existing_id} if existing_id else {}),
                    "nom": nom,
                    "prenom": prenom,
                    "telephone": telephone or None,
                    "email": email or None,
                    "present": bool(participant.get("present", True)),
                    "commentaire_presence": (participant.get("commentaire_presence") or "").strip() or None,
                }
            )

        return normalized
