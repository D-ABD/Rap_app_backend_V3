"""Sérialiseurs API du module Plan d'action formation (lecture / écriture séparés)."""

from __future__ import annotations

from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from ...models.commentaires import Commentaire
from ...models.formations import Formation
from ...models.plan_action import PlanActionFormation
from ..roles import is_admin_like, staff_centre_ids


class PlanActionFormationListSerializer(serializers.ModelSerializer):
    """
    Vue compacte pour les listes paginées : identifiants, période, périmètre,
    compteur et métadonnées d'audit légères.
    """

    periode_type_display = serializers.CharField(source="get_periode_type_display", read_only=True)
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    centre_nom = serializers.CharField(source="centre.nom", read_only=True, allow_null=True)
    formation_nom = serializers.CharField(source="formation.nom", read_only=True, allow_null=True)
    created_by_label = serializers.SerializerMethodField()

    class Meta:
        model = PlanActionFormation
        fields = [
            "id",
            "titre",
            "slug",
            "date_debut",
            "date_fin",
            "periode_type",
            "periode_type_display",
            "centre",
            "centre_nom",
            "formation",
            "formation_nom",
            "statut",
            "statut_display",
            "nb_commentaires",
            "created_at",
            "updated_at",
            "created_by",
            "created_by_label",
        ]
        read_only_fields = [
            "id",
            "titre",
            "slug",
            "date_debut",
            "date_fin",
            "periode_type",
            "periode_type_display",
            "centre",
            "centre_nom",
            "formation",
            "formation_nom",
            "statut",
            "statut_display",
            "nb_commentaires",
            "created_at",
            "updated_at",
            "created_by",
            "created_by_label",
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_created_by_label(self, obj) -> str | None:
        """Prénom / nom d'utilisateur ou identifiant de connexion."""
        user = getattr(obj, "created_by", None)
        if not user:
            return None
        full = user.get_full_name() if hasattr(user, "get_full_name") else ""
        if full and str(full).strip():
            return str(full).strip()
        return getattr(user, "username", None) or str(user.id)


class PlanActionFormationReadSerializer(serializers.ModelSerializer):
    """
    Détail en lecture seule : champs complets, libellés affichables et
    identifiants des commentaires liés.
    """

    periode_type_display = serializers.CharField(source="get_periode_type_display", read_only=True)
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    centre_nom = serializers.CharField(source="centre.nom", read_only=True, allow_null=True)
    formation_nom = serializers.CharField(source="formation.nom", read_only=True, allow_null=True)
    commentaire_ids = serializers.SerializerMethodField()
    created_by_label = serializers.SerializerMethodField()
    updated_by_label = serializers.SerializerMethodField()

    class Meta:
        model = PlanActionFormation
        fields = [
            "id",
            "titre",
            "slug",
            "date_debut",
            "date_fin",
            "periode_type",
            "periode_type_display",
            "centre",
            "centre_nom",
            "formation",
            "formation_nom",
            "synthese",
            "resume_points_cles",
            "plan_action",
            "plan_action_structured",
            "statut",
            "statut_display",
            "nb_commentaires",
            "metadata",
            "commentaire_ids",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "created_by_label",
            "updated_by",
            "updated_by_label",
        ]
        read_only_fields = [
            "id",
            "titre",
            "slug",
            "date_debut",
            "date_fin",
            "periode_type",
            "periode_type_display",
            "centre",
            "centre_nom",
            "formation",
            "formation_nom",
            "synthese",
            "resume_points_cles",
            "plan_action",
            "plan_action_structured",
            "statut",
            "statut_display",
            "nb_commentaires",
            "metadata",
            "commentaire_ids",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "created_by_label",
            "updated_by",
            "updated_by_label",
        ]

    @extend_schema_field(serializers.ListField(child=serializers.IntegerField()))
    def get_commentaire_ids(self, obj) -> list[int]:
        """Identifiants des commentaires rattachés (ordre non garanti)."""
        return list(obj.commentaires.values_list("id", flat=True))

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_created_by_label(self, obj) -> str | None:
        user = getattr(obj, "created_by", None)
        if not user:
            return None
        full = user.get_full_name() if hasattr(user, "get_full_name") else ""
        if full and str(full).strip():
            return str(full).strip()
        return getattr(user, "username", None) or str(user.id)

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_updated_by_label(self, obj) -> str | None:
        user = getattr(obj, "updated_by", None)
        if not user:
            return None
        full = user.get_full_name() if hasattr(user, "get_full_name") else ""
        if full and str(full).strip():
            return str(full).strip()
        return getattr(user, "username", None) or str(user.id)


class PlanActionFormationWriteSerializer(serializers.ModelSerializer):
    """
    Création et mise à jour : contenu éditorial, périmètre, statut et sélection
    de commentaires (IDs). `slug` et `nb_commentaires` sont gérés côté modèle
    / signaux, pas dans le corps de requête.
    """

    commentaire_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        write_only=True,
    )
    # Le modèle n’a pas `null=True` sur `JSONField` : DRF interdit `null` par défaut.
    # On accepte explicitement `null` en entrée et on le mappe sur `{}` (même sémantique qu’en base).
    metadata = serializers.JSONField(
        required=False,
        allow_null=True,
    )

    class Meta:
        model = PlanActionFormation
        fields = [
            "titre",
            "date_debut",
            "date_fin",
            "periode_type",
            "centre",
            "formation",
            "synthese",
            "resume_points_cles",
            "plan_action",
            "plan_action_structured",
            "statut",
            "metadata",
            "commentaire_ids",
        ]
        extra_kwargs = {
            "titre": {"required": True},
            "date_debut": {"required": True},
            "date_fin": {"required": True},
        }

    def validate_metadata(self, value: dict | list | None) -> dict:
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                _("Indiquez un objet JSON, par exemple { \"centre_ids\": [1, 2] } pour le périmètre.")
            )
        raw_ov = value.get("export_commentaire_overrides")
        if raw_ov is not None:
            if not isinstance(raw_ov, dict):
                raise serializers.ValidationError(
                    _(
                        "« export_commentaire_overrides » doit être un objet "
                        "{ \"identifiant_commentaire\": \"texte affiché dans le PDF\" }."
                    )
                )
            for k, v in raw_ov.items():
                ks = str(k)
                if not ks.isdigit():
                    raise serializers.ValidationError(
                        _("Chaque clé d’export PDF doit être un identifiant de commentaire numérique (ex. « 42 »).")
                    )
                if not isinstance(v, str):
                    raise serializers.ValidationError(
                        _("Chaque texte d’export PDF doit être une chaîne de caractères.")
                    )
                if len(v) > 100_000:
                    raise serializers.ValidationError(
                        _("Un texte d’export PDF dépasse la longueur maximale (100 000 caractères).")
                    )
        raw_rg = value.get("export_pdf_regroupe_commentaires")
        if raw_rg is not None and not isinstance(raw_rg, bool):
            raise serializers.ValidationError(
                _("« export_pdf_regroupe_commentaires » doit être true ou false.")
            )
        return value

    def validate(self, attrs: dict) -> dict:
        """
        Cohérence de période (fin >= début), alignement centre / formation, et
        périmètre centre (profils scopés doivent fournir au moins un de centre
        ou formation, et rester dans leurs centres attribués).
        """
        data = {**self._instance_as_dict(), **attrs}
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None

        d0, d1 = data.get("date_debut"), data.get("date_fin")
        if d0 and d1 and d1 < d0:
            raise serializers.ValidationError(
                {
                    "date_fin": _(
                        "La date de fin du plan doit être la même date ou postérieure à la date de début."
                    )
                }
            )
        centre = data.get("centre")
        formation = data.get("formation")
        metadata = data.get("metadata")
        merged_commentaire_ids = data.get("commentaire_ids")
        if merged_commentaire_ids is None and self.instance is not None:
            merged_commentaire_ids = list(self.instance.commentaires.values_list("pk", flat=True))
        if merged_commentaire_ids is None:
            merged_commentaire_ids = []
        allowed_cids = {int(x) for x in merged_commentaire_ids}
        if isinstance(metadata, dict):
            raw_pdf_ov = metadata.get("export_commentaire_overrides")
            if isinstance(raw_pdf_ov, dict) and len(raw_pdf_ov) > 0:
                for k in raw_pdf_ov:
                    if not str(k).isdigit():
                        continue
                    if int(k) not in allowed_cids:
                        raise serializers.ValidationError(
                            {
                                "metadata": _(
                                    "Un texte d’export PDF porte sur un commentaire non sélectionné. "
                                    "Ajustez la sélection de commentaires ou retirez la surchage associée (clé : %(k)s)."
                                )
                                % {"k": k}
                            }
                        )
        centre_ids_meta: list[int] = []
        if isinstance(metadata, dict):
            raw = metadata.get("centre_ids")
            if isinstance(raw, list):
                for x in raw:
                    try:
                        centre_ids_meta.append(int(x))
                    except (TypeError, ValueError):
                        continue
        centre_ids_meta = list(dict.fromkeys(centre_ids_meta))

        formation_ids_meta: list[int] = []
        if isinstance(metadata, dict):
            raw_f = metadata.get("formation_ids")
            if isinstance(raw_f, list):
                for x in raw_f:
                    try:
                        formation_ids_meta.append(int(x))
                    except (TypeError, ValueError):
                        continue
        formation_ids_meta = list(dict.fromkeys(formation_ids_meta))
        if formation_ids_meta:
            fqs = (
                Formation.objects.filter(pk__in=formation_ids_meta)
                .only("id", "centre_id")
                .all()
            )
            if fqs.count() != len(formation_ids_meta):
                raise serializers.ValidationError(
                    {
                        "metadata": _(
                            "Une ou plusieurs formations indiquées dans le périmètre sont introuvables. "
                            "Vérifiez les identifiants."
                        )
                    }
                )
            for fo in fqs:
                fcid = getattr(fo, "centre_id", None)
                if fcid is None:
                    continue
                if len(centre_ids_meta) > 0 and fcid not in centre_ids_meta:
                    raise serializers.ValidationError(
                        {
                            "metadata": _(
                                "Une formation choisie n’est pas rattachée aux centres sélectionnés. Ajustez la liste des "
                                "formations ou des centres."
                            )
                        }
                    )

        if centre and formation and getattr(formation, "centre_id", None) is not None:
            if len(centre_ids_meta) > 0:
                if formation.centre_id not in centre_ids_meta:
                    raise serializers.ValidationError(
                        {
                            "formation": _(
                                "Cette formation ne correspond pas à un des centres cochés : retirez la formation, "
                                "ou ajoutez le centre de cette formation à la sélection."
                            )
                        }
                    )
            elif formation.centre_id != centre.id:
                raise serializers.ValidationError(
                    {
                        "formation": _(
                            "Cette formation n'appartient pas au centre principal enregistré : vérifiez le centre et "
                            "la formation, ou l'un seul centre sélectionné."
                        )
                    }
                )

        if user and getattr(user, "is_authenticated", False) and not is_admin_like(user):
            allowed = set(staff_centre_ids(user) or [])
            for cid in centre_ids_meta:
                if cid not in allowed:
                    raise serializers.ValidationError(
                        {
                            "metadata": _(
                                "L’un des centres sélectionnés n’est pas autorisé pour votre rôle. Retirez ce centre, "
                                "ou demandez l’attribution d’un accès (administrateur)."
                            )
                        }
                    )
            if centre and getattr(centre, "id", None) not in allowed:
                raise serializers.ValidationError(
                    {
                        "centre": _(
                            "Le centre enregistré n’est pas dans les lieux de votre mission : modifiez le centre, "
                            "ou contactez un administrateur."
                        )
                    }
                )
            if formation and getattr(getattr(formation, "centre", None), "id", None) not in allowed:
                raise serializers.ValidationError(
                    {
                        "formation": _(
                            "Cette formation se déroule dans un centre sur lequel vous n’avez pas d’autorisation."
                        )
                    }
                )
            for fid in formation_ids_meta:
                fo = Formation.objects.filter(pk=fid).only("id", "centre_id").first()
                if fo and getattr(fo, "centre_id", None) is not None and fo.centre_id not in allowed:
                    raise serializers.ValidationError(
                        {
                            "metadata": _(
                                "Une des formations listées n’est pas dans un centre autorisé pour votre rôle."
                            )
                        }
                    )
            if (
                not centre
                and not formation
                and len(centre_ids_meta) == 0
                and len(formation_ids_meta) == 0
            ):
                raise serializers.ValidationError(
                    {
                        "non_field_errors": [
                            _(
                                "Avec votre rôle, le plan doit être rattaché à au moins un de vos lieux. "
                                "Cochez un ou plusieurs centres, et/ou filtrez sur une ou plusieurs formations."
                            )
                        ]
                    }
                )
        return attrs

    def _instance_as_dict(self) -> dict:
        o = self.instance
        if not o:
            return {}
        return {
            "date_debut": o.date_debut,
            "date_fin": o.date_fin,
            "centre": o.centre,
            "formation": o.formation,
            "metadata": o.metadata,
        }

    def validate_commentaire_ids(self, value: list[int]) -> list[int]:
        """Vérifie l'existence des commentaires et le périmètre centre côté formation."""
        if not value:
            return value
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        unique = list(dict.fromkeys(value))
        qs = Commentaire.objects.filter(pk__in=unique).select_related("formation__centre")
        if qs.count() != len(unique):
            raise serializers.ValidationError(
                _(
                    "Un ou plusieurs commentaires n’existent plus. Revenez sur « Commentaires sources », cliquez sur "
                    "« Charger les commentaires groupés » et sélectionnez de nouveau."
                )
            )
        if user and is_admin_like(user):
            return unique
        allowed = set(staff_centre_ids(user) or [])
        for c in qs:
            fc = getattr(getattr(c, "formation", None), "centre_id", None)
            if fc is None or fc not in allowed:
                raise serializers.ValidationError(
                    _(
                        "Un des commentaires choisis n’est pas rattaché à l’un de vos lieux. Desélectionnez-le, ou "
                        "adaptez le périmètre centre/formation."
                    )
                )
        return unique

    def create(self, validated_data: dict) -> PlanActionFormation:
        commentaire_ids = validated_data.pop("commentaire_ids", [])
        request = self.context.get("request")
        user = request.user if request and getattr(request.user, "is_authenticated", False) else None
        instance = PlanActionFormation(**validated_data)
        if user:
            instance.created_by = user
            instance.updated_by = user
        instance.save()
        if commentaire_ids:
            instance.commentaires.set(commentaire_ids)
        return instance

    def update(self, instance: PlanActionFormation, validated_data: dict) -> PlanActionFormation:
        commentaire_ids = validated_data.pop("commentaire_ids", None)
        request = self.context.get("request")
        user = request.user if request and getattr(request.user, "is_authenticated", False) else None
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if user:
            instance.updated_by = user
        instance.save()
        if commentaire_ids is not None:
            instance.commentaires.set(commentaire_ids)
        return instance
