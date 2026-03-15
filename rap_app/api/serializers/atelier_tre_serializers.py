from drf_spectacular.utils import extend_schema_field, extend_schema_serializer
from rest_framework import serializers

from ...models.atelier_tre import AtelierTRE, AtelierTREPresence, PresenceStatut
from ...models.candidat import Candidat
from ...models.centres import Centre


class CandidatMiniSerializer(serializers.ModelSerializer):
    """Sérialiseur minimal Candidat : id, nom (source nom_complet), read_only."""

    nom = serializers.CharField(source="nom_complet", read_only=True)

    class Meta:
        model = Candidat
        fields = ["id", "nom"]


class CentreMiniSerializer(serializers.ModelSerializer):
    """Sérialiseur minimal Centre : id, label (source nom), read_only."""

    label = serializers.CharField(source="nom", read_only=True)

    class Meta:
        model = Centre
        fields = ["id", "label"]


class AtelierTREPresenceSerializer(serializers.ModelSerializer):
    """Présence candidat à un atelier TRE : candidat, candidat_id, statut, statut_display, commentaire, dates."""

    candidat = CandidatMiniSerializer(read_only=True)
    candidat_id = serializers.PrimaryKeyRelatedField(
        source="candidat", queryset=Candidat.objects.all(), write_only=True
    )
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)

    class Meta:
        model = AtelierTREPresence
        fields = [
            "id",
            "candidat",
            "candidat_id",
            "statut",
            "statut_display",
            "commentaire",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "candidat", "statut_display", "created_at", "updated_at"]


@extend_schema_serializer()
class AtelierTRESerializer(serializers.ModelSerializer):
    """Sérialiseur principal AtelierTRE : type, date, centre, candidats, presences, nb_inscrits, presence_counts ; create/update gèrent les presences."""

    type_atelier_display = serializers.SerializerMethodField(read_only=True)
    nb_inscrits = serializers.SerializerMethodField(read_only=True)
    presence_counts = serializers.SerializerMethodField(read_only=True)

    centre = serializers.PrimaryKeyRelatedField(queryset=Centre.objects.all(), allow_null=True, required=False)
    candidats = serializers.PrimaryKeyRelatedField(many=True, queryset=Candidat.objects.all(), required=False)

    centre_detail = CentreMiniSerializer(source="centre", read_only=True)
    candidats_detail = CandidatMiniSerializer(source="candidats", many=True, read_only=True)

    presences = AtelierTREPresenceSerializer(many=True, required=False)

    class Meta:
        model = AtelierTRE
        fields = [
            "id",
            "type_atelier",
            "type_atelier_display",
            "date_atelier",
            "centre",
            "centre_detail",
            "candidats",
            "candidats_detail",
            "presences",
            "nb_inscrits",
            "presence_counts",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "type_atelier_display",
            "nb_inscrits",
            "created_by",
            "created_at",
            "updated_at",
            "presence_counts",
        ]

    @extend_schema_field(str)
    def get_type_atelier_display(self, obj) -> str:
        return obj.get_type_atelier_display()

    @extend_schema_field(str)
    def get_nb_inscrits(self, obj) -> int:
        annotated = getattr(obj, "nb_inscrits_calc", None)
        if isinstance(annotated, int):
            return annotated
        try:
            return obj.candidats.count()
        except Exception:
            return 0

    @extend_schema_field(str)
    def get_presence_counts(self, obj):
        annotated_keys = ["pres_present", "pres_absent", "pres_excuse", "pres_inconnu"]
        if all(hasattr(obj, k) for k in annotated_keys):
            return {
                "present": getattr(obj, "pres_present", 0) or 0,
                "absent": getattr(obj, "pres_absent", 0) or 0,
                "excuse": getattr(obj, "pres_excuse", 0) or 0,
                "inconnu": getattr(obj, "pres_inconnu", 0) or 0,
            }

        counts = {k: 0 for k, _ in PresenceStatut.choices}
        qs = getattr(obj, "presences", None)
        if qs is None:
            qs = AtelierTREPresence.objects.filter(atelier=obj)
        for item in qs.all():
            counts[item.statut] = counts.get(item.statut, 0) + 1
        return counts

    def validate(self, data):
        return data

    def create(self, validated_data):
        presences_data = validated_data.pop("presences", None)
        instance = super().create(validated_data)
        if presences_data:
            for pres in presences_data:
                candidat = pres.get("candidat") or pres.get("candidat_id")
                if not candidat:
                    continue
                AtelierTREPresence.objects.create(
                    atelier=instance,
                    candidat=candidat,
                    statut=pres.get("statut", PresenceStatut.INCONNU),
                    commentaire=pres.get("commentaire", ""),
                )
        return instance

    def update(self, instance, validated_data):
        presences_data = validated_data.pop("presences", None)
        instance = super().update(instance, validated_data)

        if presences_data is not None:
            for pres in presences_data:
                candidat = pres.get("candidat") or pres.get("candidat_id")
                if not candidat:
                    continue
                AtelierTREPresence.objects.update_or_create(
                    atelier=instance,
                    candidat=candidat,
                    defaults={
                        "statut": pres.get("statut", PresenceStatut.INCONNU),
                        "commentaire": pres.get("commentaire", ""),
                    },
                )
        return instance


@extend_schema_serializer()
class AtelierTREMetaSerializer(serializers.Serializer):
    """Choix pour l'UI : type_atelier, centre, candidat, presence_statut (format {value, label})."""

    type_atelier_choices = serializers.SerializerMethodField()
    centre_choices = serializers.SerializerMethodField()
    candidat_choices = serializers.SerializerMethodField()
    presence_statut_choices = serializers.SerializerMethodField()

    @extend_schema_field(str)
    def get_type_atelier_choices(self, _):
        return [{"value": v, "label": l} for v, l in AtelierTRE.TypeAtelier.choices]

    @extend_schema_field(str)
    def get_centre_choices(self, _):
        qs = Centre.objects.order_by("nom").values_list("id", "nom")
        return [{"value": i, "label": n} for i, n in qs]

    @extend_schema_field(str)
    def get_candidat_choices(self, _):
        qs = Candidat.objects.order_by("nom", "prenom").values_list("id", "nom", "prenom")
        return [{"value": i, "label": f"{n} {p}".strip()} for i, n, p in qs]

    @extend_schema_field(str)
    def get_presence_statut_choices(self, _):
        return [{"value": v, "label": l} for v, l in PresenceStatut.choices]
