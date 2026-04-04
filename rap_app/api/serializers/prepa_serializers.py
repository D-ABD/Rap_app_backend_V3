# rap_app/api/serializers/prepa_serializers.py
from drf_spectacular.utils import OpenApiExample, extend_schema_field, extend_schema_serializer
from rest_framework import serializers

from ...models.centres import Centre
from ...models.prepa import Prepa, StagiairePrepa
from .rich_text_utils import sanitize_rich_text


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "Centre light prepa",
            value={"id": 1, "nom": "Centre de Lille", "departement": "59", "code_postal": "59000"},
            response_only=True,
        )
    ]
)
class CentreLightSerializer(serializers.ModelSerializer):
    """
    Représentation minimale d'un centre pour le module Prépa.
    """

    class Meta:
        model = Centre
        fields = ["id", "nom", "departement", "code_postal"]


class StagiairePrepaNestedSerializer(serializers.ModelSerializer):
    """
    Représentation compacte d'un stagiaire Prépa rattaché à une séance d'origine.
    """

    statut_parcours_display = serializers.CharField(source="get_statut_parcours_display", read_only=True)

    class Meta:
        model = StagiairePrepa
        fields = ["id", "nom", "prenom", "telephone", "email", "statut_parcours", "statut_parcours_display"]
        read_only_fields = ["id"]


class StagiairePrepaSerializer(serializers.ModelSerializer):
    """
    Sérialiseur complet du suivi nominatif des stagiaires Prépa.
    """

    centre = CentreLightSerializer(read_only=True)
    centre_id = serializers.PrimaryKeyRelatedField(
        queryset=Centre.objects.all(),
        source="centre",
        write_only=True,
        required=False,
        allow_null=True,
    )
    centre_nom = serializers.CharField(source="centre.nom", read_only=True)
    prepa_origine_id = serializers.PrimaryKeyRelatedField(
        queryset=Prepa.objects.select_related("centre").all(),
        source="prepa_origine",
        write_only=True,
        required=False,
        allow_null=True,
    )
    prepa_origine_label = serializers.SerializerMethodField()
    statut_parcours_display = serializers.CharField(source="get_statut_parcours_display", read_only=True)
    ateliers_realises_count = serializers.SerializerMethodField()
    ateliers_realises_labels = serializers.SerializerMethodField()
    dernier_atelier_label = serializers.SerializerMethodField()
    dernier_atelier_date = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = StagiairePrepa
        fields = [
            "id",
            "is_active",
            "prepa_origine_id",
            "prepa_origine_label",
            "centre",
            "centre_id",
            "centre_nom",
            "nom",
            "prenom",
            "telephone",
            "email",
            "statut_parcours",
            "statut_parcours_display",
            "date_entree_parcours",
            "date_sortie_parcours",
            "commentaire_suivi",
            "motif_abandon",
            "atelier_1_realise",
            "atelier_2_realise",
            "atelier_3_realise",
            "atelier_4_realise",
            "atelier_5_realise",
            "atelier_6_realise",
            "atelier_autre_realise",
            "date_atelier_1",
            "date_atelier_2",
            "date_atelier_3",
            "date_atelier_4",
            "date_atelier_5",
            "date_atelier_6",
            "date_atelier_autre",
            "ateliers_realises_count",
            "ateliers_realises_labels",
            "dernier_atelier_label",
            "dernier_atelier_date",
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
            "prepa_origine_label",
            "centre_nom",
            "statut_parcours_display",
            "ateliers_realises_count",
            "ateliers_realises_labels",
            "dernier_atelier_label",
            "dernier_atelier_date",
        ]

    def get_prepa_origine_label(self, obj):
        prepa = getattr(obj, "prepa_origine", None)
        if not prepa:
            return ""
        centre_nom = getattr(getattr(prepa, "centre", None), "nom", None)
        suffix = f" - {centre_nom}" if centre_nom else ""
        return f"{prepa.get_type_prepa_display()} du {prepa.date_prepa:%d/%m/%Y}{suffix}"

    def get_ateliers_realises_count(self, obj):
        return obj.ateliers_realises_count

    def get_ateliers_realises_labels(self, obj):
        return obj.ateliers_realises_labels

    def get_dernier_atelier_label(self, obj):
        return obj.dernier_atelier_label

    def get_dernier_atelier_date(self, obj):
        return obj.dernier_atelier_date

    def validate(self, attrs):
        attrs = super().validate(attrs)
        statut = attrs.get("statut_parcours", getattr(self.instance, "statut_parcours", None))
        motif = attrs.get("motif_abandon", getattr(self.instance, "motif_abandon", None))

        if statut == StagiairePrepa.StatutParcours.ABANDON and not motif:
            raise serializers.ValidationError(
                {"motif_abandon": "Le motif d'abandon est requis quand le statut est Abandon."}
            )

        return attrs

    def validate_commentaire_suivi(self, value):
        return sanitize_rich_text(value)


@extend_schema_serializer(
    examples=[
        OpenApiExample(
            "Prepa",
            value={
                "id": 45,
                "type_prepa": "info_collective",
                "type_prepa_display": "Information collective",
                "date_prepa": "2025-09-12",
                "centre": {"id": 2, "nom": "Centre de Lille", "departement": "59", "code_postal": "59000"},
                "centre_nom": "Centre de Lille",
                "formateur_animateur": "Sonia Martin",
                "stagiaires_prepa": [
                    {
                        "id": 3,
                        "nom": "Dupont",
                        "prenom": "Lina",
                        "telephone": "0600000000",
                        "email": "lina@example.com",
                        "statut_parcours": "en_attente",
                    }
                ],
                "nb_presents_info": 10,
                "nb_absents_info": 2,
                "nb_adhesions": 8,
                "nb_presents_prepa": 8,
                "nb_absents_prepa": 2,
                "taux_presence_info": 83.3,
                "taux_presence_atelier": None,
                "taux_presence_global": 83.3,
            },
            response_only=True,
        )
    ]
)
class PrepaSerializer(serializers.ModelSerializer):
    """
    Sérialiseur du module Prépa avec la liste compacte des stagiaires suivis.
    """

    centre = CentreLightSerializer(read_only=True)
    centre_id = serializers.PrimaryKeyRelatedField(
        queryset=Centre.objects.all(), source="centre", write_only=True, help_text="Identifiant du centre concerné."
    )
    centre_nom = serializers.CharField(source="centre.nom", read_only=True)
    stagiaires_prepa = StagiairePrepaNestedSerializer(many=True, required=False)

    taux_prescription = serializers.SerializerMethodField()
    taux_presence_info = serializers.SerializerMethodField()
    taux_presence_atelier = serializers.SerializerMethodField()
    taux_presence_global = serializers.SerializerMethodField()
    taux_adhesion = serializers.SerializerMethodField()
    taux_presence_prepa = serializers.SerializerMethodField()
    objectif_annuel = serializers.SerializerMethodField()
    taux_atteinte_annuel = serializers.SerializerMethodField()
    reste_a_faire = serializers.SerializerMethodField()

    type_prepa_display = serializers.CharField(source="get_type_prepa_display", read_only=True)
    date_display = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)

    inscrits = serializers.SerializerMethodField()
    presents = serializers.SerializerMethodField()
    absents = serializers.SerializerMethodField()
    adhesions_ic = serializers.SerializerMethodField()

    class Meta:
        model = Prepa
        fields = [
            "id",
            "type_prepa",
            "type_prepa_display",
            "date_prepa",
            "date_display",
            "is_active",
            "centre",
            "centre_id",
            "centre_nom",
            "formateur_animateur",
            "stagiaires_prepa",
            "nombre_places_ouvertes",
            "nombre_prescriptions",
            "nb_presents_info",
            "nb_absents_info",
            "nb_adhesions",
            "nb_inscrits_prepa",
            "nb_presents_prepa",
            "nb_absents_prepa",
            "inscrits",
            "presents",
            "absents",
            "adhesions_ic",
            "taux_prescription",
            "taux_presence_info",
            "taux_presence_atelier",
            "taux_presence_global",
            "taux_adhesion",
            "taux_presence_prepa",
            "objectif_annuel",
            "taux_atteinte_annuel",
            "reste_a_faire",
            "commentaire",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["created_at", "updated_at", "created_by", "updated_by"]

    @extend_schema_field(serializers.CharField)
    def get_date_display(self, obj):
        return obj.date_prepa.strftime("%d/%m/%Y") if obj.date_prepa else ""

    @extend_schema_field(serializers.FloatField)
    def get_taux_prescription(self, obj):
        return obj.taux_prescription

    @extend_schema_field(serializers.FloatField)
    def get_taux_presence_info(self, obj):
        if obj.type_prepa != Prepa.TypePrepa.INFO_COLLECTIVE:
            return None
        total = (obj.nb_presents_info or 0) + (obj.nb_absents_info or 0)
        return round(obj.nb_presents_info / total * 100, 1) if total else None

    @extend_schema_field(serializers.FloatField)
    def get_taux_presence_atelier(self, obj):
        if obj.type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE:
            return None
        total = (obj.nb_presents_prepa or 0) + (obj.nb_absents_prepa or 0)
        return round(obj.nb_presents_prepa / total * 100, 1) if total else None

    @extend_schema_field(serializers.FloatField)
    def get_taux_presence_global(self, obj):
        return (
            self.get_taux_presence_info(obj)
            if obj.type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE
            else self.get_taux_presence_atelier(obj)
        )

    @extend_schema_field(serializers.FloatField)
    def get_taux_adhesion(self, obj):
        return obj.taux_adhesion

    @extend_schema_field(serializers.FloatField)
    def get_taux_presence_prepa(self, obj):
        return obj.taux_presence_prepa

    @extend_schema_field(serializers.IntegerField)
    def get_objectif_annuel(self, obj):
        return obj.objectif_annuel or 0

    @extend_schema_field(serializers.FloatField)
    def get_taux_atteinte_annuel(self, obj):
        return obj.taux_atteinte_annuel

    @extend_schema_field(serializers.IntegerField)
    def get_reste_a_faire(self, obj):
        return obj.reste_a_faire

    @extend_schema_field(serializers.IntegerField)
    def get_inscrits(self, obj):
        return obj.nombre_prescriptions if obj.type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE else obj.nb_inscrits_prepa

    @extend_schema_field(serializers.IntegerField)
    def get_presents(self, obj):
        return obj.nb_presents_info if obj.type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE else obj.nb_presents_prepa

    @extend_schema_field(serializers.IntegerField)
    def get_absents(self, obj):
        return obj.nb_absents_info if obj.type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE else obj.nb_absents_prepa

    @extend_schema_field(serializers.IntegerField)
    def get_adhesions_ic(self, obj):
        return obj.nb_adhesions if obj.type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE else 0

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        stagiaires_data = validated_data.pop("stagiaires_prepa", [])
        instance = Prepa(**validated_data)
        instance.save(user=user)
        self._sync_stagiaires_prepa(instance, stagiaires_data, user=user)
        return instance

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        stagiaires_data = validated_data.pop("stagiaires_prepa", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save(user=user)
        if stagiaires_data is not None:
            self._sync_stagiaires_prepa(instance, stagiaires_data, user=user)
        return instance

    def validate(self, attrs):
        type_prepa = attrs.get("type_prepa", getattr(self.instance, "type_prepa", None))
        stagiaires = attrs.get("stagiaires_prepa", None)

        if type_prepa == Prepa.TypePrepa.INFO_COLLECTIVE and attrs.get("nombre_places_ouvertes", 0) == 0:
            raise serializers.ValidationError(
                "Les informations collectives doivent avoir un nombre de places ouvert > 0."
            )

        if stagiaires is not None:
            attrs["stagiaires_prepa"] = self._normalize_stagiaires(stagiaires)

        return attrs

    def validate_commentaire(self, value):
        return sanitize_rich_text(value)

    def _sync_stagiaires_prepa(self, instance: Prepa, stagiaires_data, user=None) -> None:
        existing = {stagiaire.id: stagiaire for stagiaire in instance.stagiaires_prepa.all()}
        keep_ids = set()

        for stagiaire_data in stagiaires_data or []:
            stagiaire_id = stagiaire_data.pop("id", None)
            if stagiaire_id and stagiaire_id in existing:
                stagiaire = existing[stagiaire_id]
                for field in ["nom", "prenom", "telephone", "email", "statut_parcours"]:
                    if field in stagiaire_data:
                        setattr(stagiaire, field, stagiaire_data[field])
                stagiaire.save(user=user)
                keep_ids.add(stagiaire.id)
                continue

            stagiaire = StagiairePrepa(
                prepa_origine=instance,
                centre=instance.centre,
                date_entree_parcours=instance.date_prepa,
                **stagiaire_data,
            )
            stagiaire.save(user=user)
            keep_ids.add(stagiaire.id)

        for stagiaire in instance.stagiaires_prepa.exclude(id__in=keep_ids):
            if (
                not stagiaire.a_deja_commence
                and stagiaire.statut_parcours == StagiairePrepa.StatutParcours.EN_ATTENTE
            ):
                stagiaire.delete(user=user)

    def _normalize_stagiaires(self, stagiaires_data):
        normalized = []
        for index, stagiaire in enumerate(stagiaires_data or []):
            nom = (stagiaire.get("nom") or "").strip()
            prenom = (stagiaire.get("prenom") or "").strip()
            telephone = (stagiaire.get("telephone") or "").strip()
            email = (stagiaire.get("email") or "").strip()
            statut = stagiaire.get("statut_parcours") or StagiairePrepa.StatutParcours.EN_ATTENTE
            existing_id = stagiaire.get("id")

            if not any([nom, prenom, telephone, email]):
                continue

            if not nom or not prenom:
                raise serializers.ValidationError(
                    {"stagiaires_prepa": [f"Ligne stagiaire {index + 1} : le nom et le prénom sont obligatoires."]}
                )

            normalized.append(
                {
                    **({"id": existing_id} if existing_id else {}),
                    "nom": nom,
                    "prenom": prenom,
                    "telephone": telephone or None,
                    "email": email or None,
                    "statut_parcours": statut,
                }
            )

        return normalized
