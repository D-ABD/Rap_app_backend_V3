from __future__ import annotations

from typing import Any

from rest_framework import serializers

from ...models import Candidat, CerfaContrat, Formation, Partenaire


def _merge_prefill_data(
    *,
    validated_data: dict[str, Any],
    candidat_id: int | None,
    formation_id: int | None,
    employeur_id: int | None,
) -> dict[str, Any]:
    def _as_int(value: Any) -> int | None:
        if value in (None, "", "null", "undefined"):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    candidat_id = _as_int(candidat_id)
    formation_id = _as_int(formation_id)
    employeur_id = _as_int(employeur_id)

    candidat = (
        Candidat.objects.select_related(
            "compte_utilisateur",
            "formation",
            "formation__centre",
            "entreprise_placement",
            "entreprise_validee",
            "placement_appairage",
            "placement_appairage__partenaire",
        ).get(pk=candidat_id)
        if candidat_id
        else None
    )
    prefill = CerfaContrat.build_prefill_payload(
        candidat=candidat,
        formation=None,
        partenaire=None,
    )

    merged = {**prefill, **validated_data}
    if candidat_id or formation_id or employeur_id:
        merged["auto_generated"] = True
    return merged


class CerfaContratSerializer(serializers.ModelSerializer):
    candidat = serializers.IntegerField(source="candidat_id", required=False, allow_null=True)
    formation = serializers.IntegerField(source="formation_id", required=False, allow_null=True)
    employeur = serializers.IntegerField(source="employeur_id", required=False, allow_null=True)

    pdf_url = serializers.SerializerMethodField()
    pdf_status = serializers.SerializerMethodField()
    missing_fields = serializers.SerializerMethodField()

    class Meta:
        model = CerfaContrat
        fields = "__all__"

    def get_pdf_url(self, obj: CerfaContrat) -> str | None:
        request = self.context.get("request")
        if not obj.pdf_fichier:
            return None
        url = obj.pdf_fichier.url
        return request.build_absolute_uri(url) if request is not None else url

    def get_pdf_status(self, obj: CerfaContrat) -> str:
        return "ready" if obj.pdf_fichier else "missing"

    def get_missing_fields(self, obj: CerfaContrat) -> list[str]:
        required_pairs = {
            "apprenti_nom_naissance": obj.apprenti_nom_naissance,
            "apprenti_prenom": obj.apprenti_prenom,
            "employeur_nom": obj.employeur_nom,
            "diplome_vise": obj.diplome_vise or obj.diplome_intitule,
            "date_conclusion": obj.date_conclusion,
        }
        return [label for label, value in required_pairs.items() if value in (None, "")]

    def create(self, validated_data: dict[str, Any]) -> CerfaContrat:
        candidat_id = validated_data.pop("candidat_id", None)
        formation_id = validated_data.pop("formation_id", None)
        employeur_id = validated_data.pop("employeur_id", None)
        candidat_obj = Candidat.objects.filter(pk=candidat_id).first() if candidat_id else None
        merged = _merge_prefill_data(
            validated_data=validated_data,
            candidat_id=candidat_id,
            formation_id=formation_id,
            employeur_id=employeur_id,
        )
        inferred_formation = Formation.objects.filter(pk=formation_id).first() if formation_id else None
        inferred_employeur = Partenaire.objects.filter(pk=employeur_id).first() if employeur_id else None
        merged["candidat"] = candidat_obj
        merged["formation"] = inferred_formation
        merged["employeur"] = inferred_employeur
        return CerfaContrat.objects.create(**merged)

    def update(self, instance: CerfaContrat, validated_data: dict[str, Any]) -> CerfaContrat:
        raw_candidat_id = validated_data.pop("candidat_id", None)
        raw_formation_id = validated_data.pop("formation_id", None)
        raw_employeur_id = validated_data.pop("employeur_id", None)
        candidat_id = raw_candidat_id if raw_candidat_id is not None else getattr(instance.candidat, "pk", None)
        formation_id = raw_formation_id if raw_formation_id is not None else getattr(instance.formation, "pk", None)
        employeur_id = raw_employeur_id if raw_employeur_id is not None else getattr(instance.employeur, "pk", None)
        candidat_obj = Candidat.objects.filter(pk=candidat_id).first() if candidat_id else None
        formation_obj = Formation.objects.filter(pk=formation_id).first() if formation_id else None
        employeur_obj = Partenaire.objects.filter(pk=employeur_id).first() if employeur_id else None
        merged = _merge_prefill_data(
            validated_data=validated_data,
            candidat_id=candidat_id,
            formation_id=formation_id,
            employeur_id=employeur_id,
        )
        if raw_candidat_id is not None:
            merged["candidat"] = candidat_obj
        if raw_formation_id is not None:
            merged["formation"] = formation_obj
        elif "formation" not in merged and instance.formation_id:
            merged["formation"] = instance.formation
        if raw_employeur_id is not None:
            merged["employeur"] = employeur_obj
        elif "employeur" not in merged and instance.employeur_id:
            merged["employeur"] = instance.employeur
        for field, value in merged.items():
            setattr(instance, field, value)
        instance.save()
        return instance
